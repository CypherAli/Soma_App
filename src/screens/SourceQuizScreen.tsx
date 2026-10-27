import { sourceDisplayLabel } from "../core/sourceLabel";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { accountKey, readStored, writeStored } from "../core/storage";
import { fold } from "../core/practice";
import {
  Body,
  Button,
  Choice,
  ErrorText,
  Field,
  Heading,
  Icon,
  Loading,
  Page,
  SignInPrompt,
  Title,
} from "../ui/components";
import { Text, useI18n } from "../ui/i18n";
import { useTheme } from "../ui/theme";
import { confirmAction } from "../ui/confirm";

interface Entry {
  id: string;
  title: string;
  group: string;
  count: number;
  gradableCount: number;
  dueCount?: number;
}
interface SourceQuestion {
  id: string;
  number: number;
  stem: string;
  context?: string;
  options: { id: string; text: string }[];
  answers: string[];
  explanation: string;
  images: string[];
  explanationImages: string[];
  sourcePage: number;
  gradable: boolean;
}
interface Bank {
  id: string;
  title: string;
  sourceFile: string;
  sourceNote?: string;
  version: string;
  dueIds?: string[];
  questions: SourceQuestion[];
}
interface SourceDraft {
  id: string;
  bank: Bank;
  answers: Record<string, string[]>;
  index: number;
  mode: "practice" | "exam";
  started: number;
  finished?: number;
  revealed?: string[];
  receipt?: { score: number; total: number };
}

export function SourceQuizScreen() {
  const app = useApp();
  if (!app.user)
    return (
      <Page back="Ôn tập">
        <Title>Đề nguồn PDF</Title>
        <SignInPrompt />
      </Page>
    );
  return (
    <SourceContent key={accountKey(app.preferences.apiUrl, app.user.id)} />
  );
}
function SourceContent() {
  const app = useApp(),
    t = useTheme(),
    { language } = useI18n();
  const key = `${accountKey(app.preferences.apiUrl, app.user!.id)}:source-draft`;
  const alive = useRef(true);
  const [entries, setEntries] = useState<Entry[]>([]),
    [personal, setPersonal] = useState<Entry[]>([]);
  const [draft, setDraft] = useState<SourceDraft | null>(null),
    [restored, setRestored] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState(""),
    [count, setCount] = useState("20"),
    [mode, setMode] = useState("practice");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const loading = useRef(false);
  useEffect(() => {
    alive.current = true;
    const abort = new AbortController();
    void readStored<SourceDraft | null>(key, null).then((value) => {
      if (alive.current) {
        setDraft(value);
        setRestored(true);
      }
    });
    void app
      .request<{ exams: Entry[]; personal: Entry[] }>("/mobile/sources", {
        signal: abort.signal,
      })
      .then((value) => {
        if (alive.current) {
          setEntries(value.exams);
          setPersonal(value.personal);
        }
      })
      .catch((e) => {
        if (alive.current) setError(errorMessage(e));
      });
    return () => {
      alive.current = false;
      abort.abort();
    };
    // Account and API changes remount this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  async function save(value: SourceDraft | null) {
    setDraft(value);
    try {
      await writeStored(key, value);
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    }
  }
  async function start(entry: Entry) {
    if (loading.current || !restored) return;
    if (
      draft &&
      !draft.finished &&
      !(await confirmAction(
        "Bắt đầu bài mới?",
        "Bài làm đang lưu sẽ được thay thế.",
        "Bắt đầu",
      ))
    )
      return;
    loading.current = true;
    setBusy(true);
    setError(null);
    try {
      const bank = await app.request<Bank>(
        `/mobile/sources/${encodeURIComponent(entry.id)}`,
      );
      if (!alive.current) return;
      const shuffled = [...bank.questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // This function runs only after pressing Start, never during render.
        // eslint-disable-next-line react-hooks/purity
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      bank.questions =
        count === "due"
          ? bank.questions
              .filter((q) => bank.dueIds?.includes(q.id))
              .slice(0, 500)
          : count === "all"
            ? bank.questions.slice(0, 500)
            : shuffled.slice(0, Number(count));
      if (!bank.questions.length)
        throw Error(
          language === "en"
            ? "No approved questions in this document."
            : "Tài liệu chưa có câu đã duyệt.",
        );
      setMenu(false);
      await save({
        id: Crypto.randomUUID(),
        bank,
        answers: {},
        index: 0,
        mode: mode as "practice" | "exam",
        // eslint-disable-next-line react-hooks/purity -- timestamp of the Start event
        started: Date.now(),
      });
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      loading.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function finish() {
    if (!draft || loading.current) return;
    if (
      !draft.finished &&
      !(await confirmAction(
        "Nộp bài",
        language === "en"
          ? "Unanswered questions count as incorrect. Submit now?"
          : "Câu chưa chọn được tính là sai. Nộp bài để xem đáp án?",
        "Nộp bài",
      ))
    )
      return;
    // eslint-disable-next-line react-hooks/purity -- timestamp of the Submit event
    const done = { ...draft, finished: draft.finished ?? Date.now() };
    await save(done);
    if (!done.bank.questions.some((q) => q.gradable && q.answers.length))
      return;
    loading.current = true;
    setBusy(true);
    setError(null);
    try {
      const receipt = await app.request<{ score: number; total: number }>(
        "/mobile/source-attempts",
        {
          method: "POST",
          body: {
            clientRequestId: done.id,
            bankId: done.bank.id,
            version: done.bank.version,
            mode: done.mode,
            seconds: Math.min(
              21600,
              Math.round((done.finished! - done.started) / 1000),
            ),
            answers: done.bank.questions.map((q) => ({
              id: q.id,
              answers: done.answers[q.id] ?? [],
            })),
          },
        },
      );
      if (alive.current) {
        await save({ ...done, receipt });
        void app.refreshStudy();
      }
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      loading.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function images(paths: string[]) {
    return paths
      .filter(
        (p) =>
          (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p) &&
            p.length < 5_000_000) ||
          /^\/kb\/dr-lam\/images\/[a-f0-9]{20}\.webp$/.test(p),
      )
      .map((p) => (
        <SourceImage
          key={p}
          uri={
            p.startsWith("data:")
              ? p
              : `${app.preferences.apiUrl}/mobile/source-images/${p.split("/").pop()}`
          }
        />
      ));
  }
  const q = draft?.bank.questions[draft.index];
  const showAnswer =
    !!draft?.finished || !!(q && draft?.revealed?.includes(q.id));
  const correct =
    draft?.bank.questions.filter(
      (q) =>
        q.gradable &&
        q.answers.length &&
        [...q.answers].sort().join("|") ===
          [...(draft.answers[q.id] ?? [])].sort().join("|"),
    ).length ?? 0;
  const total =
    draft?.bank.questions.filter((q) => q.gradable && q.answers.length)
      .length ?? 0;
  return (
    <Page
      key={`${draft?.id ?? "list"}:${draft?.index ?? 0}:${menu}:${!!draft?.finished}`}
      back="Ôn tập"
    >
      <Title>Đề nguồn PDF</Title>
      <ErrorText message={error} />
      {!restored ? (
        <Loading />
      ) : draft && q && !menu ? (
        <>
          <Body localize={false}>{sourceDisplayLabel(draft.bank.title)}</Body>
          <Body muted style={{ marginTop: 6, fontSize: 12 }}>
            {language === "en"
              ? `Question ${draft.index + 1} / ${draft.bank.questions.length}`
              : `Câu ${draft.index + 1} / ${draft.bank.questions.length}`}{" "}
            · {draft.mode === "exam" ? "Quiz" : "Practice"}
          </Body>
          {!!draft.finished && (
            <View
              style={{
                padding: 16,
                marginVertical: 16,
                backgroundColor: t.tint,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: t.ink, fontSize: 24 }}>
                {draft.receipt?.score ?? correct}/
                {draft.receipt?.total ?? total}
              </Text>
              <Body>{draft.receipt ? "Đã đồng bộ" : "Chưa đồng bộ"}</Body>
              {!draft.receipt && total > 0 && (
                <Button secondary loading={busy} onPress={() => void finish()}>
                  Đồng bộ kết quả
                </Button>
              )}
            </View>
          )}
          <Heading>
            {!q.gradable
              ? "Đọc câu hỏi nguồn"
              : q.answers.length > 1
                ? "Câu nhiều đáp án · chọn tất cả đáp án đúng"
                : "Một đáp án đúng"}
          </Heading>
          {!!q.context && <Body muted localize={false}>{q.context}</Body>}
          <Body localize={false} style={{ fontSize: 18, lineHeight: 29, marginVertical: 14 }}>
            {q.stem}
          </Body>
          {images(q.images ?? [])}
          {q.options.map((o) => {
            const checked = (draft.answers[q.id] ?? []).includes(o.id);
            return (
              <Pressable
                key={o.id}
                accessibilityRole={q.answers.length > 1 ? "checkbox" : "radio"}
                accessibilityState={{ checked, disabled: showAnswer }}
                disabled={showAnswer}
                onPress={() => {
                  const before = draft.answers[q.id] ?? [];
                  const selected =
                    q.answers.length > 1
                      ? checked
                        ? before.filter((id) => id !== o.id)
                        : [...before, o.id]
                      : [o.id];
                  void save({
                    ...draft,
                    answers: { ...draft.answers, [q.id]: selected },
                  });
                }}
                style={{
                  padding: 16,
                  marginVertical: 5,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor:
                    showAnswer && checked && !q.answers.includes(o.id)
                      ? t.error
                      : showAnswer && q.answers.includes(o.id)
                        ? t.accent
                        : checked
                          ? t.accent
                          : t.rule,
                  backgroundColor: checked ? t.tint : t.paper,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <Icon
                    name={
                      q.answers.length > 1
                        ? checked
                          ? "checkbox-outline"
                          : "square-outline"
                        : checked
                          ? "radio-button-on-outline"
                          : "radio-button-off-outline"
                    }
                    size={22}
                    color={
                      showAnswer && checked && !q.answers.includes(o.id)
                        ? t.error
                        : checked
                          ? t.accent
                          : t.muted
                    }
                  />
                  <Body localize={false} style={{ flex: 1 }}>
                    {o.id}. {o.text}
                  </Body>
                </View>
              </Pressable>
            );
          })}
          {!q.gradable && (
            <Body muted>Câu nguồn chưa có đáp án · không tính điểm</Body>
          )}
          {showAnswer && (
            <>
              <Heading>Đáp án</Heading>
              <Body>{q.answers.join(", ") || "—"}</Body>
              <Body localize={false}>{q.explanation}</Body>
              {images(q.explanationImages ?? [])}
            </>
          )}
          <Body muted style={{ fontSize: 12, marginVertical: 14 }}>
            {sourceDisplayLabel(draft.bank.sourceFile)} ·{" "}
            {language === "en" ? "Page" : "Trang"} {q.sourcePage || "—"}
          </Body>
          <View style={{ flexDirection: "row", gap: 8, marginVertical: 12 }}>
            <Button
              secondary
              disabled={draft.index === 0}
              style={{ flex: 1 }}
              onPress={() => void save({ ...draft, index: draft.index - 1 })}
            >
              Câu trước
            </Button>
            <Button
              secondary
              disabled={draft.index >= draft.bank.questions.length - 1}
              style={{ flex: 1 }}
              onPress={() => void save({ ...draft, index: draft.index + 1 })}
            >
              Câu tiếp
            </Button>
          </View>
          {draft.mode === "practice" && !showAnswer && (
            <Button
              secondary
              onPress={() =>
                void save({
                  ...draft,
                  revealed: [...(draft.revealed ?? []), q.id],
                })
              }
            >
              Xem đáp án nguồn
            </Button>
          )}
          {!draft.finished && (
            <Button loading={busy} onPress={() => void finish()}>
              Nộp bài
            </Button>
          )}
          <Button
            secondary
            onPress={() => {
              setMenu(true);
            }}
          >
            Chọn đề để bắt đầu
          </Button>
        </>
      ) : (
        <>
          {!!draft && (
            <Button onPress={() => setMenu(false)}>Tiếp tục bài làm</Button>
          )}
          <Body muted>Nội dung đề giữ nguyên ngôn ngữ của tài liệu nguồn.</Body>
          <Field
            label="Tìm đề theo tên hoặc vùng"
            value={query}
            onChangeText={setQuery}
          />
          <Choice
            label="Số câu"
            value={count}
            onChange={setCount}
            options={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "50", label: "50" },
              { value: "all", label: "Tất cả" },
              { value: "due", label: "Ôn các câu đến hạn" },
            ]}
          />
          <Choice
            label="Chế độ"
            value={mode}
            onChange={setMode}
            options={[
              { value: "practice", label: "Luyện tập" },
              { value: "exam", label: "Quiz" },
            ]}
          />
          <Heading>Đề ôn tập giải phẫu</Heading>
          {entries
            .filter((e) =>
              fold(`${sourceDisplayLabel(e.title)} ${e.group}`).includes(
                fold(query),
              ),
            )
            .map((e) => (
              <SourceRow
                key={e.id}
                entry={e}
                disabled={busy}
                onPress={() => void start(e)}
              />
            ))}
          <Heading>PDF &amp; Word của tôi</Heading>
          {personal.map((e) => (
            <SourceRow
              key={e.id}
              entry={e}
              disabled={busy || !e.count}
              onPress={() => void start(e)}
            />
          ))}
          {!personal.length && (
            <Body muted style={{ fontSize: 13, marginBottom: 20 }}>
              Tài liệu đã tải lên trên web sẽ xuất hiện ở đây.
            </Body>
          )}
          {!entries.length && !error && <Loading />}
          <Button secondary onPress={() => router.replace("/(tabs)/review")}>
            Luyện theo mô hình 3D
          </Button>
        </>
      )}
    </Page>
  );
}
function SourceImage({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(1.5),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (active && h) setRatio(w / h);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [uri]);
  return failed ? (
    <Body muted>Không tải được hình minh họa.</Body>
  ) : (
    <Image
      accessibilityLabel="Hình minh họa từ tài liệu nguồn"
      source={{ uri }}
      resizeMode="contain"
      style={{
        width: "100%",
        aspectRatio: ratio,
        maxHeight: 460,
        marginVertical: 12,
        backgroundColor: "white",
        borderRadius: 8,
      }}
    />
  );
}

function SourceRow({
  entry,
  disabled,
  onPress,
}: {
  entry: Entry;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useTheme(),
    { language } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sourceDisplayLabel(entry.title)}, ${entry.count} ${language === "en" ? "questions" : "câu hỏi"}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 19,
        borderBottomWidth: 1,
        borderColor: t.rule,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        opacity: disabled ? 0.45 : 1,
        backgroundColor: pressed ? t.ground : "transparent",
      })}
    >
      <View
        style={{
          width: 36,
          height: 44,
          borderRadius: 8,
          backgroundColor: t.ground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="document-text-outline" size={19} color={t.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 23,
            fontWeight: "600",
            color: t.ink,
          }}
        >
          {sourceDisplayLabel(entry.title)}
        </Text>
        <Text
          style={{ fontSize: 12, lineHeight: 20, color: t.muted, marginTop: 4 }}
        >
          {entry.count} {language === "en" ? "questions" : "câu hỏi"}
          {!!entry.dueCount &&
            ` · ${entry.dueCount} ${language === "en" ? "due" : "câu đến hạn"}`}
        </Text>
      </View>
      <Icon name="chevron-forward" size={17} color={t.muted} />
    </Pressable>
  );
}

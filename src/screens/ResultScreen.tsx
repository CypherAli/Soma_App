import { Text } from "../ui/i18n";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { draftScore } from "../core/practice";
import { SYSTEM_NAMES } from "../core/types";
import {
  Body,
  Button,
  Empty,
  ErrorText,
  Heading,
  Kicker,
  Loading,
  Page,
  SignInPrompt,
  TextLink,
  Title,
} from "../ui/components";
import { useTheme } from "../ui/theme";

export function ResultScreen() {
  const app = useApp(),
    t = useTheme();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const draft = app.privateData.draft;
  const attempted = useRef<string | null>(null);
  const submitDraft = app.submitDraft;
  const attemptKey =
    app.user && draft?.completedAt && !draft.receipt
      ? `${app.user.id}:${draft.id}`
      : null;
  useEffect(() => {
    if (!attemptKey || !app.privateReady || attempted.current === attemptKey)
      return;
    attempted.current = attemptKey;
    void Promise.resolve().then(async () => {
      setBusy(true);
      setError(null);
      try {
        await submitDraft();
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    });
  }, [attemptKey, app.privateReady, submitDraft]);
  if (!app.user)
    return (
      <Page back="Ôn tập">
        <SignInPrompt />
      </Page>
    );
  if (!app.privateReady)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (!draft?.completedAt)
    return (
      <Page back="Ôn tập">
        <Empty
          title="Chưa có kết quả hoàn chỉnh"
          action="Về Ôn tập"
          onPress={() => router.replace("/(tabs)/review")}
        />
      </Page>
    );
  const score = draft.receipt?.score ?? draftScore(draft),
    wrong = draft.questions.filter(
      (q) => draft.answers[q.itemKey] !== q.correctOptionId,
    );
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await app.submitDraft();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function retryWrong() {
    setBusy(true);
    try {
      await app.beginPractice({
        count: wrong.length,
        only: wrong.map((q) => q.itemKey),
      });
      router.replace("/quiz");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page back="Ôn tập">
      <Kicker>
        {draft.receipt ? "Đã lưu trên tài khoản" : "Đã hoàn thành · Chờ gửi"}
      </Kicker>
      <Title>Kết quả luyện tập</Title>
      <Text
        style={{
          fontSize: 72,
          lineHeight: 92,
          fontWeight: "400",
          letterSpacing: -4,
          color: t.ink,
          marginTop: 25,
        }}
      >
        {score}
        <Text style={{ fontSize: 30, color: t.muted, letterSpacing: -1 }}>
          {" "}
          / {draft.questions.length}
        </Text>
      </Text>
      <Body muted style={{ fontSize: 13, marginBottom: 18 }}>
        Câu trả lời đúng
      </Body>
      {[
        ["Chủ đề", SYSTEM_NAMES[draft.scope] ?? draft.scope],
        ["Hình thức", "Luyện tập"],
        ["Câu cần ôn lại", `${wrong.length} câu`],
        [
          "Thời gian",
          `${Math.floor((draft.seconds ?? 0) / 60)} phút ${(draft.seconds ?? 0) % 60} giây`,
        ],
      ].map(([label, value]) => (
        <View
          key={label}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 15,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderColor: t.rule,
          }}
        >
          <Text style={{ fontSize: 13, color: t.muted }}>{label}</Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: t.ink,
              flexShrink: 1,
              textAlign: "right",
            }}
          >
            {value}
          </Text>
        </View>
      ))}
      <ErrorText message={error} />
      {!draft.receipt ? (
        <>
          <Button
            loading={busy}
            onPress={() => void submit()}
            style={{ marginTop: 27 }}
            icon="cloud-upload-outline"
          >
            Lưu kết quả lên tài khoản
          </Button>
          <Body muted style={{ fontSize: 12, lineHeight: 19, marginTop: 13 }}>
            Bài làm đã được giữ trên thiết bị. Nếu kết nối gián đoạn, bạn có thể
            gửi lại bằng cùng lượt nộp.
          </Body>
        </>
      ) : (
        <>
          <Heading>Đã đồng bộ</Heading>
          <Body muted style={{ fontSize: 13 }}>
            Kết quả này đã có trong lịch sử trên web. Lịch ôn đã được cập nhật
            cho từng câu.
          </Body>
          {wrong.length > 0 && (
            <Button
              secondary
              loading={busy}
              style={{ marginTop: 18 }}
              onPress={() => void retryWrong()}
            >
              Luyện lại {wrong.length} câu sai
            </Button>
          )}
        </>
      )}
      <Heading>Xem lại đáp án</Heading>
      {draft.questions.map((q, i) => (
        <View
          key={q.itemKey}
          style={{
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderColor: t.rule,
          }}
        >
          <Body style={{ fontSize: 14, fontWeight: "500" }}>
            {i + 1}. {q.prompt}
          </Body>
          <Text
            style={{
              color:
                draft.answers[q.itemKey] === q.correctOptionId
                  ? t.success
                  : t.error,
              fontSize: 12,
              marginTop: 7,
            }}
          >
            {draft.answers[q.itemKey] === q.correctOptionId
              ? "Đúng"
              : "Chưa đúng"}{" "}
            · Đáp án: {q.options.find((o) => o.id === q.correctOptionId)?.text}
          </Text>
          <Body muted style={{ fontSize: 12, lineHeight: 19, marginTop: 7 }}>
            {q.explanation}
          </Body>
          <Body muted style={{ fontSize: 11, lineHeight: 18, marginTop: 8 }}>
            {q.citation}
          </Body>
        </View>
      ))}
      <TextLink onPress={() => router.replace("/(tabs)")}>Về Hôm nay</TextLink>
    </Page>
  );
}

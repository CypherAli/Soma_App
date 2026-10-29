import { Text } from "../ui/i18n";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { SYSTEM_NAMES } from "../core/types";
import {
  Body,
  Button,
  Choice,
  Empty,
  ErrorText,
  Heading,
  Icon,
  Kicker,
  Loading,
  Page,
  SignInPrompt,
  Title,
} from "../ui/components";
import { useTheme } from "../ui/theme";
import { confirmAction } from "../ui/confirm";

export function ReviewScreen() {
  const app = useApp(),
    t = useTheme();
  const params = useLocalSearchParams<{ model?: string }>();
  const [scope, setScope] = useState("all"),
    [count, setCount] = useState("10"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const bank = app.catalogue.questions,
    available = bank.filter(
      (q) =>
        (scope === "all" || q.scope === scope) &&
        (!params.model || q.modelId === params.model),
    ).length;
  const due = app.dueKeys.filter((key) => bank.some((q) => q.itemKey === key)),
    unsupported = Math.max(0, (app.history?.dueCount ?? 0) - due.length);
  const draft = app.privateData.draft;
  async function start(only?: string[]) {
    setBusy(true);
    setError(null);
    try {
      await app.beginPractice({
        scope,
        modelId: only ? undefined : params.model,
        count: Number(count),
        only,
      });
      router.push("/quiz");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function begin(only?: string[]) {
    if (
      draft &&
      !draft.receipt &&
      !(await confirmAction(
        "Bắt đầu bài mới?",
        "Bài làm hiện tại chưa được đồng bộ sẽ bị thay thế. Bạn có thể chọn Hủy và tiếp tục bài cũ.",
        "Bỏ bài và bắt đầu",
      ))
    )
      return;
    await start(only);
  }
  return (
    <Page refresh>
      <Kicker>Học tập</Kicker>
      <Title>Ôn tập</Title>
      <Button secondary onPress={() => router.push("/sources")}>
        Đề ôn tập giải phẫu
      </Button>
      <Body muted style={{ marginTop: 8, marginBottom: 16, fontSize: 12 }}>
        Nguồn do bạn cung cấp
      </Body>
      <Button secondary onPress={() => router.push("/assistant")}>
        Hỏi trợ lý
      </Button>
      <Heading>Luyện theo mô hình 3D</Heading>
      {!app.user ? (
        <SignInPrompt />
      ) : !app.privateReady ? (
        <Loading />
      ) : (
        <>
          <View
            style={{
              paddingVertical: 22,
              borderBottomWidth: 1,
              borderColor: t.rule,
              marginBottom: 22,
              flexDirection: "row",
              gap: 15,
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: t.ink }}>
                {due.length
                  ? `${due.length} câu đến hạn ôn`
                  : app.studyError
                    ? "Chưa tải được lịch ôn"
                    : unsupported
                      ? "Có câu từ đề nguồn"
                      : "Chưa có câu đến hạn"}
              </Text>
              <Body muted style={{ fontSize: 12, marginTop: 6 }}>
                {due.length
                  ? "Ưu tiên ôn lại các cấu trúc cần củng cố."
                  : unsupported
                    ? `${unsupported} câu thuộc đề nguồn. Chọn Đề ôn tập giải phẫu ở trên, rồi chọn Ôn các câu đến hạn.`
                    : "Bạn có thể luyện theo chủ đề bên dưới."}
              </Body>
            </View>
            <Icon
              name={due.length ? "repeat-outline" : "checkmark-circle-outline"}
              color={due.length ? t.accent : t.success}
              size={30}
            />
          </View>
          <ErrorText message={app.studyError} />
          {due.length > 0 && (
            <Button
              secondary
              loading={busy}
              onPress={() => begin(due)}
              style={{ marginBottom: 23 }}
            >
              Ôn các câu đến hạn
            </Button>
          )}
          {draft && !draft.receipt && (
            <Button
              secondary
              onPress={() =>
                router.push(draft.completedAt ? "/result" : "/quiz")
              }
              style={{ marginBottom: 20 }}
            >
              {draft.completedAt
                ? "Kết quả đang chờ gửi"
                : `Tiếp tục bài đang làm · ${draft.confirmed.length}/${draft.questions.length}`}
            </Button>
          )}
          <Heading>Luyện tập theo chủ đề</Heading>
          {params.model ? (
            <Body muted style={{ fontSize: 13 }}>
              Mô hình:{" "}
              {app.catalogue.models.find((m) => m.id === params.model)?.title ??
                params.model}
            </Body>
          ) : (
            <Choice
              label="Hệ cơ quan"
              value={scope}
              onChange={setScope}
              options={["all", ...new Set(bank.map((q) => q.scope))].map(
                (value) => ({ value, label: SYSTEM_NAMES[value] ?? value }),
              )}
            />
          )}
          <Choice
            label="Số câu"
            value={count}
            onChange={setCount}
            options={[
              { value: "10", label: "10 câu" },
              { value: "20", label: "20 câu" },
            ]}
          />
          <Body muted style={{ fontSize: 12, marginBottom: 18 }}>
            {available
              ? `${available} câu khả dụng · Bài này gồm ${Math.min(Number(count), available)} câu.`
              : "Chưa có câu hỏi cho lựa chọn này."}
          </Body>
          <ErrorText message={error} />
          <Button
            loading={busy}
            disabled={!available || !app.privateReady}
            icon="arrow-forward"
            onPress={() => begin()}
          >
            Bắt đầu luyện tập
          </Button>
          <Heading>Cách luyện tập</Heading>
          <Body muted style={{ fontSize: 13 }}>
            Xác nhận từng đáp án để đọc giải thích và nguồn. Bài làm được giữ
            trên thiết bị trước khi gửi kết quả.
          </Body>
          {params.model && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.setParams({ model: undefined })}
              style={{ minHeight: 48, justifyContent: "center", marginTop: 12 }}
            >
              <Text style={{ color: t.accent, fontSize: 13 }}>
                Chọn các hệ cơ quan khác
              </Text>
            </Pressable>
          )}
        </>
      )}
      {app.user && !bank.length && (
        <Empty
          title="Chưa có ngân hàng câu hỏi"
          action="Thử lại"
          onPress={() => void app.refresh()}
        >
          App cần tải nội dung đã xuất bản từ máy chủ.
        </Empty>
      )}
    </Page>
  );
}

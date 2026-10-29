import { Text } from "../ui/i18n";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { completedDraft } from "../core/practice";
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
} from "../ui/components";
import { useTheme } from "../ui/theme";

export function QuizScreen() {
  const app = useApp(),
    t = useTheme();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const draft = app.privateData.draft,
    q = draft?.questions[draft.index];
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
  if (!draft || !q)
    return (
      <Page back="Ôn tập">
        <Empty
          title="Chưa có bài đang làm"
          action="Chọn chủ đề"
          onPress={() => router.replace("/(tabs)/review")}
        />
      </Page>
    );
  if (draft.completedAt)
    return (
      <Page back="Ôn tập">
        <Empty
          title="Bài làm đã hoàn thành"
          action="Xem kết quả"
          onPress={() => router.replace("/result")}
        />
      </Page>
    );
  const selected = draft.answers[q.itemKey],
    confirmed = draft.confirmed.includes(q.itemKey);
  async function choose(id: string) {
    if (busy || confirmed) return;
    setBusy(true);
    try {
      await app.setDraft({
        ...draft!,
        answers: { ...draft!.answers, [q!.itemKey]: id },
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!confirmed) {
        await app.setDraft({
          ...draft!,
          confirmed: [...draft!.confirmed, q!.itemKey],
        });
        void Haptics.notificationAsync(
          selected === q!.correctOptionId
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
      } else if (draft!.index < draft!.questions.length - 1) {
        await app.setDraft({ ...draft!, index: draft!.index + 1 });
      } else {
        await app.setDraft(completedDraft(draft!));
        router.replace("/result");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page key={q.itemKey} back="Lưu bài và quay lại">
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Kicker>{SYSTEM_NAMES[q.scope] ?? q.scope}</Kicker>
        <Kicker>
          {draft.index + 1} / {draft.questions.length}
        </Kicker>
      </View>
      <View
        style={{
          height: 3,
          backgroundColor: t.rule,
          marginTop: 5,
          marginBottom: 22,
        }}
      >
        <View
          style={{
            height: 3,
            width: `${((draft.index + 1) / draft.questions.length) * 100}%`,
            backgroundColor: t.accent,
          }}
        />
      </View>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 23,
          lineHeight: 32,
          fontWeight: "500",
          letterSpacing: -0.3,
          color: t.ink,
          marginBottom: 24,
        }}
      >
        {q.prompt}
      </Text>
      {q.options.map((option, index) => {
        const isChosen = selected === option.id,
          right = confirmed && option.id === q.correctOptionId,
          wrong = confirmed && isChosen && !right;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected: isChosen,
              disabled: busy || confirmed,
            }}
            disabled={busy || confirmed}
            onPress={() => void choose(option.id)}
            key={option.id}
            style={{
              minHeight: 60,
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
              padding: 15,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: right
                ? t.success
                : wrong
                  ? t.error
                  : isChosen
                    ? t.accent
                    : t.rule,
              backgroundColor: right
                ? t.successBg
                : isChosen
                  ? t.tint
                  : t.paper,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 11, color: t.muted, width: 18 }}>
              {String.fromCharCode(65 + index)}
            </Text>
            <Text
              style={{ fontSize: 15, lineHeight: 22, color: t.ink, flex: 1 }}
            >
              {option.text}
            </Text>
          </Pressable>
        );
      })}
      {confirmed && (
        <View accessibilityLiveRegion="polite">
          <Heading>
            {selected === q.correctOptionId ? "Chính xác" : "Cần xem lại"}
          </Heading>
          <Body muted style={{ fontSize: 13 }}>
            {q.explanation}
          </Body>
          <Body muted style={{ fontSize: 11, lineHeight: 18, marginTop: 13 }}>
            {q.citation}
          </Body>
        </View>
      )}
      <ErrorText message={error} />
      <Button
        loading={busy}
        disabled={!selected}
        icon="arrow-forward"
        style={{ marginTop: 23 }}
        onPress={() => void next()}
      >
        {!confirmed
          ? "Xác nhận đáp án"
          : draft.index === draft.questions.length - 1
            ? "Hoàn thành bài làm"
            : "Câu tiếp theo"}
      </Button>
    </Page>
  );
}

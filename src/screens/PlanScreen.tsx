import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { SYSTEM_NAMES } from "../core/types";
import {
  Body,
  Button,
  Choice,
  ErrorText,
  Field,
  Heading,
  Kicker,
  Loading,
  Page,
  SignInPrompt,
  Title,
} from "../ui/components";
import { useTheme } from "../ui/theme";
import { confirmAction } from "../ui/confirm";

export function PlanScreen() {
  const app = useApp();
  if (!app.user)
    return (
      <Page back="Hôm nay">
        <Title>Lộ trình của tôi</Title>
        <SignInPrompt next="plan" />
      </Page>
    );
  if (app.studyLoading && !app.studyPath)
    return (
      <Page back="Hôm nay">
        <Loading />
      </Page>
    );
  return (
    <PlanForm
      key={`${app.user.id}:${app.studyPath?.path?.startedAt ?? "new"}`}
    />
  );
}
function PlanForm() {
  const app = useApp(),
    t = useTheme();
  const initial = app.studyPath?.path;
  const [goal, setGoal] = useState(initial?.goal ?? "Nắm vững giải phẫu người"),
    [horizon, setHorizon] = useState(String(initial?.horizonDays ?? 28)),
    [days, setDays] = useState(String(initial?.daysPerWeek ?? 4)),
    [minutes, setMinutes] = useState(String(initial?.minutesPerDay ?? 15)),
    [system, setSystem] = useState(initial?.systemKey ?? "all"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState(false);
  const path = app.studyPath?.path;
  if (!app.user)
    return (
      <Page back="Hôm nay">
        <Title>Lộ trình của tôi</Title>
        <SignInPrompt next="plan" />
      </Page>
    );
  if (app.studyLoading && !app.studyPath)
    return (
      <Page back="Hôm nay">
        <Loading />
      </Page>
    );
  async function save() {
    setBusy(true);
    setError(null);
    setMessage(false);
    try {
      if (goal.trim().length < 3)
        throw new Error("Hãy nhập mục tiêu học ít nhất 3 ký tự.");
      await app.savePlan({
        goal: goal.trim(),
        horizonDays: Number(horizon),
        daysPerWeek: Number(days),
        minutesPerDay: Number(minutes),
        systemKey: system,
        focusSystems: system === "all" ? [] : [system],
      });
      setMessage(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !(await confirmAction(
        "Xóa lộ trình?",
        "Lộ trình trên web và app sẽ được xóa. Lịch sử bài làm vẫn được giữ.",
        "Xóa lộ trình",
      ))
    )
      return;
    setBusy(true);
    setError(null);
    setMessage(false);
    try {
      await app.request("/study/path", { method: "DELETE" });
      await app.refreshStudy();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page back="Hôm nay">
      <Kicker>Học tập</Kicker>
      <Title>Lộ trình của tôi</Title>
      <Body muted style={{ fontSize: 13, marginBottom: 10 }}>
        Lộ trình này được dùng chung với web. Khi lưu thay đổi, thời điểm bắt
        đầu sẽ được đặt lại.
      </Body>
      <ErrorText message={app.studyError} />
      <Field
        label="Mục tiêu"
        accessibilityLabel="Mục tiêu học tập"
        value={goal}
        onChangeText={setGoal}
        maxLength={200}
      />
      <Choice
        label="Khoảng thời gian"
        value={horizon}
        onChange={setHorizon}
        options={[
          { value: "7", label: "1 tuần" },
          { value: "14", label: "2 tuần" },
          { value: "28", label: "4 tuần" },
          { value: "56", label: "8 tuần" },
        ]}
      />
      <Choice
        label="Số buổi mỗi tuần"
        value={days}
        onChange={setDays}
        options={[3, 4, 5, 7].map((value) => ({
          value: String(value),
          label: `${value} buổi`,
        }))}
      />
      <Choice
        label="Thời lượng mỗi buổi"
        value={minutes}
        onChange={setMinutes}
        options={[15, 25, 30, 45].map((value) => ({
          value: String(value),
          label: `${value} phút`,
        }))}
      />
      <Choice
        label="Hệ ưu tiên"
        value={system}
        onChange={setSystem}
        options={[
          "all",
          "skeletal",
          "nervous",
          "cardiovascular",
          "visceral",
        ].map((value) => ({ value, label: SYSTEM_NAMES[value] }))}
      />
      <ErrorText message={error} />
      {message && (
        <Body style={{ fontSize: 13, color: t.success, marginVertical: 15 }}>
          Đã lưu lộ trình lên tài khoản.
        </Body>
      )}
      <Button
        loading={busy}
        onPress={() => void save()}
        style={{ marginTop: 12 }}
      >
        {path ? "Lưu thay đổi" : "Tạo lộ trình"}
      </Button>
      {app.studyPath?.plan && (
        <>
          <Heading>Dàn bài hiện tại</Heading>
          <Body muted style={{ fontSize: 12 }}>
            {app.studyPath.plan.totalSessions} buổi dự kiến · Còn{" "}
            {app.studyPath.plan.daysLeft} ngày
          </Body>
          {app.studyPath.plan.blocks.map((block) => (
            <View
              key={block.index}
              style={{
                borderBottomWidth: 1,
                borderColor: t.rule,
                paddingVertical: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: block.current ? "600" : "400",
                  color: block.current ? t.accent : t.ink,
                }}
              >
                {block.granularity === "day"
                  ? "Ngày"
                  : block.granularity === "week"
                    ? "Tuần"
                    : "Tháng"}{" "}
                {block.index} ·{" "}
                {block.kind === "rest"
                  ? "Nghỉ"
                  : (SYSTEM_NAMES[block.systemKey] ?? block.systemKey)}
              </Text>
              <Body muted style={{ fontSize: 12, marginTop: 4 }}>
                {block.from} → {block.to} · {block.sessions} buổi
                {block.current ? " · Hiện tại" : ""}
              </Body>
            </View>
          ))}
        </>
      )}
      {path && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void remove()}
          disabled={busy}
          style={{
            minHeight: 48,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 22,
          }}
        >
          <Text style={{ color: t.error, fontSize: 13 }}>
            Xóa lộ trình hiện tại
          </Text>
        </Pressable>
      )}
    </Page>
  );
}

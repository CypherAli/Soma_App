import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { errorMessage } from "../../core/api";
import { useApp } from "../../core/AppProvider";
import type { AuthResponse, DeviceSession } from "../../core/types";
import {
  Body,
  Button,
  ErrorText,
  Field,
  Heading,
  Icon,
  Loading,
  Page,
  Title,
} from "../../ui/components";
import { confirmAction } from "../../ui/confirm";
import { useI18n } from "../../ui/i18n";
import { useTheme } from "../../ui/theme";
import { AccountGate } from "./AccountGate";
import { dateText } from "./format";

export function AccountSecurityScreen() {
  return (
    <AccountGate>
      <SecurityDetails />
    </AccountGate>
  );
}

export function SecurityDetails() {
  const app = useApp(),
    t = useTheme(),
    { language, tr } = useI18n();
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const { request, user } = app;
  useEffect(() => {
    const abort = new AbortController();
    void request<{ sessions: DeviceSession[] }>("/mobile/account/sessions", {
      signal: abort.signal,
    })
      .then((data) => {
        if (!abort.signal.aborted) setSessions(data.sessions);
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setError(errorMessage(cause));
      });
    return () => abort.abort();
  }, [request, user]);
  async function password() {
    if (busy) return;
    setError(null);
    setMessage(null);
    if (next !== confirm) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setBusy("password");
    const owner = app.user!.id,
      base = app.preferences.apiUrl;
    try {
      const auth = await app.request<AuthResponse>("/mobile/account/password", {
        method: "POST",
        body: { currentPassword: current, newPassword: next },
      });
      await app.acceptSession(auth, base, owner);
      if (alive.current) {
        setCurrent("");
        setNext("");
        setConfirm("");
        setMessage("Đã đổi mật khẩu. Các phiên cũ đã được đăng xuất.");
      }
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  async function revoke(id: string) {
    if (
      busy ||
      !(await confirmAction(
        tr("Đăng xuất thiết bị?"),
        tr("Thiết bị này sẽ cần đăng nhập lại."),
        tr("Đăng xuất"),
      ))
    )
      return;
    setBusy(id);
    setError(null);
    try {
      await app.request(`/mobile/account/sessions/${id}`, { method: "DELETE" });
      const result = await app.request<{ sessions: DeviceSession[] }>(
        "/mobile/account/sessions",
      );
      if (alive.current) setSessions(result.sessions);
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  return (
    <Page back="Cá nhân">
      <Title>Bảo mật và thiết bị</Title>
      <Body muted style={{ fontSize: 13 }}>
        Quản lý mật khẩu và những nơi bạn đã đăng nhập.
      </Body>
      <ErrorText message={error} />
      {!!message && (
        <Body style={{ color: t.success, marginVertical: 12 }}>{message}</Body>
      )}
      <Heading>Đổi mật khẩu</Heading>
      {app.user?.hasPassword ? (
        <>
          <Field
            label="Mật khẩu hiện tại"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoComplete="current-password"
          />
          <Field
            label="Mật khẩu mới"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoComplete="new-password"
          />
          <Field
            label="Nhập lại mật khẩu mới"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
          />
          <Button
            disabled={!!busy || !current || next.length < 8 || !confirm}
            loading={busy === "password"}
            onPress={() => void password()}
          >
            Đổi mật khẩu
          </Button>
        </>
      ) : (
        <>
          <Body muted>
            Tài khoản này dùng đăng nhập mạng xã hội. Bạn có thể đặt mật khẩu
            qua email.
          </Body>
          <Button
            secondary
            disabled={!!busy}
            onPress={() => {
              setBusy("reset");
              void app
                .request<{ message: string }>("/auth/forgot-password", {
                  method: "POST",
                  body: { email: app.user!.email },
                })
                .then((data) => {
                  if (alive.current) setMessage(data.message);
                })
                .catch((cause) => {
                  if (alive.current) setError(errorMessage(cause));
                })
                .finally(() => {
                  if (alive.current) setBusy(null);
                });
            }}
          >
            Gửi liên kết đặt mật khẩu
          </Button>
        </>
      )}
      <Heading>Thiết bị đã đăng nhập</Heading>
      {sessions === null && !error ? (
        <Loading />
      ) : (
        sessions?.map((session) => (
          <View
            key={session.id}
            style={{
              paddingVertical: 18,
              borderBottomWidth: 1,
              borderColor: t.rule,
            }}
          >
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <Icon
                name={
                  /android|iphone|ipad/i.test(session.userAgent ?? "")
                    ? "phone-portrait-outline"
                    : "desktop-outline"
                }
                size={22}
              />
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: "600" }}>
                  {deviceLabel(session.userAgent, language)}
                </Body>
                <Body muted style={{ fontSize: 12, marginTop: 4 }}>
                  {session.current
                    ? "Thiết bị hiện tại"
                    : `${language === "en" ? "Last active" : "Hoạt động gần nhất"}: ${dateText(session.lastSeenAt, language)}`}
                </Body>
              </View>
            </View>
            {!session.current && (
              <Button
                secondary
                disabled={!!busy}
                onPress={() => void revoke(session.id)}
              >
                Đăng xuất thiết bị
              </Button>
            )}
          </View>
        ))
      )}
      {!!sessions?.some((session) => !session.current) && (
        <Button
          secondary
          disabled={!!busy}
          onPress={() => void revoke("others")}
        >
          Đăng xuất các thiết bị khác
        </Button>
      )}
    </Page>
  );
}

export function deviceLabel(agent: string | null, language: "vi" | "en") {
  if (!agent) return language === "en" ? "Unknown device" : "Thiết bị không rõ";
  const os = /android/i.test(agent)
    ? "Android"
    : /iphone|ipad/i.test(agent)
      ? "iOS"
      : /windows/i.test(agent)
        ? "Windows"
        : /mac/i.test(agent)
          ? "macOS"
          : "";
  const browser = /okhttp|expo|soma/i.test(agent)
    ? "Soma"
    : /edg\//i.test(agent)
      ? "Edge"
      : /chrome/i.test(agent)
        ? "Chrome"
        : /safari/i.test(agent)
          ? "Safari"
          : /firefox/i.test(agent)
            ? "Firefox"
            : "";
  return (
    [browser, os].filter(Boolean).join(" · ") ||
    (language === "en" ? "Other device" : "Thiết bị khác")
  );
}

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { authDestination } from "../core/oauthProtocol";
import { finishSocialLogin, socialReturnUrl } from "../core/socialLogin";
import { Body, Button, ErrorText, Page, Title } from "../ui/components";
import { useTheme } from "../ui/theme";

export default function OAuthCallback() {
  const app = useApp(),
    t = useTheme();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
  }>();
  const [error, setError] = useState<string | null>(null);
  const processing = useRef(false);
  const base = app.preferences.apiUrl;
  const { acceptSession } = app;
  useEffect(() => {
    if (app.restoringSession) return;
    if (processing.current) return;
    processing.current = true;
    const query = new URLSearchParams();
    for (const key of ["code", "state", "error"] as const) {
      const value = params[key];
      if (typeof value === "string") query.set(key, value);
    }
    void finishSocialLogin(base, `${socialReturnUrl()}?${query}`)
      .then(async ({ auth, next, ownerId }) => {
        await acceptSession(auth, base, ownerId);
        router.replace(authDestination(next));
      })
      .catch((e) => setError(errorMessage(e)));
  }, [base, acceptSession, params, app.restoringSession]);
  return (
    <Page back="Quay lại">
      <Title>{error ? "Chưa thể đăng nhập" : "Đang đăng nhập"}</Title>
      {error ? (
        <>
          <ErrorText message={error} />
          <Button onPress={() => router.replace("/auth")}>
            Quay lại đăng nhập
          </Button>
        </>
      ) : (
        <>
          <Body muted>Đang xác nhận tài khoản Soma của bạn…</Body>
          <ActivityIndicator color={t.accent} style={{ marginTop: 24 }} />
        </>
      )}
    </Page>
  );
}

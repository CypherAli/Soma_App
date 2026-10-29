import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { errorMessage } from "../../core/api";
import { useApp } from "../../core/AppProvider";
import {
  PROVIDERS,
  PROVIDER_NAMES,
  type Provider,
} from "../../core/oauthProtocol";
import { socialReturnUrl, startSocialLogin } from "../../core/socialLogin";
import {
  Body,
  Button,
  ErrorText,
  Icon,
  Page,
  Title,
} from "../../ui/components";
import { confirmAction } from "../../ui/confirm";
import { Text, useI18n } from "../../ui/i18n";
import { useTheme } from "../../ui/theme";
import { AccountGate } from "./AccountGate";

export function AccountConnectionsScreen() {
  return (
    <AccountGate>
      <ConnectionsDetails />
    </AccountGate>
  );
}

export function ConnectionsDetails() {
  const app = useApp(),
    t = useTheme(),
    { tr } = useI18n();
  const [capabilities, setCapabilities] = useState<{
      mobileOAuth: boolean;
      returnAllowed?: boolean;
      oauth: Record<Provider, boolean>;
    } | null>(null),
    [busy, setBusy] = useState<Provider | null>(null),
    [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const { request } = app;
  useEffect(() => {
    const abort = new AbortController();
    void request<NonNullable<typeof capabilities>>(
      `/auth/mobile/capabilities?returnUrl=${encodeURIComponent(socialReturnUrl())}`,
      { auth: false, signal: abort.signal },
    )
      .then((data) => {
        if (!abort.signal.aborted) setCapabilities(data);
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setError(errorMessage(cause));
      });
    return () => abort.abort();
  }, [request]);
  const methods =
    (app.user?.hasPassword ? 1 : 0) +
    PROVIDERS.filter((provider) => app.user?.connections?.[provider]).length;
  async function connect(provider: Provider, linked: boolean) {
    if (busy) return;
    if (
      linked &&
      !(await confirmAction(
        tr("Gỡ liên kết tài khoản?"),
        PROVIDER_NAMES[provider],
        tr("Gỡ liên kết"),
      ))
    )
      return;
    setBusy(provider);
    setError(null);
    try {
      if (linked) {
        await app.request(`/mobile/account/connections/${provider}`, {
          method: "DELETE",
        });
        await app.refreshAccount();
      } else {
        await startSocialLogin(
          app.preferences.apiUrl,
          provider,
          "connections",
          {
            ownerId: app.user!.id,
            start: (proof) =>
              app.request(`/auth/mobile/oauth/${provider}/link`, {
                method: "POST",
                body: proof,
              }),
          },
        );
      }
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  return (
    <Page back="Cá nhân">
      <Title>Tài khoản liên kết</Title>
      <Body muted style={{ fontSize: 13 }}>
        Liên kết thêm phương thức đăng nhập cho cùng một tài khoản.
      </Body>
      <ErrorText message={error} />
      {PROVIDERS.map((provider) => {
        const linked = !!app.user?.connections?.[provider],
          configured =
            !!capabilities?.mobileOAuth &&
            !!capabilities?.oauth[provider] &&
            capabilities?.returnAllowed !== false;
        return (
          <View
            key={provider}
            style={{
              paddingVertical: 25,
              borderBottomWidth: 1,
              borderColor: t.rule,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: t.ground,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name={
                    provider === "google"
                      ? "logo-google"
                      : provider === "github"
                        ? "logo-github"
                        : "logo-facebook"
                  }
                  size={22}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: "600", color: t.ink }}>
                  {PROVIDER_NAMES[provider]}
                </Text>
                <Body muted style={{ fontSize: 12, marginTop: 4 }}>
                  {linked ? "Đã liên kết" : "Chưa liên kết"}
                </Body>
              </View>
              {linked && (
                <Icon
                  name="checkmark-circle-outline"
                  color={t.accent}
                  size={20}
                />
              )}
            </View>
            <Button
              secondary
              loading={busy === provider}
              disabled={!!busy || (linked ? methods <= 1 : !configured)}
              onPress={() => void connect(provider, linked)}
            >
              {linked ? "Gỡ liên kết" : "Liên kết tài khoản"}
            </Button>
            {linked && methods <= 1 && (
              <Body muted style={{ fontSize: 12, marginTop: 10 }}>
                Đây là phương thức đăng nhập duy nhất.
              </Body>
            )}
            {!linked && capabilities && !configured && (
              <Body muted style={{ fontSize: 12, marginTop: 10 }}>
                Máy chủ chưa bật phương thức này.
              </Body>
            )}
          </View>
        );
      })}
    </Page>
  );
}

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import {
  authDestination,
  PROVIDERS,
  PROVIDER_NAMES,
  type Provider,
} from "../core/oauthProtocol";
import { startSocialLogin } from "../core/socialLogin";
import { useTheme } from "../ui/theme";
import {
  Body,
  Button,
  Choice,
  ErrorText,
  Field,
  Kicker,
  Icon,
  Page,
  TextLink,
  Title,
} from "../ui/components";

export function AuthScreen() {
  const app = useApp();
  const { request } = app;
  const t = useTheme();
  const params = useLocalSearchParams<{ next?: string }>();
  const [oauth, setOAuth] = useState<{
    mobileOAuth: boolean;
    oauth: Partial<Record<Provider, boolean>>;
  } | null>(null);
  const [capabilityError, setCapabilityError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [socialBusy, setSocialBusy] = useState<Provider | null>(null);
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const locked = useRef(false);
  const [mode, setMode] = useState("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void request<{
      mobileOAuth: boolean;
      oauth: Partial<Record<Provider, boolean>>;
    }>("/auth/mobile/capabilities", { auth: false })
      .then((data) => {
        if (!cancelled) {
          setOAuth(data);
          setCapabilityError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCapabilityError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [request, app.preferences.apiUrl, retry]);
  async function social(provider: Provider) {
    if (locked.current) return;
    locked.current = true;
    setSocialBusy(provider);
    setError(null);
    setMessage(null);
    try {
      const result = await startSocialLogin(
        app.preferences.apiUrl,
        provider,
        params.next,
      );
      // Expo Router handles the return link, including a cold app launch.
      if (!result)
        setMessage(
          "Bạn đã đóng cửa sổ đăng nhập. Có thể thử lại bất cứ lúc nào.",
        );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      locked.current = false;
      setSocialBusy(null);
    }
  }
  async function submit() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        throw new Error("Vui lòng nhập email hợp lệ.");
      if (mode === "forgot") {
        const result = await app.request<{ message: string }>(
          "/auth/forgot-password",
          { method: "POST", auth: false, body: { email: email.trim() } },
        );
        setMessage(result.message);
        return;
      }
      if (
        mode === "register" &&
        (name.trim().length < 2 || name.trim().length > 80)
      )
        throw new Error("Họ tên cần có từ 2 đến 80 ký tự.");
      if (password.length < 8)
        throw new Error("Mật khẩu cần có ít nhất 8 ký tự.");
      if (
        mode === "register" &&
        (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      )
        throw new Error("Mật khẩu cần có cả chữ và số.");
      if (mode === "register" && confirm !== password)
        throw new Error("Mật khẩu nhập lại chưa khớp.");
      if (mode === "register" && !terms)
        throw new Error(
          "Bạn cần đồng ý điều khoản sử dụng và chính sách bảo mật.",
        );
      await app.login(email, password, mode === "register" ? name : undefined);
      setPassword("");
      setConfirm("");
      router.replace(authDestination(params.next));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }
  return (
    <Page back="Quay lại">
      <Kicker>Tài khoản Soma</Kicker>
      <Title>
        {mode === "forgot"
          ? "Quên mật khẩu"
          : mode === "register"
            ? "Tạo tài khoản"
            : "Đăng nhập"}
      </Title>
      <Body muted style={{ fontSize: 13, marginBottom: 18 }}>
        Một tài khoản cho web và điện thoại. Tiếp tục lộ trình học của bạn ở bất
        cứ đâu.
      </Body>
      {mode !== "forgot" && (
        <Choice
          label="Tài khoản"
          value={mode}
          onChange={(value) => {
            setMode(value);
            setError(null);
            setMessage(null);
          }}
          options={[
            { value: "login", label: "Đăng nhập" },
            { value: "register", label: "Đăng ký" },
          ]}
        />
      )}
      {mode === "register" && (
        <Field
          label="Họ và tên"
          accessibilityLabel="Họ và tên"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          maxLength={80}
        />
      )}
      <Field
        label="Email"
        accessibilityLabel="Email"
        placeholder="ban@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        maxLength={254}
      />
      {mode !== "forgot" && (
        <Field
          label="Mật khẩu"
          accessibilityLabel="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          maxLength={128}
          onSubmitEditing={() => void submit()}
          returnKeyType="go"
        />
      )}
      {mode !== "forgot" && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowPassword(!showPassword)}
          style={{
            alignSelf: "flex-end",
            minHeight: 36,
            justifyContent: "center",
          }}
        >
          <Body muted style={{ fontSize: 12 }}>
            {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          </Body>
        </Pressable>
      )}
      {mode === "register" && (
        <Field
          label="Nhập lại mật khẩu"
          accessibilityLabel="Nhập lại mật khẩu"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          maxLength={128}
        />
      )}
      {mode === "register" && (
        <Body muted style={{ fontSize: 12, marginTop: 4 }}>
          Ít nhất 8 ký tự, gồm chữ và số.
        </Body>
      )}
      {mode === "register" && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: terms }}
          onPress={() => setTerms(!terms)}
          style={{
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
            paddingVertical: 12,
          }}
        >
          <Icon
            name={terms ? "checkbox" : "square-outline"}
            color={terms ? t.accent : t.muted}
          />
          <Body muted style={{ fontSize: 12, lineHeight: 19, flex: 1 }}>
            Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật.
          </Body>
        </Pressable>
      )}
      <ErrorText message={error} />
      {message && <Body style={{ marginVertical: 15 }}>{message}</Body>}
      <Button
        loading={busy}
        disabled={socialBusy !== null}
        style={{ marginTop: 22 }}
        onPress={() => void submit()}
      >
        {mode === "forgot"
          ? "Gửi liên kết đặt lại"
          : mode === "register"
            ? "Đăng ký"
            : "Đăng nhập"}
      </Button>
      <TextLink
        onPress={() => {
          setMode(mode === "forgot" ? "login" : "forgot");
          setError(null);
          setMessage(null);
        }}
      >
        {mode === "forgot" ? "Quay lại đăng nhập" : "Quên mật khẩu?"}
      </TextLink>
      {mode !== "forgot" && (
        <View style={{ marginTop: 18, gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              marginBottom: 8,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: t.rule }} />
            <Body muted style={{ fontSize: 12 }}>
              Hoặc tiếp tục với
            </Body>
            <View style={{ flex: 1, height: 1, backgroundColor: t.rule }} />
          </View>
          {PROVIDERS.map((provider) => {
            const available =
              Platform.OS !== "web" &&
              oauth?.mobileOAuth === true &&
              oauth.oauth?.[provider] === true;
            return (
              <Pressable
                key={provider}
                accessibilityRole="button"
                accessibilityLabel={`Tiếp tục với ${PROVIDER_NAMES[provider]}`}
                accessibilityState={{
                  disabled: !available || busy || socialBusy !== null,
                }}
                disabled={!available || busy || socialBusy !== null}
                onPress={() => void social(provider)}
                style={({ pressed }) => ({
                  minHeight: 50,
                  paddingHorizontal: 18,
                  borderWidth: 1,
                  borderColor: t.rule,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: pressed ? t.ground : t.paper,
                  opacity: available ? 1 : 0.5,
                })}
              >
                {socialBusy === provider ? (
                  <ActivityIndicator size="small" color={t.accent} />
                ) : (
                  <Icon
                    name={
                      provider === "google"
                        ? "logo-google"
                        : provider === "github"
                          ? "logo-github"
                          : "logo-facebook"
                    }
                    color={provider === "facebook" ? "#1877f2" : t.ink}
                  />
                )}
                <Body
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    flex: 1,
                    textAlign: "center",
                    marginRight: 34,
                  }}
                >
                  Tiếp tục với {PROVIDER_NAMES[provider]}
                </Body>
              </Pressable>
            );
          })}
          {!oauth && !capabilityError && (
            <Body muted style={{ fontSize: 12 }}>
              Đang kiểm tra phương thức đăng nhập…
            </Body>
          )}
          {capabilityError && (
            <TextLink
              onPress={() => {
                setCapabilityError(false);
                setRetry(retry + 1);
              }}
            >
              Không tải được phương thức đăng nhập · Thử lại
            </TextLink>
          )}
          {oauth && !oauth.mobileOAuth && (
            <Body muted style={{ fontSize: 12 }}>
              Đăng nhập mạng xã hội đang chờ cấu hình kết nối HTTPS trên máy
              chủ.
            </Body>
          )}
          {Platform.OS === "web" && (
            <Body muted style={{ fontSize: 12 }}>
              Dùng ứng dụng Android hoặc website Soma để đăng nhập mạng xã hội.
            </Body>
          )}
        </View>
      )}
      <TextLink onPress={() => router.replace("/(tabs)/atlas")}>
        Tiếp tục xem Atlas công khai
      </TextLink>
    </Page>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { accountKey } from "../core/storage";
import { socialReturnUrl, startSocialLogin } from "../core/socialLogin";
import {
  PROVIDERS,
  PROVIDER_NAMES,
  type Provider,
} from "../core/oauthProtocol";
import type {
  AuthResponse,
  DeviceSession,
  Membership,
  User,
} from "../core/types";
import {
  Body,
  Button,
  Choice,
  ErrorText,
  Field,
  Heading,
  Icon,
  Loading,
  MenuRow,
  Page,
  SignInPrompt,
  Title,
  UserAvatar,
} from "../ui/components";
import { Text, useI18n } from "../ui/i18n";
import { useTheme } from "../ui/theme";
import { confirmAction } from "../ui/confirm";

function AccountGate({ children }: { children: ReactNode }) {
  const app = useApp();
  if (!app.user)
    return (
      <Page back="Cá nhân">
        <Title>Tài khoản</Title>
        <SignInPrompt next="profile" />
      </Page>
    );
  return (
    <View
      key={accountKey(app.preferences.apiUrl, app.user.id)}
      style={{ flex: 1 }}
    >
      {children}
    </View>
  );
}
export function useAccountOverview() {
  const { user, request, preferences } = useApp();
  const key = user ? accountKey(preferences.apiUrl, user.id) : "";
  const [result, setResult] = useState<{
      key: string;
      user: User;
      membership: Membership;
    } | null>(null),
    [failure, setFailure] = useState<{ key: string; message: string } | null>(
      null,
    );
  useEffect(() => {
    if (!user) return;
    const abort = new AbortController();
    void request<{ user: User; membership: Membership }>("/mobile/account", {
      signal: abort.signal,
    })
      .then((data) => {
        if (!abort.signal.aborted) {
          setResult({ key, ...data });
          setFailure(null);
        }
      })
      .catch((cause) => {
        if (!abort.signal.aborted)
          setFailure({ key, message: errorMessage(cause) });
      });
    return () => abort.abort();
  }, [user, request, key]);
  return {
    data: result?.key === key ? result : null,
    error: failure?.key === key ? failure.message : null,
  };
}
function dateText(value: string | undefined | null, language: "vi" | "en") {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString(language === "en" ? "en-GB" : "vi-VN")
    : "—";
}
export function MembershipSummary({ membership }: { membership: Membership }) {
  const t = useTheme(),
    { language } = useI18n();
  return (
    <View
      style={{
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderColor: t.rule,
        marginTop: 0,
        marginBottom: 18,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Body style={{ fontWeight: "600" }}>Gói tài khoản</Body>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.accent }}>
          {membership.plan === "pro" ? "Premium" : "Thường"}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 28,
          color: t.ink,
          fontWeight: "600",
          marginTop: 14,
          fontVariant: ["tabular-nums"],
        }}
      >
        {membership.remaining}
        <Text style={{ fontSize: 15, color: t.muted }}>
          {" "}
          / {membership.limit}
        </Text>
      </Text>
      <Body muted style={{ fontSize: 12 }}>
        Lượt hỏi trợ lý còn lại trong tháng
      </Body>
      <View style={{ height: 3, backgroundColor: t.rule, marginVertical: 14 }}>
        <View
          style={{
            height: 3,
            width: `${Math.max(0, Math.min(100, (100 * membership.used) / Math.max(1, membership.limit)))}%`,
            backgroundColor: t.accent,
          }}
        />
      </View>
      <Body muted style={{ fontSize: 12 }}>
        {language === "en" ? "Resets on" : "Làm mới vào"}{" "}
        {dateText(membership.resetsAt, language)}
      </Body>
      {!!membership.premiumUntil && (
        <Body muted style={{ fontSize: 12, marginTop: 4 }}>
          {language === "en"
            ? "Premium active until"
            : "Premium có hiệu lực đến"}{" "}
          {dateText(membership.premiumUntil, language)}
        </Body>
      )}
    </View>
  );
}
export function AccountProfileScreen() {
  return (
    <AccountGate>
      <ProfileDetails />
    </AccountGate>
  );
}
function ProfileDetails() {
  const app = useApp(),
    t = useTheme(),
    { language } = useI18n(),
    overview = useAccountOverview();
  const [name, setName] = useState(app.user!.name),
    [learningRole, setLearningRole] = useState(
      app.user?.learningRole ?? "learner",
    ),
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
  async function photo() {
    if (busy) return;
    setBusy("photo");
    setError(null);
    setMessage(null);
    try {
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (selection.canceled || !alive.current) return;
      const asset = selection.assets[0],
        side = Math.min(asset.width, asset.height);
      const context = ImageManipulator.manipulate(asset.uri);
      context
        .crop({
          originX: Math.max(0, (asset.width - side) / 2),
          originY: Math.max(0, (asset.height - side) / 2),
          width: side,
          height: side,
        })
        .resize({ width: 256, height: 256 });
      const image = await context.renderAsync();
      const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.72,
        base64: true,
      });
      context.release();
      image.release();
      if (!result.base64 || result.base64.length > 60000)
        throw Error(
          language === "en"
            ? "Choose a smaller image."
            : "Vui lòng chọn ảnh nhỏ hơn.",
        );
      if (alive.current)
        await app.updateProfile({
          avatar: `data:image/jpeg;base64,${result.base64}`,
        });
      if (alive.current) setMessage("Đã cập nhật ảnh đại diện.");
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  async function removePhoto() {
    if (busy) return;
    setBusy("photo");
    setError(null);
    setMessage(null);
    try {
      await app.updateProfile({ avatar: null });
      if (alive.current) setMessage("Đã cập nhật ảnh đại diện.");
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  async function save() {
    if (busy) return;
    setBusy("profile");
    setError(null);
    setMessage(null);
    try {
      await app.updateProfile({ name: name.trim(), learningRole });
      if (alive.current) setMessage("Đã lưu thông tin tài khoản.");
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  return (
    <Page back="Cá nhân" refresh>
      <Title>Hồ sơ tài khoản</Title>
      <Body muted style={{ fontSize: 13 }}>
        Thông tin được đồng bộ với Soma trên web.
      </Body>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 20,
          paddingVertical: 28,
        }}
      >
        <UserAvatar name={app.user?.name} uri={app.user?.avatar} size={78} />
        <View style={{ flex: 1, gap: 10 }}>
          <Button
            secondary
            loading={busy === "photo"}
            disabled={!!busy}
            onPress={() => void photo()}
          >
            {app.user?.avatar ? "Thay ảnh đại diện" : "Thêm ảnh đại diện"}
          </Button>
          {!!app.user?.avatar && (
            <Pressable
              accessibilityRole="button"
              disabled={!!busy}
              onPress={() => void removePhoto()}
              style={{ minHeight: 36, justifyContent: "center" }}
            >
              <Text
                style={{ fontSize: 13, color: t.muted, textAlign: "center" }}
              >
                Xóa ảnh
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <Field
        label="Họ và tên"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Field
        label="Email"
        value={app.user?.email}
        editable={false}
        autoCapitalize="none"
      />
      <Choice
        label="Vai trò học tập"
        value={learningRole}
        onChange={(value) => setLearningRole(value as "learner" | "teacher")}
        options={[
          { value: "learner", label: "Người học" },
          { value: "teacher", label: "Giáo viên" },
        ]}
      />
      <ErrorText message={error} />
      {!!message && (
        <Body style={{ color: t.success, marginVertical: 12 }}>{message}</Body>
      )}
      <Button
        loading={busy === "profile"}
        disabled={
          !!busy ||
          name.trim().length < 2 ||
          (name.trim() === app.user?.name &&
            learningRole === (app.user?.learningRole ?? "learner"))
        }
        onPress={() => void save()}
      >
        Lưu thay đổi
      </Button>
      <View style={{ paddingVertical: 22, gap: 10 }}>
        <Fact
          label="Ngày tham gia"
          value={dateText(app.user?.createdAt, language)}
        />
        <Fact
          label="Loại tài khoản"
          value={
            app.user?.role === "admin"
              ? language === "en"
                ? "Administrator"
                : "Quản trị viên"
              : language === "en"
                ? "Member"
                : "Thành viên"
          }
        />
      </View>
      {overview.data ? (
        <MembershipSummary membership={overview.data.membership} />
      ) : (
        <ErrorText message={overview.error} />
      )}
      <MenuRow
        label="Bảo mật và thiết bị"
        icon="lock-closed-outline"
        onPress={() => router.push("/security")}
      />
      <MenuRow
        label="Tài khoản liên kết"
        icon="link-outline"
        onPress={() => router.push("/connections")}
      />
    </Page>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 18 }}
    >
      <Body muted style={{ fontSize: 13 }}>
        {label}
      </Body>
      <Text
        style={{
          fontSize: 13,
          color: t.ink,
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function AccountSecurityScreen() {
  return (
    <AccountGate>
      <SecurityDetails />
    </AccountGate>
  );
}
function SecurityDetails() {
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
function deviceLabel(agent: string | null, language: "vi" | "en") {
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

export function AccountConnectionsScreen() {
  return (
    <AccountGate>
      <ConnectionsDetails />
    </AccountGate>
  );
}
function ConnectionsDetails() {
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
              disabled={
                !!busy ||
                (linked ? methods <= 1 : !configured)
              }
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

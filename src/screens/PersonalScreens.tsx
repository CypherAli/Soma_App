import { Text } from "../ui/i18n";
import { useState } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import { apiRequest, errorMessage, normalizeApiUrl } from "../core/api";
import Constants from "expo-constants";
import { version } from "../../package.json";
import { socialReturnUrl } from "../core/socialLogin";
import { SYSTEM_NAMES } from "../core/types";
import {
  Body,
  Button,
  Choice,
  Empty,
  ErrorText,
  Field,
  Heading,
  Kicker,
  Loading,
  ModelRow,
  MenuRow,
  Page,
  SignInPrompt,
  Title,
} from "../ui/components";
import { useTheme } from "../ui/theme";

export function SavedScreen() {
  const app = useApp();
  return (
    <Page back="Cá nhân">
      <Title>Mô hình đã lưu</Title>
      <Body muted style={{ fontSize: 13, marginBottom: 15 }}>
        Chỉ lưu trên thiết bị này. Mục đã lưu được tách theo tài khoản.
      </Body>
      {!app.privateReady ? (
        <Loading />
      ) : app.privateData.saved.length ? (
        app.catalogue.models
          .filter((m) => app.privateData.saved.includes(m.id))
          .map((model) => (
            <ModelRow
              model={model}
              key={model.id}
              onPress={() =>
                router.push({
                  pathname: "/atlas/[id]",
                  params: { id: model.id },
                })
              }
            />
          ))
      ) : (
        <Empty
          title="Chưa lưu mô hình nào"
          action="Mở Atlas"
          onPress={() => router.replace("/(tabs)/atlas")}
        >
          Mở mô hình và chạm biểu tượng lưu để thêm vào danh sách này.
        </Empty>
      )}
    </Page>
  );
}

export function HistoryScreen() {
  const app = useApp(),
    t = useTheme();
  return (
    <Page back="Cá nhân" refresh>
      <Kicker>Học tập</Kicker>
      <Title>Lịch sử luyện tập</Title>
      {!app.user ? (
        <SignInPrompt next="profile" />
      ) : (
        <>
          <ErrorText message={app.studyError} />
          {app.studyLoading && !app.history ? (
            <Loading />
          ) : !app.history?.attempts.length ? (
            <Empty title="Chưa có lượt luyện tập">
              Kết quả xuất hiện sau khi bài làm được gửi lên tài khoản.
            </Empty>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  gap: 25,
                  borderBottomWidth: 1,
                  borderColor: t.rule,
                  paddingVertical: 20,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 31, color: t.ink }}>
                    {Math.round((app.history.totals.accuracy ?? 0) * 100)}%
                  </Text>
                  <Body muted style={{ fontSize: 12 }}>
                    Tỉ lệ đúng gần đây
                  </Body>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 31, color: t.ink }}>
                    {app.history.streak}
                  </Text>
                  <Body muted style={{ fontSize: 12 }}>
                    Ngày học liên tiếp
                  </Body>
                </View>
              </View>
              <Body muted style={{ fontSize: 11, marginTop: 12 }}>
                Thống kê tối đa 60 lượt gần nhất, dùng cùng dữ liệu với web.
              </Body>
              {app.history.attempts.map((attempt) => (
                <View
                  key={attempt.id}
                  style={{
                    paddingVertical: 17,
                    borderBottomWidth: 1,
                    borderColor: t.rule,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 15,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: t.ink, flex: 1 }}>
                      {attempt.source === "dr-lam"
                        ? "Đề ôn tập giải phẫu"
                        : attempt.source === "personal"
                          ? "Tài liệu cá nhân"
                          : (SYSTEM_NAMES[attempt.scope] ?? attempt.scope)}
                    </Text>
                    <Text
                      style={{ fontSize: 15, fontWeight: "600", color: t.ink }}
                    >
                      {attempt.score}/{attempt.total}
                    </Text>
                  </View>
                  <Body muted style={{ fontSize: 12, marginTop: 6 }}>
                    {new Date(attempt.createdAt).toLocaleString("vi-VN")} ·{" "}
                    {attempt.source === "model"
                      ? "Atlas"
                      : attempt.source === "book"
                        ? "Giáo trình"
                        : attempt.source === "dr-lam"
                          ? "Đề ôn tập"
                          : attempt.source === "personal"
                            ? "Tài liệu cá nhân"
                            : attempt.source}
                  </Body>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </Page>
  );
}

export function SettingsScreen() {
  const app = useApp();
  const [apiUrl, setApiUrl] = useState(app.preferences.apiUrl),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false),
    [connection, setConnection] = useState<string | null>(null);
  const appearance = app.preferences.appearance;
  async function checkConnection() {
    setChecking(true);
    setError(null);
    setConnection(null);
    try {
      const base = normalizeApiUrl(
        apiUrl,
        __DEV__ || Constants.expoConfig?.extra?.allowHttp === true,
      );
      const [catalogue, auth] = await Promise.all([
        apiRequest<{ schemaVersion: number; models: unknown[] }>(
          base,
          "/mobile/bootstrap",
          { timeoutMs: 6000 },
        ),
        apiRequest<{ mobileOAuth: boolean; oauth: { google?: boolean } }>(
          base,
          `/auth/mobile/capabilities?returnUrl=${encodeURIComponent(socialReturnUrl())}`,
          { timeoutMs: 6000 },
        ),
      ]);
      if (catalogue.schemaVersion !== 2 || !Array.isArray(catalogue.models))
        throw Error("Máy chủ cần cập nhật dữ liệu ứng dụng.");
      setConnection(
        `Đã kết nối · ${catalogue.models.length} mô hình\nEmail: sẵn sàng · Google: ${auth.mobileOAuth && auth.oauth.google ? "đã cấu hình" : "chưa được bật"}`,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  }
  return (
    <Page back="Cá nhân">
      <Title>Cài đặt</Title>
      <Choice
        label="Giao diện"
        value={appearance}
        onChange={(value) =>
          void app
            .updatePreferences({
              ...app.preferences,
              appearance: value as typeof appearance,
            })
            .catch((e) => setError(errorMessage(e)))
        }
        options={[
          { value: "system", label: "Theo hệ thống" },
          { value: "light", label: "Sáng" },
          { value: "dark", label: "Tối" },
        ]}
      />
      <Choice
        label="Ngôn ngữ"
        value={app.preferences.language ?? "vi"}
        onChange={(value) =>
          void app
            .updatePreferences({
              ...app.preferences,
              language: value as "vi" | "en",
            })
            .catch((e) => setError(errorMessage(e)))
        }
        options={[
          { value: "vi", label: "Tiếng Việt" },
          { value: "en", label: "English" },
        ]}
      />
      <Heading>Kết nối máy chủ</Heading>
      <Field
        label="Địa chỉ API"
        accessibilityLabel="Địa chỉ API"
        value={apiUrl}
        onChangeText={(value) => {
          setApiUrl(value);
          setConnection(null);
          setSaved(false);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Body muted style={{ fontSize: 12, lineHeight: 20 }}>
        Điện thoại cần dùng địa chỉ LAN hoặc HTTPS của máy chủ. Đổi máy chủ sẽ
        đăng xuất tài khoản hiện tại.
      </Body>
      <ErrorText message={error} />
      <Button
        secondary
        loading={checking}
        onPress={() => void checkConnection()}
        style={{ marginTop: 16 }}
      >
        Kiểm tra kết nối
      </Button>
      {connection && (
        <Body style={{ fontSize: 13, marginTop: 12 }}>{connection}</Body>
      )}
      {saved && (
        <Body style={{ fontSize: 13, marginVertical: 15 }}>
          Đã lưu cài đặt.
        </Body>
      )}
      <Button
        style={{ marginTop: 20 }}
        loading={busy}
        onPress={() => {
          setBusy(true);
          setError(null);
          setSaved(false);
          void app
            .updatePreferences({ ...app.preferences, apiUrl, appearance })
            .then(() => setSaved(true))
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      >
        Lưu cài đặt
      </Button>
      <Heading>Thông tin</Heading>
      <Body muted style={{ fontSize: 13 }}>
        Soma Mobile {Constants.expoConfig?.version ?? version} ·{" "}
        {Platform.OS === "web"
          ? "Bản xem trên trình duyệt"
          : Platform.OS === "ios"
            ? "iOS"
            : "Android"}
        {Platform.OS === "web"
          ? "\nPhiên đăng nhập trên trình duyệt chỉ giữ trong bộ nhớ của tab."
          : ""}
      </Body>
      <MenuRow
        label="Điều khoản sử dụng"
        icon="document-text-outline"
        onPress={() => router.push("/terms")}
      />
      <MenuRow
        label="Chính sách bảo mật"
        icon="shield-checkmark-outline"
        onPress={() => router.push("/privacy")}
      />
    </Page>
  );
}

export function SourcesScreen() {
  return (
    <Page back="Cá nhân">
      <Kicker>Soma Mobile</Kicker>
      <Title>Nguồn dữ liệu</Title>
      <Heading>Mô hình giải phẫu</Heading>
      <Body muted>
        Atlas BodyParts3D 4.0 © The Database Center for Life Science, CC BY 4.0.
        Các cảnh GLB dùng Z-Anatomy / BodyParts3D, giữ ghi công và giấy phép
        CC-BY-SA của nguồn. Dữ liệu trong app dùng cùng tài nguyên với Soma trên
        web.
      </Body>
      <Heading>Thuật ngữ và nội dung</Heading>
      <Body muted>
        Terminologia Anatomica và chú giải đã biên soạn trong thư viện Soma.
        Tên, ghi chú và câu hỏi được lấy từ nội dung công khai đã xuất bản qua
        hệ thống quản trị.
      </Body>
      <Heading>Câu hỏi luyện tập</Heading>
      <Body muted>
        Câu hỏi về cấu trúc và tên Latin được dẫn xuất từ chính các chú giải của
        mô hình. Mỗi câu giữ mã cấu trúc ổn định để dùng chung lịch ôn với web.
      </Body>
      <Heading>Phạm vi sử dụng</Heading>
      <Body muted>
        Ứng dụng phục vụ học tập giải phẫu. Nội dung chưa có trong thư viện sẽ
        được thông báo rõ trên màn hình.
      </Body>
    </Page>
  );
}

import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
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
                      {SYSTEM_NAMES[attempt.scope] ?? attempt.scope}
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

export function AccountScreen() {
  const app = useApp();
  const [name, setName] = useState(app.user?.name ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  if (!app.user)
    return (
      <Page back="Cá nhân">
        <SignInPrompt next="profile" />
      </Page>
    );
  return (
    <Page back="Cá nhân">
      <Title>Thông tin tài khoản</Title>
      <Field
        label="Họ và tên"
        accessibilityLabel="Họ và tên"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Body muted style={{ fontSize: 13, marginVertical: 15 }}>
        {app.user.email}
      </Body>
      <ErrorText message={error} />
      {saved && (
        <Body style={{ fontSize: 13, marginBottom: 15 }}>
          Đã cập nhật tên hiển thị.
        </Body>
      )}
      <Button
        loading={busy}
        onPress={() => {
          setBusy(true);
          setError(null);
          setSaved(false);
          void (async () => {
            if (name.trim().length < 2)
              throw new Error("Họ tên cần có ít nhất 2 ký tự.");
            await app.updateProfile(name);
            setSaved(true);
          })()
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      >
        Lưu thông tin
      </Button>
    </Page>
  );
}

export function SettingsScreen() {
  const app = useApp();
  const [apiUrl, setApiUrl] = useState(app.preferences.apiUrl),
    [appearance, setAppearance] = useState(app.preferences.appearance),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  return (
    <Page back="Cá nhân">
      <Title>Cài đặt</Title>
      <Choice
        label="Giao diện"
        value={appearance}
        onChange={(value) => setAppearance(value as typeof appearance)}
        options={[
          { value: "system", label: "Theo hệ thống" },
          { value: "light", label: "Sáng" },
          { value: "dark", label: "Tối" },
        ]}
      />
      <Heading>Kết nối máy chủ</Heading>
      <Field
        label="Địa chỉ API"
        accessibilityLabel="Địa chỉ API"
        value={apiUrl}
        onChangeText={setApiUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Body muted style={{ fontSize: 12, lineHeight: 20 }}>
        Điện thoại cần dùng địa chỉ LAN hoặc HTTPS của máy chủ. Đổi máy chủ sẽ
        đăng xuất tài khoản hiện tại.
      </Body>
      <ErrorText message={error} />
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
            .updatePreferences({ apiUrl, appearance })
            .then(() => setSaved(true))
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      >
        Lưu cài đặt
      </Button>
      <Heading>Thông tin</Heading>
      <Body muted style={{ fontSize: 13 }}>
        Soma Mobile 1.0 ·{" "}
        {Platform.OS === "web" ? "Bản xem trên trình duyệt" : "Android"}
        {Platform.OS === "web"
          ? "\nPhiên đăng nhập trên trình duyệt chỉ giữ trong bộ nhớ của tab."
          : ""}
      </Body>
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
        Z-Anatomy, dẫn xuất từ BodyParts3D. Giấy phép CC-BY-SA. Các mô hình
        trong app được lấy từ cùng tài nguyên của Soma trên web.
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

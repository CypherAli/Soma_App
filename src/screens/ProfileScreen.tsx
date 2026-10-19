import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import {
  Body,
  Button,
  Heading,
  Kicker,
  MenuRow,
  Page,
  Title,
} from "../ui/components";
import { useTheme } from "../ui/theme";
import { confirmAction } from "../ui/confirm";

export function ProfileScreen() {
  const app = useApp(),
    t = useTheme();
  const [busy, setBusy] = useState(false);
  return (
    <Page refresh>
      <Kicker>Tài khoản</Kicker>
      <Title>Cá nhân</Title>
      <View
        style={{
          paddingVertical: 24,
          borderBottomWidth: 1,
          borderColor: t.rule,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600", color: t.ink }}>
          {app.user?.name ?? "Chưa đăng nhập"}
        </Text>
        <Body muted style={{ fontSize: 13, marginTop: 5 }}>
          {app.user?.email ?? "Dùng cùng tài khoản với Soma trên web."}
        </Body>
      </View>
      {!app.user && (
        <Button
          style={{ marginTop: 20 }}
          onPress={() =>
            router.push({ pathname: "/auth", params: { next: "profile" } })
          }
        >
          Đăng nhập / Đăng ký
        </Button>
      )}
      <Heading>Học tập</Heading>
      <MenuRow
        label="Lộ trình của tôi"
        icon="calendar-outline"
        onPress={() => router.push("/plan")}
      />
      <MenuRow
        label="Lịch sử luyện tập"
        icon="bar-chart-outline"
        onPress={() => router.push("/history")}
      />
      <MenuRow
        label="Mô hình đã lưu"
        note={`${app.privateData.saved.length} mục · Chỉ trên thiết bị`}
        icon="bookmark-outline"
        onPress={() => router.push("/saved")}
      />
      <Heading>Ứng dụng</Heading>
      {app.user && (
        <MenuRow
          label="Thông tin tài khoản"
          icon="person-outline"
          onPress={() => router.push("/account")}
        />
      )}
      <MenuRow
        label="Cài đặt"
        icon="settings-outline"
        onPress={() => router.push("/settings")}
      />
      <MenuRow
        label="Nguồn dữ liệu và giấy phép"
        icon="book-outline"
        onPress={() => router.push("/sources")}
      />
      {app.user && (
        <Button
          secondary
          loading={busy}
          style={{ marginTop: 28 }}
          onPress={() => {
            void confirmAction(
              "Đăng xuất",
              "Bài làm và mục đã lưu vẫn nằm trong bộ nhớ riêng của tài khoản này trên thiết bị.",
              "Đăng xuất",
            ).then((confirmed) => {
              if (confirmed) {
                setBusy(true);
                void app.logout().finally(() => setBusy(false));
              }
            });
          }}
        >
          Đăng xuất
        </Button>
      )}
    </Page>
  );
}

import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import {
  Button,
  Heading,
  Icon,
  MenuRow,
  Page,
  Title,
  UserAvatar,
  ErrorText,
} from "../ui/components";
import { Text, useI18n } from "../ui/i18n";
import { useTheme } from "../ui/theme";
import { confirmAction } from "../ui/confirm";
import { MembershipSummary, useAccountOverview } from "./AccountScreens";

export function ProfileScreen() {
  const app = useApp(),
    t = useTheme(),
    { tr } = useI18n(),
    overview = useAccountOverview();
  const [busy, setBusy] = useState(false);
  const accuracy = app.history?.totals.accuracy;
  return (
    <Page refresh>
      <Title>Tài khoản</Title>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr(app.user ? "Hồ sơ tài khoản" : "Đăng nhập")}
        onPress={() => router.push(app.user ? "/account" : "/auth")}
        style={{
          flexDirection: "row",
          gap: 18,
          alignItems: "center",
          paddingTop: 22,
          paddingBottom: 28,
        }}
      >
        <UserAvatar name={app.user?.name} uri={app.user?.avatar} size={68} />
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            localize={false}
            style={{
              fontSize: 21,
              lineHeight: 29,
              fontWeight: "600",
              color: t.ink,
            }}
          >
            {app.user?.name ?? tr("Chưa đăng nhập")}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontSize: 13, color: t.muted, marginTop: 5 }}
          >
            {app.user?.email ?? tr("Dùng cùng tài khoản với Soma trên web.")}
          </Text>
          {app.user && (
            <Text style={{ fontSize: 12, color: t.accent, marginTop: 8 }}>
              {app.user.learningRole === "teacher"
                ? tr("Giáo viên")
                : tr("Người học")}
            </Text>
          )}
        </View>
        <Icon name="chevron-forward" size={17} color={t.muted} />
      </Pressable>
      {!app.user ? (
        <Button
          onPress={() =>
            router.push({ pathname: "/auth", params: { next: "profile" } })
          }
        >
          Đăng nhập / Đăng ký
        </Button>
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              paddingVertical: 21,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: t.rule,
            }}
          >
            {[
              [String(app.history?.attempts.length ?? 0), "Lượt gần đây"],
              [
                accuracy == null ? "—" : `${Math.round(accuracy * 100)}%`,
                "Độ chính xác",
              ],
              [String(app.history?.streak ?? 0), "Ngày liên tiếp"],
            ].map(([value, label], index) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  paddingLeft: index ? 16 : 0,
                  borderLeftWidth: index ? 1 : 0,
                  borderColor: t.rule,
                }}
              >
                <Text
                  style={{
                    fontSize: 27,
                    fontWeight: "600",
                    color: t.ink,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {value}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ fontSize: 11, color: t.muted, marginTop: 5 }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
          {overview.data && (
            <MembershipSummary membership={overview.data.membership} />
          )}
          <ErrorText message={overview.error} />
        </>
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
        note={`${app.privateData.saved.length}`}
        icon="bookmark-outline"
        onPress={() => router.push("/saved")}
      />
      <MenuRow
        label="Đề ôn tập giải phẫu"
        icon="reader-outline"
        onPress={() => router.push("/sources")}
      />
      <Heading>Tài khoản và bảo mật</Heading>
      {app.user && (
        <>
          <MenuRow
            label="Hồ sơ tài khoản"
            icon="person-outline"
            onPress={() => router.push("/account")}
          />
          <MenuRow
            label="Tài khoản liên kết"
            icon="link-outline"
            onPress={() => router.push("/connections")}
          />
          <MenuRow
            label="Bảo mật và thiết bị"
            icon="lock-closed-outline"
            onPress={() => router.push("/security")}
          />
        </>
      )}
      <MenuRow
        label="Cài đặt"
        icon="options-outline"
        onPress={() => router.push("/settings")}
      />
      <Heading>Thông tin</Heading>
      <MenuRow
        label="Nguồn dữ liệu và giấy phép"
        icon="book-outline"
        onPress={() => router.push("/licenses")}
      />
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
      {app.user && (
        <Button
          secondary
          loading={busy}
          style={{ marginTop: 30 }}
          onPress={() => {
            void confirmAction(
              tr("Đăng xuất"),
              tr(
                "Bài làm và mục đã lưu vẫn nằm trong bộ nhớ riêng của tài khoản này trên thiết bị.",
              ),
              tr("Đăng xuất"),
            ).then((ok) => {
              if (ok) {
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

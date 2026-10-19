import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import { SYSTEM_NAMES } from "../core/types";
import {
  Body,
  Button,
  Empty,
  ErrorText,
  Heading,
  Icon,
  Kicker,
  Page,
  TextLink,
  Title,
} from "../ui/components";
import { MODEL_ART } from "../ui/art";
import { useTheme } from "../ui/theme";

export function TodayScreen() {
  const app = useApp(),
    t = useTheme();
  const current = app.studyPath?.plan?.blocks.find((b) => b.current);
  const focus =
    current?.systemKey ?? app.studyPath?.path?.systemKey ?? "skeletal";
  const model =
    app.catalogue.models.find((m) => m.system === focus) ??
    app.catalogue.models[0];
  const draft = app.privateData.draft;
  const path = app.studyPath?.path;
  const due = app.dueKeys.filter((key) =>
    app.catalogue.questions.some((q) => q.itemKey === key),
  ).length;
  return (
    <Page refresh>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Kicker>{path ? "Lộ trình giải phẫu người" : "Giải phẫu người"}</Kicker>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thiết lập lộ trình"
          onPress={() => router.push("/plan")}
          style={{
            height: 44,
            width: 44,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <Icon name="options-outline" color={t.accent} size={20} />
        </Pressable>
      </View>
      <Title>{path ? "Buổi học hôm nay" : "Bắt đầu học giải phẫu"}</Title>
      <Body muted style={{ fontSize: 13, marginBottom: 23 }}>
        {path
          ? `Ngày ${app.studyPath?.plan?.dayIndex ?? 1} · ${path.minutesPerDay} phút mỗi buổi`
          : "Khám phá mô hình và luyện tập theo chủ đề."}
      </Body>
      <ErrorText message={app.studyError} />
      {model ? (
        <View
          style={{
            backgroundColor: "#18232e",
            borderRadius: 10,
            padding: 20,
            overflow: "hidden",
          }}
        >
          <Image
            source={MODEL_ART[model.id]}
            resizeMode="contain"
            style={{
              position: "absolute",
              right: -5,
              top: 15,
              width: "60%",
              height: 220,
              transform: [{ rotate: "-10deg" }],
            }}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 1.1,
              color: "#afbdce",
              maxWidth: "50%",
              textTransform: "uppercase",
            }}
          >
            {SYSTEM_NAMES[model.system]}
          </Text>
          <Text
            style={{
              fontSize: 27,
              lineHeight: 32,
              fontWeight: "600",
              letterSpacing: -0.4,
              color: "#f4f6f9",
              maxWidth: "59%",
              marginTop: 22,
              marginBottom: 13,
            }}
          >
            {model.id === "ban-tay"
              ? "Xương\nbàn tay"
              : model.id === "giai-phau-tim"
                ? "Giải phẫu\ntim"
                : model.title}
          </Text>
          <Text
            style={{
              fontSize: 12,
              lineHeight: 18,
              color: "#b9c7d6",
              maxWidth: "49%",
              minHeight: 52,
            }}
          >
            {model.english}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              borderTopWidth: 1,
              borderColor: "#ffffff24",
              marginTop: 35,
              paddingTop: 14,
            }}
          >
            <Text style={{ fontSize: 11, color: "#b9c7d6", flex: 1 }}>
              Khám phá mô hình 3D
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/atlas/[id]",
                  params: { id: model.id },
                })
              }
              style={{
                backgroundColor: "#f3f6fa",
                borderRadius: 7,
                paddingHorizontal: 14,
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: "600", color: "#172738" }}
              >
                {path ? "Tiếp tục" : "Mở Atlas"}
              </Text>
              <Icon name="arrow-forward-outline" size={16} color="#172738" />
            </Pressable>
          </View>
        </View>
      ) : (
        <Empty
          title="Chưa tải được thư viện"
          action="Thử kết nối lại"
          onPress={() => void app.refresh()}
        >
          Kiểm tra máy chủ trong Cài đặt để tải nội dung đã xuất bản.
        </Empty>
      )}
      {draft && !draft.receipt && (
        <View style={{ paddingTop: 20 }}>
          <Button
            secondary
            icon="arrow-forward"
            onPress={() => router.push(draft.completedAt ? "/result" : "/quiz")}
          >
            {draft.completedAt
              ? "Gửi lại kết quả đang chờ đồng bộ"
              : `Tiếp tục bài đang làm · ${draft.confirmed.length}/${draft.questions.length} câu`}
          </Button>
        </View>
      )}
      <Heading>Nội dung buổi học</Heading>
      {[
        {
          index: "01",
          title: "Khám phá mô hình",
          note: model
            ? `${model.structures.length} cấu trúc có chú giải`
            : "Thư viện giải phẫu người",
          onPress: () =>
            model
              ? router.push({
                  pathname: "/atlas/[id]",
                  params: { id: model.id },
                })
              : router.push("/(tabs)/atlas"),
        },
        {
          index: "02",
          title: "Kiểm tra kiến thức",
          note: due
            ? `${due} câu trong app đến hạn ôn`
            : "Luyện tập theo hệ cơ quan",
          onPress: () => router.push("/(tabs)/review"),
        },
      ].map((row) => (
        <Pressable
          accessibilityRole="button"
          onPress={row.onPress}
          key={row.index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 13,
            paddingVertical: 17,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: t.rule,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: t.muted,
              alignSelf: "flex-start",
              paddingTop: 2,
            }}
          >
            {row.index}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: t.ink }}>
              {row.title}
            </Text>
            <Text style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
              {row.note}
            </Text>
          </View>
          <Icon name="arrow-forward-outline" color={t.muted} size={17} />
        </Pressable>
      ))}
      {!path && (
        <>
          <Heading>Lộ trình của bạn</Heading>
          <Body muted style={{ fontSize: 13, marginBottom: 15 }}>
            Chọn số buổi và thời lượng phù hợp. Lộ trình được dùng chung trên
            điện thoại và web.
          </Body>
          <Button secondary onPress={() => router.push("/plan")}>
            {app.user ? "Tạo lộ trình" : "Đăng nhập và tạo lộ trình"}
          </Button>
        </>
      )}
      {path && (
        <TextLink onPress={() => router.push("/plan")}>
          Xem và điều chỉnh lộ trình
        </TextLink>
      )}
    </Page>
  );
}

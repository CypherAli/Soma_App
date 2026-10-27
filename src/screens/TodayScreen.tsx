import { Text } from "../ui/i18n";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import { SYSTEM_NAMES } from "../core/types";
import { Body, Button, ErrorText, Heading, Icon, Kicker, Page, TextLink } from "../ui/components";
import { ART_SCALE, modelArt } from "../ui/art";
import { useTheme } from "../ui/theme";

export function TodayScreen() {
  const app = useApp(), t = useTheme();
  const current = app.studyPath?.plan?.blocks.find((block) => block.current);
  const focus = current?.systemKey ?? app.studyPath?.path?.systemKey ?? "skeletal";
  const model = app.catalogue.models.find((item) => item.system === focus) ?? app.catalogue.models[0];
  const draft = app.privateData.draft, path = app.studyPath?.path;
  const due = app.dueKeys.filter((key) => app.catalogue.questions.some((q) => q.itemKey === key)).length;
  const openModel = () => model && router.push({ pathname: "/atlas/[id]", params: { id: model.id } });
  return (
    <Page refresh>
      <View style={styles.intro}>
        <View style={{ flex: 1 }}>
          <Kicker>Không gian học giải phẫu</Kicker>
          <Text accessibilityRole="header" style={[styles.title, { color: t.ink }]}>{path ? "Buổi học hôm nay" : "Khám phá cơ thể người"}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Thiết lập lộ trình"
          onPress={() => router.push("/plan")} style={[styles.settings, { backgroundColor: t.ground }]}>
          <Icon name="options-outline" color={t.accent} size={22} />
        </Pressable>
      </View>
      <Body muted style={{ fontSize: 14, marginBottom: 22 }}>
        {path ? `Ngày ${app.studyPath?.plan?.dayIndex ?? 1} · ${path.minutesPerDay} phút dành cho kiến thức mới.`
          : "Quan sát trong không gian 3D. Hiểu từng cấu trúc."}
      </Body>
      <ErrorText message={app.studyError} />
      {model && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Mở Atlas · ${model.title}`} onPress={openModel}
          style={({ pressed }) => [styles.hero, { backgroundColor: t.ground, opacity: pressed ? 0.9 : 1 }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.eyebrow, { color: t.accent }]}>{SYSTEM_NAMES[model.system] ?? "Atlas giải phẫu"}</Text>
            <View style={[styles.badge, { backgroundColor: t.paper }]}>
              <Icon name="cube-outline" size={13} color={t.accent} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: t.accent }}>ATLAS 3D</Text>
            </View>
          </View>
          <View style={styles.heroArtwork}>
            <Image source={modelArt(model, app.preferences.apiUrl)} resizeMode="contain"
              accessibilityLabel={model.title} style={[styles.heroImage, { transform: [{ scale: Math.min(ART_SCALE[model.id] ?? 1, 1.35) }] }]} />
          </View>
          <View style={styles.heroBottom}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.heroTitle, { color: t.ink }]}>{model.title}</Text>
              <Text style={{ color: t.muted, fontSize: 11, lineHeight: 17, marginTop: 5 }}>{model.english}</Text>
            </View>
            <View style={[styles.arrow, { backgroundColor: t.accent }]}>
              <Icon name="arrow-forward" size={23} color={t.onAccent} />
            </View>
          </View>
          <View style={[styles.heroFoot, { borderColor: t.rule }]}>
            <Icon name="hand-left-outline" size={14} color={t.muted} />
            <Text style={{ fontSize: 11, lineHeight: 17, color: t.muted, flex: 1 }}>Xoay, tách lớp và chạm để khám phá</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.accent, flexShrink: 0 }}>Mở Atlas</Text>
          </View>
        </Pressable>
      )}
      {draft && !draft.receipt && (
        <Button secondary style={{ marginTop: 18 }} icon="arrow-forward"
          onPress={() => router.push(draft.completedAt ? "/result" : "/quiz")}>
          {draft.completedAt ? "Gửi lại kết quả đang chờ đồng bộ" : `Tiếp tục bài đang làm · ${draft.confirmed.length}/${draft.questions.length} câu`}
        </Button>
      )}
      <Heading right={<Text style={{ color: t.muted, fontSize: 12 }}>{app.catalogue.models.length} mô hình</Text>}>Học theo cách của bạn</Heading>
      {[
        { icon: "layers-outline" as const, title: "Khám phá mô hình", note: "Quan sát, tách lớp và đọc chú giải", onPress: () => router.push("/(tabs)/atlas") },
        { icon: "checkmark-done-outline" as const, title: "Kiểm tra kiến thức", note: due ? `${due} câu đang đến hạn ôn` : "Luyện tập theo từng hệ cơ quan", onPress: () => router.push("/(tabs)/review") },
      ].map((row) => (
        <Pressable accessibilityRole="button" key={row.title} onPress={row.onPress}
          style={({ pressed }) => [styles.lesson, { borderColor: t.rule, backgroundColor: pressed ? t.ground : t.paper }]}>
          <View style={[styles.lessonIcon, { backgroundColor: t.tint }]}><Icon name={row.icon} size={21} color={t.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: t.ink }}>{row.title}</Text>
            <Text style={{ fontSize: 12, lineHeight: 18, color: t.muted, marginTop: 4 }}>{row.note}</Text>
          </View>
          <Icon name="chevron-forward" color={t.muted} size={17} />
        </Pressable>
      ))}
      {!path ? (
        <View style={[styles.plan, { backgroundColor: t.tint }]}>
          <Icon name="calendar-outline" color={t.accent} size={24} />
          <Text style={{ color: t.ink, fontSize: 17, fontWeight: "600", marginTop: 12 }}>Mỗi ngày, hiểu thêm một chút.</Text>
          <Body muted style={{ fontSize: 13, marginTop: 6, marginBottom: 14 }}>Tạo lộ trình theo thời gian và chủ đề bạn muốn học.</Body>
          <Button onPress={() => router.push("/plan")}>{app.user ? "Tạo lộ trình" : "Đăng nhập và tạo lộ trình"}</Button>
        </View>
      ) : <TextLink onPress={() => router.push("/plan")}>Xem và điều chỉnh lộ trình</TextLink>}
    </Page>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 32, fontWeight: "600", letterSpacing: -0.6, marginBottom: 7 },
  intro: { flexDirection: "row", gap: 12, alignItems: "center" },
  settings: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  hero: { borderRadius: 24, overflow: "hidden" },
  heroTop: { paddingTop: 20, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.1, flexShrink: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", gap: 5, alignItems: "center", flexShrink: 0 },
  heroArtwork: { height: 210, marginVertical: 12, overflow: "hidden" },
  heroImage: { width: "100%", height: "100%" },
  heroBottom: { flexDirection: "row", gap: 12, alignItems: "center", paddingHorizontal: 20, paddingBottom: 18 },
  heroTitle: { fontSize: 19, lineHeight: 25, fontWeight: "600", letterSpacing: -0.25 },
  arrow: { height: 44, width: 44, flexShrink: 0, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  heroFoot: { marginHorizontal: 20, paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 8 },
  lesson: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 17, borderBottomWidth: StyleSheet.hairlineWidth },
  lessonIcon: { height: 46, width: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  plan: { padding: 22, borderRadius: 20, marginTop: 28 },
});

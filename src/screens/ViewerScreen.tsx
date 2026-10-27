import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchViewer } from "../components/TouchViewer";
import type {
  ViewerEvent,
  ViewerGroup,
  ViewerHandle,
  ViewerState,
  ViewerStructure,
} from "../components/Viewer.types";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { fold } from "../core/practice";
import { SYSTEM_NAMES } from "../core/types";
import { ViewerTools } from "../features/atlas/ViewerTools";
import { viewerStyles as styles } from "../features/atlas/viewerStyles";
import { DisplayControls } from "../ui/DisplayControls";
import { modelArt } from "../ui/art";
import {
  Body,
  Button,
  Empty,
  ErrorText,
  Icon,
  Notice,
  Page,
} from "../ui/components";
import { Text } from "../ui/i18n";
import { useTheme } from "../ui/theme";

type Panel = "structures" | "layers" | "tools" | "info" | null;
export function ViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences } = useApp();
  return <ViewerContent key={`${id}|${preferences.apiUrl}`} />;
}
function ViewerContent() {
  const { id, mesh } = useLocalSearchParams<{ id: string; mesh?: string }>();
  const app = useApp(),
    t = useTheme();
  const { height } = useWindowDimensions();
  const model = app.catalogue.models.find((item) => item.id === id);
  const viewer = useRef<ViewerHandle>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0),
    [structures, setStructures] = useState<ViewerStructure[]>([]);
  const [groups, setGroups] = useState<ViewerGroup[]>([]),
    [selected, setSelected] = useState<ViewerStructure | null>(null);
  const [sceneState, setSceneState] = useState<ViewerState | null>(null);
  const [hidden, setHidden] = useState<string[]>([]),
    [query, setQuery] = useState("");
  const [contentPanel, setContentPanel] =
    useState<Exclude<Panel, null>>("info");
  const [panelOpen, setPanelOpen] = useState(false);
  function setPanel(next: Panel) {
    if (next) {
      setContentPanel(next);
      setPanelOpen(true);
    } else setPanelOpen(false);
  }
  const [handSide, setHandSide] = useState<"left" | "right" | "both">("right");
  const [initialDark] = useState(t.dark);
  useEffect(() => {
    if (ready)
      viewer.current?.command({
        type: "appearance",
        dark: t.dark,
        locale: app.preferences.language ?? "vi",
      });
  }, [ready, t.dark, app.preferences.language]);
  const uri = model
    ? `${app.preferences.apiUrl || "https://offline.soma.local/api"}${model.viewerPath}?theme=${initialDark ? "dark" : "light"}&reload=${reload}`
    : "";
  const event = useCallback(
    (value: ViewerEvent) => {
      if (value.type === "ready") {
        setReady(true);
        setError(null);
        setStructures(value.structures);
        setGroups(value.groups);
        if (value.state) {
          setSceneState(value.state);
          setHidden(value.state.hiddenCategories);
          if (value.state.side) setHandSide(value.state.side);
        }
        if (mesh) viewer.current?.command({ type: "select", meshName: mesh });
      } else if (value.type === "state") {
        setSceneState(value.state);
        setHidden(value.state.hiddenCategories);
        if (value.state.side) setHandSide(value.state.side);
      } else if (value.type === "selected") {
        setSelected(value.structure);
        if (value.structure && id === "ban-tay") {
          const side = /\bleft\b|[._]l$/i.test(
            value.structure.english || value.structure.meshName,
          )
            ? "left"
            : "right";
          setHandSide((previous) => (previous === "both" ? previous : side));
        }
      } else setError(value.message);
    },
    [
      id,
      mesh,
      setReady,
      setError,
      setStructures,
      setGroups,
      setSceneState,
      setHidden,
      setSelected,
      setHandSide,
    ],
  );
  if (!model)
    return (
      <Page back="Atlas">
        <Empty
          title="Chưa có nội dung mô hình"
          action="Tải lại thư viện"
          onPress={() => void app.refresh()}
        >
          Kiểm tra kết nối máy chủ rồi thử lại.
        </Empty>
      </Page>
    );
  const saved = app.privateData.saved.includes(id);
  function choose(item: ViewerStructure) {
    if (hidden.includes(item.category)) {
      setHidden((previous) => previous.filter((key) => key !== item.category));
      viewer.current?.command({
        type: "visibility",
        category: item.category,
        visible: true,
      });
    }
    viewer.current?.command({ type: "select", meshName: item.meshName });
    setPanel(null);
  }
  function practice() {
    setPanel(null);
    router.push({ pathname: "/(tabs)/review", params: { model: id } });
  }
  const iconButton = { ...styles.iconButton, backgroundColor: t.paper };
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: t.paper }}
    >
      <View style={[styles.header, { borderColor: t.rule }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về Atlas"
          onPress={() => router.replace("/(tabs)/atlas")}
          style={styles.iconButton}
        >
          <Icon name="arrow-back" size={23} color={t.ink} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              color: t.muted,
              marginBottom: 3,
            }}
          >
            {(SYSTEM_NAMES[model.system] ?? model.system).toLocaleUpperCase(
              "vi",
            )}
          </Text>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              fontSize: 17,
              lineHeight: 24,
              fontWeight: "600",
              color: t.ink,
              letterSpacing: -0.4,
            }}
          >
            {app.preferences.language === "en"
              ? model.english || model.title
              : model.title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông tin mô hình"
          onPress={() => setPanel("info")}
          style={styles.iconButton}
        >
          <Icon name="information-circle-outline" size={22} color={t.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? "Bỏ lưu mô hình" : "Lưu mô hình"}
          accessibilityState={{ selected: saved, disabled: !app.privateReady }}
          disabled={!app.privateReady}
          onPress={() =>
            void app.toggleSaved(id).catch((e) => setError(errorMessage(e)))
          }
          style={styles.iconButton}
        >
          <Icon
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color={saved ? t.accent : t.ink}
          />
        </Pressable>
        <DisplayControls />
      </View>
      <Notice />
      <View style={{ flex: 1, minHeight: 240, backgroundColor: t.ground }}>
        {!error && (
          <TouchViewer
            ref={viewer}
            uri={uri}
            onEvent={event}
            onError={setError}
          />
        )}
        {!ready && !error && (
          <View
            pointerEvents="none"
            style={[styles.loading, { backgroundColor: t.ground, gap: 14 }]}
          >
            <Image
              source={modelArt(model, app.preferences.apiUrl)}
              resizeMode="contain"
              style={{ width: "80%", height: "55%", opacity: 0.4 }}
            />
            <ActivityIndicator color={t.accent} />
            <Text style={{ fontSize: 13, color: t.muted }}>
              Đang chuẩn bị mô hình 3D…
            </Text>
          </View>
        )}
        {id === "ban-tay" && ready && !error && (
          <View pointerEvents="box-none" style={styles.sidePosition}>
            <View
              style={[
                styles.sides,
                { backgroundColor: t.paper, borderColor: t.rule },
              ]}
            >
              {(
                [
                  ["right", "Tay phải"],
                  ["left", "Tay trái"],
                  ["both", "Hai tay"],
                ] as const
              )
                .filter(
                  ([side]) =>
                    !sceneState?.availableSides?.length ||
                    sceneState.availableSides.includes(side),
                )
                .map(([side, label]) => (
                  <Pressable
                    key={side}
                    accessibilityRole="button"
                    accessibilityState={{ selected: handSide === side }}
                    onPress={() => {
                      setHandSide(side);
                      viewer.current?.command({ type: "side", side });
                    }}
                    style={{
                      minHeight: 42,
                      justifyContent: "center",
                      paddingHorizontal: 17,
                      borderRadius: 9,
                      backgroundColor: handSide === side ? t.tint : t.paper,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: handSide === side ? "600" : "400",
                        color: handSide === side ? t.accent : t.muted,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        )}
        {ready && !error && (
          <View style={styles.tools}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Phóng to mô hình"
              onPress={() =>
                viewer.current?.command({ type: "zoom", factor: 0.8 })
              }
              style={iconButton}
            >
              <Icon name="add" size={23} color={t.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thu nhỏ mô hình"
              onPress={() =>
                viewer.current?.command({ type: "zoom", factor: 1.25 })
              }
              style={iconButton}
            >
              <Icon name="remove" size={23} color={t.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đặt lại góc nhìn"
              onPress={() => viewer.current?.command({ type: "reset" })}
              style={iconButton}
            >
              <Icon name="scan-outline" size={21} color={t.ink} />
            </Pressable>
          </View>
        )}
        {error && (
          <View style={{ flex: 1, justifyContent: "center", padding: 28 }}>
            <ErrorText message={error} />
            <Button
              secondary
              onPress={() => {
                setError(null);
                setReady(false);
                setSelected(null);
                setHidden([]);
                setHandSide("right");
                setSceneState(null);
                setReload((value) => value + 1);
              }}
            >
              Tải lại mô hình
            </Button>
          </View>
        )}
        {!error && (
          <Text
            pointerEvents="none"
            style={[styles.gesture, { color: t.muted }]}
          >
            Kéo để xoay · Chụm để zoom
          </Text>
        )}
      </View>
      <View
        style={[styles.dock, { backgroundColor: t.paper, borderColor: t.rule }]}
      >
        {selected ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chi tiết cấu trúc"
            onPress={() => setPanel("info")}
            style={{ paddingBottom: 15 }}
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: t.ink }}>
                  {app.preferences.language === "en"
                    ? selected.english || selected.label
                    : selected.label}
                </Text>
                {!!selected.latin && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: t.muted,
                      marginTop: 4,
                      fontStyle: "italic",
                    }}
                  >
                    {selected.latin}
                  </Text>
                )}
              </View>
              <Icon name="chevron-forward" size={18} color={t.muted} />
            </View>
            {!!selected.note && (
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 12,
                  lineHeight: 19,
                  color: t.muted,
                  marginTop: 7,
                }}
              >
                {selected.note}
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={{ paddingBottom: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: "500", color: t.ink }}>
              Chạm vào cấu trúc để khám phá
            </Text>
            <Text
              style={{
                fontSize: 12,
                lineHeight: 18,
                color: t.muted,
                marginTop: 4,
              }}
            >
              Tên gọi và chú giải sẽ hiện tại đây.
            </Text>
          </View>
        )}
        {selected && ready && !error && (
          <View style={[styles.row, { gap: 8, paddingBottom: 12 }]}>
            {(
              [
                [
                  "isolate",
                  sceneState?.isolate ? "Hiện xung quanh" : "Cô lập",
                  !!sceneState?.isolate,
                ],
                [
                  "hide",
                  sceneState?.selectedHidden ? "Hiện lại" : "Ẩn",
                  !!sceneState?.selectedHidden,
                ],
                [
                  "fade",
                  sceneState?.selectedFaded ? "Bỏ mờ" : "Làm mờ",
                  !!sceneState?.selectedFaded,
                ],
              ] as const
            ).map(([type, label, active]) => (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
                onPress={() =>
                  viewer.current?.command({ type, enabled: !active })
                }
                style={[
                  styles.action,
                  {
                    flex: 1,
                    borderColor: active ? t.accent : t.rule,
                    backgroundColor: active ? t.tint : t.paper,
                  },
                ]}
              >
                <Text
                  style={{ color: active ? t.accent : t.ink, fontSize: 12 }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={[styles.row, { gap: 7 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cấu trúc (${structures.length})`}
            disabled={!ready}
            onPress={() => setPanel("structures")}
            style={[styles.action, { flex: 1.35, borderColor: t.rule }]}
          >
            <Icon name="list-outline" size={17} color={t.ink} />
            <Text style={{ fontSize: 12, color: t.ink }}>
              {ready ? `Cấu trúc (${structures.length})` : "Cấu trúc"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tách mô hình"
            disabled={!ready || !!error}
            accessibilityState={{ selected: (sceneState?.explode ?? 0) > 0 }}
            onPress={() => setPanel("tools")}
            style={[
              styles.action,
              {
                flex: 0.9,
                borderColor: (sceneState?.explode ?? 0) > 0 ? t.accent : t.rule,
              },
            ]}
          >
            <Icon name="expand-outline" size={17} color={t.ink} />
            <Text style={{ fontSize: 12, color: t.ink }}>Tách</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hiện / ẩn"
            disabled={!ready}
            onPress={() => setPanel("layers")}
            style={[styles.action, { flex: 0.75, borderColor: t.rule }]}
          >
            <Icon name="layers-outline" size={17} color={t.ink} />
            <Text style={{ fontSize: 12, color: t.ink }}>Lớp</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Luyện tập chủ đề này"
            onPress={practice}
            style={[
              styles.action,
              { flex: 1.15, borderColor: t.accent, backgroundColor: t.accent },
            ]}
          >
            <Icon name="school-outline" size={17} color={t.onAccent} />
            <Text
              style={{ fontSize: 12, fontWeight: "600", color: t.onAccent }}
            >
              Luyện tập
            </Text>
          </Pressable>
        </View>
      </View>
      <Modal
        visible={panelOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPanel(null)}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng bảng"
            onPress={() => setPanel(null)}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView
            edges={["bottom", "left", "right"]}
            style={[
              styles.sheet,
              {
                height: Math.min(height * 0.75, 720),
                backgroundColor: t.paper,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: t.rule }]} />
            <View
              style={[styles.row, { paddingHorizontal: 22, paddingBottom: 12 }]}
            >
              <Text
                accessibilityRole="header"
                style={{
                  flex: 1,
                  fontSize: 21,
                  fontWeight: "600",
                  color: t.ink,
                }}
              >
                {contentPanel === "structures"
                  ? "Cấu trúc giải phẫu"
                  : contentPanel === "layers"
                    ? "Các lớp mô hình"
                    : contentPanel === "tools"
                      ? "Tách & quan sát"
                      : (selected?.label ?? model.title)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng bảng thông tin"
                onPress={() => setPanel(null)}
                style={styles.iconButton}
              >
                <Icon name="close" size={23} color={t.ink} />
              </Pressable>
            </View>
            {contentPanel === "structures" ? (
              <>
                <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
                  <TextInput
                    accessibilityLabel="Tìm cấu trúc trong mô hình"
                    placeholder="Tên tiếng Việt hoặc Latin…"
                    placeholderTextColor={t.muted}
                    value={query}
                    onChangeText={setQuery}
                    style={{
                      minHeight: 48,
                      borderRadius: 10,
                      backgroundColor: t.ground,
                      paddingHorizontal: 15,
                      fontSize: 15,
                      color: t.ink,
                    }}
                  />
                </View>
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={structures.filter((item) =>
                    fold(
                      `${app.preferences.language === "en" ? ("english" in item && (item.english as string)) || item.label : item.label} ${item.latin} ${item.meshName}`,
                    ).includes(fold(query)),
                  )}
                  keyExtractor={(item) => item.meshName}
                  initialNumToRender={12}
                  windowSize={5}
                  contentContainerStyle={{
                    paddingHorizontal: 22,
                    paddingBottom: 25,
                  }}
                  ListEmptyComponent={
                    <Body muted>Không tìm thấy cấu trúc phù hợp.</Body>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => choose(item)}
                      style={{
                        paddingVertical: 15,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: t.rule,
                      }}
                    >
                      <Text style={{ fontSize: 15, color: t.ink }}>
                        {app.preferences.language === "en"
                          ? ("english" in item && (item.english as string)) ||
                            item.label
                          : item.label}
                      </Text>
                      {!!item.latin && (
                        <Text
                          style={{
                            fontSize: 12,
                            lineHeight: 19,
                            color: t.muted,
                            marginTop: 3,
                          }}
                        >
                          {item.latin}
                        </Text>
                      )}
                    </Pressable>
                  )}
                />
              </>
            ) : (
              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: 22,
                  paddingBottom: 30,
                }}
              >
                {contentPanel === "tools" ? (
                  <ViewerTools
                    sceneState={sceneState}
                    selected={selected}
                    onCommand={(command) => viewer.current?.command(command)}
                  />
                ) : contentPanel === "layers" ? (
                  groups.map((item) => (
                    <View
                      key={item.key}
                      style={[
                        styles.row,
                        {
                          minHeight: 62,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderColor: t.rule,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.ink, fontSize: 15 }}>
                          {app.preferences.language === "en"
                            ? ("english" in item && (item.english as string)) ||
                              item.label
                            : item.label}
                        </Text>
                        <Text
                          style={{ color: t.muted, fontSize: 12, marginTop: 3 }}
                        >
                          {item.count} cấu trúc
                        </Text>
                      </View>
                      <Switch
                        accessibilityLabel={`Hiển thị ${app.preferences.language === "en" ? ("english" in item && (item.english as string)) || item.label : item.label}`}
                        value={!hidden.includes(item.key)}
                        onValueChange={(visible) => {
                          setHidden((previous) =>
                            visible
                              ? previous.filter((key) => key !== item.key)
                              : [...previous, item.key],
                          );
                          viewer.current?.command({
                            type: "visibility",
                            category: item.key,
                            visible,
                          });
                        }}
                        trackColor={{ true: t.accent, false: t.rule }}
                      />
                    </View>
                  ))
                ) : (
                  <>
                    {!!selected?.english && (
                      <Body muted style={{ marginBottom: 12 }}>
                        {selected.english}
                      </Body>
                    )}
                    {!!selected?.latin && (
                      <Text
                        style={{
                          color: t.accent,
                          fontSize: 15,
                          fontStyle: "italic",
                          marginBottom: 16,
                        }}
                      >
                        {selected.latin}
                      </Text>
                    )}
                    <Body style={{ fontSize: 15, lineHeight: 25 }}>
                      {selected
                        ? selected.note ||
                          "Cấu trúc này chưa có chú giải trong thư viện Soma."
                        : model.description}
                    </Body>
                    {selected?.landmarks?.map((landmark, index) => (
                      <View
                        key={`${landmark.latin}-${index}`}
                        style={{ marginTop: 20 }}
                      >
                        <Text
                          style={{
                            color: t.ink,
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                        >
                          {landmark.label}
                        </Text>
                        {!!landmark.latin && (
                          <Body muted>{landmark.latin}</Body>
                        )}
                        <Body style={{ marginTop: 6 }}>{landmark.note}</Body>
                        {!!landmark.source && (
                          <Body muted style={{ fontSize: 11, marginTop: 5 }}>
                            Nguồn: {landmark.source}
                          </Body>
                        )}
                      </View>
                    ))}
                    {!!selected?.sources?.length && (
                      <View style={{ marginTop: 20 }}>
                        <Text
                          style={{
                            color: t.ink,
                            fontSize: 15,
                            fontWeight: "600",
                          }}
                        >
                          Nguồn chú giải
                        </Text>
                        {selected.sources.map((source, index) => (
                          <Body
                            key={`${source.title}-${index}`}
                            muted
                            style={{ fontSize: 12, marginTop: 7 }}
                          >
                            {source.title}
                            {source.page ? ` · trang ${source.page}` : ""}
                          </Body>
                        ))}
                      </View>
                    )}
                    <Button style={{ marginTop: 24 }} onPress={practice}>
                      Luyện tập chủ đề này
                    </Button>
                    <Body
                      muted
                      style={{ fontSize: 11, lineHeight: 18, marginTop: 24 }}
                    >
                      {model.attribution}
                    </Body>
                  </>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

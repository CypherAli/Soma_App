import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import { fold } from "../core/practice";
import { SYSTEM_NAMES } from "../core/types";
import {
  Body,
  Empty,
  Icon,
  Kicker,
  ModelRow,
  Page,
  Title,
} from "../ui/components";
import { useTheme } from "../ui/theme";

export function AtlasScreen() {
  const { catalogue, refresh } = useApp(),
    t = useTheme();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const models = useMemo(
    () =>
      catalogue.models.filter(
        (m) =>
          (filter === "all" || m.system === filter) &&
          fold(
            [
              m.title,
              m.english,
              m.description,
              ...m.structures.flatMap((s) => [s.label, s.english, s.latin]),
            ].join(" "),
          ).includes(fold(query)),
      ),
    [catalogue.models, query, filter],
  );
  const systems = [...new Set(catalogue.models.map((m) => m.system))];
  return (
    <Page refresh>
      <Kicker>Thư viện mô hình · Giải phẫu người</Kicker>
      <Title>Atlas</Title>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          minHeight: 48,
          borderWidth: 1,
          borderColor: t.rule,
          borderRadius: 8,
          backgroundColor: t.ground,
          paddingHorizontal: 12,
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        <Icon name="search-outline" color={t.muted} size={18} />
        <TextInput
          accessibilityLabel="Tìm trong Atlas"
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm mô hình hoặc cấu trúc"
          placeholderTextColor={t.muted}
          returnKeyType="search"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 46,
            fontSize: 15,
            color: t.ink,
          }}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa từ tìm kiếm"
            onPress={() => setQuery("")}
            style={{
              width: 32,
              minHeight: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Icon name="close" color={t.muted} size={17} />
          </Pressable>
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 18,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: t.rule,
        }}
      >
        {["all", ...systems].map((system) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === system }}
            key={system}
            onPress={() => setFilter(system)}
            style={{
              minHeight: 44,
              justifyContent: "center",
              borderBottomWidth: filter === system ? 2 : 0,
              borderColor: t.accent,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: filter === system ? "600" : "400",
                color: filter === system ? t.ink : t.muted,
              }}
            >
              {system === "all" ? "Tất cả" : SYSTEM_NAMES[system]}
            </Text>
          </Pressable>
        ))}
      </View>
      {models.map((model) => (
        <View key={model.id}>
          <ModelRow
            model={model}
            onPress={() =>
              router.push({ pathname: "/atlas/[id]", params: { id: model.id } })
            }
          />
          {query.trim() &&
            model.structures
              .filter((s) =>
                fold(`${s.label} ${s.english} ${s.latin}`).includes(
                  fold(query),
                ),
              )
              .slice(0, 4)
              .map((structure) => (
                <Pressable
                  accessibilityRole="button"
                  key={structure.id}
                  onPress={() =>
                    router.push({
                      pathname: "/atlas/[id]",
                      params: { id: model.id, mesh: structure.meshName },
                    })
                  }
                  style={{
                    paddingVertical: 12,
                    paddingLeft: 17,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderColor: t.rule,
                  }}
                >
                  <Text style={{ fontSize: 13, color: t.accent }}>
                    {structure.label}
                  </Text>
                  <Text style={{ fontSize: 11, color: t.muted, marginTop: 3 }}>
                    {structure.latin || structure.english}
                  </Text>
                </Pressable>
              ))}
        </View>
      ))}
      {!models.length && (
        <Empty
          title={
            catalogue.models.length
              ? "Không có kết quả phù hợp"
              : "Chưa tải được thư viện"
          }
          action={catalogue.models.length ? "Xóa bộ lọc" : "Thử lại"}
          onPress={() => {
            if (catalogue.models.length) {
              setQuery("");
              setFilter("all");
            } else void refresh();
          }}
        >
          {catalogue.models.length
            ? "Thử tên Việt, Anh hoặc Latin khác."
            : "Kiểm tra kết nối máy chủ trong Cài đặt."}
        </Empty>
      )}
      {!!models.length && (
        <Body muted style={{ fontSize: 11, marginTop: 16 }}>
          Mô hình được tải khi mở · Z-Anatomy / Soma
        </Body>
      )}
    </Page>
  );
}

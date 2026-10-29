import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { useTheme } from "./theme";
import { Text, useI18n } from "./i18n";
import type { Appearance } from "../core/types";

export function DisplayControls() {
  const app = useApp(),
    t = useTheme(),
    insets = useSafeAreaInsets(),
    { tr } = useI18n();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function choose(patch: {
    appearance?: Appearance;
    language?: "vi" | "en";
  }) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await app.updatePreferences({ ...app.preferences, ...patch });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("Tùy chọn hiển thị")}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          backgroundColor: pressed ? t.ground : "transparent",
        })}
      >
        <Ionicons name="options-outline" size={21} color={t.ink} />
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        >
          <Pressable
            accessibilityLabel={tr("Đóng")}
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: t.paper,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingHorizontal: 24,
              paddingTop: 18,
              paddingBottom: Math.max(insets.bottom, 20) + 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 22,
              }}
            >
              <View>
                <Text style={{ fontSize: 21, fontWeight: "600", color: t.ink }}>
                  Hiển thị
                </Text>
                <Text style={{ fontSize: 13, color: t.muted, marginTop: 5 }}>
                  Điều chỉnh không gian học
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr("Đóng")}
                onPress={() => setOpen(false)}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close-outline" size={24} color={t.ink} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 13, color: t.muted, marginBottom: 10 }}>
              Giao diện
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 26 }}>
              {(
                [
                  ["system", "Thiết bị", "phone-portrait-outline"],
                  ["light", "Sáng", "ellipse-outline"],
                  ["dark", "Tối", "ellipse"],
                ] as const
              ).map(([value, label, icon]) => (
                <Pressable
                  key={value}
                  disabled={busy}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: app.preferences.appearance === value,
                  }}
                  accessibilityLabel={tr(label)}
                  onPress={() => void choose({ appearance: value })}
                  style={{
                    flex: 1,
                    minHeight: 76,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor:
                      app.preferences.appearance === value ? t.accent : t.rule,
                    backgroundColor:
                      app.preferences.appearance === value ? t.tint : t.paper,
                    justifyContent: "space-between",
                  }}
                >
                  <Ionicons
                    name={icon}
                    size={18}
                    color={
                      app.preferences.appearance === value ? t.accent : t.muted
                    }
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={{ fontSize: 12, color: t.ink, marginTop: 12 }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: t.muted, marginBottom: 10 }}>
              Ngôn ngữ
            </Text>
            {(
              [
                ["vi", "Tiếng Việt"],
                ["en", "English"],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                disabled={busy}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: (app.preferences.language ?? "vi") === value,
                }}
                accessibilityLabel={label}
                onPress={() => void choose({ language: value })}
                style={{
                  minHeight: 54,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderColor: t.rule,
                }}
              >
                <Text style={{ fontSize: 16, color: t.ink }}>{label}</Text>
                {(app.preferences.language ?? "vi") === value && (
                  <Ionicons
                    name="checkmark-outline"
                    size={19}
                    color={t.accent}
                  />
                )}
              </Pressable>
            ))}
            {!!error && (
              <Text
                accessibilityRole="alert"
                style={{ color: t.error, marginTop: 12, fontSize: 13 }}
              >
                {error}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

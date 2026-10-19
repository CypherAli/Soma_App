import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import { useTheme } from "./theme";
import type { AnatomyModel } from "../core/types";
import { SYSTEM_NAMES } from "../core/types";
import { MODEL_ART } from "./art";

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: ColorValue;
}) {
  const t = useTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color ?? t.ink}
      accessible={false}
      aria-hidden={true}
    />
  );
}
export function Body({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: React.ComponentProps<typeof Text>["style"];
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        { fontSize: 15, lineHeight: 23, color: muted ? t.muted : t.ink },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Title({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontSize: 28,
        lineHeight: 35,
        fontWeight: "600",
        letterSpacing: -0.7,
        color: t.ink,
        marginBottom: 7,
      }}
    >
      {children}
    </Text>
  );
}
export function Kicker({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontSize: 11,
        lineHeight: 17,
        fontWeight: "600",
        letterSpacing: 1,
        color: t.muted,
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}
export function Heading({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        marginTop: 27,
        marginBottom: 12,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontSize: 16, fontWeight: "600", color: t.ink, flexShrink: 1 }}
      >
        {children}
      </Text>
      {right}
    </View>
  );
}
export function Button({
  children,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
  icon,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          minHeight: 50,
          paddingHorizontal: 16,
          paddingVertical: 13,
          borderRadius: 8,
          backgroundColor: secondary ? t.paper : t.accent,
          borderWidth: secondary ? 1 : 0,
          borderColor: t.rule,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? t.ink : t.onAccent} />
      ) : (
        <>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: secondary ? t.ink : t.onAccent,
              textAlign: "center",
              flexShrink: 1,
            }}
          >
            {children}
          </Text>
          {icon && (
            <Icon
              name={icon}
              size={18}
              color={secondary ? t.ink : t.onAccent}
            />
          )}
        </>
      )}
    </Pressable>
  );
}
export function TextLink({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 44,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
      }}
    >
      <Text style={{ fontSize: 13, color: t.accent, textAlign: "center" }}>
        {children}
      </Text>
    </Pressable>
  );
}
export function Brand() {
  const t = useTheme();
  const { user } = useApp();
  return (
    <View
      style={{
        height: 70,
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: t.rule,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Về Hôm nay"
        onPress={() => router.navigate("/(tabs)")}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text
          style={{
            fontSize: 30,
            fontWeight: "700",
            letterSpacing: -1.6,
            color: t.ink,
          }}
        >
          soma<Text style={{ color: t.accent }}>.</Text>
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={user ? "Mở tài khoản" : "Đăng nhập"}
        onPress={() => router.push(user ? "/(tabs)/profile" : "/auth")}
        style={{
          height: 44,
          width: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            height: 36,
            width: 36,
            borderWidth: 1,
            borderColor: t.rule,
            borderRadius: 18,
            backgroundColor: t.ground,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={{ width: 34, height: 34, borderRadius: 17 }}
            />
          ) : (
            <Text style={{ fontSize: 11, fontWeight: "500", color: t.ink }}>
              {user
                ? user.name
                    .trim()
                    .split(/\s+/)
                    .slice(-2)
                    .map((v) => v[0])
                    .join("")
                    .toUpperCase()
                : "SV"}
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}
export function Notice() {
  const { notice, dismissNotice, offline } = useApp();
  const t = useTheme();
  if (!notice && !offline) return null;
  return (
    <View
      style={{
        backgroundColor: t.tint,
        paddingLeft: 20,
        paddingVertical: 8,
        paddingRight: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Text
        accessibilityRole="alert"
        style={{ fontSize: 12, lineHeight: 18, color: t.ink, flex: 1 }}
      >
        {notice ??
          "Đang dùng nội dung đã lưu. Kết nối mạng để cập nhật mô hình và tiến độ."}
      </Text>
      {notice && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo"
          onPress={dismissNotice}
          style={{
            minHeight: 44,
            minWidth: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="close" size={17} />
        </Pressable>
      )}
    </View>
  );
}
export function Page({
  children,
  back,
  refresh = false,
  brand = true,
}: {
  children: React.ReactNode;
  back?: string;
  refresh?: boolean;
  brand?: boolean;
}) {
  const t = useTheme();
  const app = useApp();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <SafeAreaView
      edges={
        back ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]
      }
      style={{ flex: 1, backgroundColor: t.paper }}
    >
      {brand && <Brand />}
      <Notice />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 35,
            flexGrow: 1,
          }}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={refreshing}
                tintColor={t.accent}
                onRefresh={() => {
                  setRefreshing(true);
                  void app.refresh().finally(() => setRefreshing(false));
                }}
              />
            ) : undefined
          }
        >
          {back && (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(tabs)")
              }
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                paddingBottom: 12,
                marginTop: -8,
                alignSelf: "flex-start",
              }}
            >
              <Icon name="arrow-back" size={17} color={t.muted} />
              <Text style={{ fontSize: 13, color: t.muted }}>{back}</Text>
            </Pressable>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Empty({
  title,
  children,
  action,
  onPress,
}: {
  title: string;
  children?: React.ReactNode;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={{ paddingVertical: 25, gap: 9 }}>
      <Body style={{ fontWeight: "600" }}>{title}</Body>
      {children && <Body muted>{children}</Body>}
      {action && onPress && (
        <Button secondary onPress={onPress} style={{ marginTop: 7 }}>
          {action}
        </Button>
      )}
    </View>
  );
}
export function ErrorText({ message }: { message: string | null | undefined }) {
  const t = useTheme();
  return message ? (
    <Text
      accessibilityRole="alert"
      style={{
        color: t.error,
        fontSize: 13,
        lineHeight: 20,
        marginVertical: 12,
      }}
    >
      {message}
    </Text>
  ) : null;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const t = useTheme();
  return (
    <View style={{ marginVertical: 10, gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: t.ink }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={t.muted}
        {...props}
        style={[
          {
            minHeight: 49,
            borderWidth: 1,
            borderColor: t.rule,
            borderRadius: 8,
            paddingHorizontal: 13,
            paddingVertical: 12,
            fontSize: 16,
            color: t.ink,
            backgroundColor: t.paper,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ marginVertical: 11, gap: 9 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: t.ink }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: value === option.value }}
            onPress={() => onChange(option.value)}
            style={{
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderRadius: 7,
              borderWidth: 1,
              borderColor: value === option.value ? t.accent : t.rule,
              backgroundColor: value === option.value ? t.tint : t.paper,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: value === option.value ? t.accent : t.muted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function ModelRow({
  model,
  onPress,
}: {
  model: AnatomyModel;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mở ${model.title}`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 15,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: t.rule,
      }}
    >
      <View
        style={{
          width: 80,
          height: 84,
          borderRadius: 7,
          backgroundColor: t.ground,
        }}
      >
        <Image
          source={MODEL_ART[model.id]}
          resizeMode="contain"
          style={{ width: "100%", height: "100%" }}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 21,
            fontWeight: "600",
            color: t.ink,
          }}
        >
          {model.title}
        </Text>
        <Text
          style={{ fontSize: 12, lineHeight: 18, color: t.muted, marginTop: 3 }}
        >
          {model.english}
        </Text>
        <Text
          style={{
            fontSize: 10,
            lineHeight: 16,
            letterSpacing: 0.6,
            color: t.muted,
            marginTop: 8,
            textTransform: "uppercase",
          }}
        >
          {SYSTEM_NAMES[model.system] ?? model.system}
        </Text>
      </View>
      <Icon name="arrow-forward-outline" size={17} color={t.muted} />
    </Pressable>
  );
}
export function MenuRow({
  label,
  note,
  icon,
  onPress,
}: {
  label: string;
  note?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: t.rule,
        paddingVertical: 15,
      }}
    >
      <Icon name={icon} size={20} color={t.muted} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: t.ink }}>{label}</Text>
        {note && (
          <Text style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
            {note}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={16} color={t.muted} />
    </Pressable>
  );
}
export function SignInPrompt({ next = "review" }: { next?: string }) {
  return (
    <Empty
      title="Đăng nhập để tiếp tục"
      action="Đăng nhập"
      onPress={() => router.push({ pathname: "/auth", params: { next } })}
    >
      Dùng cùng tài khoản với web để lưu lộ trình, kết quả và lịch ôn tập.
    </Empty>
  );
}
export function Loading() {
  const t = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: "center", gap: 12 }}>
      <ActivityIndicator color={t.accent} />
      <Body muted>Đang tải dữ liệu…</Body>
    </View>
  );
}

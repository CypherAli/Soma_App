import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AppProvider, useApp } from "../core/AppProvider";
import { useTheme } from "../ui/theme";

function Routes() {
  const { booting } = useApp();
  const t = useTheme();
  if (booting)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.paper,
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <Text
          style={{
            fontSize: 38,
            fontWeight: "700",
            letterSpacing: -2,
            color: t.ink,
          }}
        >
          soma<Text style={{ color: t.accent }}>.</Text>
        </Text>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  return (
    <>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.paper },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Routes />
      </AppProvider>
    </SafeAreaProvider>
  );
}
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        padding: 28,
        justifyContent: "center",
        gap: 16,
        backgroundColor: "#fcfcfd",
      }}
    >
      <Text style={{ fontSize: 24, color: "#17202e" }}>
        Chưa mở được màn hình
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 24, color: "#667180" }}>
        Bài làm đã lưu trên thiết bị vẫn được giữ lại. Hãy thử mở lại màn hình.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{ padding: 16, backgroundColor: "#235bc0", borderRadius: 8 }}
      >
        <Text style={{ color: "#ffffff", textAlign: "center" }}>Thử lại</Text>
      </Pressable>
    </View>
  );
}

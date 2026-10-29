import { useColorScheme } from "react-native";
import { useApp } from "../core/AppProvider";
export function useTheme() {
  const { preferences } = useApp();
  const system = useColorScheme();
  const dark =
    preferences.appearance === "dark" ||
    (preferences.appearance === "system" && system === "dark");
  return {
    dark,
    paper: dark ? "#111313" : "#ffffff",
    ground: dark ? "#191c1b" : "#f2f4f3",
    ink: dark ? "#f1f3f2" : "#191d1b",
    muted: dark ? "#a0aaa5" : "#707a74",
    rule: dark ? "#2b302d" : "#e4e8e5",
    accent: dark ? "#b4cbbd" : "#345b49",
    onAccent: dark ? "#14251d" : "#ffffff",
    tint: dark ? "#23332b" : "#edf2ee",
    success: dark ? "#9cd1b7" : "#27614a",
    successBg: dark ? "#20382e" : "#eef6f1",
    error: dark ? "#e9a59f" : "#a13934",
  };
}

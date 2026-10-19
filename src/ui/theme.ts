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
    paper: dark ? "#151b24" : "#fcfcfd",
    ground: dark ? "#202834" : "#f1f3f5",
    ink: dark ? "#edf1f7" : "#17202e",
    muted: dark ? "#a7b2c2" : "#667180",
    rule: dark ? "#35404e" : "#e2e5e9",
    accent: dark ? "#a8c8ff" : "#235bc0",
    onAccent: dark ? "#142a49" : "#ffffff",
    tint: dark ? "#253850" : "#edf2fc",
    success: dark ? "#9cd1b7" : "#27614a",
    successBg: dark ? "#20382e" : "#eef6f1",
    error: dark ? "#e9a59f" : "#a13934",
  };
}

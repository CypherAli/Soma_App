import { AppState } from "react-native";

export function isForeground() {
  return !AppState.currentState || AppState.currentState === "active";
}

export function onForeground(refresh: () => void) {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") refresh();
  });
  return () => subscription.remove();
}

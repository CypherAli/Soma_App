import { Alert, Platform } from "react-native";
export function confirmAction(
  title: string,
  message: string,
  confirm = "Tiếp tục",
): Promise<boolean> {
  if (Platform.OS === "web")
    return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
        { text: confirm, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TouchViewer } from "./TouchViewer";
import type { ViewerEvent } from "./Viewer.types";

export function ModelPreview({ uri }: { uri: string }) {
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const onEvent = useCallback((event: ViewerEvent) => {
    if (event.type === "error" || event.type === "unavailable") setError(event.message);
  }, [setError]);
  return (
    <View style={{ height: 240, backgroundColor: "#18232e", marginHorizontal: -20 }}>
      {error ? (
        <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
          <Text style={{ color: "#b9c7d6", textAlign: "center" }}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => { setError(null); setReload((value) => value + 1); }}
            style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: "#c5d9ff" }}>Tải lại mô hình 3D</Text>
          </Pressable>
        </View>
      ) : <TouchViewer uri={`${uri}&reload=${reload}`} onEvent={onEvent} onError={setError} />}
    </View>
  );
}

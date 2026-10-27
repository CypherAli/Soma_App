import { Pressable, Switch, View } from "react-native";
import type {
  ViewerCommand,
  ViewerState,
  ViewerStructure,
} from "../../components/Viewer.types";
import { Body, Button } from "../../ui/components";
import { Text } from "../../ui/i18n";
import { useTheme } from "../../ui/theme";
import { viewerStyles as styles } from "./viewerStyles";
interface Props {
  sceneState: ViewerState | null;
  selected: ViewerStructure | null;
  onCommand: (command: ViewerCommand) => void;
}
export function ViewerTools({ sceneState, selected, onCommand }: Props) {
  const t = useTheme();
  return (
    <>
      <Body>
        Tách rời từng cấu trúc để quan sát. Chọn 0% để ghép lại đúng vị trí ban
        đầu.
      </Body>
      <Text
        style={{
          color: t.ink,
          fontWeight: "600",
          fontSize: 16,
          marginTop: 22,
          marginBottom: 12,
        }}
      >
        Mức tách · {Math.round((sceneState?.explode ?? 0) * 100)}%
      </Text>
      <View style={[styles.row, { marginBottom: 12 }]}>
        <Button
          secondary
          style={{ flex: 1 }}
          onPress={() =>
            onCommand({
              type: "explode",
              amount: sceneState?.explode ?? 0,
              scope: "all",
            })
          }
        >
          Tất cả cấu trúc
        </Button>
        <Button
          secondary
          disabled={!selected}
          style={{ flex: 1 }}
          onPress={() =>
            onCommand({
              type: "explode",
              amount: sceneState?.explode || 0.01,
              scope: "selected",
            })
          }
        >
          Chỉ cấu trúc đang chọn
        </Button>
      </View>
      <Body muted style={{ fontSize: 12, marginBottom: 12 }}>
        {sceneState?.explodeScope === "selected"
          ? "Đang tách cấu trúc đã chọn"
          : "Đang tách toàn bộ mô hình"}
      </Body>
      <View style={[styles.row, { gap: 6 }]}>
        {[0, 0.25, 0.5, 0.75, 1].map((amount) => (
          <Pressable
            key={amount}
            accessibilityRole="button"
            accessibilityLabel={
              amount === 0 ? "Gộp mô hình" : `Tách ${amount * 100}%`
            }
            accessibilityState={{
              selected: Math.abs((sceneState?.explode ?? 0) - amount) < 0.01,
            }}
            onPress={() => onCommand({ type: "explode", amount })}
            style={[
              styles.action,
              {
                flex: 1,
                borderColor: t.rule,
                backgroundColor:
                  Math.abs((sceneState?.explode ?? 0) - amount) < 0.01
                    ? t.tint
                    : t.paper,
              },
            ]}
          >
            <Text style={{ color: t.ink, fontSize: 12 }}>{amount * 100}%</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Button
          secondary
          style={{ flex: 1 }}
          onPress={() =>
            onCommand({
              type: "explode",
              amount: Math.max(
                0,
                Math.round((sceneState?.explode ?? 0) * 100 - 1) / 100,
              ),
            })
          }
        >
          − 1%
        </Button>
        <Button
          secondary
          style={{ flex: 1 }}
          onPress={() =>
            onCommand({
              type: "explode",
              amount: Math.min(
                1,
                Math.round((sceneState?.explode ?? 0) * 100 + 1) / 100,
              ),
            })
          }
        >
          + 1%
        </Button>
      </View>
      <Text
        style={{
          color: t.ink,
          fontWeight: "600",
          fontSize: 16,
          marginTop: 26,
          marginBottom: 12,
        }}
      >
        Góc nhìn
      </Text>
      <View style={styles.viewGrid}>
        {(
          [
            ["front", "Trước"],
            ["back", "Sau"],
            ["side", "Bên"],
            ["three-quarter", "Góc chéo"],
            ["top", "Trên"],
            ["bottom", "Dưới"],
          ] as const
        ).map(([view, label]) => (
          <Pressable
            key={view}
            accessibilityRole="button"
            accessibilityLabel={`Nhìn ${label.toLowerCase()}`}
            accessibilityState={{
              selected: sceneState?.view === view,
            }}
            onPress={() => onCommand({ type: "view", view })}
            style={[
              styles.action,
              {
                minWidth: 64,
                minHeight: 44,
                paddingHorizontal: 6,
                flexBasis: "30%",
                flexGrow: 1,
                flexShrink: 0,
                borderColor: t.rule,
                backgroundColor: sceneState?.view === view ? t.tint : t.paper,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.9}
              style={{
                color: t.ink,
                fontSize: 12,
                lineHeight: 18,
                textAlign: "center",
                flexShrink: 1,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View
        style={[styles.row, { marginTop: 22, justifyContent: "space-between" }]}
      >
        <Text style={{ color: t.ink, fontSize: 15 }}>Nhãn cấu trúc</Text>
        <Switch
          accessibilityLabel="Nhãn cấu trúc"
          value={sceneState?.showLabels ?? false}
          trackColor={{ true: t.accent, false: t.rule }}
          onValueChange={(enabled) => onCommand({ type: "labels", enabled })}
        />
      </View>
      <View
        style={[styles.row, { marginTop: 15, justifyContent: "space-between" }]}
      >
        <Text style={{ color: t.ink, fontSize: 15 }}>Mặt cắt</Text>
        <Switch
          accessibilityLabel="Bật mặt cắt"
          value={sceneState?.clip.enabled ?? false}
          trackColor={{ true: t.accent, false: t.rule }}
          onValueChange={(enabled) => onCommand({ type: "clip", enabled })}
        />
      </View>
      {sceneState?.clip.enabled && (
        <>
          <View style={[styles.row, { marginTop: 12 }]}>
            {(["x", "y", "z"] as const).map((axis) => (
              <Pressable
                key={axis}
                accessibilityRole="button"
                accessibilityLabel={`Trục ${axis.toUpperCase()}`}
                accessibilityState={{
                  selected: sceneState.clip.axis === axis,
                }}
                onPress={() => onCommand({ type: "clip", axis })}
                style={[
                  styles.action,
                  {
                    flex: 1,
                    borderColor: t.rule,
                    backgroundColor:
                      sceneState.clip.axis === axis ? t.tint : t.paper,
                  },
                ]}
              >
                <Text style={{ color: t.ink }}>{axis.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.row, { marginTop: 12 }]}>
            <Button
              secondary
              style={{ flex: 1 }}
              onPress={() =>
                onCommand({
                  type: "clip",
                  percent: Math.max(0, sceneState.clip.percent - 10),
                })
              }
            >
              − 10%
            </Button>
            <Text style={{ color: t.ink }}>
              {Math.round(sceneState.clip.percent)}%
            </Text>
            <Button
              secondary
              style={{ flex: 1 }}
              onPress={() =>
                onCommand({
                  type: "clip",
                  percent: Math.min(100, sceneState.clip.percent + 10),
                })
              }
            >
              + 10%
            </Button>
          </View>
          <Button
            secondary
            style={{ marginTop: 10 }}
            onPress={() =>
              onCommand({
                type: "clip",
                keepPositive: !sceneState.clip.keepPositive,
              })
            }
          >
            Đổi phía giữ lại
          </Button>
        </>
      )}
      {sceneState?.isolate && (
        <Button
          secondary
          style={{ marginTop: 18 }}
          onPress={() =>
            onCommand({
              type: "isolate",
              enabled: false,
            })
          }
        >
          Bỏ cô lập cấu trúc
        </Button>
      )}
      <Button
        secondary
        style={{ marginTop: 24 }}
        onPress={() => onCommand({ type: "restore" })}
      >
        Khôi phục toàn bộ mô hình
      </Button>
    </>
  );
}

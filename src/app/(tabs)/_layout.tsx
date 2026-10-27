import { Text } from "../../ui/i18n";
import { useEffect, useState, type ComponentProps } from "react";
import { Tabs } from "expo-router";
import { Keyboard, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../ui/components";
import { useTheme } from "../../ui/theme";

const items = {
  index: { label: "Hôm nay", icon: "home-outline" },
  atlas: { label: "Atlas", icon: "cube-outline" },
  review: { label: "Ôn tập", icon: "list-outline" },
  profile: { label: "Cá nhân", icon: "person-outline" },
} as const;
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
function TabBar({ state, navigation }: TabBarProps) {
  const t = useTheme(),
    insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
        setKeyboard(true),
      ),
      hide = Keyboard.addListener("keyboardDidHide", () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboard) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: t.paper,
        borderTopWidth: 1,
        borderColor: t.rule,
        paddingTop: 7,
        paddingBottom: Math.max(9, insets.bottom),
      }}
    >
      {state.routes.map((route, index) => {
        const item = items[route.name as keyof typeof items];
        if (!item) return null;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented)
                navigation.navigate(route.name, route.params);
            }}
            style={{
              flex: 1,
              minHeight: 49,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <View style={{ width: 44, height: 28, borderRadius: 0, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }}><Icon
              name={item.icon}
              size={21}
              color={focused ? t.accent : t.muted}
            /></View>
            <Text
              style={{
                fontSize: 10,
                lineHeight: 14,
                color: focused ? t.ink : t.muted,
                fontWeight: focused ? "600" : "400",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
export default function TabLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: t.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Hôm nay" }} />
      <Tabs.Screen name="atlas" options={{ title: "Atlas" }} />
      <Tabs.Screen name="review" options={{ title: "Ôn tập" }} />
      <Tabs.Screen name="profile" options={{ title: "Cá nhân" }} />
    </Tabs>
  );
}

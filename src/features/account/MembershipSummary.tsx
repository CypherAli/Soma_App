import { View } from "react-native";
import { router } from "expo-router";
import type { Membership } from "../../core/types";
import { Body, Button } from "../../ui/components";
import { Text, useI18n } from "../../ui/i18n";
import { useTheme } from "../../ui/theme";
import { dateText } from "./format";

export function MembershipSummary({
  membership,
  onRefresh,
}: {
  membership: Membership;
  onRefresh: () => void;
}) {
  const t = useTheme(),
    { language } = useI18n();
  return (
    <View
      style={{
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderColor: t.rule,
        marginTop: 0,
        marginBottom: 18,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Body style={{ fontWeight: "600" }}>Gói tài khoản</Body>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.accent }}>
          {membership.plan === "pro" ? "Premium" : "Thường"}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 28,
          color: t.ink,
          fontWeight: "600",
          marginTop: 14,
          fontVariant: ["tabular-nums"],
        }}
      >
        {membership.remaining}
        <Text style={{ fontSize: 15, color: t.muted }}>
          {" "}
          / {membership.limit}
        </Text>
      </Text>
      <Body muted style={{ fontSize: 12 }}>
        Lượt hỏi trợ lý còn lại trong tháng
      </Body>
      <View style={{ height: 3, backgroundColor: t.rule, marginVertical: 14 }}>
        <View
          style={{
            height: 3,
            width: `${Math.max(0, Math.min(100, (100 * membership.used) / Math.max(1, membership.limit)))}%`,
            backgroundColor: t.accent,
          }}
        />
      </View>
      <Body muted style={{ fontSize: 12 }}>
        {language === "en" ? "Resets on" : "Làm mới vào"}{" "}
        {dateText(membership.resetsAt, language)}
      </Body>
      {!!membership.premiumUntil && (
        <Body muted style={{ fontSize: 12, marginTop: 4 }}>
          {language === "en"
            ? "Premium active until"
            : "Premium có hiệu lực đến"}{" "}
          {dateText(membership.premiumUntil, language)}
        </Body>
      )}
      <Button secondary onPress={onRefresh} style={{ marginTop: 16 }}>
        Làm mới gói tài khoản
      </Button>
      <Button
        secondary
        onPress={() => router.push("/premium")}
        style={{ marginTop: 16 }}
      >
        {membership.plan === "pro" ? "Gia hạn Premium" : "Nâng cấp Premium"}
      </Button>
    </View>
  );
}

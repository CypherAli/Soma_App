import { useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { Body, Button, ErrorText, Page, Title } from "../../ui/components";
import { Text, useI18n } from "../../ui/i18n";
import { useTheme } from "../../ui/theme";
import { AccountGate } from "./AccountGate";
import { dateText } from "./format";
import { PaymentCheckout } from "./PaymentCheckout";
import { usePremiumCheckout } from "./usePremiumCheckout";

export function PremiumScreen() {
  return (
    <AccountGate>
      <PremiumDetails />
    </AccountGate>
  );
}

function PremiumDetails() {
  const { membership, order, error, busy, start, check, simulate, reload } =
    usePremiumCheckout();
  const t = useTheme(),
    { language } = useI18n();
  const [brokenQr, setBrokenQr] = useState<string | null>(null);
  const pending = order?.status === "pending";
  return (
    <Page back="Tài khoản">
      <Title>Premium</Title>
      <Body muted>
        Thêm lượt hỏi trợ lý, dùng chung tài khoản trên web và app.
      </Body>
      <View
        style={{
          borderWidth: 1,
          borderColor: t.rule,
          borderRadius: 14,
          padding: 20,
          marginVertical: 22,
          gap: 10,
        }}
      >
        <Body style={{ fontWeight: "600" }}>Premium · 30 lượt hỏi/tháng</Body>
        <Text style={{ fontSize: 30, fontWeight: "600", color: t.ink }}>
          25.000đ
          <Text style={{ fontSize: 14, color: t.muted }}>
            {" "}
            / {language === "en" ? "month" : "tháng"}
          </Text>
        </Text>
        <Body muted>
          Gói Thường có 10 lượt hỏi/tháng. Giữ số lượt đã dùng khi nâng cấp,
          không tự động trừ tiền gia hạn.
        </Body>
        {!!membership?.premiumUntil && (
          <Body muted>
            {language === "en" ? "Active until" : "Có hiệu lực đến"}{" "}
            {dateText(membership.premiumUntil, language)}
          </Body>
        )}
        {membership ? (
          <>
            {!pending && (
              <Button
                loading={busy}
                disabled={!membership.paymentEnabled}
                onPress={() => void start()}
              >
                {membership.plan === "pro"
                  ? "Gia hạn Premium · 25.000đ"
                  : "Nâng cấp Premium · 25.000đ"}
              </Button>
            )}
            {!membership.paymentEnabled && (
              <Body muted>
                Thanh toán đang được thiết lập. Vui lòng quay lại sau.
              </Body>
            )}
          </>
        ) : !error ? (
          <ActivityIndicator color={t.accent} />
        ) : null}
      </View>
      {membership?.sandbox && (
        <Body style={{ color: t.accent, fontWeight: "600", marginBottom: 18 }}>
          Chế độ thử nghiệm — không chuyển tiền thật.
        </Body>
      )}
      {order?.status === "paid" && (
        <View
          style={{
            backgroundColor: t.tint,
            padding: 18,
            borderRadius: 12,
            marginBottom: 18,
          }}
        >
          <Body style={{ color: t.accent, fontWeight: "600" }}>
            Thanh toán đã được xác nhận. Premium đã kích hoạt.
          </Body>
        </View>
      )}
      {pending && (
        <View style={{ gap: 14 }}>
          <Body style={{ fontWeight: "600", fontSize: 18 }}>
            {order.sandbox ? "Đơn thử nghiệm" : "Thanh toán Premium"}
          </Body>
          <Body muted>
            {order.sandbox
              ? "QR minh họa Sandbox; không quét bằng ứng dụng ngân hàng và không chuyển tiền."
              : "Quét QR hoặc sao chép thông tin chuyển khoản. Giữ đúng số tiền và nội dung của đơn này."}
          </Body>
          {!!order.qrUrl && brokenQr !== order.qrUrl && (
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#ffffff",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Image
                accessibilityLabel="Mã QR thanh toán Premium"
                source={{ uri: order.qrUrl }}
                style={{ width: 240, height: 240, maxWidth: "100%" }}
                resizeMode="contain"
                onError={() => setBrokenQr(order.qrUrl)}
              />
            </View>
          )}
          {!order.qrUrl || brokenQr === order.qrUrl ? (
            <Body muted>
              Chưa tải được QR. Mở trang SePay hoặc thử tải lại đơn.
            </Body>
          ) : null}
          {[
            ["Ngân hàng", order.bank],
            ["Số tài khoản", order.account],
            ["Người nhận", order.holder],
            ["Số tiền", "25.000đ"],
            ["Nội dung chuyển khoản", order.transferContent],
          ]
            .filter(([, value]) => Boolean(value))
            .map(([label, value]) => (
              <View key={label} style={{ gap: 3 }}>
                <Body muted style={{ fontSize: 12 }}>
                  {label}
                </Body>
                <Text
                  selectable
                  localize={false}
                  style={{
                    fontSize: 15,
                    lineHeight: 23,
                    fontWeight: "600",
                    color: t.ink,
                  }}
                >
                  {value}
                </Text>
              </View>
            ))}
          <Body muted>
            {order.sandbox
              ? "Đang chờ xác nhận thử nghiệm."
              : "Đang chờ xác nhận từ ngân hàng. Gói chỉ được nâng sau khi máy chủ xác minh đã nhận tiền."}
          </Body>
          {order.checkout && (
            <PaymentCheckout
              checkout={order.checkout}
              onDone={() => void check()}
            />
          )}
          {order.sandbox && (
            <Button loading={busy} secondary onPress={() => void simulate()}>
              Giả lập thanh toán Sandbox
            </Button>
          )}
          <Button secondary onPress={() => void check()}>
            Kiểm tra thanh toán
          </Button>
          <Button secondary loading={busy} onPress={() => void start()}>
            Tải lại đơn thanh toán
          </Button>
          <Body muted style={{ fontSize: 12 }}>
            Đơn được lưu theo tài khoản. Đóng app hoặc quay lại sau sẽ tiếp tục
            đơn đang chờ.
          </Body>
        </View>
      )}
      <ErrorText message={error} />
      {!membership && !!error && (
        <Button secondary onPress={reload}>
          Thử lại
        </Button>
      )}
    </Page>
  );
}

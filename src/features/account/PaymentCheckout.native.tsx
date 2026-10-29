import { useState } from "react";
import { Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Button } from "../../ui/components";
import { useTheme } from "../../ui/theme";
import type { PremiumOrder } from "../../core/premium";

export function PaymentCheckout({
  checkout,
  onDone,
}: {
  checkout: NonNullable<PremiumOrder["checkout"]>;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false),
    t = useTheme();
  const close = () => {
    setOpen(false);
    onDone();
  };
  const returns = [
    checkout.fields.success_url,
    checkout.fields.error_url,
    checkout.fields.cancel_url,
  ]
    .filter(Boolean)
    .flatMap((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" ? [url.origin + url.pathname] : [];
      } catch {
        return [];
      }
    });
  return (
    <>
      <Button secondary onPress={() => setOpen(true)}>
        Mở trang thanh toán SePay
      </Button>
      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: t.paper }}>
          <View style={{ padding: 12 }}>
            <Button secondary onPress={close}>
              Quay lại Soma
            </Button>
          </View>
          {open && (
            <WebView
              source={{
                uri: checkout.url,
                method: "POST",
                body: new URLSearchParams(checkout.fields).toString(),
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
              }}
              originWhitelist={["https://*"]}
              onShouldStartLoadWithRequest={({ url }) => {
                try {
                  const target = new URL(url);
                  if (returns.includes(target.origin + target.pathname)) {
                    close();
                    return false;
                  }
                  return (
                    target.protocol === "https:" &&
                    target.hostname === new URL(checkout.url).hostname
                  );
                } catch {
                  return false;
                }
              }}
              setSupportMultipleWindows={false}
              mixedContentMode="never"
              onError={close}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

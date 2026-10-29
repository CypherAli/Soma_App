import { Button } from "../../ui/components";
import type { PremiumOrder } from "../../core/premium";

export function PaymentCheckout({
  checkout,
}: {
  checkout: NonNullable<PremiumOrder["checkout"]>;
  onDone: () => void;
}) {
  function open() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = checkout.url;
    form.target = "_blank";
    form.rel = "noopener noreferrer";
    for (const [name, value] of Object.entries(checkout.fields)) {
      const field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      field.value = value;
      form.appendChild(field);
    }
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }
  return (
    <Button secondary onPress={open}>
      Mở trang thanh toán SePay
    </Button>
  );
}

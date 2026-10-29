import { accountKey } from "./identity";

export interface PremiumOrder {
  id: string;
  code: string;
  amount: number;
  status: "pending" | "paid";
  sandbox: boolean;
  qrUrl: string | null;
  bank?: string;
  account?: string;
  holder?: string;
  transferContent?: string;
  checkout: { url: string; fields: Record<string, string> } | null;
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export function premiumStorageKey(
  api: string,
  userId: string,
  sandbox: boolean,
) {
  return `${accountKey(api, userId)}:premium:${sandbox ? "sandbox" : "production"}`;
}

function paymentUrl(value: unknown, sandbox: boolean, qr = false) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const host = sandbox ? "pay-sandbox.sepay.vn" : "pay.sepay.vn";
    const hosts = qr
      ? [host, "vietqr.app", "qr.sepay.vn", "img.vietqr.io"]
      : [host];
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !hosts.includes(url.hostname) ||
      (!qr && url.pathname !== "/v1/checkout/init") ||
      (!sandbox && /placeholder|skeleton/i.test(url.pathname))
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Only an authenticated server order can confirm payment; browser redirects cannot. */
export function parsePremiumOrder(
  value: unknown,
  sandbox: boolean,
): PremiumOrder {
  const data = object(value);
  if (
    typeof data.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(data.id) ||
    typeof data.code !== "string" ||
    data.code.length > 80 ||
    !data.code ||
    data.amount !== 25000 ||
    !["pending", "paid"].includes(String(data.status)) ||
    (data.sandbox !== undefined && typeof data.sandbox !== "boolean") ||
    Boolean(data.sandbox) !== sandbox
  )
    throw Error(
      "Đơn thanh toán không hợp lệ hoặc thuộc môi trường khác. Vui lòng thử lại.",
    );
  const form = object(data.checkout),
    fields = object(form.fields);
  const url = paymentUrl(form.url, sandbox);
  let checkout: PremiumOrder["checkout"] = null;
  if (url) {
    const entries = Object.entries(fields);
    if (
      entries.length > 40 ||
      entries.some(
        ([name, entry]) =>
          !/^[a-zA-Z0-9_]+$/.test(name) ||
          !["string", "number"].includes(typeof entry) ||
          String(entry).length > 4096,
      ) ||
      Number(fields.order_amount) !== 25000 ||
      fields.currency !== "VND" ||
      fields.order_invoice_number !== data.code
    )
      throw Error("Thông tin thanh toán không khớp đơn hàng.");
    checkout = {
      url,
      fields: Object.fromEntries(
        entries.map(([name, entry]) => [name, String(entry)]),
      ),
    };
  }
  const text = (name: string) =>
    typeof data[name] === "string"
      ? (data[name] as string).slice(0, 240)
      : undefined;
  return {
    id: data.id,
    code: data.code,
    amount: 25000,
    status: data.status as PremiumOrder["status"],
    sandbox,
    qrUrl: paymentUrl(data.qrUrl, sandbox, true),
    checkout,
    bank: text("bank"),
    account: text("account"),
    holder: text("holder"),
    transferContent: text("transferContent") || `PREMIUM ${data.code}`,
  };
}

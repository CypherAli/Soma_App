import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePremiumOrder, premiumStorageKey } from "../src/core/premium";

const pending = {
  id: "cqaorder123",
  code: "SOMA1234567890ABCDEF",
  amount: 25000,
  status: "pending",
  sandbox: false,
  qrUrl: "https://qr.sepay.vn/img?amount=25000",
  bank: "Test bank",
  account: "1234",
};
test("Premium accepts authenticated order states and isolates pending records by account, API and environment", () => {
  assert.equal(parsePremiumOrder(pending, false).status, "pending");
  assert.equal(
    parsePremiumOrder({ ...pending, status: "paid" }, false).status,
    "paid",
  );
  const key = premiumStorageKey("https://api.example/api", "owner", false);
  assert.notEqual(
    key,
    premiumStorageKey("https://api.example/api", "other", false),
  );
  assert.notEqual(
    key,
    premiumStorageKey("https://other.example/api", "owner", false),
  );
  assert.notEqual(
    key,
    premiumStorageKey("https://api.example/api", "owner", true),
  );
});
test("Premium rejects wrong amounts, modes, unsafe IDs and client success flags", () => {
  for (const patch of [
    { amount: 1 },
    { status: "success" },
    { id: "../another" },
    { sandbox: true },
    { sandbox: "false" },
  ])
    assert.throws(() => parsePremiumOrder({ ...pending, ...patch }, false));
  assert.equal(
    parsePremiumOrder({ ...pending, payment: "success" }, false).status,
    "pending",
  );
});
test("Premium only renders trusted HTTPS QR and correctly scoped SePay checkout", () => {
  for (const qrUrl of [
    "http://qr.sepay.vn/img",
    "https://attacker.example/qr",
    "https://qr.sepay.vn.attacker.example/qr",
    "https://user:secret@qr.sepay.vn/img",
    "https://pay.sepay.vn/placeholder.png",
  ])
    assert.equal(parsePremiumOrder({ ...pending, qrUrl }, false).qrUrl, null);
  const checkout = {
    url: "https://pay.sepay.vn/v1/checkout/init",
    fields: {
      order_amount: "25000",
      currency: "VND",
      order_invoice_number: pending.code,
      signature: "signed-by-server",
    },
  };
  assert.equal(
    parsePremiumOrder({ ...pending, checkout }, false).checkout?.url,
    checkout.url,
  );
  assert.equal(
    parsePremiumOrder(
      {
        ...pending,
        checkout: {
          ...checkout,
          url: "https://pay-sandbox.sepay.vn/v1/checkout/init",
        },
      },
      false,
    ).checkout,
    null,
  );
  assert.throws(() =>
    parsePremiumOrder(
      {
        ...pending,
        checkout: {
          ...checkout,
          fields: { ...checkout.fields, order_amount: "1" },
        },
      },
      false,
    ),
  );
});

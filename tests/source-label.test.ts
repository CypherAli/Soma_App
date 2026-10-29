import assert from "node:assert/strict";
import { test } from "node:test";
import { sourceDisplayLabel } from "../src/core/sourceLabel";

test("exam labels omit the old personal branding without changing medical names", () => {
  for (const branding of ["Dr. Lâm", "Dr.Lâm", "Dr Lâm", "Dr. Lam", "DR. LÂM"])
    assert.equal(
      sourceDisplayLabel(`Đề giải phẫu ${branding} số 1`),
      "Đề giải phẫu số 1",
    );
  assert.equal(sourceDisplayLabel("Mạc nối nhỏ"), "Mạc nối nhỏ");
  assert.equal(sourceDisplayLabel("Dr Lambert"), "Dr Lambert");
});

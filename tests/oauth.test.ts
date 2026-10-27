import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authDestination,
  checkAuthorizeUrl,
  readOAuthReturn,
} from "../src/core/oauthProtocol";
const state = "a".repeat(64),
  code = "b".repeat(43);
test("Expo Go callback matches the exact Metro host, port and route", () => {
  const target = "exp://192.168.1.12:8081/--/oauth";
  assert.equal(readOAuthReturn(`${target}?state=${state}&code=${code}`, state, target), code);
  for (const value of [target.replace("8081", "8082"), target.replace("1.12", "1.13"), "soma://oauth", target + "/other"])
    assert.throws(() => readOAuthReturn(`${value}?state=${state}&code=${code}`, state, target));
});
test("OAuth return requires the exact app route, local state and a single short-lived code", () => {
  assert.equal(
    readOAuthReturn(`soma://oauth?state=${state}&code=${code}`, state),
    code,
  );
  for (const url of [
    `https://oauth?state=${state}&code=${code}`,
    `soma://oauth/other?state=${state}&code=${code}`,
    `soma://attacker@oauth?state=${state}&code=${code}`,
    `soma://oauth?state=wrong&code=${code}`,
    `soma://oauth?state=${state}&code=${code}&code=${code}`,
    `soma://oauth?state=${state}&token=secret`,
  ])
    assert.throws(() => readOAuthReturn(url, state));
  assert.throws(
    () => readOAuthReturn(`soma://oauth?state=${state}&error=cancelled`, state),
    /hủy/,
  );
});
test("OAuth browser accepts only the selected provider HTTPS origin and local destinations", () => {
  assert.equal(
    checkAuthorizeUrl("https://accounts.google.com/o/oauth2/v2/auth", "google"),
    "https://accounts.google.com/o/oauth2/v2/auth",
  );
  assert.throws(() =>
    checkAuthorizeUrl("https://accounts.google.com.evil.test/", "google"),
  );
  assert.throws(() => checkAuthorizeUrl("https://github.com/", "google"));
  assert.throws(() =>
    checkAuthorizeUrl("http://accounts.google.com/", "google"),
  );
  assert.equal(authDestination("https://evil.test"), "/(tabs)/review");
});

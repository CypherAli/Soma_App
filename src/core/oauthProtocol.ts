export const PROVIDERS = ["google", "github", "facebook"] as const;
export type Provider = (typeof PROVIDERS)[number];
export const PROVIDER_NAMES = {
  google: "Google",
  github: "GitHub",
  facebook: "Facebook",
};
export const OAUTH_RETURN = "soma://oauth";

export function readOAuthReturn(
  value: string,
  expectedState: string,
  returnUrl = OAUTH_RETURN,
) {
  const url = new URL(value);
  const expected = new URL(returnUrl);
  if (
    url.protocol !== expected.protocol ||
    url.hostname !== expected.hostname ||
    url.pathname.replace(/\/$/, "") !== expected.pathname.replace(/\/$/, "") ||
    url.username ||
    url.password ||
    url.port !== expected.port ||
    url.hash ||
    url.searchParams.getAll("state").length !== 1 ||
    url.searchParams.get("state") !== expectedState
  )
    throw new Error(
      "Kết quả đăng nhập không khớp yêu cầu trên thiết bị này. Vui lòng thử lại.",
    );
  if (url.searchParams.has("error"))
    throw new Error(
      url.searchParams.get("error") === "cancelled"
        ? "Bạn đã hủy đăng nhập."
        : "Chưa đăng nhập được với nhà cung cấp. Vui lòng thử lại.",
    );
  const code = url.searchParams.get("code");
  if (
    url.searchParams.getAll("code").length !== 1 ||
    !/^[A-Za-z0-9_-]{43}$/.test(code || "")
  )
    throw new Error("Kết quả đăng nhập không hợp lệ. Vui lòng thử lại.");
  return code!;
}

export function checkAuthorizeUrl(value: string, provider: Provider) {
  const url = new URL(value);
  const hosts = {
    google: "accounts.google.com",
    github: "github.com",
    facebook: "www.facebook.com",
  };
  if (
    url.protocol !== "https:" ||
    url.hostname !== hosts[provider] ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error("Máy chủ trả về địa chỉ đăng nhập không hợp lệ.");
  return value;
}

export function authDestination(next?: string) {
  return next === "connections"
    ? "/connections"
    : next === "account"
      ? "/account"
      : next === "plan"
        ? "/plan"
        : next === "profile"
          ? "/(tabs)/profile"
          : "/(tabs)/review";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiUrl(input: string, allowHttp: boolean) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(
      "Nhập địa chỉ API đầy đủ, ví dụ https://api.example.com/api.",
    );
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["https:", "http:"].includes(url.protocol)
  )
    throw new Error("Địa chỉ API không hợp lệ.");
  if (url.protocol === "http:" && !allowHttp)
    throw new Error("Bản ứng dụng này yêu cầu API dùng HTTPS.");
  let pathname = url.pathname.replace(/\/+$/, "");
  if (!pathname.endsWith("/api")) pathname += "/api";
  url.pathname = pathname;
  return url.toString().replace(/\/$/, "");
}

export async function apiRequest<T>(
  base: string,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  if (!base)
    throw new ApiError(
      0,
      "Chưa cấu hình máy chủ. Mở Cá nhân → Cài đặt để nhập địa chỉ API.",
    );
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), options.timeoutMs ?? 10000);
  const forwardAbort = () => abort.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  if (options.signal?.aborted) abort.abort();
  try {
    const response = await fetch(base + path, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: abort.signal,
    });
    const data: unknown = await response.json().catch((error) => {
      if (abort.signal.aborted) throw error;
      return null;
    });
    if (!response.ok) {
      const message =
        data && typeof data === "object" && "message" in data
          ? (data as { message: unknown }).message
          : data && typeof data === "object" && "error" in data ? (data as { error: unknown }).error : null;
      throw new ApiError(
        response.status,
        typeof message === "string"
          ? message
          : Array.isArray(message)
            ? message.join("\n")
            : `Máy chủ trả về lỗi ${response.status}.`,
      );
    }
    if (data === null)
      throw new ApiError(502, "Máy chủ chưa trả về dữ liệu hợp lệ.");
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (abort.signal.aborted)
      throw new ApiError(
        0,
        "Máy chủ chưa phản hồi. Thử kết nối lại hoặc kiểm tra máy chủ trong Cài đặt.",
      );
    throw new ApiError(
      0,
      "Không kết nối được máy chủ. Địa chỉ có thể đã hết hạn hoặc máy chủ đang tắt. Kiểm tra trong Cài đặt.",
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Có lỗi xảy ra. Vui lòng thử lại.";
}

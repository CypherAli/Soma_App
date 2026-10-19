# Soma Android 1.0.3 — đăng nhập cùng web

App bổ sung Google, GitHub và Facebook, cùng các phương thức hiện có là email/mật khẩu, đăng ký và quên mật khẩu. Đăng ký thêm nhập lại mật khẩu và xác nhận điều khoản giống web. Có hiện/ẩn mật khẩu và chặn gửi trùng khi đang xử lý.

APK `Soma_App/builds/soma-1.0.3-preview.apk`, Android versionCode 4, 61.657.626 byte. SHA-256 `d7e50e82194bfc314806022dc663e12987dead46581cf1fe99424eb2847fd41a`. Đã cài cập nhật thành công trên emulator. Manifest xác nhận phiên bản, API HTTPS và plugin WebBrowser. Gateway công khai trả đúng tên, kích thước và ETag của APK mới.

Đăng nhập mở trình duyệt hệ thống bằng Expo WebBrowser SDK 57, nhận callback `soma://oauth`, rồi đổi mã dùng một lần lấy phiên Soma. Phiên lưu trong SecureStore như đăng nhập email. Không nhúng Client Secret hoặc chuyển session token trong deep link. Proof PKCE và yêu cầu đang chờ được lưu trong SecureStore, thời hạn 10 phút; mã handoff có hạn 60 giây, lưu hash trong PostgreSQL, chỉ dùng được một lần. App kiểm tra state, máy chủ và nhà cung cấp.

Backend vẫn xác định người dùng bằng provider ID hiện có, dùng chung users/sessions và dữ liệu học của web. Không tự gộp hai tài khoản chỉ vì email liên hệ giống nhau, đúng hành vi web hiện tại. Migration `20261019020000_mobile_oauth` chỉ thêm cột nullable và bảng mã handoff.

## Cấu hình cần hoàn tất trên console nhà cung cấp

Backend dùng riêng `MOBILE_OAUTH_API_URL`, không thay `API_URL` của web localhost. Với link thử hiện tại, callback cần đăng ký chính xác:

```
https://captured-pants-metabolism-weddings.trycloudflare.com/api/auth/oauth/google/callback
https://captured-pants-metabolism-weddings.trycloudflare.com/api/auth/oauth/github/callback
https://captured-pants-metabolism-weddings.trycloudflare.com/api/auth/oauth/facebook/callback
```

Google: mở OAuth client **Web application đang được web Soma sử dụng**, thêm URI đầu tiên vào Authorized redirect URIs, giữ callback localhost hiện tại. Không đưa `soma://oauth` vào Google Console; đó là callback nội bộ từ backend về app.

GitHub: trong Developer settings → OAuth Apps, mở ứng dụng Soma hiện tại, chọn Add callback URL và thêm URI thứ hai. Tài liệu GitHub hiện tại hỗ trợ tối đa 10 callback; giữ callback localhost đang dùng trên web.

Facebook: bổ sung URI HTTPS tương ứng vào Valid OAuth Redirect URIs của ứng dụng hiện có, kiểm tra app mode/test users theo console thực tế.

Link Cloudflare thử nghiệm sẽ đổi khi tunnel bị tạo lại. Khi đó phải cập nhật `MOBILE_OAUTH_API_URL`, callback trong console và API của app. Muốn sử dụng ổn định cần domain/backend HTTPS cố định.

## Kiểm tra

- Typecheck và lint app; backend build và lint các tệp auth thay đổi.
- `Soma_App/scripts/qa-auth-web.cjs`: đã qua kiểm tra đăng ký bằng tài khoản thử, xác nhận mật khẩu/điều khoản bắt buộc, đăng nhập email cùng user ID, chuyển đến Cá nhân, hiện/ẩn mật khẩu, giao diện sáng 390px và tối 320px. Tài khoản thử đã được xóa theo đúng ID + email.
- Gateway HTTPS đã kiểm tra API capabilities của cả ba provider, mã không hợp lệ bị từ chối, giới hạn body, đường dẫn riêng tư bị chặn và danh mục vẫn có 5 mô hình/51 câu hỏi.
- Android emulator: đã xác nhận nút Google mở trình duyệt hệ thống; callback đổi mã bằng proof của app và đăng nhập đúng user. Cả hai trường hợp app đang mở và app bị force-stop trong lúc xác thực đều trở về Cá nhân thành công. Nhà cung cấp được giả lập trong tiến trình QA riêng; không thay luồng xác thực của backend đang chạy và chưa thử tài khoản Google thật.
- 7 unit tests app, 22 tests auth backend tại thời điểm triển khai.
- `soma_be/scripts/qa-mobile-oauth.mjs`: dùng nhà cung cấp giả trong riêng tiến trình QA và PostgreSQL thật, xác nhận tài khoản web được dùng lại, mã không lộ token, PKCE, mã một lần kể cả hai yêu cầu đồng thời, tồn tại qua khởi động lại backend và hủy đăng nhập. Chỉ xóa tài khoản/record thử được tạo bởi script.
- Chưa nghiệm thu đăng nhập qua tài khoản Google/GitHub/Facebook thật cho đến khi callback được cấu hình trong console và người dùng xác thực.

Tài liệu API: [Expo WebBrowser SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/), [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [GitHub OAuth web flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).

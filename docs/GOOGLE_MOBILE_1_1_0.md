# Bật đăng nhập Google cho Soma 1.1.0

Callback đang dùng trên máy chủ thử:

```text
https://friday-cement-institutional-assumes.trycloudflare.com/api/auth/oauth/google/callback
```

1. Mở [Google Cloud Console — OAuth Clients](https://console.cloud.google.com/auth/clients), chọn đúng dự án Soma.
2. Mở OAuth Client loại **Web application** đang được backend sử dụng. Giao diện cũ nằm trong **APIs & Services → Credentials**.
3. Trong **Authorized redirect URIs**, thêm chính xác callback ở trên, rồi chọn **Save**. Giữ các callback khác đang được web sử dụng.
4. Nếu ứng dụng OAuth ở chế độ Testing, thêm tài khoản Google dùng thử vào **Audience → Test users** khi Google yêu cầu.
5. Mở Soma → Đăng nhập → Tiếp tục với Google. Hoàn tất lựa chọn tài khoản trên trình duyệt và quay về Soma.

Không gửi Client Secret, mật khẩu hoặc mã đăng nhập vào chat. Không cần tạo Android OAuth Client cho luồng đang dùng: app mở trình duyệt hệ thống, backend nhận callback HTTPS và đổi mã một lần để quay về `soma://oauth` bằng PKCE.

Máy chủ đã cập nhật callback và app có luồng quay về. Đăng nhập Google thực tế vẫn cần kiểm tra sau khi lưu cấu hình trên Google Cloud; chưa thể xem là hoàn tất chỉ dựa vào trạng thái “đã cấu hình”. Kiểm tra trước đó đã gặp `redirect_uri_mismatch`.

Đây là link Cloudflare tạm. Khi đổi API, callback này cũng phải đổi. Cần hosting/tên miền cố định để đăng nhập Google ổn định; các mẫu cấu hình production đã có trong hai dự án.

Tham khảo: [Google — tạo OAuth credentials và đăng ký redirect URI](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred).

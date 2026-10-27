# Chạy Soma bằng Expo trên laptop

Nhấp đúp **Mo Soma tren laptop.cmd** trong thư mục `Soma_App`, hoặc chạy:

```text
npm run desktop:preview
```

Cửa sổ trình duyệt giữ khung điện thoại có viewport 390px, kể cả khi phóng to cửa sổ. Địa chỉ: http://localhost:8082 . Giữ terminal chạy trong lúc dùng; Ctrl+C dừng những dịch vụ do terminal đó khởi động. Các máy chủ đã chạy từ trước được dùng lại.

Người dùng chọn bản Expo trong khung điện thoại để trình diễn. Máy ảo Android và các dịch vụ riêng của nó đã được gỡ theo yêu cầu để giảm tải khi chạy cùng BO/BE/FE.

Đây là gói Expo web của cùng mã nguồn app, không cần Android Emulator hay Expo Go. Trình chọn ảnh dùng phiên bản trình duyệt. Bản trình diễn đã đóng gói để giảm bộ nhớ; sau khi đổi mã nguồn chạy `npm run desktop:build` để cập nhật. Muốn dùng Metro tự tải lại khi sửa code, chạy `npm run desktop -- --open` sau khi dừng server xem trước ở cổng 8082.

API laptop: `http://127.0.0.1:8083/api`, gateway giới hạn route mobile, chuyển đến backend local cổng 4000. Bản laptop không phụ thuộc link Cloudflare tạm. Chỉ dùng địa chỉ này trên máy tính đang chạy; `localhost` trên điện thoại là chính điện thoại đó.

## Đăng nhập GitHub/Facebook

Mở **Cá nhân → Đăng nhập**, chọn nhà cung cấp, tự đăng nhập và cấp quyền trên trang của họ. Trình duyệt quay về cùng cửa sổ Soma. Phiên web và bằng chứng đăng nhập lưu theo tab; mã phiên không đi trong URL.

Nếu đã có tài khoản Soma bằng email/Google, đăng nhập tài khoản đang dùng rồi vào **Cá nhân → Tài khoản liên kết** để liên kết GitHub/Facebook trước. Email giống nhau không tự động gộp hai tài khoản.

Callback bản laptop sử dụng:

```text
http://localhost:4000/api/auth/oauth/github/callback
http://localhost:4000/api/auth/oauth/facebook/callback
http://localhost:4000/api/auth/oauth/google/callback
```

Nếu nhà cung cấp báo callback không khớp, đăng ký chính xác URL tương ứng trong cấu hình ứng dụng của dịch vụ đó. Không gửi Client Secret, mật khẩu hoặc mã xác minh vào chat.

Backend phát triển cần:

```text
DESKTOP_OAUTH_API_URL=http://localhost:4000/api
MOBILE_OAUTH_RETURN_URLS=http://localhost:8082/oauth,http://127.0.0.1:8082/oauth
```

Giữ các địa chỉ quay về đã có khi bổ sung allowlist. Chỉ callback laptop đã được cho phép mới dùng HTTP loopback ở chế độ phát triển. APK vẫn dùng cấu hình HTTPS riêng; production không chọn HTTP loopback.

## Khi gặp lỗi

- **Chưa kết nối máy chủ:** nhấn Ctrl+R trong cửa sổ Soma. Nếu vẫn lỗi, mở lại bằng file `.cmd` và xem lỗi trong terminal. Backend, PostgreSQL và gateway local cần đang chạy.
- **Cổng 8082 đang dùng cấu hình khác:** dừng đúng phiên Expo cũ bằng Ctrl+C rồi mở lại file `.cmd`.
- **Lỗi sau khi cấp quyền:** gửi nguyên thông báo lỗi, không gửi URL có mã OAuth. Kiểm tra callback của nhà cung cấp trước.

## Kiểm tra kỹ thuật

- Backend: 32 bộ/202 kiểm thử đạt; callback laptop/native/production tách biệt, chặn host chưa đăng ký.
- UI/API/DB thật, danh tính nhà cung cấp QA: GitHub có email riêng tư đăng nhập; liên kết Facebook chờ khôi phục phiên chậm; đăng nhập Facebook về cùng tài khoản; hủy đăng nhập quay về thông báo rõ.
- GitHub: người dùng xác nhận ngày 27/10/2026 đã đăng nhập thật, quay lại Soma và thấy tài khoản.
- Facebook: luồng QA đã đạt; còn cần người dùng xác nhận liên kết và đăng nhập bằng tài khoản thật.
- Atlas đã mở qua API local, không có yêu cầu API thất bại trong bài QA. WebGL2 dùng Intel Iris Xe/Direct3D11 trong trình duyệt QA; đây không phải phép đo FPS trên cửa sổ của người dùng.
- Báo cáo: `qa/polish/desktop-oauth-report.json`, `desktop-providers.json`, `desktop-backend-tests.log`.

Tham khảo: [Expo web](https://docs.expo.dev/workflow/web/), [GitHub OAuth redirect URL](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#redirect-urls). Với OAuth có scheme riêng trên điện thoại, [Expo khuyến nghị development build](https://docs.expo.dev/guides/authentication/) thay vì Expo Go.

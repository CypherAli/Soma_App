# Soma Android 1.0.1 — 19/10/2026

**Bản này đã được thay bằng 1.0.2. Tunnel và link 1.0.1 bên dưới đã hết hiệu lực sau khi kết nối máy tính gián đoạn. Đây là báo cáo lịch sử của bản 1.0.1; xem báo cáo bản mới trước khi tải.**

APK: `Soma_App/builds/soma-1.0.1-preview.apk`, versionCode 2, 61.544.983 byte, arm64-v8a và x86_64. Dùng khóa Android Debug cho bản cài thử.

SHA-256: `3f72cc34c027e1b6f2f62511a336b5e002b983a5435d10ab1a51eb0317a2dec2`.

## Thay đổi giao diện và dựng hình

- Màn 3D dùng thanh tiêu đề gọn, bỏ phần thương hiệu/đầu trang lặp lại. Khung 3D lớn hơn; thông tin, danh sách cấu trúc và các lớp nằm trong bảng trượt mở khi cần.
- Thanh chọn bên, nút phóng to/thu nhỏ/đặt lại và thanh luyện tập có vị trí cố định; danh sách cấu trúc được ảo hóa.
- Hai bàn tay trong GLB gốc cách xa nhau. Viewer giữ nguyên hình học và tên gốc, chỉ dịch các nhóm hiển thị để hai tay gần nhau, rồi căn camera theo phần đang thấy.
- Giảm giới hạn mật độ điểm ảnh từ 1,5 xuống 1,25 và tắt MSAA. WebView được memo hóa; thay đổi phần thông tin không đặt lại góc xoay. Đây là các thay đổi giảm tải, chưa phải bằng chứng về FPS trên điện thoại vật lý.

## Cài và dùng qua mạng khác

Trang tải thử: https://immune-trustees-constraints-tower.trycloudflare.com/

QR: `Soma_App/qa/soma-download-qr.png`. Bản tải hiện tại đã nhúng API HTTPS trong bundle và Expo manifest; đã xác nhận địa chỉ thực trong Cài đặt của APK được cài. Địa chỉ API cũng có thể đổi tại Cá nhân → Cài đặt. Nếu đã nhập cấu hình thủ công trên bản cũ, cần đổi sang API HTTPS của phiên thử này.

Gateway chỉ mở trang tải, APK, tài nguyên 3D và các API mobile/auth/study cần thiết. Không chuyển tiếp Swagger, API quản trị, tài liệu cá nhân hoặc thư mục dự án. Có giới hạn kích thước yêu cầu và số lần gọi các route đăng nhập/đăng ký/quên mật khẩu; backend vẫn kiểm tra xác thực bình thường.

Người dùng đã đồng ý rõ việc dùng Cloudflare để chuyển tiếp file và dữ liệu app cho lượt thử. [Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) phụ thuộc vào máy tính, backend, gateway và tiến trình tunnel còn chạy. Đây chưa phải triển khai production hoạt động liên tục; URL có thể đổi khi tạo tunnel mới.

## Xác minh

- TypeScript, ESLint và 5 unit tests app qua.
- Luồng React Native Web qua: Atlas, chọn cấu trúc, bảng trượt, luyện tập, lưu dở, tách tài khoản, lộ trình và thử lại khi POST kết quả trả 503.
- Kiểm tra bố cục ở 320px và 390px qua; cả năm GLB dựng hình, giải mã Draco, chọn cấu trúc qua cả URL HTTPS công khai.
- Gateway qua kiểm tra route không được phép trả 404, giữ xác thực 401 và giới hạn body 413.
- APK cài thành công trên Android Emulator SDK 36. Đã đọc đúng API HTTPS trong Cài đặt native và tải GLB/Draco qua tunnel; bằng chứng ở `Soma_App/qa/android/public-config-report.json`.
- File tải đầy đủ qua Internet đã được so SHA-256 với APK nguồn và khớp chính xác.

Kiểm tra nghiệm thu trên điện thoại Android vật lý do người dùng thử tiếp. Không dùng tốc độ của emulator dựng hình bằng CPU để khẳng định hiệu năng trên điện thoại thật.

# Soma Android 1.0.2 — 19/10/2026

Trang tải thử hiện tại: https://captured-pants-metabolism-weddings.trycloudflare.com/

APK: `Soma_App/builds/soma-1.0.2-preview.apk`, versionCode 3, 61.545.167 byte, arm64-v8a và x86_64. Đây là bản thử ký bằng khóa Android Debug, chưa phải bản phát hành cửa hàng.

SHA-256: `feaf20cf4188ce8976dc5e541ca101d73f77578c587161883cbff755907c35bf`.

## Phần đã sửa

- Khung Atlas 3D lớn, thanh tiêu đề gọn; thông tin và danh sách cấu trúc mở bằng bảng trượt. Bỏ phần đầu lặp và đoạn mô tả dài chiếm màn hình mặc định.
- Hai tay được sắp gần nhau để quan sát; không đổi hình học và tên cấu trúc gốc. Thêm nút zoom/đặt lại, giữ góc xoay khi phần chú giải đổi kích thước.
- Giảm giới hạn pixel ratio và tắt MSAA; danh sách cấu trúc ảo hóa, WebView được memo hóa. Chưa đo FPS trên điện thoại vật lý nên không cam kết đã hết lag trên mọi máy.
- API HTTPS được nhúng trong Expo manifest và được ưu tiên hơn giá trị biến môi trường trong bundle, tránh dùng địa chỉ cũ từ cache Metro.
- Gateway chỉ mở download và các API của app; tunnel dùng HTTP/2 qua IPv4. Không mở API quản trị, Swagger, tài liệu cá nhân hay thư mục dự án.

## Kết quả kiểm tra

- TypeScript và lint qua; 5 unit tests app đã qua sau các thay đổi viewer.
- UI React Native Web: chọn cấu trúc, bảng thông tin, luyện tập, lưu dở, tách tài khoản, lộ trình và gửi lại kết quả khi lỗi 503 đều qua. Bố cục được kiểm tra ở 320px và 390px.
- Cả 5 mô hình qua dựng hình, giải mã Draco và chọn cấu trúc trên URL HTTPS mới.
- Gateway qua kiểm tra 404 cho route riêng tư, 401 khi chưa xác thực và 413 cho body quá lớn.
- API công khai: đăng ký tài khoản QA tạm, đọc hồ sơ có token, chấm 10/10, gửi đồng thời cùng UUID và xác nhận chỉ một bản ghi lịch sử đều qua. Tài khoản được xóa đúng id/email sau kiểm tra; báo cáo `Soma_App/qa/public-account-report.json`.
- File APK đã được tải đầy đủ qua Internet; SHA-256 khớp file nguồn. `assets/app.config` có đúng version 1.0.2 và API HTTPS mới.
- Chữ ký APK v2 được xác minh bằng apksigner. Bản đã cài trên emulator có versionName 1.0.2/versionCode 3; smoke test đọc đúng API mới trong Cài đặt native và tải GLB/Draco qua HTTPS thành công. Báo cáo `Soma_App/qa/android/public-config-report.json` ghi URL mới và kết quả này.

UI native 1.0.1 đã qua WebView 3D, chọn bên, xoay, lưu mô hình, bảng cấu trúc/thông tin, đăng nhập, giữ phiên và khôi phục bản nháp. Một lượt native đầy đủ qua API local hoàn thành 10/10; lượt lặp qua tunnel bị ADB timeout ở câu 9/10, cùng thời gian máy bị gián đoạn, không được tính là pass. Log crash rỗng. Việc chấm và đồng bộ qua API HTTPS mới đã được kiểm tra riêng thành công như trên. Bản 1.0.2 giữ giao diện này và đổi cấu hình máy chủ; báo cáo smoke native ở `Soma_App/qa/android/public-config-report.json` phải được đọc kèm version/API thực đã kiểm tra.

## Dùng trên điện thoại

Quét `Soma_App/qa/soma-1.0.2-download-qr.png`, tải và cài APK 1.0.2. Nếu đã tải 1.0.1 từ link trước, dùng bản mới này. Điện thoại có thể dùng Wi-Fi khác hoặc 4G khi máy tính đang chạy backend, gateway và tunnel.

Người dùng đã đồng ý chuyển tiếp APK và dữ liệu app qua Cloudflare cho lượt thử. Đây là link tạm: máy tính cần duy trì kết nối và không sleep; tunnel cũ đã hết hiệu lực sau một lần gián đoạn và đã được thay thế. Cần server triển khai ổn định để dùng liên tục. Hiệu năng trên điện thoại vật lý còn cần người dùng nghiệm thu.

# Kết quả sửa và kiểm thử Soma Expo — 25/10/2026

## Nguyên nhân và thay đổi

- Backend không chạy trong phiên ban đầu; callback/API cũ dùng Cloudflare Quick Tunnel không còn truy cập được. `npm start` trước đây chỉ mở Expo. Nay `npm start` và `npm run dev` chọn IPv4 Wi-Fi, kiểm tra/khởi động backend và mở Metro LAN. Máy chủ Internet cố định vẫn chưa được triển khai.
- Expo Go Android báo `ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd` khi đọc bundle multipart/chunked. Middleware Metro nay trả JavaScript thường, không gzip, có Content-Length chính xác cho yêu cầu multipart. Kiểm thử thực tế đã thoát màn hình tải và vào ứng dụng.
- Atlas có gói dữ liệu công khai gồm 149 mô hình và 1.125 câu hỏi; dùng 128 buffer hình học dùng chung, chỉ đọc cảnh đang mở. Trang chủ dùng ảnh sẵn có thay cho WebView 3D thứ hai. Có watchdog 30 giây bao phủ cả giai đoạn khởi tạo viewer, xử lý WebView bị đóng và nút thử lại.
- Thiết kế lại trang chủ, bảng màu, thẻ nội dung, thanh điều hướng, bộ lọc Atlas và màn hình đăng nhập. 149 PNG xem trước nền trong suốt được dựng từ mô hình thật; tỷ lệ hiển thị căn theo vùng có hình học.
- Callback đăng nhập nhận đúng địa chỉ Expo Go thay vì luôn dùng `soma://oauth`. Server chỉ cho phép callback đã đăng ký chính xác, giữ PKCE, state và mã dùng một lần. Callback tunnel đã chết bị vô hiệu trong quy trình phát triển, không báo nhà cung cấp sẵn sàng khi chưa có HTTPS hoạt động.
- Phiên cũ được xác minh nền để không khóa màn hình công khai; kết quả khôi phục đến muộn không được ghi đè phiên đăng nhập mới. Có kiểm tra kết nối trong Cài đặt và thao tác phục hồi sau timeout.

## Bằng chứng đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Typecheck và lint app | Qua |
| Unit tests app | 12/12 qua |
| Backend build và tests OAuth/allowlist/readiness | Build qua, 7/7 tests qua |
| Toàn bộ gói ngoại tuyến | 149 cấu hình, ID và phạm vi buffer hợp lệ |
| Dựng ảnh từng mô hình | 149/149 cảnh render được, có PNG trong suốt |
| Trình xem Chrome khi mạng bị tắt | 7 cảnh đại diện, gồm cả hai GLB, render/xoay/chọn được; không có HTTP request |
| Giao diện web | Trang chủ, Atlas, auth sáng/tối; 320/390 px; tìm kiếm và phục hồi khi capabilities lỗi |
| Email và đăng ký qua UI web | Tạo tài khoản thật trong DB phát triển, đăng nhập đúng danh tính; tài khoản QA được xóa |
| Expo Go Android | Trang chủ và gan hiển thị; gan có 90 mục cấu trúc; kéo xoay và chạm hiện “Phân thuỳ IV”, “Segmentum IV”, chú giải |
| Email trong Expo Go | Đăng nhập backend thật; vào đúng Cá nhân; SecureStore giữ phiên sau force-stop và mở lại; xóa đúng tài khoản QA |
| 3D khi backend không truy cập được | Đổi API trên máy ảo QA sang localhost:65534: gan vẫn hiện 90 mục, 225.023 pixel hình học; đã khôi phục API ban đầu |
| Dịch vụ cuối lượt kiểm thử | Backend `/api/health` HTTP 200, DB up; Metro `/status` running |

Môi trường: Expo SDK 57, Expo Go Android 57.0.9, Android Emulator API 36.1, WebView 134, GPU SwiftShader. Máy ảo dùng ảnh userdata thử nghiệm riêng; không xóa userdata AVD gốc. Expo Go vẫn cần Metro cho lần lấy JS/asset đầu tiên; kiểm thử mất backend giữ Metro/cache asset khả dụng. Kết quả emulator không thay cho đo hiệu năng trên điện thoại thật.

Ảnh ở `qa/expo/home-native.png`, `qa/expo/liver-native.png`, `qa/expo/liver-selected.png`, `qa/expo/liver-no-backend.png`, và `qa/redesign/`. Báo cáo máy đọc tại `qa/expo/{auth,offline,transport}-report.json`, `qa/offline/report.json`, `qa/redesign/{report,thumbnails-report}.json`.

## Phần chưa hoàn tất qua Internet

Google/GitHub/Facebook thật chưa được nghiệm thu. Đã kiểm thử giao thức bằng provider giả lập và sửa callback Expo Go, nhưng cần backend HTTPS cố định, kết nối tài khoản hosting và đăng ký callback thật trong console nhà cung cấp. Không có tuyên bố đã triển khai 24/7 hoặc đăng nhập Google thật thành công.

Đã chuẩn bị `soma_be/railway.json` và Dockerfile hiện có, migration callback Expo, cùng healthcheck HTTP 503 khi DB không sẵn sàng. Hướng dẫn và biến môi trường trong `EXPO_VA_MAY_CHU.md`. Chưa tạo dịch vụ hosting tính phí hoặc APK mới trong lượt này.

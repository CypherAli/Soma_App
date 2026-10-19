# Soma Mobile — Bản MVP ngày 18/10/2026

Đã tạo APK cài độc lập: `Soma_App/builds/soma-1.0.0-preview.apk`, 61.541.551 byte. Chữ ký đã xác minh bằng Android apksigner; dùng khóa Android Debug cho demo, chưa phải bản phát hành cửa hàng.

SHA-256: `2a85e45eab5051157a57a2c4e75181f922ef5a43616fb98c124ee8f25c4fa912`.

## Phạm vi đã triển khai

- Bốn mục Hôm nay, Atlas, Ôn tập, Cá nhân; không có trang Tra cứu riêng.
- Năm GLB thật: bàn tay, tim, phổi, gan, thân não và dây sọ. Viewer cảm ứng có chọn cấu trúc, ẩn/hiện, tìm tên và đặt lại góc nhìn; bàn tay hỗ trợ chọn bên.
- 51 câu hỏi hiện có từ cùng chú giải của web; luyện 10/20 câu theo số câu thực có, xem giải thích, lưu dở và luyện lại câu sai.
- Tài khoản, lịch sử, lộ trình và hàng ôn dùng chung backend của web. Máy chủ chấm điểm, UUID chống ghi trùng khi gửi lại. Mục đã lưu và bản nháp được tách theo máy chủ/tài khoản trên thiết bị.
- Giao diện sáng/tối, cài đặt API, nguồn dữ liệu và hướng dẫn build có thể chạy lại trong `Soma_App/README.md`.

## Kết quả xác minh

| Kiểm tra | Kết quả |
|---|---|
| App TypeScript và ESLint | Qua |
| Expo Doctor | 21/21 kiểm tra qua |
| Unit tests app | 5/5 qua |
| Backend tests liên quan | 25/25 qua, 4 suite |
| Năm GLB trên trình duyệt | Tải, giải mã Draco, dựng hình và chọn cấu trúc thật đều qua |
| Luồng UI trên bản React Native Web | Qua: đăng ký, Atlas, xoay 3D, lựa chọn cấu trúc, lưu mô hình, 10 câu, tiếp tục bài dở, đồng bộ lịch sử, lộ trình, giao diện tối, tách tài khoản, màn hình 320px |
| Gửi kết quả lỗi 503 rồi gửi lại | Qua; payload/UUID giữ nguyên, lịch sử chỉ ghi một lượt |
| API thực trên DB phát triển | Qua: chấm điểm, gửi đồng thời, xung đột UUID, câu đã sửa, tách tài khoản, hàng ôn và giới hạn tài nguyên |
| Hàng ôn có hơn 200 câu từ nguồn khác | Qua; câu phù hợp với mobile vẫn được lấy đầy đủ |
| APK Android | Build và xác minh chữ ký thành công; cài thành công trên emulator API 36.1 |
| Mở app và 3D trong APK | Qua: giao diện native, GLB/Draco, 54 cấu trúc bàn tay, chọn bên, xoay cảm ứng được xác minh bằng pixel vùng WebView, lưu mô hình |
| Luồng chính trên APK Android | **Qua lúc 23:32 ngày 18/10/2026**: đăng nhập native → tắt tiến trình → giữ phiên SecureStore → làm 2 câu → tắt tiến trình → khôi phục đúng bản nháp 2/10 → hoàn thành 10 câu → báo Đã đồng bộ. API xác nhận đúng một lượt, điểm 10/10 |
| Điện thoại Android vật lý | **Chưa kiểm thử** |

Các tài khoản và dữ liệu thử dùng email riêng `@example.invalid`; script xóa đúng tài khoản vừa tạo. Không lấy kết quả emulator đang lỗi hệ thống làm bằng chứng hiệu năng của ứng dụng trên điện thoại.

## Kiểm tra lại ngày 18/10/2026

- Đã chạy lại TypeScript, ESLint, 5 bài test app, 25 bài test backend và bài kiểm tra API với DB thực; tất cả qua.
- Android: AVD `Medium_Phone_API_36.1`, SDK 36, WebView `155.0.8059.43`, viewport 720×1600, density 280. SHA-256 của APK lấy trực tiếp từ thiết bị khớp chính xác file APK ở trên. Báo cáo máy đọc được: `Soma_App/qa/android/report.json`; ảnh gồm `home.png`, `viewer.png`, `restored-session.png`, `restored-draft.png`, `quiz.png`, `result.png`.
- Môi trường emulator trước đó có lỗi System UI, lỗi OpenGL khi dùng GPU host và Android dừng app trong lúc Play Store cập nhật WebView. Đã cold boot bằng SwiftShader, tắt Vulkan, chờ hệ thống ổn định và tạm dừng Play Store trên emulator thử trước lượt nghiệm thu thành công. Log crash Android trong lượt thành công không có lỗi. Không sửa app để che các lỗi môi trường này.
- Đã sửa kịch bản QA: trạng thái đầu sạch trên emulator, không đọc lại XML cũ khi UIAutomator không trả cây giao diện, nhập liệu chậm và kiểm tra email đầy đủ, chờ app khởi động xong trước khi bấm tab, so sánh riêng vùng 3D, lưu báo cáo lỗi và thông tin tiến trình thoát.
- Đã chạy lại cả 5 GLB: dựng hình, giải mã Draco và chọn cấu trúc đều qua; số cấu trúc lần lượt 54/18/6/9/82. Bổ sung favicon rỗng cho tài liệu viewer để bỏ yêu cầu favicon 404 không cần thiết; QA hiện kiểm tra cả lỗi console và phản hồi HTTP lỗi.
- Đã xuất lại bản React Native Web từ nguồn hiện tại và chạy lại toàn luồng, gồm lỗi gửi kết quả 503 rồi thử lại cùng UUID, lưu dở, tách tài khoản, lộ trình và đồng bộ. Tất cả qua; báo cáo ở `Soma_App/qa/web-report.json`.

## Cài thử

Cài APK, chạy `soma_be`, rồi nhập địa chỉ API trong Cá nhân → Cài đặt. Android Emulator dùng `http://10.0.2.2:4000/api`; điện thoại thật cần địa chỉ LAN hoặc HTTPS mà điện thoại truy cập được. Tài khoản và nội dung dùng cùng backend với web. Cần nghiệm thu toàn luồng và hiệu năng trên điện thoại trước khi coi đây là bản hoàn thiện cuối.

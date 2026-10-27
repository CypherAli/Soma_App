# Soma Mobile 1.0.6 — đóng gói và triển khai

## Những thay đổi của app

- Điều khoản sử dụng và chính sách bảo mật có màn hình riêng, đọc được khi không có backend. Truy cập từ đăng ký, Cá nhân và Cài đặt. Mở tài liệu rồi quay lại giữ nguyên thông tin đăng ký đang nhập.
- Phiên bản hiển thị và Expo config lấy từ `package.json`; bản 1.0.6 dùng Android versionCode 7.
- Sửa khôi phục máy chủ: APK preview giữ nguyên địa chỉ USB/LAN do người dùng lưu sau khi mở lại. Chỉ phiên phát triển mới tự cập nhật địa chỉ LAN theo Metro; bản production vẫn từ chối HTTP.
- Bản APK mới đóng gói gói ngoại tuyến hiện tại, thay vì dùng APK 1.0.5 cũ hơn các thay đổi ngày 25/10.

## Hosting: cấu hình đã chuẩn bị, chưa tạo dịch vụ

Theo lựa chọn của chủ dự án ngày 26/10, chỉ chuẩn bị cấu hình trước. Backend có `railway.json`, Dockerfile, healthcheck `/api/health` và `.env.production.example`. Docker context loại toàn bộ `.env*`, `.pem`, `.key`, gồm cả các file môi trường cục bộ đang chứa bí mật.

Khi có hosting:

1. Dùng thư mục `soma_be` làm root của dịch vụ; kết nối PostgreSQL riêng. Điền các biến từ `.env.production.example` vào phần secrets của hosting. Không sao chép database phát triển hoặc file `.env` lên repository.
2. Đặt `API_URL` và `MOBILE_OAUTH_API_URL` thành `https://<API_HOST>/api`, `FRONTEND_URL` thành địa chỉ web. Container áp dụng migration trước khi mở cổng; healthcheck phải trả 200 và `db: up`.
3. Đăng ký các callback chính xác trong console Google/GitHub/Facebook: `https://<API_HOST>/api/auth/oauth/<provider>/callback`. APK quay về `soma://oauth`; Expo Go cần được thêm đúng URL vào `MOBILE_OAUTH_RETURN_URLS`.
4. Cấu hình SMTP để nghiệm thu quên mật khẩu. Chỉ bật nhà cung cấp đăng nhập có bộ thông tin đã cấu hình. Cờ capabilities không thay cho đăng nhập thật.
5. Đặt `EXPO_PUBLIC_API_URL=https://<API_HOST>/api` khi build app. Dùng `npm run android:build -- -Production` để yêu cầu HTTPS. Bản preview có thể đổi máy chủ trong Cá nhân → Cài đặt; đổi máy chủ sẽ đăng xuất.
6. Thử đăng nhập email, từng provider thật, khôi phục phiên, luyện 10 câu, gửi lại khi mất phản hồi và kiểm tra chỉ có một lượt học. Không cần chia sẻ mật khẩu hoặc khóa dịch vụ trong chat.

Không dùng Cloudflare Quick Tunnel làm bằng chứng dịch vụ hoạt động liên tục. Khi cập nhật nội dung CMS/upload trong tương lai, cần storage bền vững và quy trình sao lưu/khôi phục PostgreSQL.

## Kiểm thử trên điện thoại

Kết nối USB và bật USB debugging. Kiểm tra bằng `adb devices -l`; chỉ tiếp tục sau khi điện thoại báo `device`. Không chạy `qa:android` trên máy thật vì script đó dành cho emulator và có thao tác xóa dữ liệu thử.

Để kiểm thử bằng backend cục bộ qua USB, dùng `adb -s <serial> reverse tcp:4000 tcp:4000`, rồi đặt API của app thành `http://127.0.0.1:4000/api`. Đây là kết nối thử; chỉ hoạt động khi USB và backend còn chạy. Bản production yêu cầu HTTPS công khai.

Kịch bản nghiệm thu: cài đúng APK và đối chiếu SHA-256; mở phiên bản 1.0.6; đọc hai tài liệu rồi quay lại form không mất dữ liệu; mở gan/tim/toàn thân; xoay, zoom, chọn, tách/cắt; mở lại khi mất backend; đăng nhập tài khoản QA; đóng và mở lại app; làm dở rồi khôi phục; nộp đủ 10 câu và đối chiếu lịch sử; đăng xuất và xác nhận dữ liệu không xuất hiện ở tài khoản khác.

## Đề xuất cải tiến tiếp theo

1. Ưu tiên độ mượt trên điện thoại: đo FPS, bộ nhớ, thời gian mở cảnh lớn trên chính máy demo rồi điều chỉnh chất lượng theo thiết bị.
2. Hướng dẫn 3D trong lần mở đầu: xoay, zoom, chọn cấu trúc, tách lớp và nút trở về góc nhìn ban đầu. Cho bỏ qua và xem lại.
3. Nút “Tiếp tục học” rõ trên trang chủ, kết hợp bài dở, câu đến hạn và chủ đề trong lộ trình; tránh chỉ thêm nhiều chức năng vào thanh điều hướng.
4. Trạng thái đồng bộ dễ hiểu: đã lưu trên máy, đang gửi, đã đồng bộ, cần gửi lại. Sau đó cân nhắc đồng bộ bookmark để học tiếp giữa web và điện thoại.
5. Kiểm duyệt chuyên môn: đánh dấu nguồn/chú giải thiếu, nút báo lỗi nội dung kèm mã mô hình/câu hỏi và quy trình duyệt trước khi xuất bản.
6. Trước khi phát hành rộng: hoàn thiện quy trình yêu cầu/xóa tài khoản, hỗ trợ người dùng và báo lỗi crash có thông báo quyền riêng tư phù hợp. Đây là bước riêng với phiên bản demo đồ án.

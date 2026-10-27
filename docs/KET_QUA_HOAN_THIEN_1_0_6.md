# Kết quả hoàn thiện Soma Mobile 1.0.6 — 26/10/2026

> Bản bàn giao cuối đã chuyển sang [1.0.7](KET_QUA_HOAN_THIEN_1_0_7.md), bổ sung giữ máy chủ HTTPS qua lần mở lại và API thử cấu hình sẵn. Các kết quả bên dưới là bằng chứng của giai đoạn 1.0.6.

## Đã hoàn tất

- Có hai trang điều khoản và chính sách bảo mật đọc được trong app, truy cập từ đăng ký, Cá nhân và Cài đặt. Kiểm tra mở rồi quay lại giữ nguyên thông tin đăng ký.
- Phiên bản Expo và phần thông tin trong app lấy từ `package.json`. APK mới là 1.0.6, Android versionCode 7.
- Sửa lỗi khôi phục API: APK preview giữ địa chỉ USB/LAN do người dùng lưu khi mở lại; phiên phát triển mới cập nhật LAN theo Metro. Bản production vẫn từ chối HTTP.
- Build production kiểm tra URL HTTPS và từ chối hostname mẫu, loopback, tunnel tạm. Script build tạo checksum cạnh APK.
- Có mẫu biến môi trường production cho app và backend; Docker loại mọi `.env*`, `.pem`, `.key` khỏi context. Theo lựa chọn của chủ dự án, chưa tạo hosting.
- Cập nhật QA API/native để dùng danh mục hiện tại thay cho giả định cũ chỉ có 5 mô hình hoặc 54 cấu trúc bàn tay.

## Bằng chứng mới

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript và lint app | Qua |
| Unit tests app | 13/13 qua |
| Giao diện web từ nguồn mới | Sáng/tối, Atlas tìm gan, 320/390 px, đọc tài liệu và quay lại giữ form, hiển thị 1.0.6; không lỗi runtime |
| Đăng ký/đăng nhập email qua UI | Qua; dùng tài khoản QA riêng và xóa sau kiểm thử |
| Luồng API với database thật | Qua: chấm server, gửi đồng thời chỉ ghi một lượt, xung đột UUID, phiên bản nội dung, tách tài khoản, lịch sử/hàng ôn, allowlist GLB và viewer không chứa token |
| APK cuối | Build thành công, chữ ký v2 hợp lệ; arm64-v8a và x86_64 |
| Gói ngoại tuyến trong APK | 280 tệp `.soma`: 149 cảnh, 128 buffer dùng chung và runtime/template/decoder |
| Native Android Emulator | 14 bước qua, gồm kiểm tra đúng APK bằng SHA-256, mở app, 3D Atlas, xoay bằng cảm ứng, lưu mô hình, bảng cấu trúc/thông tin, giữ API sau đóng tiến trình, hai route tài liệu, đăng nhập, giữ phiên SecureStore, khôi phục bài dở, nộp 10 câu và server ghi đúng một lượt 10/10 |

Native QA dùng `emulator-5556`, viewport 1080×2400, userdata QA riêng. Tài khoản QA được xóa, dữ liệu app trên máy ảo được dọn theo script; không chạy script xóa dữ liệu emulator trên điện thoại cá nhân. Một lần kiểm thử xoay ban đầu không nhận thao tác ngắn trên emulator; đã xác minh xoay thủ công và chạy lại với vuốt dài, vẫn yêu cầu pixel vùng mô hình thay đổi, sau đó toàn luồng qua.

## File bàn giao

- `builds/soma-1.0.6-preview.apk`: **164.298.622 byte**, khoảng **156,7 MiB**.
- `builds/soma-1.0.6-preview.apk.sha256`.
- SHA-256: `823c64f4b2c0f83eb96652b85b2a70cce3305082b7fddf4d28fcc4399843ac87`.
- APK ký bằng khóa debug để demo/kiểm thử; đây chưa phải bản phát hành cửa hàng.

Báo cáo máy đọc: `qa/completion-2026-10-26/apk-report.json`, `ui-1.0.6-report.json`, `api-flow-1.0.6.log`, `apk-signature.log`, và `qa/android/report.json`. Log build cuối: `qa/completion-2026-10-26/build-1.0.6-final.log`.

## Cài trên điện thoại và chia sẻ

Đã nhận đúng Redmi Note 15 Pro+ 5G trong Windows. ADB qua USB nhiều lần báo `connection closed` và `Input/output error`; chưa cài hoặc nghiệm thu APK thành công trên điện thoại đó. Sau khi người dùng chọn tải bằng link thay cho USB, đã tạo máy chủ chỉ phục vụ trang tải, APK và checksum bằng `scripts/share-apk.mjs`. Kiểm tra các đường API, `.env` và mã nguồn đều trả 404; kiểm tra tải tiếp bằng byte-range và chiều dài file đúng.

Link tải đã kiểm tra ngày 26/10: https://punk-emails-annually-rats.trycloudflare.com. URL này tạm thời, phụ thuộc máy tính và tiến trình chia sẻ đang chạy. Metadata tại `qa/completion-2026-10-26/download-connection.json`; QR tại `download-qr.png` trong cùng thư mục.

Phương án tunnel chia sẻ đồng thời backend mobile ban đầu bị duyệt tự động từ chối vì yêu cầu tải APK chưa bao gồm quyền đưa luồng API/dữ liệu qua Cloudflare. Link tải riêng đã được tạo và xác minh theo phạm vi hẹp hơn. Việc chia sẻ API qua Internet cần xác nhận riêng; gateway cục bộ đã qua kiểm tra chặn quản trị/tài liệu cá nhân và giữ xác thực.

## Phần còn phụ thuộc môi trường

- Nghiệm thu thực tế trên điện thoại vật lý chưa hoàn tất; không suy rộng kết quả emulator sang điện thoại.
- Hosting HTTPS cố định chưa được tạo theo lựa chọn của chủ dự án. Xem `docs/PHAT_HANH_1_0_6.md` và các file `.env.production.example`.
- Google/GitHub/Facebook thật chưa nghiệm thu; cần callback đã đăng ký và tài khoản provider. Không coi cờ “đã cấu hình” là bằng chứng đăng nhập thật thành công.

## Ưu tiên cải tiến

1. Đo thời gian mở app/cảnh lớn, FPS và bộ nhớ trên điện thoại tầm trung trước khi điều chỉnh chất lượng 3D. Tham khảo cách đo [khởi động](https://developer.android.com/topic/performance/issues/launch-time) và [khung hình](https://developer.android.com/topic/performance/issues/render) của Android.
2. Thêm hướng dẫn thao tác 3D lần đầu, có thể bỏ qua và mở lại: xoay, zoom, chọn, tách lớp và trở về góc nhìn ban đầu.
3. Làm rõ “đã lưu trên máy / đang gửi / đã đồng bộ / cần gửi lại”; sau đó cân nhắc đồng bộ bookmark giữa web và app.
4. Có quy trình báo lỗi và kiểm duyệt nội dung giải phẫu theo mã mô hình/câu hỏi, kèm nguồn và trạng thái nội dung thiếu.

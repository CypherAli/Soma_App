# Soma Mobile 1.0.7 — kết quả hoàn thiện

Lượt làm việc bắt đầu ngày 26/10, kiểm tra cuối hoàn tất ngày 27/10/2026. Bản 1.0.7 tiếp nối các thay đổi và kiểm thử của [1.0.6](KET_QUA_HOAN_THIEN_1_0_6.md).

## Thay đổi cuối cùng

- Giữ nguyên máy chủ HTTPS/tunnel do người dùng chọn khi mở lại APK. Việc tự đổi máy chủ theo phiên Metro chỉ diễn ra trong môi trường phát triển; cho phép HTTP của APK preview không còn bị hiểu nhầm là chế độ phát triển.
- Đóng gói sẵn API mobile tạm đã được chủ dự án cho phép. Cài mới không cần nhập API trước khi đăng nhập email.
- Android versionCode tăng lên 8, cùng giấy ký với 1.0.6 để hỗ trợ cập nhật giữ dữ liệu.
- Giữ các trang điều khoản/quyền riêng tư trong app, số phiên bản từ cấu hình, Atlas ngoại tuyến, bài làm dở và các thay đổi đã hoàn thiện ở 1.0.6.

## APK cuối

- File: `builds/soma-1.0.7-preview.apk`.
- Dung lượng: **164.299.406 byte**, khoảng **156,7 MiB**.
- SHA-256: `3873907709cf89150fc93a1e06e0b6830e79a4f227f47fd71c0a48eed5375aea`.
- Phiên bản 1.0.7, versionCode 8; arm64-v8a và x86_64; chữ ký v2 hợp lệ, khớp chứng thư của 1.0.6.
- Kiểm tra trong APK: đúng API được cho phép, đủ 280 asset `.soma` của gói ngoại tuyến.
- Đây là APK thử nghiệm ký bằng khóa debug, chưa phải bản phát hành cửa hàng.

## Kiểm tra

- App: 13/13 unit test qua, gồm HTTP/HTTPS và giữ lựa chọn máy chủ; TypeScript và lint qua.
- Bản 1.0.6 đã nghiệm thu toàn luồng 14 bước trên emulator, gồm 3D, giữ phiên, khôi phục bài dở và nộp 10 câu; server ghi đúng một lượt 10/10. Luồng học này không thay đổi trong 1.0.7.
- Qua API HTTPS công khai: đăng ký và đăng nhập email cùng danh tính; chấm server; chống ghi trùng khi nộp đồng thời; tách tài khoản; lịch sử/hàng ôn; tài nguyên 3D. Các tài khoản QA riêng đã được xóa.
- Gateway HTTPS giữ xác thực và giới hạn body/rate; quản trị, tài liệu cá nhân, file môi trường và các route web ngoài phạm vi app bị chặn. QA Internet dùng đúng route app `/mobile/due`, không mở thêm route web `/study/due`.
- APK 1.0.7 trên emulator: 5/5 kiểm tra mới qua — đúng SHA-256, API Internet cấu hình sẵn khi cài mới, giữ một URL HTTPS/tunnel khác với mặc định qua lần mở lại, đăng nhập email native qua Cloudflare, và khôi phục SecureStore sau đóng tiến trình qua chính API Internet. Tài khoản QA đã được xóa.

Máy ảo có hai hộp thoại ANR của System UI/Pixel Launcher đã được quan sát và xử lý trước lượt kiểm tra thành công. Không bỏ qua ANR của Soma hoặc sửa app để che lỗi môi trường. Một kiểm tra nhập liệu ban đầu cố đọc giá trị trường mật khẩu bị Android che; đã sửa harness để xác minh mật khẩu bằng đăng nhập thật và đúng danh tính.

Các báo cáo: `qa/completion-2026-10-26/apk-1.0.7-report.json`, `public-apk-1.0.7-report.json`, `apk-signature-1.0.7.log`, `build-1.0.7.log`, `internet-flow-1.0.6.log`; báo cáo 14 bước native trước đó tại `qa/android/report.json`.

## Kết nối thử đã được cho phép

Chủ dự án đã xác nhận cho phép chia sẻ API mobile tạm qua Cloudflare sau khi phương án chia sẻ đồng thời API ban đầu bị duyệt tự động từ chối. Bản chỉ tải APK được tạo trước; API được mở sau xác nhận riêng. Hai dịch vụ đều được kiểm tra theo đúng phạm vi.

- Trang tải: https://punk-emails-annually-rats.trycloudflare.com
- APK đã xác minh qua link: https://punk-emails-annually-rats.trycloudflare.com/soma-1.0.7-preview.apk
- API đã đóng gói: https://painted-suppose-bennett-fantasy.trycloudflare.com/api

Hai URL là tunnel tạm, phụ thuộc máy tính và tiến trình đang chạy; không phải hosting liên tục. Nếu cần đổi API, dùng Cá nhân → Cài đặt. Không nhúng khóa dịch vụ hoặc mật khẩu vào APK.

Link tải có byte-range và `If-Range`: nếu file đổi phiên bản, yêu cầu tiếp tục tải với ETag cũ trả toàn bộ file mới thay vì ghép các đoạn của hai APK khác nhau. Kiểm tra qua HTTPS đã xác nhận đúng độ dài, checksum, đầu ZIP và hành vi này.

Callback OAuth cũ đã được xác minh hết hạn và được tắt riêng trong tiến trình backend thử. Email vẫn hoạt động. Google/GitHub/Facebook thật cần hosting HTTPS/callback đã đăng ký và nghiệm thu bằng tài khoản provider; chưa tuyên bố đã hoàn thành bước này.

## Giới hạn và bước tiếp theo

ADB trên Redmi Note 15 Pro+ 5G liên tục lỗi truyền USB dù Windows nhận thiết bị và quyền đã bật. Theo lựa chọn của người dùng, chuyển sang tải bằng link; chưa có bằng chứng nghiệm thu tự động trên điện thoại vật lý. Hosting cố định được để ở mức chuẩn bị cấu hình theo yêu cầu, xem các file `.env.production.example`.

Ưu tiên cải tiến: đo độ mượt/thời gian tải trên điện thoại tầm trung; hướng dẫn thao tác 3D lần đầu; đồng bộ mô hình đã lưu giữa web/app; quy trình báo lỗi và kiểm duyệt nội dung có nguồn. Tham khảo đo [khởi động](https://developer.android.com/topic/performance/issues/launch-time) và [khung hình](https://developer.android.com/topic/performance/issues/render) của Android.

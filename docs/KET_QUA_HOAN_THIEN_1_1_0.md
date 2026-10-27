# Soma Mobile 1.1.0 — 27/10/2026

## Các thay đổi theo phản hồi

- Thay tách dạng lưới phẳng bằng dịch chuyển theo vị trí giải phẫu, giữ chiều sâu và kích thước thật của từng cấu trúc. Có chế độ tách toàn bộ hoặc chỉ cấu trúc đang chọn.
- Nút −/+ điều chỉnh 1%; giữ các mức đặt nhanh. Không ép về góc trước mỗi lần tách; đổi giao diện không làm mất vị trí camera. Nhãn giảm còn tối đa 12 và tránh chồng lên nhau.
- Nút góc nhìn dùng Noto Sans hỗ trợ tiếng Việt, chiều cao tối thiểu 48 và bố trí ba cột. Giấy phép phông đi kèm ứng dụng.
- Thêm nút sáng/tối và VI/EN tại đầu trang; lưu lựa chọn qua lần mở app sau. Có lựa chọn trong Cài đặt. Nội dung tài liệu nguồn giữ ngôn ngữ gốc; tên tiếng Anh có sẵn của mô hình/cấu trúc được dùng khi chọn EN.
- Màn Đề nguồn PDF lấy cùng nội dung đã xuất bản như web: 30 đề, 2.810 câu từ tài liệu đã cung cấp. Có hình, giải thích, trang nguồn, câu nhiều đáp án, luyện tập/quiz, bản nháp, lịch ôn đến hạn và gửi lại kết quả. Câu không có đáp án nguồn không được tính điểm.
- Hiển thị tài liệu cá nhân theo tài khoản, chỉ dùng câu đã duyệt. Không đóng tài liệu cá nhân vào APK. API kiểm tra quyền sở hữu trước khi đọc/chấm.
- Thêm trợ lý dùng chung API AI, tài liệu và hạn mức với web; có nguồn tham khảo mở rộng, gợi ý câu hỏi và ô nhập luôn ở cuối màn hình. Không tự gửi PDF cá nhân cho trợ lý.
- Nâng cấp từ API mặc định cũ sang mặc định mới; giữ nguyên địa chỉ máy chủ do người dùng chọn khác. Không chuyển phiên đăng nhập sang một origin khác.
- Gateway chỉ mở các route mobile cần thiết; CORS dành cho các origin Expo web local đã liệt kê, giữ xác thực, giới hạn body và chặn quản trị/tài liệu riêng qua các route chung.

## Kiểm tra

- App: typecheck, lint; 16 kiểm thử tự động đạt.
- Backend: build; 30 bộ kiểm thử, 191 kiểm thử đạt.
- API: số đề/câu, ảnh, chấm nhiều đáp án, không cho điểm một phần, chống nộp trùng, phiên bản nguồn cũ, hàng ôn và xác thực đã kiểm tra bằng tài khoản QA tạm.
- Trợ lý: đã nhận câu trả lời AI thật kèm nguồn, cả API và APK Android.
- Bốn cảnh bàn tay, sọ, tim và mặt cắt bụng: render, tách 1%, giữ hướng camera, đổi sáng/tối và khôi phục vị trí đã qua kiểm tra. APK có đủ 149 mô hình offline, 280 tài nguyên `.soma`.
- Luồng web đăng nhập → đề nguồn → tiếp tục bản nháp → mất phản hồi sau khi máy chủ ghi bài → gửi lại chỉ có một kết quả → chatbot có nguồn đã đạt.
- Giao diện web 320/390 px: sáng/tối, VI/EN, lưu qua tải lại, nút góc nhìn và ±1% đạt.
- APK Android: nâng cấp API, lưu giao diện/ngôn ngữ qua mở lại, đăng nhập email qua Internet, mở đề nguồn, chatbot có nguồn và các nút 3D đã qua máy ảo QA riêng. Chưa xác nhận trực tiếp trên Redmi của người dùng.

Các log, báo cáo và ảnh nằm trong `qa/learning-*`. Một lần máy ảo gặp ANR của System UI/Pixel Launcher đã được khôi phục; không ghi nhận đây là lỗi Soma.

## Phần cần cấu hình ngoài mã

Google còn cần thêm callback mới trong Google Cloud và kiểm tra đăng nhập thật. Xem [hướng dẫn Google](GOOGLE_MOBILE_1_1_0.md). Chưa tuyên bố luồng Google hoàn tất khi chưa thực hiện bước này.

Link tải thử: https://again-deeper-modification-sunset.trycloudflare.com/

API thử: https://friday-cement-institutional-assumes.trycloudflare.com/api

Các link Cloudflare tạm có thể hết hạn ngay cả khi máy tính còn chạy. Lần kiểm thử này đã phải thay hai tunnel hết hạn. Ưu tiên tiếp theo là hosting và tên miền cố định, rồi kiểm thử trên điện thoại thật trước khi ký bản phát hành chính thức.

## APK đã bàn giao

- Phiên bản: 1.1.0, versionCode 9; ký cùng chứng chỉ debug của bản trước, cài nâng cấp được.
- Dung lượng: 164932662 byte.
- SHA-256: `b41af03f8e00a132673d9f498dc98b3d4ed46054d5f6382cde5cf563502dc2ea`.
- Chữ ký v2, API nhúng, 280 tài nguyên offline, checksum bản cài và byte APK trên máy ảo đã xác minh.
- Link công khai đã kiểm tra HEAD, ETag, checksum và range 8 KB; đường dẫn API/tệp riêng trên máy chủ tải trả 404.
- Sửa bổ sung: lựa chọn Sáng/Tối trong Cài đặt đồng bộ ngay với nút toàn app, giữ đúng trạng thái sau mở lại.

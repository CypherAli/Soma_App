# Note giao diện Soma và cách mở demo

## Hướng thiết kế

Giữ trắng–đen và xanh trầm; chữ rõ, khoảng trắng vừa đủ, biểu tượng nét mảnh. Mô hình giải phẫu là nội dung chính. Bản laptop dùng cùng mã nguồn Expo, hiển thị trong khung điện thoại bằng trình duyệt; đây là bản xem trước web, không phải Android Emulator.

## Các lỗi đã chỉnh trong đợt 28/10/2026

- Trang Hôm nay: tiêu đề trang 26/32 px; tên mô hình 19/25 px thay cho 23/29 px. Tên tiếng Việt và tiếng Anh được xuống dòng đầy đủ, không giới hạn bằng dấu ba chấm.
- Ảnh giải phẫu có vùng riêng và giới hạn phóng đại, không vẽ đè lên tên hệ cơ quan, nhãn Atlas 3D hoặc tên mô hình.
- Nút mũi tên giữ kích thước 44 px; chữ còn đủ diện tích, không ép nút hoặc tràn khỏi thẻ.
- Góc nhìn trong bảng Tách & quan sát: sáu nút trong lưới ba cột, chữ 12/18 px, mỗi nhãn một dòng. Không còn hàng cuộn ngang làm nút cuối bị cắt một phần.
- Lỗi Unexpected text node của danh sách Atlas đã sửa: điều kiện tìm kiếm dùng giá trị boolean, không đưa chuỗi rỗng vào View.

Kiểm tra sau sửa: typecheck, lint và đóng gói Expo web đạt. 32 trường hợp bố cục đạt với VI/EN, sáng/tối, chiều rộng 320/360/390/414 px; không có lỗi console. Bài kiểm tra thẻ dùng mô hình Mặt cắt ngang bụng trong một catalogue QA giới hạn để tái hiện nội dung ảnh; không thay đổi catalogue hay tài khoản thật. Đây là kiểm tra hai phần vừa sửa, chưa phải kiểm định toàn bộ 149 ảnh và mọi màn hình.

## Những việc còn cần làm để giao diện chỉn chu hơn

1. **Thống nhất kiểu chữ toàn app.** Dùng một hệ cỡ chữ: tiêu đề trang 24–26, tiêu đề khối 18–20, nội dung 14–15, chú thích 11–12 px. Không thu nhỏ toàn bộ ứng dụng; chỉ giảm chữ ở những thành phần chật. Tên dài phải được đọc đầy đủ trong màn chi tiết.
2. **Rà soát từng màn ở 320, 360, 390 và 414 px.** Kiểm tra cả tiếng Việt, tiếng Anh, sáng và tối. Tiêu chí: không cuộn ngang ngoài ý muốn, không bị che chữ, nút chạm tối thiểu 44 px, nội dung dài có thể cuộn tới cuối.
3. **Đồng nhất hình thu nhỏ của 149 mô hình.** Chuẩn hóa tâm, khoảng trống và tỉ lệ từng ảnh; không dùng phóng đại chung để bù ảnh có nhiều viền trong suốt. Kiểm tra các mô hình dài như cột sống và chi trước khi đổi hệ số hàng loạt.
4. **Giảm mật độ bảng công cụ 3D.** Nhóm theo Tách, Góc nhìn và Mặt cắt; trạng thái đang chọn phải rõ. Giữ nút ±1% và bổ sung thanh kéo nếu cần thao tác nhanh, sau khi kiểm tra trên màn hình cảm ứng.
5. **Hoàn thiện trạng thái dữ liệu.** Màn tải, rỗng, mất mạng và lỗi cần cùng bố cục, thông báo ngắn, có hành động tiếp theo. Không để thông báo kỹ thuật che nút khi demo.
6. **Rà soát màu tối.** Dùng nền tối trung tính, phân biệt thẻ bằng sắc độ; kiểm tra độ tương phản của chữ phụ, đường viền và trạng thái vô hiệu hóa. Không chỉ đảo màu nền.
7. **Đánh giá lại bằng thao tác thật.** Đi hết Hôm nay → Atlas → chọn cấu trúc → tách/ẩn → ôn tập → kết quả → tài khoản. Kiểm tra với dữ liệu dài và trên Redmi khi có điều kiện; kiểm tra trình duyệt chưa thay thế được kiểm tra APK trên máy thật.

Các mục trên là danh sách tiếp tục hoàn thiện, không phải tuyên bố toàn bộ đã hoàn thành. Ngoài giao diện, trước phát hành còn cần hosting/tên miền cố định và xác nhận đăng nhập Facebook bằng tài khoản thật. GitHub trên bản laptop đã được người dùng xác nhận thành công.

## Cách mở trên laptop

1. Mở thư mục `Soma_App` và nhấp đúp **Mo Soma tren laptop.cmd**. Hoặc mở terminal tại thư mục đó rồi chạy `npm run desktop:preview`.
2. Chờ cửa sổ **Soma Mobile** mở. Nếu cửa sổ không tự xuất hiện, mở `http://localhost:8082` bằng Chrome hoặc Edge. Trên laptop, app tự hiển thị khung điện thoại.
3. Bấm **Toàn màn hình** dưới khung, hoặc F11. Khi bản cập nhật đã đóng gói, nhấn Ctrl+R trong cửa sổ Soma để tải lại.
4. Sáng/tối và ngôn ngữ: bấm biểu tượng thanh điều chỉnh ở đầu màn hình → **Hiển thị** → chọn **Sáng / Tối / Thiết bị**, **Tiếng Việt / English**. Trong Atlas, nút này ở góc phải thanh trên cùng.
5. Góc nhìn: mở một mô hình → **Tách** ở thanh dưới → **Góc nhìn**. Có thể cuộn bảng theo chiều dọc để xem các công cụ còn lại.

Giữ backend, cơ sở dữ liệu và gateway đang chạy khi cần đăng nhập/đồng bộ. Lệnh mở demo dùng lại các dịch vụ đã có, hoặc khởi động phần API local nếu cần. Không mở Android Emulator. Link localhost chỉ hoạt động trên laptop đang chạy các dịch vụ.

Sau khi sửa mã nguồn, chạy `npm run desktop:build` một lần rồi tải lại cửa sổ. Bản đóng gói không tự cập nhật theo mã nguồn như Metro. Xem thêm [hướng dẫn Expo laptop và đăng nhập](EXPO_TREN_LAPTOP.md).

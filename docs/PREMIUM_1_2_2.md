# Premium 1.2.2 — làm mới gói sau thanh toán

## Vấn đề và thay đổi

Màn Cá nhân/Hồ sơ chỉ tải membership khi nhận focus của router. Quay về từ ngân hàng hoặc cửa sổ thanh toán có thể giữ màn cũ. Trong bản laptop, app nằm trong iframe nên sự kiện focus của cửa sổ bên ngoài cũng cần được xử lý.

- Làm mới khi app trở lại foreground, trình duyệt có mạng lại hoặc khung laptop nhận focus; đồng bộ mỗi 10 giây khi đang xem tài khoản và app đang hiển thị. Dừng khi rời màn hoặc đưa app xuống nền.
- Thêm nút **Làm mới gói tài khoản**. Không suy đoán gói từ cache hoặc URL quay lại.
- Khoá lưu đơn phụ thuộc ID người dùng và API, tránh khởi động lại luồng checkout chỉ vì đối tượng hồ sơ được làm mới.
- API membership tự đối soát đơn chờ thuộc đúng người dùng/môi trường, kể cả khi không mở lại checkout. Chỉ cấp gói sau bằng chứng từ API SePay đã xác thực. Một đơn chỉ cộng hạn một lần; lỗi nhà cung cấp không làm mất khả năng xem gói hiện có. Phản hồi trạng thái dùng `private, no-store`.

Mô tả đơn mới là **PREMIUM**. QR cổng SePay giữ nội dung đối soát mà nhà cung cấp cấp cho đơn; mô tả không phải tham số thay nội dung chuyển khoản. Luồng webhook ngân hàng trực tiếp dùng `PREMIUM <mã đơn>`. Không thay QR/nội dung hiện có thành một chữ PREMIUM vì sẽ mất khả năng nhận đúng đơn.

## Kiểm chứng

- Backend: 215 kiểm thử, gồm khôi phục từ màn tài khoản không cần mở checkout, không đối soát đơn người khác và giữ gói hiện có khi SePay tạm lỗi; build và lint.
- App: lint, typecheck, 33 kiểm thử và kiểm tra các bản vá phụ thuộc.
- QA giao diện dùng tài khoản tạm/fixture thanh toán: quay về cửa sổ ngân hàng, focus khung điện thoại ngoài iframe, đồng bộ định kỳ không thao tác và nút làm mới; tiếp tục các ca sai tiền, khác người dùng/môi trường, giả thành công, lỗi mạng và gia hạn. Không chuyển tiền thật trong QA.
- Đơn thật đã trả trước đó vẫn có trạng thái paid/pro và 30 lượt; đọc lại không kéo dài hạn thêm. Không đặt plan thủ công.

Desktop đã đóng gói lại 1.2.2; APK mới có versionCode 12. Đây là bản preview nội bộ. Không coi QA web là kiểm thử thao tác native trên Redmi.

Tái lập: `npm run check`, `npm run desktop:build`, `npm run qa:premium`, `npm run android:build`; backend `npm test -- --runInBand`, `npm run lint`, `npm run build`.

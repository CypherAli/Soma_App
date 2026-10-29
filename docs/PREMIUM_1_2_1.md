# Soma Mobile 1.2.1 — kiểm chứng ngày 29/10/2026

## Luồng người dùng

Cá nhân hoặc Hồ sơ tài khoản → **Nâng cấp Premium**. Tài khoản Premium dùng **Gia hạn Premium**. Gói 25.000đ/tháng, 30 lượt hỏi/tháng; gói Thường 10 lượt. Nâng cấp giữ lượt đã dùng; không tự trừ tiền gia hạn. Tài khoản và gói dùng chung với web.

App tạo hoặc tiếp tục đơn đang chờ, hiển thị QR/thông tin ngân hàng và hỗ trợ mở checkout chính thức của SePay. Android dùng WebView riêng để POST form đã ký; web mở trang SePay bằng form. App không nhận Merchant Secret Key. Mã bí mật chỉ ở backend.

Đơn đang chờ lưu theo API + người dùng + Sandbox/Production; không dùng đơn của tài khoản hay môi trường khác. Đóng/mở lại app tiếp tục đơn cũ. App kiểm tra khi quay lại từ ứng dụng ngân hàng và định kỳ khi đang xem đơn. Chỉ trạng thái đơn từ API có xác thực mới kích hoạt thông báo thành công; `payment=success` trên URL không cấp gói.

Sandbox có cảnh báo không chuyển tiền và nút giả lập; Production không có nút này. QR/checkout giới hạn HTTPS và host nhà cung cấp phù hợp. Số tiền khác 25.000đ hoặc đơn sai môi trường bị từ chối. Gateway chỉ mở các route membership cần thiết, giữ xác thực và chặn route quản trị/tài liệu riêng/IPN. IPN dùng ingress riêng.

## Thanh toán thật và lỗi đã xử lý

Người dùng đã chuyển 25.000đ. API SePay Production xác nhận đơn `CAPTURED`, đúng mã đơn và VND nhưng trả danh sách giao dịch rỗng. Điều kiện cũ chỉ cho phép lịch sử rỗng ở Sandbox, khiến đơn local còn pending.

Đã sửa đối soát theo trạng thái thanh toán từ API SePay đã xác thực, bắt buộc đúng mã/tiền/tiền tệ và ID đơn nhà cung cấp. Nếu có lịch sử thì vẫn kiểm tra giao dịch được duyệt. Thêm phục hồi khi chủ đơn đọc trạng thái để không phụ thuộc duy nhất vào IPN. Có cache ngắn/coalescing để hạn chế gọi provider khi mở nhiều tab; transaction cấp gói chống cộng trùng.

Đơn thật đã được đối soát qua service này: **paid, Premium, 30 lượt còn lại**, hiệu lực đến **29/11/2026**. Đọc lại cùng đơn không cộng thêm hạn. Không sửa trường plan thủ công, không chuyển thêm tiền, không lưu mã ngân hàng/Secret Key hoặc danh tính người thanh toán trong báo cáo Git.

Tunnel IPN cũ bị Cloudflare thu hồi trong buổi thử. Đã đổi sang kết nối IPv4, kiểm tra thông báo TEST nhận 200 và route riêng trả 404; người dùng xác nhận đã cập nhật URL mới ở SePay Production. Link tunnel vẫn là tạm, cần laptop và các tiến trình đang chạy. Hosting cố định là hạng mục triển khai độc lập, không bắt buộc cho demo local.

## Bằng chứng

- App: 33 kiểm thử, lint và typecheck đạt; QA luồng Premium với fixture kiểm tra nâng cấp, phục hồi đơn, gia hạn, lỗi mạng, chống thành công giả, tách tài khoản/môi trường và VI/EN 320–414 px sáng/tối.
- QA desktop kiểm tra layout, Atlas, tài khoản, OAuth fixture, đề nguồn, nộp/tiếp tục/đồng bộ và chatbot. Danh tính fixture không thay thế consent thật; Redmi và Facebook thật đã được người dùng xác nhận riêng.
- Backend: 212 kiểm thử đạt, gồm 10 hồi quy đối soát; QA provider giả lập/DB thật xác minh chữ ký, phân quyền, sai tiền/tiền tệ/mã đơn/trạng thái, lỗi mạng và idempotency. Có thêm bằng chứng giao dịch Production thật nêu trên.
- Web: typecheck/lint, 98 unit test và production build đạt sau nâng Zod. BO: typecheck/lint, 16 unit test và build đạt.
- Offline: 149 cảnh, 128 checksum buffer và artwork khớp; viewer runtime khớp source.
- APK: `builds/soma-1.2.1-preview.apk`, package `vn.soma.mobile`, versionCode 11, arm64-v8a/x86_64, chữ ký v2 hợp lệ, checksum khớp. Đây là APK demo ký debug, không phải bản phát hành Google Play. Xác nhận Redmi trước đó không được tự coi là nghiệm thu mọi thay đổi của APK 1.2.1.
- Build Android dùng `npm ci` trong staging riêng theo hash lockfile, tránh trộn node_modules cũ sau khi Expo thay cách hoist package. Không cài hoặc khởi động Android Emulator.

Lệnh tái lập: `npm run check`, `npm run qa:premium`, `npm run qa:desktop`, `npm run verify:offline`, `npm run viewer:check`, `npm run audit:security`, `npm run android:build`.

## Phụ thuộc

Đã cập nhật Zod trên web/BO và body-parser/multer trên backend. App và backend có backport Deepmerge kèm kiểm thử; advisory thấp vẫn hiện do số phiên bản chưa đổi. Không gọi các kiểm thử guard là audit sạch. Báo cáo audit và log QA local ở `qa/production`/thư mục `tmp` ngoài Git; kiểm tra lại registry khi phát hành.

Các file `.env.sepay.local`, `.env.sepay.production.local` và bản sao Sandbox đều bị Git bỏ qua. Không chép chúng vào app, image gateway hoặc tài liệu bàn giao công khai.

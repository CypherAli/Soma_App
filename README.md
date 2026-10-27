# Soma Mobile

Ứng dụng học giải phẫu người: **Hôm nay · Atlas · Ôn tập · Cá nhân**. Expo SDK 57, React Native 0.86, TypeScript và Expo Router. Phiên bản app hiện tại: **1.2.0**.

## Mở demo trên laptop

Nhấp đúp **Mo Soma tren laptop.cmd**. Bản Expo web đã đóng gói mở trong khung điện thoại, có nút toàn màn hình và dùng ít tài nguyên hơn máy ảo. Không cần mở Android Emulator.

```powershell
npm ci
npm run desktop:build
npm run desktop:preview
```

Địa chỉ: `http://localhost:8082`. Gateway mobile: `http://127.0.0.1:8083/api`, chuyển tiếp tới backend local cổng 4000. Launcher dùng lại hoặc khởi động API local khi cần; backend cần được build và có PostgreSQL/cấu hình hợp lệ. Giữ dịch vụ chạy trong lúc demo. Sau khi cập nhật bản đóng gói, nhấn **Ctrl+R** trong cửa sổ Soma.

Trợ lý mobile dùng thêm API assistant của web đang chạy ở cổng 3000 (hoặc địa chỉ `MOBILE_WEB_URL` phía backend). Khi demo chatbot, cần giữ dịch vụ web này hoạt động; launcher app hiện khởi động API/gateway, không tự chạy toàn bộ web/BO.

Cài đặt sáng/tối và Việt/Anh nằm trong biểu tượng thanh điều chỉnh ở đầu màn hình. Các góc nhìn nằm trong **mô hình → Tách → Góc nhìn**.

Xem [hướng dẫn laptop và OAuth](docs/EXPO_TREN_LAPTOP.md), [note giao diện](docs/NOTE_GIAO_DIEN_VA_DEMO.md) và [báo cáo kiểm tra hiện tại](docs/AUDIT_2026_10_28.md).

## Chức năng

- **149 mô hình**: 147 cảnh Atlas BodyParts3D và 2 GLB, dữ liệu giải phẫu thật; tên Việt/Anh/Latin, nhóm, chú giải, nguồn và mốc bề mặt.
- Chọn cấu trúc, tách/gộp bằng hình học gốc, ±1%, cô lập, ẩn/làm mờ, sáu góc nhìn, nhãn và mặt cắt X/Y/Z. Giữ đủ diện tích quan sát, ảo hóa danh sách và chỉ render khi cần.
- Đăng ký/email, Google/GitHub/Facebook qua trình duyệt, PKCE và handoff một lần; sửa hồ sơ, ảnh đại diện, vai trò học tập, quản lý phiên và mật khẩu, tài khoản liên kết.
- Luyện tập theo mô hình/hệ cơ quan, đề nguồn PDF/Word đã xuất bản, nhiều đáp án, ôn câu đến hạn, lưu bài và tiếp tục, giải thích, chấm điểm phía máy chủ và gửi lại kết quả không ghi trùng.
- Lộ trình/lịch sử dùng chung backend với web; bản nháp và mô hình đã lưu được phân vùng theo tài khoản/máy chủ.
- Trợ lý giải phẫu có nguồn tham khảo, giao diện sáng/tối/theo thiết bị và Việt/Anh.

APK đóng gói hình học offline trên thiết bị. Bản Expo web trên laptop dùng API local để mở trình xem 3D; tài khoản, bộ đề nguồn, chatbot, chấm điểm và đồng bộ đều cần backend phù hợp. Không xem kết quả kiểm tra trình duyệt là bằng chứng đã kiểm tra APK trên Redmi.

## Kiểm tra và phát triển

Khuyến nghị Node 24. Clone riêng repo app đủ để chạy kiểm tra mã và export app; không cần repo web nằm bên cạnh.

```powershell
npm ci
npm run check
npm run verify:offline
npm run viewer:check
npm run export:android
npm run export:web
```

`check` gồm định dạng, lint, kiểm tra kiểu app/viewer, kiểm thử logic/API/giao thức/server preview và các guard phụ thuộc. CI GitHub chạy các bước này, kiểm tra dữ liệu offline và export Android/web. Khi sửa mã nguồn: `npm run format`. Khi sửa runtime 3D: `npm run viewer:build`, rồi commit cùng asset đã sinh lại.

QA tích hợp cần backend/cơ sở dữ liệu local và cấu hình OAuth:

```powershell
npm run qa:desktop
npm run qa:offline
```

Trên máy khác, cài trình duyệt QA bằng `npx playwright install chromium`, hoặc cấu hình `CHROME_PATH`. Báo cáo/ảnh ở `qa/` được bỏ qua trong Git. Để kiểm tra render đủ 149 mô hình, đặt `SOMA_QA_ALL_MODELS=1` trước khi chạy `qa:offline`. Tài khoản QA tạm được dọn sau bài kiểm tra; OAuth tự động dùng danh tính fixture.

Dùng Metro khi cần tự tải lại lúc sửa code: dừng đúng server preview 8082 rồi chạy `npm run desktop -- --open`. Quy trình Expo Go/điện thoại xem trong [hướng dẫn thiết bị](docs/EXPO_VA_MAY_CHU.md).

## Mã nguồn và dữ liệu

[Xem kiến trúc, trách nhiệm từng thư mục và quy trình QA](docs/ARCHITECTURE.md). Các route nằm ở `src/app`, thành phần theo tính năng ở `src/features`, transport/storage ở `src/core`, UI chung ở `src/ui`, runtime Three.js độc lập ở `viewer`.

Cập nhật danh mục từ web/backend là thao tác bảo trì riêng: `prepare:backend` và `prepare:offline` cần các repo nguồn `Soma_Fe`/`soma_be`. Sau khi thay đổi API/danh mục, đồng bộ schema và build/khởi động lại backend theo quy trình triển khai. Không tự chạy seed hoặc migration để mở demo.

## Android và triển khai

`npm run android:build` đóng APK preview trên Windows có Android SDK/JDK phù hợp; thư mục native do Expo tạo. Cấu hình API production theo [.env.production.example](.env.production.example), dùng HTTPS và callback đã đăng ký với nhà cung cấp. Không đặt khóa bí mật vào `EXPO_PUBLIC_*`, không commit keystore hay tệp `.env` thật.

Hosting/tên miền cố định, kiểm thử APK hiện tại trên Redmi và đăng nhập Facebook bằng consent thật vẫn là các điều kiện nghiệm thu riêng. `npm audit` chưa sạch; chi tiết advisory/guard và giới hạn xác minh được ghi trong báo cáo kiểm tra. GitHub đăng nhập thật trên laptop đã được người dùng xác nhận ngày 27/10/2026.

## Nguồn và giấy phép

Giữ [ATTRIBUTION.md](ATTRIBUTION.md), thông báo BodyParts3D/Z-Anatomy, SIL OFL của Noto Sans và giấy phép Three.js. Hình minh họa được dựng từ mô hình thật. Nội dung y khoa thiếu được ghi rõ; không bịa cấu trúc hay đáp án.

Các báo cáo `KET_QUA_HOAN_THIEN_*`, `KIEM_THU_*` và `PHAT_HANH_*` trong `docs/` là lịch sử từng phiên bản. Link tunnel trong báo cáo cũ có thể đã hết hạn; hướng dẫn hiện hành nằm ở các liên kết đầu trang.

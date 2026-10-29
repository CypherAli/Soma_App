# Kiểm tra mức độ hoàn thiện Soma Mobile — 26/10/2026

> Cập nhật sau lượt sửa: bản bàn giao cuối là APK 1.0.7, đã nghiệm thu luồng học và khôi phục phiên/API trên emulator. Xem [kết quả hoàn thiện 1.0.7](KET_QUA_HOAN_THIEN_1_0_7.md). Nội dung bên dưới giữ lại kết quả kiểm tra trước khi sửa.

## Kết luận

Soma_App 1.0.5 đã có các chức năng chính của MVP và vượt qua các kiểm tra mã nguồn, dữ liệu, giao diện trình duyệt và bundle Android trong lượt này. Chưa đủ bằng chứng để nghiệm thu bản Android cuối cùng hoặc coi là bản phát hành hoàn thiện: APK hiện có cũ hơn nguồn mới, chưa kiểm thử nguồn mới trên điện thoại Android vật lý, và đăng nhập mạng xã hội thật chưa được nghiệm thu.

Phạm vi kiểm tra chính là `Soma_App`, cùng backend `soma_be` phục vụ app. Không suy rộng kết quả này sang toàn bộ website, back office, độ chính xác y khoa hoặc khả năng chịu tải production. Không sửa mã chức năng của ứng dụng.

## Kết quả chạy mới

| Hạng mục | Kết quả | Giới hạn |
| --- | --- | --- |
| `npm run typecheck` | Qua | Bao gồm TypeScript của viewer |
| `npm run lint` | Qua | Không có lỗi/cảnh báo được xuất ra |
| `npm test` trong app | 12/12 qua | Các hàm OAuth, bài luyện, timeout/API và hợp đồng viewer |
| `npm run test:security` | Qua 3 kiểm tra bản vá phụ thuộc đã cài | Không phải một cuộc kiểm toán bảo mật đầy đủ |
| `npm run build` trong backend | Qua | Biên dịch backend hiện tại |
| Backend `npm test -- --runInBand` | 29/29 suite, 184/184 test qua khi chạy lại | Lượt đầu có 1 timeout OAuth lúc chạy đồng thời các tác vụ; suite OAuth riêng qua 7/7, sau đó toàn bộ suite qua với timeout mặc định |
| `npm run qa:offline` | Cấu hình và phạm vi buffer của 149 mô hình hợp lệ | Không render toàn bộ 149 mô hình ở lượt này |
| 3D khi tắt mạng trong Chrome | 7/7 cảnh đại diện mở, render, xoay và chọn được; không có HTTP request | Sọ, gan, tim, bàn tay, thận, hệ thính giác và tai đầy đủ; không đại diện cho hiệu năng Android thật |
| Xuất Android bằng Expo | Qua, tạo bundle Hermes khoảng 4 MB | Đây là bundle, chưa phải APK cài đặt hoặc bản ký phát hành |
| Xuất web bằng Expo | Qua | Xuất vào thư mục QA riêng |
| Giao diện từ bản web vừa xuất | Hôm nay, tìm gan trong Atlas, form email/mật khẩu; sáng/tối; Atlas không tràn ngang tại 320/390 px; không có lỗi JavaScript runtime | Không đăng nhập, gửi bài hoặc tạo dữ liệu người dùng trong lượt kiểm tra UI này |
| API đang chạy: `/api/health` | HTTP 200, DB up | Kiểm tra chỉ đọc trên localhost:4000 |
| API đang chạy: `/api/mobile/bootstrap` | HTTP 200; schema 2; 149 mô hình; 1.125 câu hỏi | Không kiểm tra từng đáp án về chuyên môn |
| API đang chạy: `/api/auth/mobile/capabilities` | HTTP 200; Google/GitHub/Facebook báo đã cấu hình | Cờ cấu hình không chứng minh đăng nhập tài khoản nhà cung cấp thật thành công |

## Những việc còn thiếu trước khi chốt hoàn thiện

### 1. APK đang có chưa chứa các thay đổi mới — ưu tiên cao

`builds/soma-1.0.5-preview.apk` có dung lượng 61.667.754 byte, được tạo ngày 23/10/2026 lúc 00:58 theo giờ Việt Nam. Trong khi đó `viewer/runtime.ts`, `assets/offline/runtime.soma`, `assets/offline/catalogue.json` và `src/core/offlineRegistry.ts` đã được sửa/tạo lại ngày 25/10.

Do vậy không thể dùng tên phiên bản 1.0.5 trong README để khẳng định APK hiện tại đã chứa gói ngoại tuyến và các sửa đổi mới. Cần build APK từ nguồn hiện tại, ghi SHA-256, cài lại và chạy kiểm thử toàn luồng trên chính file đó. Bundle Android vừa xuất thành công không thay thế bước này.

### 2. Cần nghiệm thu trên điện thoại Android thật — ưu tiên cao

Tài liệu `docs/KIEM_THU_EXPO_2026_10_25.md` chứng minh một số luồng Expo Go trên emulator; `docs/BAO_CAO_APP_SOMA.md` có toàn luồng APK của phiên bản cũ. Các bằng chứng này không xác nhận trải nghiệm của APK từ nguồn hiện tại trên điện thoại vật lý.

Cần xác minh: mở app và Back; đăng nhập và giữ phiên sau khi đóng tiến trình; mở nhiều mô hình, xoay/zoom/chọn/tách/cắt; mất mạng và mở lại; làm đủ 10 câu, khôi phục bài dở, gửi lại khi lỗi và lịch sử chỉ ghi một lượt; tạo lộ trình; đổi tài khoản không lộ bài dở/dữ liệu. Đo thời gian tải, độ mượt và bộ nhớ trên máy dùng demo.

### 3. Máy chủ và đăng nhập mạng xã hội cần nghiệm thu vận hành — ưu tiên cao nếu dùng ngoài máy phát triển

`app.config.ts` lấy địa chỉ API từ `EXPO_PUBLIC_API_URL`, mặc định là chuỗi rỗng. Bản web xuất trong lượt này mở được nội dung công khai nhưng hiện thông báo chưa cấu hình máy chủ. Bản production cần API HTTPS đã cấu hình; tài khoản và đồng bộ phụ thuộc vào backend.

API localhost hiện hoạt động và ba nhà cung cấp báo đã cấu hình. Tuy nhiên chưa thực hiện đăng nhập Google/GitHub/Facebook thật hoặc xác nhận dịch vụ HTTPS hoạt động liên tục trong lượt này. Báo cáo 25/10 cũng ghi các bước nghiệm thu đó còn thiếu. Cần kiểm tra callback thật của đúng môi trường Expo Go/APK và đúng domain trước khi coi những nút này đã hoàn tất.

### 4. Một số chi tiết giao diện chưa khép kín — ưu tiên vừa/thấp

- `src/screens/AuthScreen.tsx`: phần đăng ký yêu cầu đồng ý “Điều khoản sử dụng và Chính sách bảo mật”, nhưng đoạn chữ đó chưa có liên kết để mở và đọc nội dung. Nên bổ sung đường mở hai tài liệu trước khi cho người dùng bên ngoài đăng ký.
- `src/screens/PersonalScreens.tsx`: phần thông tin app vẫn ghi cố định “Soma Mobile 1.0”, trong khi `package.json`/Expo config là 1.0.5. Nên hiển thị phiên bản lấy từ cấu hình để tránh nhầm khi kiểm thử.

## Xử lý các giới hạn môi trường trong lượt kiểm tra

- Lượt xuất Android đầu tiên bị Hermes từ chối ghi `index.hbc` vào thư mục tạm của sandbox. Đổi `TEMP`/`TMP` sang thư mục QA trong workspace rồi chạy lại thành công; không kết luận đây là lỗi mã app.
- Sandbox chặn kết nối localhost bằng `EACCES`/`ERR_NETWORK_ACCESS_DENIED`. Kiểm tra API và UI đã chạy lại với quyền truy cập phù hợp và thành công.
- Thử mở backend thứ hai ở cổng 4000 gặp `EADDRINUSE` do đã có dịch vụ đang dùng cổng. Kiểm tra chỉ đọc dịch vụ đang chạy trả HTTP 200; không coi đây là lỗi khởi động của app và không dừng dịch vụ có sẵn.
- ADB không khởi động được daemon trong môi trường hiện tại. Không có lượt nghiệm thu native mới; không xóa dữ liệu hoặc thay đổi thiết bị người dùng.

## Bằng chứng lưu trong workspace

- `qa/offline/report.json`: kết quả dữ liệu 149 mô hình và 7 cảnh ngoại tuyến, tạo mới ngày 26/10.
- `qa/completion-2026-10-26/android-export.log` và `android-export/`: bundle Android mới.
- `qa/completion-2026-10-26/web-export.log` và `web-export/`: bản web mới.
- `qa/completion-2026-10-26/ui-report.json`, các PNG sáng/tối và `check-ui.cjs`: kiểm tra giao diện có thể chạy lại.

Để chốt MVP đồ án: ưu tiên APK mới và toàn luồng trên máy Android demo. Để phục vụ người dùng qua Internet: bổ sung nghiệm thu API HTTPS, OAuth thật và hoàn thiện các liên kết tài liệu trong giao diện. iOS, AI/chat và camera/cử chỉ nằm ngoài phạm vi mobile đã mô tả trong README; không coi việc chưa có chúng là lỗi của MVP này.

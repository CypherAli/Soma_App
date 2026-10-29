# Soma 1.2.0 — 27/10/2026

**Cập nhật tối 27/10:** hai tunnel Cloudflare bên dưới đã hết hạn (`Tunnel not found`, DNS không còn phân giải). Các kết quả tải công khai ghi trong báo cáo là tại thời điểm bàn giao trước đó. Bản [Expo trên laptop](EXPO_TREN_LAPTOP.md) nay dùng API nội bộ và không cần tunnel; hosting cố định cho APK trên điện thoại vẫn chưa được triển khai.

## Thay đổi theo phản hồi

- Giao diện trắng/đen, điểm nhấn xanh trầm; bỏ emoji sáng/tối và khối VI trên thanh đầu. Một nút tùy chọn mở bảng chọn Theo thiết bị/Sáng/Tối và Việt/Anh; lưu lựa chọn.
- Sáu nút góc nhìn nằm trên hàng cuộn ngang, nhãn một dòng, không chia ba cột hẹp. Giữ điều chỉnh mức tách −/+ 1% và chế độ tách cấu trúc đang chọn.
- Hồ sơ đồng bộ với web: tên, email, ảnh đại diện, vai trò học tập, ngày tham gia, loại tài khoản và hạn mức trợ lý. Ảnh chọn qua trình chọn hệ thống, cắt vuông/thu nhỏ trước khi lưu.
- Thêm đổi mật khẩu, xem thiết bị đăng nhập, thu hồi phiên khác; giữ phiên hiện tại sau đổi mật khẩu. Vai trò học tập không thay đổi quyền quản trị.
- Thêm trạng thái Google/GitHub/Facebook của chính tài khoản, liên kết và gỡ liên kết. Liên kết mobile xác thực chủ tài khoản, mã một lần kèm PKCE; không đặt token phiên trong URL.
- Bỏ “Dr Lâm” khỏi nhãn đề/tên tài liệu hiển thị trên web và mobile, kể cả tên đã lưu trong bản nháp. Giữ mã đề, câu hỏi, nguồn gốc tài liệu và tiến độ cũ.

## Kiểm tra đã đạt

- Mobile: typecheck, lint, 17 kiểm thử tự động.
- Backend: build, 31 bộ/196 kiểm thử; thêm kiểm tra liên kết đúng chủ tài khoản.
- Web: production build 708 trang; kiểm thử chuẩn hóa nhãn và kiểm tra trang thư viện đề thật trên trình duyệt.
- API tài khoản: 7 nhóm kiểm tra về hồ sơ, hạn mức, quyền, ảnh, phiên, đổi mật khẩu, liên kết và tài liệu riêng.
- Giao diện web mobile: 9 nhóm kiểm tra, gồm chọn/cập nhật ảnh, đổi mật khẩu, kết nối, đề nguồn và nhãn góc nhìn ở 320/390px.
- APK: 1.2.0/versionCode 10; 280 tài nguyên offline; chữ ký giống bản trước; không yêu cầu camera/microphone. Checksum APK đã cài trên máy giả lập khớp file build.
- Android QA: lưu chế độ tối/tiếng Anh qua mở lại, đăng nhập email, sửa vai trò học tập, chọn/cắt/thu nhỏ/lưu ảnh đại diện, trạng thái liên kết, thiết bị hiện tại và nhãn đề nguồn đã đạt. Tài khoản thử được dọn sau kiểm tra.
- Góc nhìn và ±1% trên Android đạt ở cỡ chữ hệ thống 130%; nhãn hiển thị một dòng. Bài kiểm tra đầu bị gián đoạn do đổi cỡ chữ khiến Android khởi tạo lại Activity; chạy lại sau khi khởi tạo xong đạt. Một ANR của System UI/Pixel Launcher trên máy giả lập đã được khôi phục; nhật ký crash ứng dụng trống trong lần kiểm tra này.

## Trạng thái đăng nhập bên ngoài

Google, GitHub và Facebook đã có cấu hình. GitHub mở trang “Sign in to GitHub to continue to Soma”, Facebook mở trang đăng nhập; chưa quan sát đăng nhập tài khoản thật rồi callback hoàn tất. Không coi bước mở trang là bằng chứng hoàn tất toàn bộ luồng. Trạng thái liên kết trong app dựa trên tài khoản hiện tại.

Callback dùng API thử: `https://friday-cement-institutional-assumes.trycloudflare.com/api/auth/oauth/{google|github|facebook}/callback`. Cần hostname cố định trước phát hành chính thức.

## Bản cài thử

- File: `builds/soma-1.2.0-preview.apk` (165443008 byte).
- SHA-256: `b1005c9464c482320ac96d5780440a940346e1573a4f33d8ae65fe5406d8f204`.
- Chứng chỉ debug SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- API và tải APK dùng tunnel Cloudflare tạm được người dùng cho phép; cần máy tính chia sẻ tiếp tục chạy. Chưa kiểm tra trực tiếp trên Redmi của người dùng.
- Trang tải bản mới: https://again-deeper-modification-sunset.trycloudflare.com/ . Tên file phiên bản: `soma-1.2.0-preview.apk`.
- Link công khai đã qua kiểm tra HEAD, kích thước, ETag/checksum và 8 KB tải từng phần. Đường dẫn API, `.env` và bản APK cũ trên máy chủ tải trả 404. Báo cáo: `qa/polish/release.json`.

Máy giả lập và Expo web QA đã dừng sau kiểm tra. API, gateway mobile, web phục vụ trợ lý, máy chủ tải APK và hai tunnel tiếp tục chạy để dùng bản thử.

Log/báo cáo/ảnh QA: `qa/polish/`.

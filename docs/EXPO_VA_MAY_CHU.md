# Soma trên Expo Go và máy chủ Internet

## Màn hình xanh khi quét QR và không mở được địa chỉ LAN

`npx expo install` chỉ cài/căn chỉnh thư viện; cần lệnh chạy máy chủ riêng. Nếu Chrome trên điện thoại không mở được `http://<IP-WIFI>:8081/status`, điện thoại chưa tới được Metro. Quét lại mã LAN không giải quyết được đường kết nối đó.

Sau khi chủ máy đồng ý chuyển tiếp kết nối qua Cloudflare, có thể dùng:

```powershell
# Terminal 1: backend và phiên LAN
npm start
# Terminal 2: phiên Expo qua Internet
npm run dev:public
```

Phiên public dùng cổng nội bộ 8090 và Cloudflare Quick Tunnel qua HTTPS. Manifest, JS/asset và API di động dùng cùng hostname công khai; không trỏ API về LAN của máy tính. Proxy tái sử dụng allowlist, giới hạn body và rate limit của `share-preview.mjs`; không chuyển tiếp API quản trị hoặc tài liệu cá nhân. Đã kiểm tra cục bộ 149 mô hình, POST đăng nhập và các đường dẫn bị chặn.

Script chỉ xuất QR khi tunnel đã đăng ký kết nối và manifest cục bộ đã trỏ asset/API về đúng hostname HTTPS. QR PNG nằm tại `qa/expo/connect-qr.png`; URL hiện tại nằm trong `qa/expo/public-connection.json`. Expo Go dùng URL `exps://...`. Giữ cả hai terminal mở. Mỗi lần tạo tunnel mới thường đổi hostname và cần quét QR mới. Đây là kết nối phát triển tạm thời, chưa thay thế hosting 24/7.

## Chạy Expo trên điện thoại

`npm run dev` trong `Soma_App` tự chọn IPv4 của Wi-Fi, khởi động backend nếu chưa chạy, kiểm tra PostgreSQL rồi chạy Metro bằng LAN tại cổng 8081. Quét QR bằng Expo Go SDK 57 trên điện thoại cùng Wi-Fi. Backend và Metro đều phải truy cập được từ điện thoại.

`npm start` hiện chạy cùng quy trình đầy đủ. `npm run start:expo` chỉ chạy Metro khi bạn chủ động quản lý backend riêng. Metro giới hạn hai worker; bundle cho downloader multipart được trả thành JavaScript không nén có Content-Length để tránh lỗi `ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd` đã quan sát trên Expo Go Android. Đây chỉ là cấu hình máy chủ phát triển, không thay đổi mã ứng dụng trong APK.

Nếu backend đã chạy riêng, cần khởi động lại nó với `MOBILE_OAUTH_RETURN_URLS` chứa đúng đường dẫn `exp://<IP-WIFI>:8081/--/oauth` được in trong terminal. Biến `SOMA_LAN_HOST` cho phép chỉ định đúng card mạng khi máy có nhiều mạng/VPN. `EXPO_PUBLIC_API_URL` cho phép dùng một API HTTPS đã triển khai.

Không dùng `localhost`, `127.0.0.1` hoặc `10.0.2.2` làm API cho điện thoại thật. Không tự đổi hostname Expo Tunnel thành cổng 4000: tunnel Metro chỉ phục vụ Expo, không mở backend. Các URL Cloudflare Quick Tunnel cũ sẽ được thay bằng API của phiên mới khi mở app.

Chuẩn bị nguồn sau khi cập nhật dữ liệu:

```powershell
# Trong soma_be
npx prisma generate
npx prisma migrate deploy
npm run build
# Trong Soma_App
npm run prepare:backend
npm run prepare:offline
npm run dev
```

Windows có thể chặn executable schema-engine của Prisma bằng Application Control. Trên DB phát triển, `node scripts/apply-expo-return-migration.cjs` trong `soma_be` áp dụng riêng migration bổ sung callback Expo, có transaction và lịch sử/checksum tương ứng. Production vẫn dùng `prisma migrate deploy` trong container Linux.

## Dữ liệu trên thiết bị

Gói `assets/offline` chứa 149 mô hình, 1.125 câu hỏi và ảnh xem trước từ dữ liệu công khai cùng nguồn với web. 128 buffer hình học dùng chung có tổng dung lượng khoảng 97 MB cùng cấu hình, trước nén APK. Chỉ đọc buffer của cảnh đang mở, không tải toàn bộ vào bộ nhớ. Mỗi cảnh chỉ giữ các đỉnh/chỉ số cần dùng. Giữ ghi công theo `ATTRIBUTION.md`.

`npm run prepare:thumbnails` dựng PNG nền trong suốt từ cả 149 cảnh và tính tỷ lệ hiển thị dựa trên vùng hình học, tránh khung nền đen và ảnh quá nhỏ. Đây là ảnh dựng từ hình học có thật, không dùng ảnh giải phẫu sinh bằng AI.

Expo Go lần đầu vẫn cần lấy JS và các asset đang dùng từ Metro. Các asset được cache trên thiết bị sau đó. Một APK mới đóng gói toàn bộ asset, nên có thể mở Atlas không cần backend; chưa tạo APK mới trong lượt sửa này. Trang chủ dùng ảnh sẵn có, không mở thêm WebView 3D.

Backend tiếp tục cung cấp tài khoản, lịch sử, chấm điểm và đồng bộ. Có trạng thái báo lỗi sau thời hạn; thông báo mất backend không có nghĩa dữ liệu Atlas trên thiết bị bị mất.

## Đăng nhập Google, GitHub, Facebook

Nhà cung cấp trả về HTTPS của backend trước; backend chuyển về Expo Go hoặc app bằng mã dùng một lần, kiểm tra PKCE/state. Không đưa token phiên lên URL. `MOBILE_OAUTH_RETURN_URLS` cho phép rõ từng callback Expo; `soma://oauth` luôn dành cho app cài độc lập.

Để Google hoạt động qua Internet:

1. Có API HTTPS cố định chạy liên tục, ví dụ tên miền của dịch vụ Railway.
2. Đặt `MOBILE_OAUTH_API_URL=https://<API-HOST>/api` trên backend; đặt `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` trong biến môi trường bí mật của dịch vụ.
3. Đăng ký chính xác `https://<API-HOST>/api/auth/oauth/google/callback` trong OAuth client loại Web của Google. GitHub/Facebook dùng cùng mẫu, thay tên nhà cung cấp.
4. Đặt `EXPO_PUBLIC_API_URL` bằng API đó khi khởi động Expo. Đăng ký đường dẫn Expo Go hiện tại trong `MOBILE_OAUTH_RETURN_URLS`. Với bản app độc lập dùng `soma://oauth`.
5. Thử bằng tài khoản Google thật, xác nhận mở lại đúng Expo project và cùng tài khoản Soma; kiểm thử tự động dùng phản hồi provider giả lập không thay thế bước này.

Tài liệu: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo WebBrowser](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/), [callback Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

## Triển khai liên tục

Đã có `soma_be/railway.json` dùng Dockerfile, kiểm tra `/api/health` và khởi động lại khi lỗi. Healthcheck trả HTTP 503 nếu PostgreSQL không sẵn sàng. Chọn thư mục gốc dịch vụ là `soma_be`; thêm PostgreSQL và biến `DATABASE_URL`. Dockerfile áp migration trước khi mở cổng.

Máy chủ cần được kết nối qua tài khoản hosting trước khi có thể tạo dịch vụ và domain thật. File cấu hình và kiểm thử cục bộ không có nghĩa đã triển khai. Chọn cấu hình hosting không tự ngủ nếu cần dùng liên tục; kiểm tra chi phí trong tài khoản trước khi tạo tài nguyên tính phí.

Không đưa `.env` hoặc database cá nhân vào repository. Dùng biến bí mật của dịch vụ; tạo DB riêng và migration cho môi trường triển khai. Với bản sửa nội dung/GLB qua CMS sau này, cần lưu nội dung tải lên trên storage bền vững.

## Kiểm thử

`npm run typecheck`, `npm run lint`, `npm test`, `npm run qa:offline`. Kiểm thử ngoại tuyến kiểm tra phạm vi hình học của cả 149 cảnh và render/xoay/chọn 7 cảnh đại diện với mạng bị tắt. Báo cáo tại `qa/offline/report.json`; không suy rộng thời gian trên máy tính sang mọi điện thoại.

`node scripts/qa-auth-web.cjs` tạo/xóa đúng tài khoản thử trong PostgreSQL phát triển, kiểm tra đăng ký, đăng nhập email, điều khoản và giao diện sáng/tối ở bề ngang 320/390. Backend có test callback Expo Go, PKCE dùng một lần, allowlist và readiness khi DB lỗi.

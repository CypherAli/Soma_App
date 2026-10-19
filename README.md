# Soma Mobile

Ứng dụng học giải phẫu người, ưu tiên Android. Bốn mục chính: **Hôm nay · Atlas · Ôn tập · Cá nhân**. Không có mục Tra cứu độc lập; tìm mô hình và cấu trúc nằm trong Atlas.

Bản 1.0.3 bổ sung Google, GitHub và Facebook bằng trình duyệt hệ thống, cùng nhập lại mật khẩu và xác nhận điều khoản khi đăng ký. OAuth cần đăng ký callback HTTPS trong console nhà cung cấp; hướng dẫn và giới hạn nghiệm thu nằm trong [báo cáo 1.0.3](docs/APP_ANDROID_1_0_3.md). App dùng cùng tài khoản và dữ liệu học với web, với mã handoff một lần và PKCE; không đưa token phiên vào deep link.

Màn Atlas giữ khung 3D lớn, thanh công cụ gọn và bảng thông tin mở khi cần. Hai bàn tay được xếp gần nhau trong trình xem; hình học, tên cấu trúc và dữ liệu y khoa gốc được giữ nguyên. Giảm giới hạn mật độ điểm ảnh 3D, tắt MSAA, dùng danh sách cấu trúc ảo hóa và tránh dựng lại WebView khi thao tác các bảng. Cấu hình API trong Expo manifest được ưu tiên để tránh dùng lại giá trị biến môi trường từ cache bundle cũ.

## Chức năng

- Atlas có năm mô hình thật: xương bàn tay, tim, phổi, gan, thân não và dây sọ. Xoay, phóng to, chạm chọn cấu trúc, tìm chú giải, ẩn/hiện nhóm và đặt lại góc nhìn. Bàn tay có lựa chọn trái/phải/hai bên.
- Đăng ký, đăng nhập, quên mật khẩu, sửa tên và đăng xuất qua backend hiện có của web.
- Luyện tập 10/20 câu, chọn chủ đề hoặc mô hình, ôn câu đến hạn và làm lại câu sai. Nếu chủ đề không đủ câu thì dùng đúng số câu có sẵn. Kho ban đầu có 51 câu dẫn xuất từ chú giải của năm mô hình; không sinh câu hỏi AI.
- Bài đang làm được lưu trên thiết bị theo từng tài khoản. Kết quả hoàn chỉnh được máy chủ chấm, tự gửi một lần khi mở màn kết quả; có nút gửi lại khi lỗi kết nối. UUID chống ghi trùng cả khi hai yêu cầu gửi đồng thời.
- Lộ trình, lịch sử và mã câu ôn dùng chung với web. Mô hình đã lưu chỉ có trên thiết bị. Hỗ trợ giao diện sáng/tối và cỡ màn hình nhỏ.

## Cấu trúc

`src/app` chứa route Expo Router; `src/screens` chứa giao diện; `src/core` quản lý phiên, API, bản nháp và dữ liệu; `viewer` chứa trình xem Three.js được chạy trong WebView. Chỉ phần đồ họa 3D dùng WebView; các màn hình và điều hướng là React Native.

Nội dung lấy từ `soma_be` thông qua bản xuất bản CMS hiện có. `Soma_Fe/src/lib/anatomy/layers.ts` là nguồn duy nhất cho màu và nhóm giải phẫu. Script chuẩn bị tài nguyên sử dụng trực tiếp nguồn này và năm tệp GLB của web, không sao chép bảng quy tắc sang app.

## Chạy phát triển

Yêu cầu Node 22.13 trở lên, npm, backend và PostgreSQL đã cấu hình. Chạy ở thư mục `Soma_App`:

```powershell
npm ci
npm run prepare:backend
```

Trong `soma_be`, sinh Prisma, áp dụng migration và khởi động API:

```powershell
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod
```

Chạy app:

```powershell
npm start
```

Có thể mở bằng Expo Go đúng SDK 57 hoặc bản development build. Native module không có trong Expo Go cần development build. Mã native do Expo tạo; không sửa trực tiếp `android/` hoặc `ios/`.

## Cấu hình API

API cần kết thúc bằng `/api`. App có **Cá nhân → Cài đặt → Địa chỉ API**. Đổi máy chủ sẽ xóa phiên đăng nhập trên thiết bị và chuyển sang vùng dữ liệu riêng của máy chủ đó.

| Trường hợp | Ví dụ |
|---|---|
| Android Emulator | `http://10.0.2.2:4000/api` |
| Điện thoại cùng Wi-Fi với máy tính | `http://<IP-LAN-của-máy-tính>:4000/api` |
| Máy chủ triển khai | `https://<tên-miền>/api` |

Backend phải cho phép kết nối từ điện thoại và cổng tương ứng phải được mở trong tường lửa. `localhost` trên điện thoại chỉ chính điện thoại đó. Bản phát triển/bản APK preview cho phép HTTP để demo nội bộ. Bản production yêu cầu HTTPS. Không nhúng khóa dịch vụ hoặc mật khẩu vào biến `EXPO_PUBLIC_*`.

Có thể đặt API mặc định lúc build:

```powershell
$env:EXPO_PUBLIC_API_URL='https://<tên-miền>/api'
```

Không có API mặc định trong bản production thì người dùng cần cấu hình máy chủ trước khi tải nội dung.

## Tạo APK trên Windows

Cần Android SDK với API 36, Build Tools 36, NDK 27.1.12297006 và JDK 17. Đặt `JAVA_HOME`, `ANDROID_HOME` nếu không dùng vị trí tiêu chuẩn. Lần đầu cần mạng để tải phụ thuộc Gradle.

```powershell
npm run android:build
```

Script sao chép nguồn sang thư mục tạm ASCII để hỗ trợ đường dẫn dự án có dấu. Chỉ sao chép, không xóa dữ liệu của checkout và tái sử dụng cache build ở lần tiếp theo. Script tải CMake 3.31.6 và Ninja 1.13.2 chính thức, kiểm tra SHA-256 và cấu hình riêng cho lần build; không thay các bản đang cài trong Android SDK. Cách cấu hình công cụ ngoài SDK có trong [tài liệu Android](https://developer.android.com/studio/projects/install-ndk), cùng [hướng dẫn Windows của Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/). Kết quả hiện tại nằm ở `builds/soma-1.0.3-preview.apk`, hỗ trợ arm64-v8a và x86_64. Tên file lấy phiên bản từ `package.json`. Cài APK để chạy độc lập, không cần Metro.

## Chia sẻ để thử qua Internet

`node scripts/share-preview.mjs` mở gateway tại **127.0.0.1:8083**, chỉ phục vụ trang tải, APK và các route mobile/auth/study cần thiết. Không mở toàn bộ thư mục dự án, Swagger, tài liệu cá nhân hoặc API quản trị. `node scripts/qa-share.mjs` kiểm tra giới hạn route và xác thực. Backend vẫn cần chạy ở cổng 4000.

Sau khi người dùng đồng ý dịch vụ chia sẻ, có thể dùng [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) để chia sẻ gateway. Đặt `EXPO_PUBLIC_API_URL` bằng URL HTTPS của tunnel cộng `/api` **trước khi build APK** để điện thoại dùng mạng khác không phải nhập địa chỉ LAN. Tunnel thử nghiệm chỉ hoạt động khi tiến trình đang chạy; khởi động tunnel mới thường đổi hostname và cần cập nhật địa chỉ API trong Cài đặt hoặc build lại. Đây chưa phải máy chủ production hoạt động liên tục.

Bản APK này dùng khóa debug do mẫu Expo tạo và phục vụ kiểm thử/demo đồ án. Phát hành lên cửa hàng cần cấu hình khóa ký riêng và bản production; chưa có thao tác phát hành trong dự án này. Có sẵn `eas.json` cho preview APK và production AAB. Cấu hình tài khoản EAS/khóa ký trước khi dùng bản cloud.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Kiểm thử đồ họa/giao diện cần Chrome và Playwright trong môi trường QA (hoặc đặt `PLAYWRIGHT_MODULE`, `CHROME_PATH`). Backend chạy ở cổng 4000. Xuất bản xem trước rồi mở máy chủ tĩnh ở cổng 8082:

```powershell
$env:SOMA_ALLOW_HTTP='1'
npm run export:web
node scripts/serve-preview.mjs
```

Trong terminal khác:

```powershell
npm run qa:viewer
npm run qa:web
```

Đặt `MOBILE_QA_RETRY=1` khi chạy QA web để giả lập lần gửi kết quả đầu tiên trả 503, xác minh bản nháp còn nguyên và lần gửi lại dùng cùng payload/UUID.

`npm run qa:android` kiểm tra APK đã cài trên `emulator-5554`: WebView 3D, xoay/chọn bên, đăng nhập native, SecureStore và bản nháp sau khi tắt tiến trình, làm 10 câu và lịch sử trên server. Bài test này chỉ cho phép emulator, tạo/xóa đúng tài khoản thử và xóa dữ liệu của gói `vn.soma.mobile` trên emulator cả trước và sau lượt chạy để có trạng thái đầu xác định. Đặt `ANDROID_QA_DEVICE` nếu emulator dùng serial khác. Chờ Android khởi động xong trước khi chạy.

Ảnh và báo cáo từng bước nằm ở `qa/android/`; báo cáo lỗi cũng ghi rõ các bước đã qua. Kiểm tra xoay so sánh pixel trong vùng WebView, không dùng đồng hồ/status bar làm bằng chứng. Nếu emulator có hộp thoại System UI không phản hồi hoặc chụp ra ảnh đen, cần xử lý môi trường trước khi ghi nhận kết quả. Trên máy kiểm thử hiện tại, cold boot với `-gpu swiftshader -feature -Vulkan` cho ảnh đúng; `-gpu host` gặp lỗi OpenGL. Các script QA dùng `pngjs` có sẵn qua Expo CLI trong lockfile để đọc ảnh PNG.

QA web dùng cơ sở dữ liệu trong `soma_be/.env`, tạo tài khoản `@example.invalid` riêng và xóa đúng các tài khoản vừa tạo khi kết thúc. Dùng cơ sở dữ liệu phát triển. Không chạy các bài kiểm thử tạo dữ liệu trên production. Backend còn có `node scripts/qa-mobile.mjs` để kiểm tra chấm điểm, gửi đồng thời, lịch sử, câu đến hạn và giới hạn tài nguyên.

## Dữ liệu và phạm vi

Token Android được giữ trong SecureStore; bản xem trình duyệt chỉ giữ phiên trong bộ nhớ tab. Mật khẩu không được lưu trong app. Bản nháp và danh sách đã lưu tách theo địa chỉ máy chủ và tài khoản; đăng xuất không tự gộp sang tài khoản khác. Nội dung công khai có bộ nhớ đệm; không cam kết sử dụng 3D hoặc đồng bộ hoàn chỉnh khi ngoại tuyến.

Mô hình và ảnh dựng có giấy phép, ghi công riêng trong [ATTRIBUTION.md](./ATTRIBUTION.md). Chưa gồm iOS được kiểm thử, AI/chat, camera/cử chỉ, thú y, biên soạn tài liệu và quản trị. Chưa xác nhận hiệu năng trên điện thoại vật lý; kết quả emulator không đại diện cho mọi thiết bị.

# Railway và nghiệm thu phát hành

## Trạng thái ngày 28/10/2026

Đã chuẩn bị cấu hình cổng mobile và kiểm thử HTTP thực tế. **Chưa có deployment/domain Railway thực**: plugin vẫn báo chưa cài/kết nối tại thời điểm lập tài liệu. Các tên host bên dưới là mẫu cần thay bằng giá trị của dịch vụ thật; không phải link đang hoạt động.

Giữ bản demo laptop Expo đóng gói trong khung điện thoại. Không cần Android Emulator để triển khai, build APK hoặc trình diễn.

## Dịch vụ và cấu hình

Tạo trong cùng project/environment: PostgreSQL, backend NestJS, web Next.js cung cấp dịch vụ trợ lý, cổng mobile. Backend và PostgreSQL dùng mạng nội bộ. Cổng mobile là địa chỉ API công khai. Không mở public networking trực tiếp cho backend chỉ để phục vụ mobile, vì backend còn có API quản trị/tài liệu ngoài phạm vi gateway.

| Dịch vụ | Nguồn/cấu hình | Giá trị cần thiết |
|---|---|---|
| PostgreSQL | Database của Railway | Lấy `DATABASE_URL` từ tham chiếu dịch vụ, không dùng mật khẩu demo trong compose |
| Backend | Repo `soma_be`, `railway.json` và `Dockerfile` hiện có | `DATABASE_URL`, `PORT=4000`, `NODE_ENV=production`, `API_URL=https://MOBILE_HOST/api`, `MOBILE_OAUTH_API_URL=https://MOBILE_HOST/api` |
| Backend → trợ lý | Backend gọi dịch vụ Next.js | `MOBILE_WEB_URL=http://WEB_PRIVATE_HOST:3000` |
| Web/trợ lý | Repo `Soma_Fe`, Dockerfile hiện có | `API_INTERNAL_URL=http://BACKEND_PRIVATE_HOST:4000/api`; cấu hình AI qua biến bí mật của Railway; không đưa khóa AI vào `NEXT_PUBLIC_*` |
| Gateway | Repo app, Config File Path `/deploy/railway.gateway.json` | `SOMA_UPSTREAM_URL=http://BACKEND_PRIVATE_HOST:4000`, `SOMA_SHARE_PUBLIC_URL=https://MOBILE_HOST`, `SOMA_MOBILE_WEB_ORIGINS` là danh sách origin web thực được phép |
| Gateway allowlist | Đã đóng gói trong image | `SOMA_MOBILE_ALLOWLIST=/app/deploy/mobile-allowlist.json`; không cần copy tài liệu riêng hoặc toàn bộ repo backend vào image |

Gateway dùng `PORT` do Railway cấp, lắng nghe IPv6 và IPv4 qua `::`. Health check `/api/health` chuyển tiếp trạng thái DB/backend, trả cả 503 khi upstream chưa sẵn sàng. Các URL HTTPS upstream cũng được hỗ trợ. Image chạy bằng tài khoản `node`, không cài Expo/Metro hoặc toàn bộ node_modules. `.dockerignore` chỉ cho phép đúng các file gateway vào build context; `.env`, khóa và APK không được đưa vào image này.

Trước khi đổi catalogue backend, chạy `npm run prepare:gateway` trong app với manifest backend tương ứng rồi commit allowlist đã chuẩn bị. Manifest đóng gói chỉ chứa ID model và khóa asset; không chứa đường dẫn nguồn, nội dung tài liệu hay tài khoản. Container production không khởi động nếu thiếu/không đọc được allowlist. Cần deploy đồng bộ backend và allowlist khi thêm/xóa model.

Backend hiện migrate deploy trước khi mở cổng. Khi tạo DB mới phải kiểm tra dữ liệu catalogue/quiz có đầy đủ; không lấy health 200 làm bằng chứng đã có ngân hàng câu hỏi. Không thay dữ liệu/seed tài khoản demo vào DB đang có người dùng. Cấu hình SMTP và địa chỉ web thực cho luồng khôi phục mật khẩu nếu sử dụng email trên môi trường này. Dịch vụ trợ lý còn cần dữ liệu và cấu hình AI của web, không chỉ API NestJS.

## Thứ tự triển khai sau khi kết nối

1. Đọc project, gói tài khoản, credit và giới hạn tài nguyên hiện có. Không tự nâng gói trả phí. Chọn tài nguyên phù hợp và xác nhận chi phí cụ thể nếu tài khoản yêu cầu thanh toán.
2. Tạo DB/dịch vụ nội bộ, gắn biến bí mật trực tiếp trong Railway; kiểm tra migration và log không lộ khóa.
3. Deploy gateway, tạo domain HTTPS Railway; sau đó cập nhật các URL công khai bằng domain thực. Kiểm tra backend và DB không có domain công khai ngoài ý muốn.
4. Thêm chính xác `https://MOBILE_HOST/api/auth/oauth/google/callback`, đường dẫn tương ứng `/github/callback` và `/facebook/callback` tại nhà cung cấp. Giữ callback localhost của demo laptop khi vẫn dùng. Native app dùng scheme `soma`; chỉ thêm web return URL thật vào `MOBILE_OAUTH_RETURN_URLS`, không dùng wildcard.
5. Từ mạng bên ngoài kiểm tra health, capabilities, đăng nhập và PKCE, account, dữ liệu quiz, đồng bộ, trợ lý. Xác minh `/api/docs`, quản trị và tài liệu riêng vẫn bị gateway từ chối. Thử restart service và truy cập lại cùng domain.
6. Build APK với domain thật:

   ```powershell
   $env:EXPO_PUBLIC_API_URL='https://MOBILE_HOST/api'
   npm run android:build -- -Production
   ```

   Lệnh production từ chối tunnel tạm, localhost và hostname mẫu. Chỉ gửi APK/SHA-256 vừa build; không gắn nhãn release cho APK cũ vẫn trỏ vào máy local. Chọn nơi lưu APK tải xuống riêng; gateway Docker này chỉ chứa API proxy, không chứa APK.

## Bằng chứng cần thiết bị và tài khoản thật

QA GitHub/Facebook tự động dùng danh tính fixture qua API/PKCE/DB thật để kiểm tra luồng callback, khôi phục phiên, liên kết đúng chủ và hủy. **Fixture không xác nhận consent của nhà cung cấp thật.** GitHub thật trên laptop đã được người dùng xác nhận; Facebook thật còn chờ chủ tài khoản hoàn tất đăng nhập/cấp quyền. Không yêu cầu gửi mật khẩu hoặc mã xác minh vào chat.

APK hiện tại chưa được nghiệm thu trên Redmi thật. Sau khi có APK gắn API cố định, tải bằng Chrome trên điện thoại, mở file trong Downloads để cài. Nếu tải qua Zalo, chọn Lưu rồi mở file trong Download/Zalo. Kiểm tra: khởi động offline, xoay/chọn Atlas và góc nhìn, sáng/tối VI/EN, đăng nhập và quay lại app, đề nguồn/nộp/đồng bộ, trợ lý, đóng/mở app và mất mạng. Không tính kết quả web hoặc export Hermes thành kết quả Redmi.

## Phụ thuộc và chốt CI

Đã nâng Expo 57.0.31, Router 57.0.29; dùng node-forge 1.4.2, decoder 0.5.1 và Zod 4.6.7 trong lockfile. Decoder ESM có adapter CommonJS cho query-string; schema DevTools/MCP thật của Expo CLI được kiểm thử với Zod 4, ngoài các kiểm thử Unicode/query và export Android/web.

Audit hiện **0 critical, 0 high, 0 moderate; 7 low**. Cả bảy mục là một advisory Deepmerge tính qua cây phụ thuộc: [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). Upstream chưa có bản vá; postinstall lọc khóa prototype trước mọi lần ghi ở cả target/source, bao gồm target null-prototype, giữ Symbol/merge thông thường. Có kiểm thử tấn công và hồi quy. Đây là backport cục bộ, không phải audit sạch.

`npm run audit:security` tải báo cáo thật, từ chối lỗi mạng/báo cáo thiếu, advisory chưa duyệt và mọi mức moderate trở lên. Ngoại lệ chỉ áp dụng đúng advisory thấp này, đúng bản 4.3.1, đủ guard đã cài và kiểm thử đạt; hạn rà soát 28/11/2026. CI chạy lệnh này sau `npm run check`. Không dùng `audit --force` hoặc tắt toàn bộ advisory mức thấp.

Tài liệu này là cấu hình và tiêu chí nghiệm thu. Chỉ ghi deployment/consent/thiết bị đạt sau khi có kết quả thực tế.

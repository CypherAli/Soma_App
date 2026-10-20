Giữ Expo SDK 57 và React Native 0.86.3. Nâng uuid của công cụ xcode lên nhánh 11 CommonJS tương thích. Không dùng gợi ý audit hạ Expo/RN xuống phiên bản cũ.

Các advisory chưa có bản vá upstream được giảm thiểu bằng scripts/patch-dependencies.cjs qua postinstall: giới hạn độ lồng/AST braces, kiểm tra chính xác trường DigestAlgorithm trong node-forge và giới hạn decoder dự phòng của decode-uri-component. npm run test:security kiểm tra dữ liệu thường và hồi quy cho cả ba guard. Khi thay dependency cần đánh giá lại các guard có giới hạn phiên bản này.

Audit production theo metadata npm giảm từ 28 xuống 21 package chịu ảnh hưởng (18 high, 3 moderate, 0 critical). Công cụ không nhận biết bản vá mã cục bộ; không đổi phiên bản package để che advisory.

Kiểm tra đạt: tương thích Expo, lint/typecheck, 7 unit test, test:security, export Android Hermes/web và viewer cả năm mô hình. Chưa dựng APK native mới; các APK cũ trong builds/ không thay đổi. Giữ lifecycle scripts khi cài dependency để guard được áp dụng.

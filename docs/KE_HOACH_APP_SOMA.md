# Soma Mobile — Phạm vi và thiết kế trước khi triển khai

Ngày lập: 18/10/2026. Trạng thái: người dùng đã duyệt thiết kế và yêu cầu triển khai. Đã có mã nguồn Expo/React Native trong `Soma_App`, module mobile ở backend và kiểm thử tích hợp. Hướng dẫn chạy/build: `Soma_App/README.md`; hợp đồng API: `soma_be/docs/MOBILE_API.md`. Đây là phạm vi MVP, chưa phải toàn bộ chức năng của web.

Cập nhật thiết kế 18/10/2026: bỏ hoàn toàn khu Tra cứu độc lập; còn 4 mục chính. Tìm mô hình/cấu trúc nằm trong Atlas. Thiết kế lại theo ngôn ngữ ứng dụng học giải phẫu chuyên nghiệp, dùng ảnh dựng từ mô hình thật của dự án.

Đã xác nhận với người dùng: **giải phẫu người, ưu tiên Android**. Thời hạn bảo vệ, thiết bị demo và số người thực hiện chưa được cung cấp. Các mốc thời gian bên dưới là ước lượng, không phải cam kết tiến độ.

## 1. Vai trò của app trong đồ án

Web phục vụ khám phá atlas đầy đủ, học chuyên sâu và quản lý nội dung. App phục vụ những buổi học ngắn trên điện thoại: biết hôm nay học gì, xem mô hình, tìm bộ phận trong Atlas, làm bài và theo dõi kết quả.

Tên làm việc: **Soma Mobile**. Nội dung giao diện dùng nhãn chức năng cụ thể, không dùng khẩu hiệu quảng cáo.

Một tài khoản dùng trên web và app. Backend hiện có tiếp tục là nơi quản lý tài khoản, nội dung đã xuất bản và tiến độ học. App có giao diện và luồng thao tác riêng cho cảm ứng.

Luồng demo chính: đăng nhập → xem buổi học hôm nay → mở atlas → chọn cấu trúc → làm 10 câu → xem giải thích và kết quả → mở web thấy tiến độ vừa cập nhật.

## 2. Hiện trạng đã kiểm tra

| Khu vực | Bằng chứng trong dự án | Ảnh hưởng đến kế hoạch app |
|---|---|---|
| Tài khoản | `soma_be/src/auth/auth.controller.ts`: đăng ký, đăng nhập, hồ sơ, quên/đặt lại mật khẩu, đăng xuất | Có thể dùng chung dịch vụ; cần thiết kế phiên đăng nhập trên điện thoại |
| Tiến độ | `soma_be/src/study/study.controller.ts`: attempts, history, path, due | Tái sử dụng lộ trình và hàng ôn, không xây hai hệ tiến độ |
| Câu hỏi | `/api/quizzes`, nội dung CMS, ngân hàng trong `Soma_Fe/src/lib/anatomy`, các nguồn `model/book/atlas/personal/vet/school` | `/api/quizzes` chưa đồng nghĩa với toàn bộ kho đang dùng trên web; cần chốt một kho dùng chung cho MVP |
| Nội dung xuất bản | `soma_be/src/content/content.controller.ts`: `/api/content/published`, assets | Có thể tái sử dụng nội dung đã duyệt; cần chọn đúng tập dữ liệu phục vụ app |
| Atlas | Thư mục `Soma_Fe/public/models` hiện có 130 tệp, tổng khoảng 147,7 MB theo byte thập phân | Không đóng gói toàn bộ; dung lượng tệp chưa phản ánh RAM/GPU khi giải nén |
| Tài liệu cá nhân | `/api/personal-docs`: tải lên, bóc câu, duyệt và sửa | Có sẵn nền tảng nhưng quy trình dài; để sau MVP |
| Trợ lý | Các route Next.js như `/api/chat`, `/api/assistant`, `/api/pathology-chat`, `/api/study-plan` | Không giả định tất cả đã có API tương đương ở NestJS; chưa đưa vào MVP |
| Kế hoạch cũ | `Soma_Fe/PLAN.md` từng đặt native mobile ngoài phạm vi | Tài liệu này là đề xuất mở rộng; cần cập nhật phạm vi và sơ đồ trong báo cáo khi chốt |

Bảng trên ghi nhận khảo sát ban đầu. Trong quá trình triển khai đã kiểm thử API thật trên DB phát triển, xác minh năm GLB và luồng học; hiệu năng trên điện thoại vật lý vẫn cần đo riêng.

## 3. Chức năng bản đầu — MVP

| Nhóm | Có trong bản đầu | Giới hạn cụ thể |
|---|---|---|
| Tài khoản | Đăng ký/đăng nhập bằng email, đăng xuất, xem và cập nhật hồ sơ cơ bản, quên mật khẩu | OAuth, liên kết nhiều tài khoản và quản lý mọi phiên để sau |
| Hôm nay | Buổi học theo lộ trình, tiếp tục học, truy cập câu đến hạn ôn | Khi chưa có lộ trình: hướng dẫn tạo; không hiển thị tiến độ giả |
| Lộ trình | Tạo bằng biểu mẫu mục tiêu, số ngày, số buổi và thời lượng; xem buổi hôm nay | Dùng luật hiện có; nhập yêu cầu bằng AI để sau |
| Atlas | Danh sách mô hình đã chọn, tìm tên Việt/Anh/Latin, mở viewer, chạm chọn bộ phận, xoay/zoom, hiện/ẩn nhóm phù hợp, đặt lại góc nhìn | 5 mô hình mục tiêu; bắt đầu thử nghiệm bằng 2. Không hứa mọi mô hình có đủ lớp da/cơ/xương |
| Trắc nghiệm | Một kho giải phẫu người được chốt và có giải thích/nguồn; chọn chủ đề, phiên 10 hoặc 20 câu, xem kết quả, làm lại câu sai, ôn câu đến hạn | Luyện tập; chưa có thi thử nhiều cấu hình, trộn nhiều kho hoặc sinh đề AI |
| Cá nhân | Lịch sử, tỉ lệ đúng, lộ trình, mục đã lưu, cài đặt cơ bản | Mục đã lưu chỉ trên thiết bị ở MVP; cần nói rõ chưa đồng bộ web |
| Đồng bộ | Lượt học và lộ trình dùng chung với web khi đăng nhập | Kết quả được tính là đồng bộ khi API xác nhận; bản nháp đang làm được giữ trên thiết bị |

Ngôn ngữ giao diện bản đầu: tiếng Việt. Thuật ngữ hỗ trợ Việt/Anh/Latin khi nguồn hiện có cung cấp. Chưa dịch toàn bộ giao diện sang Anh/Trung.

Khách có thể xem Atlas công khai. Tìm tên và đọc thông tin cấu trúc thực hiện ngay trong Atlas, không có trang Tra cứu riêng. Đăng nhập để có lộ trình, lịch sử và ôn tập cá nhân. Không gộp tự động lịch sử khách với tài khoản nếu chưa có quy tắc rõ ràng.

## 4. Chức năng giữ trên web và phần mở rộng

**Giữ trên web trong phạm vi đồ án này:** back office/Content Studio; soạn, duyệt, dịch và xuất bản nội dung; nhập và sửa hàng loạt câu hỏi; toàn bộ atlas và bộ điều khiển nâng cao; điều khiển cử chỉ bằng webcam; quét camera/Vision; mặt cắt phức tạp; thú y; công cụ tài liệu dài và biên soạn tài liệu cá nhân.

**Có thể làm sau khi MVP đạt:**

1. Nhắc học bằng thông báo cục bộ, người học tự chọn giờ.
2. Gói câu hỏi tải về để học ngoại tuyến; hàng đợi đồng bộ có chống ghi trùng.
3. Trợ lý hỏi đáp theo cấu trúc đang xem, có nguồn và trạng thái khi thiếu dữ liệu.
4. Đọc danh sách/câu đã duyệt từ tài liệu cá nhân; thao tác biên soạn tiếp tục trên web.
5. Đồng bộ mục đã lưu và bổ sung mô hình theo số đo thiết bị thật.
6. iOS và các ngôn ngữ giao diện bổ sung.

Không đưa các mục mở rộng vào cam kết nghiệm thu MVP. Không có chatbot nổi trên mọi màn hình của bản đầu.

## 5. Điều hướng và màn hình

Thanh điều hướng chính gồm 4 mục: **Hôm nay · Atlas · Ôn tập · Cá nhân**. Trong màn làm bài hoặc xem 3D toàn màn hình, ẩn thanh này để dành không gian; luôn có đường quay lại.

| Màn hình | Nội dung chính | Hành động ưu tiên |
|---|---|---|
| Đăng nhập/đăng ký | Email, mật khẩu, quên mật khẩu, tiếp tục xem công khai | Đăng nhập |
| Hôm nay | Buổi học hiện tại, phần đang học, câu cần ôn | Tiếp tục buổi học |
| Tạo lộ trình | Mục tiêu, khoảng thời gian, số buổi/tuần, phút/buổi, hệ ưu tiên | Tạo lộ trình |
| Atlas | Tìm kiếm, danh sách 5 mô hình trong phạm vi | Mở mô hình |
| Viewer | Vùng 3D lớn, đặt lại, nhóm hiển thị; bảng thông tin trượt lên từ đáy | Chọn và tìm hiểu cấu trúc |
| Ôn tập | Câu đến hạn, chọn chủ đề, phiên 10/20 câu | Bắt đầu luyện tập |
| Làm bài | Một câu/màn hình, lựa chọn, đánh dấu, tiến độ | Xác nhận đáp án |
| Giải thích/kết quả | Đúng/sai bằng chữ và màu, giải thích, nguồn; tổng kết cuối phiên | Câu tiếp / Ôn lại câu sai |
| Thông tin trong Atlas | Bảng thông tin của bộ phận đang chọn: tên, mô tả, nguồn, lưu | Tiếp tục khám phá mô hình |
| Cá nhân | Lịch sử, lộ trình, đã lưu, cài đặt, đăng xuất | Xem tiến độ |

Trạng thái cần thiết kế cùng màn chính: chưa đăng nhập, chưa có lộ trình, chưa có lịch sử, không có câu đến hạn, không tìm thấy, đang tải, lỗi mạng, phiên hết hạn, bài làm chưa gửi được, mô hình không tải/không được thiết bị hỗ trợ.

Không buộc người dùng đăng nhập lại giữa một câu hỏi; giữ bản nháp, yêu cầu xác thực trước khi gửi lại kết quả.

## 6. Hướng giao diện

- Hướng thiết kế: công cụ học giải phẫu có ngôn ngữ lâm sàng, trình bày dựa trên nội dung và mô hình thật. Giữ xanh navy/lam của Soma, nền trung tính và một màu nhấn xuyên suốt; hỗ trợ tối theo hệ thống.
- Bỏ các câu như “Học một chút, hiểu thêm mỗi ngày”, tiêu đề mang giọng quảng cáo, nhãn viết hoa rải khắp và các thẻ bo tròn lặp lại.
- Header gọn với tên sản phẩm và tài khoản. Tiêu đề màn, tên bài và hành động có thứ bậc rõ; dùng khoảng trắng, đường chia và căn lề để phân nhóm.
- Màn Hôm nay có bài đang học kèm ảnh giải phẫu thật, tiến độ phiên và danh sách việc tiếp theo; số liệu mẫu được nhận diện ở ngoài khung sản phẩm.
- Atlas có tìm kiếm tại chỗ, bộ lọc theo hệ và danh sách mô hình có ảnh. Không có ô hay nút điều hướng dẫn sang khu Tra cứu độc lập.
- Ảnh minh họa được dựng từ GLB đang có trong dự án, giữ tên và nhóm mô hình đúng tài nguyên. Không dùng ảnh AI thay thế dữ liệu giải phẫu.
- Bản thiết kế cập nhật đang dùng ảnh từ `hand_bones.glb`, `heart_full.glb` và `lung_anatomy.glb`. Ảnh tim đầy đủ chỉ minh họa cách trình bày; lựa chọn model tim nhẹ hay đầy đủ cho app cần qua bước đo hiệu năng.
- Bán kính góc theo vai trò: khung thiết bị 28px; hình ảnh và khu học 8–12px; nút 8px. Hạn chế bóng đổ và không dùng gradient trang trí.
- Chữ nội dung khoảng 16sp; tiêu đề 24–28sp; nhãn phụ tối thiểu 12sp; vùng chạm tối thiểu khoảng 48dp; hỗ trợ tăng cỡ chữ.
- Viewer ưu tiên diện tích mô hình; thông tin và danh sách nhóm nằm trong bảng trượt. Bản thiết kế dùng ảnh dựng tĩnh, không giả làm viewer 3D đã hoạt động.
- Làm bài từng câu, đáp án có cả nhãn chữ và trạng thái; giải thích xuất hiện sau khi xác nhận. Dùng nội dung minh họa lấy từ dữ liệu dự án.
- Màn dài cuộn dọc; không yêu cầu cuộn ngang để đọc nội dung chính; xét safe area, bàn phím và nút Back Android.

Chốt luồng và phạm vi trước, sau đó hoàn thiện giao diện có màu cho màn chính và trạng thái lỗi/rỗng. Chỉ bắt đầu triển khai sau khi người dùng review thiết kế.

## 7. Phương án kỹ thuật đề xuất

**React Native + Expo + TypeScript**, Android trước; tái sử dụng backend NestJS/Prisma. Đề xuất này dựa trên việc dự án đã dùng React/TypeScript. Giao diện di động phải viết cho React Native; không tái sử dụng trực tiếp toàn bộ JSX/CSS Next.js.

**Đường đi 3D ưu tiên để thử nghiệm:** viewer web gọn dành cho mobile, nhúng riêng vùng 3D bằng WebView; các màn học, tài khoản, tìm kiếm và tiến độ dùng giao diện native. Chưa nhúng cả website. Viewer chỉ dùng nội dung atlas công khai và không cần nhận token tài khoản lâu dài.

Trước khi chốt cách dựng 3D, thử 2 mô hình trên máy Android thật: xoay/zoom, chạm chọn, chữ đa ngữ, Draco, lỗi tải, quay lại app và giải phóng bộ nhớ. Nếu đường WebView không đạt, đánh giá R3F native hoặc giảm số mô hình; không âm thầm bỏ 3D khỏi phạm vi đã chốt.

5 tệp ứng viên có thật: `hand_bones.glb`, `heart_anatomy.glb`, `lung_anatomy.glb`, `liver_anatomy.glb`, `brainstem_cranial_nerves.glb`. Chỉ đặt tên bài đúng cấu trúc tệp, ví dụ thân não và dây thần kinh sọ, không gọi là mô hình toàn bộ não. Đây là ứng viên, chưa được nghiệm thu độ phủ/nội dung hoặc hiệu năng mobile.

Tải từng mô hình khi mở; chỉ một viewer hoạt động mỗi lần. Chỉ cho ẩn/hiện nhóm thực sự tồn tại và có đối chiếu tên mesh. Mục tiêu thử nghiệm: khoảng 30 FPS khi xoay trên thiết bị demo đã thống nhất; mốc này phải đo, không suy ra từ kích thước GLB.

Phiên bản Expo và các package sẽ được chốt theo bộ tương thích lúc triển khai. Tài liệu tham khảo chính thức:

- Expo WebView: https://docs.expo.dev/versions/latest/sdk/webview/
- Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/
- React Three Fiber native: https://r3f.docs.pmnd.rs/getting-started/installation#react-native

## 8. Việc tích hợp cần làm trước khi nối app

| Phần | Có thể tận dụng | Việc phải bổ sung/xác minh |
|---|---|---|
| Auth | `/api/auth/register`, `login`, `me`, `profile`, `logout`, quên/đặt lại mật khẩu | Token trong SecureStore; phiên hết hạn/thu hồi; luồng đặt lại mật khẩu trên điện thoại; không lưu bí mật trong app |
| Câu hỏi | Kho đã biên soạn và nội dung CMS | Chọn một nguồn chuẩn, ID/version ổn định, giải thích và nguồn; API đọc cùng dữ liệu với web, không sao chép kho sang app rồi duy trì độc lập |
| Hàng ôn | `/api/study/due` | ID trả về phải tra lại được câu gốc; câu đã bị gỡ phải có cách xử lý |
| Lượt học | `/api/study/attempts`, `history` | DTO hiện chưa có ID lượt nộp do client cấp; thêm cơ chế chống ghi trùng trước khi cho gửi lại khi timeout |
| Lộ trình | `/api/study/path`, `path/expand` | Mã hệ/chủ đề phải cùng chuẩn với kho câu hỏi app; dùng form để không phụ thuộc route AI |
| Atlas/nội dung | `/api/content/published`, assets, cấu trúc/thuật ngữ FE | Danh mục mobile có version, URL tài nguyên truy cập được từ điện thoại, ánh xạ model/cấu trúc/nội dung; không coi bảng structures đã bao phủ hết metadata FE |
| Đã lưu | Chưa thấy endpoint bookmark trong các controller đã kiểm tra | MVP lưu cục bộ theo tài khoản/thiết bị; đồng bộ server để sau, không hứa web cũng thấy |
| AI | Các route Next.js phía server | Sau MVP mới chốt gateway hoặc chuyển service dùng chung; khóa AI chỉ ở server |

Backend đang nhận kết quả chấm từ client. MVP dùng cho tự luyện, không đưa ra tuyên bố chống gian lận hoặc dùng điểm như kỳ thi chính thức. Nếu mở rộng sang thi thật, cần chấm và xác nhận đáp án phía server.

App thật dùng URL HTTPS truy cập được từ thiết bị; `localhost` trên điện thoại không phải máy phát triển. Tách cấu hình môi trường và có cấu hình demo dùng chung web/app.

## 9. Mạng, dữ liệu và quyền truy cập

- MVP cần mạng để tải mới nội dung, mô hình và đồng bộ. Có thể giữ nội dung đã đọc và bản nháp; chưa cam kết học/thi ngoại tuyến hoàn chỉnh.
- Khi nộp bài lỗi, giữ bản nháp và trạng thái chờ gửi. Retry phải dùng cùng ID lượt nộp; kết quả không được tăng đôi khi phản hồi mạng bị mất.
- Lưu mục đã chọn bằng ID, không dùng tên hiển thị để tránh lỗi khi đổi ngôn ngữ.
- Đăng xuất/đổi tài khoản phải tách dữ liệu cá nhân và bản nháp; không để người tiếp theo thấy lịch sử hoặc dữ liệu riêng của tài khoản trước.
- Mục đã lưu trên máy có thể mất khi gỡ app; giao diện nói rõ phạm vi lưu.
- Không xin quyền camera/micro ở MVP vì không có chức năng sử dụng. Thông báo chỉ xin khi triển khai nhắc học và người dùng bật.
- Giữ trích dẫn và giấy phép của nội dung/mô hình; chưa có nội dung thì hiện trạng thái thiếu thay vì sinh mô tả giả.

## 10. Trình tự thực hiện sau khi chốt

Ước lượng cho một người đã quen codebase, làm tương đối tập trung; chưa tính thời gian chờ phản hồi, sửa dữ liệu y khoa lớn hoặc quy trình duyệt store.

| Giai đoạn | Kết quả cần review | Ước lượng |
|---|---|---|
| A — Chốt thiết kế | Phạm vi MVP, sitemap, phác thảo bấm được, thiết kế có màu và trạng thái lỗi/rỗng | 2–3 ngày |
| B — Kiểm chứng kỹ thuật | 2 mô hình trên Android thật; bảng nguồn nội dung/API; thử auth; chốt thiết bị và cách đo | 2–3 ngày |
| C — Nền tảng app và dữ liệu | Điều hướng, xác thực, phiên đăng nhập; nguồn câu hỏi/model thống nhất; chống nộp trùng | 4–5 ngày |
| D — Luồng học chính | Hôm nay, lộ trình bằng form, quiz, giải thích/kết quả, lịch sử và hàng ôn | 5–7 ngày |
| E — Atlas | 5 mô hình nếu đạt kiểm chứng, thông tin cấu trúc và tìm kiếm trong Atlas, lưu trên thiết bị | 3–5 ngày |
| F — Hoàn thiện đồ án | Kiểm tra máy thật, lỗi mạng/phiên, bản APK, ảnh và sơ đồ báo cáo, kịch bản demo | 3–5 ngày |

Tổng khoảng **19–28 ngày làm việc**, thường tương đương **4–6 tuần**. Nếu thời hạn ngắn, ưu tiên giảm số mô hình hoặc phần mở rộng, vẫn giữ trọn một luồng học và đồng bộ. Bản APK demo là đầu ra dự kiến; phát hành Play Store không thuộc MVP.

## 11. Điều kiện nghiệm thu

1. Cài APK trên máy Android demo; mở lại app và điều hướng Back đúng.
2. Đăng nhập cùng tài khoản web/app; hết hạn hoặc bị thu hồi phiên được xử lý rõ ràng.
3. Tạo lộ trình bằng form; mở web thấy cùng lộ trình.
4. Hoàn thành một phiên 10 câu; có giải thích/nguồn; web hiển thị đúng một lượt học và hàng ôn được cập nhật.
5. Giả lập mất phản hồi sau khi server đã lưu rồi gửi lại; chỉ có một lượt được ghi.
6. 5 mô hình trong phạm vi chốt mở được, xoay/zoom/chọn cấu trúc ổn định; đo hiệu năng trên máy demo; xử lý được lỗi tải.
7. Tìm cấu trúc bằng Việt/Anh/Latin khi dữ liệu có hỗ trợ; mở đúng mô hình/cấu trúc tương ứng, trường hợp không hỗ trợ hiển thị rõ.
8. Trạng thái rỗng, lỗi mạng, không có câu đến hạn và chưa đăng nhập đều có đường xử lý; không lấy dữ liệu mẫu làm dữ liệu thật.
9. Đăng xuất/đổi tài khoản không làm lộ tiến độ, bản nháp hoặc mục riêng của tài khoản khác.
10. Ghi nhận và đối chiếu hồi quy các API dùng chung để việc thêm app không làm hỏng web.

## 12. Các quyết định còn mở

- Thiết bị Android dùng demo, hạn nộp/bảo vệ và quỹ thời gian thực hiện.
- Kho câu hỏi chung được chọn cho bản đầu và độ phủ nội dung đi kèm 5 mô hình.
- Review bố cục màn chính trước khi hoàn thiện toàn bộ thiết kế có màu.
- Kết quả thử nghiệm 3D để chốt WebView hoặc phương án native.

Các mục này được xử lý khi bước vào giai đoạn tương ứng. Chưa tạo project app hoặc thay đổi mã nguồn web/backend trong lần lập kế hoạch này.

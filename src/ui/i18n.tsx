import additional from "./en.json";
import { Children } from "react";
import { Text as NativeText, type TextProps, StyleSheet } from "react-native";
import { useApp } from "../core/AppProvider";

const en: Record<string, string> = {
  "Hôm nay": "Today",
  "Ôn tập": "Review",
  "Cá nhân": "Profile",
  "Học tập": "Learning",
  "Cài đặt": "Settings",
  "Giao diện": "Appearance",
  "Theo hệ thống": "System",
  Sáng: "Light",
  Tối: "Dark",
  "Ngôn ngữ": "Language",
  "Đăng nhập": "Sign in",
  "Đăng ký": "Sign up",
  "Đăng xuất": "Sign out",
  "Mật khẩu": "Password",
  "Họ và tên": "Full name",
  "Quên mật khẩu?": "Forgot password?",
  "Tiếp tục với Google": "Continue with Google",
  "Tài khoản": "Account",
  "Lưu cài đặt": "Save settings",
  "Đã lưu cài đặt": "Settings saved",
  "Địa chỉ API": "API address",
  "Thử lại": "Try again",
  Hủy: "Cancel",
  Lưu: "Save",
  "Tiếp tục": "Continue",
  "Bắt đầu": "Start",
  "Quay lại": "Back",
  "Atlas giải phẫu": "Anatomy atlas",
  "Khám phá Atlas": "Explore the atlas",
  "Tìm mô hình": "Search models",
  "Tất cả": "All",
  "Tất cả hệ cơ quan": "All body systems",
  "Hệ xương": "Skeletal system",
  "Hệ cơ": "Muscular system",
  "Hệ tim mạch": "Cardiovascular system",
  "Hệ thần kinh": "Nervous system",
  "Nội tạng": "Viscera",
  Khớp: "Joints",
  "Hệ bạch huyết": "Lymphatic system",
  "Hệ tiêu hóa": "Digestive system",
  "Hệ hô hấp": "Respiratory system",
  "Hệ tiết niệu": "Urinary system",
  "Hệ nội tiết": "Endocrine system",
  "Hệ thị giác": "Visual system",
  "Hệ thính giác": "Auditory system",
  "Hệ sinh sản": "Reproductive system",
  "Hệ mạc": "Fascia",
  "Mô liên kết": "Connective tissue",
  "Cấu trúc": "Structures",
  "Các lớp": "Layers",
  Lớp: "Layers",
  "Công cụ": "Tools",
  "Thông tin": "Information",
  "Góc nhìn": "View",
  Trước: "Front",
  Sau: "Back",
  Bên: "Side",
  "Góc chéo": "Oblique",
  Trên: "Top",
  Dưới: "Bottom",
  "Nhãn cấu trúc": "Structure labels",
  "Khôi phục": "Restore",
  Ẩn: "Hide",
  "Làm mờ": "Fade",
  "Cô lập": "Isolate",
  "Cô lập cấu trúc": "Isolate structure",
  "Tay trái": "Left hand",
  "Tay phải": "Right hand",
  "Cả hai": "Both",
  "Mặt cắt": "Section",
  "Bật mặt cắt": "Enable section",
  "Tách rời từng cấu trúc để quan sát. Chọn 0% để ghép lại đúng vị trí ban đầu.":
    "Move intact structures apart to inspect them. Choose 0% to restore their anatomical positions.",
  "Mô hình đã lưu": "Saved models",
  "Chưa lưu mô hình nào": "No saved models",
  "Mở Atlas": "Open atlas",
  "Lịch sử luyện tập": "Practice history",
  "Ngày học liên tiếp": "Day streak",
  "Tỉ lệ đúng gần đây": "Recent accuracy",
  "Chưa có lượt luyện tập": "No practice attempts yet",
  "Lộ trình ôn tập": "Study plan",
  "Tạo lộ trình": "Create a plan",
  "Mục tiêu": "Goal",
  "Số câu": "Questions",
  "Chủ đề": "Topic",
  "Luyện tập": "Practice",
  "Bắt đầu luyện tập": "Start practice",
  "Tiếp tục bài làm": "Resume attempt",
  "Nộp bài": "Submit",
  "Xác nhận": "Confirm",
  "Câu trước": "Previous",
  "Câu tiếp": "Next",
  "Kết quả": "Results",
  "Giải thích": "Explanation",
  "Đáp án": "Answer",
  Đúng: "Correct",
  Sai: "Incorrect",
  "Chưa có câu đến hạn": "No questions due",
  "Chưa tải được lịch ôn": "Could not load review schedule",
  "Bạn có thể luyện theo chủ đề bên dưới.": "You can practise by topic below.",
  "Điều khoản sử dụng": "Terms of use",
  "Chính sách quyền riêng tư": "Privacy policy",
  "Về Soma": "About Soma",
  "Phiên bản": "Version",
  "Đề nguồn PDF": "Source PDF exams",
  "Đề ôn tập giải phẫu": "Anatomy question banks",
  "PDF & Word của tôi": "My PDF & Word files",
  "Nguồn do bạn cung cấp": "Your source documents",
  "Mở bộ đề": "Browse exams",
  "Trợ lý": "Assistant",
  "Trợ lý Soma": "Soma assistant",
  "Hỏi trợ lý": "Ask the assistant",
  Gửi: "Send",
  "Đang trả lời…": "Thinking…",
  "Nhập câu hỏi (tối đa 500 ký tự)": "Ask a question (up to 500 characters)",
  "Nguồn tham khảo": "Sources",
  "Tra cứu từ nguồn": "Source lookup",
  "Câu nhiều đáp án · chọn tất cả đáp án đúng":
    "Multiple answers · select all correct options",
  "Một đáp án đúng": "Single correct answer",
  "Xem đáp án nguồn": "Show source answer",
  "Câu nguồn chưa có đáp án · không tính điểm":
    "No source answer available · excluded from scoring",
  "Chọn đề để bắt đầu": "Choose an exam",
  "Tìm đề theo tên hoặc vùng": "Search by title or region",
  "Luyện theo mô hình 3D": "Practise with 3D models",
  "Nội dung đề giữ nguyên ngôn ngữ của tài liệu nguồn.":
    "Questions retain the language of their source document.",
  "Làm lại": "Try again",
  "Hoàn thành": "Finish",
  "Đồng bộ kết quả": "Sync results",
  "Đã đồng bộ": "Synced",
  "Chưa đồng bộ": "Not synced",
  "Trợ lý giải thích dựa trên tài liệu Soma và hiển thị nguồn tham khảo.":
    "The assistant explains using Soma materials and shows its sources.",
  "Tin nhắn được gửi tới máy chủ để trả lời. Không gửi thông tin sức khỏe cá nhân.":
    "Messages are sent to the server for a response. Do not include personal health information.",
  "Xóa hội thoại": "Clear conversation",
  "Tìm cấu trúc": "Search structures",
  "Tải lại thư viện": "Reload library",
  "Mở mô hình": "Open model",
};
Object.assign(en, additional);
const insensitiveKeys = new Map(
  Object.keys(en).map((key) => [key.toLocaleLowerCase("vi"), key]),
);
export function translate(text: string, locale: "vi" | "en") {
  if (locale !== "en") return text;
  const exact = en[text.trim()];
  if (exact) return text.replace(text.trim(), exact);
  const insensitive = insensitiveKeys.get(text.trim().toLocaleLowerCase("vi"));
  if (insensitive)
    return text === text.toLocaleUpperCase("vi")
      ? en[insensitive].toUpperCase()
      : en[insensitive];
  return text
    .replace(/^Mức tách · /, "Separation · ")
    .replace(/^(\d+) câu$/, "$1 questions")
    .replace(/^Câu (\d+)/, "Question $1")
    .replace(/^Trang (\d+)/, "Page $1");
}
export function useI18n() {
  const { preferences } = useApp();
  const language = preferences.language ?? "vi";
  return { language, tr: (text: string) => translate(text, language) };
}
export function Text({
  children,
  style,
  accessibilityLabel,
  localize = true,
  ...props
}: TextProps & { localize?: boolean }) {
  const { tr } = useI18n();
  const weight = StyleSheet.flatten(style)?.fontWeight;
  const bold = weight === "bold" || Number(weight) >= 600;
  return (
    <NativeText
      {...props}
      accessibilityLabel={
        accessibilityLabel ? tr(accessibilityLabel) : undefined
      }
      style={[
        {
          fontFamily: bold ? "SomaSansBold" : "SomaSans",
          includeFontPadding: true,
        },
        style,
      ]}
    >
      {Children.map(children, (child) =>
        typeof child === "string" && localize ? tr(child) : child,
      )}
    </NativeText>
  );
}

import { Body, Heading, Kicker, Page, Title } from "../ui/components";

export function TermsScreen() {
  return (
    <Page back="Quay lại">
      <Kicker>Soma Mobile · Cập nhật 27/10/2026</Kicker>
      <Title>Điều khoản sử dụng</Title>
      <Heading>Mục đích học tập</Heading>
      <Body muted>
        Soma là ứng dụng học giải phẫu trong khuôn khổ đồ án tốt nghiệp. Mô
        hình, chú giải và câu hỏi giúp tự học; không thay thế chẩn đoán, tư vấn
        hoặc chỉ định điều trị của bác sĩ.
      </Body>
      <Heading>Tài khoản và kết quả học</Heading>
      <Body muted>
        Bạn chịu trách nhiệm bảo vệ tài khoản của mình. Tài khoản, lộ trình,
        lịch sử và hàng ôn dùng chung với Soma trên web khi kết nối cùng máy
        chủ. Điểm luyện tập phục vụ tự đánh giá kiến thức, không phải chứng nhận
        chuyên môn.
      </Body>
      <Heading>Nội dung và giấy phép</Heading>
      <Body muted>
        Mô hình có nguồn từ Atlas BodyParts3D và Z-Anatomy. Khi sử dụng lại tài
        nguyên, cần giữ ghi công và tuân theo giấy phép cụ thể của từng nguồn.
        Xem “Nguồn dữ liệu và giấy phép” trong mục Cá nhân; không mạo danh ứng
        dụng là nguồn y khoa chính thức.
      </Body>
      <Heading>Kết nối và lưu trên thiết bị</Heading>
      <Body muted>
        Atlas có dữ liệu đi kèm ứng dụng. Đăng nhập, gửi kết quả và đồng bộ cần
        máy chủ hoạt động. Bài đang làm và mô hình đã lưu nằm trên thiết bị,
        được tách theo máy chủ và tài khoản; chúng có thể mất khi xóa dữ liệu
        hoặc gỡ ứng dụng. Khi gửi bài lỗi, giữ bài làm và dùng nút gửi lại.
      </Body>
      <Heading>Phản hồi và hỗ trợ</Heading>
      <Body muted>
        Nếu phát hiện nội dung thiếu hoặc sai, vui lòng gửi tên mô hình, cấu
        trúc hoặc câu hỏi và phiên bản app tới trinhviethoangawm@gmail.com.
        Không gửi mật khẩu hoặc mã đăng nhập.
      </Body>
    </Page>
  );
}

export function PrivacyScreen() {
  return (
    <Page back="Quay lại">
      <Kicker>Soma Mobile · Cập nhật 27/10/2026</Kicker>
      <Title>Chính sách bảo mật</Title>
      <Heading>Dữ liệu tài khoản</Heading>
      <Body muted>
        Khi tạo hoặc đăng nhập tài khoản, ứng dụng trao đổi thông tin xác thực,
        tên, email và thông tin hồ sơ với máy chủ Soma được cấu hình. Nếu chọn
        Google, GitHub hoặc Facebook, việc xác thực diễn ra với nhà cung cấp đó
        và máy chủ Soma; chính sách của nhà cung cấp cũng áp dụng cho bước đăng
        nhập.
      </Body>
      <Heading>Dữ liệu học tập</Heading>
      <Body muted>
        Lộ trình, câu trả lời được nộp, kết quả, thời lượng học và lịch ôn được
        gửi tới máy chủ để chấm điểm và đồng bộ với web. Bản nháp bài làm và
        danh sách mô hình đã lưu được giữ riêng trên thiết bị theo địa chỉ máy
        chủ và tài khoản.
      </Body>
      <Heading>Lưu phiên đăng nhập</Heading>
      <Body muted>
        Trên Android, thông tin phiên được giữ bằng SecureStore. Bản xem trên
        trình duyệt chỉ giữ phiên trong bộ nhớ tab. Ứng dụng không lưu mật khẩu
        để đăng nhập lại. Đăng xuất xóa phiên trên thiết bị; không tự xóa tài
        khoản, lịch sử học hoặc bản nháp của tài khoản đó.
      </Body>
      <Heading>Quyền thiết bị và kết nối</Heading>
      <Body muted>
        Ứng dụng chỉ mở bộ chọn ảnh khi bạn chọn thay ảnh đại diện. Ảnh được cắt
        và thu nhỏ trên thiết bị trước khi gửi lên hồ sơ. Ứng dụng không sử dụng
        camera hoặc micro. Ứng dụng cần Internet cho tài khoản và đồng bộ. Bản
        phát triển có thể kết nối máy chủ HTTP trong mạng nội bộ; bản production
        yêu cầu HTTPS. Chỉ cấu hình máy chủ mà bạn tin cậy.
      </Body>
      <Heading>Trợ lý học tập</Heading>
      <Body muted>
        Câu hỏi và tối đa bốn tin nhắn gần nhất được gửi tới máy chủ Soma; khi
        bật AI, máy chủ chuyển ngữ cảnh cần thiết tới nhà cung cấp AI được cấu
        hình. Hội thoại chỉ giữ trong bộ nhớ màn hình và được xóa khi rời màn
        hình hoặc đăng xuất. Tài liệu cá nhân không tự động được gửi cho trợ lý.
        Không gửi thông tin sức khỏe cá nhân; câu trả lời phục vụ học tập và có
        nguồn tham khảo.
      </Body>
      <Heading>Yêu cầu về dữ liệu</Heading>
      <Body muted>
        Để phản hồi, yêu cầu sửa hoặc xóa dữ liệu tài khoản, liên hệ
        trinhviethoangawm@gmail.com bằng email gắn với tài khoản. Đây là yêu cầu
        do người quản lý xử lý; app hiện chưa có nút xóa tài khoản tự động. Xóa
        dữ liệu ứng dụng hoặc gỡ app chỉ xóa dữ liệu trên thiết bị, không tự xóa
        dữ liệu trên máy chủ.
      </Body>
    </Page>
  );
}

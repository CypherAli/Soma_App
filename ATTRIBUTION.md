# Tài nguyên giải phẫu của Soma Mobile

Năm GLB được dùng lại từ `Soma_Fe/public/models`: `hand_bones.glb`, `heart_anatomy.glb`, `lung_anatomy.glb`, `liver_anatomy.glb`, `brainstem_cranial_nerves.glb`. Ảnh ở `assets/anatomy` là ảnh dựng từ chính năm mô hình này bằng Blender; không phải ảnh giải phẫu sinh bởi AI.

Nguồn atlas: **Z-Anatomy**, dẫn xuất từ **BodyParts3D**, The Database Center for Life Science. Ghi công nguồn mô hình: Kousaku Okubo; giải phẫu và thiết kế 3D Z-Anatomy: Gauthier Kervyn. Z-Anatomy công bố CC BY-SA 4.0 và giữ các thông báo riêng của thành phần kế thừa. Khi phân phối lại, giữ nguyên [giấy phép và ghi công gốc](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt), bao gồm ghi công riêng cho não và các dây thần kinh sọ; không coi mọi thành phần đều có một giấy phép duy nhất.

Thay đổi ở phần mobile: chọn năm GLB đã có trong Soma, tạo ảnh minh họa nền trong suốt, dùng lại màu mô học của web, thêm chọn cấu trúc và góc nhìn vừa màn hình. Hình học GLB được sao chép nguyên trạng; mã kiểm tra SHA-256 nằm trong `soma_be/resources/mobile/manifest.json`.

Các thông báo gốc của bộ dữ liệu đang có trong repository tiếp tục áp dụng. Giấy phép tài nguyên giải phẫu không tự động thay đổi giấy phép mã nguồn ứng dụng. Three.js và Draco có thông báo của nhà cung cấp trong các gói nguồn tương ứng.

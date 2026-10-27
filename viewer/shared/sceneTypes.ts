type T3 = Record<"vi" | "en" | "zh", string>;
type ClipAxis = "x" | "y" | "z";
type View = "three-quarter" | "front" | "back" | "side" | "top" | "bottom";
export interface AtlasSceneGroup {
  /** Khoá ngắn, dùng làm key React và neo URL. */
  key: string;
  /** Tên hiển thị ba ngôn ngữ. */
  name: T3;
  /** Tên Latin/TA2 chuẩn. */
  latin?: string;
  /** Ghi chú giải phẫu ngắn, viết cho sinh viên y. */
  note?: T3;
  /** Surface features may share a parent mesh. Do not invent independent mesh IDs. */
  landmarks?: {
    name: T3;
    latin: string;
    note: T3;
    source: string;
    sourceTitle?: string;
    separatedName?: T3;
    anchors?: { partId: string; position: [number, number, number] }[];
  }[];
  /**
   * Ghi đè màu cho cả nhóm (hex). Dùng khi màu theo hệ của atlas dạy sai —
   * điển hình là vòng tiểu tuần hoàn: động mạch phổi mang máu nghèo oxy nên
   * phải xanh, tĩnh mạch phổi mang máu giàu oxy nên phải đỏ.
   */
  tint?: string;
  /** Mã mảnh trong atlas.json — phải là mã CÓ THẬT, sinh bằng script. */
  parts: string[];
}

export interface AtlasSceneDef {
  /** Optional replacement authored in BO; empty keeps the original atlas. */
  replacement?: { modelFile: string; hotspots: unknown[] };
  slug: string;
  title: T3;
  latin?: string;
  /**
   * Hệ cơ quan để xếp thẻ trong thư viện — chỉ khai khi scene ĐỔI CHỦ ĐỀ so
   * với bài Z-Anatomy cùng slug (vd "co-mat" nay là khoang cẳng chân).
   */
  system?: string;
  intro: T3;
  groups: AtlasSceneGroup[];
  /**
   * Bài BỘ PHẬN học theo lớp (kiểu Complete Anatomy): mỗi lớp gom vài nhóm,
   * người học bật/tắt từng lớp thay vì thấy mọi cấu trúc cùng lúc. Nhóm không
   * thuộc lớp nào luôn hiện. `on` = lớp bật sẵn lúc mở trang.
   */
  layers?: { key: string; name: T3; groups: string[]; on?: boolean }[];
  /**
   * Khoá các nhóm dùng để căn khung ngắm. Bỏ trống = căn theo toàn bộ scene.
   * Cần khi scene có cấu trúc chạy dài ra ngoài vùng quan tâm (tĩnh mạch chủ,
   * cung động mạch chủ…) làm hộp bao phình ra và chủ thể bị thu nhỏ.
   */
  frameGroups?: string[];
  /**
   * Khoá các nhóm LÀM MỜ SẴN khi mở trang (và khi bấm Đặt lại). Dành cho nhóm
   * làm nền/mốc che mất chủ thể — ruột che cây mạch mạc treo, xương che mạch
   * chi. Người học vẫn bỏ mờ được bằng nút Làm mờ trong bảng chi tiết.
   */
  fadedGroups?: string[];
  /**
   * Mặt cắt BẬT SẴN khi mở trang — cho bài bản chất là một lát cắt (mặt cắt
   * ngang bụng). `percent` tính theo hộp bao của scene, như thanh trượt.
   */
  clip?: { axis: ClipAxis; percent: number; keepPositive?: boolean };
  /**
   * Góc nhìn lúc mở trang. Bài lát cắt ngang nhìn TỪ DƯỚI LÊN (`bottom`) như
   * đọc phim CT — nhìn chéo ¾ thì mặt cắt gần như thành một vạch.
   */
  view?: View;
}

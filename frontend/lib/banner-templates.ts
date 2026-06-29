// Mẫu banner sẵn cho admin dùng nhanh.
// Admin bấm "Dùng mẫu" để điền form, có thể chỉnh lại trước khi lưu thành banner thật.

export type BannerTemplateData = {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  // Số ngày kể từ hiện tại. Frontend tự tính thành datetime khi áp dụng.
  // null = không giới hạn.
  startDaysFromNow: number | null;
  endDaysFromNow: number | null;
};

export type BannerTemplate = {
  id: string;
  name: string;
  description: string;
  accent: string;
  data: BannerTemplateData;
};

export const BANNER_TEMPLATES: BannerTemplate[] = [
  {
    id: "tinh-hoa-thu-cong-viet",
    name: "Tinh hoa thủ công Việt",
    description:
      "Tông trầm ấm cho bộ sưu tập gốm sứ, sơn mài, mây tre. Phù hợp banner chính trong 30 ngày.",
    accent: "#a35c3d",
    data: {
      title: "Tinh hoa thủ công Việt",
      subtitle:
        "Gốm Bát Tràng, sơn mài Hạ Thái và mây tre Phú Vinh - mỗi tác phẩm là một câu chuyện từ bàn tay nghệ nhân.",
      imageUrl:
        "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=80",
      linkUrl: "/discovery?sort=trending",
      sortOrder: 0,
      isActive: true,
      startDaysFromNow: 0,
      endDaysFromNow: 30,
    },
  },
  {
    id: "bo-suu-tap-mua-he-2026",
    name: "Bộ sưu tập hè 2026",
    description:
      "Tông sáng, hợp quà tặng và đồ trang trí mùa hè. Mẫu này chạy 7 ngày và dẫn về trang khám phá.",
    accent: "#576957",
    data: {
      title: "Bộ sưu tập hè 2026",
      subtitle:
        "Túi cói, nón lá hoa, gốm pastel và những món quà handmade dành cho mùa nghỉ dưỡng.",
      imageUrl:
        "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1600&q=80",
      linkUrl: "/discovery?season=summer",
      sortOrder: 1,
      isActive: true,
      startDaysFromNow: 0,
      endDaysFromNow: 7,
    },
  },
];

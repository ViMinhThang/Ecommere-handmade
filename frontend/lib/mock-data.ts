import { User, Seller, Product, Order, Customer, DashboardStats, RevenueData, CategoryData, Category } from "@/types";

export const mockCredentials = {
  email: "",
  password: "",
  role: "" as const
};

export const mockAdmin: User = {
  id: "1",
  name: "Alex Morgan",
  email: "admin@handcraft.com",
  roles: ["ROLE_USER", "ROLE_SELLER", "ROLE_ADMIN"],
  status: "ACTIVE",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  ordersCount: 0,
  totalSpent: 0,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15")
};

export const mockSellers: Seller[] = [
  {
    id: "1",
    name: "Sarah Chen",
    shopName: "Chen Ceramics",
    email: "sarah@chenceramics.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    status: "ACTIVE",
    products: 24,
    sales: 156,
    rating: 4.9,
    createdAt: new Date("2024-02-10")
  },
  {
    id: "2",
    name: "Marcus Johnson",
    shopName: "WoodWorks Studio",
    email: "marcus@woodworks.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    status: "ACTIVE",
    products: 18,
    sales: 89,
    rating: 4.7,
    createdAt: new Date("2024-03-05")
  },
  {
    id: "3",
    name: "Emma Williams",
    shopName: "Lily Textiles",
    email: "emma@lilytextiles.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    status: "ACTIVE",
    products: 32,
    sales: 203,
    rating: 5.0,
    createdAt: new Date("2024-01-20")
  },
  {
    id: "4",
    name: "David Kim",
    shopName: "Kim Crafts",
    email: "david@kimcrafts.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    status: "PENDING",
    products: 0,
    sales: 0,
    rating: 0,
    createdAt: new Date("2024-06-01")
  },
  {
    id: "5",
    name: "Lisa Brown",
    shopName: "Brown Jewels",
    email: "lisa@brownjewels.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    status: "SUSPENDED",
    products: 12,
    sales: 34,
    rating: 3.2,
    createdAt: new Date("2024-04-15")
  }
];

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Alex Morgan",
    email: "admin@handcraft.com",
    roles: ["ROLE_USER", "ROLE_SELLER", "ROLE_ADMIN"],
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    phone: "+1 555-0100",
    ordersCount: 0,
    totalSpent: 0,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15")
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@chenceramics.com",
    roles: ["ROLE_USER", "ROLE_SELLER"],
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    phone: "+1 555-0101",
    shopName: "Chen Ceramics",
    ordersCount: 0,
    totalSpent: 0,
    products: 24,
    sales: 156,
    rating: 4.9,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-02-10")
  },
  {
    id: "3",
    name: "Marcus Johnson",
    email: "marcus@woodworks.com",
    roles: ["ROLE_USER", "ROLE_SELLER"],
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    phone: "+1 555-0102",
    shopName: "WoodWorks Studio",
    ordersCount: 0,
    totalSpent: 0,
    products: 18,
    sales: 89,
    rating: 4.7,
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-05")
  },
  {
    id: "4",
    name: "Emma Williams",
    email: "emma@lilytextiles.com",
    roles: ["ROLE_USER", "ROLE_SELLER"],
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    phone: "+1 555-0103",
    shopName: "Lily Textiles",
    ordersCount: 0,
    totalSpent: 0,
    products: 32,
    sales: 203,
    rating: 5.0,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20")
  },
  {
    id: "5",
    name: "David Kim",
    email: "david@kimcrafts.com",
    roles: ["ROLE_USER", "ROLE_SELLER"],
    status: "PENDING",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    phone: "+1 555-0104",
    shopName: "Kim Crafts",
    ordersCount: 0,
    totalSpent: 0,
    products: 0,
    sales: 0,
    rating: 0,
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-06-01")
  },
  {
    id: "6",
    name: "Lisa Brown",
    email: "lisa@brownjewels.com",
    roles: ["ROLE_USER", "ROLE_SELLER"],
    status: "SUSPENDED",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    phone: "+1 555-0105",
    shopName: "Brown Jewels",
    ordersCount: 0,
    totalSpent: 0,
    products: 12,
    sales: 34,
    rating: 3.2,
    createdAt: new Date("2024-04-15"),
    updatedAt: new Date("2024-04-15")
  },
  {
    id: "7",
    name: "James Wilson",
    email: "james@email.com",
    roles: ["ROLE_USER"],
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    phone: "+1 555-0106",
    ordersCount: 12,
    totalSpent: 12450,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10")
  },
  {
    id: "8",
    name: "Maria Garcia",
    email: "maria@email.com",
    roles: ["ROLE_USER"],
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    phone: "+1 555-0107",
    ordersCount: 8,
    totalSpent: 8920,
    createdAt: new Date("2024-02-14"),
    updatedAt: new Date("2024-02-14")
  },
  {
    id: "9",
    name: "Robert Taylor",
    email: "robert@email.com",
    roles: ["ROLE_USER"],
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    phone: "+1 555-0108",
    ordersCount: 5,
    totalSpent: 5670,
    createdAt: new Date("2024-03-22"),
    updatedAt: new Date("2024-03-22")
  },
  {
    id: "10",
    name: "Jennifer Lee",
    email: "jennifer@email.com",
    roles: ["ROLE_USER"],
    status: "ACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer",
    phone: "+1 555-0109",
    ordersCount: 15,
    totalSpent: 18900,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05")
  },
  {
    id: "11",
    name: "Michael Brown",
    email: "michael@email.com",
    roles: ["ROLE_USER"],
    status: "INACTIVE",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    phone: "+1 555-0110",
    ordersCount: 3,
    totalSpent: 2340,
    createdAt: new Date("2024-05-01"),
    updatedAt: new Date("2024-05-01")
  }
];

export const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "James Wilson",
    email: "james@email.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    ordersCount: 12,
    totalSpent: 12450,
    joinedAt: new Date("2024-01-10")
  },
  {
    id: "2",
    name: "Maria Garcia",
    email: "maria@email.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    ordersCount: 8,
    totalSpent: 8920,
    joinedAt: new Date("2024-02-14")
  },
  {
    id: "3",
    name: "Robert Taylor",
    email: "robert@email.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    ordersCount: 5,
    totalSpent: 5670,
    joinedAt: new Date("2024-03-22")
  },
  {
    id: "4",
    name: "Jennifer Lee",
    email: "jennifer@email.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer",
    ordersCount: 15,
    totalSpent: 18900,
    joinedAt: new Date("2024-01-05")
  },
  {
    id: "5",
    name: "Michael Brown",
    email: "michael@email.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    ordersCount: 3,
    totalSpent: 2340,
    joinedAt: new Date("2024-05-01")
  }
];

export const mockCategories: Category[] = [
  {
    id: "1",
    name: "Đồ gốm",
    description: "Các sản phẩm gốm sứ nghệ thuật làm tay tinh tế bao gồm bình hoa, ly nước và bát đĩa ăn.",
    image: "https://picsum.photos/seed/ceramics/400/300",
    productsCount: 45,
    status: "ACTIVE",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10")
  },
  {
    id: "2",
    name: "Đồ dệt may",
    description: "Vải dệt tay, chăn len, trang phục thủ công và các tác phẩm nghệ thuật từ sợi tự nhiên.",
    image: "https://picsum.photos/seed/textiles/400/300",
    productsCount: 38,
    status: "ACTIVE",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15")
  },
  {
    id: "3",
    name: "Đồ gỗ mỹ nghệ",
    description: "Vật dụng gỗ chạm khắc thủ công, đồ nội thất gỗ tự nhiên và thớt gỗ chất lượng cao.",
    image: "https://picsum.photos/seed/woodwork/400/300",
    productsCount: 32,
    status: "ACTIVE",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01")
  },
  {
    id: "4",
    name: "Trang sức",
    description: "Trang sức thiết kế tinh xảo làm bằng tay bao gồm nhẫn, dây chuyền và vòng tay khắc tên.",
    image: "https://picsum.photos/seed/jewelry/400/300",
    productsCount: 25,
    status: "ACTIVE",
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-02-20")
  },
  {
    id: "5",
    name: "Tranh nghệ thuật",
    description: "Tác phẩm tranh nghệ thuật nguyên bản, tranh sơn dầu vẽ tay và tranh in độc quyền.",
    image: "https://picsum.photos/seed/art/400/300",
    productsCount: 18,
    status: "ACTIVE",
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-05")
  },
  {
    id: "6",
    name: "Thủ công giấy",
    description: "Nghệ thuật xếp giấy origami, thiệp thủ công và đồ dùng văn phòng phẩm handmade.",
    image: "https://picsum.photos/seed/papercrafts/400/300",
    productsCount: 0,
    status: "INACTIVE",
    createdAt: new Date("2024-04-01"),
    updatedAt: new Date("2024-04-01")
  }
];

const createProductImage = (productId: string, seed: string, createdAt: Date) => ({
  id: `${productId}-image-1`,
  url: `https://picsum.photos/seed/${seed}/200/200`,
  isMain: true,
  productId,
  createdAt,
});

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Bình hoa gốm thủ công nghệ thuật",
    description: "Bình hoa gốm sứ nghệ thuật độc bản được vuốt tay tỉ mỉ, phù hợp decor bàn trà hoặc làm quà tặng.",
    images: [createProductImage("1", "vase1", new Date("2024-05-10"))],
    price: 89000,
    categoryId: "1",
    category: mockCategories[0],
    sellerId: mockUsers[1].id,
    seller: mockUsers[1],
    status: "APPROVED",
    stock: 10,
    lowStockThreshold: 3,
    createdAt: new Date("2024-05-10"),
    updatedAt: new Date("2024-05-10")
  },
  {
    id: "2",
    name: "Thớt gỗ sồi tự nhiên chế tác tay",
    description: "Thớt gỗ sồi tự nhiên nguyên tấm, được chà nhám bóng mịn, an toàn tuyệt đối và thích hợp decor bàn ăn.",
    images: [createProductImage("2", "wood1", new Date("2024-05-12"))],
    price: 65000,
    categoryId: "3",
    category: mockCategories[2],
    sellerId: mockUsers[2].id,
    seller: mockUsers[2],
    status: "APPROVED",
    stock: 5,
    lowStockThreshold: 2,
    createdAt: new Date("2024-05-12"),
    updatedAt: new Date("2024-05-12")
  },
  {
    id: "3",
    name: "Chăn len dệt thủ công ấm áp",
    description: "Chăn len dệt sợi tự nhiên siêu mềm mịn, giữ ấm tốt và mang phong cách trang nhã thanh lịch.",
    images: [createProductImage("3", "blanket1", new Date("2024-05-15"))],
    price: 180000,
    categoryId: "2",
    category: mockCategories[1],
    sellerId: mockUsers[3].id,
    seller: mockUsers[3],
    status: "APPROVED",
    stock: 15,
    lowStockThreshold: 4,
    createdAt: new Date("2024-05-15"),
    updatedAt: new Date("2024-05-15")
  },
  {
    id: "4",
    name: "Bộ ly gốm uống cà phê (Set 4 cái)",
    description: "Bộ 4 ly gốm uống cà phê phủ men màu pastel cao cấp, dung tích vừa phải cho bữa sáng tràn ngập cảm hứng.",
    images: [createProductImage("4", "mug1", new Date("2024-06-01"))],
    price: 120000,
    categoryId: "1",
    category: mockCategories[0],
    sellerId: mockUsers[1].id,
    seller: mockUsers[1],
    status: "PENDING",
    stock: 0,
    lowStockThreshold: 2,
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-06-01")
  },
  {
    id: "5",
    name: "Nhẫn bạc khắc hoa văn thủ công",
    description: "Nhẫn bạc ta cao cấp chế tác thủ công, khắc chìm hoa văn tinh tế và có thể điều chỉnh ni tay linh hoạt.",
    images: [createProductImage("5", "ring1", new Date("2024-05-20"))],
    price: 245000,
    categoryId: "4",
    category: mockCategories[3],
    sellerId: mockUsers[5].id,
    seller: mockUsers[5],
    status: "REJECTED",
    stock: 2,
    lowStockThreshold: 1,
    createdAt: new Date("2024-05-20"),
    updatedAt: new Date("2024-05-20")
  }
];

export const mockOrders: Order[] = [
  {
    id: "ORD-001",
    customer: mockCustomers[0],
    seller: mockSellers[0],
    products: [mockProducts[0]],
    totalAmount: 89000,
    status: "DELIVERED",
    createdAt: new Date("2024-05-15")
  },
  {
    id: "ORD-002",
    customer: mockCustomers[1],
    seller: mockSellers[1],
    products: [mockProducts[1]],
    totalAmount: 65000,
    status: "SHIPPED",
    createdAt: new Date("2024-05-20")
  },
  {
    id: "ORD-003",
    customer: mockCustomers[2],
    seller: mockSellers[2],
    products: [mockProducts[2]],
    totalAmount: 180000,
    status: "PROCESSING",
    createdAt: new Date("2024-05-25")
  },
  {
    id: "ORD-004",
    customer: mockCustomers[3],
    seller: mockSellers[0],
    products: [mockProducts[0], mockProducts[3]],
    totalAmount: 209000,
    status: "PENDING",
    createdAt: new Date("2024-06-01")
  },
  {
    id: "ORD-005",
    customer: mockCustomers[4],
    seller: mockSellers[2],
    products: [mockProducts[2]],
    totalAmount: 180000,
    status: "CANCELLED",
    createdAt: new Date("2024-05-18")
  }
];

export const mockDashboardStats: DashboardStats = {
  totalRevenue: 45230000,
  revenueGrowth: 12.5,
  activeSellers: 3,
  sellersGrowth: 8.3,
  totalOrders: 156,
  ordersGrowth: 15.2,
  totalCustomers: 89,
  customersGrowth: 22.1
};

export const mockRevenueData: RevenueData[] = [
  { month: "Th1", revenue: 12500000 },
  { month: "Th2", revenue: 15800000 },
  { month: "Th3", revenue: 14200000 },
  { month: "Th4", revenue: 18500000 },
  { month: "Th5", revenue: 21000000 },
  { month: "Th6", revenue: 24500000 }
];

export const mockCategoryData: CategoryData[] = [
  { category: "Đồ gốm", count: 45 },
  { category: "Đồ dệt may", count: 38 },
  { category: "Đồ gỗ mỹ nghệ", count: 32 },
  { category: "Trang sức", count: 25 },
  { category: "Khác", count: 18 }
];



export const mockPlatformSettings = {
  platformName: "Chợ Thủ Công",
  platformDescription: "Sàn thương mại điện tử dành riêng cho các tác phẩm thủ công nghệ thuật độc đáo",
  commissionRate: 10,
  categories: ["Đồ gốm", "Đồ dệt may", "Đồ gỗ mỹ nghệ", "Trang sức", "Tranh nghệ thuật", "Khác"]
};

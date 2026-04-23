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
    name: "Ceramics",
    description: "Handcrafted ceramic products including vases, mugs, and plates",
    image: "https://picsum.photos/seed/ceramics/400/300",
    productsCount: 45,
    status: "ACTIVE",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10")
  },
  {
    id: "2",
    name: "Textiles",
    description: "Woven fabrics, blankets, clothing and textile art",
    image: "https://picsum.photos/seed/textiles/400/300",
    productsCount: 38,
    status: "ACTIVE",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15")
  },
  {
    id: "3",
    name: "Woodwork",
    description: "Hand-carved wooden items, furniture and cutting boards",
    image: "https://picsum.photos/seed/woodwork/400/300",
    productsCount: 32,
    status: "ACTIVE",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01")
  },
  {
    id: "4",
    name: "Jewelry",
    description: "Handmade jewelry including rings, necklaces and bracelets",
    image: "https://picsum.photos/seed/jewelry/400/300",
    productsCount: 25,
    status: "ACTIVE",
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-02-20")
  },
  {
    id: "5",
    name: "Art",
    description: "Original artwork, paintings, drawings and prints",
    image: "https://picsum.photos/seed/art/400/300",
    productsCount: 18,
    status: "ACTIVE",
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-05")
  },
  {
    id: "6",
    name: "Paper Crafts",
    description: "Paper art, origami, and stationery items",
    image: "https://picsum.photos/seed/papercrafts/400/300",
    productsCount: 0,
    status: "INACTIVE",
    createdAt: new Date("2024-04-01"),
    updatedAt: new Date("2024-04-01")
  }
];

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Handcrafted Ceramic Vase",
    description: "Beautiful handmade ceramic vase",
    images: ["https://picsum.photos/seed/vase1/200/200"],
    price: 89,
    categoryId: "1",
    category: mockCategories[0],
    sellerId: "1",
    seller: mockSellers[0],
    status: "APPROVED",
    stock: 10,
    createdAt: new Date("2024-05-10"),
    updatedAt: new Date("2024-05-10")
  },
  {
    id: "2",
    name: "Oak Wood Cutting Board",
    description: "Premium oak wood cutting board",
    images: ["https://picsum.photos/seed/wood1/200/200"],
    price: 65,
    categoryId: "3",
    category: mockCategories[2],
    sellerId: "2",
    seller: mockSellers[1],
    status: "APPROVED",
    stock: 5,
    createdAt: new Date("2024-05-12"),
    updatedAt: new Date("2024-05-12")
  },
  {
    id: "3",
    name: "Woven Wool Blanket",
    description: "Soft woven wool blanket",
    images: ["https://picsum.photos/seed/blanket1/200/200"],
    price: 180,
    categoryId: "2",
    category: mockCategories[1],
    sellerId: "3",
    seller: mockSellers[2],
    status: "APPROVED",
    stock: 15,
    createdAt: new Date("2024-05-15"),
    updatedAt: new Date("2024-05-15")
  },
  {
    id: "4",
    name: "Ceramic Coffee Mug Set",
    description: "Set of 4 ceramic coffee mugs",
    images: ["https://picsum.photos/seed/mug1/200/200"],
    price: 120,
    categoryId: "1",
    category: mockCategories[0],
    sellerId: "1",
    seller: mockSellers[0],
    status: "PENDING",
    stock: 0,
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-06-01")
  },
  {
    id: "5",
    name: "Handmade Silver Ring",
    description: "Sterling silver handcrafted ring",
    images: ["https://picsum.photos/seed/ring1/200/200"],
    price: 245,
    categoryId: "4",
    category: mockCategories[3],
    sellerId: "5",
    seller: mockSellers[4],
    status: "REJECTED",
    stock: 2,
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
    total: 89,
    status: "DELIVERED",
    createdAt: new Date("2024-05-15")
  },
  {
    id: "ORD-002",
    customer: mockCustomers[1],
    seller: mockSellers[1],
    products: [mockProducts[1]],
    total: 65,
    status: "SHIPPED",
    createdAt: new Date("2024-05-20")
  },
  {
    id: "ORD-003",
    customer: mockCustomers[2],
    seller: mockSellers[2],
    products: [mockProducts[2]],
    total: 180,
    status: "PROCESSING",
    createdAt: new Date("2024-05-25")
  },
  {
    id: "ORD-004",
    customer: mockCustomers[3],
    seller: mockSellers[0],
    products: [mockProducts[0], mockProducts[3]],
    total: 209,
    status: "PENDING",
    createdAt: new Date("2024-06-01")
  },
  {
    id: "ORD-005",
    customer: mockCustomers[4],
    seller: mockSellers[2],
    products: [mockProducts[2]],
    total: 180,
    status: "CANCELLED",
    createdAt: new Date("2024-05-18")
  }
];

export const mockDashboardStats: DashboardStats = {
  totalRevenue: 45230,
  revenueGrowth: 12.5,
  activeSellers: 3,
  sellersGrowth: 8.3,
  totalOrders: 156,
  ordersGrowth: 15.2,
  totalCustomers: 89,
  customersGrowth: 22.1
};

export const mockRevenueData: RevenueData[] = [
  { month: "Jan", revenue: 12500 },
  { month: "Feb", revenue: 15800 },
  { month: "Mar", revenue: 14200 },
  { month: "Apr", revenue: 18500 },
  { month: "May", revenue: 21000 },
  { month: "Jun", revenue: 24500 }
];

export const mockCategoryData: CategoryData[] = [
  { category: "Ceramics", count: 45 },
  { category: "Textiles", count: 38 },
  { category: "Woodwork", count: 32 },
  { category: "Jewelry", count: 25 },
  { category: "Other", count: 18 }
];



export const mockPlatformSettings = {
  platformName: "HandCraft Market",
  platformDescription: "A marketplace for handmade artisan products",
  commissionRate: 10,
  categories: ["Ceramics", "Textiles", "Woodwork", "Jewelry", "Art", "Other"]
};
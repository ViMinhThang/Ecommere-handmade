export type UserRole = 'ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
export type SellerSearchSortBy =
  | "relevance"
  | "newest"
  | "productCount"
  | "rating";
export type SellerSearchSortOrder = "asc" | "desc";

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderShippingAddress {
  fullName: string;
  phone: string;
  street?: string;
  address?: string;
  ward?: string;
  district?: string;
  city?: string;
  zipCode?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  status: UserStatus;
  avatar?: string;
  phone?: string;
  shopName?: string;
  sellerTitle?: string;
  sellerBio?: string;
  sellerAbout?: string;
  sellerHeroImage?: string;
  sellerAboutImage?: string;
  sellerStat1Label?: string;
  sellerStat1Value?: string;
  sellerStat2Label?: string;
  sellerStat2Value?: string;
  followerCount?: number;
  shopAverageRating?: number | null;
  shopReviewCount?: number;
  rewardPointsBalance?: number;
  ordersCount: number;
  totalSpent: number;
  products?: number;
  sales?: number;
  rating?: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  addresses?: Address[];
}

export interface Seller {
  id: string;
  name: string;
  shopName: string;
  email: string;
  avatar: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  products: number;
  sales: number;
  rating: number;
  createdAt: Date;
}

export interface SellerSearchParams {
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: SellerSearchSortBy;
  sortOrder?: SellerSearchSortOrder;
}

export interface SellerSearchResult {
  id: string;
  name: string;
  shopName?: string | null;
  avatar?: string | null;
  sellerTitle?: string | null;
  sellerBio?: string | null;
  productCount: number;
  averageRating: number | null;
  totalReviews: number;
  followerCount: number;
  shopAverageRating: number | null;
  shopReviewCount: number;
  createdAt: Date | string;
  linkTarget: string;
}

export interface SellerSearchResponse {
  data: SellerSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductImage {
  id: string;
  url: string;
  isMain: boolean;
  productId: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pricing?: {
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
    flashSaleId: string | null;
  };
  images: ProductImage[];
  descriptionImages?: string[];
  categoryId: string;
  category?: Category;
  sellerId: string;
  seller?: User;
  status: "PENDING" | "APPROVED" | "REJECTED";
  stock: number;
  lowStockThreshold: number;
  sku?: string;
  viewCount?: number;
  soldQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WishlistStatus {
  productId: string;
  isWishlisted: boolean;
}

export type ProductQuestionStatus = "PUBLISHED" | "HIDDEN" | "DELETED";

export interface ProductQuestionUser {
  id: string;
  name: string;
  avatar?: string | null;
  role?: UserRole;
}

export interface ProductQuestion {
  id: string;
  productId: string;
  question: string;
  answer?: string | null;
  answeredAt?: Date | string | null;
  createdAt: Date | string;
  user: ProductQuestionUser;
  answeredBy: ProductQuestionUser | null;
}

export interface ProductQuestionsResponse {
  data: ProductQuestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateProductQuestionInput {
  question: string;
}

export interface AnswerProductQuestionInput {
  answer: string;
}

export interface FinancialSummary {
  gross: number;
  customerPaid: number;
  platformDiscount: number;
  platformFee: number;
  sellerNet: number;
  refundedAmount: number;
}

export type MarketplaceLedgerEntryType =
  | "PAYMENT_CAPTURE"
  | "SELLER_EARNING"
  | "PLATFORM_FEE"
  | "PLATFORM_DISCOUNT"
  | "REFUND"
  | "PAYOUT";

export type MarketplaceLedgerEntryStatus = "PENDING" | "POSTED" | "VOIDED";

export interface LedgerRefundSnapshot {
  id: string;
  amount: number | string;
  currency: string;
  reason: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  providerRefundId?: string | null;
  createdAt: Date | string;
}

export interface MarketplaceLedgerEntry {
  id: string;
  type: MarketplaceLedgerEntryType;
  status: MarketplaceLedgerEntryStatus;
  amount: number | string;
  currency: string;
  idempotencyKey: string;
  orderId?: string | null;
  subOrderId?: string | null;
  customOrderId?: string | null;
  refundId?: string | null;
  sellerId?: string | null;
  customerId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  seller?: Pick<User, "id" | "name" | "shopName" | "avatar"> | null;
  customer?: Pick<User, "id" | "name" | "email" | "avatar"> | null;
  refund?: LedgerRefundSnapshot | null;
}

export interface RefundRequest {
  subOrderId?: string;
  amount?: number;
  reason: string;
}

export type RefundStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export interface Refund {
  id: string;
  orderId?: string | null;
  subOrderId?: string | null;
  customOrderId?: string | null;
  paymentIntentId: string;
  providerRefundId?: string | null;
  amount: number | string;
  currency: string;
  reason: string;
  status: RefundStatus;
  idempotencyKey: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Order {
  id: string;
  customer: Customer;
  seller?: Seller;
  products?: Product[];
  totalAmount: number;
  discountAmount?: number;
  rewardPointsRedeemed?: number;
  rewardDiscountAmount?: number;
  voucherCode?: string | null;
  status: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentMethod?: "STRIPE" | "COD";
  paymentStatus?:
    | "UNPAID"
    | "PAID"
    | "COD_PENDING"
    | "FAILED"
    | "PARTIALLY_REFUNDED"
    | "REFUNDED";
  paymentIntentId?: string;
  shippingAddress?: string | OrderShippingAddress | null;
  createdAt: Date;
  subOrders?: SubOrder[];
  financialSummary?: FinancialSummary;
}

export type RewardPointLedgerType =
  | "EARN"
  | "REDEEM"
  | "REFUND"
  | "ADJUSTMENT"
  | "EXPIRE";

export interface RewardBalance {
  balance: number;
  redeemVndPerPoint: number;
  earnVndPerPoint: number;
}

export interface RewardLedgerEntry {
  id: string;
  userId: string;
  orderId?: string | null;
  type: RewardPointLedgerType;
  points: number;
  balanceAfter: number;
  description?: string | null;
  idempotencyKey: string;
  createdAt: Date | string;
}

export interface RewardLedgerResponse {
  data: RewardLedgerEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ReportType = "SHOP" | "CUSTOMER" | "PRODUCT" | "ORDER";
export type ReportStatus = "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";

export interface ReportSummaryUser {
  id: string;
  name: string;
  email?: string;
  shopName?: string | null;
  avatar?: string | null;
  roles?: UserRole[];
}

export interface Report {
  id: string;
  reporterId: string;
  targetUserId?: string | null;
  targetProductId?: string | null;
  orderId?: string | null;
  type: ReportType;
  reason: string;
  description?: string | null;
  status: ReportStatus;
  adminNote?: string | null;
  resolvedById?: string | null;
  resolvedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  reporter?: ReportSummaryUser;
  targetUser?: ReportSummaryUser | null;
  targetProduct?: Pick<Product, "id" | "name" | "sellerId"> | null;
  order?: Pick<Order, "id" | "totalAmount" | "status" | "paymentStatus"> | null;
  resolvedBy?: ReportSummaryUser | null;
}

export interface ReportListResponse {
  data: Report[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SubOrder {
  id: string;
  orderId: string;
  order: Order;
  sellerId: string;
  seller: User;
  subTotal: number;
  discountAmount?: number;
  status: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  subOrderId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  originalPrice?: number;
  platformDiscountAmount?: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  ordersCount: number;
  totalSpent: number;
  joinedAt: Date;
}

export interface DashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  activeSellers: number;
  sellersGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  totalCustomers: number;
  customersGrowth: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface CategoryData {
  category: string;
  count: number;
}

export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface Category {
  id: string;
  name: string;
  description: string;
  slug?: string;
  image?: string;
  productsCount: number;
  status: CategoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageFolder {
  id: string;
  name: string;
  userId: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { images: number };
  images?: Image[];
}

export interface Image {
  id: string;
  displayName: string;
  path: string;
  folderId: string;
  deleted: boolean;
  createdAt: Date;
}

export interface InventoryInfo {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  sku?: string;
}

export type InventoryChangeReason = 'ORDER' | 'MANUAL' | 'RESTOCK' | 'RETURN';

export interface InventoryLog {
  id: string;
  productId: string;
  change: number;
  reason: InventoryChangeReason;
  createdAt: Date;
}

export interface VoucherRange {
  id?: string;
  minPrice: number | string;
  maxPrice: number | string;
  discountPercent: number | string;
  endDate: Date | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Voucher {
  id: string;
  name: string;
  description?: string;
  code: string;
  categoryId: string;
  category?: Category;
  isActive: boolean;
  endDate: Date | string;
  ranges: VoucherRange[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FlashSaleRange {
  id?: string;
  minPrice: number | string;
  maxPrice: number | string;
  discountPercent: number | string;
  endDate: Date | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FlashSaleCategory {
  id: string;
  flashSaleId: string;
  categoryId: string;
  category?: Category;
}

export interface FlashSale {
  id: string;
  name: string;
  description?: string;
  banner?: string;
  startAt: Date | string;
  endAt: Date | string;
  isActive: boolean;
  saleState?: "ACTIVE" | "PAUSED" | "ENDED";
  pausedReason?: string | null;
  maxUnits?: number | null;
  perUserLimit?: number | null;
  reserveStock?: number;
  autoPauseThreshold?: number | null;
  soldUnits?: number;
  reservedUnits?: number;
  categories: FlashSaleCategory[];
  ranges: FlashSaleRange[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  pricing: {
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
    flashSaleId: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  appliedVoucher?: {
    code: string;
    discountAmount: number;
    discountPercent: number;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ChatMessageType = 'TEXT' | 'IMAGE' | 'CUSTOM_ORDER_OFFER';

export interface QuoteSnapshot {
  version?: number;
  source?: "template" | "manual" | string;
  templateId?: string | null;
  templateName?: string | null;
  title?: string;
  description?: string;
  price?: number | string;
  currency?: string;
  priceRange?: {
    minPrice?: number | string | null;
    maxPrice?: number | string | null;
  } | null;
  materials?: unknown;
  sizeOptions?: unknown;
  estimatedLeadTime?: string | null;
  revisionPolicy?: string | null;
  shippingNote?: string | null;
  termsNote?: string | null;
  sentAt?: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar: string | null;
  shopName: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: ChatMessageType;
  payload: Record<string, unknown>;
  createdAt: Date | string;
  sender: ChatParticipant;
}

export interface ChatConversationSummary {
  id: string;
  customerId: string;
  sellerId: string;
  contextProduct: {
    id: string;
    name: string;
  } | null;
  otherParticipant: ChatParticipant;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CursorResponse<T> {
  data: T[];
  nextCursor: string | null;
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "./users";
import { categoriesApi } from "./categories";
import { productsApi, CreateProductDto, UpdateStockDto } from "./products";
import { mediaApi, CreateFolderDto, UpdateFolderDto } from "./media";
import { vouchersApi, CreateVoucherDto, UpdateVoucherDto } from "./vouchers";
import {
  flashSalesApi,
  CreateFlashSaleDto,
  UpdateFlashSaleDto,
} from "./flash-sales";
import { cartApi } from "./cart";
import { wishlistApi } from "./wishlist";
import { shopFollowApi } from "./shop-follow";
import { ordersApi } from "./orders";
import type {
  AdminOrderFilters,
  OrderStatus as ApiOrderStatus,
} from "./orders";
import { analyticsApi } from "./analytics";
import {
  reviewsApi,
  type CreateReviewDto,
  type CreateShopReviewDto,
} from "./reviews";
import {
  chatApi,
  CursorParams,
  StartConversationDto,
  type SendCustomOrderQuoteDto,
} from "./chat";
import {
  customOrdersApi,
  type CreateCustomOrderPayload,
  type CreateCustomOrderProgressEventPayload,
} from "./custom-orders";
import {
  customOrderQuoteTemplatesApi,
  type CreateCustomOrderQuoteTemplateDto,
  type UpdateCustomOrderQuoteTemplateDto,
} from "./custom-order-quote-templates";
import { paymentsApi } from "./payments";
import { settingsApi } from "./settings";
import {
  homepageApi,
  type CreateHomepageBannerDto,
  type CreateHomepageFeaturedProductDto,
  type UpdateHomepageBannerDto,
  type UpdateHomepageFeaturedProductDto,
} from "./homepage";
import {
  reportsApi,
  type AdminReportsQuery,
  type CreateReportPayload,
} from "./reports";
import { notificationsApi, type NotificationsQuery } from "./notifications";
import {
  paymentReliabilityApi,
  type PaymentReliabilityAnomaliesQuery,
  type PaymentReliabilityDateRangeQuery,
  type PaymentReliabilityReconciliationQuery,
  type PaymentReliabilityWebhooksQuery,
} from "./payment-reliability";
import {
  User,
  UserRole,
  UserStatus,
  Category,
  CategoryStatus,
  Address,
  Order,
  ChatConversationSummary,
  ChatMessage,
  SellerSearchParams,
  CreateProductQuestionInput,
  AnswerProductQuestionInput,
} from "@/types";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (role?: UserRole, status?: UserStatus, page?: number, limit?: number) =>
    [...userKeys.lists(), { role, status, page, limit }] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  stats: () => [...userKeys.all, "stats"] as const,
  addresses: (userId: string) =>
    [...userKeys.all, "addresses", userId] as const,
};

export const sellerKeys = {
  all: ["sellers"] as const,
  details: () => [...sellerKeys.all, "detail"] as const,
  detail: (id: string) => [...sellerKeys.details(), id] as const,
  search: (params?: SellerSearchParams) =>
    [...sellerKeys.all, "search", { ...params }] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
  list: (status?: CategoryStatus, page?: number, limit?: number) =>
    [...categoryKeys.lists(), { status, page, limit }] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
  stats: () => [...categoryKeys.all, "stats"] as const,
};

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) =>
    [...productKeys.all, "list", { ...params }] as const,
  bestSelling: (limit?: number) =>
    [...productKeys.all, "best-selling", limit ?? 10] as const,
  mostViewed: (limit?: number) =>
    [...productKeys.all, "most-viewed", limit ?? 10] as const,
  recommendations: (limit?: number) =>
    [...productKeys.all, "recommendations", limit ?? 10] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  stats: () => [...productKeys.all, "stats"] as const,
  bySeller: (sellerId: string) =>
    [...productKeys.all, "seller", sellerId] as const,
  questions: (productId: string, params?: { page?: number; limit?: number }) =>
    [...productKeys.detail(productId), "questions", { ...params }] as const,
};

export function useUsers(params?: {
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: userKeys.list(
      params?.role,
      params?.status,
      params?.page,
      params?.limit,
    ),
    queryFn: () => usersApi.getAll(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useMe() {
  return useQuery({
    queryKey: [...userKeys.all, "me"],
    queryFn: () => usersApi.getMe(),
  });
}

export function useSeller(id: string) {
  return useQuery({
    queryKey: sellerKeys.detail(id),
    queryFn: () => usersApi.getSellerById(id),
    enabled: !!id,
  });
}

export function useSearchSellers(params?: SellerSearchParams, enabled = true) {
  return useQuery({
    queryKey: sellerKeys.search(params),
    queryFn: () => usersApi.searchSellers(params),
    enabled,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: () => usersApi.getStats(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User>) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useHomepage() {
  return useQuery({
    queryKey: homepageKeys.public(),
    queryFn: () => homepageApi.getHomepage(),
  });
}

export function useAdminHomepageBanners() {
  return useQuery({
    queryKey: homepageKeys.banners(),
    queryFn: () => homepageApi.getAdminBanners(),
  });
}

export function useCreateHomepageBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHomepageBannerDto) =>
      homepageApi.createBanner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homepageKeys.all });
    },
  });
}

export function useUpdateHomepageBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHomepageBannerDto }) =>
      homepageApi.updateBanner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homepageKeys.all });
    },
  });
}

export function useDeleteHomepageBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => homepageApi.deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homepageKeys.all });
    },
  });
}

export function useAdminHomepageFeaturedProducts() {
  return useQuery({
    queryKey: homepageKeys.featuredProducts(),
    queryFn: () => homepageApi.getAdminFeaturedProducts(),
  });
}

export function useCreateHomepageFeaturedProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHomepageFeaturedProductDto) =>
      homepageApi.createFeaturedProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homepageKeys.all });
    },
  });
}

export function useUpdateHomepageFeaturedProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateHomepageFeaturedProductDto;
    }) => homepageApi.updateFeaturedProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homepageKeys.all });
    },
  });
}

export function useDeleteHomepageFeaturedProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => homepageApi.deleteFeaturedProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homepageKeys.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      usersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User>) => usersApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(updatedUser.id),
      });
      queryClient.invalidateQueries({
        queryKey: sellerKeys.detail(updatedUser.id),
      });
      queryClient.invalidateQueries({ queryKey: sellerKeys.all });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(data),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useCategories(params?: {
  status?: CategoryStatus;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: categoryKeys.list(params?.status, params?.page, params?.limit),
    queryFn: () => categoriesApi.getAll(params),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoriesApi.getById(id),
    enabled: !!id,
  });
}

export function useCategoryStats() {
  return useQuery({
    queryKey: categoryKeys.stats(),
    queryFn: () => categoriesApi.getStats(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Category>) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoriesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(id) });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

// Address hooks
export function useAddresses(userId: string) {
  return useQuery({
    queryKey: userKeys.addresses(userId),
    queryFn: () => usersApi.getAddresses(userId),
    enabled: !!userId,
  });
}

export function useAddAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: Partial<Address>;
    }) => usersApi.addAddress(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.addresses(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      addressId,
      data,
    }: {
      userId: string;
      addressId: string;
      data: Partial<Address>;
    }) => usersApi.updateAddress(userId, addressId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.addresses(userId) });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      addressId,
    }: {
      userId: string;
      addressId: string;
    }) => usersApi.deleteAddress(userId, addressId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.addresses(userId) });
    },
  });
}

// Product hooks
export function useProducts(
  params?: Parameters<typeof productsApi.getAll>[0],
  enabled = true,
) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.getAll(params),
    enabled,
  });
}

export function useBestSellingProducts(limit = 10, enabled = true) {
  return useQuery({
    queryKey: productKeys.bestSelling(limit),
    queryFn: () => productsApi.getBestSellingProducts(limit),
    enabled,
  });
}

export function useMostViewedProducts(limit = 10, enabled = true) {
  return useQuery({
    queryKey: productKeys.mostViewed(limit),
    queryFn: () => productsApi.getMostViewedProducts(limit),
    enabled,
  });
}

export function useRecommendedProducts(limit = 10, enabled = true) {
  return useQuery({
    queryKey: productKeys.recommendations(limit),
    queryFn: () => productsApi.getRecommendations(limit),
    enabled,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsApi.getOne(id),
    enabled: !!id,
  });
}

export function useProductQuestions(
  productId: string,
  params?: { page?: number; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: productKeys.questions(productId, params),
    queryFn: () => productsApi.getQuestions(productId, params),
    enabled: !!productId && enabled,
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: productKeys.stats(),
    queryFn: () => productsApi.getStats(),
  });
}

export function useSellerProducts(sellerId: string) {
  return useQuery({
    queryKey: productKeys.bySeller(sellerId),
    queryFn: () => productsApi.getBySeller(sellerId),
    enabled: !!sellerId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductDto) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateProductDto>;
    }) => productsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useCreateProductQuestion(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductQuestionInput) =>
      productsApi.createQuestion(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...productKeys.detail(productId), "questions"],
      });
    },
  });
}

export function useAnswerProductQuestion(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      data,
    }: {
      questionId: string;
      data: AnswerProductQuestionInput;
    }) => productsApi.answerQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...productKeys.detail(productId), "questions"],
      });
    },
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.updateStatus(id, "APPROVED"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useRejectProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.updateStatus(id, "REJECTED"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// Media hooks
export const mediaKeys = {
  all: ["media"] as const,
  folders: (userId: string) => [...mediaKeys.all, "folders", userId] as const,
  folder: (folderId: string) => [...mediaKeys.all, "folder", folderId] as const,
  images: (folderId: string) => [...mediaKeys.all, "images", folderId] as const,
};

export function useFolders(userId: string) {
  return useQuery({
    queryKey: mediaKeys.folders(userId),
    queryFn: () => mediaApi.getFolders(userId),
    enabled: !!userId,
  });
}

export function useFolder(folderId: string) {
  return useQuery({
    queryKey: mediaKeys.folder(folderId),
    queryFn: () => mediaApi.getFolder(folderId),
    enabled: !!folderId,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: CreateFolderDto }) =>
      mediaApi.createFolder(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.folders(userId) });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      folderId,
      data,
    }: {
      userId: string;
      folderId: string;
      data: UpdateFolderDto;
    }) => mediaApi.updateFolder(userId, folderId, data),
    onSuccess: (_, { userId, folderId }) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.folders(userId) });
      queryClient.invalidateQueries({ queryKey: mediaKeys.folder(folderId) });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, folderId }: { userId: string; folderId: string }) =>
      mediaApi.deleteFolder(userId, folderId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.folders(userId) });
    },
  });
}

export function useImages(folderId: string) {
  return useQuery({
    queryKey: mediaKeys.images(folderId),
    queryFn: () => mediaApi.getImages(folderId),
    enabled: !!folderId,
  });
}

export function useUploadImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      folderId,
      file,
      displayName,
    }: {
      folderId: string;
      file: File;
      displayName: string;
    }) => mediaApi.uploadImage(folderId, file, displayName),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.images(folderId) });
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ imageId }: { imageId: string; folderId: string }) =>
      mediaApi.deleteImage(imageId),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.images(folderId) });
    },
  });
}

// Inventory hooks
export const inventoryKeys = {
  all: ["inventory"] as const,
  lowStock: (sellerId?: string, page?: number, limit?: number) =>
    [...inventoryKeys.all, "lowStock", { sellerId, page, limit }] as const,
  inventory: (productId: string) =>
    [...inventoryKeys.all, "inventory", productId] as const,
  logs: (productId: string) =>
    [...inventoryKeys.all, "logs", productId] as const,
};

export function useLowStockProducts(
  sellerId?: string,
  page?: number,
  limit?: number,
) {
  return useQuery({
    queryKey: inventoryKeys.lowStock(sellerId, page, limit),
    queryFn: () => productsApi.getLowStock(sellerId, page, limit),
  });
}

export function useProductInventory(productId: string) {
  return useQuery({
    queryKey: inventoryKeys.inventory(productId),
    queryFn: () => productsApi.getInventory(productId),
    enabled: !!productId,
  });
}

export function useInventoryLog(productId: string) {
  return useQuery({
    queryKey: inventoryKeys.logs(productId),
    queryFn: () => productsApi.getInventoryLog(productId),
    enabled: !!productId,
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: UpdateStockDto;
    }) => productsApi.updateStock(productId, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.inventory(productId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.logs(productId),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
}

export const voucherKeys = {
  all: ["vouchers"] as const,
  lists: (params?: { page?: number; limit?: number }) =>
    [...voucherKeys.all, "list", params ?? {}] as const,
  adminLists: (params?: { page?: number; limit?: number }) =>
    [...voucherKeys.all, "admin-list", params ?? {}] as const,
  sellerLists: (params?: { page?: number; limit?: number }) =>
    [...voucherKeys.all, "seller-list", params ?? {}] as const,
  sellerPublic: (sellerId: string, params?: { page?: number; limit?: number }) =>
    [...voucherKeys.all, "seller-public", sellerId, params ?? {}] as const,
  details: () => [...voucherKeys.all, "detail"] as const,
  detail: (id: string) => [...voucherKeys.details(), id] as const,
  byCode: (code: string) => [...voucherKeys.all, "code", code] as const,
};

export const homepageKeys = {
  all: ["homepage"] as const,
  public: () => [...homepageKeys.all, "public"] as const,
  admin: () => [...homepageKeys.all, "admin"] as const,
  banners: () => [...homepageKeys.admin(), "banners"] as const,
  featuredProducts: () =>
    [...homepageKeys.admin(), "featured-products"] as const,
};

export function useVouchers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: voucherKeys.lists(params),
    queryFn: () => vouchersApi.getAll(params),
  });
}

export function useAdminVouchers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: voucherKeys.adminLists(params),
    queryFn: () => vouchersApi.getAdminAll(params),
  });
}

export function useSellerVouchers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: voucherKeys.sellerLists(params),
    queryFn: () => vouchersApi.getSellerMine(params),
  });
}

export function usePublicSellerVouchers(
  sellerId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: voucherKeys.sellerPublic(sellerId, params),
    queryFn: () => vouchersApi.getPublicBySeller(sellerId, params),
    enabled: !!sellerId,
  });
}

export function useVoucher(id: string) {
  return useQuery({
    queryKey: voucherKeys.detail(id),
    queryFn: () => vouchersApi.getById(id),
    enabled: !!id,
  });
}

export function useVoucherByCode(code: string) {
  return useQuery({
    queryKey: voucherKeys.byCode(code),
    queryFn: () => vouchersApi.getByCode(code),
    enabled: !!code,
  });
}

export function useCreateVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVoucherDto) => vouchersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherKeys.all });
    },
  });
}

export function useUpdateVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVoucherDto }) =>
      vouchersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherKeys.all });
    },
  });
}

export function useDeleteVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vouchersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherKeys.all });
    },
  });
}

export function useCreateSellerVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVoucherDto) => vouchersApi.createSeller(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherKeys.all });
    },
  });
}

export function useUpdateSellerVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVoucherDto }) =>
      vouchersApi.updateSeller(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherKeys.all });
    },
  });
}

export function useDeleteSellerVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vouchersApi.deleteSeller(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherKeys.all });
    },
  });
}

export const flashSaleKeys = {
  all: ["flash-sales"] as const,
  lists: () => [...flashSaleKeys.all, "list"] as const,
  adminLists: () => [...flashSaleKeys.all, "admin-list"] as const,
  active: () => [...flashSaleKeys.all, "active"] as const,
  details: () => [...flashSaleKeys.all, "detail"] as const,
  detail: (id: string) => [...flashSaleKeys.details(), id] as const,
};

export function useFlashSales() {
  return useQuery({
    queryKey: flashSaleKeys.lists(),
    queryFn: () => flashSalesApi.getAll(),
  });
}

export function useAdminFlashSales() {
  return useQuery({
    queryKey: flashSaleKeys.adminLists(),
    queryFn: () => flashSalesApi.getAdminAll(),
  });
}

export function useActiveFlashSales() {
  return useQuery({
    queryKey: flashSaleKeys.active(),
    queryFn: () => flashSalesApi.getActive(),
  });
}

export function useFlashSale(id: string) {
  return useQuery({
    queryKey: flashSaleKeys.detail(id),
    queryFn: () => flashSalesApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFlashSaleDto) => flashSalesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashSaleKeys.all });
    },
  });
}

export function useUpdateFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFlashSaleDto }) =>
      flashSalesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashSaleKeys.all });
    },
  });
}

export function useDeleteFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flashSalesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashSaleKeys.all });
    },
  });
}

// Cart hooks
export const cartKeys = {
  all: ["cart"] as const,
  cart: () => [...cartKeys.all, "detail"] as const,
  suggestions: () => [...cartKeys.all, "suggestions"] as const,
};

export function useCart(enabled = true) {
  return useQuery({
    queryKey: cartKeys.cart(),
    queryFn: () => cartApi.getCart(),
    enabled,
  });
}

export function useCartSuggestions(enabled = true) {
  return useQuery({
    queryKey: cartKeys.suggestions(),
    queryFn: () => cartApi.getSuggestions(),
    enabled,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
      personalization,
    }: {
      productId: string;
      quantity?: number;
      personalization?: { text?: string | null };
    }) => cartApi.addItem(productId, quantity || 1, personalization),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
      personalization,
    }: {
      productId: string;
      quantity: number;
      personalization?: { text?: string | null };
    }) => cartApi.updateItem(productId, quantity, personalization),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useApplyVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => cartApi.applyVoucher(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useRemoveVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.removeVoucher(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

// Wishlist hooks
export const wishlistKeys = {
  all: ["wishlist"] as const,
  list: () => [...wishlistKeys.all, "list"] as const,
  product: (productId: string) =>
    [...wishlistKeys.all, "product", productId] as const,
};

export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: wishlistKeys.list(),
    queryFn: () => wishlistApi.getAll(),
    enabled,
  });
}

export function useWishlistStatus(productId: string, enabled = true) {
  return useQuery({
    queryKey: wishlistKeys.product(productId),
    queryFn: () => wishlistApi.getStatus(productId),
    enabled: !!productId && enabled,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.addItem(productId),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.list() });
      queryClient.setQueryData(wishlistKeys.product(productId), {
        productId,
        isWishlisted: true,
      });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.removeItem(productId),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.list() });
      queryClient.setQueryData(wishlistKeys.product(productId), {
        productId,
        isWishlisted: false,
      });
    },
  });
}

// Shop follow hooks
export const shopFollowKeys = {
  all: ["shop-follow"] as const,
  list: () => [...shopFollowKeys.all, "list"] as const,
  status: (sellerId: string) =>
    [...shopFollowKeys.all, "status", sellerId] as const,
};

export function useShopFollowStatus(sellerId: string, enabled = true) {
  return useQuery({
    queryKey: shopFollowKeys.status(sellerId),
    queryFn: () => shopFollowApi.getStatus(sellerId),
    enabled: !!sellerId && enabled,
  });
}

export function useFollowedShops(enabled = true) {
  return useQuery({
    queryKey: shopFollowKeys.list(),
    queryFn: () => shopFollowApi.getFollowedShops(),
    enabled,
  });
}

export function useFollowShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sellerId: string) => shopFollowApi.follow(sellerId),
    onSuccess: (status, sellerId) => {
      queryClient.invalidateQueries({ queryKey: shopFollowKeys.list() });
      queryClient.invalidateQueries({ queryKey: sellerKeys.all });
      queryClient.setQueryData(shopFollowKeys.status(sellerId), status);
    },
  });
}

export function useUnfollowShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sellerId: string) => shopFollowApi.unfollow(sellerId),
    onSuccess: (status, sellerId) => {
      queryClient.invalidateQueries({ queryKey: shopFollowKeys.list() });
      queryClient.invalidateQueries({ queryKey: sellerKeys.all });
      queryClient.setQueryData(shopFollowKeys.status(sellerId), status);
    },
  });
}

// Chat hooks
export const chatKeys = {
  all: ["chat"] as const,
  conversations: (params?: CursorParams) =>
    [...chatKeys.all, "conversations", { ...params }] as const,
  messages: (conversationId: string, params?: CursorParams) =>
    [...chatKeys.all, "messages", conversationId, { ...params }] as const,
  unread: () => [...chatKeys.all, "unread"] as const,
};

export function useChatConversations(params?: CursorParams, enabled = true) {
  return useQuery({
    queryKey: chatKeys.conversations(params),
    queryFn: () => chatApi.getConversations(params),
    enabled,
  });
}

export function useChatMessages(
  conversationId: string,
  params?: CursorParams,
  enabled = true,
) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId, params),
    queryFn: () => chatApi.getMessages(conversationId, params),
    enabled: enabled && !!conversationId,
  });
}

export function useChatUnreadCount(enabled = true) {
  return useQuery({
    queryKey: chatKeys.unread(),
    queryFn: () => chatApi.getUnreadCount(),
    enabled,
    refetchInterval: 15000,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartConversationDto) => chatApi.startConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}

export function useSendTextMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      text,
    }: {
      conversationId: string;
      text: string;
    }) => chatApi.sendTextMessage(conversationId, { text }),
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "messages", variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "conversations"],
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
    },
  });
}

export function useSendImageMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      file,
      caption,
    }: {
      conversationId: string;
      file: File;
      caption?: string;
    }) => chatApi.sendImageMessage(conversationId, file, caption),
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "messages", variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "conversations"],
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      chatApi.markConversationRead(conversationId),
    onSuccess: (readState, conversationId) => {
      queryClient.setQueriesData<{
        data: ChatConversationSummary[];
        nextCursor: string | null;
      }>({ queryKey: [...chatKeys.all, "conversations"] }, (previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          data: previous.data.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        };
      });
      if (readState.changed) {
        queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
      }
    },
  });
}

// Order hooks
export const orderKeys = {
  all: ["orders"] as const,
  mine: () => [...orderKeys.all, "mine"] as const,
  seller: () => [...orderKeys.all, "seller"] as const,
  admin: (filters?: AdminOrderFilters) =>
    [...orderKeys.all, "admin", { ...filters }] as const,
  orderDetails: () => [...orderKeys.all, "order-detail"] as const,
  orderDetail: (id: string) => [...orderKeys.orderDetails(), id] as const,
  subOrderDetails: () => [...orderKeys.all, "sub-order-detail"] as const,
  subOrderDetail: (id: string) => [...orderKeys.subOrderDetails(), id] as const,
  adminDetails: () => [...orderKeys.all, "admin-detail"] as const,
  adminDetail: (id: string) => [...orderKeys.adminDetails(), id] as const,
  adminLedger: (id: string) =>
    [...orderKeys.adminDetail(id), "ledger"] as const,
};

export const paymentKeys = {
  all: ["payments"] as const,
  history: () => [...paymentKeys.all, "history"] as const,
};

export const settingsKeys = {
  all: ["settings"] as const,
  platform: () => [...settingsKeys.all, "platform"] as const,
};

export const reportKeys = {
  all: ["reports"] as const,
  mine: (params?: { page?: number; limit?: number }) =>
    [...reportKeys.all, "mine", { ...params }] as const,
  admin: (params?: AdminReportsQuery) =>
    [...reportKeys.all, "admin", { ...params }] as const,
};

export function usePaymentHistory() {
  return useQuery({
    queryKey: paymentKeys.history(),
    queryFn: () => paymentsApi.getHistory(),
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: settingsKeys.platform(),
    queryFn: () => settingsApi.getPlatform(),
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.updatePlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.platform() });
    },
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReportPayload) => reportsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useMyReports(
  params?: { page?: number; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: reportKeys.mine(params),
    queryFn: () => reportsApi.getMyReports(params),
    enabled,
  });
}

export function useAdminReports(params?: AdminReportsQuery, enabled = true) {
  return useQuery({
    queryKey: reportKeys.admin(params),
    queryFn: () => reportsApi.getAdminReports(params),
    enabled,
  });
}

export function useUpdateAdminReportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof reportsApi.updateAdminStatus>[1];
    }) => reportsApi.updateAdminStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params?: NotificationsQuery) =>
    [...notificationKeys.lists(), { ...params }] as const,
  unread: () => [...notificationKeys.all, "unread"] as const,
};

export function useNotifications(params?: NotificationsQuery, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.getNotifications(params),
    enabled,
    staleTime: 5000,
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled,
    staleTime: 10000,
    refetchInterval: false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMySubOrders() {
  return useQuery({
    queryKey: orderKeys.mine(),
    queryFn: () => ordersApi.getMyOrders(),
  });
}

export function useOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.orderDetail(id),
    queryFn: () => ordersApi.getOrder(id) as Promise<Order>,
    enabled: !!id && enabled,
  });
}

export function useSubOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.subOrderDetail(id),
    queryFn: () => ordersApi.getSubOrder(id),
    enabled: !!id && enabled,
  });
}

export function useSellerOrders(enabled = true) {
  return useQuery({
    queryKey: orderKeys.seller(),
    queryFn: () => ordersApi.getSellerOrders(),
    enabled,
  });
}

export function useAdminOrders(filters?: AdminOrderFilters, enabled = true) {
  return useQuery({
    queryKey: orderKeys.admin(filters),
    queryFn: () => ordersApi.getAdminOrders(filters),
    enabled,
  });
}

export function useAdminOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.adminDetail(id),
    queryFn: () => ordersApi.getAdminOrder(id),
    enabled: !!id && enabled,
  });
}

export function useAdminOrderLedger(id: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.adminLedger(id),
    queryFn: () => ordersApi.getAdminOrderLedger(id),
    enabled: !!id && enabled,
  });
}

export function useUpdateSubOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApiOrderStatus }) =>
      ordersApi.updateSubOrderStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.seller() });
      queryClient.invalidateQueries({ queryKey: orderKeys.subOrderDetail(id) });
    },
  });
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApiOrderStatus }) =>
      ordersApi.updateAdminOrderStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.seller() });
      queryClient.invalidateQueries({ queryKey: orderKeys.adminDetail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.orderDetail(id) });
    },
  });
}

export function useRefundAdminOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof ordersApi.refundAdminOrder>[1];
    }) => ordersApi.refundAdminOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.seller() });
      queryClient.invalidateQueries({ queryKey: orderKeys.adminDetail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.orderDetail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.adminLedger(id) });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.cancelOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.orderDetail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.adminDetail(id) });
    },
  });
}

export const paymentReliabilityKeys = {
  all: ["paymentReliability"] as const,
  summary: (query?: PaymentReliabilityDateRangeQuery) =>
    [...paymentReliabilityKeys.all, "summary", { ...query }] as const,
  anomalies: (query?: PaymentReliabilityAnomaliesQuery) =>
    [...paymentReliabilityKeys.all, "anomalies", { ...query }] as const,
  reconciliation: (query?: PaymentReliabilityReconciliationQuery) =>
    [...paymentReliabilityKeys.all, "reconciliation", { ...query }] as const,
  webhooks: (query?: PaymentReliabilityWebhooksQuery) =>
    [...paymentReliabilityKeys.all, "webhooks", { ...query }] as const,
};

export function usePaymentReliabilitySummary(
  query?: PaymentReliabilityDateRangeQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: paymentReliabilityKeys.summary(query),
    queryFn: () => paymentReliabilityApi.getSummary(query),
    enabled,
  });
}

export function usePaymentReliabilityAnomalies(
  query?: PaymentReliabilityAnomaliesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: paymentReliabilityKeys.anomalies(query),
    queryFn: () => paymentReliabilityApi.getAnomalies(query),
    enabled,
  });
}

export function usePaymentReliabilityReconciliation(
  query?: PaymentReliabilityReconciliationQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: paymentReliabilityKeys.reconciliation(query),
    queryFn: () => paymentReliabilityApi.getReconciliation(query),
    enabled,
  });
}

export function usePaymentReliabilityWebhooks(
  query?: PaymentReliabilityWebhooksQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: paymentReliabilityKeys.webhooks(query),
    queryFn: () => paymentReliabilityApi.getWebhooks(query),
    enabled,
  });
}

// Custom Order hooks
export const customOrderKeys = {
  all: ["customOrders"] as const,
  seller: () => [...customOrderKeys.all, "seller"] as const,
  detail: (id: string) => ["customOrder", id] as const,
  progress: (id: string) =>
    [...customOrderKeys.detail(id), "progress"] as const,
  adminLedger: (id: string) =>
    [...customOrderKeys.detail(id), "admin-ledger"] as const,
};

export function useCreateCustomOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomOrderPayload) =>
      customOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customOrderKeys.all });
    },
  });
}

export function useAdminCustomOrderLedger(id: string, enabled = true) {
  return useQuery({
    queryKey: customOrderKeys.adminLedger(id),
    queryFn: () => customOrdersApi.getAdminCustomOrderLedger(id),
    enabled: !!id && enabled,
  });
}

export function useCustomOrderProgressEvents(id: string, enabled = true) {
  return useQuery({
    queryKey: customOrderKeys.progress(id),
    queryFn: () => customOrdersApi.getProgressEvents(id),
    enabled: !!id && enabled,
  });
}

export function useCreateCustomOrderProgressEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CreateCustomOrderProgressEventPayload;
    }) => customOrdersApi.createProgressEvent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customOrderKeys.progress(id) });
      queryClient.invalidateQueries({ queryKey: customOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: customOrderKeys.seller() });
    },
  });
}

export function useRefundAdminCustomOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof customOrdersApi.refundAdminCustomOrder>[1];
    }) => customOrdersApi.refundAdminCustomOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: customOrderKeys.seller() });
      queryClient.invalidateQueries({ queryKey: customOrderKeys.detail(id) });
      queryClient.invalidateQueries({
        queryKey: customOrderKeys.adminLedger(id),
      });
    },
  });
}

export function useCancelCustomOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customOrdersApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: customOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: customOrderKeys.seller() });
      queryClient.invalidateQueries({ queryKey: customOrderKeys.detail(id) });
      queryClient.invalidateQueries({
        queryKey: customOrderKeys.adminLedger(id),
      });
    },
  });
}

export function useSendCustomOrderQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: SendCustomOrderQuoteDto;
    }) => chatApi.sendCustomOrderQuote(conversationId, data),
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "messages", variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "conversations"],
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
    },
  });
}

// Custom order quote template hooks
export const quoteTemplateKeys = {
  all: ["customOrderQuoteTemplates"] as const,
  details: () => [...quoteTemplateKeys.all, "detail"] as const,
  detail: (id: string) => [...quoteTemplateKeys.details(), id] as const,
};

export function useQuoteTemplates(enabled = true) {
  return useQuery({
    queryKey: quoteTemplateKeys.all,
    queryFn: () => customOrderQuoteTemplatesApi.getQuoteTemplates(),
    enabled,
  });
}

export function useCreateQuoteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomOrderQuoteTemplateDto) =>
      customOrderQuoteTemplatesApi.createQuoteTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteTemplateKeys.all });
    },
  });
}

export function useUpdateQuoteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCustomOrderQuoteTemplateDto;
    }) => customOrderQuoteTemplatesApi.updateQuoteTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: quoteTemplateKeys.all });
      queryClient.invalidateQueries({ queryKey: quoteTemplateKeys.detail(id) });
    },
  });
}

export function useDeleteQuoteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      customOrderQuoteTemplatesApi.deleteQuoteTemplate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quoteTemplateKeys.all });
      queryClient.invalidateQueries({ queryKey: quoteTemplateKeys.detail(id) });
    },
  });
}

// Analytics hooks
export const analyticsKeys = {
  all: ["analytics"] as const,
  seller: () => [...analyticsKeys.all, "seller"] as const,
  revenueOverTime: (params: { startDate: string; endDate: string }) =>
    [...analyticsKeys.seller(), "revenue-over-time", params] as const,
  revenueByCategory: (params: { month: number; year: number }) =>
    [...analyticsKeys.seller(), "revenue-by-category", params] as const,
};

export function useSellerRevenueOverTime(
  startDate: string,
  endDate: string,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.revenueOverTime({ startDate, endDate }),
    queryFn: () => analyticsApi.getSellerRevenueOverTime(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
  });
}

export function useSellerRevenueByCategory(
  month: number,
  year: number,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.revenueByCategory({ month, year }),
    queryFn: () => analyticsApi.getSellerRevenueByCategory(month, year),
    enabled: enabled && !!month && !!year,
  });
}

// Reviews hooks
export const reviewKeys = {
  all: ["reviews"] as const,
  product: (productId: string) =>
    [...reviewKeys.all, "product", productId] as const,
  seller: () => [...reviewKeys.all, "seller"] as const,
  shopBase: (sellerId: string) =>
    [...reviewKeys.all, "shop", sellerId] as const,
  shop: (sellerId: string, params?: { page?: number; limit?: number }) =>
    [...reviewKeys.shopBase(sellerId), "list", { ...params }] as const,
  shopSummary: (sellerId: string) =>
    [...reviewKeys.shopBase(sellerId), "summary"] as const,
  shopMe: (sellerId: string) =>
    [...reviewKeys.shopBase(sellerId), "me"] as const,
};

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: reviewKeys.product(productId),
    queryFn: () => reviewsApi.getProductReviews(productId),
    enabled: !!productId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReviewDto) => reviewsApi.createReview(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.product(variables.productId),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useSellerReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      reviewId: string;
      reply: string;
      productId: string;
    }) => reviewsApi.sellerReply(data.reviewId, data.reply),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.product(variables.productId),
      });
    },
  });
}

export function useShopReviews(
  sellerId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: reviewKeys.shop(sellerId, params),
    queryFn: () => reviewsApi.getShopReviews(sellerId, params),
    enabled: !!sellerId,
  });
}

export function useShopReviewSummary(sellerId: string) {
  return useQuery({
    queryKey: reviewKeys.shopSummary(sellerId),
    queryFn: () => reviewsApi.getShopReviewSummary(sellerId),
    enabled: !!sellerId,
  });
}

export function useMyShopReviewStatus(sellerId: string, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.shopMe(sellerId),
    queryFn: () => reviewsApi.getMyShopReviewStatus(sellerId),
    enabled: enabled && !!sellerId,
  });
}

export function useCreateShopReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { sellerId: string; review: CreateShopReviewDto }) =>
      reviewsApi.createShopReview(data.sellerId, data.review),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.shopBase(variables.sellerId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.shopSummary(variables.sellerId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.shopMe(variables.sellerId),
      });
      queryClient.invalidateQueries({
        queryKey: sellerKeys.detail(variables.sellerId),
      });
      queryClient.invalidateQueries({ queryKey: sellerKeys.all });
    },
  });
}

export type { ChatConversationSummary, ChatMessage };

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
import { ordersApi } from "./orders";
import { analyticsApi } from "./analytics";
import { reviewsApi } from "./reviews";
import { chatApi, CursorParams, StartConversationDto } from "./chat";
import { customOrdersApi, CustomOrder } from "./custom-orders";
import {
  User,
  UserRole,
  UserStatus,
  Category,
  CategoryStatus,
  Address,
  Order,
  SubOrder,
  OrderItem,
  ChatConversationSummary,
  ChatMessage,
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
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  stats: () => [...productKeys.all, "stats"] as const,
  bySeller: (sellerId: string) =>
    [...productKeys.all, "seller", sellerId] as const,
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
    queryKey: ["sellers", id],
    queryFn: () => usersApi.getSellerById(id),
    enabled: !!id,
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
      queryClient.invalidateQueries({ queryKey: ["sellers", updatedUser.id] });
    },
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
export function useProducts(params?: Parameters<typeof productsApi.getAll>[0]) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.getAll(params),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsApi.getOne(id),
    enabled: !!id,
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
  lists: () => [...voucherKeys.all, "list"] as const,
  details: () => [...voucherKeys.all, "detail"] as const,
  detail: (id: string) => [...voucherKeys.details(), id] as const,
  byCode: (code: string) => [...voucherKeys.all, "code", code] as const,
};

export function useVouchers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: voucherKeys.lists(),
    queryFn: () => vouchersApi.getAll(params),
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

export const flashSaleKeys = {
  all: ["flash-sales"] as const,
  lists: () => [...flashSaleKeys.all, "list"] as const,
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
    }: {
      productId: string;
      quantity?: number;
    }) => cartApi.addItem(productId, quantity || 1),
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
    }: {
      productId: string;
      quantity: number;
    }) => cartApi.updateItem(productId, quantity),
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

export function useSendCustomOrderOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      customOrderId,
      message,
    }: {
      conversationId: string;
      customOrderId: string;
      message: string;
    }) =>
      chatApi.sendCustomOrderOffer(conversationId, { customOrderId, message }),
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "messages", variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "conversations"],
      });
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
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "messages", conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, "conversations"],
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
    },
  });
}

// Order hooks
export const orderKeys = {
  all: ["orders"] as const,
  mine: () => [...orderKeys.all, "mine"] as const,
  seller: () => [...orderKeys.all, "seller"] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

export function useMySubOrders() {
  return useQuery({
    queryKey: orderKeys.mine(),
    queryFn: () => ordersApi.getMyOrders(),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.getOrder(id) as Promise<Order>,
    enabled: !!id,
  });
}

export function useSubOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.getSubOrder(id),
    enabled: !!id,
  });
}

export function useSellerOrders() {
  return useQuery({
    queryKey: orderKeys.seller(),
    queryFn: () => ordersApi.getSellerOrders(),
  });
}

export function useUpdateSubOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      ordersApi.updateSubOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// Custom Order hooks
export function useCreateCustomOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CustomOrder>) => customOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customOrders"] });
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

export function useSellerRevenueOverTime(startDate: string, endDate: string) {
  return useQuery({
    queryKey: analyticsKeys.revenueOverTime({ startDate, endDate }),
    queryFn: () => analyticsApi.getSellerRevenueOverTime(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useSellerRevenueByCategory(month: number, year: number) {
  return useQuery({
    queryKey: analyticsKeys.revenueByCategory({ month, year }),
    queryFn: () => analyticsApi.getSellerRevenueByCategory(month, year),
    enabled: !!month && !!year,
  });
}

// Reviews hooks
export const reviewKeys = {
  all: ["reviews"] as const,
  product: (productId: string) => [...reviewKeys.all, "product", productId] as const,
  seller: () => [...reviewKeys.all, "seller"] as const,
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
    mutationFn: (data: any) => reviewsApi.createReview(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.product(variables.productId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useSellerReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { reviewId: string; reply: string; productId: string }) => 
      reviewsApi.sellerReply(data.reviewId, data.reply),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.product(variables.productId) });
    },
  });
}

export type { ChatConversationSummary, ChatMessage };

import {
  Prisma,
  CustomOrderStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

export type ProductWithImages = Prisma.ProductGetPayload<{
  include: {
    images: true;
    category: true;
    seller: { select: { id: true; name: true; shopName: true; avatar: true } };
  };
}>;

export interface PricingDetails {
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  flashSaleId: string | null;
}

export interface EnrichedCartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product: ProductWithImages;
  pricing: PricingDetails;
}

export interface EnrichedCart {
  id: string;
  userId: string;
  items: EnrichedCartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  appliedVoucher: {
    code: string;
    discountAmount: number;
    discountPercent: number;
  } | null;
}

export interface UnifiedOrder {
  id: string;
  orderId: string;
  sellerId: string;
  seller: {
    id: true;
    name: true;
    shopName: true;
    avatar: true;
  };
  subTotal: number | Decimal;
  status: OrderStatus | CustomOrderStatus;
  createdAt: Date;
  updatedAt: Date;
  type: 'STANDARD' | 'CUSTOM';
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number | Decimal;
    product: {
      name: string;
      images: Array<{ url: string; isMain: boolean }>;
    };
  }>;
  order: {
    createdAt: Date;
    shippingAddress: any;
    paymentMethod?: PaymentMethod | null;
    paymentStatus?: PaymentStatus | null;
    customer?: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
  };
}

import { Decimal } from '@prisma/client/runtime/library';

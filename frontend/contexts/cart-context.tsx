"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useCart, useAddToCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from "@/lib/api/hooks";
import type { CartItem } from "@/types";

export interface AppliedVoucher {
  code: string;
  discountAmount: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  isLoading: boolean;
  appliedVoucher: AppliedVoucher | null;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setAppliedVoucher: (voucher: AppliedVoucher | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data: cart, isLoading } = useCart(isAuthenticated);
  const addToCartMutation = useAddToCart();
  const updateCartItemMutation = useUpdateCartItem();
  const removeCartItemMutation = useRemoveCartItem();
  const clearCartMutation = useClearCart();

  const items = useMemo(() => cart?.items || [], [cart]);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  const subtotal = cart?.subtotal || 0;
  const discountAmount = cart?.discountAmount || 0;
  const total = cart?.total || 0;
  const appliedVoucher = cart?.appliedVoucher || null;

  const addItem = async (productId: string, quantity = 1) => {
    await addToCartMutation.mutateAsync({ productId, quantity });
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    await updateCartItemMutation.mutateAsync({ productId, quantity });
  };

  const removeItem = async (productId: string) => {
    await removeCartItemMutation.mutateAsync(productId);
  };

  const clearCartFn = async () => {
    await clearCartMutation.mutateAsync();
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        discountAmount,
        total,
        isLoading,
        appliedVoucher,
        addItem,
        updateQuantity,
        removeItem,
        clearCart: clearCartFn,
        setAppliedVoucher: () => {}, // Handled by separate mutations in components
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}

"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  useAddToCart,
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlistStatus,
} from "@/lib/api/hooks";

interface ProductCardActionsProps {
  productId: string;
  stock?: number;
}

export function ProductCardActions({ productId, stock }: ProductCardActionsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: wishlistStatus } = useWishlistStatus(productId, isAuthenticated);
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const addToCart = useAddToCart();

  const isWishlisted = Boolean(wishlistStatus?.isWishlisted);
  const isWishlistUpdating =
    addToWishlist.isPending || removeFromWishlist.isPending;
  const isOutOfStock = typeof stock === "number" && stock <= 0;

  const stopCardClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const requireLogin = () => {
    window.location.href = `/login?redirect=/products/${productId}`;
  };

  const handleWishlistToggle = async (event: React.MouseEvent) => {
    stopCardClick(event);

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    try {
      if (isWishlisted) {
        await removeFromWishlist.mutateAsync(productId);
        toast.success("Đã bỏ sản phẩm khỏi danh sách yêu thích.");
      } else {
        await addToWishlist.mutateAsync(productId);
        toast.success("Đã thêm sản phẩm vào danh sách yêu thích.");
      }
    } catch {
      toast.error("Không thể cập nhật danh sách yêu thích lúc này.");
    }
  };

  const handleAddToCart = async (event: React.MouseEvent) => {
    stopCardClick(event);

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    if (isOutOfStock) {
      toast.error("Sản phẩm hiện đã hết hàng.");
      return;
    }

    try {
      await addToCart.mutateAsync({ productId, quantity: 1 });
      toast.success("Đã thêm sản phẩm vào giỏ hàng.");
    } catch {
      toast.error("Không thể thêm sản phẩm vào giỏ hàng lúc này.");
    }
  };

  return (
    <>
      <button
        type="button"
        aria-pressed={isWishlisted}
        aria-label={
          isWishlisted
            ? "Bỏ khỏi danh sách yêu thích"
            : "Thêm vào danh sách yêu thích"
        }
        onClick={handleWishlistToggle}
        disabled={isWishlistUpdating}
        className={`absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-wait disabled:opacity-70 ${
          isWishlisted
            ? "border-primary text-primary"
            : "border-border/40 text-foreground hover:text-primary"
        }`}
      >
        {isWishlistUpdating ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Heart className="h-5 w-5" fill={isWishlisted ? "currentColor" : "none"} />
        )}
      </button>

      <div className="absolute inset-x-4 bottom-4 z-20 flex translate-y-3 items-center gap-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            stopCardClick(event);
            router.push(`/products/${productId}`);
          }}
          className="flex h-11 flex-1 items-center justify-center rounded-md bg-background/95 px-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-primary hover:text-primary-foreground"
        >
          Chi tiết
        </button>
        <button
          type="button"
          aria-label="Thêm vào giỏ hàng"
          onClick={handleAddToCart}
          disabled={addToCart.isPending || isOutOfStock}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {addToCart.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ShoppingBag className="h-5 w-5" />
          )}
        </button>
      </div>
    </>
  );
}

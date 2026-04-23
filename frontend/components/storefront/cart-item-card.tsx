"use client";

import Image from "next/image";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { Product, ProductImage } from "@/types";

function getProductImageUrl(product: Product): string {
  const mainImage = product.images?.find((img: ProductImage) => img.isMain);
  const firstImage = product.images?.[0];
  const imageUrl = mainImage?.url || firstImage?.url || "";

  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
  return `${apiBase}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

interface CartItemCardProps {
  item: { 
    productId: string; 
    product: Product; 
    quantity: number;
    pricing: {
      originalPrice: number;
      discountedPrice: number;
      discountPercent: number;
      flashSaleId: string | null;
    };
  };
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const imageUrl = getProductImageUrl(item.product);
  const isFlashSale = item.pricing.discountPercent > 0;

  const handleQuantityChange = async (delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1 || newQty > item.product.stock) return;
    setIsUpdating(true);
    try {
      await onUpdateQuantity(item.productId, newQty);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 bg-muted/50 p-6 rounded-xl transition-all duration-300 hover:shadow-[0_20px_40px_rgba(84,67,60,0.04)]">
      <div className="w-full md:w-48 h-64 md:h-48 overflow-hidden rounded-lg bg-accent flex-shrink-0 relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-12 h-12 opacity-30" />
          </div>
        )}
        {isFlashSale && (
          <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-widest shadow-lg">
            -{item.pricing.discountPercent}% OFF
          </div>
        )}
      </div>

      <div className="flex-grow flex flex-col justify-between py-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-headline font-bold text-foreground mb-2 tracking-tight">
              {item.product.name}
            </h3>
            <p className="text-secondary-foreground font-medium mb-4">
              {item.product.category?.name || "Tác phẩm Thủ công"}
            </p>
          </div>
          <button
            onClick={() => onRemove(item.productId)}
            className="text-border hover:text-destructive transition-colors p-1"
            aria-label={`Xóa ${item.product.name}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center bg-accent rounded-full px-4 py-2 gap-4">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={item.quantity <= 1 || isUpdating}
              className="text-foreground disabled:opacity-30 transition-opacity"
              aria-label="Giảm số lượng"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-sans font-semibold w-10 text-center tabular-nums">
              {item.quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={item.quantity >= item.product.stock || isUpdating}
              className="text-foreground disabled:opacity-30 transition-opacity"
              aria-label="Tăng số lượng"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col items-end">
            {isFlashSale && (
              <span className="text-xs text-muted-foreground line-through mb-1">
                {formatCurrency(item.pricing.originalPrice * item.quantity)}
              </span>
            )}
            <span className="text-xl font-sans font-bold text-primary">
              {formatCurrency(item.pricing.discountedPrice * item.quantity)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

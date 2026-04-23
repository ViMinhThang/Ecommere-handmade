import { Plus, Minus, Check, ShoppingBag, MessageSquare, MessageCircle } from "lucide-react";
import { Product } from "@/lib/api/products";

interface ProductActionsProps {
  product: Product;
  quantity: number;
  setQuantity: (q: number) => void;
  onAddToCart: () => void;
  isAdding: boolean;
  addedSuccess: boolean;
  onOpenChat: (sellerId: string, productId: string) => void;
}

export function ProductActions({
  product,
  quantity,
  setQuantity,
  onAddToCart,
  isAdding,
  addedSuccess,
  onOpenChat,
}: ProductActionsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Quantity Selector */}
      {product.stock > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">Số lượng:</span>
          <div className="flex items-center bg-accent rounded-full px-4 py-2 gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="text-foreground disabled:opacity-30 transition-opacity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-sans font-semibold w-6 text-center tabular-nums">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              disabled={quantity >= product.stock}
              className="text-foreground disabled:opacity-30 transition-opacity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={onAddToCart}
        disabled={product.stock <= 0 || isAdding}
        className={`w-full py-5 rounded-md font-bold tracking-wide shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center gap-3 ${
          addedSuccess
          ? "bg-secondary text-secondary-foreground"
          : product.stock > 0 
          ? "bg-linear-to-br from-primary to-[#a44e39] text-primary-foreground hover:shadow-primary/20 active:scale-[0.98]"
          : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {addedSuccess ? (
          <><Check className="w-5 h-5" /> Đã thêm vào giỏ hàng</>
        ) : isAdding ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : product.stock > 0 ? (
          <><ShoppingBag className="w-5 h-5" /> Thêm vào giỏ hàng</>
        ) : (
          "Hết hàng"
        )}
      </button>
      
      <button
        type="button"
        onClick={() => onOpenChat(product.sellerId, product.id)}
        className="w-full py-5 rounded-md border border-primary/40 text-primary font-bold tracking-widest uppercase text-[10px] transition-all hover:bg-primary/5 active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        Yêu cầu tùy chỉnh
      </button>

      <button
        type="button"
        onClick={() => onOpenChat(product.sellerId, product.id)}
        className="w-full py-3 rounded-md text-muted-foreground hover:text-primary text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        Hỏi về sản phẩm
      </button>
    </div>
  );
}

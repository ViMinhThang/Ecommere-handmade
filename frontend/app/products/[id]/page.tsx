"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Clock, History, Leaf, Palette, PencilLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { useProduct, useProductReviews } from "@/lib/api/hooks";
import { Product } from "@/lib/api/products";
import { mediaApi } from "@/lib/api/media";
import { useCartContext } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { productsApi } from "@/lib/api/products";
import { ProductInfo } from "@/features/product/components/product-info";
import { ProductActions } from "@/features/product/components/product-actions";
import { ProductStory } from "@/features/product/components/product-story";
import { ProductReviews } from "@/features/product/components/product-reviews";
import { ProductQuestionsSection } from "@/features/product/components/product-questions";
import { RelatedProducts } from "@/features/product/components/related-products";
import { ShippingEtaNote } from "@/components/storefront/shipping-eta-note";
import { ShopPoliciesNote } from "@/components/storefront/shop-policies-note";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ProductReviewList = Parameters<typeof ProductReviews>[0]["reviews"];

function OptionPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div>
      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/60"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: product, isLoading, error } = useProduct(id!);
  const { data: reviews, isLoading: isReviewsLoading } = useProductReviews(id!);

  useEffect(() => {
    if (product?.id) {
      const viewedKey = `viewed_product_${product.id}`;
      if (!sessionStorage.getItem(viewedKey)) {
        productsApi.recordView(product.id).catch(console.error);
        sessionStorage.setItem(viewedKey, "true");
      }
    }
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground font-body">
        <CustomerNavBar />
        <main className="pt-24 min-h-screen grid place-items-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
            <p className="text-muted-foreground font-headline italic">
              Đang tải dữ liệu sản phẩm...
            </p>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground font-body">
        <CustomerNavBar />
        <main className="pt-24 min-h-screen grid place-items-center">
          <div className="text-center">
            <h1 className="text-4xl font-headline italic text-primary mb-4">
              Không tìm thấy sản phẩm
            </h1>
            <p className="text-muted-foreground mb-8">
              Sản phẩm này hiện không còn trong cửa hàng của chúng tôi.
            </p>
            <Link
              href="/"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-md tracking-wide"
            >
              Quay lại Trang chủ
            </Link>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  const artisanImage = product.seller?.avatar
    ? mediaApi.getImageUrl(product.seller.avatar)
    : null;

  return (
    <ProductDetailContent
      product={product}
      artisanImage={artisanImage}
      reviews={reviews || []}
      isReviewsLoading={isReviewsLoading}
    />
  );
}

function ProductDetailContent({
  product,
  artisanImage,
  reviews,
  isReviewsLoading,
}: {
  product: Product;
  artisanImage: string | null;
  reviews: ProductReviewList;
  isReviewsLoading: boolean;
}) {
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCartContext();
  const { openChat } = useChat();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [personalizationText, setPersonalizationText] = useState("");
  const [personalizationError, setPersonalizationError] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [optionError, setOptionError] = useState("");

  const personalizationEnabled = Boolean(product.personalizationEnabled);
  const personalizationRequired = Boolean(product.personalizationRequired);
  const personalizationMaxLength = Math.min(
    500,
    Math.max(1, Number(product.personalizationMaxLength || 120)),
  );
  const optionColors = useMemo(
    () => (product.optionColors || []).filter((item) => item.trim().length > 0),
    [product.optionColors],
  );
  const optionMaterials = useMemo(
    () => (product.optionMaterials || []).filter((item) => item.trim().length > 0),
    [product.optionMaterials],
  );
  const optionSizes = useMemo(
    () => (product.optionSizes || []).filter((item) => item.trim().length > 0),
    [product.optionSizes],
  );
  const processingTime = product.processingTime?.trim() || "";
  const hasProductOptions =
    optionColors.length > 0 ||
    optionMaterials.length > 0 ||
    optionSizes.length > 0 ||
    processingTime.length > 0;

  const averageRating = useMemo(() => {
    if (!reviews?.length) return 0;
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  const buildSelectedOptions = () => {
    if (!hasProductOptions) {
      return undefined;
    }

    if (optionColors.length > 0 && !selectedColor) {
      setOptionError("Vui lòng chọn màu sắc.");
      return null;
    }

    if (optionMaterials.length > 0 && !selectedMaterial) {
      setOptionError("Vui lòng chọn chất liệu.");
      return null;
    }

    if (optionSizes.length > 0 && !selectedSize) {
      setOptionError("Vui lòng chọn kích thước.");
      return null;
    }

    return {
      ...(selectedColor ? { color: selectedColor } : {}),
      ...(selectedMaterial ? { material: selectedMaterial } : {}),
      ...(selectedSize ? { size: selectedSize } : {}),
      ...(processingTime ? { processingTime } : {}),
    };
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/products/${product.id}`;
      return;
    }

    const trimmedPersonalization = personalizationText.trim();
    if (personalizationEnabled) {
      if (personalizationRequired && !trimmedPersonalization) {
        setPersonalizationError("Vui lòng nhập nội dung cá nhân hóa.");
        return;
      }

      if (trimmedPersonalization.length > personalizationMaxLength) {
        setPersonalizationError(
          `Nội dung cá nhân hóa không được vượt quá ${personalizationMaxLength} ký tự.`,
        );
        return;
      }
    }

    const selectedOptions = buildSelectedOptions();
    if (selectedOptions === null) {
      return;
    }

    setIsAdding(true);
    try {
      await addItem(
        product.id,
        quantity,
        personalizationEnabled && trimmedPersonalization
          ? { text: trimmedPersonalization }
          : undefined,
        selectedOptions,
      );
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể thêm sản phẩm vào giỏ hàng.";
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="pt-32 pb-24 min-h-screen">
        <section className="max-w-[1600px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7">
            <ProductGallery
              images={product.images || []}
              productName={product.name}
            />
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-10">
            <ProductInfo
              product={product}
              averageRating={averageRating}
              reviewsCount={reviews.length}
            />

            <div className="space-y-4 pt-4">
              <ShippingEtaNote profile={product.shippingProfile} />
              <ShopPoliciesNote seller={product.seller} compact />

              <div className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border/20 shadow-[0_4px_20px_rgba(84,67,60,0.04)]">
                <Leaf className="text-primary w-6 h-6 stroke-[1.5]" />
                <div>
                  <p className="text-sm font-bold text-foreground font-body">
                    Nguồn gốc bền vững
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nguyên liệu đạo đức, chế tác tỉ mỉ.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border/20 shadow-[0_4px_20px_rgba(84,67,60,0.04)]">
                <History className="text-primary w-6 h-6 stroke-[1.5]" />
                <div>
                  <p className="text-sm font-bold text-foreground font-body">
                    Độc bản duy nhất
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sản phẩm chất lượng cao, độc đáo và tinh tế.
                  </p>
                </div>
              </div>
            </div>

            {hasProductOptions && (
              <div className="rounded-xl border border-amber-700/15 bg-amber-50/70 p-5">
                <div className="mb-4 flex items-start gap-3">
                  <Palette className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Tùy chọn sản phẩm
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Chọn màu, chất liệu hoặc kích thước trước khi thêm vào giỏ.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <OptionPicker
                    label="Màu sắc"
                    options={optionColors}
                    value={selectedColor}
                    onChange={(value) => {
                      setSelectedColor(value);
                      setOptionError("");
                    }}
                  />
                  <OptionPicker
                    label="Chất liệu"
                    options={optionMaterials}
                    value={selectedMaterial}
                    onChange={(value) => {
                      setSelectedMaterial(value);
                      setOptionError("");
                    }}
                  />
                  <OptionPicker
                    label="Kích thước"
                    options={optionSizes}
                    value={selectedSize}
                    onChange={(value) => {
                      setSelectedSize(value);
                      setOptionError("");
                    }}
                  />

                  {processingTime && (
                    <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2 text-sm text-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium">Thời gian làm:</span>
                      <span>{processingTime}</span>
                    </div>
                  )}

                  {optionError && (
                    <p className="text-xs text-destructive">{optionError}</p>
                  )}
                </div>
              </div>
            )}

            {personalizationEnabled && (
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-5">
                <div className="mb-4 flex items-start gap-3">
                  <PencilLine className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Cá nhân hóa sản phẩm
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.personalizationInstructions ||
                        "Nhập nội dung shop cần dùng để cá nhân hóa sản phẩm."}
                    </p>
                  </div>
                </div>
                <Label htmlFor="personalizationText">
                  Nội dung cá nhân hóa
                  {personalizationRequired ? " *" : ""}
                </Label>
                <Textarea
                  id="personalizationText"
                  value={personalizationText}
                  maxLength={personalizationMaxLength}
                  onChange={(event) => {
                    setPersonalizationText(event.target.value);
                    setPersonalizationError("");
                  }}
                  placeholder="Ví dụ: Khắc tên An, màu chữ nâu, kèm lời nhắn tặng sinh nhật."
                  className="mt-2 min-h-28 bg-background"
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <p className="text-destructive">{personalizationError}</p>
                  <p className="ml-auto text-muted-foreground">
                    {personalizationText.length}/{personalizationMaxLength} ký tự
                  </p>
                </div>
              </div>
            )}

            <ProductActions
              product={product}
              quantity={quantity}
              setQuantity={setQuantity}
              onAddToCart={handleAddToCart}
              isAdding={isAdding}
              addedSuccess={addedSuccess}
              onOpenChat={openChat}
              isAuthenticated={isAuthenticated}
            />

            <div className="border-t border-border/30 pt-8 space-y-6">
              <details className="group">
                <summary className="list-none flex justify-between items-center cursor-pointer select-none">
                  <span className="font-bold text-foreground tracking-tight hover:text-primary transition-colors">
                    Kích thước & Bảo quản
                  </span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
                </summary>
                <div className="pt-4 text-muted-foreground text-sm leading-relaxed space-y-2 font-body animate-in slide-in-from-top-2 fade-in duration-300">
                  <p>Mã sản phẩm: {product.sku || "N/A"}</p>
                  <p>
                    Khuyên dùng giặt hoặc rửa tay để bảo toàn độ hoàn thiện và
                    tính nguyên bản theo thời gian.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </section>

        <ProductStory product={product} artisanImage={artisanImage} />

        <ProductReviews
          reviews={reviews}
          averageRating={averageRating}
          isReviewsLoading={isReviewsLoading}
        />

        <ProductQuestionsSection
          productId={product.id}
          sellerId={product.sellerId}
          currentUser={user}
          isAuthenticated={isAuthenticated}
        />

        <RelatedProducts
          categoryId={product.categoryId}
          categorySlug={product.category?.slug}
          currentProductId={product.id}
        />
      </main>

      <CustomerFooter />
    </div>
  );
}

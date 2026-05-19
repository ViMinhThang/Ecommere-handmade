"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useSeller,
  useProducts,
  useUpdateProfile,
  useCreateReport,
} from "@/lib/api/hooks";
import { useAuth } from "@/contexts/auth-context";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { formatCurrency } from "@/lib/utils";
import { mediaApi } from "@/lib/api/media";
import { SafeImage } from "@/components/ui/safe-image";
import {
  Edit2,
  Save,
  X,
  Camera,
  MessageCircle,
  ChevronDown,
  Flag,
} from "lucide-react";
import { ImageSelector } from "@/components/dashboard/image-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChat } from "@/contexts/chat-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type SellerProfileFormData = {
  sellerTitle: string;
  sellerBio: string;
  sellerAbout: string;
  sellerHeroImage: string;
  sellerAboutImage: string;
  sellerStat1Label: string;
  sellerStat1Value: string;
  sellerStat2Label: string;
  sellerStat2Value: string;
};

type SelectedImage = {
  id: string;
  path: string;
  displayName: string;
  url: string;
  isMain?: boolean;
};

const emptySellerProfileFormData: SellerProfileFormData = {
  sellerTitle: "",
  sellerBio: "",
  sellerAbout: "",
  sellerHeroImage: "",
  sellerAboutImage: "",
  sellerStat1Label: "",
  sellerStat1Value: "",
  sellerStat2Label: "",
  sellerStat2Value: "",
};

function SellerProfilePageContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { openChat } = useChat();
  const [isEditMode, setIsEditMode] = useState(false);

  // Parse filters from URL
  const minPrice = searchParams.get("minPrice")
    ? Number(searchParams.get("minPrice"))
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? Number(searchParams.get("maxPrice"))
    : undefined;
  const readyToShip = searchParams.get("readyToShip") === "true";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";

  const { data: seller, isLoading: sellerLoading } = useSeller(id as string);
  const { data: productsData, isLoading: productsLoading } = useProducts({
    sellerId: id as string,
    status: "APPROVED",
    minPrice,
    maxPrice,
    readyToShip,
    sortBy,
    order,
  });

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    router.push(`/sellers/${id}`, { scroll: false });
  };

  const isPriceSelected = (min?: number, max?: number) => {
    return minPrice === min && maxPrice === max;
  };

  const updateProfileMutation = useUpdateProfile();
  const createReportMutation = useCreateReport();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  const sellerFormData: SellerProfileFormData = seller
    ? {
        sellerTitle: seller.sellerTitle || "Người bán",
        sellerBio:
          seller.sellerBio ||
          "Thông tin mô tả về người bán đang được cập nhật.",
        sellerAbout:
          seller.sellerAbout ||
          "Câu chuyện về hành trình sáng tạo và tâm huyết gửi gắm trong từng tác phẩm.",
        sellerHeroImage: seller.sellerHeroImage || "",
        sellerAboutImage: seller.sellerAboutImage || "",
        sellerStat1Label: seller.sellerStat1Label || "Năm kinh nghiệm",
        sellerStat1Value: seller.sellerStat1Value || "0",
        sellerStat2Label: seller.sellerStat2Label || "Tác phẩm",
        sellerStat2Value: seller.sellerStat2Value || "0",
      }
    : emptySellerProfileFormData;

  const [formDraft, setFormDraft] = useState<{
    sellerId: string;
    values: SellerProfileFormData;
  } | null>(null);

  const formData =
    formDraft && formDraft.sellerId === id ? formDraft.values : sellerFormData;

  const updateFormData = (values: SellerProfileFormData) => {
    setFormDraft({ sellerId: id as string, values });
  };

  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);
  const [activeImageField, setActiveImageField] = useState<
    "hero" | "about" | null
  >(null);

  const isOwner = user?.id === id;

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync(formData);
      setIsEditMode(false);
      toast.success("Hồ sơ đã được cập nhật thành công!");
    } catch {
      toast.error("Không thể cập nhật hồ sơ. Vui lòng thử lại.");
    }
  };

  const handleSubmitReport = async () => {
    if (!seller) {
      return;
    }

    if (!reportReason.trim()) {
      toast.error("Vui lòng nhập lý do báo cáo.");
      return;
    }

    try {
      await createReportMutation.mutateAsync({
        type: "SHOP",
        targetUserId: seller.id,
        reason: reportReason,
        description: reportDescription || undefined,
      });
      setReportReason("");
      setReportDescription("");
      setIsReportDialogOpen(false);
      toast.success("Đã gửi báo cáo gian hàng.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể gửi báo cáo.",
      );
    }
  };

  const openImageSelector = (field: "hero" | "about") => {
    setActiveImageField(field);
    setIsImageSelectorOpen(true);
  };

  const handleImageSelection = (images: SelectedImage[]) => {
    if (images.length > 0) {
      const url = images[0].url;
      if (activeImageField === "hero") {
        updateFormData({ ...formData, sellerHeroImage: url });
      } else if (activeImageField === "about") {
        updateFormData({ ...formData, sellerAboutImage: url });
      }
    }
    setIsImageSelectorOpen(false);
  };

  if (sellerLoading) {
    return (
      <div className="min-h-screen bg-[#fdf9f3] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-[#fdf9f3] flex items-center justify-center">
        <p className="text-xl font-headline italic">
          Không tìm thấy thông tin người bán.
        </p>
      </div>
    );
  }

  const products = productsData?.data || [];

  return (
    <div className="min-h-screen bg-[#fdf9f3] text-[#1c1c18] font-body">
      <CustomerNavBar />

      <main className="pt-24">
        {/* Owner Controls */}
        {isOwner && (
          <div className="fixed bottom-8 right-8 z-60 flex flex-col gap-4">
            {!isEditMode ? (
              <Button
                onClick={() => setIsEditMode(true)}
                className="rounded-full w-14 h-14 bg-primary shadow-xl hover:scale-110 transition-transform"
              >
                <Edit2 className="w-6 h-6 text-white" />
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setFormDraft(null);
                    setIsEditMode(false);
                  }}
                  variant="outline"
                  className="rounded-full w-14 h-14 bg-white border-primary shadow-xl hover:scale-110 transition-transform"
                >
                  <X className="w-6 h-6 text-primary" />
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending}
                  className="rounded-full w-14 h-14 bg-green-600 shadow-xl hover:scale-110 transition-transform"
                >
                  <Save className="w-6 h-6 text-white" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Hero Section */}
        <section className="px-8 md:px-12 py-12 md:py-24 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-3/5 order-2 md:order-1">
            <div className="relative group">
              <div className="overflow-hidden rounded-lg shadow-2xl aspect-4/5 relative bg-accent">
                {formData.sellerHeroImage ? (
                  <SafeImage
                    src={formData.sellerHeroImage}
                    alt={seller.name}
                    fill
                    priority
                    sizes="(min-width: 768px) 60vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#d8cdbd]">
                    <div className="absolute inset-6 rounded-md border border-white/50" />
                    <Camera className="h-14 w-14 text-primary/35" aria-hidden="true" />
                  </div>
                )}
                {isEditMode && (
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openImageSelector("hero")}
                  >
                    <div className="flex flex-col items-center text-white">
                      <Camera className="w-10 h-10 mb-2" />
                      <span className="text-sm font-bold uppercase tracking-widest">
                        Thay đổi ảnh bìa
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-6 -right-6 md:-right-12 bg-white p-8 rounded-lg shadow-lg max-w-xs hidden md:block">
                <p className="font-headline italic text-primary text-lg">
                  &ldquo;Mỗi tác phẩm là một câu chuyện, mỗi đường nét là một
                  tâm tình.&rdquo;
                </p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/5 order-1 md:order-2 space-y-8">
            <div className="space-y-4">
              {isEditMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="seller-title"
                      className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground"
                    >
                      Chức danh
                    </label>
                    <Input
                      id="seller-title"
                      name="seller-title"
                      value={formData.sellerTitle}
                      onChange={(e) =>
                        updateFormData({
                          ...formData,
                          sellerTitle: e.target.value,
                        })
                      }
                      placeholder="VD: Người bán Gốm sứ"
                      className="bg-white/50 border-primary/20"
                    />
                  </div>
                  <h1 className="text-5xl md:text-7xl text-primary leading-tight font-headline italic">
                    {seller.name}
                  </h1>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="uppercase tracking-[0.2em] text-xs font-semibold text-[#516351]">
                    {formData.sellerTitle}
                  </span>
                  <h1 className="text-5xl md:text-7xl text-primary leading-tight font-headline italic">
                    {seller.name}
                  </h1>
                </div>
              )}
            </div>

            {isEditMode ? (
              <div className="space-y-2">
                <label
                  htmlFor="seller-bio"
                  className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground"
                >
                  Giới thiệu ngắn
                </label>
                <Textarea
                  id="seller-bio"
                  name="seller-bio"
                  value={formData.sellerBio}
                  onChange={(e) =>
                    updateFormData({ ...formData, sellerBio: e.target.value })
                  }
                  placeholder="Mô tả ngắn gọn về bạn và nghệ thuật của bạn..."
                  className="bg-white/50 border-primary/20 h-32"
                />
              </div>
            ) : (
              <p className="text-[#54433c] text-lg leading-relaxed font-light">
                {formData.sellerBio}
              </p>
            )}

            <div className="flex gap-4">
              <button className="bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 transition-all shadow-md font-bold text-sm tracking-wide">
                Theo dõi Studio
              </button>
              <Button
                variant="outline"
                onClick={() => openChat(seller.id)}
                className="bg-[#ebe8e2] text-primary px-8 py-3 rounded-md hover:bg-[#e6e2dc] transition-all font-bold text-sm tracking-wide h-auto border-none"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Lien he
              </Button>
              {user && !isOwner && (
                <Button
                  variant="outline"
                  onClick={() => setIsReportDialogOpen(true)}
                  className="bg-white/80 text-primary px-6 py-3 rounded-md hover:bg-white transition-all font-bold text-sm tracking-wide h-auto border-primary/20"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Bao cao
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* About Narrative Section */}
        <section className="bg-[#f7f3ed] py-24">
          <div className="max-w-7xl mx-auto px-8 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 space-y-8">
              <h2 className="text-4xl text-primary font-headline italic">
                Câu chuyện Người bán
              </h2>

              {isEditMode ? (
                <div className="space-y-2">
                  <label
                    htmlFor="seller-about"
                    className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground"
                  >
                    Câu chuyện chi tiết
                  </label>
                  <Textarea
                    id="seller-about"
                    name="seller-about"
                    value={formData.sellerAbout}
                    onChange={(e) =>
                      updateFormData({
                        ...formData,
                        sellerAbout: e.target.value,
                      })
                    }
                    className="bg-white/50 border-primary/20 h-64 leading-relaxed text-lg"
                  />
                </div>
              ) : (
                <div className="space-y-6 text-[#1c1c18] text-lg leading-relaxed whitespace-pre-line">
                  {formData.sellerAbout}
                </div>
              )}

              <div className="flex gap-12 pt-4">
                <div className="space-y-2">
                  {isEditMode ? (
                    <>
                      <Input
                        id="seller-stat-1-value"
                        name="seller-stat-1-value"
                        aria-label="Seller statistic one value"
                        value={formData.sellerStat1Value}
                        onChange={(e) =>
                          updateFormData({
                            ...formData,
                            sellerStat1Value: e.target.value,
                          })
                        }
                        className="bg-white/50 border-primary/20 font-headline text-2xl w-24"
                      />
                      <Input
                        id="seller-stat-1-label"
                        name="seller-stat-1-label"
                        aria-label="Seller statistic one label"
                        value={formData.sellerStat1Label}
                        onChange={(e) =>
                          updateFormData({
                            ...formData,
                            sellerStat1Label: e.target.value,
                          })
                        }
                        className="bg-white/50 border-primary/20 text-xs w-40"
                      />
                    </>
                  ) : (
                    <>
                      <span className="block text-3xl font-headline italic text-primary">
                        {formData.sellerStat1Value}
                      </span>
                      <span className="text-sm text-[#516351] uppercase tracking-widest">
                        {formData.sellerStat1Label}
                      </span>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  {isEditMode ? (
                    <>
                      <Input
                        id="seller-stat-2-value"
                        name="seller-stat-2-value"
                        aria-label="Seller statistic two value"
                        value={formData.sellerStat2Value}
                        onChange={(e) =>
                          updateFormData({
                            ...formData,
                            sellerStat2Value: e.target.value,
                          })
                        }
                        className="bg-white/50 border-primary/20 font-headline text-2xl w-24"
                      />
                      <Input
                        id="seller-stat-2-label"
                        name="seller-stat-2-label"
                        aria-label="Seller statistic two label"
                        value={formData.sellerStat2Label}
                        onChange={(e) =>
                          updateFormData({
                            ...formData,
                            sellerStat2Label: e.target.value,
                          })
                        }
                        className="bg-white/50 border-primary/20 text-xs w-40"
                      />
                    </>
                  ) : (
                    <>
                      <span className="block text-3xl font-headline italic text-primary">
                        {formData.sellerStat2Value}
                      </span>
                      <span className="text-sm text-[#516351] uppercase tracking-widest">
                        {formData.sellerStat2Label}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-5 relative group">
              <div className="aspect-square bg-[#e6e2dc] rounded-full absolute -top-10 -left-10 w-32 h-32 -z-10 opacity-50"></div>
              <div className="rounded-lg shadow-xl overflow-hidden relative aspect-square bg-accent">
                {formData.sellerAboutImage ? (
                  <SafeImage
                    src={formData.sellerAboutImage}
                    alt="Detail of craft"
                    fill
                    sizes="(min-width: 768px) 42vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#ece4d8]">
                    <div className="absolute inset-8 rounded-full border border-primary/15" />
                    <Camera className="h-10 w-10 text-primary/30" aria-hidden="true" />
                  </div>
                )}
                {isEditMode && (
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openImageSelector("about")}
                  >
                    <div className="flex flex-col items-center text-white">
                      <Camera className="w-10 h-10 mb-2" />
                      <span className="text-sm font-bold uppercase tracking-widest">
                        Thay đổi ảnh
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Collection Section */}
        <section className="py-24 px-8 md:px-12 max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Sidebar Filters */}
            <aside className="w-full lg:w-72 shrink-0">
              <div className="sticky top-32 space-y-12">
                <div>
                  <h2 className="text-4xl text-primary font-headline italic mb-4">
                    Bộ sưu tập
                  </h2>
                  <p className="text-[#54433c] text-sm leading-relaxed mb-8">
                    Khám phá các sản phẩm được chế tác thủ công bởi{" "}
                    {seller.name}.
                  </p>
                </div>

                {/* Sorting Selection */}
                <section>
                  <label
                    htmlFor="seller-collection-sort"
                    className="block text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-6"
                  >
                    Sắp xếp
                  </label>
                  <select
                    id="seller-collection-sort"
                    name="seller-collection-sort"
                    className="w-full bg-white border border-primary/20 rounded-md p-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                    value={`${sortBy}-${order}`}
                    onChange={(e) => {
                      const [newSort, newOrder] = e.target.value.split("-");
                      updateFilters({
                        sortBy: newSort,
                        order: newOrder as "asc" | "desc",
                      });
                    }}
                  >
                    <option value="createdAt-desc">Mới nhất</option>
                    <option value="price-asc">Giá: Thấp đến Cao</option>
                    <option value="price-desc">Giá: Cao đến Thấp</option>
                    <option value="soldQuantity-desc">Bán chạy nhất</option>
                  </select>
                </section>

                {/* Price Filter */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-6">
                    Khoảng giá
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "Dưới 500.000đ", min: 0, max: 500000 },
                      {
                        label: "500.000đ — 2.000.000đ",
                        min: 500000,
                        max: 2000000,
                      },
                      {
                        label: "2.000.000đ — 5.000.000đ",
                        min: 2000000,
                        max: 5000000,
                      },
                      {
                        label: "Trên 5.000.000đ",
                        min: 5000000,
                        max: undefined,
                      },
                    ].map((range) => {
                      const rangeId = `seller-price-${range.min}-${range.max ?? "up"}`;

                      return (
                        <label
                          key={range.label}
                          htmlFor={rangeId}
                          className="flex items-center group cursor-pointer"
                        >
                          <input
                            id={rangeId}
                            name="seller-price-range"
                            type="checkbox"
                            className="w-4 h-4 rounded-sm border-primary/20 text-primary focus:ring-primary/10"
                            checked={isPriceSelected(range.min, range.max)}
                            onChange={() => {
                              if (isPriceSelected(range.min, range.max)) {
                                updateFilters({ minPrice: null, maxPrice: null });
                              } else {
                                updateFilters({
                                  minPrice: range.min.toString(),
                                  maxPrice: range.max
                                    ? range.max.toString()
                                    : null,
                                });
                              }
                            }}
                          />
                          <span className="ml-3 text-sm text-[#1c1c18] group-hover:text-primary transition-colors">
                            {range.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                {/* Availability */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-6">
                    Trạng thái
                  </h3>
                  <div className="space-y-4">
                    <label
                      htmlFor="seller-ready-to-ship"
                      className="flex items-center group cursor-pointer"
                    >
                      <input
                        id="seller-ready-to-ship"
                        name="seller-ready-to-ship"
                        type="checkbox"
                        className="w-4 h-4 rounded-sm border-primary/20 text-primary focus:ring-primary/10"
                        checked={readyToShip}
                        onChange={(e) =>
                          updateFilters({
                            readyToShip: e.target.checked ? "true" : null,
                          })
                        }
                      />
                      <span className="ml-3 text-sm text-[#1c1c18]">
                        Sẵn sàng giao ngay
                      </span>
                    </label>
                  </div>
                </section>

                <div className="pt-4 border-t border-primary/10">
                  <button
                    onClick={clearFilters}
                    className="text-[10px] uppercase tracking-widest font-bold text-primary hover:opacity-70 transition-opacity flex items-center group"
                  >
                    Xóa tất cả bộ lọc
                    <X className="ml-2 w-3 h-3 transition-transform group-hover:rotate-90" />
                  </button>
                </div>
              </div>
            </aside>

            {/* Product Grid */}
            <div className="grow">
              {productsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-20 gap-x-12">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={i % 3 === 1 ? "md:mt-12" : ""}>
                      <div className="aspect-[4/5] bg-accent/50 animate-pulse rounded-lg mb-6" />
                      <div className="h-6 w-48 bg-accent/50 animate-pulse rounded mb-2" />
                      <div className="h-4 w-24 bg-accent/50 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-24 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5">
                  <p className="text-primary italic font-headline text-lg">
                    Không tìm thấy tác phẩm nào phù hợp.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-[#516351] font-bold text-sm tracking-widest uppercase hover:underline"
                  >
                    Xóa bộ lọc và thử lại
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-20 gap-x-12">
                  {products.map((product, index) => (
                    <div
                      key={product.id}
                      className={`group ${index % 3 === 1 ? "md:mt-12" : ""}`}
                    >
                      <Link href={`/products/${product.id}`}>
                        <div className="relative overflow-hidden aspect-4/5 bg-accent mb-6 rounded-lg shadow-sm border border-primary/5">
                          {product.images?.[0] ? (
                            <SafeImage
                              src={mediaApi.getImageUrl(product.images[0].url)}
                              alt={product.name}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">
                              Chưa có ảnh
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button className="px-8 py-3 bg-[#fdf9f3] text-primary font-bold text-xs tracking-widest uppercase shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                              Chi tiết
                            </button>
                          </div>
                        </div>
                      </Link>
                      <div className="flex justify-between items-start">
                        <div>
                          <Link href={`/products/${product.id}`}>
                            <h3 className="font-headline text-2xl text-primary mb-1 group-hover:text-primary/70 transition-colors italic leading-none">
                              {product.name}
                            </h3>
                          </Link>
                          <p className="text-[#516351] text-xs font-semibold uppercase tracking-widest">
                            {product.category?.name}
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-xl font-bold leading-none text-primary">
                          {formatCurrency(Number(product.price))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {products.length > 0 && (
                <div className="mt-24 flex justify-center">
                  <button className="px-12 py-4 bg-primary text-white rounded-md font-bold text-xs tracking-[0.2em] flex items-center group hover:bg-primary/90 transition-colors shadow-lg shadow-primary/10">
                    XEM THÊM TÁC PHẨM
                    <ChevronDown className="ml-3 w-4 h-4 transition-transform group-hover:translate-y-1" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <CustomerFooter />

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo cáo gian hàng</DialogTitle>
            <DialogDescription>
              Gửi thông tin để admin xem xét gian hàng này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label
                htmlFor="report-reason"
                className="text-sm font-medium text-foreground"
              >
                Lý do
              </label>
              <Input
                id="report-reason"
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                maxLength={120}
                placeholder="Ví dụ: Thông tin gian hàng gây hiểu nhầm"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="report-description"
                className="text-sm font-medium text-foreground"
              >
                Mô tả thêm
              </label>
              <Textarea
                id="report-description"
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value)}
                maxLength={2000}
                placeholder="Bổ sung bằng chứng hoặc nội dung cần admin kiểm tra"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReportDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={createReportMutation.isPending}
            >
              {createReportMutation.isPending ? "Đang gửi..." : "Gửi báo cáo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Selector Dialog */}
      {isImageSelectorOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-[#fdf9f3]">
              <h2 className="text-2xl font-headline italic text-primary">
                Chọn hình ảnh cho hồ sơ
              </h2>
              <button
                onClick={() => setIsImageSelectorOpen(false)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grow overflow-y-auto p-6">
              <ImageSelector
                userId={user?.id || ""}
                selectedImages={[]}
                onSelectionChange={handleImageSelection}
                mode="single"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fdf9f3] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SellerProfilePageContent />
    </Suspense>
  );
}

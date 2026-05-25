"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  ImagePlus,
  Infinity as InfinityIcon,
  LibraryBig,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SafeImage } from "@/components/ui/safe-image";
import { useAuth } from "@/contexts/auth-context";
import {
  useAdminHomepageBanners,
  useAdminHomepageFeaturedProducts,
  useCreateHomepageBanner,
  useCreateHomepageFeaturedProduct,
  useDeleteHomepageBanner,
  useDeleteHomepageFeaturedProduct,
  useFolders,
  useImages,
  useProducts,
  useUpdateHomepageBanner,
  useUpdateHomepageFeaturedProduct,
} from "@/lib/api/hooks";
import type {
  HomepageBanner,
  HomepageFeaturedProduct,
} from "@/lib/api/homepage";
import { mediaApi } from "@/lib/api/media";
import {
  BANNER_TEMPLATES,
  type BannerTemplate,
} from "@/lib/banner-templates";

type BannerFormState = {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: string;
  isActive: boolean;
  startAt: string;
  endAt: string;
};

const TITLE_MAX = 60;
const SUBTITLE_MAX = 160;

const emptyBannerForm: BannerFormState = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  sortOrder: "0",
  isActive: true,
  startAt: "",
  endAt: "",
};

type BannerStatus = "live" | "scheduled" | "expired" | "inactive";
type StatusFilter = BannerStatus | "all";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const STATUS_META: Record<
  BannerStatus,
  { label: string; variant: BadgeVariant; dot: string }
> = {
  live: { label: "Đang chạy", variant: "default", dot: "bg-emerald-500" },
  scheduled: { label: "Sắp tới", variant: "outline", dot: "bg-amber-500" },
  expired: { label: "Hết hạn", variant: "secondary", dot: "bg-muted-foreground" },
  inactive: { label: "Đang tắt", variant: "secondary", dot: "bg-zinc-400" },
};

function computeBannerStatus(
  banner: Pick<HomepageBanner, "isActive" | "startAt" | "endAt">,
  now: Date = new Date(),
): BannerStatus {
  if (!banner.isActive) return "inactive";
  const start = banner.startAt ? new Date(banner.startAt) : null;
  const end = banner.endAt ? new Date(banner.endAt) : null;
  if (end && now > end) return "expired";
  if (start && now < start) return "scheduled";
  return "live";
}

function toDateTimeInput(value?: string | null | Date) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function toApiDate(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function formatDate(value?: string | null) {
  if (!value) return "Không giới hạn";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateShort(value?: string | null) {
  if (!value) return "∞";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function mapBannerToForm(banner: HomepageBanner): BannerFormState {
  return {
    title: banner.title,
    subtitle: banner.subtitle || "",
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl || "",
    sortOrder: String(banner.sortOrder),
    isActive: banner.isActive,
    startAt: toDateTimeInput(banner.startAt),
    endAt: toDateTimeInput(banner.endAt),
  };
}

function getPrimaryProductImage(item: HomepageFeaturedProduct) {
  return (
    item.product.images?.find((image) => image.isMain)?.url ||
    item.product.images?.[0]?.url ||
    ""
  );
}

function StatusBadge({ status }: { status: BannerStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge
      variant={meta.variant}
      className="inline-flex items-center gap-1.5 font-medium"
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

export default function DashboardHomepagePage() {
  const { user } = useAuth();
  const [bannerForm, setBannerForm] =
    useState<BannerFormState>(emptyBannerForm);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [featuredProductId, setFeaturedProductId] = useState("");
  const [featuredSortOrder, setFeaturedSortOrder] = useState("0");
  const [imageTab, setImageTab] = useState<"library" | "upload">("library");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bannersQuery = useAdminHomepageBanners();
  const featuredQuery = useAdminHomepageFeaturedProducts();
  const productsQuery = useProducts({ status: "APPROVED", limit: 100 });
  const foldersQuery = useFolders(user?.id ?? "");
  const folders = foldersQuery.data ?? [];
  const activeFolderId = selectedFolderId || folders[0]?.id || "";
  const imagesQuery = useImages(activeFolderId);

  const createBanner = useCreateHomepageBanner();
  const updateBanner = useUpdateHomepageBanner();
  const deleteBanner = useDeleteHomepageBanner();
  const createFeaturedProduct = useCreateHomepageFeaturedProduct();
  const updateFeaturedProduct = useUpdateHomepageFeaturedProduct();
  const deleteFeaturedProduct = useDeleteHomepageFeaturedProduct();

  const banners = bannersQuery.data ?? [];
  const featuredProducts = useMemo(
    () => featuredQuery.data ?? [],
    [featuredQuery.data],
  );
  const approvedProducts = productsQuery.data?.data ?? [];
  const libraryImages = imagesQuery.data ?? [];

  const featuredProductIds = useMemo(
    () => new Set(featuredProducts.map((item) => item.productId)),
    [featuredProducts],
  );
  const selectableProducts = approvedProducts.filter(
    (product) => !featuredProductIds.has(product.id),
  );
  const activeFeaturedCount = featuredProducts.filter(
    (item) => item.isActive,
  ).length;
  const bannerPreviewImage = bannerForm.imageUrl
    ? mediaApi.getImageUrl(bannerForm.imageUrl)
    : "";

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => a.sortOrder - b.sortOrder),
    [banners],
  );

  const statusCounts = useMemo(() => {
    const now = new Date();
    return banners.reduce(
      (acc, b) => {
        const s = computeBannerStatus(b, now);
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      },
      { live: 0, scheduled: 0, expired: 0, inactive: 0 } as Record<
        BannerStatus,
        number
      >,
    );
  }, [banners]);

  const visibleBanners = useMemo(() => {
    if (statusFilter === "all") return sortedBanners;
    return sortedBanners.filter(
      (b) => computeBannerStatus(b) === statusFilter,
    );
  }, [sortedBanners, statusFilter]);

  const previewStatus = computeBannerStatus({
    isActive: bannerForm.isActive,
    startAt: bannerForm.startAt ? new Date(bannerForm.startAt).toISOString() : null,
    endAt: bannerForm.endAt ? new Date(bannerForm.endAt).toISOString() : null,
  });

  const scheduleError =
    bannerForm.startAt &&
    bannerForm.endAt &&
    new Date(bannerForm.endAt) <= new Date(bannerForm.startAt)
      ? "Thời gian kết thúc phải sau thời gian bắt đầu."
      : "";
  const titleError =
    bannerForm.title.length > TITLE_MAX
      ? `Vượt quá ${TITLE_MAX} ký tự.`
      : "";
  const subtitleError =
    bannerForm.subtitle.length > SUBTITLE_MAX
      ? `Vượt quá ${SUBTITLE_MAX} ký tự.`
      : "";

  const hasFormErrors = Boolean(
    scheduleError || titleError || subtitleError,
  );

  const resetBannerForm = () => {
    setBannerForm(emptyBannerForm);
    setEditingBannerId(null);
  };

  const handleSelectLibraryImage = (imagePath: string) => {
    setBannerForm((current) => ({ ...current, imageUrl: imagePath }));
    toast.success("Đã chọn ảnh banner từ thư viện.");
  };

  // ---------- Schedule presets ----------
  const applyPreset = (preset: "now" | "7d" | "30d" | "always") => {
    const now = new Date();
    if (preset === "always") {
      setBannerForm((c) => ({ ...c, startAt: "", endAt: "" }));
      return;
    }
    const start = toDateTimeInput(now);
    if (preset === "now") {
      setBannerForm((c) => ({ ...c, startAt: start, endAt: "" }));
      return;
    }
    const days = preset === "7d" ? 7 : 30;
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    setBannerForm((c) => ({
      ...c,
      startAt: start,
      endAt: toDateTimeInput(end),
    }));
  };

  // ---------- Apply template ----------
  const applyTemplate = (template: BannerTemplate) => {
    const now = new Date();
    const start =
      template.data.startDaysFromNow === null
        ? ""
        : toDateTimeInput(
            new Date(
              now.getTime() +
                template.data.startDaysFromNow * 24 * 60 * 60 * 1000,
            ),
          );
    const end =
      template.data.endDaysFromNow === null
        ? ""
        : toDateTimeInput(
            new Date(
              now.getTime() +
                template.data.endDaysFromNow * 24 * 60 * 60 * 1000,
            ),
          );
    setBannerForm({
      title: template.data.title,
      subtitle: template.data.subtitle,
      imageUrl: template.data.imageUrl,
      linkUrl: template.data.linkUrl,
      sortOrder: String(template.data.sortOrder),
      isActive: template.data.isActive,
      startAt: start,
      endAt: end,
    });
    setEditingBannerId(null);
    toast.success(`Đã áp dụng mẫu "${template.name}".`);
  };

  // ---------- Upload ----------
  const handleFilePick = (file: File | null) => {
    setUploadFile(file);
    if (file && !uploadName) {
      const base = file.name.replace(/\.[^.]+$/, "");
      setUploadName(base);
    }
  };

  const handleUpload = async () => {
    const folderId = uploadTargetFolderId || activeFolderId;
    if (!uploadFile) {
      toast.error("Vui lòng chọn ảnh để tải lên.");
      return;
    }
    if (!folderId) {
      toast.error("Hãy tạo thư mục ảnh trước khi upload.");
      return;
    }
    const displayName = (uploadName || uploadFile.name).trim();
    if (!displayName) {
      toast.error("Tên hiển thị không được để trống.");
      return;
    }
    setUploading(true);
    try {
      const result = await mediaApi.uploadImage(
        folderId,
        uploadFile,
        displayName,
      );
      const path =
        (result as { path?: string; url?: string })?.path ??
        (result as { url?: string })?.url ??
        "";
      if (path) {
        setBannerForm((c) => ({ ...c, imageUrl: path }));
      }
      setSelectedFolderId(folderId);
      void imagesQuery.refetch();
      setUploadFile(null);
      setUploadName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Đã tải ảnh lên thư viện.");
      setImageTab("library");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tải ảnh lên.",
      );
    } finally {
      setUploading(false);
    }
  };

  // ---------- Drag & drop ----------
  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoverIndex !== index) setHoverIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setHoverIndex(null);
  };

  const handleDrop = (index: number) => async (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex;
    setDragIndex(null);
    setHoverIndex(null);
    if (from === null || from === index) return;

    const reordered = [...visibleBanners];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(index, 0, moved);

    const changes: Array<{ id: string; sortOrder: number }> = [];
    reordered.forEach((b, i) => {
      if (b.sortOrder !== i) changes.push({ id: b.id, sortOrder: i });
    });

    if (changes.length === 0) return;

    setReordering(true);
    try {
      await Promise.all(
        changes.map((c) =>
          updateBanner.mutateAsync({
            id: c.id,
            data: { sortOrder: c.sortOrder },
          }),
        ),
      );
      toast.success(`Đã cập nhật thứ tự (${changes.length} banner).`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể đổi thứ tự.",
      );
    } finally {
      setReordering(false);
    }
  };

  // ---------- Submit ----------
  const handleSubmitBanner = async () => {
    if (!bannerForm.title.trim() || !bannerForm.imageUrl.trim()) {
      toast.error("Tiêu đề và ảnh banner là bắt buộc.");
      return;
    }
    if (hasFormErrors) {
      toast.error("Vui lòng kiểm tra lại các trường lỗi.");
      return;
    }

    const payload = {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim() || undefined,
      imageUrl: bannerForm.imageUrl.trim(),
      linkUrl: bannerForm.linkUrl.trim() || undefined,
      sortOrder: Number(bannerForm.sortOrder) || 0,
      isActive: bannerForm.isActive,
      startAt: toApiDate(bannerForm.startAt),
      endAt: toApiDate(bannerForm.endAt),
    };

    try {
      if (editingBannerId) {
        await updateBanner.mutateAsync({ id: editingBannerId, data: payload });
        toast.success("Đã cập nhật banner.");
      } else {
        await createBanner.mutateAsync(payload);
        toast.success("Đã tạo banner.");
      }
      resetBannerForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu banner.",
      );
    }
  };

  const handleEditBanner = (banner: HomepageBanner) => {
    setEditingBannerId(banner.id);
    setBannerForm(mapBannerToForm(banner));
  };

  const handleDeleteBanner = async (banner: HomepageBanner) => {
    if (!window.confirm(`Xóa banner "${banner.title}"?`)) return;

    try {
      await deleteBanner.mutateAsync(banner.id);
      toast.success("Đã xóa banner.");
      if (editingBannerId === banner.id) resetBannerForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa banner.",
      );
    }
  };

  const handleToggleBanner = async (banner: HomepageBanner) => {
    try {
      await updateBanner.mutateAsync({
        id: banner.id,
        data: { isActive: !banner.isActive },
      });
      toast.success("Đã cập nhật trạng thái banner.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật banner.",
      );
    }
  };

  const handleAddFeaturedProduct = async () => {
    if (!featuredProductId) {
      toast.error("Vui lòng chọn sản phẩm nổi bật.");
      return;
    }

    try {
      await createFeaturedProduct.mutateAsync({
        productId: featuredProductId,
        sortOrder: Number(featuredSortOrder) || 0,
        isActive: true,
      });
      setFeaturedProductId("");
      setFeaturedSortOrder("0");
      toast.success("Đã thêm sản phẩm nổi bật.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể thêm sản phẩm nổi bật.",
      );
    }
  };

  const handleUpdateFeaturedProduct = async (
    item: HomepageFeaturedProduct,
    data: { isActive?: boolean; sortOrder?: number },
  ) => {
    try {
      await updateFeaturedProduct.mutateAsync({ id: item.id, data });
      toast.success("Đã cập nhật sản phẩm nổi bật.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật sản phẩm nổi bật.",
      );
    }
  };

  const handleDeleteFeaturedProduct = async (item: HomepageFeaturedProduct) => {
    if (!window.confirm(`Xóa "${item.product.name}" khỏi trang chủ?`)) return;

    try {
      await deleteFeaturedProduct.mutateAsync(item.id);
      toast.success("Đã xóa sản phẩm nổi bật.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xóa sản phẩm nổi bật.",
      );
    }
  };

  const filterChips: Array<{
    value: StatusFilter;
    label: string;
    count: number;
  }> = [
    { value: "all", label: "Tất cả", count: banners.length },
    { value: "live", label: STATUS_META.live.label, count: statusCounts.live },
    {
      value: "scheduled",
      label: STATUS_META.scheduled.label,
      count: statusCounts.scheduled,
    },
    {
      value: "expired",
      label: STATUS_META.expired.label,
      count: statusCounts.expired,
    },
    {
      value: "inactive",
      label: STATUS_META.inactive.label,
      count: statusCounts.inactive,
    },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-2">
        <h1 className="artisan-title text-4xl">Trang chủ</h1>
        <p className="max-w-3xl text-muted-foreground">
          Quản lý hero banner và khu vực sản phẩm nổi bật hiển thị trên trang
          chủ. Các mục không hoạt động hoặc ngoài thời gian chạy sẽ không xuất
          hiện ở public homepage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Banner hero</CardTitle>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {statusCounts.live} đang chạy
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {statusCounts.scheduled} sắp tới
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                {statusCounts.expired} hết hạn
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                {statusCounts.inactive} đang tắt
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
            {/* ----- Form (3 sections) ----- */}
            <div className="space-y-6">
              {editingBannerId ? (
                <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                  <Pencil className="h-4 w-4 text-primary" />
                  <span>Đang chỉnh sửa banner. Bấm “Hủy sửa” để tạo mới.</span>
                </div>
              ) : null}

              {/* Section: Mẫu sẵn */}
              <section className="rounded-lg border bg-card/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Mẫu banner có sẵn</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Click “Dùng mẫu” để điền nhanh — bạn vẫn chỉnh sửa được
                    trước khi lưu.
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {BANNER_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="group flex gap-3 overflow-hidden rounded-md border bg-background transition hover:border-primary/40 hover:shadow-sm"
                    >
                      <div
                        className="relative h-24 w-32 shrink-0 overflow-hidden bg-muted"
                        style={{ backgroundColor: tpl.accent }}
                      >
                        <SafeImage
                          src={tpl.data.imageUrl}
                          alt={tpl.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between py-2 pr-3">
                        <div className="space-y-0.5">
                          <p className="line-clamp-1 text-sm font-semibold">
                            {tpl.name}
                          </p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {tpl.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2 w-fit"
                          onClick={() => applyTemplate(tpl)}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          Dùng mẫu
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section: Nội dung */}
              <section className="rounded-lg border bg-card/40 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Nội dung</h3>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="banner-title">Tiêu đề</Label>
                      <span
                        className={`text-xs ${
                          titleError
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {bannerForm.title.length}/{TITLE_MAX}
                      </span>
                    </div>
                    <Input
                      id="banner-title"
                      value={bannerForm.title}
                      onChange={(event) =>
                        setBannerForm({
                          ...bannerForm,
                          title: event.target.value,
                        })
                      }
                      placeholder="Bộ sưu tập handmade mùa mới"
                      aria-invalid={Boolean(titleError)}
                    />
                    {titleError ? (
                      <p className="text-xs text-destructive">{titleError}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="banner-subtitle">Mô tả</Label>
                      <span
                        className={`text-xs ${
                          subtitleError
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {bannerForm.subtitle.length}/{SUBTITLE_MAX}
                      </span>
                    </div>
                    <Textarea
                      id="banner-subtitle"
                      value={bannerForm.subtitle}
                      onChange={(event) =>
                        setBannerForm({
                          ...bannerForm,
                          subtitle: event.target.value,
                        })
                      }
                      placeholder="Thông điệp ngắn cho hero trang chủ"
                      aria-invalid={Boolean(subtitleError)}
                    />
                    {subtitleError ? (
                      <p className="text-xs text-destructive">
                        {subtitleError}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner-link">Link CTA</Label>
                    <Input
                      id="banner-link"
                      value={bannerForm.linkUrl}
                      onChange={(event) =>
                        setBannerForm({
                          ...bannerForm,
                          linkUrl: event.target.value,
                        })
                      }
                      placeholder="/discovery"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner-sort">Thứ tự</Label>
                    <Input
                      id="banner-sort"
                      type="number"
                      min={0}
                      value={bannerForm.sortOrder}
                      onChange={(event) =>
                        setBannerForm({
                          ...bannerForm,
                          sortOrder: event.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Hoặc kéo-thả dòng ở bảng bên dưới để sắp xếp nhanh.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section: Ảnh & thư viện */}
              <section className="rounded-lg border bg-card/40 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Ảnh banner</h3>
                  </div>
                  <div className="flex gap-1 rounded-md border bg-background p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setImageTab("library")}
                      className={`rounded px-3 py-1.5 transition ${
                        imageTab === "library"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LibraryBig className="mr-1.5 inline h-3.5 w-3.5" />
                      Thư viện
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageTab("upload")}
                      className={`rounded px-3 py-1.5 transition ${
                        imageTab === "upload"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Upload className="mr-1.5 inline h-3.5 w-3.5" />
                      Upload mới
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-image">URL ảnh đang chọn</Label>
                  <Input
                    id="banner-image"
                    value={bannerForm.imageUrl}
                    onChange={(event) =>
                      setBannerForm({
                        ...bannerForm,
                        imageUrl: event.target.value,
                      })
                    }
                    placeholder="https://... hoặc uploads/..."
                  />
                </div>

                <div className="mt-4">
                  {imageTab === "upload" ? (
                    <div className="space-y-3 rounded-md border border-dashed p-4">
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="upload-folder">Thư mục đích</Label>
                          <Select
                            value={uploadTargetFolderId || activeFolderId}
                            onValueChange={(value) =>
                              setUploadTargetFolderId(value ?? "")
                            }
                          >
                            <SelectTrigger id="upload-folder">
                              <SelectValue placeholder="Chọn thư mục" />
                            </SelectTrigger>
                            <SelectContent>
                              {folders.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  Chưa có thư mục
                                </SelectItem>
                              ) : (
                                folders.map((folder) => (
                                  <SelectItem key={folder.id} value={folder.id}>
                                    {folder.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="upload-name">Tên hiển thị</Label>
                          <Input
                            id="upload-name"
                            value={uploadName}
                            onChange={(e) => setUploadName(e.target.value)}
                            placeholder="banner-mua-he"
                          />
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed bg-background px-3 py-2 text-sm hover:bg-muted/50">
                        <span className="flex items-center gap-2">
                          <ImagePlus className="h-4 w-4 text-primary" />
                          {uploadFile ? (
                            <span className="truncate font-medium">
                              {uploadFile.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Bấm để chọn ảnh từ máy
                            </span>
                          )}
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFilePick(e.target.files?.[0] ?? null)
                          }
                        />
                        {uploadFile ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setUploadFile(null);
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }}
                            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Bỏ chọn ảnh"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={handleUpload}
                          disabled={uploading || !uploadFile}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {uploading ? "Đang tải..." : "Tải lên & chọn"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setImageTab("library")}
                        >
                          Hủy, chọn từ thư viện
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Ảnh được lấy từ trang Thư viện ảnh.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void foldersQuery.refetch()}
                          disabled={!user?.id || foldersQuery.isFetching}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Tải lại
                        </Button>
                      </div>

                      {!user?.id ? (
                        <div className="rounded-md bg-muted/60 p-4 text-sm text-muted-foreground">
                          Cần đăng nhập admin để xem thư viện ảnh.
                        </div>
                      ) : foldersQuery.isLoading ? (
                        <div className="rounded-md bg-muted/60 p-4 text-sm text-muted-foreground">
                          Đang tải thư mục ảnh...
                        </div>
                      ) : foldersQuery.isError ? (
                        <div className="rounded-md border border-destructive/20 p-4">
                          <p className="mb-3 text-sm text-destructive">
                            Không thể tải thư viện ảnh.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void foldersQuery.refetch()}
                          >
                            Thử lại
                          </Button>
                        </div>
                      ) : folders.length === 0 ? (
                        <div className="rounded-md bg-muted/60 p-4 text-sm text-muted-foreground">
                          Chưa có thư mục ảnh. Hãy chuyển sang tab “Upload mới”
                          để tải ảnh đầu tiên (cần ít nhất 1 thư mục trong
                          trang Thư viện ảnh).
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Select
                            value={activeFolderId}
                            onValueChange={(value) =>
                              setSelectedFolderId(value ?? "")
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn thư mục ảnh" />
                            </SelectTrigger>
                            <SelectContent>
                              {folders.map((folder) => (
                                <SelectItem key={folder.id} value={folder.id}>
                                  {folder.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {imagesQuery.isLoading ? (
                            <div className="rounded-md bg-muted/60 p-4 text-sm text-muted-foreground">
                              Đang tải ảnh...
                            </div>
                          ) : imagesQuery.isError ? (
                            <div className="rounded-md border border-destructive/20 p-4">
                              <p className="mb-3 text-sm text-destructive">
                                Không thể tải ảnh trong thư mục này.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void imagesQuery.refetch()}
                              >
                                Thử lại
                              </Button>
                            </div>
                          ) : libraryImages.length === 0 ? (
                            <div className="rounded-md bg-muted/60 p-4 text-sm text-muted-foreground">
                              Thư mục này chưa có ảnh.
                            </div>
                          ) : (
                            <div className="grid max-h-64 grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
                              {libraryImages.map((image) => {
                                const isSelected =
                                  bannerForm.imageUrl === image.path;
                                return (
                                  <button
                                    key={image.id}
                                    type="button"
                                    onClick={() =>
                                      handleSelectLibraryImage(image.path)
                                    }
                                    className={`group overflow-hidden rounded-md border text-left transition ${
                                      isSelected
                                        ? "border-primary ring-2 ring-primary/20"
                                        : "border-border hover:border-primary/60"
                                    }`}
                                  >
                                    <div className="relative aspect-[4/3] bg-muted">
                                      <SafeImage
                                        src={mediaApi.getImageUrl(image.path)}
                                        alt={image.displayName}
                                        fill
                                        className="object-cover transition-transform group-hover:scale-105"
                                      />
                                      {isSelected ? (
                                        <span className="absolute right-1.5 top-1.5 rounded-full bg-primary p-1 text-primary-foreground">
                                          <CheckCircle2 className="h-3 w-3" />
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">
                                      {image.displayName}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Section: Lịch & hiển thị */}
              <section className="rounded-lg border bg-card/40 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Lịch & hiển thị</h3>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="banner-start">Bắt đầu</Label>
                    <Input
                      id="banner-start"
                      type="datetime-local"
                      value={bannerForm.startAt}
                      onChange={(event) =>
                        setBannerForm({
                          ...bannerForm,
                          startAt: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner-end">Kết thúc</Label>
                    <Input
                      id="banner-end"
                      type="datetime-local"
                      value={bannerForm.endAt}
                      onChange={(event) =>
                        setBannerForm({
                          ...bannerForm,
                          endAt: event.target.value,
                        })
                      }
                      aria-invalid={Boolean(scheduleError)}
                    />
                    {scheduleError ? (
                      <p className="text-xs text-destructive">{scheduleError}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="self-center text-xs text-muted-foreground">
                    Preset:
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("now")}
                  >
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    Bắt đầu ngay
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("7d")}
                  >
                    Chạy 7 ngày
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("30d")}
                  >
                    Chạy 30 ngày
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("always")}
                  >
                    <InfinityIcon className="mr-1.5 h-3.5 w-3.5" />
                    Không giới hạn
                  </Button>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2">
                  <Switch
                    checked={bannerForm.isActive}
                    onCheckedChange={(checked) =>
                      setBannerForm({ ...bannerForm, isActive: checked })
                    }
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {bannerForm.isActive
                        ? "Đang bật hiển thị"
                        : "Đang tắt hiển thị"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lịch hiển thị chỉ có tác dụng khi banner được bật.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* ----- Preview ----- */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Preview banner</p>
                <p className="text-xs text-muted-foreground">
                  Xem nhanh cách banner xuất hiện ở hero trang chủ.
                </p>
              </div>
              <div className="overflow-hidden rounded-md border bg-background shadow-sm">
                <div className="relative aspect-[16/9] bg-muted">
                  {bannerPreviewImage ? (
                    <SafeImage
                      src={bannerPreviewImage}
                      alt={bannerForm.title || "Preview banner"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">Chưa chọn ảnh banner</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-background/10" />
                  <div className="absolute right-3 top-3 z-10">
                    <StatusBadge status={previewStatus} />
                  </div>
                  <div className="absolute inset-y-0 left-0 flex max-w-[72%] flex-col justify-center p-6">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      Hero trang chủ
                    </p>
                    <h2 className="line-clamp-2 text-2xl font-semibold leading-tight text-foreground">
                      {bannerForm.title || "Tiêu đề banner"}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {bannerForm.subtitle ||
                        "Mô tả ngắn giúp khách hiểu nội dung chiến dịch."}
                    </p>
                    <div className="mt-4 w-fit rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                      {bannerForm.linkUrl ? "Mở liên kết" : "Khám phá ngay"}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 border-t p-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>
                      Hiệu lực:{" "}
                      <strong className="text-foreground">
                        {formatDateShort(
                          bannerForm.startAt
                            ? new Date(bannerForm.startAt).toISOString()
                            : null,
                        )}
                      </strong>{" "}
                      →{" "}
                      <strong className="text-foreground">
                        {formatDateShort(
                          bannerForm.endAt
                            ? new Date(bannerForm.endAt).toISOString()
                            : null,
                        )}
                      </strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <span>Thứ tự: {Number(bannerForm.sortOrder) || 0}</span>
                    <span>Link: {bannerForm.linkUrl || "/discovery"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSubmitBanner}
              disabled={
                createBanner.isPending ||
                updateBanner.isPending ||
                uploading ||
                hasFormErrors
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {editingBannerId ? "Lưu banner" : "Tạo banner"}
            </Button>
            {editingBannerId ? (
              <Button variant="outline" onClick={resetBannerForm}>
                Hủy sửa
              </Button>
            ) : null}
          </div>

          {/* Filter chips */}
          {banners.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Lọc:
              </span>
              {filterChips.map((chip) => {
                const isActive = statusFilter === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setStatusFilter(chip.value)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {chip.label}
                    <span
                      className={`rounded-full px-1.5 text-[10px] ${
                        isActive
                          ? "bg-primary-foreground/20"
                          : "bg-muted"
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {bannersQuery.isLoading ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              Đang tải banner...
            </div>
          ) : bannersQuery.isError ? (
            <div className="rounded-md border border-destructive/20 p-8 text-center">
              <p className="mb-4 text-sm text-destructive">
                Không thể tải danh sách banner.
              </p>
              <Button
                variant="outline"
                onClick={() => void bannersQuery.refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : visibleBanners.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              {statusFilter === "all"
                ? "Chưa có banner nào. Trang chủ sẽ dùng hero mặc định."
                : "Không có banner phù hợp bộ lọc đang chọn."}
            </div>
          ) : (
            <div
              className={`relative rounded-md border ${
                reordering ? "pointer-events-none opacity-70" : ""
              }`}
            >
              {reordering ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 text-sm text-muted-foreground backdrop-blur-sm">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu thứ tự...
                </div>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Ảnh</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead className="w-20">Thứ tự</TableHead>
                    <TableHead>Lịch hiệu lực</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-32">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBanners.map((banner, index) => {
                    const status = computeBannerStatus(banner);
                    const isDragging = dragIndex === index;
                    const isHover = hoverIndex === index && dragIndex !== null;
                    return (
                      <TableRow
                        key={banner.id}
                        draggable={statusFilter === "all"}
                        onDragStart={handleDragStart(index)}
                        onDragOver={handleDragOver(index)}
                        onDrop={handleDrop(index)}
                        onDragEnd={handleDragEnd}
                        className={`transition-colors ${
                          isDragging ? "opacity-40" : ""
                        } ${
                          isHover
                            ? "border-t-2 border-t-primary"
                            : ""
                        }`}
                      >
                        <TableCell>
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded text-muted-foreground ${
                              statusFilter === "all"
                                ? "cursor-grab hover:bg-muted active:cursor-grabbing"
                                : "cursor-not-allowed opacity-40"
                            }`}
                            title={
                              statusFilter === "all"
                                ? "Kéo để đổi thứ tự"
                                : "Chỉ kéo-thả được khi xem Tất cả"
                            }
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative h-14 w-24 overflow-hidden rounded-md bg-muted">
                            <SafeImage
                              src={mediaApi.getImageUrl(banner.imageUrl)}
                              alt={banner.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{banner.title}</p>
                          <p className="line-clamp-1 max-w-sm text-sm text-muted-foreground">
                            {banner.subtitle || "Không có mô tả"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold">
                            {banner.sortOrder}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <p>Từ: {formatDate(banner.startAt)}</p>
                          <p>Đến: {formatDate(banner.endAt)}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggleBanner(banner)}
                              aria-label="Đổi trạng thái banner"
                            >
                              {banner.isActive ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditBanner(banner)}
                              aria-label="Sửa banner"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteBanner(banner)}
                              aria-label="Xóa banner"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Sản phẩm nổi bật trên trang chủ</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Các sản phẩm này xuất hiện trong section riêng ngay dưới hero.
                Chỉ sản phẩm active, approved và còn category hợp lệ mới hiện ở
                public homepage.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{featuredProducts.length} đã chọn</Badge>
              <Badge>{activeFeaturedCount} đang bật</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border bg-muted/30 p-4">
            <div className="mb-4 flex flex-col gap-1">
              <p className="text-sm font-semibold">Thêm sản phẩm nổi bật</p>
              <p className="text-xs text-muted-foreground">
                Chọn sản phẩm approved, sắp thứ tự hiển thị rồi bấm thêm. Sản
                phẩm đã nổi bật sẽ được ẩn khỏi danh sách chọn để tránh trùng.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_160px_auto]">
              <Select
                value={featuredProductId}
                onValueChange={(value) => setFeaturedProductId(value ?? "")}
                disabled={productsQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn sản phẩm approved" />
                </SelectTrigger>
                <SelectContent>
                  {selectableProducts.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Không còn sản phẩm để chọn
                    </SelectItem>
                  ) : (
                    selectableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={featuredSortOrder}
                onChange={(event) => setFeaturedSortOrder(event.target.value)}
                placeholder="Thứ tự"
              />
              <Button
                onClick={handleAddFeaturedProduct}
                disabled={createFeaturedProduct.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm nổi bật
              </Button>
            </div>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Preview section public</p>
                <p className="text-xs text-muted-foreground">
                  Xem nhanh các sản phẩm đang được chọn cho section nổi bật.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {featuredProducts.slice(0, 4).map((item) => {
                  const imageUrl = getPrimaryProductImage(item);
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-md border bg-background"
                    >
                      <div className="relative aspect-[4/3] bg-muted">
                        {imageUrl ? (
                          <SafeImage
                            src={mediaApi.getImageUrl(imageUrl)}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Chưa có ảnh
                          </div>
                        )}
                        <div className="absolute left-2 top-2">
                          <Badge
                            variant={item.isActive ? "default" : "secondary"}
                          >
                            {item.isActive ? "Public" : "Đang tắt"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="line-clamp-1 text-sm font-medium">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Thứ tự {item.sortOrder} ·{" "}
                          {item.product.category?.name || "Chưa có danh mục"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {featuredQuery.isLoading ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              Đang tải sản phẩm nổi bật...
            </div>
          ) : featuredQuery.isError ? (
            <div className="rounded-md border border-destructive/20 p-8 text-center">
              <p className="mb-4 text-sm text-destructive">
                Không thể tải sản phẩm nổi bật.
              </p>
              <Button
                variant="outline"
                onClick={() => void featuredQuery.refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              Chưa có sản phẩm nổi bật. Trang chủ sẽ dùng các section gợi ý hiện
              có.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Thứ tự</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featuredProducts.map((item) => {
                  const imageUrl = getPrimaryProductImage(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-14 overflow-hidden rounded-md bg-muted">
                            {imageUrl ? (
                              <SafeImage
                                src={mediaApi.getImageUrl(imageUrl)}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.product.category?.name || "Chưa có danh mục"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="w-24"
                          defaultValue={item.sortOrder}
                          onBlur={(event) =>
                            handleUpdateFeaturedProduct(item, {
                              sortOrder: Number(event.target.value) || 0,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.isActive ? "default" : "secondary"}
                        >
                          {item.isActive ? "Đang bật" : "Đang tắt"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              handleUpdateFeaturedProduct(item, {
                                isActive: !item.isActive,
                              })
                            }
                            aria-label="Đổi trạng thái sản phẩm nổi bật"
                          >
                            {item.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteFeaturedProduct(item)}
                            aria-label="Xóa sản phẩm nổi bật"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

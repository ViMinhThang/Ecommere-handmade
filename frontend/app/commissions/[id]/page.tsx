"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Handshake,
  ImageIcon,
  Loader2,
  MessageSquare,
  PencilLine,
  Send,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { SketchUpload } from "@/components/dashboard/sketch-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { commissionsApi, type CommissionProposal } from "@/lib/api/commissions";
import { mediaApi } from "@/lib/api/media";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";

const postStatusLabels = {
  OPEN: "Đang mở",
  ASSIGNED: "Đã chọn studio",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
};

const proposalStatusLabels = {
  PENDING: "Đang chờ chọn",
  ACCEPTED: "Được chọn",
  REJECTED: "Không được chọn",
  WITHDRAWN: "Đã rút",
};

function formatBudget(post: {
  budgetMin: string | null;
  budgetMax: string | null;
}) {
  if (!post.budgetMin && !post.budgetMax) {
    return "Khách chưa đặt ngân sách";
  }

  const min = post.budgetMin ? formatCurrency(Number(post.budgetMin)) : "?";
  const max = post.budgetMax ? formatCurrency(Number(post.budgetMax)) : "?";
  return `${min} - ${max}`;
}

function ProposalForm({ commissionId }: { commissionId: string }) {
  const queryClient = useQueryClient();
  const [sketchImageUrl, setSketchImageUrl] = useState("");
  const [form, setForm] = useState({
    message: "",
    proposedPrice: "",
    proposedLeadTime: "",
  });

  const submitProposal = useMutation({
    mutationFn: () =>
      commissionsApi.submitProposal(commissionId, {
        message: form.message,
        proposedPrice: Number(form.proposedPrice),
        proposedLeadTime: form.proposedLeadTime,
        sketchImageUrl: sketchImageUrl || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["commissions", commissionId] });
      void queryClient.invalidateQueries({ queryKey: ["commissions", "open"] });
      toast.success("Đã gửi đề xuất.");
      setForm({ message: "", proposedPrice: "", proposedLeadTime: "" });
      setSketchImageUrl("");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể gửi đề xuất"));
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitProposal.mutate();
      }}
      className="rounded-lg border border-primary/20 bg-card p-5 text-card-foreground shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-headline text-xl italic text-primary">
            Gửi đề xuất cho thread này
          </h2>
          <p className="text-xs text-muted-foreground">
            Chủ yêu cầu sẽ dùng đề xuất này để chọn studio.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="sr-only" htmlFor="proposal-message">
          Nội dung đề xuất
        </label>
        <textarea
          id="proposal-message"
          required
          rows={5}
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
          className="w-full resize-none rounded-md border border-input/85 bg-background/80 px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:bg-card"
          placeholder="Giải thích cách bạn sẽ làm, chất liệu, điểm khác biệt và lưu ý cho khách..."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="sr-only" htmlFor="proposal-price">
            Giá đề xuất
          </label>
          <input
            id="proposal-price"
            required
            type="number"
            min="1"
            value={form.proposedPrice}
            onChange={(event) =>
              setForm({ ...form, proposedPrice: event.target.value })
            }
            className="w-full rounded-md border border-input/85 bg-background/80 px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:bg-card"
            placeholder="Giá đề xuất"
          />
          <label className="sr-only" htmlFor="proposal-lead-time">
            Thời gian hoàn thiện
          </label>
          <input
            id="proposal-lead-time"
            required
            value={form.proposedLeadTime}
            onChange={(event) =>
              setForm({ ...form, proposedLeadTime: event.target.value })
            }
            className="w-full rounded-md border border-input/85 bg-background/80 px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:bg-card"
            placeholder="Thời gian hoàn thiện"
          />
        </div>
        <SketchUpload
          value={sketchImageUrl}
          onChange={setSketchImageUrl}
          label="Tải phác thảo đề xuất"
        />
        <Button type="submit" disabled={submitProposal.isPending} className="w-full">
          {submitProposal.isPending ? "Đang gửi..." : "Gửi đề xuất"}
        </Button>
      </div>
    </form>
  );
}

function ProposalCard({
  proposal,
  canChoose,
  onChoose,
  isChoosing,
}: {
  proposal: CommissionProposal;
  canChoose: boolean;
  onChoose: () => void;
  isChoosing: boolean;
}) {
  const sellerName =
    proposal.seller?.shopName || proposal.seller?.name || "Người bán";

  return (
    <article className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-headline text-xl italic text-primary">
              {proposal.seller?.id ? (
                <Link href={`/sellers/${proposal.seller.id}`} className="hover:underline">
                  {sellerName}
                </Link>
              ) : (
                sellerName
              )}
            </h3>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {formatDate(proposal.createdAt)}
            </p>
          </div>
        </div>
        <Badge variant={proposal.status === "ACCEPTED" ? "default" : "outline"}>
          {proposalStatusLabels[proposal.status]}
        </Badge>
      </div>

      <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
        {proposal.message}
      </p>

      {proposal.sketchImageUrl ? (
        <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-accent md:max-w-sm">
          <Image
            src={mediaApi.getImageUrl(proposal.sketchImageUrl)}
            alt="Proposal sketch"
            fill
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-md bg-accent/45 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Giá đề xuất
          </p>
          <p className="mt-2 font-bold text-primary">
            {formatCurrency(Number(proposal.proposedPrice))}
          </p>
        </div>
        <div className="rounded-md bg-accent/45 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Thời gian
          </p>
          <p className="mt-2 flex items-center gap-2 font-bold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {proposal.proposedLeadTime}
          </p>
        </div>
      </div>

      {canChoose ? (
        <Button onClick={onChoose} disabled={isChoosing} className="mt-5 w-full gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Chọn studio này
        </Button>
      ) : null}
    </article>
  );
}

function ActionPanel({
  isAuthenticated,
  isSeller,
  isCustomer,
  hasOwnProposal,
  isOpen,
  commissionId,
}: {
  isAuthenticated: boolean;
  isSeller: boolean;
  isCustomer: boolean;
  hasOwnProposal: boolean;
  isOpen: boolean;
  commissionId: string;
}) {
  if (isSeller && !isCustomer && isOpen && !hasOwnProposal) {
    return <ProposalForm commissionId={commissionId} />;
  }

  if (!isAuthenticated && isOpen) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-headline text-xl italic text-primary">
          Muốn gửi đề xuất?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Đăng nhập bằng tài khoản người bán để phản hồi thread này. Người xem
          vẫn có thể đọc toàn bộ quá trình công khai.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (isCustomer && isOpen) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <h2 className="font-headline text-xl italic text-primary">
          Bạn là chủ thread
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Khi tìm thấy đề xuất phù hợp, hãy chọn studio ngay trên phản hồi của họ.
        </p>
      </div>
    );
  }

  if (hasOwnProposal) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <h2 className="font-headline text-xl italic text-primary">
          Đã gửi đề xuất
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Đề xuất của bạn đang hiển thị trong thread công khai này.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
      <h2 className="font-headline text-xl italic text-primary">
        Thread công khai
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Mọi người có thể theo dõi yêu cầu, đề xuất và kết quả chọn studio.
      </p>
    </div>
  );
}

export default function CommissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const id = params.id;

  const {
    data: post,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["commissions", id],
    queryFn: () => commissionsApi.getById(id),
    enabled: Boolean(id),
  });

  const chooseProposal = useMutation({
    mutationFn: (proposalId: string) =>
      commissionsApi.chooseProposal(id, proposalId),
    onSuccess: (customOrder) => {
      void queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Đã chọn studio và tạo đơn thiết kế riêng.");
      router.push(`/custom-orders/${customOrder.id}/review`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể chọn đề xuất"));
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <CustomerNavBar />
        <div className="flex min-h-[70vh] items-center justify-center pt-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
        <CustomerFooter />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <CustomerNavBar />
        <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 pt-24 text-center">
          <h1 className="font-headline text-3xl italic text-primary">
            Không thể mở thread commission.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {error instanceof Error ? error.message : "Thread không tồn tại hoặc đã bị ẩn."}
          </p>
          <Link
            href="/commissions"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Quay lại commission board
          </Link>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  const isCustomer = user?.id === post.customerId;
  const isSeller = Boolean(
    user?.roles?.includes("ROLE_SELLER") || user?.roles?.includes("ROLE_ADMIN"),
  );
  const hasOwnProposal = post.proposals.some(
    (proposal) => proposal.sellerId === user?.id,
  );
  const isOpen = post.status === "OPEN";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomerNavBar />

      <main className="pt-24">
        <section className="border-b border-border/35 bg-[#f7f3ed] px-6 py-12 dark:bg-card md:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-6xl">
            <Link
              href="/commissions"
              className="mb-8 inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground transition hover:bg-background hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Commission board
            </Link>

            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{postStatusLabels[post.status]}</Badge>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {formatDate(post.createdAt)}
                  </span>
                </div>
                <h1 className="mt-5 max-w-4xl font-headline text-4xl italic leading-tight text-primary md:text-6xl">
                  {post.title}
                </h1>
                <p className="mt-4 text-sm text-muted-foreground">
                  Đăng bởi {post.customer?.name || "Khách hàng"}
                </p>
              </div>

              <div className="rounded-lg border border-primary/15 bg-background p-5 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-2xl font-bold text-primary">
                      <MessageSquare className="h-5 w-5" />
                      {post.proposals.length}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      đề xuất
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-2xl font-bold text-primary">
                      <ImageIcon className="h-5 w-5" />
                      {post.referenceImages.length}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      ảnh tham khảo
                    </p>
                  </div>
                </div>
                {isCustomer && post.customOrderId ? (
                  <Link
                    href={`/custom-orders/${post.customOrderId}/review`}
                    className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
                  >
                    Xem đơn thiết kế riêng
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10 lg:px-14">
          <div className="mx-auto grid w-full max-w-6xl gap-7 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="space-y-6">
              <article className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <PencilLine className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-headline text-2xl italic text-primary">
                      Yêu cầu ban đầu
                    </h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>

                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {post.description}
                </p>

                <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-md bg-accent/45 p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Handshake className="h-4 w-4 text-primary" />
                      Ngân sách
                    </p>
                    <p className="mt-2 font-bold text-foreground">{formatBudget(post)}</p>
                  </div>
                  <div className="rounded-md bg-accent/45 p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      Thời gian mong muốn
                    </p>
                    <p className="mt-2 font-bold text-foreground">
                      {post.desiredTimeline || "Chưa đặt"}
                    </p>
                  </div>
                </div>

                {post.referenceImages.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {post.referenceImages.map((image) => (
                      <div
                        key={image}
                        className="relative h-28 w-28 overflow-hidden rounded-md border border-border bg-accent"
                      >
                        <Image
                          src={mediaApi.getImageUrl(image)}
                          alt="Reference"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>

              <section className="space-y-4">
                <div>
                  <h2 className="font-headline text-3xl italic text-primary">
                    Đề xuất từ studio
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Các phản hồi công khai để mọi người theo dõi quá trình chọn
                    người bán.
                  </p>
                </div>

                {post.proposals.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-accent/20 px-6 py-12 text-center">
                    <MessageSquare className="mx-auto mb-4 h-10 w-10 text-primary/35" />
                    <p className="font-headline text-xl italic text-primary">
                      Chưa có đề xuất nào.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Thread sẽ cập nhật khi người bán gửi phản hồi đầu tiên.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {post.proposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        canChoose={
                          isCustomer &&
                          isOpen &&
                          proposal.status === "PENDING"
                        }
                        onChoose={() => chooseProposal.mutate(proposal.id)}
                        isChoosing={chooseProposal.isPending}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-28">
              <ActionPanel
                isAuthenticated={isAuthenticated}
                isSeller={isSeller}
                isCustomer={isCustomer}
                hasOwnProposal={hasOwnProposal}
                isOpen={isOpen}
                commissionId={post.id}
              />
            </aside>
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}

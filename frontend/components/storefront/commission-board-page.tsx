"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  Clock,
  Handshake,
  MessageSquare,
  PencilLine,
  Users,
} from "lucide-react";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { Badge } from "@/components/ui/badge";
import { commissionsApi, type CommissionPost } from "@/lib/api/commissions";
import { formatCurrency, formatDate } from "@/lib/utils";

function formatBudget(post: CommissionPost) {
  if (!post.budgetMin && !post.budgetMax) {
    return "Khách chưa đặt ngân sách";
  }

  const min = post.budgetMin ? formatCurrency(Number(post.budgetMin)) : "?";
  const max = post.budgetMax ? formatCurrency(Number(post.budgetMax)) : "?";
  return `${min} - ${max}`;
}

function latestProposalLabel(post: CommissionPost) {
  const latestProposal = post.proposals[0];

  if (!latestProposal) {
    return "Đang chờ người bán đầu tiên phản hồi";
  }

  const sellerName =
    latestProposal.seller?.shopName ||
    latestProposal.seller?.name ||
    "Một studio";

  return `${sellerName} vừa gửi đề xuất`;
}

function CommissionThreadCard({ post }: { post: CommissionPost }) {
  return (
    <Link
      href={`/commissions/${post.id}`}
      className="group block rounded-lg border border-border/55 bg-card p-5 text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_24px_42px_-32px_rgba(84,67,60,0.45)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Đang mở</Badge>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {formatDate(post.createdAt)}
            </span>
          </div>
          <h2 className="font-headline text-2xl italic leading-tight text-primary">
            {post.title}
          </h2>
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {post.description}
          </p>
        </div>

        <div className="shrink-0 rounded-md bg-accent/55 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-primary">{post.proposals.length}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            đề xuất
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-border/45 pt-5 text-sm md:grid-cols-3">
        <div className="flex items-start gap-3">
          <Handshake className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="font-semibold text-foreground">{formatBudget(post)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ngân sách dự kiến</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="font-semibold text-foreground">
              {post.desiredTimeline || "Chưa đặt mốc thời gian"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Thời gian mong muốn</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="font-semibold text-foreground">{latestProposalLabel(post)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Diễn biến mới nhất</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 text-sm font-semibold text-primary">
        <span>Xem thread commission</span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function CommissionBoardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border/55 bg-card p-5 shadow-sm"
        >
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-accent" />
          <div className="mb-3 h-8 w-3/4 animate-pulse rounded bg-accent" />
          <div className="mb-2 h-4 w-full animate-pulse rounded bg-accent" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-accent" />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="h-14 animate-pulse rounded bg-accent/70" />
            <div className="h-14 animate-pulse rounded bg-accent/70" />
            <div className="h-14 animate-pulse rounded bg-accent/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommissionBoardPage() {
  const {
    data: posts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["commissions", "open"],
    queryFn: commissionsApi.getOpenPosts,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomerNavBar />

      <main className="pt-24">
        <section className="border-b border-border/35 bg-[#f7f3ed] px-6 py-14 dark:bg-card md:px-10 lg:px-14">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/75">
                Commission board
              </p>
              <h1 className="max-w-4xl font-headline text-4xl italic leading-tight text-primary md:text-6xl">
                Những yêu cầu thiết kế riêng đang chờ studio phù hợp
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                Khách hàng đăng yêu cầu, người bán gửi đề xuất như các phản hồi
                trong một thread, và chủ yêu cầu có thể chọn studio phù hợp để
                bắt đầu đơn thiết kế riêng.
              </p>
            </div>

            <div className="rounded-lg border border-primary/15 bg-background p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="flex items-center gap-2 text-2xl font-bold text-primary">
                    <ClipboardList className="h-5 w-5" />
                    {posts.length}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    thread mở
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-2xl font-bold text-primary">
                    <Users className="h-5 w-5" />
                    {posts.reduce((total, post) => total + post.proposals.length, 0)}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    đề xuất
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/profile/commissions/new"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_10px_22px_-12px_rgba(133,55,36,0.55)] transition hover:brightness-[1.04]"
                >
                  <PencilLine className="h-4 w-4" />
                  Đăng yêu cầu
                </Link>
                <Link
                  href="/sellers"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-[#f7f3ed] px-4 text-sm font-semibold text-foreground transition hover:bg-[#ebe8e2] dark:bg-card dark:hover:bg-accent"
                >
                  Xem studio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-7xl space-y-7">
            <div>
              <h2 className="font-headline text-3xl italic text-primary">
                Thread mới nhất
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Mọi người có thể đọc yêu cầu và theo dõi các đề xuất trước khi
                chủ yêu cầu chọn người bán.
              </p>
            </div>

            {isLoading ? (
              <CommissionBoardSkeleton />
            ) : isError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
                <p className="font-headline text-xl italic text-primary">
                  Không thể tải commission board.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : "Vui lòng thử lại sau ít phút."}
                </p>
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-accent/20 px-6 py-16 text-center">
                <ClipboardList className="mx-auto mb-4 h-12 w-12 text-primary/35" />
                <p className="font-headline text-2xl italic text-primary">
                  Chưa có thread commission đang mở.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Khi khách hàng đăng yêu cầu mới, thread sẽ xuất hiện công khai ở đây.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {posts.map((post) => (
                  <CommissionThreadCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}

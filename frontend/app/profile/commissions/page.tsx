"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";
import { commissionsApi } from "@/lib/api/commissions";
import { formatCurrency, formatDate } from "@/lib/utils";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    OPEN: "Đang mở",
    ASSIGNED: "Đã chọn người bán",
    CLOSED: "Đã đóng",
    CANCELLED: "Đã hủy",
  };
  return labels[status] ?? status;
}

export default function ProfileCommissionsPage() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["commissions", "my-posts"],
    queryFn: commissionsApi.getMyPosts,
  });

  if (isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Đang tải yêu cầu commission...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Yêu cầu commission</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Đăng ý tưởng thủ công của bạn và chọn người bán phù hợp nhất.
          </p>
        </div>
        <Link
          href="/profile/commissions/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-105"
        >
          <Plus className="h-4 w-4" />
          Đăng yêu cầu
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card p-12 text-center text-card-foreground shadow-sm">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="font-serif text-xl font-bold">Chưa có yêu cầu nào</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Tạo một bài commission để các người bán gửi đề xuất giá, thời gian và cách họ sẽ thực hiện.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/commissions/${post.id}`}
              className="block rounded-lg border border-border/60 bg-card p-5 text-card-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent/25"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {statusLabel(post.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-foreground">{post.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-5 md:block md:text-right">
                  <p className="text-sm font-semibold">
                    {post.budgetMin || post.budgetMax
                      ? `${post.budgetMin ? formatCurrency(Number(post.budgetMin)) : "?"} - ${
                          post.budgetMax ? formatCurrency(Number(post.budgetMax)) : "?"
                        }`
                      : "Chưa đặt ngân sách"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{post.proposals.length} đề xuất</p>
                  <ArrowRight className="mt-3 hidden h-4 w-4 text-primary md:inline-block" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

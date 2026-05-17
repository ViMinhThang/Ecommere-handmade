"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { SketchUpload } from "@/components/dashboard/sketch-upload";
import { commissionsApi, CommissionProposal } from "@/lib/api/commissions";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import { useState } from "react";

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
      queryClient.invalidateQueries({ queryKey: ["commissions", commissionId] });
      queryClient.invalidateQueries({ queryKey: ["commissions", "open"] });
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
      className="rounded-lg border bg-white p-5 shadow-sm"
    >
      <h2 className="font-serif text-xl font-bold">Gửi đề xuất</h2>
      <div className="mt-4 space-y-4">
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
          className="w-full resize-none rounded-md border px-3 py-2 outline-none focus:border-primary"
          placeholder="Giải thích cách bạn sẽ làm, chất liệu, các lưu ý..."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <input
            required
            type="number"
            min="1"
            value={form.proposedPrice}
            onChange={(event) => setForm({ ...form, proposedPrice: event.target.value })}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-primary"
            placeholder="Giá đề xuất"
          />
          <input
            required
            value={form.proposedLeadTime}
            onChange={(event) => setForm({ ...form, proposedLeadTime: event.target.value })}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-primary"
            placeholder="Thời gian hoàn thiện"
          />
        </div>
        <SketchUpload value={sketchImageUrl} onChange={setSketchImageUrl} label="Tải phác thảo đề xuất" />
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
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold">
            {proposal.seller?.shopName || proposal.seller?.name || "Người bán"}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {formatDate(proposal.createdAt)}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{proposal.status}</span>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{proposal.message}</p>
      {proposal.sketchImageUrl ? (
        <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-md border md:max-w-xs">
          <Image src={proposal.sketchImageUrl} alt="Proposal sketch" fill className="object-cover" />
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
        <span className="font-bold text-primary">{formatCurrency(Number(proposal.proposedPrice))}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          {proposal.proposedLeadTime}
        </span>
      </div>
      {canChoose ? (
        <Button onClick={onChoose} disabled={isChoosing} className="mt-5 w-full gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Chọn người bán này
        </Button>
      ) : null}
    </div>
  );
}

export default function CommissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const id = params.id;

  const { data: post, isLoading } = useQuery({
    queryKey: ["commissions", id],
    queryFn: () => commissionsApi.getById(id),
    enabled: Boolean(id),
  });

  const chooseProposal = useMutation({
    mutationFn: (proposalId: string) => commissionsApi.chooseProposal(id, proposalId),
    onSuccess: (customOrder) => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Đã chọn người bán và tạo đơn thiết kế riêng.");
      router.push(`/custom-orders/${customOrder.id}/review`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể chọn đề xuất"));
    },
  });

  if (isLoading || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isCustomer = user?.id === post.customerId;
  const isSeller = Boolean(user?.roles?.includes("ROLE_SELLER") || user?.roles?.includes("ROLE_ADMIN"));
  const hasOwnProposal = post.proposals.some((proposal) => proposal.sellerId === user?.id);
  const canSubmitProposal = isSeller && !isCustomer && post.status === "OPEN" && !hasOwnProposal;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={isSeller ? "/seller/commissions" : "/profile/commissions"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {post.status}
              </span>
              <h1 className="mt-4 font-serif text-3xl font-bold text-foreground">{post.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Đăng bởi {post.customer?.name || "Khách hàng"} vào {formatDate(post.createdAt)}
              </p>
            </div>
            {post.customOrderId ? (
              <Link
                href={`/custom-orders/${post.customOrderId}/review`}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-105"
              >
                Xem đơn thiết kế
              </Link>
            ) : null}
          </div>

          <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{post.description}</p>

          <div className="mt-6 grid gap-4 text-sm md:grid-cols-3">
            <div className="rounded-md bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Ngân sách</p>
              <p className="mt-1 font-bold">
                {post.budgetMin || post.budgetMax
                  ? `${post.budgetMin ? formatCurrency(Number(post.budgetMin)) : "?"} - ${
                      post.budgetMax ? formatCurrency(Number(post.budgetMax)) : "?"
                    }`
                  : "Chưa đặt"}
              </p>
            </div>
            <div className="rounded-md bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Thời gian mong muốn</p>
              <p className="mt-1 font-bold">{post.desiredTimeline || "Chưa đặt"}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Đề xuất</p>
              <p className="mt-1 font-bold">{post.proposals.length}</p>
            </div>
          </div>

          {post.referenceImages.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {post.referenceImages.map((image) => (
                <div key={image} className="relative h-28 w-28 overflow-hidden rounded-md border">
                  <Image src={image} alt="Reference" fill className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold">Đề xuất từ người bán</h2>
            {post.proposals.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
                Chưa có đề xuất nào.
              </div>
            ) : (
              post.proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  canChoose={isCustomer && post.status === "OPEN" && proposal.status === "PENDING"}
                  onChoose={() => chooseProposal.mutate(proposal.id)}
                  isChoosing={chooseProposal.isPending}
                />
              ))
            )}
          </section>

          <aside>{canSubmitProposal ? <ProposalForm commissionId={post.id} /> : null}</aside>
        </div>
      </div>
    </div>
  );
}

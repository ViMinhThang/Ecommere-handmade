"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { mediaApi } from "@/lib/api/media";
import {
  useAnswerProductQuestion,
  useCreateProductQuestion,
  useProductQuestions,
} from "@/lib/api/hooks";
import type { AuthUser } from "@/lib/api/auth";
import type { ProductQuestion, UserRole } from "@/types";

interface ProductQuestionsSectionProps {
  productId: string;
  sellerId: string;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
}

const QUESTIONS_PER_PAGE = 5;

function getRoleLabel(role?: UserRole) {
  if (role === "ROLE_ADMIN") {
    return "Quản trị viên";
  }

  if (role === "ROLE_SELLER") {
    return "Người bán";
  }

  return "Khách hàng";
}

function resolveAvatar(avatar?: string | null) {
  return avatar ? mediaApi.getImageUrl(avatar) : null;
}

export function ProductQuestionsSection({
  productId,
  sellerId,
  currentUser,
  isAuthenticated,
}: ProductQuestionsSectionProps) {
  const [page, setPage] = useState(1);
  const [questionDraft, setQuestionDraft] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = useProductQuestions(
    productId,
    { page, limit: QUESTIONS_PER_PAGE },
    !!productId,
  );
  const createQuestionMutation = useCreateProductQuestion(productId);
  const answerQuestionMutation = useAnswerProductQuestion(productId);

  const isAdmin = currentUser?.roles?.includes("ROLE_ADMIN") ?? false;
  const isOwnerSeller =
    (currentUser?.roles?.includes("ROLE_SELLER") ?? false) &&
    currentUser?.id === sellerId;
  const canAnswerQuestions = isAdmin || isOwnerSeller;

  const questions = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 0;

  const submitQuestion = async () => {
    const trimmedQuestion = questionDraft.trim();

    if (!trimmedQuestion) {
      toast.error("Vui lòng nhập câu hỏi.");
      return;
    }

    if (trimmedQuestion.length > 500) {
      toast.error("Câu hỏi không được vượt quá 500 ký tự.");
      return;
    }

    try {
      await createQuestionMutation.mutateAsync({ question: trimmedQuestion });
      setQuestionDraft("");
      setPage(1);
      toast.success("Đã gửi câu hỏi thành công.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể gửi câu hỏi lúc này.";
      toast.error(message);
    }
  };

  const submitAnswer = async (question: ProductQuestion) => {
    const draft = answerDrafts[question.id]?.trim() ?? "";

    if (!draft) {
      toast.error("Vui lòng nhập câu trả lời.");
      return;
    }

    if (draft.length > 1000) {
      toast.error("Câu trả lời không được vượt quá 1000 ký tự.");
      return;
    }

    try {
      await answerQuestionMutation.mutateAsync({
        questionId: question.id,
        data: { answer: draft },
      });
      setAnswerDrafts((currentDrafts) => ({
        ...currentDrafts,
        [question.id]: "",
      }));
      toast.success("Đã gửi câu trả lời.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể gửi câu trả lời lúc này.";
      toast.error(message);
    }
  };

  return (
    <section className="max-w-[1600px] mx-auto px-6 md:px-12 py-24 border-b border-border/10">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="text-primary font-bold uppercase tracking-[0.2em] text-xs">
              Hỏi đáp công khai
            </span>
            <h2 className="text-4xl font-headline italic text-foreground">
              Câu hỏi về sản phẩm
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed">
              Khách mua có thể hỏi trước khi đặt hàng. Người bán của sản phẩm hoặc quản trị viên sẽ phản hồi trực tiếp tại đây.
            </p>
          </div>
        </div>

        <Card className="border-border/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-headline italic text-foreground">
              Đặt câu hỏi mới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated ? (
              <>
                <Textarea
                  value={questionDraft}
                  onChange={(event) => setQuestionDraft(event.target.value)}
                  placeholder="Nhập câu hỏi của bạn về sản phẩm..."
                  maxLength={500}
                  className="min-h-[120px] resize-none"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {questionDraft.trim().length}/500 ký tự
                  </p>
                  <Button
                    onClick={submitQuestion}
                    disabled={createQuestionMutation.isPending}
                    className="sm:min-w-[180px]"
                  >
                    {createQuestionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang gửi
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Gửi câu hỏi
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                Vui lòng{" "}
                <Link
                  href={`/login?redirect=/products/${productId}`}
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  đăng nhập
                </Link>{" "}
                để đặt câu hỏi.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <Card key={index} className="border-border/20 animate-pulse">
                <CardContent className="space-y-4 p-6">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-16 w-full rounded bg-muted" />
                  <div className="h-12 w-3/4 rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          ) : isError ? (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6 text-sm text-destructive">
                Không thể tải câu hỏi sản phẩm lúc này. Vui lòng thử lại sau.
              </CardContent>
            </Card>
          ) : questions.length === 0 ? (
            <Card className="border-dashed border-border/40 bg-muted/10">
              <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <MessageCircleQuestion className="h-10 w-10 text-muted-foreground/40" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    Chưa có câu hỏi nào cho sản phẩm này.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Hãy là người đầu tiên đặt câu hỏi để nhận tư vấn từ người bán.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            questions.map((question) => {
              const questionAvatar = resolveAvatar(question.user.avatar);
              const answerAvatar = resolveAvatar(question.answeredBy?.avatar);

              return (
                <Card key={question.id} className="border-border/30 shadow-sm">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border/30 bg-muted text-lg font-semibold text-primary">
                          {questionAvatar ? (
                            <img
                              src={questionAvatar}
                              alt={question.user.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            question.user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {question.user.name}
                            </span>
                            <Badge variant="secondary">Khách hỏi</Badge>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {question.question}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {format(new Date(question.createdAt), "dd/MM/yyyy HH:mm", {
                          locale: vi,
                        })}
                      </span>
                    </div>

                    {question.answer ? (
                      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-primary/10 bg-white text-sm font-semibold text-primary">
                              {answerAvatar ? (
                                <img
                                  src={answerAvatar}
                                  alt={question.answeredBy?.name ?? "Người trả lời"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                question.answeredBy?.name?.charAt(0).toUpperCase() ?? "A"
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {question.answeredBy?.name ?? "Người trả lời"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {question.answeredBy?.role === "ROLE_ADMIN" ? (
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <Store className="h-3.5 w-3.5" />
                                )}
                                <span>{getRoleLabel(question.answeredBy?.role)}</span>
                              </div>
                            </div>
                          </div>
                          {question.answeredAt ? (
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {format(
                                new Date(question.answeredAt),
                                "dd/MM/yyyy HH:mm",
                                { locale: vi },
                              )}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {question.answer}
                        </p>
                      </div>
                    ) : canAnswerQuestions ? (
                      <div className="space-y-3 rounded-2xl border border-dashed border-border/40 bg-muted/10 p-5">
                        <p className="text-sm font-medium text-foreground">
                          Trả lời câu hỏi này
                        </p>
                        <Textarea
                          value={answerDrafts[question.id] ?? ""}
                          onChange={(event) =>
                            setAnswerDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Nhập câu trả lời cho khách hàng..."
                          maxLength={1000}
                          className="min-h-[110px] resize-none"
                        />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-muted-foreground">
                            {(answerDrafts[question.id]?.trim().length ?? 0)}/1000 ký tự
                          </p>
                          <Button
                            onClick={() => submitAnswer(question)}
                            disabled={answerQuestionMutation.isPending}
                          >
                            {answerQuestionMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang gửi
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Gửi trả lời
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Người bán sẽ phản hồi câu hỏi này sớm nhất có thể.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Trang trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {page}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPage((currentPage) => Math.min(currentPage + 1, totalPages))
              }
              disabled={page >= totalPages}
            >
              Trang sau
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppData } from "@/context/AppDataContext";
import type { FaqBankItem } from "@/lib/types/inquiries";

export interface FaqBankDraft {
  question: string;
  answer?: string;
  category?: string;
  tags?: string[];
}

export interface AddFaqModalProps {
  open: boolean;
  onClose: () => void;
  editingItem?: FaqBankItem | null;
  initialDraft?: FaqBankDraft | null;
  onSaved?: (item: FaqBankItem, mode: "create" | "edit") => void;
}

interface FieldErrors {
  question?: string;
  answer?: string;
}

export function AddFaqModal({
  open,
  onClose,
  editingItem = null,
  initialDraft = null,
  onSaved,
}: AddFaqModalProps) {
  const { home, services } = useAppData();

  const questionId = useId();
  const categoryId = useId();
  const visibilityId = useId();
  const tagsId = useId();
  const answerId = useId();

  const categoryOptions = useMemo(() => {
    const base = ["General", ...home.faq.askModal.categories];
    if (editingItem?.category) base.push(editingItem.category);
    if (initialDraft?.category) base.push(initialDraft.category);
    return Array.from(new Set(base.map((c) => c.trim()).filter(Boolean)));
  }, [
    home.faq.askModal.categories,
    editingItem?.category,
    initialDraft?.category,
  ]);

  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("General");
  const [tagsText, setTagsText] = useState("");
  const [answer, setAnswer] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingItem) {
      setQuestion(editingItem.question);
      setCategory(editingItem.category || "General");
      setTagsText(editingItem.tags.join(", "));
      setAnswer(editingItem.answer);
    } else if (initialDraft) {
      setQuestion(initialDraft.question ?? "");
      setCategory(initialDraft.category || "General");
      setTagsText((initialDraft.tags ?? []).join(", "));
      setAnswer(initialDraft.answer ?? "");
    } else {
      setQuestion("");
      setCategory("General");
      setTagsText("");
      setAnswer("");
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(false);
  }, [open, editingItem, initialDraft]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();
    const nextErrors: FieldErrors = {
      question: trimmedQuestion ? undefined : "Question is required.",
      answer: trimmedAnswer ? undefined : "Answer is required.",
    };

    if (nextErrors.question || nextErrors.answer) {
      setErrors(nextErrors);
      setSubmitError(null);
      return;
    }

    const parsedTags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);

    try {
      if (editingItem) {
        const updated = await services.inquiries.updateFaqBankItem(
          editingItem.id,
          {
            question: trimmedQuestion,
            answer: trimmedAnswer,
            category: category.trim() || "General",
            tags: parsedTags,
          },
        );
        onSaved?.(updated, "edit");
      } else {
        const created = await services.inquiries.createFaqBankItem({
          question: trimmedQuestion,
          answer: trimmedAnswer,
          category: category.trim() || "General",
          tags: parsedTags,
        });
        onSaved?.(created, "create");
      }
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save FAQ Bank item.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={editingItem ? "Edit FAQ" : "Add FAQ"}
      subtitle={
        editingItem
          ? "Update this question and answer in your private FAQ Bank."
          : "Create a question and answer for your private FAQ Bank."
      }
      maxWidthClass="max-w-2xl"
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        {submitError ? (
          <div
            role="alert"
            className="rounded-[8px] border border-[#FB4A2A] bg-[#FAAF98]/35 px-4 py-3 text-sm font-medium text-[#B41B00]"
          >
            {submitError}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label
            htmlFor={questionId}
            className="block text-sm font-medium text-[#4A5565]"
          >
            Question <span className="text-[#B41B00]">*</span>
          </label>
          <input
            id={questionId}
            type="text"
            required
            value={question}
            onChange={(event) => {
              const next = event.target.value;
              setQuestion(next);
              if (errors.question && next.trim()) {
                setErrors((prev) => ({ ...prev, question: undefined }));
              }
            }}
            placeholder="e.g. Do I need prior coding experience to join?"
            aria-invalid={errors.question ? "true" : "false"}
            className={[
              "w-full h-11 px-3.5 rounded-[5px] border bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]",
              errors.question ? "border-[#FB4A2A]" : "border-[#A1A7B4]",
            ].join(" ")}
          />
          {errors.question ? (
            <p className="text-xs font-medium text-[#B41B00]">
              {errors.question}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor={categoryId}
              className="block text-sm font-medium text-[#4A5565]"
            >
              Category
            </label>
            <select
              id={categoryId}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#1C1B1F] focus:outline-none focus:border-[#0038E1] cursor-pointer"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={visibilityId}
              className="block text-sm font-medium text-[#4A5565]"
            >
              Visibility
            </label>
            <div
              id={visibilityId}
              className="h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-[#F8FAFC] flex items-center gap-2 text-sm font-medium text-[#4A5565]"
            >
              <Lock className="w-4 h-4 shrink-0 text-[#0038E1]" aria-hidden="true" />
              <span>Private · Admins only</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={tagsId}
            className="block text-sm font-medium text-[#4A5565]"
          >
            Tags (comma-separated)
          </label>
          <input
            id={tagsId}
            type="text"
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            placeholder="e.g. Recruitment, DST, Year 1"
            className="w-full h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={answerId}
            className="block text-sm font-medium text-[#4A5565]"
          >
            Answer <span className="text-[#B41B00]">*</span>
          </label>
          <textarea
            id={answerId}
            rows={5}
            required
            value={answer}
            onChange={(event) => {
              const next = event.target.value;
              setAnswer(next);
              if (errors.answer && next.trim()) {
                setErrors((prev) => ({ ...prev, answer: undefined }));
              }
            }}
            placeholder="Write a clear internal answer that can optionally be copied to Home FAQ later..."
            aria-invalid={errors.answer ? "true" : "false"}
            className={[
              "w-full min-h-[130px] px-3.5 py-2.5 rounded-[8px] border bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]",
              errors.answer ? "border-[#FB4A2A]" : "border-[#A1A7B4]",
            ].join(" ")}
          />
          {errors.answer ? (
            <p className="text-xs font-medium text-[#B41B00]">{errors.answer}</p>
          ) : null}
        </div>

        <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#4A5565]">
            Saving to the FAQ Bank does not publish on Home or mark an inquiry as
            answered.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={onClose}
              className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="rounded-[5px] border-0"
            >
              Save to FAQ Bank
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppData } from "@/context/AppDataContext";
import type { InquiryItem } from "@/lib/types/inquiries";

export interface ReplyEmailModalProps {
  open: boolean;
  inquiry: InquiryItem | null;
  onClose: () => void;
  onReplied?: (updated: InquiryItem) => void;
}

export function ReplyEmailModal({
  open,
  inquiry,
  onClose,
  onReplied,
}: ReplyEmailModalProps) {
  const { services } = useAppData();

  const toId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const markAnsweredId = useId();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [markAnswered, setMarkAnswered] = useState(true);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !inquiry) return;
    setSubject(`Re: ${inquiry.question}`);
    setBody("");
    setMarkAnswered(true);
    setBodyError(null);
    setSubmitError(null);
    setSubmitting(false);
  }, [open, inquiry]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inquiry || submitting) return;

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setBodyError("Reply message is required.");
      return;
    }

    setBodyError(null);
    setSubmitError(null);
    setSubmitting(true);

    try {
      const updated = await services.inquiries.replyInquiry(inquiry.id, {
        body: trimmedBody,
        markAnswered,
      });
      onReplied?.(updated);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to send email reply.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open && inquiry !== null}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Reply via Dev Club Email"
      subtitle="Replies are sent from the club mailbox, not your personal account."
      maxWidthClass="max-w-2xl"
    >
      {inquiry ? (
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
              htmlFor={toId}
              className="block text-sm font-medium text-[#4A5565]"
            >
              To
            </label>
            <input
              id={toId}
              type="email"
              readOnly
              value={inquiry.senderEmail}
              className="w-full h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-[#F8FAFC] font-mono text-sm sm:text-base text-[#1C1B1F] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={subjectId}
              className="block text-sm font-medium text-[#4A5565]"
            >
              Subject
            </label>
            <input
              id={subjectId}
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#1C1B1F] focus:outline-none focus:border-[#0038E1]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={bodyId}
              className="block text-sm font-medium text-[#4A5565]"
            >
              Reply message <span className="text-[#B41B00]">*</span>
            </label>
            <textarea
              id={bodyId}
              rows={6}
              required
              value={body}
              onChange={(event) => {
                const next = event.target.value;
                setBody(next);
                if (bodyError && next.trim()) {
                  setBodyError(null);
                }
              }}
              placeholder="Write your reply to send from the club mailbox..."
              aria-invalid={bodyError ? "true" : "false"}
              className={[
                "w-full min-h-[150px] px-3.5 py-2.5 rounded-[8px] border bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]",
                bodyError ? "border-[#FB4A2A]" : "border-[#A1A7B4]",
              ].join(" ")}
            />
            {bodyError ? (
              <p className="text-xs font-medium text-[#B41B00]">{bodyError}</p>
            ) : null}
          </div>

          <div className="flex items-start gap-3 pt-1">
            <input
              id={markAnsweredId}
              type="checkbox"
              checked={markAnswered}
              onChange={(event) => setMarkAnswered(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#0038E1] rounded border border-[#A1A7B4] cursor-pointer"
            />
            <label
              htmlFor={markAnsweredId}
              className="text-sm text-[#4A5565] cursor-pointer"
            >
              Mark this question as answered after sending
            </label>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#4A5565]">
              The question stays unanswered until your reply is sent.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2.5">
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
                <Send className="w-4 h-4" aria-hidden="true" />
                Send Reply
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

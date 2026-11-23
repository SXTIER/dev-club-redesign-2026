"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppData } from "@/context/AppDataContext";
import { ApiError } from "@/lib/services/contracts";
import { inquiryCreateInputSchema } from "@/lib/types/inquiries";

export interface AskQuestionModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormErrors {
  question?: string;
  senderEmail?: string;
  category?: string;
  consent?: string;
}

export function AskQuestionModal({ open, onClose }: AskQuestionModalProps) {
  const { home, services } = useAppData();
  const { askModal } = home.faq;

  const questionId = useId();
  const emailId = useId();
  const categoryId = useId();
  const consentId = useId();

  const questionErrorId = `${questionId}-error`;
  const emailErrorId = `${emailId}-error`;
  const categoryErrorId = `${categoryId}-error`;
  const consentErrorId = `${consentId}-error`;

  const questionRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  const defaultCategory = askModal.categories[0] ?? "";

  const [question, setQuestion] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (
      defaultCategory &&
      (!category || !askModal.categories.includes(category))
    ) {
      setCategory(defaultCategory);
    }
  }, [askModal.categories, category, defaultCategory]);

  const resetForm = () => {
    setQuestion("");
    setSenderEmail("");
    setCategory(defaultCategory);
    setConsent(false);
    setErrors({});
    setSubmitError(null);
    setSubmitting(false);
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateQuestion = (val: string): string | undefined =>
    val.trim().length === 0 ? "Please enter your question." : undefined;

  const validateEmail = (val: string): string | undefined => {
    const trimmed = val.trim();
    if (!trimmed) {
      return "Please enter a valid email address.";
    }
    const parsed = inquiryCreateInputSchema.shape.senderEmail.safeParse(trimmed);
    return parsed.success ? undefined : "Please enter a valid email address.";
  };

  const validateCategory = (val: string): string | undefined =>
    val.trim().length === 0 ? "Please select a category." : undefined;

  const validateConsent = (val: boolean): string | undefined =>
    val ? undefined : "PDPA consent is required before sending your question.";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors: FormErrors = {
      question: validateQuestion(question),
      senderEmail: validateEmail(senderEmail),
      category: validateCategory(category),
      consent: validateConsent(consent),
    };

    if (
      nextErrors.question ||
      nextErrors.senderEmail ||
      nextErrors.category ||
      nextErrors.consent
    ) {
      setErrors(nextErrors);
      if (nextErrors.question) questionRef.current?.focus();
      else if (nextErrors.senderEmail) emailRef.current?.focus();
      else if (nextErrors.category) categoryRef.current?.focus();
      else if (nextErrors.consent) consentRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await services.inquiries.submitInquiry({
        question: question.trim(),
        senderEmail: senderEmail.trim(),
        category: category.trim(),
        consent: true,
      });
      setSubmitted(true);
      setErrors({});
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Unable to send your question right now. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={askModal.title}
      subtitle={submitted ? undefined : askModal.subtitle}
      maxWidthClass="max-w-xl"
    >
      {submitted ? (
        <div className="py-4 space-y-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E7FDA7] text-[#548000]">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-ink">
              Question received — thank you!
            </h3>
            <p className="text-base leading-relaxed text-dark-gray">
              {askModal.successMessage}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Ask another question
            </Button>
            <Button type="button" variant="primary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          {submitError ? (
            <div
              role="alert"
              className="border border-[#FB4A2A] bg-[#FAAF98]/35 px-4 py-3 text-sm font-medium text-[#B41B00]"
            >
              {submitError}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor={questionId}
              className="block text-[15px] font-bold text-ink"
            >
              {askModal.questionLabel}
            </label>
            <textarea
              ref={questionRef}
              id={questionId}
              name="question"
              rows={4}
              required
              value={question}
              placeholder={askModal.questionPlaceholder}
              aria-invalid={errors.question ? "true" : "false"}
              aria-describedby={errors.question ? questionErrorId : undefined}
              onChange={(e) => {
                const next = e.target.value;
                setQuestion(next);
                if (errors.question && !validateQuestion(next)) {
                  setErrors((prev) => ({ ...prev, question: undefined }));
                }
              }}
              onBlur={() => {
                if (question.length > 0) {
                  setErrors((prev) => ({
                    ...prev,
                    question: validateQuestion(question),
                  }));
                }
              }}
              className={[
                "w-full min-h-[112px] rounded-lg border bg-white px-3 py-2.5 text-base sm:text-[15px] text-ink placeholder:text-gray focus:outline-2 focus:outline-offset-0 focus:outline-primary",
                errors.question ? "border-[#FB4A2A]" : "border-[#CBD5E1]",
              ].join(" ")}
            />
            {errors.question ? (
              <p id={questionErrorId} className="text-sm font-medium text-[#B41B00]">
                {errors.question}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={emailId}
              className="block text-[15px] font-bold text-ink"
            >
              {askModal.emailLabel}
            </label>
            <input
              ref={emailRef}
              id={emailId}
              name="senderEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={senderEmail}
              placeholder={askModal.emailPlaceholder}
              aria-invalid={errors.senderEmail ? "true" : "false"}
              aria-describedby={errors.senderEmail ? emailErrorId : undefined}
              onChange={(e) => {
                const next = e.target.value;
                setSenderEmail(next);
                if (errors.senderEmail && !validateEmail(next)) {
                  setErrors((prev) => ({ ...prev, senderEmail: undefined }));
                }
              }}
              onBlur={() => {
                if (senderEmail.length > 0) {
                  setErrors((prev) => ({
                    ...prev,
                    senderEmail: validateEmail(senderEmail),
                  }));
                }
              }}
              className={[
                "w-full min-h-[48px] rounded-lg border bg-white px-3 py-2.5 font-mono text-base sm:text-[15px] text-ink placeholder:text-gray focus:outline-2 focus:outline-offset-0 focus:outline-primary",
                errors.senderEmail ? "border-[#FB4A2A]" : "border-[#CBD5E1]",
              ].join(" ")}
            />
            {errors.senderEmail ? (
              <p id={emailErrorId} className="text-sm font-medium text-[#B41B00]">
                {errors.senderEmail}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={categoryId}
              className="block text-[15px] font-bold text-ink"
            >
              {askModal.categoryLabel}
            </label>
            <select
              ref={categoryRef}
              id={categoryId}
              name="category"
              required
              value={category}
              aria-invalid={errors.category ? "true" : "false"}
              aria-describedby={errors.category ? categoryErrorId : undefined}
              onChange={(e) => {
                const next = e.target.value;
                setCategory(next);
                if (errors.category && !validateCategory(next)) {
                  setErrors((prev) => ({ ...prev, category: undefined }));
                }
              }}
              className={[
                "w-full min-h-[48px] rounded-lg border bg-white px-3 py-2.5 text-base sm:text-[15px] text-ink focus:outline-2 focus:outline-offset-0 focus:outline-primary",
                errors.category ? "border-[#FB4A2A]" : "border-[#CBD5E1]",
              ].join(" ")}
            >
              {askModal.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p id={categoryErrorId} className="text-sm font-medium text-[#B41B00]">
                {errors.category}
              </p>
            ) : null}
          </div>

          <div className="pt-1 space-y-1.5">
            <div className="flex items-start gap-3 rounded-lg border border-[#D6D9E3] bg-[#F5F5FA] p-3">
              <input
                ref={consentRef}
                id={consentId}
                name="consent"
                type="checkbox"
                required
                checked={consent}
                aria-invalid={errors.consent ? "true" : "false"}
                aria-describedby={errors.consent ? consentErrorId : undefined}
                onChange={(e) => {
                  const next = e.target.checked;
                  setConsent(next);
                  if (errors.consent && next) {
                    setErrors((prev) => ({ ...prev, consent: undefined }));
                  }
                }}
                className="mt-1 h-5 w-5 shrink-0 accent-[#0038E1] rounded border-2 border-[#0038E1] cursor-pointer"
              />
              <div className="min-w-0 text-sm leading-relaxed text-dark-gray break-words">
                <label htmlFor={consentId} className="inline-flex min-h-11 items-center cursor-pointer">
                  {askModal.consentLabel}
                </label>{" "}
                <Link
                  href="/privacy-policy"
                  className="inline-flex min-h-11 items-center text-[#0038E1] font-medium underline underline-offset-4 hover:text-[#002BAA]"
                >
                  {askModal.privacyLinkLabel}
                </Link>
                <span aria-hidden="true" className="text-[#B41B00] font-semibold">
                  {" "}
                  *
                </span>
              </div>
            </div>
            {errors.consent ? (
              <p id={consentErrorId} className="text-sm font-medium text-[#B41B00]">
                {errors.consent}
              </p>
            ) : null}
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="rounded-lg text-[#0038E1]"
            >
              {askModal.cancelLabel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="rounded-lg border-0"
            >
              {askModal.submitLabel}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

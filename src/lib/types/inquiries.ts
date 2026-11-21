import { z } from "zod";

export const inquiryStatusSchema = z.enum(["Unanswered", "Answered"]);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

export const inquiryReplySchema = z.object({
  body: z.string().min(1),
  sentAt: z.string().min(1),
  sentBy: z.string().min(1),
});

export type InquiryReply = z.infer<typeof inquiryReplySchema>;

export const inquiryItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  senderEmail: z.string().email(),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)),
  status: inquiryStatusSchema,
  createdAt: z.string().min(1),
  reply: inquiryReplySchema.optional(),
});

export type InquiryItem = z.infer<typeof inquiryItemSchema>;

export const inquiryCreateInputSchema = z.object({
  question: z.string().min(1, "Question is required"),
  senderEmail: z.string().email("Valid email address is required"),
  category: z.string().min(1, "Category is required"),
  consent: z.literal(true),
});

export type InquiryCreateInput = z.infer<typeof inquiryCreateInputSchema>;

export const replyInputSchema = z.object({
  body: z.string().min(1, "Reply message is required"),
  markAnswered: z.boolean().default(true),
});

export type ReplyInput = z.infer<typeof replyInputSchema>;

/**
 * Private admin-only FAQ Bank item (`admin-seed.json` / `/faq-bank`).
 * Public Home FAQs live exclusively in `home.json` (`faq.items[]`).
 */
export const faqBankItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  promotedToHome: z.boolean().optional(),
});

export type FaqBankItem = z.infer<typeof faqBankItemSchema>;

export const faqBankUpsertInputSchema = faqBankItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FaqBankUpsertInput = z.infer<typeof faqBankUpsertInputSchema>;

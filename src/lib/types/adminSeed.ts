import { z } from "zod";
import { imageAssetSchema } from "./content";
import { faqBankItemSchema, inquiryItemSchema } from "./inquiries";
import { recruitmentApplicationSchema } from "./recruitment";

export const signinMemeSlideSchema = imageAssetSchema.extend({
  caption: z.string().optional(),
});

export type SigninMemeSlide = z.infer<typeof signinMemeSlideSchema>;

export const adminSeedSchema = z.object({
  applications: z.array(recruitmentApplicationSchema),
  inquiries: z.array(inquiryItemSchema),
  faqBank: z.array(faqBankItemSchema),
  signinMemes: z.array(signinMemeSlideSchema).min(2),
});

export type AdminSeedData = z.infer<typeof adminSeedSchema>;

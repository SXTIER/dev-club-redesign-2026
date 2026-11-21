import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "Pending",
  "Accepted",
  "Rejected",
]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const recruitmentTeamSchema = z.enum(["projects", "marketing"]);
export type RecruitmentTeam = z.infer<typeof recruitmentTeamSchema>;

export const recruitmentPersonalSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  nickname: z.string().min(1, "Nickname is required"),
  studentId: z
    .string()
    .regex(/^\d{7}$/, "Student ID must be exactly 7 digits"),
  email: z.string().email("Valid email address is required"),
  phone: z
    .string()
    .regex(/^0\d{9}$/, "Phone number must be 10 digits starting with 0"),
  program: z.string().min(1, "Program is required"),
  year: z.string().min(1, "Year is required"),
});

export type RecruitmentPersonalInfo = z.infer<typeof recruitmentPersonalSchema>;

export const recruitmentMotivationSchema = z.object({
  expectation: z.string().min(1, "Expectation is required"),
  contribution: z.string().min(1, "Contribution is required"),
  projectIdea: z.string().min(1, "Project idea is required"),
  teamExperience: z.string().min(1, "Team project experience is required"),
});

export type RecruitmentMotivationInfo = z.infer<
  typeof recruitmentMotivationSchema
>;

export const recruitmentCvMetaSchema = z.object({
  fileRef: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export type RecruitmentCvMeta = z.infer<typeof recruitmentCvMetaSchema>;

export const recruitmentApplicationSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  status: applicationStatusSchema,
  personal: recruitmentPersonalSchema,
  team: recruitmentTeamSchema,
  roleId: z.string().min(1),
  roleLabel: z.string().min(1),
  customRole: z.string().optional(),
  motivation: recruitmentMotivationSchema,
  cv: recruitmentCvMetaSchema.optional(),
  portfolioUrl: z.string().optional(),
  agreedRequirements: z.literal(true),
  agreedPdpa: z.literal(true),
});

export type RecruitmentApplication = z.infer<
  typeof recruitmentApplicationSchema
>;

export const recruitmentSubmitInputSchema = recruitmentApplicationSchema.omit({
  id: true,
  createdAt: true,
  status: true,
});

export type RecruitmentSubmitInput = z.infer<
  typeof recruitmentSubmitInputSchema
>;

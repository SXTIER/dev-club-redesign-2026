import { z } from "zod";

export const adminSessionSchema = z.object({
  email: z.string().email(),
  authenticated: z.boolean(),
  loggedInAt: z.string().min(1),
  token: z.string().optional(),
});

export type AdminSession = z.infer<typeof adminSessionSchema>;

export const loginInputSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginInputSchema>;

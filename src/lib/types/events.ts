import { z } from "zod";
import { imageAssetSchema } from "./content";

export const eventCategorySchema = z.enum(["Event", "News"]);
export type EventCategory = z.infer<typeof eventCategorySchema>;

export const eventStatusSchema = z.enum(["Published", "Draft"]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

/**
 * Single source of truth for Events & News items powering both
 * the public Home Timeline and Admin Events Management.
 */
export const eventItemSchema = z.object({
  id: z.string().min(1),
  marker: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  category: eventCategorySchema,
  dateLabel: z.string().min(1),
  location: z.string().min(1),
  description: z.string().min(1),
  coverImage: imageAssetSchema.optional(),
  status: eventStatusSchema,
  showOnHome: z.boolean(),
  order: z.number().int().nonnegative(),
  updatedAt: z.string().min(1),
});

export type EventItem = z.infer<typeof eventItemSchema>;

export const eventsListSchema = z.array(eventItemSchema);
export type EventsList = z.infer<typeof eventsListSchema>;

export const eventUpsertInputSchema = eventItemSchema.omit({
  id: true,
  updatedAt: true,
});

export type EventUpsertInput = z.infer<typeof eventUpsertInputSchema>;

import { z } from "zod";
import { editableImageSlotSchema } from "./content";

export const mediaKindSchema = z.enum(["image", "svg"]);
export type MediaKind = z.infer<typeof mediaKindSchema>;

/**
 * Media & Asset Library record stored in media.json (initial manifest)
 * and persisted in localStorage/IndexedDB or REST backend.
 */
export const mediaAssetSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  title: z.string().min(1),
  sourceSlot: editableImageSlotSchema.optional(),
  mimeType: z.string().min(1),
  kind: mediaKindSchema,
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  url: z.string().min(1),
  createdAt: z.string().min(1),
});

export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const mediaListSchema = z.array(mediaAssetSchema);
export type MediaList = z.infer<typeof mediaListSchema>;

export interface MediaUploadInput {
  file: File;
  title?: string;
  sourceSlot?: z.infer<typeof editableImageSlotSchema>;
}

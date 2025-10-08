import { z } from "zod";

export const sortProfileEnum = z.enum(["relevance", "newest", "alpha"]).optional();
export const sortJobEnum = z.enum(["relevance", "newest", "featured", "expiry"]).optional();

export const baseQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  city: z.string().trim().optional(),
  skills: z.array(z.string().trim()).optional(),
  page: z.coerce.number().int().positive().optional(),
});

export const profilesQuerySchema = baseQuerySchema.extend({
  sort: sortProfileEnum,
});

export const jobsQuerySchema = baseQuerySchema.extend({
  category: z.string().trim().optional(),
  sort: sortJobEnum,
  remote: z.literal("true").optional(),
  payType: z.enum(["paid", "unpaid", "negotiable"]).optional(),
});

export type ProfilesQueryInput = z.infer<typeof profilesQuerySchema>;
export type JobsQueryInput = z.infer<typeof jobsQuerySchema>;

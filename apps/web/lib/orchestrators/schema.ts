import { z } from "zod";

export const sortProfileEnum = z.enum(["relevance", "newest", "alpha"]).optional();
export const sortJobEnum = z.enum(["relevance", "newest", "featured", "expiry"]).optional();
const genderEnum = z.enum(["male", "female", "other"]);
const educationEnum = z.enum(["diploma", "associate", "bachelor", "master", "phd", "other"]);

export const baseQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  city: z.string().trim().optional(),
  skills: z.array(z.string().trim()).optional(),
  page: z.coerce.number().int().positive().optional(),
});

export const profilesQuerySchema = baseQuerySchema.extend({
  sort: sortProfileEnum,
  gender: z.array(genderEnum).optional(),
  ageMin: z.coerce.number().int().positive().max(120).optional(),
  ageMax: z.coerce.number().int().positive().max(120).optional(),
  edu: z.array(educationEnum).optional(),
  lang: z.array(z.string().trim()).optional(),
  accent: z.array(z.string().trim()).optional(),
});

export const jobsQuerySchema = baseQuerySchema.extend({
  category: z.string().trim().optional(),
  sort: sortJobEnum,
  remote: z.literal("true").optional(),
  payType: z.enum(["paid", "unpaid", "negotiable"]).optional(),
});

export type ProfilesQueryInput = z.infer<typeof profilesQuerySchema>;
export type JobsQueryInput = z.infer<typeof jobsQuerySchema>;

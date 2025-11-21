import { z } from "zod";

const absoluteUrl = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .superRefine((value, ctx) => {
      try {
        const parsed = new URL(value);
        if (!parsed.protocol || parsed.protocol.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} must include a protocol`,
          });
        }
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a valid absolute URL`,
        });
      }
    })
    .transform((value) => value.replace(/\/+$/, ""));

const schema = z.object({
  MEDIA_PUBLIC_BASE_URL: absoluteUrl("MEDIA_PUBLIC_BASE_URL or MEDIA_CDN_BASE_URL"),
  MEDIA_ORIGIN_BASE_URL: absoluteUrl("MEDIA_ORIGIN_BASE_URL"),
  MEDIA_CDN_SIGNED: z
    .union([z.literal("0"), z.literal("1")])
    .default("0"),
});

const config = schema.parse({
  MEDIA_PUBLIC_BASE_URL: process.env.MEDIA_PUBLIC_BASE_URL ?? process.env.MEDIA_CDN_BASE_URL,
  MEDIA_ORIGIN_BASE_URL: process.env.MEDIA_ORIGIN_BASE_URL,
  MEDIA_CDN_SIGNED: process.env.MEDIA_CDN_SIGNED ?? undefined,
});

export const mediaCdnConfig = {
  publicBaseUrl: config.MEDIA_PUBLIC_BASE_URL,
  cdnBaseUrl: config.MEDIA_PUBLIC_BASE_URL,
  originBaseUrl: config.MEDIA_ORIGIN_BASE_URL,
  isSignedCdn: config.MEDIA_CDN_SIGNED === "1",
} as const;

export type MediaCdnConfig = typeof mediaCdnConfig;

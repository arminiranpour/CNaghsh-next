export type SkillKey =
  | "acting_camera"
  | "acting_stage"
  | "voice_over"
  | "singing_pop"
  | "singing_traditional"
  | "dance_modern"
  | "dance_traditional"
  | "music_instrument_setar"
  | "music_instrument_guitar"
  | "directing_shortfilm"
  | "screenwriting"
  | "makeup_cinematic"
  | "photography_portrait"
  | "editing_video";

export const SKILLS: { key: SkillKey; label: string; category: string }[] = [
  { key: "acting_camera", label: "بازیگری جلوی دوربین", category: "acting" },
  { key: "acting_stage", label: "بازیگری تئاتر", category: "acting" },
  { key: "voice_over", label: "دوبله و صداپیشگی", category: "voice" },
  { key: "singing_pop", label: "خوانندگی پاپ", category: "voice" },
  { key: "singing_traditional", label: "خوانندگی سنتی", category: "voice" },
  { key: "dance_modern", label: "رقص مدرن", category: "dance" },
  { key: "dance_traditional", label: "رقص سنتی ایرانی", category: "dance" },
  { key: "music_instrument_setar", label: "نوازندگی سه‌تار", category: "music" },
  { key: "music_instrument_guitar", label: "نوازندگی گیتار", category: "music" },
  { key: "directing_shortfilm", label: "کارگردانی فیلم کوتاه", category: "production" },
  { key: "screenwriting", label: "فیلمنامه‌نویسی", category: "production" },
  { key: "makeup_cinematic", label: "گریم سینمایی", category: "production" },
  { key: "photography_portrait", label: "عکاسی پرتره", category: "visual" },
  { key: "editing_video", label: "تدوین ویدیو", category: "post" },
];

export const SKILL_KEYS = SKILLS.map((skill) => skill.key) as SkillKey[];

const SKILL_KEY_SET = new Set<SkillKey>(SKILL_KEYS);

export function isSkillKey(value: unknown): value is SkillKey {
  return typeof value === "string" && SKILL_KEY_SET.has(value as SkillKey);
}

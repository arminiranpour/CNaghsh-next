"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/use-toast";
import type { City } from "@/lib/location/cities";
import { LANGUAGE_LEVEL_MAX, type LanguageSkill } from "@/lib/profile/languages";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";
import type { UploadErrorResponse, UploadInitResponse } from "@/lib/media/types";
import type {
  AccentEntry,
  CourseEntry,
  ExperienceData,
  PortfolioEditInitialValues,
  ResumeEntry,
} from "@/lib/profile/portfolio-edit";
import {
  updateAccents,
  updateDegrees,
  updateExperience,
  updateLanguages,
  updateSkills,
  upsertPersonalInfo,
} from "@/lib/profile/profile-actions";

type ProvinceOption = {
  id: string;
  name: string;
};

type AudioAttachment = {
  mediaId: string;
  url: string;
  duration?: number | null;
};

type LanguageEntryState = {
  id: string;
  label: string;
  level: number | null;
  audio?: AudioAttachment | null;
};

type AccentEntryState = {
  id: string;
  title: string;
  audio?: AudioAttachment | null;
};

type SkillEntryState = {
  id: string;
  value: SkillKey | "";
};

type ResumeEntryState = ResumeEntry & { id: string };
type CourseEntryState = CourseEntry & { id: string };
type DegreeEntryState = {
  id: string;
  degreeLevel: string;
  major: string;
};

type PortfolioEditCenterPaneProps = {
  initialValues: PortfolioEditInitialValues;
  cities: City[];
  provinces: ProvinceOption[];
  onCancel: () => void;
  onSaved: () => void;
};

const AUDIO_MAX_BYTES = 10 * 1024 * 1024;
const POLL_INTERVAL_MS = 3000;
const DEGREE_LEVEL_OPTIONS = [
  "دیپلم",
  "کاردانی",
  "کارشناسی",
  "کارشناسی ارشد",
  "دکترا",
  "سایر",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolvePlaybackBase = () => {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBase && envBase.length > 0) {
    return envBase.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
};

const toAbsolutePlaybackUrl = (value: string) => {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base = resolvePlaybackBase();
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
};

const getAudioPlaybackUrl = (mediaId: string) => {
  return toAbsolutePlaybackUrl(`/api/media/${mediaId}/file`);
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const pad2 = (value: string) => value.padStart(2, "0");

async function uploadAudioFile(file: File): Promise<AudioAttachment> {
  const initResponse = await fetch("/api/media/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name || "audio",
      contentType: file.type || "audio/mpeg",
      sizeBytes: file.size,
    }),
  });

  const initPayload = (await initResponse.json()) as UploadInitResponse | UploadErrorResponse;

  if (!initResponse.ok || !("ok" in initPayload) || !initPayload.ok) {
    const message =
      (initPayload as UploadErrorResponse)?.messageFa ?? "خطا در شروع آپلود فایل صوتی.";
    throw new Error(message);
  }

  const mediaId = initPayload.mediaId;
  const signedUrl = initPayload.signedUrl;
  const checkStatusUrl = initPayload.next?.checkStatusUrl ?? `/api/media/${mediaId}/status`;
  const finalizeUrl = initPayload.next?.finalizeUrl ?? `/api/media/${mediaId}/finalize`;

  if (!mediaId || !signedUrl) {
    throw new Error("اطلاعات آپلود ناقص است.");
  }

  const putResponse = await fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error("بارگذاری فایل صوتی ناموفق بود.");
  }

  const finalizeResponse = await fetch(finalizeUrl, {
    method: "POST",
    cache: "no-store",
  });

  if (!finalizeResponse.ok) {
    throw new Error("تأیید نهایی آپلود ناموفق بود.");
  }

  const pollUntilReady = async () => {
    while (true) {
      const response = await fetch(checkStatusUrl, { cache: "no-store" });
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: string;
        errorMessage?: string | null;
        durationSec?: number | null;
      };

      if (!response.ok || !payload?.ok || !payload.status) {
        throw new Error("وضعیت آپلود قابل دریافت نیست.");
      }

      if (payload.status === "ready") {
        return {
          duration: typeof payload.durationSec === "number" ? payload.durationSec : null,
        };
      }

      if (payload.status === "failed") {
        throw new Error(payload.errorMessage || "پردازش فایل صوتی ناموفق بود.");
      }

      await sleep(POLL_INTERVAL_MS);
    }
  };

  const { duration } = await pollUntilReady();

  return {
    mediaId,
    url: getAudioPlaybackUrl(mediaId),
    duration,
  };
}

function LevelDots({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (level: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-row-reverse items-center gap-1">
      {Array.from({ length: LANGUAGE_LEVEL_MAX }).map((_, index) => {
        const level = index + 1;
        const isActive = value !== null && level <= value;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            disabled={disabled}
            className={`h-2.5 w-2.5 rounded-full transition ${
              isActive ? "bg-[#5C5A5A]" : "bg-[#D9D9D9]"
            }`}
          />
        );
      })}
    </div>
  );
}

function AudioUploadField({
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
  onError,
  disabled,
}: {
  value?: AudioAttachment | null;
  onChange: (value: AudioAttachment | null) => void;
  onUploadStart: () => void;
  onUploadEnd: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      if (!file.type.startsWith("audio/")) {
        onError("لطفاً یک فایل صوتی انتخاب کنید.");
        return;
      }

      if (file.size > AUDIO_MAX_BYTES) {
        onError("حجم فایل صوتی نباید بیشتر از ۱۰ مگابایت باشد.");
        return;
      }

      setIsUploading(true);
      onUploadStart();

      try {
        const result = await uploadAudioFile(file);
        onChange(result);
      } catch (error) {
        onError(error instanceof Error ? error.message : "آپلود فایل صوتی ناموفق بود.");
      } finally {
        setIsUploading(false);
        onUploadEnd();
      }
    },
    [onChange, onError, onUploadEnd, onUploadStart],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#7A7A7A]">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        className="flex h-[30px] w-full items-center justify-center rounded-full bg-[#EDEDED] px-3 text-[11px] text-[#6B6B6B]"
      >
        {isUploading ? "در حال آپلود..." : "بارگذاری فایل صوتی +"}
      </button>
      {value ? (
        <>
          <span className="text-[#4B4B4B]">فایل صوتی انتخاب شد</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled || isUploading}
            className="text-[#D56732]"
          >
            حذف
          </button>
        </>
      ) : null}
    </div>
  );
}

export function PortfolioEditCenterPane({
  initialValues,
  cities,
  provinces,
  onCancel,
  onSaved,
}: PortfolioEditCenterPaneProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [uploadingCount, setUploadingCount] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initialValues.firstName);
  const [lastName, setLastName] = useState(initialValues.lastName);
  const [bio, setBio] = useState(initialValues.bio);

  const [birthDate, setBirthDate] = useState(() => {
    if (!initialValues.birthDate) {
      return { year: "", month: "", day: "" };
    }
    const [year, month, day] = initialValues.birthDate.split("-");
    return { year: year ?? "", month: month ?? "", day: day ?? "" };
  });

  const [cityId, setCityId] = useState(initialValues.cityId);
  const [selectedProvinceId, setSelectedProvinceId] = useState(() => {
    const currentCity = cities.find((city) => city.id === initialValues.cityId);
    return currentCity?.provinceId ?? "";
  });

  const [skills, setSkills] = useState<SkillEntryState[]>(() =>
    initialValues.skills.map((skill) => ({ id: createId(), value: skill })),
  );

  const [languages, setLanguages] = useState<LanguageEntryState[]>(() =>
    initialValues.languages.map((language) => ({
      id: createId(),
      label: language.label,
      level: Number.isFinite(language.level) ? language.level : null,
      audio:
        language.mediaId && language.url
          ? {
              mediaId: language.mediaId,
              url: language.url,
              duration: language.duration ?? null,
            }
          : null,
    })),
  );

  const [accents, setAccents] = useState<AccentEntryState[]>(() =>
    initialValues.accents.map((accent) => ({
      id: createId(),
      title: accent.title,
      audio:
        accent.mediaId && accent.url
          ? {
              mediaId: accent.mediaId,
              url: accent.url,
              duration: accent.duration ?? null,
            }
          : null,
    })),
  );

  const [resumeEntries, setResumeEntries] = useState<ResumeEntryState[]>(() =>
    initialValues.resume.map((entry) => ({
      id: createId(),
      ...entry,
    })),
  );

  const [courseEntries, setCourseEntries] = useState<CourseEntryState[]>(() =>
    initialValues.courses.map((entry) => ({
      id: createId(),
      ...entry,
    })),
  );

  const [degreeEntries, setDegreeEntries] = useState<DegreeEntryState[]>(() =>
    initialValues.degrees.map((entry) => ({
      id: createId(),
      degreeLevel: entry.degreeLevel,
      major: entry.major,
    })),
  );

  const isUploading = uploadingCount > 0;
  const isBusy = isPending || isUploading;

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let year = current; year >= 1920; year -= 1) {
      years.push(year);
    }
    return years;
  }, []);

  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const filteredCities = useMemo(() => {
    if (!selectedProvinceId) {
      return cities;
    }
    return cities.filter((city) => city.provinceId === selectedProvinceId);
  }, [cities, selectedProvinceId]);

  const handleAddSkill = () => {
    setSkills((prev) => [...prev, { id: createId(), value: "" }]);
  };

  const handleRemoveSkill = (id: string) => {
    setSkills((prev) => prev.filter((entry) => entry.id !== id));
  };

  const updateSkillEntry = (id: string, value: SkillKey | "") => {
    setSkills((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, value } : entry)),
    );
  };

  const handleAddLanguage = () => {
    setLanguages((prev) => [
      ...prev,
      { id: createId(), label: "", level: null, audio: null },
    ]);
  };

  const handleAddAccent = () => {
    setAccents((prev) => [...prev, { id: createId(), title: "", audio: null }]);
  };

  const handleAddResume = () => {
    setResumeEntries((prev) => [
      ...prev,
      { id: createId(), type: "", title: "", position: "", role: "", director: "" },
    ]);
  };

  const handleAddCourse = () => {
    setCourseEntries((prev) => [...prev, { id: createId(), title: "", instructor: "" }]);
  };

  const handleAddDegree = () => {
    setDegreeEntries((prev) => [
      ...prev,
      { id: createId(), degreeLevel: "", major: "" },
    ]);
  };

  const updateResumeEntry = (id: string, patch: Partial<ResumeEntry>) => {
    setResumeEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const updateCourseEntry = (id: string, patch: Partial<CourseEntry>) => {
    setCourseEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const updateDegreeEntry = (id: string, patch: Partial<DegreeEntryState>) => {
    setDegreeEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const updateLanguageEntry = (id: string, patch: Partial<LanguageEntryState>) => {
    setLanguages((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const updateAccentEntry = (id: string, patch: Partial<AccentEntryState>) => {
    setAccents((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const cleanedFirstName = firstName.trim();
    const cleanedLastName = lastName.trim();

    if (!cleanedFirstName || !cleanedLastName) {
      setFormError("نام و نام خانوادگی الزامی است.");
      return;
    }

    if ((birthDate.year || birthDate.month || birthDate.day) &&
      (!birthDate.year || !birthDate.month || !birthDate.day)) {
      setFormError("لطفاً تاریخ تولد را کامل وارد کنید.");
      return;
    }

    const birthDateString =
      birthDate.year && birthDate.month && birthDate.day
        ? `${birthDate.year}-${pad2(birthDate.month)}-${pad2(birthDate.day)}`
        : "";

    const languagePayload: Array<LanguageSkill & Partial<AudioAttachment>> = [];
    const seenLanguages = new Set<string>();

    for (const entry of languages) {
      const label = entry.label.trim();
      const level = entry.level ?? null;

      if (!label || !level) {
        continue;
      }

      const key = label.toLowerCase();
      if (seenLanguages.has(key)) {
        setFormError("نام زبان‌ها باید یکتا باشد.");
        return;
      }

      seenLanguages.add(key);
      languagePayload.push({
        label,
        level,
        ...(entry.audio
          ? {
              mediaId: entry.audio.mediaId,
              url: entry.audio.url,
              duration: entry.audio.duration ?? null,
            }
          : {}),
      });
    }

    const accentPayload: AccentEntry[] = [];
    const seenAccents = new Set<string>();

    for (const entry of accents) {
      const title = entry.title.trim();
      if (!title) {
        continue;
      }

      const key = title.toLowerCase();
      if (seenAccents.has(key)) {
        setFormError("نام لهجه‌ها باید یکتا باشد.");
        return;
      }

      seenAccents.add(key);
      accentPayload.push({
        title,
        ...(entry.audio
          ? {
              mediaId: entry.audio.mediaId,
              url: entry.audio.url,
              duration: entry.audio.duration ?? null,
            }
          : {}),
      });
    }

    const cleanedSkills: SkillKey[] = [];
    const seenSkills = new Set<SkillKey>();

    for (const entry of skills) {
      if (!entry.value) {
        continue;
      }

      if (seenSkills.has(entry.value)) {
        setFormError("نام مهارت‌ها باید یکتا باشد.");
        return;
      }

      seenSkills.add(entry.value);
      cleanedSkills.push(entry.value);
    }

    const cleanedResume: ResumeEntry[] = resumeEntries
      .map((entry) => ({
        type: entry.type.trim(),
        title: entry.title.trim(),
        position: entry.position.trim(),
        role: entry.role.trim(),
        director: entry.director.trim(),
      }))
      .filter((entry) => Object.values(entry).some((value) => value));

    const cleanedCourses: CourseEntry[] = courseEntries
      .map((entry) => ({
        title: entry.title.trim(),
        instructor: entry.instructor.trim(),
      }))
      .filter((entry) => entry.title || entry.instructor);

    const cleanedDegrees = degreeEntries
      .map((entry) => ({
        degreeLevel: entry.degreeLevel.trim(),
        major: entry.major.trim(),
      }))
      .filter((entry) => entry.degreeLevel || entry.major);

    const experiencePayload: ExperienceData & {
      resume: ResumeEntry[];
      courses: CourseEntry[];
    } = {
      ...initialValues.experienceBase,
      resume: cleanedResume,
      courses: cleanedCourses,
    };

    const personalFormData = new FormData();
    personalFormData.set("firstName", cleanedFirstName);
    personalFormData.set("lastName", cleanedLastName);
    personalFormData.set("stageName", initialValues.stageName);
    personalFormData.set("age", initialValues.age ? String(initialValues.age) : "");
    personalFormData.set("phone", initialValues.phone ?? "");
    personalFormData.set("address", initialValues.address ?? "");
    personalFormData.set("cityId", cityId ?? "");
    personalFormData.set("avatarUrl", initialValues.avatarUrl ?? "");
    personalFormData.set("bio", bio.trim());
    personalFormData.set("introVideoMediaId", initialValues.introVideoMediaId ?? "");
    personalFormData.set("birthDate", birthDateString);

    const skillsFormData = new FormData();
    for (const skill of cleanedSkills) {
      skillsFormData.append("skills", skill);
    }

    const languagesFormData = new FormData();
    languagesFormData.set("languages", JSON.stringify(languagePayload));

    const accentsFormData = new FormData();
    accentsFormData.set("accents", JSON.stringify(accentPayload));

    const degreesFormData = new FormData();
    degreesFormData.set("degrees", JSON.stringify(cleanedDegrees));

    const experienceFormData = new FormData();
    experienceFormData.set("experience", JSON.stringify(experiencePayload));

    startTransition(() => {
      (async () => {
        const personalResult = await upsertPersonalInfo(personalFormData);
        if (!personalResult.ok) {
          setFormError(personalResult.error ?? "ذخیره اطلاعات شخصی ناموفق بود.");
          return;
        }

        const skillsResult = await updateSkills(skillsFormData);
        if (!skillsResult.ok) {
          setFormError(skillsResult.error ?? "ذخیره مهارت‌ها ناموفق بود.");
          return;
        }

        const degreesResult = await updateDegrees(degreesFormData);
        if (!degreesResult.ok) {
          setFormError(degreesResult.error ?? "ذخیره تحصیلات ناموفق بود.");
          return;
        }

        const languagesResult = await updateLanguages(languagesFormData);
        if (!languagesResult.ok) {
          setFormError(languagesResult.error ?? "ذخیره زبان‌ها ناموفق بود.");
          return;
        }

        const accentsResult = await updateAccents(accentsFormData);
        if (!accentsResult.ok) {
          setFormError(accentsResult.error ?? "ذخیره لهجه‌ها ناموفق بود.");
          return;
        }

        const experienceResult = await updateExperience(experienceFormData);
        if (!experienceResult.ok) {
          setFormError(experienceResult.error ?? "ذخیره رزومه ناموفق بود.");
          return;
        }

        toast({
          title: "اطلاعات ذخیره شد.",
          description: "پورتفولیو با موفقیت به‌روزرسانی شد.",
        });
        onSaved();
        router.refresh();
      })().catch(() => {
        setFormError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      });
    });
  };

  const inputClass =
    "h-[34px] w-full rounded-full bg-[#EFEFEF] px-4 text-[12px] text-[#6B6B6B] placeholder:text-[#B5B5B5] focus:outline-none";
  const selectClass = `${inputClass} appearance-none`;
  const sectionTitleClass = "text-[14px] font-semibold text-[#000000]";

  return (
    <section
      aria-label="فرم ویرایش پورتفولیو"
      className="absolute left-[273px] top-[315px] h-[804px] w-[797px] overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
      dir="rtl"
    >
      <form
        className="h-full w-full overflow-y-auto pb-10"
        onSubmit={handleSubmit}
      >
        <div className="px-[32px] pt-[22px]">
          <div className="flex items-center justify-between">
            <div className="text-[28px] font-black text-black">اطلاعات من</div>
          </div>

          <div className="mt-4 mx-auto flex w-[568px] items-center justify-between text-[12px] text-[#A2A2A2]">
  <span className="font-semibold text-[#F58A1F]">اطلاعات شخصی</span>
  <span>گالری تصاویر</span>
  <span>ویدئوها</span>
  <span>فایل‌های صوتی</span>
  <span>افتخارات</span>
</div>


          <div className="mt-4 rounded-[10px] bg-[#FFE6D3] px-4 py-3 text-[11px] leading-6 text-[#E57A20]">
            اطلاعات خواسته شده همان چیزهایی هستن که عوامل برای انتخاب بازیگر بیش‌تر توجه
            می‌کنند. هرچی اطلاعات کامل‌تر باشه، شانس انتخاب شدن بیشتر می‌شه. یادت باشه که
            داری مسیر حرفه‌ای خودت رو دقیق‌تر می‌کنی.
          </div>
        </div>

        <div className="space-y-8 px-[82px] pb-8 pt-6 text-[12px] text-[#5C5A5A]">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={sectionTitleClass}>نام و نام خانوادگی</label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  className={inputClass}
                  placeholder="نام"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={isBusy}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="نام خانوادگی"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={isBusy}
                  required
                />
              </div>
            </div>

<div className="space-y-2">
  <label className={sectionTitleClass}>تاریخ تولد</label>

  <div className="grid grid-cols-3 gap-7">
    {/* Day */}
    <div className="relative">
      <img
        src="/images/flash-down.png"
        alt=""
        className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2"
      />
      <select
        className={`${selectClass} pl-8`}
        value={birthDate.day}
        onChange={(event) =>
          setBirthDate((prev) => ({ ...prev, day: event.target.value }))
        }
        disabled={isBusy}
      >
        <option value="">روز</option>
        {dayOptions.map((day) => (
          <option key={day} value={String(day)}>
            {day}
          </option>
        ))}
      </select>
    </div>

    {/* Month */}
    <div className="relative">
      <img
        src="/images/flash-down.png"
        alt=""
        className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2"
      />
      <select
        className={`${selectClass} pl-8`}
        value={birthDate.month}
        onChange={(event) =>
          setBirthDate((prev) => ({ ...prev, month: event.target.value }))
        }
        disabled={isBusy}
      >
        <option value="">ماه</option>
        {monthOptions.map((month) => (
          <option key={month} value={String(month)}>
            {month}
          </option>
        ))}
      </select>
    </div>

    {/* Year */}
    <div className="relative">
      <img
        src="/images/flash-down.png"
        alt=""
        className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2"
      />
      <select
        className={`${selectClass} pl-8`}
        value={birthDate.year}
        onChange={(event) =>
          setBirthDate((prev) => ({ ...prev, year: event.target.value }))
        }
        disabled={isBusy}
      >
        <option value="">سال</option>
        {yearOptions.map((year) => (
          <option key={year} value={String(year)}>
            {year}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>

          </div>

          <div className="space-y-2">
<label className={sectionTitleClass}>محل سکونت</label>

<div className="grid grid-cols-[180px_180px] justify-items-start gap-4">
  {/* Province */}
  <div className="relative w-[180px]">
    <img
      src="/images/flash-down.png"
      alt=""
      className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2"
    />
    <select
      className={`${selectClass} pl-8 w-full`}
      value={selectedProvinceId}
      onChange={(event) => {
        const nextValue = event.target.value;
        setSelectedProvinceId(nextValue);
        if (!nextValue) return;

        const isCityInProvince = cities.some(
          (city) => city.id === cityId && city.provinceId === nextValue,
        );
        if (!isCityInProvince) setCityId("");
      }}
      disabled={isBusy}
    >
      <option value="">استان</option>
      {provinces.map((province) => (
        <option key={province.id} value={province.id}>
          {province.name}
        </option>
      ))}
    </select>
  </div>

  {/* City */}
  <div className="relative w-[180px]">
    <img
      src="/images/flash-down.png"
      alt=""
      className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2"
    />
    <select
      className={`${selectClass} pl-8 w-full`}
      value={cityId}
      onChange={(event) => setCityId(event.target.value)}
      disabled={isBusy}
    >
      <option value="">شهر</option>
      {filteredCities.map((city) => (
        <option key={city.id} value={city.id}>
          {city.name}
        </option>
      ))}
    </select>
  </div>
</div>
          </div>


          <div className="space-y-3">
            <label className={sectionTitleClass}>رشته تحصیلی / مدرک تحصیلی</label>
            <div className="space-y-3">
              {degreeEntries.map((entry) => {
                const options = entry.degreeLevel &&
                  !DEGREE_LEVEL_OPTIONS.includes(entry.degreeLevel)
                  ? [entry.degreeLevel, ...DEGREE_LEVEL_OPTIONS]
                  : DEGREE_LEVEL_OPTIONS;

                return (
                  <div key={entry.id} className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className={sectionTitleClass}>مدرک تحصیلی مرتبط</label>
                      <div className="relative">
                        <img
                          src="/images/flash-down.png"
                          alt=""
                          className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2"
                        />
                        <select
                          className={`${selectClass} pl-8`}
                          value={entry.degreeLevel}
                          onChange={(event) =>
                            updateDegreeEntry(entry.id, { degreeLevel: event.target.value })
                          }
                          disabled={isBusy}
                        >
                          <option value="">مدرک تحصیلی</option>
                          {options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={sectionTitleClass}>رشته تحصیلی</label>
                      <input
                        className={inputClass}
                        placeholder="رشته تحصیلی"
                        value={entry.major}
                        onChange={(event) =>
                          updateDegreeEntry(entry.id, { major: event.target.value })
                        }
                        disabled={isBusy}
                        maxLength={100}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDegreeEntries((prev) =>
                          prev.filter((item) => item.id !== entry.id),
                        )
                      }
                      className="col-span-2 text-right text-[12px] text-[#D56732]"
                      disabled={isBusy}
                    >
                      حذف ردیف
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleAddDegree}
                disabled={isBusy}
                className="flex h-[34px] w-full items-center justify-center rounded-full border border-dashed border-[#D1D1D1] text-[16px] text-[#B5B5B5]"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className={sectionTitleClass}>مهارت‌ها</label>
            {skills.length === 0 ? (
              <button
                type="button"
                onClick={handleAddSkill}
                disabled={isBusy}
                className="flex h-[34px] w-full items-center justify-center rounded-full border border-dashed border-[#D1D1D1] text-[16px] text-[#B5B5B5]"
              >
                +
              </button>
            ) : (
              <div className="space-y-3">
                {skills.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <img
                        src="/images/flash-down.png"
                        alt=""
                        className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2"
                      />
                      <select
                        className={`${selectClass} w-full pl-8`}
                        value={entry.value}
                        onChange={(event) =>
                          updateSkillEntry(entry.id, event.target.value as SkillKey | "")
                        }
                        disabled={isBusy}
                      >
                        <option value="">عنوان</option>
                        {SKILLS.map((skill) => (
                          <option key={skill.key} value={skill.key}>
                            {skill.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(entry.id)}
                      disabled={isBusy}
                      className="text-[12px] text-[#D56732]"
                    >
                      حذف
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={isBusy}
                  className="flex h-[34px] w-full items-center justify-center rounded-full border border-dashed border-[#D1D1D1] text-[16px] text-[#B5B5B5]"
                >
                  +
                </button>
              </div>
            )}
          </div>


          <div className="space-y-3">
            <label className={sectionTitleClass}>زبان</label>
            <div className="space-y-4">
              {languages.map((entry) => (
              <div
                key={entry.id}
                className="ml-8 rounded-[16px] border border-[#E3E3E3] bg-white px-4 py-3"
              >

                  <div className="flex items-center justify-between gap-4">
                    {/* Right side: Title + Level */}
                    <div className="flex items-center gap-6">
                      {/* Title */}
                      <input
                        className={`${inputClass} w-[360px]`}
                        placeholder="عنوان"
                        value={entry.label}
                        onChange={(event) =>
                          updateLanguageEntry(entry.id, { label: event.target.value })
                        }
                        disabled={isBusy}
                      />

                      {/* Level */}
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#7A7A7A]">میزان تسلط</span>
                        <LevelDots
                          value={entry.level}
                          onChange={(level) => updateLanguageEntry(entry.id, { level })}
                          disabled={isBusy}
                        />
                      </div>
                    </div>

                    {/* Left side: Delete */}
                    <button
                      type="button"
                      onClick={() =>
                        setLanguages((prev) => prev.filter((item) => item.id !== entry.id))
                      }
                      className="text-[12px] text-[#D56732]"
                      disabled={isBusy}
                    >
                      حذف
                    </button>
                  </div>

                  <div className="mt-3">
                    <AudioUploadField
                      value={entry.audio}
                      onChange={(audio) => updateLanguageEntry(entry.id, { audio })}
                      onUploadStart={() => setUploadingCount((prev) => prev + 1)}
                      onUploadEnd={() =>
                        setUploadingCount((prev) => (prev > 0 ? prev - 1 : 0))
                      }
                      onError={(message) => setFormError(message)}
                      disabled={isBusy}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddLanguage}
              disabled={isBusy}
              className="flex h-[34px] w-[600px] items-center justify-center rounded-full border border-dashed border-[#D1D1D1] text-[16px] text-[#B5B5B5]"
            >
              +
            </button>
          </div>

          <div className="space-y-3">
            <label className={sectionTitleClass}>لهجه</label>
            <div className="space-y-4">
              {accents.map((entry) => (
                <div
                  key={entry.id}
                  className="ml-8 rounded-[16px] border border-[#E3E3E3] bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <input
                      className={`${inputClass} w-[360px]`}
                      placeholder="عنوان"
                      value={entry.title}
                      onChange={(event) =>
                        updateAccentEntry(entry.id, { title: event.target.value })
                      }
                      disabled={isBusy}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAccents((prev) => prev.filter((item) => item.id !== entry.id))
                      }
                      className="text-[12px] text-[#D56732]"
                      disabled={isBusy}
                    >
                      حذف
                    </button>
                  </div>
                  <div className="mt-3">
                    <AudioUploadField
                      value={entry.audio}
                      onChange={(audio) => updateAccentEntry(entry.id, { audio })}
                      onUploadStart={() => setUploadingCount((prev) => prev + 1)}
                      onUploadEnd={() =>
                        setUploadingCount((prev) => (prev > 0 ? prev - 1 : 0))
                      }
                      onError={(message) => setFormError(message)}
                      disabled={isBusy}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddAccent}
              disabled={isBusy}
              className="flex h-[34px] w-[600px] items-center justify-center rounded-full border border-dashed border-[#D1D1D1] text-[16px] text-[#B5B5B5]"
            >
              +
            </button>
          </div>

          <div className="space-y-3">
            <label className={sectionTitleClass}>درباره من</label>
            <textarea
              className="h-[140px] w-full rounded-[16px] bg-[#EFEFEF] px-4 py-3 text-[12px] text-[#6B6B6B] placeholder:text-[#B5B5B5] focus:outline-none"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              disabled={isBusy}
              placeholder="متن درباره من"
            />
          </div>

          <div className="space-y-3">
            <label className={sectionTitleClass}>رزومه</label>
            <div className="space-y-4 rounded-[18px] border border-[#E3E3E3] bg-white p-4">
              {resumeEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-2 gap-3">
                  <input
                    className={inputClass}
                    placeholder="نوع اثر نمایشی"
                    value={entry.type}
                    onChange={(event) => updateResumeEntry(entry.id, { type: event.target.value })}
                    disabled={isBusy}
                  />
                  <input
                    className={inputClass}
                    placeholder="عنوان اثر"
                    value={entry.title}
                    onChange={(event) => updateResumeEntry(entry.id, { title: event.target.value })}
                    disabled={isBusy}
                  />
                  <input
                    className={inputClass}
                    placeholder="پوزیشن کاری"
                    value={entry.position}
                    onChange={(event) =>
                      updateResumeEntry(entry.id, { position: event.target.value })
                    }
                    disabled={isBusy}
                  />
                  <input
                    className={inputClass}
                    placeholder="عنوان نقش"
                    value={entry.role}
                    onChange={(event) => updateResumeEntry(entry.id, { role: event.target.value })}
                    disabled={isBusy}
                  />
                  <input
                    className={inputClass}
                    placeholder="نام کارگردان"
                    value={entry.director}
                    onChange={(event) =>
                      updateResumeEntry(entry.id, { director: event.target.value })
                    }
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setResumeEntries((prev) => prev.filter((item) => item.id !== entry.id))
                    }
                    className="text-right text-[12px] text-[#D56732]"
                    disabled={isBusy}
                  >
                    حذف ردیف
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddResume}
                disabled={isBusy}
                className="flex h-[34px] w-full items-center justify-center rounded-full border border-dashed border-[#D1D1D1] text-[16px] text-[#B5B5B5]"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className={sectionTitleClass}>دوره‌های گذرانده شده</label>
            <div className="space-y-4">
              {courseEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-2 gap-3">
                  <input
                    className={inputClass}
                    placeholder="عنوان دوره"
                    value={entry.title}
                    onChange={(event) => updateCourseEntry(entry.id, { title: event.target.value })}
                    disabled={isBusy}
                  />
                  <input
                    className={inputClass}
                    placeholder="نام استاد/آموزگار"
                    value={entry.instructor}
                    onChange={(event) =>
                      updateCourseEntry(entry.id, { instructor: event.target.value })
                    }
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCourseEntries((prev) => prev.filter((item) => item.id !== entry.id))
                    }
                    className="text-right text-[12px] text-[#D56732]"
                    disabled={isBusy}
                  >
                    حذف ردیف
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddCourse}
                disabled={isBusy}
                className="flex h-[34px] w-full items-center justify-center rounded-full border border-dashed border-[#D1D1D1] text-[16px] text-[#B5B5B5]"
              >
                +
              </button>
            </div>
          </div>

          {formError ? (
            <div className="rounded-[10px] bg-[#FFE6E6] px-4 py-2 text-[12px] text-[#D12424]">
              {formError}
            </div>
          ) : null}

          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="h-[38px] w-[140px] rounded-full border border-[#C9C9C9] text-[12px] text-[#6B6B6B]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="h-[38px] w-[180px] rounded-full bg-[#F58A1F] text-[12px] font-semibold text-white"
            >
              {isBusy ? "در حال ذخیره..." : "ذخیره اطلاعات"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

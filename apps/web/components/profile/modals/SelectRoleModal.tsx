"use client";

import Image from "next/image";

import GlassModal from "@/components/profile/modals/GlassModal";

type SelectRoleModalProps = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  actorName?: string;
  roles?: string[];
};

const DEFAULT_ROLES = ["نقش اول", "نقش مکمل", "نقش فرعی"];

export function SelectRoleModal({
  open,
  onClose,
  onContinue,
  actorName,
  roles,
}: SelectRoleModalProps) {
  const roleList = roles && roles.length > 0 ? roles : DEFAULT_ROLES;

  return (
    <GlassModal open={open} onClose={onClose} width={435} height={500}>
      <div className="relative h-[220px] w-[220px]">
        <Image
          src="/cineflash/profile/char-roles.png"
          alt="انتخاب نقش"
          fill
          sizes="220px"
          className="object-contain"
          priority
        />
      </div>

      <div className="space-y-2 text-center">
        <p className="text-[20px] font-semibold leading-[32px]">
          این بازیگر را برای کدام نقش انتخاب می‌کنید؟
        </p>
        {actorName ? (
          <p className="text-[16px] leading-7 text-neutral-800">
            بازیگر: <span className="font-bold">{actorName}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-1 flex w-full flex-wrap items-center justify-center gap-3">
        {roleList.map((role) => (
          <button
            key={role}
            type="button"
            className="
              px-4 py-2 rounded-full
              border border-[#FF7F19] text-[#FF7F19]
              bg-transparent font-semibold
              hover:bg-[#FFF3E6]/60
              transition
            "
          >
            {role}
          </button>
        ))}
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          className="
            w-[180px] h-[48px]
            rounded-full bg-[#FF7F19] text-white font-bold
            hover:bg-[#ff973f]
            transition
          "
          onClick={onContinue}
        >
          ادامه
        </button>
        <button
          type="button"
          onClick={onClose}
          className="
            w-[180px] h-[48px]
            rounded-full border border-[#FF7F19]
            bg-transparent text-[#FF7F19] font-bold
            hover:bg-[#FFF3E6]/60
            transition
          "
        >
          بستن
        </button>
      </div>
    </GlassModal>
  );
}

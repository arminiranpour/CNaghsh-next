"use client";

import Image from "next/image";

import GlassModal from "@/components/profile/modals/GlassModal";

type ChooseActorModalProps = {
  open: boolean;
  onClose: () => void;
  actorName?: string;
};

export function ChooseActorModal({
  open,
  onClose,
  actorName: _actorName,
}: ChooseActorModalProps) {
  return (
    <GlassModal open={open} onClose={onClose} width={435} height={500}>
      <div className="relative h-[260px] w-[260px]">
        <Image
          src="/cineflash/profile/char-writing.png"
          alt="انتخاب بازیگر"
          fill
          sizes="260px"
          className="object-contain"
          priority
        />
      </div>

      <div className="space-y-4 text-center">
        <p className="text-[20px] font-semibold leading-[36px]">
          برای انتخاب این بازیگر در سی‌نقش عضو شده و پروژه خود را ثبت کنید.
        </p>
      </div>

      <button
        type="button"
        className="
          mt-6 h-[48px] w-[180px]
          rounded-full border border-[#FF7F19]
          bg-transparent text-[16px] font-bold text-[#FF7F19]
          shadow-[0_8px_20px_rgba(0,0,0,0.25)]
          transition hover:bg-[#FFF3E6]/60
        "
      >
        ثبت نام
      </button>
    </GlassModal>
  );
}

"use client";

import Image from "next/image";

import GlassModal from "@/components/profile/modals/GlassModal";

type MessageSentModalProps = {
  open: boolean;
  onClose: () => void;
};

export function MessageSentModal({ open, onClose }: MessageSentModalProps) {
  return (
    <GlassModal open={open} onClose={onClose} width={435} height={500}>
      <div className="relative h-[220px] w-[220px]">
        <Image
          src="/cineflash/profile/message-sent.png"
          alt="پیام ارسال شد"
          fill
          sizes="220px"
          className="object-contain"
          priority
        />
      </div>

      <div className="space-y-3 text-center">
        <p className="text-[20px] font-semibold leading-[32px]">
          پیام با موفقیت ارسال شد!
        </p>
        <p className="text-[16px] leading-7 text-neutral-800">
          بازیگر انتخابی شما پیام همکاری را دریافت خواهد کرد.
        </p>
      </div>

      <div className="mt-auto flex w-full justify-center pt-2">
        <button
          type="button"
          onClick={onClose}
          className="
            w-[180px] h-[48px]
            rounded-full bg-[#FF7F19] text-white font-bold
            hover:bg-[#ff973f]
            transition
          "
        >
          باشه
        </button>
      </div>
    </GlassModal>
  );
}

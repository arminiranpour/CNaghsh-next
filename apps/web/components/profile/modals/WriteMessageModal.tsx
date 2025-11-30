"use client";

import Image from "next/image";

import GlassModal from "@/components/profile/modals/GlassModal";

type WriteMessageModalProps = {
  open: boolean;
  onClose: () => void;
  onSend: () => void;
  actorName?: string;
};

export function WriteMessageModal({
  open,
  onClose,
  onSend,
  actorName,
}: WriteMessageModalProps) {
  return (
    <GlassModal open={open} onClose={onClose} width={435} height={500}>


      <div className="space-y-2 text-center">
        <p className="text-[20px] font-semibold leading-[32px]">
          ارسال پیام همکاری به این بازیگر
        </p>

      </div>

      <div className="w-full">
        <textarea
          className="
            w-full h-[140px] p-4 rounded-2xl
            bg-white/20 border border-white/30
            backdrop-blur-md
            text-black placeholder:text-neutral-500
            focus:outline-none focus:ring-2 focus:ring-[#FF7F19]/50
          "
          placeholder="پیام خود را بنویسید..."
        />
      </div>

      <div className="mt-auto flex w-full justify-center pt-2">
        <button
          type="button"
          className="
            w-[180px] h-[48px]
            rounded-full bg-[#FF7F19] text-white font-bold
            hover:bg-[#ff973f]
            transition
          "
          onClick={onSend}
        >
          ارسال پیام
        </button>
      </div>
    </GlassModal>
  );
}

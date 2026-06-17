"use client";

import Image from "next/image";

export default function CommunityBanner() {
  return (
    <section
      dir="rtl"
      className="mt-20 mb-20 w-full px-4 sm:mt-24 sm:px-6 lg:mt-[200px] lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1155px]">
        <div className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,#000000_0%,#CCCCCC_78%)] lg:overflow-visible lg:bg-[linear-gradient(90deg,#000000_0%,#CCCCCC_80%)]">
          <div className="flex flex-col items-center gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:min-h-[272px] lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-10 lg:py-8">
            <div className="order-2 flex w-full max-w-[650px] flex-col items-center text-center lg:order-1 lg:items-start lg:text-right">
              <h2 className="font-iransans text-[26px] font-bold leading-tight text-[#F58A1F] sm:text-[30px] lg:text-[35px]">
                همه ما یک جامعه هستیم!
              </h2>

              <p className="mt-4 font-iransans text-[16px] font-normal leading-8 text-black sm:text-[18px] lg:text-[20px]">
                به انجمن متخصصان بازیگری بپیوندید. کار پیدا کنید، همکاری کنید و از
                یکدیگر حمایت کنید. همه در یک مکان.
              </p>

              <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
                <button
                  type="button"
                  className="h-11 w-full rounded-full border-2 border-[#1E3016] px-6 font-iransans text-[16px] font-bold text-[#1E3016] transition-colors hover:bg-[#1E3016] hover:text-white sm:w-auto sm:text-[18px] lg:h-[46px] lg:text-[20px]"
                >
                  به سی‌نقش بپیوندید.
                </button>

                <button
                  type="button"
                  className="h-11 w-full rounded-full border-2 border-black bg-transparent px-6 font-iransans text-[16px] font-bold text-black transition-colors hover:bg-black hover:text-white sm:w-auto sm:text-[18px] lg:h-[46px] lg:text-[20px]"
                >
                  سوالی داری؟
                </button>
              </div>
            </div>

            <div className="order-1 flex w-full justify-center lg:order-2 lg:w-auto">
              <Image
                src="/cineflash/home/categories/cineflash-3d.png"
                alt="cineflash community illustration"
                width={423}
                height={423}
                unoptimized
                priority
                className="h-auto w-full max-w-[220px] sm:max-w-[260px] md:max-w-[320px] lg:max-w-[423px] lg:-translate-x-4 lg:-translate-y-14"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

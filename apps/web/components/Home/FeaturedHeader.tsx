import Image from "next/image";

type Props = {
  title?: string;
  titleColor?: string;
  buttonImageSrc?: string;
  arrowImageSrc?: string;
};

export default function FeaturedHeader({
  buttonImageSrc = "/cineflash/home/Bazigaran/AdvancedSearchButton.png",
  arrowImageSrc = "/cineflash/home/Bazigaran/ArrowRight.png",
  titleColor = "#F58A1F",
  title = "بازیگران برتر سی‌نقش",
}: Props) {
  return (
    <div className="relative mx-auto w-full max-w-[1526px] px-[10px] sm:px-[10px] lg:pl-[143px] lg:pr-[143px] min-h-[50px]">
      <div className="flex min-h-[50px] items-center justify-between gap-4">
        <div
          className="
            min-w-0 font-bold text-right
            text-[13px]
            min-[350px]:text-[18px]
            sm:text-[25px]
            lg:text-[30px]
            leading-[32px]
            min-[318px]:leading-[34px]
            sm:leading-[36px]
            lg:leading-[40px]
            whitespace-nowrap truncate
          "
          style={{ fontFamily: "IRANSans", color: titleColor, letterSpacing: 0 }}
        >
          {title}
        </div>


        <button
          type="button"
          aria-label="جستجو و جوی پیشرفته"
          className="relative shrink-0 cursor-pointer border-0 bg-transparent p-0"
        >
          <span
            className="flex h-[32px] w-[160px] items-center justify-center rounded-full bg-[#F58A1F] text-[14px] font-semibold text-white sm:h-[36px] sm:w-[180px] sm:text-[15px] lg:h-[40px] lg:w-[221px] lg:text-[16px]"
            style={{ fontFamily: "IRANSans" }}
          >
            جست و جوی پیشرفته
          </span>
        </button>
      </div>
    </div>
  );
}

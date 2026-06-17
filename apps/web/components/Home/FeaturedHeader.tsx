import Image from "next/image";

type Props = {
  title?: string;
  titleColor?: string;
  buttonImageSrc?: string;
  arrowImageSrc?: string;
};

export default function FeaturedHeader({
  buttonImageSrc = "/cineflash/home/Bazigaran/AdvancedSearchButton.png",
  titleColor = "#F58A1F",
  title = "بازیگران برتر سی‌نقش",
}: Props) {
  const containerW = 1526;
  const headerH = 50;

  const titleLeft = 1080;
  const buttonLeft = 143;



  return (
    <div className="relative mx-auto" style={{ width: containerW, height: headerH }}>
      <button
        type="button"
        aria-label="جستجو و جوی پیشرفته"
        className="absolute"
        style={{
          left: buttonLeft,
          top: 0,
          width: 221,
          height: 40,
          border: "none",
          padding: 0,
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <span className="relative block w-full h-full">
          <Image
            src={buttonImageSrc}
            alt=""
            fill
            unoptimized
            sizes="221px"
            style={{ objectFit: "contain" }}
            priority
          />
        </span>
      </button>

      <div
        className="absolute  font-bold"
        style={{
          fontFamily: "IRANSans",
          left: titleLeft,
          top: 0,
          lineHeight: "40px",
          height: 40,
          fontSize: 25,
          color: titleColor,
          letterSpacing: 0,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>


    </div>
  );
}

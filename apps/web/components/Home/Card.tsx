import Image from "next/image";

type FeaturedCardProps = {
  name: string;
  age: number;
  level: string;
  rating: number;
  avatarSrc: string;
  frameSrc?: string;
  starSrc?: string;
};

export default function Card({
  name,
  age,
  level,
  rating,
  avatarSrc,
  frameSrc = "/cineflash/home/Bazigaran/CardFrame.png",
  starSrc = "/cineflash/home/Bazigaran/Star.png",
}: FeaturedCardProps) {
  const STAR_W = 12;
  const STAR_H = 11;
  const NUM_H = 19;

  return (
    <div
      className="
        transition-transform duration-300 ease-out
        w-[280px] h-[312px]
        hover:scale-[1.25]
        flex items-center justify-center
      "
      style={{ direction: "rtl" }}
    >
      <div
        className="
          relative flex flex-col items-center justify-start text-center
          w-[280px] h-[312px]
        "
      >
        {/* Frame */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={frameSrc}
            alt="قاب کارت"
            fill
            unoptimized
            sizes="280px"
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Avatar */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: 57,
            left: 84,
            width: 113,
            height: 99,
            borderRadius: "15px",
          }}
        >
          <Image
            src={avatarSrc}
            alt={name}
            fill
            sizes="113px"
            style={{ objectFit: "cover" }}
          />
        </div>

        {/* Star */}
        <div
          className="absolute"
          style={{
            top: 177,
            left: 84,
            width: STAR_W,
            height: STAR_H,
          }}
        >
          <Image
            src={starSrc}
            alt="ستاره"
            fill
            unoptimized
            sizes={`${STAR_W}px`}
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Rating */}
        <div
          className="absolute font-iransans"
          style={{
            top: 176,
            left: 95,
            fontSize: 12,
            fontWeight: 600,
            lineHeight: `${NUM_H}px`,
            color: "#FF7F19",
          }}
        >
          {rating}
        </div>

        {/* Level */}
        <div
          className="absolute flex items-center justify-center font-iransans"
          style={{
            left: 163,
            top: 177,
            width: 47,
            height: 14,
            backgroundColor: "#Ff7F19",
            borderRadius: 19,
          }}
        >
          <span
            style={{
              fontFamily: "IRANSans",
              fontSize: 10,
              color: "#ffffff",
              lineHeight: "14px",
              fontWeight: 500,
            }}
          >
            {level}
          </span>
        </div>

        {/* Name + Age */}
        <div
          className="absolute w-full text-center"
          style={{ bottom: 68, left: 0 }}
        >
          <div
            style={{
              fontFamily: "IRANSans",
              fontSize: 18,
              fontWeight: 800,
              color: "#0F0F0F",
              lineHeight: "34px",
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 6,
              fontFamily: "IRANSans",
              fontSize: 11,
              fontWeight: 400,
              color: "#0F0F0F",
            }}
          >
            سن: {age} سال
          </div>
        </div>
      </div>
    </div>
  );
}

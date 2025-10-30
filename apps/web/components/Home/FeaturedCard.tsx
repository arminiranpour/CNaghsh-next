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

function Card({
  name,
  age,
  level,
  rating,
  avatarSrc,
  frameSrc = "/cineflash/home/Bazigaran/CardFrame.png",
  starSrc = "/cineflash/home/Bazigaran/Star.png",
}: FeaturedCardProps) {
  const CARD_W = 408;
  const CARD_H = 392;

  const IMG_X = 20;     
  const IMG_Y = 20;    
  const IMG_W = 368;
  const IMG_H = 250;

  const STAR_W = 12;
  const STAR_H = 11;
  const NUM_W = 27;
  const NUM_H = 19;

  const STAR_LEFT = IMG_X + 10;                
  const STAR_TOP  = IMG_Y + IMG_H + 22;         

  const NUM_LEFT  = STAR_LEFT + STAR_W + 6;   
  const NUM_TOP   = STAR_TOP - 4;               

  const LEVEL_RIGHT = CARD_W - (IMG_X + 10);
  const LEVEL_TOP   = STAR_TOP - 6;

  return (
    <div
      className="relative flex flex-col items-center justify-start text-center"
      style={{ width: 408, height: 392, direction: "rtl" }}
    >
      {/* قاب کارت -*/}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src={frameSrc}
          alt="قاب کارت"
          fill
          unoptimized
          sizes="408px"
          style={{ objectFit: "contain" }}
          priority
        />
      </div>

      {/* عکس کاربر درون قاب خاکستری */}
<div
  className="absolute overflow-hidden " 
  style={{
    top: 71,
    left: 122,
    width: 164,
    height: 144,
     borderRadius: "15px",
  }}
>
  <Image
    src={avatarSrc}
    alt={name}
    fill
    sizes="164px"
    style={{
      objectFit: "cover",
       
    }}
    priority
  />
</div>


       {/* ⭐ ستاره */}
      <div
        className="absolute"
        style={{
          top: 223,
          left: 122,
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
          priority
        />
      </div>
      {/* عدد امتیاز  */}
      <div
        className="absolute font-iransans"
        style={{
          top: 221,
          left: 138,
          
          fontSize: 12,    
          fontWeight: 600,
          lineHeight: `${NUM_H}px`,
          color: "#FF7F19",
        }}
      >
        {rating}
      </div>


      {/* 🔶 دکمه سطح کاربر (مثلاً پیشرفته) */}
<div
  className="absolute flex items-center justify-center font-iransans"
  style={{
    left: 237, 
    top: 223, 
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


      {/* نام و سن */}
       <div className="absolute w-full text-center " style={{ bottom: 85, left: 0 }}>
        <div
          style={{
            fontFamily: "IRANSans",
            fontSize: 18,   // نام: Bold 28
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
            fontSize: 11,   // سن: Regular 17
            fontWeight: 400,
            color: "#0F0F0F",
          }}
        >
          سن: {age} سال
        </div>
      </div>
    </div>
  );
}

export default function FeaturedCard() {
  // 🔸 دمو داده‌ها — بعداً حذف می‌شن
  const demoActors = [
    {
      name: "نام و نام خانوادگی",
      age: 32,
      level: "پیشرفته",
      rating: 2539,
      avatarSrc: "/cineflash/home/Bazigaran/ActorDemo.jpg",
    },
    {
      name: "کاربر نمونه دوم",
      age: 27,
      level: "حرفه‌ای",
      rating: 2711,
      avatarSrc: "/cineflash/home/Bazigaran/ActorDemo.jpg",
    },
  ];

  return (
    <div
      className="relative mx-auto flex justify-center gap-8 mt-[40px]"
      style={{
        width: 1526,
        direction: "rtl",
      }}
    >
      {demoActors.map((actor, i) => (
        <Card key={i} {...actor} />
      ))}
    </div>
  );
}

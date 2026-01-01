import Link from "next/link";

type CourseCardProps = {
  id: string;
  title: string;
  ageRangeText: string | null;
  imageUrl: string | null;
};

export default function CourseCard({ id, title, ageRangeText, imageUrl }: CourseCardProps) {
  return (
    <div
      className="overflow-hidden shadow-lg"
      style={{
        borderRadius: "30px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#1a1a1a",
      }}
      dir="rtl"
    >
      <div
        className="relative"
        style={{
          width: "360px",
          height: "360px",
          backgroundColor: "#1a1a1a",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: "#2a2a2a" }}
          >
            <p className="text-sm text-gray-400">بدون تصویر</p>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "transparent",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            width: "100%",
          }}
        >
          <p
            className="flex-1 text-sm text-white"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
          >
            {title}
          </p>

          <Link
            href={`/courses/${id}`}
            className="rounded-[32px] bg-white px-6 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
            style={{ whiteSpace: "nowrap" }}
          >
            ثبت نام
          </Link>
        </div>
      </div>
    </div>
  );
}

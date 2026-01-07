import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="border-t border-border bg-card/50"
      style={{
        direction: "rtl",
        fontFamily: "IRANSans",
      }}
    >
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          {/* Column 1: Logo */}
          <div className="flex flex-col">
            <div
              style={{
                position: "relative",
                width: 140,
                height: 43,
                marginBottom: 16,
              }}
            >
              <Image
                src="/cineflash/home/header/cnaghsh-logo.png"
                alt="CNAGHSH ART GROUP"
                fill
                sizes="140px"
                style={{ objectFit: "contain" }}
                unoptimized
                priority
              />
            </div>
          </div>

          {/* Column 2: Si Naghsh Links */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-semibold text-foreground">سی نقش</h3>
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              خانه
            </Link>
            <Link
              href="/about"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              درباره سی نقش
            </Link>
          </div>

          {/* Column 3: Profile Links */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-semibold text-foreground">پروفایل</h3>
            <Link
              href="/dashboard/profile"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ثبت نام
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              خرید اشتراک
            </Link>
            <Link
              href="/dashboard/profile"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              تکمیل پورتفولیو
            </Link>
          </div>

          {/* Column 4: Contact */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-semibold text-foreground">ارتباط با ما</h3>
            <div className="flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Instagram"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://telegram.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Telegram"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </a>
              <a
                href="mailto:contact@cnaghsh.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Email"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 5: Newsletter */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-semibold text-foreground">
              به خبرنامه سی نقش بپیوندید
            </h3>
            <form className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="آدرس ایمیل"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                ارسال
              </button>
            </form>
          </div>
        </div>
      </div>
    </footer>
  );
}


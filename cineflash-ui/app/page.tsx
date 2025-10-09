import { ArrowLeft, ArrowRight, Instagram, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function CineFlashPage() {
  return (
    <div className="min-h-screen bg-[#000000] font-sans" dir="rtl">
      {/* Hero Section */}
      <section className="relative bg-[#000000] px-6 py-12 md:px-12 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative rounded-[2.5rem] border-4 border-[#ffffff] p-8 md:p-12">
            <img
              src="/vintage-black-and-white-cinematographer-with-film-.jpg"
              alt="Vintage cinematographer"
              className="h-[400px] w-full object-cover rounded-2xl md:h-[500px]"
            />

            {/* Back Arrow */}
            <button className="absolute bottom-8 left-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffffff]/10 backdrop-blur-sm hover:bg-[#ffffff]/20 transition-colors">
              <ArrowLeft className="h-6 w-6 text-[#ffffff]" />
            </button>

            {/* About Button */}
            <Button
              variant="secondary"
              className="absolute bottom-8 right-8 rounded-full bg-[#ffffff] px-6 py-2 text-sm text-[#000000] hover:bg-[#e5e5e5]"
            >
              درباره سی‌نفلش
            </Button>
          </div>

          {/* Title and Description */}
          <div className="mt-8 text-center">
            <h1 className="text-5xl font-bold text-[#ff7f19] md:text-6xl lg:text-7xl">سی‌نفلش</h1>
            <div className="mt-4 flex items-center justify-center gap-4 text-lg text-[#ffffff] md:text-xl">
              <span>سینما</span>
              <span>آرتیستیک</span>
              <span>تئاتر</span>
            </div>
            <p className="mt-6 text-sm text-[#ffffff] md:text-base">
              بزرگترین جامعهٔ جهانی بازیگران فیلم، تئاتر، شبکه‌های خانگی، تلویزیون
            </p>
          </div>
        </div>
      </section>

      {/* Category Cards Section */}
      <section className="bg-[#e5e5e5] px-6 py-16 md:px-12 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1 */}
            <Card className="flex flex-col items-center justify-center rounded-3xl bg-[#d9d9d9] p-8 shadow-lg transition-transform hover:scale-105">
              <div className="mb-4 h-24 w-24">
                <img
                  src="/child-and-teen-actors-icon-illustration.jpg"
                  alt="Child actors"
                  className="h-full w-full object-contain opacity-60"
                />
              </div>
              <p className="text-center text-sm text-[#000000]">بازیگران کودک و نوجوان دختر</p>
            </Card>

            {/* Card 2 */}
            <Card className="flex flex-col items-center justify-center rounded-3xl bg-[#d9d9d9] p-8 shadow-lg transition-transform hover:scale-105">
              <div className="mb-4 h-24 w-24">
                <img
                  src="/child-and-teen-boy-actors-icon-illustration.jpg"
                  alt="Child actors"
                  className="h-full w-full object-contain opacity-60"
                />
              </div>
              <p className="text-center text-sm text-[#000000]">بازیگران کودک و نوجوان پسر</p>
            </Card>

            {/* Card 3 - Highlighted */}
            <Card className="flex flex-col items-center justify-center rounded-3xl bg-[#d9d9d9] p-8 shadow-lg transition-transform hover:scale-105">
              <div className="mb-4 h-24 w-24">
                <img
                  src="/female-supporting-actress-icon-orange.jpg"
                  alt="Supporting actors"
                  className="h-full w-full object-contain"
                  style={{
                    filter: "invert(48%) sepia(79%) saturate(2476%) hue-rotate(346deg) brightness(104%) contrast(97%)",
                  }}
                />
              </div>
              <p className="text-center text-sm font-semibold text-[#ff7f19]">بازیگران پرنفلش حامی</p>
            </Card>

            {/* Card 4 */}
            <Card className="flex flex-col items-center justify-center rounded-3xl bg-[#d9d9d9] p-8 shadow-lg transition-transform hover:scale-105">
              <div className="mb-4 h-24 w-24">
                <img
                  src="/male-principal-actor-icon-illustration.jpg"
                  alt="Principal actors"
                  className="h-full w-full object-contain opacity-60"
                />
              </div>
              <p className="text-center text-sm text-[#000000]">بازیگران پرنفلش اول</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Actor Carousel Section */}
      <section className="bg-[#e5e5e5] px-6 pb-16 md:px-12 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <Button
              variant="outline"
              className="rounded-full border-2 border-[#ff7f19] bg-transparent px-6 py-2 text-sm text-[#ff7f19] hover:bg-[#ff7f19] hover:text-[#ffffff]"
            >
              جست و جوی پیشرفته
            </Button>
            <h2 className="text-2xl font-bold text-[#ff7f19] md:text-3xl">بازیگران برتر سی‌نفلش</h2>
          </div>

          <div className="relative">
            {/* Left Arrow */}
            <button className="absolute -left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#000000] text-[#ffffff] shadow-lg hover:bg-[#1e3016] transition-colors">
              <ArrowRight className="h-6 w-6" />
            </button>

            {/* Actor Cards */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {/* Card 1 */}
              <Card className="min-w-[200px] flex-shrink-0 rounded-3xl bg-[#ffffff] p-4 shadow-lg">
                <div className="relative mb-3">
                  <img
                    src="/professional-headshot-male-actor.jpg"
                    alt="Actor"
                    className="h-[200px] w-full rounded-2xl object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-[#ff7f19] px-3 py-1 text-xs text-[#ffffff]">
                    برگزیده
                  </span>
                </div>
                <h3 className="text-center text-sm font-semibold text-[#000000]">نام و نام خانوادگی</h3>
                <p className="text-center text-xs text-[#979797]">سن ۳۲ سال</p>
              </Card>

              {/* Card 2 */}
              <Card className="min-w-[200px] flex-shrink-0 rounded-3xl bg-[#ffffff] p-4 shadow-lg">
                <div className="relative mb-3">
                  <img
                    src="/professional-headshot-male-actor-smiling.jpg"
                    alt="Actor"
                    className="h-[200px] w-full rounded-2xl object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-[#ff7f19] px-3 py-1 text-xs text-[#ffffff]">
                    برگزیده
                  </span>
                </div>
                <h3 className="text-center text-sm font-semibold text-[#000000]">نام و نام خانوادگی</h3>
                <p className="text-center text-xs text-[#979797]">سن ۳۲ سال</p>
              </Card>

              {/* Card 3 - Highlighted */}
              <Card className="min-w-[220px] flex-shrink-0 rounded-3xl border-4 border-[#ff7f19] bg-[#ffffff] p-4 shadow-xl">
                <div className="relative mb-3">
                  <img
                    src="/professional-headshot-male-actor-business-casual.jpg"
                    alt="Actor"
                    className="h-[220px] w-full rounded-2xl object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-[#ff7f19] px-3 py-1 text-xs text-[#ffffff]">
                    برگزیده
                  </span>
                </div>
                <h3 className="text-center text-sm font-semibold text-[#000000]">نام و نام خانوادگی</h3>
                <p className="text-center text-xs text-[#979797]">سن ۳۲ سال</p>
              </Card>

              {/* Card 4 */}
              <Card className="min-w-[200px] flex-shrink-0 rounded-3xl bg-[#ffffff] p-4 shadow-lg">
                <div className="relative mb-3">
                  <img
                    src="/professional-headshot-male-actor-confident.jpg"
                    alt="Actor"
                    className="h-[200px] w-full rounded-2xl object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-[#ff7f19] px-3 py-1 text-xs text-[#ffffff]">
                    برگزیده
                  </span>
                </div>
                <h3 className="text-center text-sm font-semibold text-[#000000]">نام و نام خانوادگی</h3>
                <p className="text-center text-xs text-[#979797]">سن ۳۲ سال</p>
              </Card>

              {/* Card 5 */}
              <Card className="min-w-[200px] flex-shrink-0 rounded-3xl bg-[#ffffff] p-4 shadow-lg">
                <div className="relative mb-3">
                  <img
                    src="/professional-headshot-male-actor-friendly.jpg"
                    alt="Actor"
                    className="h-[200px] w-full rounded-2xl object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-[#ff7f19] px-3 py-1 text-xs text-[#ffffff]">
                    برگزیده
                  </span>
                </div>
                <h3 className="text-center text-sm font-semibold text-[#000000]">نام و نام خانوادگی</h3>
                <p className="text-center text-xs text-[#979797]">سن ۳۲ سال</p>
              </Card>

              {/* Card 6 */}
              <Card className="min-w-[200px] flex-shrink-0 rounded-3xl bg-[#ffffff] p-4 shadow-lg">
                <div className="relative mb-3">
                  <img
                    src="/professional-headshot-male-actor-casual.jpg"
                    alt="Actor"
                    className="h-[200px] w-full rounded-2xl object-cover"
                  />
                </div>
                <h3 className="text-center text-sm font-semibold text-[#000000]">دکی</h3>
                <p className="text-center text-xs text-[#979797]">سن ۳۲ سال</p>
              </Card>
            </div>

            {/* Right Arrow */}
            <button className="absolute -right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#000000] text-[#ffffff] shadow-lg hover:bg-[#1e3016] transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="bg-[#e5e5e5] px-6 py-16 md:px-12 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-12">
            {/* 3D Illustration */}
            <div className="flex-1">
              <img
                src="/3d-illustration-film-equipment-laptop-camera-reels.jpg"
                alt="Film equipment illustration"
                className="h-auto w-full max-w-md mx-auto"
              />
            </div>

            {/* Content */}
            <div className="flex-1 text-right">
              <h2 className="mb-6 text-3xl font-bold text-[#ff7f19] md:text-4xl">همه ما یک جامعه هستیم!</h2>
              <p className="mb-8 text-base leading-relaxed text-[#000000] md:text-lg">
                به انجمن متخصصان بازیگری بپیوندید. کار پیدا کنید، همکاری کنید و از یکدیگر حمایت کنید. همه در یک مکان.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  className="rounded-full border-2 border-[#ff7f19] bg-transparent px-8 py-3 text-[#ff7f19] hover:bg-[#ff7f19] hover:text-[#ffffff]"
                >
                  سوال دارید؟
                </Button>
                <Button className="rounded-full bg-[#ffffff] px-8 py-3 text-[#000000] hover:bg-[#dfdfdf]">
                  به سی‌نفلش بپیوندید
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e3016] px-6 py-12 text-[#ffffff] md:px-12 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
            {/* Logo */}
            <div className="flex flex-col items-start">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff]">
                  <span className="text-lg font-bold text-[#1e3016]">CN</span>
                </div>
                <div>
                  <p className="text-sm font-bold">CNAGHSH</p>
                  <p className="text-xs text-[#979797]">ART GROUP</p>
                </div>
              </div>
            </div>

            {/* Column 1 */}
            <div>
              <h3 className="mb-4 text-sm font-semibold">سی‌نفلش</h3>
              <ul className="space-y-2 text-sm text-[#979797]">
                <li>
                  <a href="#" className="hover:text-[#ffffff] transition-colors">
                    خانه
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#ffffff] transition-colors">
                    درباره سی‌نفلش
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2 */}
            <div>
              <h3 className="mb-4 text-sm font-semibold">پروفایل</h3>
              <ul className="space-y-2 text-sm text-[#979797]">
                <li>
                  <a href="#" className="hover:text-[#ffffff] transition-colors">
                    ثبت نام
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#ffffff] transition-colors">
                    ورود اعضاء
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#ffffff] transition-colors">
                    تکمیل پروفایل
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <h3 className="mb-4 text-sm font-semibold">ارتباط با ما</h3>
              <div className="flex gap-4">
                <a href="#" className="text-[#979797] hover:text-[#ffffff] transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="text-[#979797] hover:text-[#ffffff] transition-colors">
                  <Send className="h-5 w-5" />
                </a>
                <a href="#" className="text-[#979797] hover:text-[#ffffff] transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 4 */}
            <div>
              <h3 className="mb-4 text-sm font-semibold">به خبرنامه سی‌نفلش بپیوندید</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full bg-[#979797] px-4 py-2 text-xs text-[#ffffff] hover:bg-[#969696]"
                >
                  ارسال
                </Button>
                <input
                  type="email"
                  placeholder="ایمیل شما"
                  className="flex-1 rounded-full bg-[#ffffff]/10 px-4 py-2 text-xs text-[#ffffff] placeholder:text-[#979797] focus:outline-none focus:ring-2 focus:ring-[#ff7f19]"
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

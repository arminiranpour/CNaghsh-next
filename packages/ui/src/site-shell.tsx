import type { ReactNode } from "react";

type NavigationItem = {
  href: string;
  label: string;
};

type SiteShellProps = {
  navigation: NavigationItem[];
  children: ReactNode;
};

export function SiteShell({ navigation, children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="text-lg font-semibold text-foreground">
            صحنه
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card/50">
        <div className="container flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} بازارگاه فراخوان‌ها</span>
          <span>ساخته شده برای اسپرینت صفر</span>
        </div>
      </footer>
    </div>
  );
}
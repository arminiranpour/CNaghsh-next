export type AuthTab = "signin" | "signup";

export function parseAuthTabParam(value?: string | null): AuthTab {
  if (value === "signup") {
    return "signup";
  }

  return "signin";
}

export function isAuthTab(value: unknown): value is AuthTab {
  return value === "signin" || value === "signup";
}

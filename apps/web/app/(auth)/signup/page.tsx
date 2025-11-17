import { permanentRedirect } from "next/navigation";

export default function LegacySignUpRedirect() {
  permanentRedirect("/auth?tab=signup");
}

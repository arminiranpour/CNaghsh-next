import { permanentRedirect } from "next/navigation";

export default function LegacySignInRedirect() {
  permanentRedirect("/auth?tab=signin");
}

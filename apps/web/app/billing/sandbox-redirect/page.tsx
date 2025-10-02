import type { ProviderName } from "@/lib/billing/providers/types";

import { SandboxRedirectContent } from "./sandbox-redirect-content";

type SearchParams = Record<string, string | string[] | undefined>;

const parseParam = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
};

const isProviderName = (value: string | null): value is ProviderName => {
  return value === "zarinpal" || value === "idpay" || value === "nextpay";
};

export default function SandboxRedirectPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = parseParam(searchParams?.session);
  const providerParam = parseParam(searchParams?.provider);
  const provider = isProviderName(providerParam) ? providerParam : null;
  const amount = parseParam(searchParams?.amount);
  const currency = parseParam(searchParams?.currency);
  const returnUrl = parseParam(searchParams?.returnUrl);

  const secretConfigured = Boolean(process.env.WEBHOOK_SHARED_SECRET);

  return (
    <div className="container py-12">
      <SandboxRedirectContent
        sessionId={session}
        provider={provider}
        amount={amount}
        currency={currency}
        returnUrl={returnUrl}
        secretConfigured={secretConfigured}
      />
    </div>
  );
}
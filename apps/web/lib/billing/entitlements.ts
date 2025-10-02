export const applyEntitlements = async ({
  userId,
  priceId,
  paymentId,
}: {
  userId: string;
  priceId: string;
  paymentId: string;
}) => {
  void userId;
  void priceId;
  void paymentId;
  return { ok: true } as const;
};
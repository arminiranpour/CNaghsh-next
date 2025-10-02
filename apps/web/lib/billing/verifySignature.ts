export const verifySignature = (header: string | null) => {
  const secret = process.env.WEBHOOK_SHARED_SECRET;
  if (!secret) {
    return true;
  }
  return header === secret;
};
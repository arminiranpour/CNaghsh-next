import { NextRequest } from "next/server";

import { handleWebhook } from "../shared";

export async function POST(request: NextRequest) {
  return handleWebhook(request, "idpay");
}
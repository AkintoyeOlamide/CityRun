const PAYSTACK_BASE = "https://api.paystack.co";

function readPaystackSecret() {
  return process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
}

export function isPaystackConfigured() {
  return readPaystackSecret().length > 0;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
}) {
  const secret = readPaystackSecret();
  if (!secret) {
    throw new Error("Paystack is not configured.");
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "NGN",
      channels: ["card", "bank", "bank_transfer", "ussd"],
    }),
    cache: "no-store",
  });

  const body = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string };
  };

  if (!res.ok || !body.status || !body.data?.authorization_url) {
    throw new Error(body.message ?? "Could not start Paystack payment.");
  }

  return body.data.authorization_url;
}

export async function verifyPaystackTransaction(reference: string) {
  const secret = readPaystackSecret();
  if (!secret) {
    throw new Error("Paystack is not configured.");
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
    cache: "no-store",
  });

  const body = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      status?: string;
      amount?: number;
      reference?: string;
    };
  };

  if (!res.ok || !body.status || !body.data) {
    throw new Error(body.message ?? "Could not verify Paystack payment.");
  }

  return body.data;
}

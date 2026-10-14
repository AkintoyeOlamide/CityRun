import { upsertProfile } from "@/lib/auth/profile-store";
import { ensureWallet } from "@/lib/city-run/wallets-store";
import {
  createAdminClient,
  createPublicAuthClient,
  hasServiceRoleKey,
} from "@/lib/supabase/server";
import type { AccountType, AddressValue } from "@/lib/city-run/types";

function isBusinessLikeType(accountType: AccountType) {
  return accountType === "business" || accountType === "vendor";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isAlreadyRegisteredError(message: string) {
  const msg = message.toLowerCase();
  return msg.includes("already") || msg.includes("registered");
}

/** Mark a Supabase Auth user as email-confirmed (no inbox required). */
export async function confirmUserEmail(email: string): Promise<boolean> {
  if (!hasServiceRoleKey()) {
    return false;
  }

  const admin = createAdminClient();
  const target = normalizeEmail(email);
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);

    const user = data.users.find((u) => u.email?.toLowerCase() === target);
    if (user) {
      if (user.email_confirmed_at) return true;
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      if (updateError) throw new Error(updateError.message);
      return true;
    }

    if (data.users.length < 1000) break;
    page += 1;
  }

  return false;
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  accountType: AccountType;
  businessName?: string;
  natureOfGoods?: string;
  businessAddress?: AddressValue;
}) {
  const email = input.email.trim();
  const accountType = input.accountType;
  const businessName = input.businessName?.trim() ?? "";
  const natureOfGoods = input.natureOfGoods?.trim() ?? "";
  const businessAddress = input.businessAddress;
  const auth = createPublicAuthClient();

  const { data, error } = await auth.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
        phone: input.phone.trim(),
        account_type: accountType,
        business_name: isBusinessLikeType(accountType) ? businessName : "",
        nature_of_goods: isBusinessLikeType(accountType) ? natureOfGoods : "",
        ...(isBusinessLikeType(accountType) && businessAddress?.formatted
          ? { business_address: businessAddress }
          : {}),
      },
    },
  });

  if (error) {
    if (isAlreadyRegisteredError(error.message)) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Could not create account.");
  }

  if (!data.user.email_confirmed_at && !data.session) {
    try {
      await confirmUserEmail(email);
    } catch {
      /* sign-in route will retry confirmation when possible */
    }
  }

  return { user: data.user, session: data.session ?? null };
}

export async function registerVendorByAdmin(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  businessName: string;
  businessAddress: AddressValue;
}) {
  const email = input.email.trim();
  const businessName = input.businessName.trim();
  const businessAddress = input.businessAddress;

  if (!businessName) {
    throw new Error("Vendor name is required.");
  }
  if (!businessAddress?.formatted || businessAddress.formatted.trim().length <= 5) {
    throw new Error("Pickup address is required.");
  }
  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  if (!hasServiceRoleKey()) {
    throw new Error(
      "Server is missing SUPABASE_SERVICE_ROLE_KEY. Vendor accounts must be created from admin with the secret key configured.",
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      account_type: "vendor",
      business_name: businessName,
      business_address: businessAddress,
    },
  });

  if (error) {
    if (isAlreadyRegisteredError(error.message)) {
      throw new Error("An account with this email already exists.");
    }
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Could not create vendor account.");
  }

  await upsertProfile(data.user.id, email, {
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    accountType: "vendor",
    businessName,
    businessAddress,
    loginPassword: input.password,
  });

  await ensureWallet(data.user.id);

  return data.user;
}

export function isEmailNotConfirmedError(
  error: string | { message?: string; code?: string },
) {
  const msg = (typeof error === "string" ? error : (error.message ?? "")).toLowerCase();
  const code = (typeof error === "string" ? "" : (error.code ?? "")).toLowerCase();
  return (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("email address not confirmed") ||
    msg.includes("not confirmed")
  );
}

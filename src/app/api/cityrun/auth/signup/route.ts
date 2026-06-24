import { NextResponse } from "next/server";
import {
  confirmUserEmail,
  isEmailNotConfirmedError,
  registerCustomer,
} from "@/lib/auth/customer-auth";
import { upsertProfile, upsertProfileForSession } from "@/lib/auth/profile-store";
import { hasServiceRoleKey } from "@/lib/supabase/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";
import type { AccountType, AddressValue } from "@/lib/city-run/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      phone?: string;
      accountType?: AccountType;
      businessName?: string;
      natureOfGoods?: string;
      businessAddress?: AddressValue;
    };

    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const accountType: AccountType =
      body.accountType === "business" ? "business" : "individual";
    const businessName = body.businessName?.trim() ?? "";
    const natureOfGoods = body.natureOfGoods?.trim() ?? "";
    const businessAddress = body.businessAddress;

    if (!email || !password || !fullName || !phone) {
      return NextResponse.json(
        { error: "Email, password, name, and phone are required." },
        { status: 400 },
      );
    }

    if (accountType === "business" && !businessName) {
      return NextResponse.json(
        { error: "Business name is required for business accounts." },
        { status: 400 },
      );
    }

    if (accountType === "business" && !natureOfGoods) {
      return NextResponse.json(
        { error: "Nature of goods is required for business accounts." },
        { status: 400 },
      );
    }

    if (
      accountType === "business" &&
      (!businessAddress?.formatted || businessAddress.formatted.trim().length <= 5)
    ) {
      return NextResponse.json(
        { error: "Business address is required for business accounts." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const { user, session } = await registerCustomer({
      email,
      password,
      fullName,
      phone,
      accountType,
      ...(accountType === "business"
        ? { businessName, natureOfGoods, businessAddress }
        : {}),
    });

    const response = NextResponse.json({ ok: true, accountType });
    const supabase = await createRouteHandlerClient(response);

    if (session) {
      await supabase.auth.setSession(session);
    } else {
      let { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError && isEmailNotConfirmedError(signInError)) {
        await confirmUserEmail(email);
        ({ error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        }));
      }

      if (signInError) {
        return NextResponse.json({ error: signInError.message }, { status: 400 });
      }
    }

    if (user) {
      const profilePatch = {
        fullName,
        phone,
        accountType,
        ...(accountType === "business"
          ? { businessName, natureOfGoods, businessAddress }
          : {}),
      };

      if (hasServiceRoleKey()) {
        await upsertProfile(user.id, user.email ?? email, profilePatch);
      } else {
        await upsertProfileForSession(
          supabase,
          user.id,
          user.email ?? email,
          profilePatch,
        );
      }
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create account" },
      { status: 400 },
    );
  }
}

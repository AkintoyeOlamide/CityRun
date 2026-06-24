"use client";

import { BusinessDeliveryFlow } from "@/components/city-run/BusinessDeliveryFlow";
import { CityRunPageLoader } from "@/components/city-run/CityRunPageLoader";
import { DeliveryRequestFlow } from "@/components/city-run/DeliveryRequestFlow";
import { VendorDeliveryFlow } from "@/components/city-run/VendorDeliveryFlow";
import { useAuth } from "@/lib/auth/use-auth";
import {
  isVendorProfile,
  shouldUseBusinessSendFlow,
} from "@/lib/city-run/account-utils";

export default function SendItemsPage() {
  const { user, profile, loading, profileLoading } = useAuth();
  const canRenderFromMetadata = user && shouldUseBusinessSendFlow(profile, user);

  if (loading) {
    return <CityRunPageLoader />;
  }

  if (user && profileLoading && !profile && !canRenderFromMetadata) {
    return <CityRunPageLoader />;
  }

  if (user && isVendorProfile(profile)) {
    return <VendorDeliveryFlow />;
  }

  if (user && shouldUseBusinessSendFlow(profile, user)) {
    return <BusinessDeliveryFlow />;
  }

  return <DeliveryRequestFlow kind="send" />;
}

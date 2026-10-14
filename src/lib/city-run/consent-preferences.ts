const CUSTOMER_NOTIFICATIONS_KEY = "cityrun:customer-notifications-enabled";
const CUSTOMER_NOTIFICATIONS_DECLINED_KEY = "cityrun:customer-notifications-declined";
const RIDER_NOTIFICATIONS_DECLINED_KEY = "cityrun:rider-notifications-declined";
const RIDER_LOCATION_DECLINED_KEY = "cityrun:rider-location-declined";

export function isCustomerNotificationsEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CUSTOMER_NOTIFICATIONS_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCustomerNotificationsEnabled() {
  try {
    localStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, "1");
    localStorage.removeItem(CUSTOMER_NOTIFICATIONS_DECLINED_KEY);
  } catch {
    /* ignore */
  }
}

export function isCustomerNotificationsDeclined() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CUSTOMER_NOTIFICATIONS_DECLINED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCustomerNotificationsDeclined() {
  try {
    localStorage.setItem(CUSTOMER_NOTIFICATIONS_DECLINED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isRiderNotificationsDeclined() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(RIDER_NOTIFICATIONS_DECLINED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markRiderNotificationsDeclined() {
  try {
    localStorage.setItem(RIDER_NOTIFICATIONS_DECLINED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearRiderNotificationsDeclined() {
  try {
    localStorage.removeItem(RIDER_NOTIFICATIONS_DECLINED_KEY);
  } catch {
    /* ignore */
  }
}

export function isRiderLocationDeclined() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(RIDER_LOCATION_DECLINED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markRiderLocationDeclined() {
  try {
    localStorage.setItem(RIDER_LOCATION_DECLINED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearRiderLocationDeclined() {
  try {
    localStorage.removeItem(RIDER_LOCATION_DECLINED_KEY);
  } catch {
    /* ignore */
  }
}

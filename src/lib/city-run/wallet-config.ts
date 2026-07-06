/** ₦1,000 per delivery trip — wallet balance is stored in kobo. */
export const WALLET_TRIP_PRICE_NAIRA = 1000;
export const WALLET_TRIP_PRICE_KOBO = WALLET_TRIP_PRICE_NAIRA * 100;

export const WALLET_BANK_DETAILS = {
  accountName: "CITYGATES HAULAGE AND LOGISTICS LIMITED",
  accountNumber: "0065356567",
  bankName: "Stanbic IBTC Bank Plc",
} as const;

export const WALLET_TRANSFER_COUNTDOWN_SEC = 20 * 60;
export const WALLET_CONFIRM_LOADING_MS = 2000;

export function walletTripsFromNaira(amountNaira: number) {
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) return 0;
  return Math.floor(amountNaira / WALLET_TRIP_PRICE_NAIRA);
}

export function walletTripsFromKobo(balanceKobo: number) {
  return walletTripsFromNaira(balanceKobo / 100);
}

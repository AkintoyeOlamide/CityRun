/** After server-side sign-in/sign-up, hard-navigate — cookies are already set by the API response. */
export function completeAuthRedirect(
  role: "customer" | "rider",
  target?: string,
) {
  const path =
    target ??
    (role === "rider" ? "/cityrun/rider" : "/cityrun/home");
  window.location.assign(path);
}

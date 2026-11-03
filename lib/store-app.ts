// Server-side check for requests coming from either store app. The client-side half
// (rememberStoreApp / isStoreApp) is in lib/native.ts and sets the cookie read here.

export const STORE_APP_COOKIE = "constra_app";
export const ANDROID_APP_REFERRER = "android-app://com.getconstra.app";

/** True for the iOS shell (its user agent) or the Android TWA (its launch referrer or cookie). */
export function fromStoreApp(request: Request): boolean {
  if (/ConstraApp-iOS/.test(request.headers.get("user-agent") ?? "")) return true;
  if ((request.headers.get("referer") ?? "").startsWith(ANDROID_APP_REFERRER)) return true;
  return (request.headers.get("cookie") ?? "").split(/;\s*/).includes(`${STORE_APP_COOKIE}=android`);
}

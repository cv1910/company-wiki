export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Simple login URL - points to our own login page
export const getLoginUrl = (type: "signIn" | "signUp" = "signIn") => {
  return "/login";
};

// Generate signup URL for new users (invitation flow)
export const getSignUpUrl = () => getLoginUrl("signUp");

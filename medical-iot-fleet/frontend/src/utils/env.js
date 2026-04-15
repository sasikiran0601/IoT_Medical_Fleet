const rawPublicSignupDisabled = String(import.meta.env.VITE_PUBLIC_SIGNUP_DISABLED ?? "true").toLowerCase();
const rawSupportEmail = String(import.meta.env.VITE_SUPPORT_EMAIL ?? "").trim();

export const IS_PUBLIC_SIGNUP_DISABLED =
    rawPublicSignupDisabled === "true" ||
    rawPublicSignupDisabled === "1" ||
    rawPublicSignupDisabled === "yes";

export const SUPPORT_EMAIL = rawSupportEmail || "it-support@hospital.local";

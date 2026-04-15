import api from "./axiosInstance";

export const loginLocal = (email, password) =>
    api.post("/api/auth/login", new URLSearchParams({ username: email, password }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

export const registerUser = (data) => api.post("/api/auth/register", data);
export const registerWithInvite = (data, inviteToken) =>
    api.post("/api/auth/register", { ...data, invite_token: inviteToken });

export const getMe = () => api.get("/api/auth/me");
export const validateInvite = (token) => api.get(`/api/invites/validate?token=${encodeURIComponent(token)}`);

export const googleLoginUrl = (role) => `${import.meta.env.VITE_API_URL}/api/auth/google${role ? `?role=${role}` : ""}`;
export const githubLoginUrl = (role) => `${import.meta.env.VITE_API_URL}/api/auth/github${role ? `?role=${role}` : ""}`;

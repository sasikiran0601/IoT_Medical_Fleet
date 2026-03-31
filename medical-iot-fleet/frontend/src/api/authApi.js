import api from "./axiosInstance";

export const loginLocal = (email, password) =>
    api.post("/api/auth/login", new URLSearchParams({ username: email, password }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

export const registerUser = (data) => api.post("/api/auth/register", data);

export const getMe = () => api.get("/api/auth/me");

export const googleLoginUrl = () => `${import.meta.env.VITE_API_URL}/api/auth/google`;
export const githubLoginUrl = () => `${import.meta.env.VITE_API_URL}/api/auth/github`;
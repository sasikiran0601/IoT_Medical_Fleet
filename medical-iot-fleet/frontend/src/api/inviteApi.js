import api from "./axiosInstance";

export const getInvites = () => api.get("/api/invites/");
export const createInvite = (data) => api.post("/api/invites/", data);
export const revokeInvite = (inviteId) => api.delete(`/api/invites/${inviteId}`);

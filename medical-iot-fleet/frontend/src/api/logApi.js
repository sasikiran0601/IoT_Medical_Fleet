import api from "./axiosInstance";

export const getAuditLogs = (params = {}) => api.get("/api/logs/audit", { params });
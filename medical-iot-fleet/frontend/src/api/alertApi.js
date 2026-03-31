import api from "./axiosInstance";

export const getAlerts = (params = {}) => api.get("/api/alerts/", { params });
export const getAlertCount = () => api.get("/api/alerts/count");
export const resolveAlert = (id) => api.put(`/api/alerts/${id}/resolve`);
export const deleteAlert = (id) => api.delete(`/api/alerts/${id}`);
import api from "./axiosInstance";

export const getApiKeys = () => api.get("/api/keys");
export const regenerateKey = (deviceId) => api.post(`/api/keys/${deviceId}/regenerate`);
export const getExampleCode = (deviceId) => api.get(`/api/keys/example/${deviceId}`);
export const testWebhook = (deviceId) => api.post(`/api/webhooks/${deviceId}/test`);
export const removeWebhook = (deviceId) => api.delete(`/api/webhooks/${deviceId}`);
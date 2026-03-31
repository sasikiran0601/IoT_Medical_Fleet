import api from "./axiosInstance";

export const getDevices = (params = {}) => api.get("/api/devices", { params });
export const getDeviceStats = () => api.get("/api/devices/stats");
export const getDevice = (deviceId) => api.get(`/api/devices/${deviceId}`);
export const createDevice = (data) => api.post("/api/devices", data);
export const updateDevice = (deviceId, data) => api.put(`/api/devices/${deviceId}`, data);
export const deleteDevice = (deviceId) => api.delete(`/api/devices/${deviceId}`);

export const controlDevice = (deviceId, action, purpose) =>
    api.post(`/api/devices/${deviceId}/control`, { action, purpose });

export const setWebhook = (deviceId, webhook_url) =>
    api.put(`/api/devices/${deviceId}/webhook`, { webhook_url });

export const regenerateKey = (deviceId) =>
    api.post(`/api/devices/${deviceId}/regenerate-key`);

export const triggerOta = (deviceId, firmware_version) =>
    api.post(`/api/devices/${deviceId}/ota`, null, { params: { firmware_version } });
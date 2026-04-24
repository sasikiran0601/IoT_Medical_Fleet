import api from "./axiosInstance";

export const getSensorData = (deviceId, limit = 50) =>
    api.get(`/api/v1/data/${deviceId}`, { params: { limit } });

export const exportSensorData = (deviceId, params = {}) =>
    api.get(`/api/v1/data/${deviceId}/export`, {
        params,
        responseType: params.format === "json" ? "json" : "blob",
    });

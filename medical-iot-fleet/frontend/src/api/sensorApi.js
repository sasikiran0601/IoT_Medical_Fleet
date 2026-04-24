import api from "./axiosInstance";

export const getSensorData = (deviceId, limit = 50) =>
    api.get(`/api/v1/data/${deviceId}`, { params: { limit } });

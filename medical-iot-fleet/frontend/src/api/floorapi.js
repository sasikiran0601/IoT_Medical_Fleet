import api from "./axiosInstance";

// Use canonical trailing-slash routes to avoid 307 redirects on protected POST calls.
export const getFloors = () => api.get("/api/floors/");
export const getFloor = (id) => api.get(`/api/floors/${id}`);
export const createFloor = (data) => api.post("/api/floors/", data);
export const deleteFloor = (id) => api.delete(`/api/floors/${id}`);

export const getRooms = (floor_id) => api.get("/api/rooms/", { params: { floor_id } });
export const createRoom = (data) => api.post("/api/rooms/", data);
export const deleteRoom = (id) => api.delete(`/api/rooms/${id}`);

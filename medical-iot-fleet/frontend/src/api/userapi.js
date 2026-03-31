import api from "./axiosInstance";

export const getUsers = () => api.get("/api/users");
export const updateUser = (id, data) => api.put(`/api/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/api/users/${id}`);
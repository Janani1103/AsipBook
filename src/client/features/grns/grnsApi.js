import api from "../../api/axios.js";

export const grnsApi = {
  list: async (params = {}) => (await api.get("/grns", { params })).data,
  getById: async (id) => (await api.get(`/grns/${id}`)).data,
  create: async (data) => (await api.post("/grns", data)).data,
  update: async (id, data) => (await api.put(`/grns/${id}`, data)).data,
  cancel: async (id) => (await api.delete(`/grns/${id}`)).data,
};

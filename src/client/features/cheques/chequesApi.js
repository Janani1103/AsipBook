import api from "../../api/axios.js";

export const chequesApi = {
  create: async (data) => (await api.post("/cheques", data)).data,
  list: async (params = {}) => (await api.get("/cheques", { params })).data,
  getById: async (id) => (await api.get(`/cheques/${id}`)).data,
  update: async ({ id, data }) =>
    (await api.put(`/cheques/${id}`, data)).data,
  updateStatus: async ({ id, data }) =>
    (await api.put(`/cheques/${id}/status`, data)).data,
  remove: async (id) => (await api.delete(`/cheques/${id}`)).data,
};

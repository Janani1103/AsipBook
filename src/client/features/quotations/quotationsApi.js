import api from "../../api/axios.js";
export const quotationsApi = {
  list: async (params = {}) => (await api.get("/quotations", { params })).data,
  getById: async (id) => (await api.get(`/quotations/${id}`)).data,
  create: async (data) => (await api.post("/quotations", data)).data,
  update: async (id, data) => (await api.put(`/quotations/${id}`, data)).data,
  changeStatus: async (id, status, reason) => (await api.patch(`/quotations/${id}/status`, { status, reason })).data,
  convertToSalesOrder: async (id) => (await api.post(`/quotations/${id}/convert`)).data,
  convertToInvoice: async (id) => (await api.post(`/quotations/${id}/convert-invoice`)).data,
  getPrintJson: async (id) => (await api.get(`/quotations/${id}/print-json`)).data,
  delete: async (id) => (await api.delete(`/quotations/${id}`)).data,
};

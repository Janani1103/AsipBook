import api from "../../api/axios.js";

export const posReturnsApi = {
  /**
   * Process an instant return directly from POS terminal
   */
  processDirectReturn: async (payload) => {
    const response = await api.post("/pos/returns", payload);
    return response.data;
  },

  /**
   * Search invoices specifically for POS returns
   */
  searchInvoicesForReturn: async (query) => {
    const response = await api.get("/invoices", {
      params: {
        search: query,
        limit: 10,
        status: "approved",
      },
    });
    return response.data;
  },
};

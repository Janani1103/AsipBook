import api from '../../api/axios';

export const expensesApi = {
    create: async (data) => {
        const res = await api.post('/expenses', data);
        return res.data;
    },
    list: async (params) => {
        const res = await api.get('/expenses', { params });
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/expenses/${id}`);
        return res.data;
    },
    getCategories: async () => {
        const res = await api.get('/expenses/categories');
        return res.data;
    },
    updateStatus: async (id, data) => {
        const res = await api.put(`/expenses/${id}/status`, data);
        return res.data;
    },
};

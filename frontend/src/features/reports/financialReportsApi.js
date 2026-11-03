import api from '../../api/axios';

export const financialReportsApi = {
    getProfitAndLoss: async (params) => {
        const res = await api.get('/reports/financial/snapshot', { params });
        return res.data;
    },
};


import api from '../../api/axios';

export const posSessionsApi = {
    getActive: async () => {
        const res = await api.get('/pos-sessions/active');
        return res.data;
    },
    open: async (data) => {
        const res = await api.post('/pos-sessions/open', data);
        return res.data;
    },
    close: async (data) => {
        const res = await api.post('/pos-sessions/close', data);
        return res.data;
    },
    list: async (params) => {
        const res = await api.get('/pos-sessions', { params });
        return res.data;
    }
};

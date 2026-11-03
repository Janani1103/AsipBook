import api from '../../api/axios';

export const couponsApi = {
    validate: (payload) => api.post('/coupons/validate', payload).then((res) => res.data),
    list: (params) => api.get('/coupons', { params }).then((res) => res.data),
    create: (data) => api.post('/coupons', data).then((res) => res.data),
    update: (id, data) => api.put(`/coupons/${id}`, data).then((res) => res.data),
    delete: (id) => api.delete(`/coupons/${id}`).then((res) => res.data),
};


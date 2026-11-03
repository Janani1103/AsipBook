import api from '../../api/axios';

export const settingsApi = {
    getCompanySettings: async () => (await api.get('/settings/company')).data,
    updateCompanySettings: async (data) => (await api.put('/settings/company', data)).data,
    downloadBackup: async () => (await api.get('/settings/backup/export', { responseType: 'blob' })).data,
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './settingsApi';

export const useCompanySettings = () => {
    return useQuery({
        queryKey: ['company-settings'],
        queryFn: settingsApi.getCompanySettings,
    });
};

export const useUpdateCompanySettings = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.updateCompanySettings,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['company-settings'] });
        },
    });
};

import client from './client';

export const statusApi = {
    getModuleUpdates: async () => {
        const response = await client.get('/status/module-updates');
        return response.data;
    }
};

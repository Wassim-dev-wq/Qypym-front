import axios from "axios";
import * as Crypto from "expo-crypto";


const api = axios.create({
    baseURL: 'http://192.168.1.165:9091/api/v1',
    timeout: 10000,
});

api.interceptors.request.use((config) => {
    if (!config.headers['X-Correlation-ID']) {
        config.headers['X-Correlation-ID'] = Crypto.randomUUID();
    }


    const userId =  'f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454';

    if(userId) {
        config.headers['X-User-ID'] = userId;
    }

    return config;
});

export default api;
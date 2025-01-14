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

    return config;
});

export default api;
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'The server took too long to respond' : 'Unable to reach the server');
    const enhanced = new Error(message);
    enhanced.status = error.response?.status || 0;
    enhanced.details = error.response?.data?.details;
    return Promise.reject(enhanced);
  },
);

export const unwrap = (promise) => promise.then((response) => response.data.data);
export const unwrapPage = (promise) => promise.then((response) => ({ data: response.data.data, meta: response.data.meta }));

export default api;

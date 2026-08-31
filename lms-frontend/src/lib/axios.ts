import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000', // your Nest backend
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => { // runs before every request
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`; // attach JWT automatically
  return config;
});
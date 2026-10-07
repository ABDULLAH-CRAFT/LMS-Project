import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = 'http://localhost:3000'; // your Nest backend

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => { // runs before every request
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`; // attach JWT automatically
  return config;
});

// ───────── silent token refresh ─────────
// On a 401 we exchange the refresh token for a new pair ONCE, then replay the failed request.
// Several requests failing at the same moment share a single refresh call.

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  try {
    // plain axios (not `api`) so a failing refresh can never trigger this interceptor again
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(`${BASE_URL}/auth/refresh`, { refreshToken });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    window.dispatchEvent(new Event('auth-changed')); // lets the payments socket reconnect with the new token
    return data.accessToken;
  } catch {
    return null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/') ?? false; // a wrong password on /auth/login must stay a plain 401

    if (error.response?.status !== 401 || !original || original._retried || isAuthCall) {
      return Promise.reject(error);
    }

    // Guests have no session to refresh: leave public pages alone.
    const hadSession = !!localStorage.getItem('refreshToken');
    if (!hadSession) return Promise.reject(error);

    original._retried = true;
    if (!refreshing) {
      refreshing = refreshAccessToken().finally(() => {
        refreshing = null;
      });
    }
    const newToken = await refreshing;

    if (!newToken) {
      // Refresh token is expired or invalid: the session is really over.
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new Event('auth-changed'));
      if (window.location.pathname !== '/login') window.location.href = '/login';
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  },
);
import axios from "axios";
import { API_BASE_URL } from "../../constants/config";
import { getAccessToken, clearTokens } from "../storage/tokenStorage";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Attach the access token to every request, if we have one
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// This is set by AuthContext so the client can trigger a logout
// when a request comes back 401 (expired/invalid token).
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearTokens();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);
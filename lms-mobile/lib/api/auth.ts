import { apiClient } from "./client";
import { AuthTokens, User } from "../../types/user";

export async function loginRequest(email: string, password: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>("/auth/login", { email, password });
  return data;
}

export async function registerRequest(
  email: string,
  password: string,
  name: string
): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>("/auth/register", { email, password, name });
  return data;
}

export async function getMeRequest(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}
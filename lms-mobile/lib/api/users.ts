import { apiClient } from "./client";
import { User } from "../../types/user";

export async function updateProfile(name: string): Promise<User> {
  const { data } = await apiClient.patch<User>("/users/me", { name });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const { data } = await apiClient.patch<{ message: string }>("/users/me/password", {
    currentPassword,
    newPassword,
  });
  return data;
}
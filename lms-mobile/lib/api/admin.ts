import { apiClient } from "./client";
import { User } from "../../types/user";

export async function listTeachers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/admin/teachers");
  return data;
}

export interface CreateTeacherInput {
  email: string;
  name: string;
  password: string;
}

export async function createTeacher(input: CreateTeacherInput): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("/admin/create-teacher", input);
  return data;
}
import { apiClient } from "./client";
import { Course, Enrollment, CourseModuleWithLessons } from "../../types/course";

export async function getPublishedCourses(): Promise<Course[]> {
  const { data } = await apiClient.get<Course[]>("/courses");
  return data;
}

export async function getCourseById(courseId: string): Promise<Course> {
  const { data } = await apiClient.get<Course>(`/courses/${courseId}`);
  return data;
}

export async function getMyEnrollments(): Promise<Enrollment[]> {
  const { data } = await apiClient.get<Enrollment[]>("/enrollments/mine");
  return data;
}

export async function checkEnrollment(courseId: string): Promise<boolean> {
  const { data } = await apiClient.get<{ enrolled: boolean }>(`/enrollments/check/${courseId}`);
  return data.enrolled;
}

export async function enrollInCourse(courseId: string): Promise<Enrollment> {
  const { data } = await apiClient.post<Enrollment>("/enrollments", { courseId });
  return data;
}

export async function getCurriculum(courseId: string): Promise<CourseModuleWithLessons[]> {
  const { data } = await apiClient.get<CourseModuleWithLessons[]>(`/courses/${courseId}/curriculum`);
  return data;
}

// ---- Teacher-only functions (NEW this phase) ----

export async function getMyTeacherCourses(): Promise<Course[]> {
  const { data } = await apiClient.get<Course[]>("/courses/mine");
  return data;
}

export interface CreateCourseInput {
  title: string;
  description: string;
  price: number;
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const { data } = await apiClient.post<Course>("/courses", input);
  return data;
}

export async function publishCourse(courseId: string): Promise<Course> {
  const { data } = await apiClient.patch<Course>(`/courses/${courseId}/publish`);
  return data;
}

export interface CreateModuleInput {
  title: string;
  order?: number;
}

export async function createModule(courseId: string, input: CreateModuleInput) {
  const { data } = await apiClient.post(`/courses/${courseId}/modules`, input);
  return data;
}

export interface CreateLessonInput {
  title: string;
  contentType: "text" | "video";
  content: string;
  order?: number;
}

export async function createLesson(courseId: string, moduleId: string, input: CreateLessonInput) {
  const { data } = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/lessons`, input);
  return data;
}
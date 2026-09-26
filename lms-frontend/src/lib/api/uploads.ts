import { api } from '../axios';

export interface UploadResult {
  url: string; // absolute URL — save this as lesson.content (video) or course.coverImageUrl (image)
  filename: string;
  size: number;
  mimeType: string;
}

// Turns whatever the backend said into a sentence we can show under the upload box.
export function getUploadErrorMessage(error: unknown): string {
  const err = error as { code?: string; response?: { status?: number; data?: { message?: string | string[] } } };
  if (err?.code === 'ERR_CANCELED') return 'Upload cancelled.';
  const status = err?.response?.status;
  if (status === 413) return 'That file is too large.';
  if (status === 401 || status === 403) return 'Your session has expired or you don\'t have permission. Please log in again.';
  const message = err?.response?.data?.message;
  if (message) return Array.isArray(message) ? message[0] : message;
  return 'Upload failed. Check your connection and try again.';
}

async function upload(
  path: string,
  field: 'video' | 'image', // must match the field name the backend's FileInterceptor expects
  file: File,
  onProgress?: (fraction: number) => void, // 0..1
  signal?: AbortSignal, // lets the UI cancel a long video upload
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append(field, file);
  const response = await api.post<UploadResult>(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(e.loaded / e.total);
    },
  });
  return response.data;
}

export const uploadVideo = (file: File, onProgress?: (f: number) => void, signal?: AbortSignal) =>
  upload('/uploads/video', 'video', file, onProgress, signal);

export const uploadImage = (file: File, onProgress?: (f: number) => void, signal?: AbortSignal) =>
  upload('/uploads/image', 'image', file, onProgress, signal);

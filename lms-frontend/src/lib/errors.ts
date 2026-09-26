// Pulls a readable sentence out of a failed axios request (the backend puts it in response.data.message,
// which is a string, or an array of strings for validation errors).
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (!message) return fallback;
  return Array.isArray(message) ? message[0] : message;
}

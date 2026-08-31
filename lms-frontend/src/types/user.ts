export interface CurrentUser { // shape of the response from GET /users/me
  id: string; // user's unique ID
  email: string; // user's email
  name: string; // user's real name — the whole point of this phase
  role: 'admin' | 'teacher' | 'student'; // matches the backend's UserRole enum
  createdAt: string; // account creation timestamp
}
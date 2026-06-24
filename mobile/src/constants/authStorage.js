export const AUTH_TOKEN_KEY = 'token';
export const AUTH_USER_KEY = 'user';
export const AUTH_REMEMBER_KEY = '@attendance_remember_login';
export const AUTH_LAST_EMAIL_KEY = '@attendance_last_email';

export function parseStoredUser(storedUser) {
  if (!storedUser || storedUser === 'undefined' || storedUser === 'null') {
    return null;
  }
  try {
    const parsed = JSON.parse(storedUser);
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

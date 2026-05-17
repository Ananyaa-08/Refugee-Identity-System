export const ADMIN_USER_ID = 'admin';
export const ADMIN_PASSWORD = '123456789';
export const ADMIN_SESSION_KEY = 'admin_session';

export function isAdminAuthenticated() {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated';
}

export function setAdminAuthenticated() {
    localStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
}

export function clearAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function validateAdminCredentials(userId, password) {
    return userId === ADMIN_USER_ID && password === ADMIN_PASSWORD;
}

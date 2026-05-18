export const ADMIN_USER_ID = 'admin';
export const ADMIN_SESSION_KEY = 'admin_session';
export const ADMIN_LOGIN_METHOD_KEY = 'admin_login_method';
export const ADMIN_WALLET_KEY = 'admin_wallet_address';

/** @typedef {'password' | 'wallet'} AdminLoginMethod */

export function getAdminToken() {
    return localStorage.getItem(ADMIN_SESSION_KEY);
}

export function isAdminAuthenticated() {
    return Boolean(getAdminToken());
}

/** @returns {AdminLoginMethod | null} */
export function getAdminLoginMethod() {
    const method = localStorage.getItem(ADMIN_LOGIN_METHOD_KEY);
    return method === 'password' || method === 'wallet' ? method : null;
}

export function getAdminWalletAddress() {
    return localStorage.getItem(ADMIN_WALLET_KEY);
}

export function setAdminWalletAddress(address) {
    if (address) {
        localStorage.setItem(ADMIN_WALLET_KEY, address);
    } else {
        localStorage.removeItem(ADMIN_WALLET_KEY);
    }
}

/**
 * @param {string} token
 * @param {{ method?: AdminLoginMethod, walletAddress?: string }} [opts]
 */
export function setAdminAuthenticated(token, opts = {}) {
    if (token) {
        localStorage.setItem(ADMIN_SESSION_KEY, token);
    }
    if (opts.method) {
        localStorage.setItem(ADMIN_LOGIN_METHOD_KEY, opts.method);
    }
    if (opts.walletAddress) {
        setAdminWalletAddress(opts.walletAddress);
    } else if (opts.method === 'password') {
        setAdminWalletAddress(null);
    }
}

export function clearAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_LOGIN_METHOD_KEY);
    localStorage.removeItem(ADMIN_WALLET_KEY);
}

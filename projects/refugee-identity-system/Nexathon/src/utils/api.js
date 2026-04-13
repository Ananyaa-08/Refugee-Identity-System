/**
 * API client for RIMS blockchain backend.
 * Uses VITE_API_BASE_URL when set (e.g. ngrok), otherwise relative URLs (proxied to backend).
 */
const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(method, path, body = null) {
    const url = `${BASE}${path}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.message || res.statusText);
    return data;
}

export const api = {
    getAppInfo: () => request('GET', '/api/blockchain/app-info'),
    deploy: () => request('POST', '/api/blockchain/deploy'),
    addRegistrar: (address) => request('POST', '/api/blockchain/add-registrar', { address }),
    getRefugeeByAddress: (address) => request('GET', `/api/blockchain/refugee/${address}`),
    getRefugees: () => request('GET', '/api/blockchain/refugees'),
    getRefugeeState: (address) => request('GET', `/api/blockchain/refugee-state/${address}`),
    claimAid: (address) => request('POST', '/api/blockchain/claim-aid', { address }),
    generateCustodialWallet: () => request('POST', '/api/blockchain/generate-custodial-wallet'),
};

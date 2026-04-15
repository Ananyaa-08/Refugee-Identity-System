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
    migrationMessage: ({ identity_id, old_wallet, new_wallet }) =>
        request(
            'GET',
            `/api/blockchain/migration-message?identity_id=${encodeURIComponent(identity_id)}&old_wallet=${encodeURIComponent(old_wallet)}&new_wallet=${encodeURIComponent(new_wallet)}`
        ),
    migrationSubmit: (body) => request('POST', '/api/blockchain/migration-request', body),
    migrationRequests: () => request('GET', '/api/blockchain/migration-requests'),
    migrationApprove: (id) => request('POST', '/api/blockchain/migration-approve', { id }),
    migrationReject: (id) => request('POST', '/api/blockchain/migration-reject', { id }),
    // Access Requests
    getAccessRequests: () => request('GET', '/api/access/requests'),
    approveAccessRequest: (requestId) => request('POST', '/api/access/approve', { requestId }),
    rejectAccessRequest: (requestId) => request('POST', '/api/access/reject', { requestId }),
};

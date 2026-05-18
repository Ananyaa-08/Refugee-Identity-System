/**
 * API client for RIMS blockchain backend.
 * Uses VITE_API_BASE_URL when set (e.g. ngrok), otherwise relative URLs (proxied to backend).
 */
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(method, path, body = null) {
    const url = `${BASE}${path}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = data.detail;
        const message = Array.isArray(detail)
            ? detail.map((d) => d.msg || d.message || JSON.stringify(d)).join('; ')
            : detail || data.message || res.statusText;
        throw new Error(message);
    }
    return data;
}

export const api = {
    getAppInfo: () => request('GET', '/api/blockchain/app-info'),
    deploy: (body = {}) => request('POST', '/api/blockchain/deploy', body),
    addRegistrar: (address) => request('POST', '/api/blockchain/add-registrar', { address }),
    registerRefugee: (body) => request('POST', '/api/blockchain/register', body),
    custodialIdentities: () => request('GET', '/api/blockchain/custodial-identities'),
    getRefugeeByAddress: (address) => request('GET', `/api/blockchain/refugee/${address}`),
    getRefugees: () => request('GET', '/api/blockchain/refugees'),
    saveRefugeeRecord: (body) => request('POST', '/api/refugees/register-record', body),
    lookupRefugee: (body) => request('POST', '/api/refugees/lookup', body),
    getAuditLogs: () => request('GET', '/api/audit/logs'),
    getAdminStats: () => request('GET', '/api/admin/stats'),
    getRefugeeState: (address) => request('GET', `/api/blockchain/refugee-state/${address}`),
    verifyOnchainStatus: (address, options = {}) => {
        const url = `${BASE}/api/blockchain/verify-onchain-status/${encodeURIComponent(address)}`;
        return fetch(url, { signal: options.signal })
            .then((res) => res.json().catch(() => ({})))
            .then((data) => ({
                address: data.address ?? address,
                onchain_status: data.onchain_status ?? 'unknown',
                identity_hash_present: Boolean(data.identity_hash_present),
                aid_claimed: Number(data.aid_claimed) || 0,
            }))
            .catch(() => ({
                address,
                onchain_status: 'unknown',
                identity_hash_present: false,
                aid_claimed: 0,
            }));
    },
    claimAid: (address) => request('POST', '/api/blockchain/claim-aid', { address }),
    generateCustodialWallet: (body = null) => request('POST', '/api/blockchain/generate-custodial-wallet', body),
    verifyIdentity: (identity_id) => request('POST', '/api/blockchain/verify-identity', { identity_id }),
    getIdentity: (identity_id) => request('POST', '/api/blockchain/get-identity', { identity_id }),
    migrationMessage: ({ identity_id, old_wallet, new_wallet }) =>
        request(
            'GET',
            `/api/blockchain/migration-message?identity_id=${encodeURIComponent(identity_id)}&old_wallet=${encodeURIComponent(old_wallet)}&new_wallet=${encodeURIComponent(new_wallet)}`
        ),
    migrationSubmit: (body) => request('POST', '/api/blockchain/migration-request', body),
    migrationSubmitLite: (identity_id) => request('POST', '/api/blockchain/migration-request-lite', { identity_id }),
    migrationRequests: (status = null) =>
        request('GET', status ? `/api/blockchain/migration-requests?status=${encodeURIComponent(status)}` : '/api/blockchain/migration-requests'),
    migrationApprove: (id) => request('POST', '/api/blockchain/migration-approve', { id }),
    migrationReject: (id) => request('POST', '/api/blockchain/migration-reject', { id }),
    // Access Requests
    getAccessRequests: () => request('GET', '/api/access/requests'),
    approveAccessRequest: (requestId) => request('POST', '/api/access/approve', { requestId }),
    rejectAccessRequest: (requestId) => request('POST', '/api/access/reject', { requestId }),

    /** Liveness hash sync (aid worker registration flow) */
    postLivenessHash: (body) => request('POST', '/api/refugee/liveness-hash', body),
};

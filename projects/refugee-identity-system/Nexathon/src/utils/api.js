/**
 * API client for RIMS blockchain backend.
 * Uses VITE_API_BASE_URL when set (e.g. ngrok), otherwise relative URLs (proxied to backend).
 */
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function adminAuthHeaders() {
    const token = localStorage.getItem('admin_session');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body = null, options = {}) {
    const url = `${BASE}${path}`;
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(options.auth ? adminAuthHeaders() : {}),
        },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = data.detail;
        const message = Array.isArray(detail)
            ? detail
                  .map((d) => {
                      const field = Array.isArray(d.loc) ? d.loc.filter((x) => x !== 'body').join('.') : '';
                      const msg = d.msg || d.message || JSON.stringify(d);
                      return field ? `${field}: ${msg}` : msg;
                  })
                  .join('; ')
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
    getAdminStats: () => request('GET', '/api/admin/stats', null, { auth: true }),
    adminAuthChallenge: () => request('GET', '/api/admin/auth-challenge'),
    adminVerifySignature: (body) => request('POST', '/api/admin/verify-signature', body),
    adminLogin: (body) => request('POST', '/api/admin/login', body),
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
    getAidStatus: async (refugeeAddress) => {
        const wallet = (refugeeAddress || '').trim();
        if (!wallet) {
            return { refugee_address: '', claimed_types: [], unclaimed_types: [] };
        }
        const path = `/api/blockchain/aid-status/${encodeURIComponent(wallet)}`;
        const url = `${BASE}${path}`;
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            return data;
        }
        // Older API builds lack aid-status; fall back to refugee-state for claimed types.
        if (res.status === 404) {
            const state = await request('GET', `/api/blockchain/refugee-state/${encodeURIComponent(wallet)}`);
            const types = state?.data?.aid_claimed_types || [];
            const all = ['food', 'medicine', 'shelter', 'cash', 'clothing'];
            return {
                refugee_address: wallet,
                claimed_types: types,
                unclaimed_types: all.filter((t) => !types.includes(t)),
            };
        }
        const detail = data.detail;
        const message = Array.isArray(detail)
            ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
            : detail || data.message || res.statusText;
        throw new Error(message);
    },
    claimAid: (refugee_address, aid_type) => {
        const wallet = (refugee_address || '').trim();
        const type = (aid_type || '').trim();
        if (!wallet || !type) {
            return Promise.reject(new Error('Wallet address and aid type are required.'));
        }
        return request('POST', '/api/blockchain/claim-aid', {
            refugee_address: wallet,
            address: wallet,
            aid_type: type,
        });
    },
    generateCustodialWallet: (body = null) => request('POST', '/api/blockchain/generate-custodial-wallet', body),
    completeCustodialOnchain: (identity_id) =>
        request('POST', '/api/blockchain/complete-custodial-onchain', { identity_id }),
    refugeeLoginStatus: (identity_id) =>
        request('GET', `/api/blockchain/refugee-login-status/${encodeURIComponent((identity_id || '').trim())}`),
    verifyIdentity: (identity_id, login_code) =>
        request('POST', '/api/blockchain/verify-identity', {
            identity_id: (identity_id || '').trim(),
            login_code: (login_code || '').trim().toUpperCase(),
        }),
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
    getAccessRequests: (params = {}) => {
        const refugeeId = (params.refugee_id || params.refugeeId || '').trim();
        const q = refugeeId ? `?refugee_id=${encodeURIComponent(refugeeId)}` : '';
        return request('GET', `/api/access/requests${q}`);
    },
    createAccessRequest: (body) => request('POST', '/api/access/request', body),
    approveAccessRequest: (requestId, signer_address) =>
        request('POST', '/api/access/approve', {
            requestId,
            signer_address: (signer_address || '').trim(),
        }),
    rejectAccessRequest: (requestId) => request('POST', '/api/access/reject', { requestId }),

    /** Liveness hash sync (aid worker registration flow) */
    postLivenessHash: (body) => request('POST', '/api/refugee/liveness-hash', body),
};

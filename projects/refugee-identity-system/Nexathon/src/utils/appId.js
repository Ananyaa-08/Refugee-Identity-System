/**
 * Canonical RefugeeContract app id — always from backend / Nexathon/.deployments.json.
 * Do not hardcode app ids in the frontend.
 */
import { api } from './api';

let cachedAppId = null;

export async function getActiveAppId({ forceRefresh = false } = {}) {
    if (cachedAppId != null && !forceRefresh) {
        return cachedAppId;
    }

    const info = await api.getAppInfo();
    let appId = Number(info?.data?.app_id);
    if (!Number.isFinite(appId)) {
        const deployed = await api.deploy();
        appId = Number(deployed?.data?.app_id);
    }
    if (!Number.isFinite(appId)) {
        throw new Error(
            'RIMS contract is not deployed. Deploy from Admin → System Status, then retry registration.',
        );
    }

    cachedAppId = appId;
    return appId;
}

export function clearActiveAppIdCache() {
    cachedAppId = null;
}

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../utils/api';

const IdentityContext = createContext(null);

export const useIdentity = () => {
    const ctx = useContext(IdentityContext);
    if (!ctx) throw new Error('useIdentity must be used within IdentityProvider');
    return ctx;
};

export const IdentityProvider = ({ children }) => {
    const [identity, setIdentity] = useState(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async (identityId) => {
        const id = (identityId || localStorage.getItem('refugee_identity_id') || '').trim();
        if (!id) {
            setIdentity(null);
            return null;
        }
        setLoading(true);
        try {
            const res = await api.getIdentity(id);
            setIdentity(res?.data || null);
            return res?.data || null;
        } finally {
            setLoading(false);
        }
    }, []);

    const value = useMemo(
        () => ({
            identity,
            loading,
            setIdentity,
            refresh,
        }),
        [identity, loading, refresh]
    );

    return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
};


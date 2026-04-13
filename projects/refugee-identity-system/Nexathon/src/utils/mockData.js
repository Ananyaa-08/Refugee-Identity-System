export const MOCK_REFUGEES = [
    {
        id: 'REF-2024-001',
        walletAddress: 'PERA7J3KLMN8QRS2TUVA4WXY5ZAB6CDSPUB',
        name: 'Ahmad Saadi',
        nationality: 'Syrian',
        dob: '1990-05-15',
        gender: 'Male',
        campID: 'CAMP-01',
        registeredAt: '2024-01-14T09:32:00Z',
        identityHash: 'a3f8c2d1e9b407654321...',
        personhoodHash: 'b7e2d5f0c8a134567890...',
        ageProofHash: 'c9f1e4b3d2a056789012...',
        ageVerified: true,
        walletType: 'pera',
        aidClaimed: false,
        isActive: true,
        languages: ['Arabic', 'English'],
        familyMembers: [
            { name: 'Layla Saadi', relationship: 'Spouse' },
            { name: 'Omar Saadi', relationship: 'Son' }
        ]
    },
    {
        id: 'REF-2024-002',
        walletAddress: 'CUST9K4LMNO5PQRT6UVWX7YZA8BCDE1F2GH',
        name: 'Fatima Al-Rashid',
        nationality: 'Afghan',
        dob: '1995-11-28',
        gender: 'Female',
        campID: 'CAMP-02',
        registeredAt: '2024-01-20T14:15:00Z',
        identityHash: 'd2b5e8f1a3c604567890...',
        personhoodHash: 'e4c7f0b2d5a178901234...',
        ageProofHash: 'f6d9b1e3c4a256789012...',
        ageVerified: true,
        walletType: 'custodial',
        aidClaimed: true,
        isActive: true,
        languages: ['Dari', 'Pashto'],
        familyMembers: []
    },
    {
        id: 'REF-2024-003',
        walletAddress: 'PERA2M7NOPQ8RST3UVW4XYZ5ABC6DEFGHIJ',
        name: 'James Okafor',
        nationality: 'South Sudanese',
        dob: '1988-03-07',
        gender: 'Male',
        campID: 'CAMP-01',
        registeredAt: '2024-02-01T10:45:00Z',
        identityHash: 'a1b2c3d4e5f678901234...',
        personhoodHash: 'b2c3d4e5f6a789012345...',
        ageProofHash: 'c3d4e5f6a7b890123456...',
        ageVerified: true,
        walletType: 'pera',
        aidClaimed: false,
        isActive: true,
        languages: ['English', 'Dinka'],
        familyMembers: [{ name: 'Grace Okafor', relationship: 'Spouse' }]
    }
];

export const MOCK_ACCESS_REQUESTS = [
    {
        id: 'REQ-001',
        refugeeID: 'REF-2024-001',
        refugeeName: 'Ahmad Saadi',
        requestedField: 'Age Verification',
        requestedBy: 'Aid Worker Maria Santos',
        requestedAt: '2024-02-10T08:30:00Z',
        status: 'pending'
    },
    {
        id: 'REQ-002',
        refugeeID: 'REF-2024-001',
        refugeeName: 'Ahmad Saadi',
        requestedField: 'Nationality Proof',
        requestedBy: 'Border Official Chen Wei',
        requestedAt: '2024-02-09T14:20:00Z',
        status: 'approved'
    },
    {
        id: 'REQ-003',
        refugeeID: 'REF-2024-002',
        refugeeName: 'Fatima Al-Rashid',
        requestedField: 'Age Verification',
        requestedBy: 'Medical Staff Dr. Patel',
        requestedAt: '2024-02-08T11:00:00Z',
        status: 'rejected'
    }
];

export const MOCK_MIGRATIONS = [
    {
        id: 'MIG-001',
        refugeeID: 'REF-2024-002',
        refugeeName: 'Fatima Al-Rashid',
        camp: 'CAMP-02',
        oldWallet: 'CUST9K4LMNO5PQRT6UVWX7YZA8BCDE1F2GH',
        newWallet: 'PERA3N8OPQR9STU4VWX5YZA6BCD7EFGHIJK',
        requestedAt: '2024-02-11T09:00:00Z',
        status: 'pending'
    },
    {
        id: 'MIG-002',
        refugeeID: 'REF-2024-005',
        refugeeName: 'Khalid Mansour',
        camp: 'CAMP-01',
        oldWallet: 'CUST7M2NOPQ8RST4UVW5XYZ6ABC7DEFGHIJ',
        newWallet: 'PERA5P0QRST1UVW2XYZ3ABC4DEF5GHIJKLM',
        requestedAt: '2024-02-12T11:30:00Z',
        status: 'pending'
    }
];

export const MOCK_STATS = {
    totalRegistered: 4729,
    aidClaimsThisWeek: 312,
    pendingRequests: 47,
    blockedDuplicates: 23,
    activeWorkers: 18,
    pendingMigrations: 3
};

export const MOCK_AUDIT_LOG = [
    { id: 1, type: 'Registration', refugeeID: 'REF-2024-003', address: 'PERA2M7...GHIJ', timestamp: '2024-02-01T10:45:00Z', txHash: '0xabc123def456789abc' },
    { id: 2, type: 'Aid Issued', refugeeID: 'REF-2024-002', address: 'CUST9K4...F2GH', timestamp: '2024-01-21T09:05:00Z', txHash: '0xdef456abc123789def' },
    { id: 3, type: 'Consent Approved', refugeeID: 'REF-2024-001', address: 'PERA7J3...SPUB', timestamp: '2024-02-09T16:30:00Z', txHash: '0x789abc123def456789' },
    { id: 4, type: 'Migration', refugeeID: 'REF-2024-002', address: 'CUST9K4...F2GH', timestamp: '2024-02-11T09:00:00Z', txHash: '0x456def789abc123456' },
    { id: 5, type: 'Registration', refugeeID: 'REF-2024-001', address: 'PERA7J3...SPUB', timestamp: '2024-01-14T09:32:00Z', txHash: '0x123456789abcdef012' }
];

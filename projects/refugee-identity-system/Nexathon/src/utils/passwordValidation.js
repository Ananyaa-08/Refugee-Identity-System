/**
 * Aid worker portal password rules:
 * - Up to 8 characters
 * - At least one digit
 * - Only letters, digits, and special characters . or _
 */

export const AID_WORKER_PASSWORD_CHECKS = [
    {
        id: 'length',
        label: 'Up to 8 characters',
        test: (password) => password.length > 0 && password.length <= 8,
    },
    {
        id: 'digit',
        label: 'At least one number (0–9)',
        test: (password) => /\d/.test(password),
    },
    {
        id: 'charset',
        label: 'Only letters, numbers, and . or _ (no other special characters)',
        test: (password) => password === '' || /^[A-Za-z0-9._]+$/.test(password),
    },
];

export function getAidWorkerPasswordChecklist(password) {
    return AID_WORKER_PASSWORD_CHECKS.map((rule) => ({
        ...rule,
        met: rule.test(password),
    }));
}

export function validateAidWorkerPassword(password) {
    const checklist = getAidWorkerPasswordChecklist(password);
    const valid = checklist.every((item) => item.met);
    const failed = checklist.filter((item) => !item.met).map((item) => item.label);
    return { valid, failed, checklist };
}

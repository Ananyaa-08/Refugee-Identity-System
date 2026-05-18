/** CAMP-{3 letters}-{digits}, e.g. CAMP-IND-01, CAMP-SYR-12 */
const CAMP_ID_PATTERN = /^CAMP-[A-Z]{3}-\d+$/;

export const CAMP_ID_ERROR_MESSAGE = 'ENTER VALID CAMP ID';
export const CAMP_ID_REQUIRED_MESSAGE = 'ENTER CAMP ID';
export const CAMP_ID_FORMAT_HINT = 'Format: CAMP-IND-01 (3-letter code + number)';

export function normalizeCampId(input) {
    return (input || '').trim().toUpperCase();
}

/**
 * @returns {{ valid: boolean, normalized: string }}
 */
export function validateCampId(value) {
    const normalized = normalizeCampId(value);
    if (!normalized) {
        return { valid: false, normalized: '' };
    }
    if (!CAMP_ID_PATTERN.test(normalized)) {
        return { valid: false, normalized };
    }
    return { valid: true, normalized };
}

/** Live validation while typing (empty field → no error until submit). */
export function getCampIdInputError(value) {
    const normalized = normalizeCampId(value);
    if (!normalized) return null;
    return validateCampId(normalized).valid ? null : CAMP_ID_ERROR_MESSAGE;
}

/** Suggested 3-letter region code from nationality label (e.g. Syrian → SYR). */
export function suggestCampRegionCode(nationality) {
    const letters = (nationality || '').replace(/[^a-zA-Z]/g, '');
    if (letters.length >= 3) return letters.slice(0, 3).toUpperCase();
    if (letters.length > 0) return letters.toUpperCase().padEnd(3, 'X');
    return 'XXX';
}

export function formatCampIdExample(nationality) {
    const code = suggestCampRegionCode(nationality);
    return `CAMP-${code}-01`;
}

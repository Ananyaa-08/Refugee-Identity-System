/** Presets shown in the aid-worker registration nationality picker (no "Other" here — handled in UI). */
export const NATIONALITY_PRESETS = [
    'Syrian',
    'Afghan',
    'South Sudanese',
    'Myanmar',
    'Somali',
    'Ukrainian',
    'Ethiopian',
    'Congolese',
    'Sudanese',
    'Venezuelan',
];

/**
 * Broader set of English nationality / demonym forms (lowercase) for typed entries.
 * Merged with presets for validation.
 */
const EXTRA_VALID = [
    'american', 'british', 'english', 'scottish', 'welsh', 'irish', 'northern irish',
    'french', 'german', 'italian', 'spanish', 'portuguese', 'dutch', 'belgian', 'swiss',
    'austrian', 'swedish', 'norwegian', 'danish', 'finnish', 'icelandic', 'polish',
    'czech', 'slovak', 'hungarian', 'romanian', 'bulgarian', 'greek', 'croatian',
    'serbian', 'bosnian', 'montenegrin', 'albanian', 'macedonian', 'slovenian',
    'estonian', 'latvian', 'lithuanian', 'ukrainian', 'belarusian', 'moldovan',
    'russian', 'georgian', 'armenian', 'azerbaijani', 'kazakh', 'uzbek', 'turkmen',
    'kyrgyz', 'tajik', 'turkish', 'iranian', 'iraqi', 'kuwaiti', 'saudi', 'qatari',
    'emirati', 'omani', 'yemeni', 'jordanian', 'lebanese', 'palestinian', 'israeli',
    'egyptian', 'libyan', 'tunisian', 'algerian', 'moroccan', 'mauritanian', 'senegalese',
    'malian', 'nigerien', 'burkinabe', 'chadian', 'nigerian', 'ghanaian', 'ivorian',
    'liberian', 'sierra leonean', 'guinean', 'gambian', 'guinea-bissauan', 'cape verdean',
    'togolese', 'beninese', 'burkinabe', 'cameroonian', 'central african',
    'equatorial guinean', 'gabonese', 'congolese', 'angolan', 'zambian', 'zimbabwean',
    'malawian', 'mozambican', 'malagasy', 'mauritian', 'seychellois', 'comoran',
    'djiboutian', 'eritrean', 'ethiopian', 'somali', 'kenyan', 'ugandan', 'rwandan',
    'burundian', 'tanzanian', 'south sudanese', 'sudanese', 'south african', 'namibian',
    'botswanan', 'basotho', 'eswatini', 'swazi',
    'chinese', 'japanese', 'korean', 'north korean', 'south korean', 'taiwanese',
    'mongolian', 'vietnamese', 'thai', 'lao', 'cambodian', 'burmese', 'myanmar',
    'filipino', 'philippine', 'indonesian', 'malaysian', 'singaporean', 'bruneian',
    'east timorese', 'timorese', 'indian', 'pakistani', 'bangladeshi', 'nepali',
    'nepalese', 'bhutanese', 'sri lankan', 'maldivian', 'afghan', 'tajik',
    'australian', 'new zealander', 'fijian', 'papua new guinean', 'solomon islander',
    'vanuatuan', 'new caledonian', 'tongan', 'samoan', 'micronesian', 'palauan',
    'mexican', 'guatemalan', 'belizean', 'honduran', 'salvadoran', 'nicaraguan',
    'costa rican', 'panamanian', 'cuban', 'jamaican', 'haitian', 'dominican',
    'puerto rican', 'trinidadian', 'tobagonian', 'barbadian', 'bahamian', 'canadian',
    'argentinian', 'argentine', 'chilean', 'bolivian', 'peruvian', 'ecuadorian',
    'colombian', 'venezuelan', 'brazilian', 'paraguayan', 'uruguayan', 'guyanese',
    'surinamese', 'french guianese',
];

const VALID_SET = new Set([
    ...NATIONALITY_PRESETS.map((s) => s.toLowerCase()),
    ...EXTRA_VALID,
]);

export const NATIONALITY_ERROR_MESSAGE = 'ENTER VALID NATIONALITY';
/** Shown when "Other" is selected but the custom nationality field is empty on submit. */
export const NATIONALITY_REQUIRED_MESSAGE = 'ENTER NATIONALITY';

/** Live validation for the custom nationality field (Other only). */
export function getNationalityCustomInputError(value) {
    const normalized = normalizeNationality(value);
    if (!normalized) return null;
    return validateNationality(normalized).valid ? null : NATIONALITY_ERROR_MESSAGE;
}

export function normalizeNationality(input) {
    return (input || '')
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * @param {string} value — resolved nationality string (preset or typed)
 * @returns {{ valid: boolean, normalized: string }}
 */
export function validateNationality(value) {
    const normalized = normalizeNationality(value);
    if (!normalized) {
        return { valid: false, normalized: '' };
    }
    if (normalized.length > 80) {
        return { valid: false, normalized };
    }
    // Allow letters, spaces, hyphens, apostrophes (e.g. O'Brien → nationality context usually demonyms)
    if (!/^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-'.]*$/u.test(normalized)) {
        return { valid: false, normalized };
    }
    const key = normalized.toLowerCase();
    if (VALID_SET.has(key)) {
        return { valid: true, normalized };
    }
    return { valid: false, normalized };
}

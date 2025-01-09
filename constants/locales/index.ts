import en from './en.json';
import fr from './fr.json';

export type TranslationKey = string;

// Define the structure for the most nested level
interface TranslationField {
    label?: string;
    description?: string;
    [key: string]: string | undefined;
}

type TranslationValue = string | Record<string, string | TranslationField>;

interface Translations {
    [key: string]: {
        [key: string]: TranslationValue;
    };
}

const translations: Translations = {
    en,
    fr,
};

let currentLanguage = 'fr';

export const setLanguage = (language: string) => {
    if (translations[language]) {
        currentLanguage = language;
    } else {
        console.warn(`Language "${language}" is not supported.`);
    }
};

export const t = (key: TranslationKey, replacements?: Record<string, any>): string => {
    const keys = key.split('.');
    let translation: any = translations[currentLanguage];

    for (const k of keys) {
        if (translation && typeof translation === 'object') {
            translation = translation[k];
        } else {
            console.warn(`Translation for key "${key}" not found.`);
            return key;
        }
    }

    if (typeof translation !== 'string') {
        console.warn(`Translation for key "${key}" is not a string.`);
        return key;
    }

    if (replacements) {
        return Object.entries(replacements).reduce(
            (text, [key, value]) => text.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
            translation
        );
    }

    return translation;
};
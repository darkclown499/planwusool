import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../lang/ar.json';

// Arabic-first: only Arabic is bundled into the initial payload. All other
// languages are loaded on demand when the user switches, keeping the landing
// page and dashboard shell fast to first paint.
const LAZY_LANGS = {
    en: () => import('../lang/en.json'),
    es: () => import('../lang/es.json'),
    da: () => import('../lang/da.json'),
    de: () => import('../lang/de.json'),
    fr: () => import('../lang/fr.json'),
    he: () => import('../lang/he.json'),
    it: () => import('../lang/it.json'),
    ja: () => import('../lang/ja.json'),
    nl: () => import('../lang/nl.json'),
    pl: () => import('../lang/pl.json'),
    pt: () => import('../lang/pt.json'),
    'pt-BR': () => import('../lang/pt-BR.json'),
    ru: () => import('../lang/ru.json'),
    tr: () => import('../lang/tr.json'),
    zh: () => import('../lang/zh.json'),
};

function getInitialLanguage() {
    // Arabic-first: always start in Arabic.
    return 'ar';
}

var initialLang = getInitialLanguage();

i18n
    .use(initReactI18next)
    .init({
        lng: initialLang,
        fallbackLng: 'ar',
        load: 'currentOnly',
        debug: false,
        keySeparator: false,
        nsSeparator: false,
        interpolation: { escapeValue: false },
        ns: ['translation'],
        defaultNS: 'translation',
        resources: {
            ar: { translation: ar },
        },
    });

// Lazy-load + register a language bundle the first time it is requested.
i18n.on('languageChanged', function (lng) {
    const loader = LAZY_LANGS[lng];
    if (!loader || i18n.hasResourceBundle(lng, 'translation')) return;
    loader()
        .then((mod) => {
            i18n.addResourceBundle(lng, 'translation', mod.default, true, true);
            i18n.emit('languageLoaded', lng);
        })
        .catch(() => {
            // Non-critical: fall back to Arabic.
        });
});

var originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = function (lng, callback) {
    localStorage.setItem('i18nextLng', lng || 'ar');
    // If the bundle isn't loaded yet, add it first so the UI never flashes
    // untranslated keys.
    const loader = LAZY_LANGS[lng];
    if (loader && !i18n.hasResourceBundle(lng, 'translation')) {
        return loader().then((mod) => {
            i18n.addResourceBundle(lng, 'translation', mod.default, true, true);
            return originalChangeLanguage(lng, callback);
        });
    }
    return originalChangeLanguage(lng, callback);
};

export default i18n;
window.i18next = i18n;

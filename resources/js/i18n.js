import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../lang/en.json';
import ar from '../lang/ar.json';
import es from '../lang/es.json';
import da from '../lang/da.json';
import de from '../lang/de.json';
import fr from '../lang/fr.json';
import he from '../lang/he.json';
import it from '../lang/it.json';
import ja from '../lang/ja.json';
import nl from '../lang/nl.json';
import pl from '../lang/pl.json';
import pt from '../lang/pt.json';
import ptBR from '../lang/pt-BR.json';
import ru from '../lang/ru.json';
import tr from '../lang/tr.json';
import zh from '../lang/zh.json';

function getInitialLanguage() {
    try {
        var saved = localStorage.getItem('i18nextLng');
        if (saved) return saved;
    } catch (e) { /* ignore */ }
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
            en: { translation: en },
            ar: { translation: ar },
            es: { translation: es },
            da: { translation: da },
            de: { translation: de },
            fr: { translation: fr },
            he: { translation: he },
            it: { translation: it },
            ja: { translation: ja },
            nl: { translation: nl },
            pl: { translation: pl },
            pt: { translation: pt },
            'pt-BR': { translation: ptBR },
            ru: { translation: ru },
            tr: { translation: tr },
            zh: { translation: zh },
        },
    });

var originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = function (lng, callback) {
    localStorage.setItem('i18nextLng', lng || 'en');
    return originalChangeLanguage(lng, callback);
};

export default i18n;
window.i18next = i18n;

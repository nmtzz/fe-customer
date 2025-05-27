import {createI18n} from "vue-i18n";
import vi from './messages/vi.json';
import en from './messages/en.json';

const storedLocale = localStorage.getItem('locale') || 'vi';

const i18n = createI18n({
    legacy: false,
    locale: storedLocale,
    fallbackLocale: 'en',
    messages: {
        vi: vi,
        en: en,
    },
    numberFormats: {
        en: {
            currency: {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 3,
            },
        },
        vi: {
            currency: {
                style: 'currency',
                currency: 'VND',
                minimumFractionDigits: 0,
                maximumFractionDigits: 3,
            },
        },
    },
    datetimeFormats: {
        'en': {
            long: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            },
            short: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            },
        },
        'vi': {
            long: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            },
            short: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            },
        },
    }
})
export default i18n;

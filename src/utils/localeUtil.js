import {useI18n} from "vue-i18n";
import {ref} from "vue";
import Decimal from "decimal.js";

const exchangeRate = ref(new Decimal('1'));
const availableLocales = ref([
    {code: 'en', name: 'English', exchangeRate: new Decimal('0.000039')},
    {code: 'vi', name: 'Tiếng Việt', exchangeRate: new Decimal('1')}
]);
const refreshExchangeRate = (localeCode) => {
    try {
        exchangeRate.value = availableLocales.value.find(l => l.code === localeCode).exchangeRate;
    } catch (e) {
        exchangeRate.value = new Decimal('1');
    }
};

const getExchangeRate = () => {
    try {
        exchangeRate.value = availableLocales.value.find(l => l.code === useI18n().locale.value).exchangeRate;
    } catch (e) {
        exchangeRate.value = new Decimal('1');
    }
};

const displayCurrency = (source) => {
    if (source === 0 || !source) return 0;
    try {
        return useI18n().n(new Decimal(source).times(exchangeRate.value).toNumber(), 'currency');
    } catch (e) {
        console.error(e);
        return source;
    }
};

const displayDate = (source) => {
    if (!source) return '';
    try {
        const {d} = useI18n();
        return d(new Date(source), 'long');
    } catch (e) {
        return source;
    }
};
const displayDateShort = (source) => {
    if (!source) return '';
    try {
        const {d} = useI18n();
        return d(new Date(source), 'short');
    } catch (e) {
        return source;
    }
};

const getCurrentExchangeRate = () => {
    return exchangeRate.value ? exchangeRate.value.toNumber() : 1;
};

export {displayCurrency, displayDate, getExchangeRate, refreshExchangeRate, getCurrentExchangeRate, displayDateShort};

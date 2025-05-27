export const clickOutside = {
    beforeMount(el, binding) {
        el.clickOutsideEvent = (event) => {

            if (!(el === event.target || el.contains(event.target))) {

                binding.value(event);
            }
        };
        document.addEventListener("click", el.clickOutsideEvent);
    },
    unmounted(el) {
        document.removeEventListener("click", el.clickOutsideEvent);
    },
};

import {accountModalStore} from '@/stores/accountModalStore';
import {toast} from 'vue-sonner';
import i18n from '@/i18n/i18n';

export const requireLogin = {
    mounted(el, binding) {
        const clickHandler = (event) => {
            const user = localStorage.getItem('user');
            if (!user) {
                event.preventDefault();
                event.stopPropagation();

                let message = binding.value || i18n.global.t('common.pleaseLoginToContinue');

                toast.info(i18n.global.t('common.loginRequired'), {
                    description: message
                });

                accountModalStore.openLoginModal();
            }
        };

        el.addEventListener('click', clickHandler, true);

        el.__vueAuthClickHandler__ = clickHandler;
    },

    unmounted(el) {
        if (el.__vueAuthClickHandler__) {
            el.removeEventListener('click', el.__vueAuthClickHandler__, true);
            delete el.__vueAuthClickHandler__;
        }
    }
};

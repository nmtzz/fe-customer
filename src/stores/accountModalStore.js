import {reactive} from 'vue'

export const accountModalStore = reactive({
    loginModalOpen: false,
    registerModalOpen: false,
    openLoginModal() {
        this.loginModalOpen = true;
    },
    closeLoginModal() {
        this.loginModalOpen = false;
    },
    openRegisterModal() {
        this.registerModalOpen = true;
    },
    closeRegisterModal() {
        this.registerModalOpen = false;
    }
})

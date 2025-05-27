import './assets/main.css'

import {createApp} from 'vue'
import App from './App.vue'
import router from './router'
import {QueryClient, VueQueryPlugin} from '@tanstack/vue-query'
import i18n from './i18n/i18n'
import useAxiosConfig from "@/configs/axiosConfig.js";
import {clickOutside, requireLogin} from '@/lib/directives'
import {checkAuthentication} from "@/utils/authUtil.js";
import GoogleSignInPlugin from "vue3-google-signin"

useAxiosConfig()
checkAuthentication().then();
const app = createApp(App)
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: true,
            retry: false
        }
    }
})
app.use(VueQueryPlugin, {queryClient})
app.use(router)
app.use(i18n)
app.use(GoogleSignInPlugin, {
    clientId: "436746999856-6cfn93b1k9hcpk259nmj7p9miinl1qpc.apps.googleusercontent.com",
});
app.directive('click-outside', clickOutside)
app.directive('require-login', requireLogin)
app.mount('#app')

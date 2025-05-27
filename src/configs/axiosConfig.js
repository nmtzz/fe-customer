import axios from "axios";
import {toast} from "vue-sonner";
import i18n from '@/i18n/i18n';

const useAxiosConfig = () => {
    axios.defaults.baseURL = 'http://localhost:8080/api';
    axios.defaults.headers.common['Accept-Language'] = localStorage.getItem('locale') || 'vi';
    axios.interceptors.response.use(response => {
        return response;
    }, error => {
        if (error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            toast.error(i18n.global.t('common.pleaseLoginToContinue', 'An error occurred while processing your request, try refreshing the page or contacting support.'));
        } else if (error.response.status === 404) {
            window.location.href = '/404';
        } else if (error?.response?.data?.error) {
            toast.error(error?.response?.data?.error || i18n.global.t('common.requestError', 'An error occurred while processing your request, try refreshing the page or contacting support.'));
        }
        return Promise.reject(error);
    });
}
export default useAxiosConfig;

import axios from "axios";
import {reactive} from "vue";

const checkAuthentication = async () => {
    const token = localStorage.getItem('token');
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
            const res = await axios.get('/users/auth');
            if (res.data && res.data.success && res.data.result) {
                const user = res.data.result;
                localStorage.setItem('user', JSON.stringify({
                    fullName: user.fullName,
                    email: user.email,
                    pictureUrl: user?.pictureUrl || '',
                    phoneNumber: user?.phoneNumber || '',
                    provider: user?.provider || '',
                }));
            } else {
                handleTokenError();
            }
        } catch (error) {
            handleTokenError();
        }
    }
};

const handleTokenError = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
};
const userData = reactive({
    user: JSON.parse(localStorage.getItem('user')) || null,
})
export {checkAuthentication, handleTokenError, userData};

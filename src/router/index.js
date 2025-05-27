import {createRouter, createWebHistory} from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProductsByCategoryView from "@/views/ProductsByCategoryView.vue";
import ProductDetail from "@/views/ProductDetail.vue";
import CartView from "@/views/CartView.vue";
import PlaceOrderView from "@/views/PlaceOrderView.vue";
import ListOrderView from "@/views/ListOrderView.vue";
import OrderDetailView from "@/views/OrderDetailView.vue";
import PaymentView from "@/views/PaymentView.vue";
import QuickBuyView from "@/views/QuickBuyView.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import SearchView from "@/views/SearchView.vue";
import AllProductsView from "@/views/AllProductsView.vue";
import CategoriesView from "@/views/CategoriesView.vue";
import AccountView from "@/views/AccountView.vue";
import ForgetPasswordView from "@/views/ForgetPasswordView.vue";
import AboutView from "@/views/AboutView.vue";
import ContactView from "@/views/ContactView.vue";
import {accountModalStore} from '@/stores/accountModalStore';
import {toast} from 'vue-sonner';
import i18n from '@/i18n/i18n';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior() {
        return {top: 0}
    },
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/:slug/:categoryId',
            name: 'category',
            component: ProductsByCategoryView,
        },
        {
            path: '/:categorySlug/:productSlug/:productId',
            name: 'product',
            component: ProductDetail,
        },
        {
            path: '/cart',
            name: 'cart',
            component: CartView,
        },
        {
            path: '/place-order',
            name: 'checkout',
            component: PlaceOrderView,
            meta: {requiresAuth: true},
        },
        {
            path: '/orders',
            name: 'orders',
            component: ListOrderView,
            meta: {requiresAuth: true},
        },
        {
            path: '/orders/:orderId',
            name: 'order-detail',
            component: OrderDetailView,
            meta: {requiresAuth: true},
        },
        {
            path: '/payment/:orderIdToPay',
            name: 'payment',
            component: PaymentView,
            meta: {requiresAuth: true},
        },
        {
            path: '/quick-buy/:productSlug/:productIdToBuy',
            name: 'quick-buy',
            component: QuickBuyView,
            meta: {requiresAuth: true},
        },
        {
            path: '/404',
            name: 'not-found',
            component: NotFoundView,
        },
        {
            path: '/search',
            name: 'search',
            component: SearchView,
        },
        {
            path: '/all-products',
            name: 'all-products',
            component: AllProductsView,
        },
        {
            path: '/categories',
            name: 'categories',
            component: CategoriesView,
        },
        {
            path: '/account',
            name: 'account',
            component: AccountView,
            meta: {requiresAuth: true},
        },
        {
            path: '/forget-password',
            name: 'forget-password',
            component: ForgetPasswordView,
        },
        {
            path: '/about',
            name: 'about',
            component: AboutView,
        },
        {
            path: '/contact',
            name: 'contact',
            component: ContactView,
        },
        {
            path: '/:catchAll(.*)',
            redirect: '/404',
        },
    ],
})

router.beforeEach((to, from, next) => {

    if (to.matched.some(record => record.meta.requiresAuth)) {

        const user = localStorage.getItem('user');
        if (!user) {

            toast.info(i18n.global.t('common.loginRequired'), {
                description: i18n.global.t('common.pleaseLoginToContinue')
            });

            accountModalStore.openLoginModal();

            next(from.path || '/');
            return;
        } else {

            next();
            return;
        }
    }

    next();
});

export default router

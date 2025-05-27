import {reactive} from "vue";

const viewedProductsStore = reactive({
    addViewedProduct(productId) {
        if (!productId) return;
        if (!localStorage.getItem('viewedProducts')) {
            localStorage.setItem('viewedProducts', JSON.stringify([]));
        }
        const viewedProducts = JSON.parse(localStorage.getItem('viewedProducts'));
        if (!viewedProducts.includes(productId)) {
            viewedProducts.unshift(productId);
            localStorage.setItem('viewedProducts', JSON.stringify(viewedProducts.slice(0, 12)));
        }
    },
    getViewedProducts() {
        return JSON.parse(localStorage.getItem('viewedProducts')) || [];
    }
})
export default viewedProductsStore;

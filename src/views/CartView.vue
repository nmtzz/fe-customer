<script setup>
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import axios from "axios";
import {computed} from "vue";
import {useRouter} from "vue-router";
import {useI18n} from "vue-i18n";
import {toast} from "vue-sonner";
import {displayCurrency} from "@/utils/localeUtil.js";
import getSlug from "@/utils/slugUtil.js";
import {userData} from "@/utils/authUtil.js";
import {accountModalStore} from "@/stores/accountModalStore.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {Carousel, CarouselContent, CarouselItem,} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import ProductCard from '@/components/ProductCard.vue';
import viewedProductsStore from "@/stores/viewedProductsStore.js";

const router = useRouter();
const {t} = useI18n();
const queryClient = useQueryClient();
document.title = t('cart.title', 'Shopping Cart');
const user = userData.user
if (!user) {
  accountModalStore.openLoginModal();
  toast.info(t('cart.loginToViewCart', 'Please login to view your shopping cart and checkout'));
}
const {data, isPending, isError} = useQuery({
  queryKey: ['cart'],
  queryFn: async () => {
    const {data} = await axios.get('/carts');
    return data;
  },
  enabled: computed(() => !!user)
});
const quantityMutation = useMutation({
  mutationFn: async (data) => {
    const response = await axios.patch(`/carts/${data.type}?cartId=${data.cartId}`);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['cart']);
    toast.success(t('cart.updated', 'Cart updated successfully'));
  }
})
const deleteCartMutation = useMutation({
  mutationFn: async (cartId) => {
    const response = await axios.delete(`/carts/${cartId}`);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['cart']);
    toast.success(t('cart.removed', 'Cart item removed successfully'));
  }
})
const clearCartMutation = useMutation({
  mutationFn: async () => {
    const response = await axios.delete('/carts/clear');
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['cart']);
    toast.success(t('cart.cleared', 'Cart cleared successfully'));
  }
})

const {data: viewedProductsData, isLoading: isLoadingViewedProducts, isError: isErrorViewedProducts} = useQuery({
  queryKey: ['viewedProducts'],
  queryFn: async () => {
    try {
      const viewedProducts = viewedProductsStore.getViewedProducts();
      const {data} = await axios.post('/products/ids', viewedProducts);
      return data;
    } catch (error) {
      console.error('Error fetching viewed products:', error);
      return {result: []};
    }
  },
  enabled: computed(() => viewedProductsStore?.getViewedProducts()?.length > 0)
})

const cartItems = computed(() => data.value?.result || []);
const isEmpty = computed(() => cartItems.value.length === 0);

const filteredViewedProducts = computed(() => {
  if (!viewedProductsData.value?.result || !cartItems.value) return [];

  const cartProductIds = cartItems.value.map(item => item.productId);

  return viewedProductsData.value.result.filter(product =>
      !cartProductIds.includes(product.id)
  ).slice(0, 12);
});

const subtotal = computed(() => {
  return cartItems.value.reduce((total, item) => {
    return total + (item.productPromotionPrice * item.quantity);
  }, 0);
});

const totalSavings = computed(() => {
  return cartItems.value.reduce((total, item) => {
    return total + ((item.productPrice - item.productPromotionPrice) * item.quantity);
  }, 0);
});

const finalTotal = computed(() => {
  return subtotal.value;
});

const updateQuantity = (itemId, newQuantity) => {

};

const removeItem = (itemId) => {
  deleteCartMutation.mutate(itemId);
};

const goToProductDetail = (product) => {
  const categorySlug = getSlug(product.productCategoryName || 'category');
  const productSlug = getSlug(product.productName || 'product');
  router.push({
    name: 'product',
    params: {
      categorySlug,
      productSlug,
      productId: product.productId
    }
  });
};

const checkout = () => {
  router.push('/place-order');
};

const continueShopping = () => {
  router.push('/');
};

const clearCart = () => {
  clearCartMutation.mutate();
};
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('cart.title', 'Shopping Cart') }}</h1>
      <p v-if="user" class="text-gray-600 mt-1">
        {{ cartItems.length }} {{ t('cart.items', 'items in your cart') }}
      </p>
    </div>

    <div v-if="user && !isEmpty" class="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                  clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-blue-700">
            {{ t('cart.quantityLimit', 'For each product, a maximum of 3 items can be added to your cart') }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="!user" class="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900">{{ t('cart.loginRequired', 'Login Required') }}</h3>
      <p class="mt-1 text-gray-500">
        {{ t('cart.loginToViewCart', 'Please login to view your shopping cart and checkout') }}
      </p>
      <div class="mt-6 flex flex-col sm:flex-row justify-center gap-4">
        <button
            @click="accountModalStore.openLoginModal()"
            class="inline-flex items-center justify-center px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <span>{{ t('header.login', 'Login') }}</span>
        </button>
        <button
            @click="accountModalStore.openRegisterModal()"
            class="inline-flex items-center justify-center px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {{ t('header.register', 'Register') }}
        </button>
      </div>
      <div class="mt-6">
        <button
            @click="continueShopping"
            class="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
               stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          {{ t('cart.continue', 'Continue Shopping') }}
        </button>
      </div>
    </div>

    <div v-else>

      <div v-if="isPending" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>

      <div v-else-if="isError" class="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500" fill="none" viewBox="0 0 24 24"
             stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">{{ t('common.error', 'Error') }}</h3>
        <p class="mt-1 text-gray-500">{{ t('cart.errorLoading', 'There was an error loading your cart') }}</p>
        <button
            @click="queryClient.invalidateQueries(['cart'])"
            class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {{ t('cart.tryAgain', 'Try Again') }}
        </button>
      </div>

      <div v-else-if="isEmpty" class="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24"
             stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">{{ t('cart.empty', 'Your cart is empty') }}</h3>
        <p class="mt-1 text-gray-500">
          {{ t('cart.emptyDescription', 'Looks like you haven\'t added any products to your cart yet.') }}</p>
        <button
            @click="continueShopping"
            class="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"
               stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          {{ t('cart.continue', 'Continue Shopping') }}
        </button>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

            <div
                class="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
              <div class="col-span-6">{{ t('cart.product', 'Product') }}</div>
              <div class="col-span-2 text-center">{{ t('cart.price', 'Price') }}</div>
              <div class="col-span-2 text-center">{{ t('cart.quantity', 'Quantity') }}</div>
              <div class="col-span-2 text-right">{{ t('cart.total', 'Total') }}</div>
            </div>

            <div class="flex justify-end p-2 bg-gray-50 border-b border-gray-200">
              <AlertDialog>
                <AlertDialogTrigger as-child>
                  <button class="text-sm text-red-600 hover:text-red-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    {{ t('cart.clearCart', 'Clear Cart') }}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{{
                        t('cart.clearCartConfirm', 'Are you sure you want to clear your cart?')
                      }}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {{
                        t('cart.clearCartDescription', 'This will remove all items from your cart. This action cannot be undone.')
                      }}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{{ t('cart.cancel', 'Cancel') }}</AlertDialogCancel>
                    <AlertDialogAction @click="clearCart">{{ t('cart.confirm', 'Confirm') }}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div class="divide-y divide-gray-200">
              <div v-for="item in cartItems" :key="item.id"
                   class="p-4 md:grid md:grid-cols-12 md:gap-4 md:items-center relative">
                <div class="md:col-span-6 flex">
                  <div class="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-md overflow-hidden">
                    <img
                        :src="item.productThumbnail"
                        :alt="item.productName"
                        class="w-full h-full object-contain"
                    />
                  </div>
                  <div class="ml-4 flex-1">
                    <h3
                        class="text-sm font-medium text-gray-900 hover:text-primary-600 cursor-pointer"
                        @click="goToProductDetail(item)"
                    >
                      {{ item.productName }}
                    </h3>
                    <p class="mt-1 text-xs text-gray-500">{{ item.productCategoryName }}</p>
                    <p class="mt-1 text-xs text-gray-500">{{ t('cart.sku', 'SKU') }}: {{ item.productId }}</p>

                    <div class="md:hidden mt-2 flex justify-between">
                      <div class="text-sm font-medium text-gray-900">
                        {{ displayCurrency(item.productPromotionPrice) }}
                      </div>
                      <div class="text-sm font-medium text-gray-900">
                        {{ displayCurrency(item.productPromotionPrice * item.quantity) }}
                      </div>
                    </div>

                    <button
                        @click="removeItem(item.id)"
                        class="md:hidden mt-3 text-xs text-red-600 hover:text-red-800 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      {{ t('cart.remove', 'Remove') }}
                    </button>
                  </div>
                </div>

                <div class="hidden md:block md:col-span-2 text-center">
                  <div class="text-sm font-medium text-gray-900">
                    {{ displayCurrency(item.productPromotionPrice) }}
                  </div>
                  <div v-if="item.productPrice > item.productPromotionPrice" class="text-xs text-gray-500 line-through">
                    {{ displayCurrency(item.productPrice) }}
                  </div>
                </div>

                <div class="md:col-span-2 mt-4 md:mt-0">
                  <div class="flex items-center justify-center">
                    <button
                        @click="quantityMutation.mutate({type: 'decrease', cartId: item.id})"
                        class="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100"
                        :disabled="item.quantity <= 1"
                        :class="{'opacity-50 cursor-not-allowed': item.quantity <= 1}"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                      </svg>
                    </button>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        v-model="item.quantity"
                        @change="updateQuantity(item.id, item.quantity)"
                        class="w-10 h-8 border-t border-b border-gray-300 text-center focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                        style="-moz-appearance: textfield; appearance: textfield;"
                        disabled
                    />
                    <button
                        @click="quantityMutation.mutate({type: 'increase', cartId: item.id})"
                        class="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
                        :disabled="item.quantity >= 3"
                        :class="{'opacity-50 cursor-not-allowed': item.quantity >= 3}">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="hidden md:flex md:col-span-2 md:justify-between md:items-center">
                  <div class="text-sm font-medium text-gray-900">
                    {{ displayCurrency(item.productPromotionPrice * item.quantity) }}
                  </div>
                  <button
                      @click="removeItem(item.id)"
                      class="ml-4 text-gray-400 hover:text-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 lg:hidden">
            <button
                @click="continueShopping"
                class="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              {{ t('cart.continue', 'Continue Shopping') }}
            </button>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">{{ t('cart.orderSummary', 'Order Summary') }}</h2>

            <div class="flow-root">
              <dl class="-my-4 text-sm">
                <div class="py-4 flex items-center justify-between">
                  <dt class="text-gray-600">{{ t('cart.subtotal', 'Subtotal') }}</dt>
                  <dd class="font-medium text-gray-900">{{ displayCurrency(subtotal) }}</dd>
                </div>

                <div v-if="totalSavings > 0" class="py-4 flex items-center justify-between border-t border-gray-200">
                  <dt class="text-green-600">{{ t('cart.savings', 'Savings') }}</dt>
                  <dd class="font-medium text-green-600">-{{ displayCurrency(totalSavings) }}</dd>
                </div>

                <div class="py-4 flex items-center justify-between border-t border-gray-200">
                  <dt class="text-gray-600">{{ t('cart.shipping', 'Shipping') }}</dt>
                  <dd class="font-medium text-gray-900">{{
                      t('cart.calculatedAtCheckout', 'Calculated at checkout')
                    }}
                  </dd>
                </div>

                <div class="py-4 flex items-center justify-between border-t border-gray-200 text-base font-medium">
                  <dt class="text-gray-900">{{ t('cart.total', 'Total') }}</dt>
                  <dd class="text-gray-900">{{ displayCurrency(finalTotal) }}</dd>
                </div>
              </dl>
            </div>

            <div class="mt-6">
              <button
                  @click="checkout"
                  class="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <span>{{ t('cart.proceedToCheckout', 'Proceed to Checkout') }}</span>
              </button>
            </div>

            <div class="mt-4 hidden lg:block">
              <button
                  @click="continueShopping"
                  class="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {{ t('cart.continue', 'Continue Shopping') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isLoadingViewedProducts && !isErrorViewedProducts && filteredViewedProducts.length > 0"
           class="mt-16 border-t border-gray-200 pt-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('cart.recentlyViewed', 'Recently Viewed') }}</h2>

        <Carousel class="w-full" :plugins="[Autoplay({ delay: 4500, stopOnInteraction: false })]">
          <CarouselContent class="-ml-2 md:-ml-4">
            <CarouselItem v-for="product in filteredViewedProducts" :key="product.id"
                          class="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
              <ProductCard :product="product"/>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>

      <div v-else-if="user && !isPending && !isError && !isEmpty" class="mt-16 border-t border-gray-200 pt-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('cart.recentlyViewed', 'Recently Viewed') }}</h2>
        <div class="bg-gray-100 h-40 rounded-lg flex items-center justify-center text-gray-400">
          {{ t('cart.recentlyViewedPlaceholder', 'Recently viewed products will appear here') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.sticky {
  position: sticky;
}

@media (max-width: 1024px) {
  .sticky {
    position: static;
  }
}
</style>

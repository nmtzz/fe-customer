<script setup>
import {useQuery} from "@tanstack/vue-query";
import {useRouter} from "vue-router";
import {useI18n} from "vue-i18n";
import axios from "axios";
import {computed, ref} from "vue";
import {userData} from "@/utils/authUtil.js";
import {displayCurrency} from "@/utils/localeUtil.js";
import {accountModalStore} from "@/stores/accountModalStore.js";
import {toast} from 'vue-sonner';

const router = useRouter();
const {t} = useI18n();
const user = userData.user;

document.title = t('orders.title', 'My Orders');
if (!user) {
  accountModalStore.openLoginModal();
  toast.info(t('orders.loginRequired', 'Please login to view your orders'));
}

const statusFilters = ref([
  {id: 'ALL', label: t('orders.all', 'All'), selected: true},
  {id: 'UNPAID', label: t('orders.unpaid', 'Unpaid'), selected: false},
  {id: 'PENDING_CONFIRMATION', label: t('orders.pendingConfirmation', 'Pending Confirmation'), selected: false},
  {id: 'PENDING_SHIPPING', label: t('orders.pendingShipping', 'Pending Shipping'), selected: false},
  {id: 'SHIPPING', label: t('orders.shipping', 'Shipping'), selected: false},
  {id: 'DELIVERED', label: t('orders.delivered', 'Delivered'), selected: false},
  {
    id: 'PENDING_RETURN_CONFIRMATION',
    label: t('orders.pendingReturnConfirmation', 'Pending Return Confirmation'),
    selected: false
  },
  {id: 'RETURNED', label: t('orders.returned', 'Returned'), selected: false},
  {id: 'REJECTED_RETURN', label: t('orders.rejectedReturn', 'Return Rejected'), selected: false},
  {id: 'CANCELLED', label: t('orders.cancelled', 'Cancelled'), selected: false}
]);
const activeStatusFilter = ref('ALL');

const {data: ordersData, isPending, isError, refetch} = useQuery({
  queryKey: ['orders'],
  queryFn: async () => {
    const {data} = await axios.get('/orders/user');
    return data;
  },
  enabled: computed(() => !!userData.user)
});

const selectStatusFilter = (statusId) => {
  activeStatusFilter.value = statusId;
  statusFilters.value.forEach(filter => {
    filter.selected = filter.id === statusId;
  });
};

const filteredOrders = computed(() => {
  if (!ordersData.value?.result) return [];

  if (activeStatusFilter.value === 'ALL') {
    return ordersData.value.result;
  } else {
    return ordersData.value.result.filter(order => order.status === activeStatusFilter.value);
  }
});

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
};

const getStatusClass = (status) => {
  switch (status) {
    case 'UNPAID':
      return 'bg-yellow-100 text-yellow-800';
    case 'PENDING_CONFIRMATION':
      return 'bg-blue-100 text-blue-800';
    case 'PENDING_SHIPPING':
      return 'bg-indigo-100 text-indigo-800';
    case 'SHIPPING':
      return 'bg-purple-100 text-purple-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    case 'PENDING_RETURN_CONFIRMATION':
      return 'bg-orange-100 text-orange-800';
    case 'RETURNED':
      return 'bg-amber-100 text-amber-800';
    case 'REJECTED_RETURN':
      return 'bg-rose-100 text-rose-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusDisplay = (status) => {
  switch (status) {
    case 'UNPAID':
      return t('orders.unpaid', 'Unpaid');
    case 'PENDING_CONFIRMATION':
      return t('orders.pendingConfirmation', 'Pending Confirmation');
    case 'PENDING_SHIPPING':
      return t('orders.pendingShipping', 'Pending Shipping');
    case 'SHIPPING':
      return t('orders.shipping', 'Shipping');
    case 'DELIVERED':
      return t('orders.delivered', 'Delivered');
    case 'PENDING_RETURN_CONFIRMATION':
      return t('orders.pendingReturnConfirmation', 'Pending Return Confirmation');
    case 'RETURNED':
      return t('orders.returned', 'Returned');
    case 'REJECTED_RETURN':
      return t('orders.rejectedReturn', 'Return Rejected');
    case 'CANCELLED':
      return t('orders.cancelled', 'Cancelled');
    default:
      return status;
  }
};

const viewOrderDetails = (orderId) => {
  router.push(`/orders/${orderId}`);
};

const payOrder = (orderId) => {
  router.push(`/payment/${orderId}`);
};

const goToShop = () => {
  router.push('/');
};
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('orders.title', 'My Orders') }}</h1>
      <p class="text-gray-600 mt-1">{{ t('orders.subtitle', 'View and manage your order history') }}</p>
    </div>

    <div v-if="!user" class="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900">{{ t('orders.loginRequired', 'Login Required') }}</h3>
      <p class="mt-1 text-gray-500">
        {{ t('orders.loginDescription', 'Please login to view your order history') }}
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
            @click="goToShop"
            class="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
               stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          {{ t('orders.continueShopping', 'Continue Shopping') }}
        </button>
      </div>
    </div>

    <div v-else>

      <div class="mb-6 border-b border-gray-200 overflow-x-auto hide-scrollbar">
        <div class="flex space-x-4 pb-1">
          <button
              v-for="filter in statusFilters"
              :key="filter.id"
              @click="selectStatusFilter(filter.id)"
              class="whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors relative"
              :class="filter.selected
              ? 'text-primary-600 border-b-2 border-primary-500 font-medium'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

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
        <p class="mt-1 text-gray-500">{{ t('orders.errorLoading', 'There was an error loading your orders') }}</p>
        <button
            @click="refetch"
            class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {{ t('orders.tryAgain', 'Try Again') }}
        </button>
      </div>

      <div v-else-if="filteredOrders.length === 0"
           class="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24"
             stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">
          {{
            activeStatusFilter === 'ALL'
                ? t('orders.noOrders', 'No orders found')
                : t('orders.noOrdersWithStatus', 'No orders with this status')
          }}
        </h3>
        <p class="mt-1 text-gray-500">
          {{
            activeStatusFilter === 'ALL'
                ? t('orders.emptyOrdersDescription', 'You have not placed any orders yet')
                : t('orders.emptyFilterDescription', 'Try selecting a different status filter')
          }}
        </p>
        <button
            @click="goToShop"
            class="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"
               stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
          {{ t('orders.startShopping', 'Start Shopping') }}
        </button>
      </div>

      <div v-else class="space-y-6">
        <div v-for="order in filteredOrders" :key="order.id"
             class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">

          <div
              class="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <div class="flex items-center">
                <h3 class="text-sm sm:text-base font-medium text-gray-900 mr-2">
                  {{ t('orders.orderCode', 'Order') }}: {{ order.orderCode }}
                </h3>
                <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusClass(order.status)"
                >
                  {{ getStatusDisplay(order.status) }}
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ formatDate(order.createdAt) }}</p>
            </div>

            <div class="flex items-center mt-3 sm:mt-0">
              <div class="text-sm font-semibold text-gray-900 mr-4">
                {{ displayCurrency(order.totalAmount) }}
              </div>

              <div class="flex space-x-2">

                <button
                    v-if="order.status === 'UNPAID'"
                    @click="payOrder(order.id)"
                    class="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1"
                >
                  {{ t('orders.payNow', 'Pay Now') }}
                </button>

                <button
                    @click="viewOrderDetails(order.id)"
                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1"
                >
                  {{ t('orders.viewDetails', 'View Details') }}
                </button>
              </div>
            </div>
          </div>

          <div class="p-4">
            <div class="flex items-center">

              <div class="flex -space-x-2 overflow-hidden mr-4">
                <template v-if="order.productThumbnails && order.productThumbnails.length > 0">
                  <img
                      v-for="(thumbnail, index) in order.productThumbnails.slice(0, 3)"
                      :key="index"
                      :src="thumbnail"
                      :alt="'Product ' + (index + 1)"
                      class="h-14 w-14 rounded-md border border-white bg-gray-100 object-contain"
                  />
                  <div v-if="order.productThumbnails.length > 3"
                       class="h-14 w-14 rounded-md border border-white bg-gray-700 flex items-center justify-center text-white text-xs font-medium">
                    +{{ order.productThumbnails.length - 3 }}
                  </div>
                </template>
                <div v-else class="h-14 w-14 rounded-md bg-gray-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="text-sm text-gray-500">
                  <span class="font-medium text-gray-900">
                    {{ t('orders.deliverTo', 'Deliver to') }}:
                  </span>
                  {{ order.recipientName }} | {{ order.phoneNumber }}
                </div>
                <div class="text-xs text-gray-500 truncate mt-1">
                  <span class="font-medium">{{ t('orders.address', 'Address') }}:</span>
                  {{ order.shippingAddress }}
                </div>
              </div>
            </div>

            <div class="mt-4 text-xs text-gray-500 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span class="font-medium">{{ t('orders.paymentMethod', 'Payment') }}:</span>
                {{
                  order.paymentMethod === 'CASH_ON_DELIVERY'
                      ? t('checkout.cod', 'Cash on Delivery')
                      : t('checkout.bankTransfer', 'Bank Transfer')
                }}
              </div>
              <div>
                <span class="font-medium">{{ t('orders.subtotal', 'Subtotal') }}:</span>
                {{ displayCurrency(order.subtotal) }}
              </div>
              <div>
                <span class="font-medium">{{ t('orders.shippingFee', 'Shipping') }}:</span>
                {{ displayCurrency(order.shippingFee) }}
              </div>
              <div v-if="order.discountAmount > 0">
                <span class="font-medium text-green-600">{{ t('orders.discount', 'Discount') }}:</span>
                <span class="text-green-600">-{{ displayCurrency(order.discountAmount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

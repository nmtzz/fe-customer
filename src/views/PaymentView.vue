<script setup>
import {useRoute, useRouter} from "vue-router";
import {useQuery} from "@tanstack/vue-query";
import {computed, onBeforeUnmount, ref, watch} from "vue";
import axios from "axios";
import {toast} from "vue-sonner";
import {useI18n} from "vue-i18n";
import {displayCurrency} from "@/utils/localeUtil.js";
import {CheckCheck, Copy} from 'lucide-vue-next';
import {userData} from "@/utils/authUtil.js";

const {t, locale} = useI18n();
const route = useRoute()
const router = useRouter()
const orderIdToPay = route.params.orderIdToPay
const countdown = ref(300);
const isTimeOut = ref(false);
const pollingInterval = ref(null);
const countdownInterval = ref(null);
const currentStatus = ref("UNPAID");
const user = userData.user;

if (!user) {
  toast.error(t('payment.loginRequired', 'Please log in to view payment details'));
  router.push('/');
}

const copiedItems = ref({
  accountNumber: false,
  orderCode: false
});

const displayCurrencyWithVND = (amount) => {

  const localeCurrency = displayCurrency(amount);

  if (locale.value !== 'vi') {

    const vndFormat = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

    return `${localeCurrency} (${vndFormat})`;
  }

  return localeCurrency;
};

const {data: orderData, isPending, isError} = useQuery({
  queryKey: ['order', orderIdToPay],
  queryFn: async () => {
    try {
      const {data} = await axios.get(`/orders/${orderIdToPay}`);
      const orderStatus = data.result.status;
      const paymentMethod = data.result.paymentMethod;
      if (orderStatus !== 'UNPAID' || paymentMethod !== 'BANK_TRANSFER') {

        if (orderStatus !== 'UNPAID') {
          currentStatus.value = orderStatus;
          setTimeout(() => {
            toast.success(t('payment.alreadyPaid', 'This order has already been paid'));
            router.push(`/orders/${orderIdToPay}`);
          }, 2000);
          return data;
        }

        toast.error(t('payment.invalidOrder', 'Invalid order for payment'));
        await router.push('/');
        return null;
      }

      currentStatus.value = orderStatus;
      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error(t('payment.errorFetchingOrder', 'Error fetching order details'));
      await router.push('/');
      return null;
    }
  },
  enabled: computed(() => !!route.params.orderIdToPay && !!user)
})

const orderedProducts = computed(() => {
  if (!orderData.value || !orderData.value.result || !orderData.value.result.orderDetails) {
    return [];
  }
  document.title = t('payment.titleWithOrder', 'Payment For Order #') + orderData?.value?.result?.orderCode;
  return orderData.value.result.orderDetails;
});

const orderSummary = computed(() => {
  if (!orderData.value || !orderData.value.result) {
    return {
      subtotal: 0,
      shippingFee: 0,
      discountAmount: 0,
      totalAmount: 0
    };
  }
  const result = orderData.value.result;
  return {
    subtotal: result.subtotal || 0,
    shippingFee: result.shippingFee || 0,
    discountAmount: result.discountAmount || 0,
    totalAmount: result.totalAmount || 0
  };
});

const qrCode = computed(() => {
  if (!orderData.value || !orderData.value.result) return '';
  const totalAmount = orderData.value.result.totalAmount;
  const orderCode = orderData.value.result.orderCode;
  return `https://img.vietqr.io/image/TPB-32077831706-compact2.jpg?amount=${totalAmount}&addInfo=${orderCode}&accountName=NGUYEN%20THANH%20THUAN`;
});

const copyToClipboard = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text);

    copiedItems.value[type] = true;

    setTimeout(() => {
      copiedItems.value[type] = false;
    }, 2000);

    toast.success(t('payment.copied', 'Copied to clipboard!'));
  } catch (err) {
    console.error('Failed to copy: ', err);
    toast.error(t('payment.copyFailed', 'Failed to copy. Please try again.'));
  }
};

const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

const statusInfo = computed(() => {
  switch (currentStatus.value) {
    case 'UNPAID':
      return {
        label: t('payment.unpaid', 'Unpaid'),
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800'
      };
    case 'PENDING_CONFIRMATION':
      return {
        label: t('payment.pendingConfirmation', 'Pending Confirmation'),
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      };
    case 'PROCESSING':
      return {
        label: t('payment.processing', 'Processing'),
        bgColor: 'bg-indigo-100',
        textColor: 'text-indigo-800'
      };
    case 'PAID':
      return {
        label: t('payment.paid', 'Paid'),
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      };
    default:
      return {
        label: currentStatus.value,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800'
      };
  }
});

const isPaymentComplete = computed(() => {
  return currentStatus.value !== 'UNPAID';
});

const startPolling = () => {
  if (pollingInterval.value) clearInterval(pollingInterval.value);
  if (countdownInterval.value) clearInterval(countdownInterval.value);

  countdownInterval.value = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      handleTimeout();
    }
  }, 1000);

  pollingInterval.value = setInterval(async () => {
    try {
      const response = await axios.get(`/orders/${orderIdToPay}?checkPaymentStatus=true`);
      if (response.data && response.data.success) {

        const newStatus = response.data.result.status;

        if (newStatus !== 'UNPAID') {
          toast.success(t('payment.paymentReceived', 'Payment received!'));

          setTimeout(() => {
            cleanup();
            router.push(`/orders/${orderIdToPay}`);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  }, 3000);
};

const handleTimeout = () => {
  isTimeOut.value = true;
  cleanup();
  toast.error(t('payment.paymentTimeout', 'Payment timeout!'));
  router.push(`/orders/${orderIdToPay}`);
};

const cleanup = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
    pollingInterval.value = null;
  }
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value);
    countdownInterval.value = null;
  }
};

if (orderIdToPay) {
  startPolling();
}

const cancelPayment = () => {
  cleanup();
  router.push(`/orders/${orderIdToPay}`);
};
watch(() => route.params.orderIdToPay, () => {
  cleanup();
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">

    <button
        @click="cancelPayment"
        class="mb-6 flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
      </svg>
      {{ t('payment.backToOrder', 'Back to Order') }}
    </button>

    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('payment.title', 'Complete Your Payment') }}</h1>
    </div>

    <div v-if="isPending" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="isError || !orderData" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-4" fill="none"
           viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <h2 class="text-lg font-medium text-gray-900 mb-2">{{ t('payment.errorTitle', 'Error Loading Order') }}</h2>
      <p class="text-gray-600 mb-4">
        {{ t('payment.errorDescription', 'There was a problem loading your order details. Please try again.') }}</p>
      <button
          @click="router.push('/orders')"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
      >
        {{ t('payment.viewOrders', 'View Your Orders') }}
      </button>
    </div>

    <div v-else-if="isTimeOut" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-yellow-500 mb-4" fill="none"
           viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <h2 class="text-lg font-medium text-gray-900 mb-2">{{ t('payment.timeoutTitle', 'Payment Session Expired') }}</h2>
      <p class="text-gray-600 mb-4">{{
          t('payment.timeoutDescription', 'Your payment session has expired. You can still complete your payment from your order details page.')
        }}</p>
      <button
          @click="router.push(`/orders/${orderIdToPay}`)"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
      >
        {{ t('payment.viewOrder', 'View Order Details') }}
      </button>
    </div>

    <div v-else-if="orderData && orderData.result" class="grid grid-cols-1 md:grid-cols-2 gap-8">

      <div>

        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 class="text-md font-medium text-gray-900 mb-2">{{ t('payment.bankInformation', 'Bank Information') }}</h3>
          <div class="bg-gray-50 rounded-md p-4 space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">{{ t('payment.bank', 'Bank') }}</span>
              <span class="text-sm font-medium">TPBank</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">{{ t('payment.accountNumber', 'Account Number') }}</span>
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium">32077831706</span>
                <button
                    @click="copyToClipboard('32077831706', 'accountNumber')"
                    class="p-1 rounded-md hover:bg-gray-200 transition-colors focus:outline-none"
                    :class="{ 'bg-gray-200': copiedItems.accountNumber }"
                    title="Copy account number"
                >
                  <CheckCheck v-if="copiedItems.accountNumber" class="h-4 w-4 text-green-600"/>
                  <Copy v-else class="h-4 w-4 text-gray-600"/>
                </button>
              </div>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">{{ t('payment.accountName', 'Account Name') }}</span>
              <span class="text-sm font-medium">NGUYEN MINH THUAN</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">{{ t('payment.amount', 'Amount') }}</span>
              <span class="text-sm font-medium">{{ displayCurrencyWithVND(orderData.result.totalAmount) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">{{ t('payment.description', 'Description') }}</span>
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium">{{ orderData.result.orderCode }}</span>
                <button
                    @click="copyToClipboard(orderData.result.orderCode, 'orderCode')"
                    class="p-1 rounded-md hover:bg-gray-200 transition-colors focus:outline-none"
                    :class="{ 'bg-gray-200': copiedItems.orderCode }"
                    title="Copy order code"
                >
                  <CheckCheck v-if="copiedItems.orderCode" class="h-4 w-4 text-green-600"/>
                  <Copy v-else class="h-4 w-4 text-gray-600"/>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">{{ t('payment.orderDetails', 'Order Details') }}</h2>

          <div class="space-y-4">
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-gray-600">{{ t('payment.orderCode', 'Order Code') }}</span>
              <span class="font-medium text-gray-900">{{ orderData.result.orderCode }}</span>
            </div>

            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-gray-600">{{ t('payment.amount', 'Amount') }}</span>
              <span class="font-medium text-gray-900">{{ displayCurrencyWithVND(orderData.result.totalAmount) }}</span>
            </div>

            <div class="flex justify-between items-center py-2">
              <span class="text-gray-600">{{ t('payment.status', 'Status') }}</span>
              <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="[statusInfo.bgColor, statusInfo.textColor]"
              >
                {{ statusInfo.label }}

                <svg v-if="isPaymentComplete" xmlns="http://www.w3.org/2000/svg" class="ml-1 h-3.5 w-3.5"
                     viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"/>
                </svg>
              </span>
            </div>
          </div>

          <div v-if="isPaymentComplete" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20"
                   fill="currentColor">
                <path fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"/>
              </svg>
              <p class="text-sm font-medium text-green-700">
                {{ t('payment.paymentConfirmed', 'Payment has been confirmed') }}
              </p>
            </div>
            <p class="text-xs text-green-600 mt-1">
              {{ t('payment.redirectingToOrder', 'You will be redirected to your order details shortly') }}
            </p>
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">{{ t('payment.orderedProducts', 'Ordered Products') }}</h2>

          <div v-if="orderedProducts.length > 0" class="space-y-4">

            <div v-for="(product, index) in orderedProducts" :key="index"
                 class="flex items-start py-3 border-b border-gray-100 last:border-b-0">
              <div class="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                <img
                    :src="product.productThumbnail || '/placeholder-image.jpg'"
                    :alt="product.productName || 'Product'"
                    class="w-full h-full object-contain"
                />
              </div>
              <div class="ml-4 flex-1">
                <h3 class="text-sm font-medium text-gray-900">{{ product.productName }}</h3>
                <p class="text-xs text-gray-500">{{ t('checkout.quantity', 'Qty') }}: {{ product.quantity }}</p>
              </div>
              <div class="ml-2">
                <p class="text-sm font-medium text-gray-900">
                  {{ displayCurrencyWithVND(product.priceAtPurchase * product.quantity) }}</p>
                <p class="text-xs text-gray-500 text-right">{{ displayCurrencyWithVND(product.priceAtPurchase) }} ×
                  {{ product.quantity }}</p>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-200">
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ t('checkout.subtotal', 'Subtotal') }}</span>
                  <span class="font-medium">{{ displayCurrencyWithVND(orderSummary.subtotal) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ t('checkout.shipping', 'Shipping') }}</span>
                  <span class="font-medium">{{ displayCurrencyWithVND(orderSummary.shippingFee) }}</span>
                </div>
                <div v-if="orderSummary.discountAmount > 0" class="flex justify-between text-sm text-green-600">
                  <span>{{ t('checkout.discount', 'Discount') }}</span>
                  <span class="font-medium">-{{ displayCurrencyWithVND(orderSummary.discountAmount) }}</span>
                </div>
                <div class="flex justify-between text-base font-medium border-t border-gray-200 pt-2 mt-2">
                  <span class="text-gray-900">{{ t('checkout.total', 'Total') }}</span>
                  <span class="text-gray-900">{{ displayCurrencyWithVND(orderSummary.totalAmount) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="py-4 text-center text-gray-500">
            {{ t('payment.noProductsFound', 'No product details available') }}
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center">
        <h2 class="text-lg font-medium text-gray-900 mb-4">{{ t('payment.scanToPay', 'Scan to Pay') }}</h2>

        <div v-if="isPaymentComplete" class="mb-6 p-6 bg-green-50 rounded-lg w-full flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-green-500 mb-4" viewBox="0 0 20 20"
               fill="currentColor">
            <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"/>
          </svg>
          <p class="text-lg font-medium text-green-800 text-center">
            {{ t('payment.thankYou', 'Thank you for your payment!') }}
          </p>
        </div>

        <div v-else class="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <img
              :src="qrCode"
              :alt="t('payment.qrCode', 'QR Code for Payment')"
              class="w-full max-w-[250px] h-auto mx-auto"
          />
        </div>

        <div v-if="!isPaymentComplete" class="w-full text-center">
          <p class="text-sm text-gray-600 mb-2">{{ t('payment.sessionExpires', 'Payment session expires in:') }}</p>
          <div class="text-2xl font-bold mb-4 text-red-600">{{ formattedCountdown }}</div>

          <div class="text-sm text-gray-600">
            <p class="mb-2">{{ t('payment.afterTransfer', 'After completing the transfer:') }}</p>
            <ul class="text-left list-disc pl-5 space-y-1">
              <li>{{ t('payment.waitConfirmation', 'Wait for automatic confirmation') }}</li>
              <li>{{ t('payment.automaticRedirect', 'You\'ll be redirected to your order page') }}</li>
            </ul>
          </div>

          <div class="mt-6">
            <button
                @click="cancelPayment"
                class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors"
            >
              {{ t('payment.cancelPayment', 'Cancel and Return to Order') }}
            </button>
          </div>
        </div>

        <div v-else class="w-full mt-4">
          <button
              @click="router.push(`/orders/${orderIdToPay}`)"
              class="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
          >
            {{ t('payment.viewOrderDetails', 'View Order Details') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

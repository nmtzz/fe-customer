<script setup>
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import {useRoute, useRouter} from "vue-router";
import {useI18n} from "vue-i18n";
import axios from "axios";
import {computed, ref} from "vue";
import {userData} from "@/utils/authUtil.js";
import {displayCurrency} from "@/utils/localeUtil.js";
import {accountModalStore} from "@/stores/accountModalStore.js";
import {toast} from 'vue-sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {ArrowLeft, Check, CheckCheck, Copy, Download, MinusCircle, PlusCircle, Printer} from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import getSlug from "@/utils/slugUtil.js";

const route = useRoute();
const router = useRouter();
const {t, locale} = useI18n();
const queryClient = useQueryClient();
const orderId = route.params.orderId;
const user = userData.user;

const dialogOpen = ref(false);
const returnItems = ref([]);
const returnReason = ref('');

const refundInfo = ref({
  bankName: '',
  accountNumber: '',
  refundAmount: 0
});

if (!user) {
  accountModalStore.openLoginModal();
  toast.info(t('orders.loginRequired', 'Please login to view your order details'));
}

const copiedItems = ref({
  orderCode: false
});

const orderStatusSteps = [
  {status: 'PENDING_CONFIRMATION', label: 'orders.pendingConfirmation'},
  {status: 'PENDING_SHIPPING', label: 'orders.pendingShipping'},
  {status: 'SHIPPING', label: 'orders.shipping'},
  {status: 'DELIVERED', label: 'orders.delivered'}
];

const getCurrentOrderStep = computed(() => {
  if (!orderData.value) return -1;

  if (orderData.value.status === 'CANCELLED') return -1;
  if (orderData.value.status === 'UNPAID') return -1;
  if (orderData.value.status === 'PENDING_RETURN_CONFIRMATION') return -1;
  if (orderData.value.status === 'RETURNED') return -1;
  if (orderData.value.status === 'REJECTED_RETURN') return -1;

  return orderStatusSteps.findIndex(step => step.status === orderData.value.status);
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

const cancelMutation = useMutation({
  mutationFn: async () => {
    return await axios.put(`/orders/cancel/${orderId}`);
  },
  onSuccess: () => {
    toast.success(t('orders.cancelSuccess', 'Order cancelled successfully'));
    queryClient.invalidateQueries(['orderDetail', orderId]);
    queryClient.invalidateQueries(['orders']);
  }
})
const returnMutation = useMutation({
  mutationFn: async (returnData) => {
    return await axios.post('/returns', returnData);
  },
  onSuccess: () => {
    toast.success(t('orders.returnSuccess', 'Return request submitted successfully'));
    queryClient.invalidateQueries(['orderDetail', orderId]);
    queryClient.invalidateQueries(['orders']);
  }
});

const {data: orderDetailData, isPending, isError, refetch} = useQuery({
  queryKey: ['orderDetail', orderId],
  queryFn: async () => {
    const {data} = await axios.get(`/orders/${orderId}?client=true`);
    return data;
  },
  enabled: computed(() => !!orderId && !!user)
});

const orderData = computed(() => {
  document.title = `Order #${orderDetailData?.value?.result?.orderCode || 'Order'}`;
  return orderDetailData.value?.result || null;
});
const isPendingReturn = computed(() => {
  return orderData.value?.status === 'PENDING_RETURN_CONFIRMATION' || orderData.value?.status === 'RETURNED'
      || orderData.value?.status === 'REJECTED_RETURN';
})

const needsRefundInfo = computed(() => {
  if (!orderData.value) return false;

  return orderData.value.status === 'PENDING_CONFIRMATION' && orderData.value.paymentMethod === 'BANK_TRANSFER'
});

const calculateRefundAmount = computed(() => {
  if (!orderData.value) return 0;
  return orderData.value.totalAmount;
});

const cancelWithRefund = useMutation({
  mutationFn: async (refundInfo) => {
    return await axios.post(`/orders/cancel-and-refund/${orderId}`, refundInfo);
  },
  onSuccess: () => {
    toast.success(t('orders.cancelSuccess', 'Order cancelled successfully'));
    queryClient.invalidateQueries(['orderDetail', orderId]);
    queryClient.invalidateQueries(['orders']);
  }
})
const submitRefundInfo = () => {
  if (!refundInfo.value.bankName.trim()) {
    toast.error(t('orders.bankNameRequired', 'Please provide your bank name'));
    return;
  }

  if (!refundInfo.value.accountNumber.trim()) {
    toast.error(t('orders.accountNumberRequired', 'Please provide your account number'));
    return;
  }

  const refundPayload = {
    ...refundInfo.value,
    refundAmount: calculateRefundAmount.value,
  };
  cancelWithRefund.mutate(refundPayload);
};
const {data: refundData, isPending: isRefundPending, isError: isRefundError} = useQuery({
  queryKey: ['refund', orderId],
  queryFn: async () => {
    const {data} = await axios.get(`/orders/refund/${orderId}`);
    return data;
  },
  enabled: computed(() => !!orderId && !!user && orderData?.value?.status === 'CANCELLED' && orderData?.value?.paymentMethod === 'BANK_TRANSFER')
})
const {data: returnData, isPending: isReturnPending, isError: isReturnError} = useQuery({
  queryKey: ['return', orderId],
  queryFn: async () => {
    const {data} = await axios.get(`/returns/${orderId}`);
    return data;
  },
  enabled: computed(() => !!orderId && !!user && isPendingReturn.value)
})
const isEligibleForReturn = computed(() => {
  if (!orderData.value || orderData.value.status !== 'DELIVERED') return false;

  const lastUpdateDate = new Date(orderData.value.updatedAt);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate - lastUpdateDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= 3;
});

const initReturnItems = () => {
  if (!orderData.value || !orderData.value.orderDetails) return;

  returnItems.value = orderData.value.orderDetails.map(item => ({
    orderDetailId: item.id,
    quantity: 0,
    maxQuantity: item.quantity,
    productName: item.productName,
    thumbnail: item.productThumbnail,
    price: item.priceAtPurchase
  }));
};

if (orderData.value) {
  initReturnItems();
}

const resetReturnForm = () => {
  returnReason.value = '';
  initReturnItems();
};

const totalReturnQuantity = computed(() => {
  return returnItems.value.reduce((total, item) => total + item.quantity, 0);
});

const totalReturnAmount = computed(() => {
  return returnItems.value.reduce((total, item) => total + (item.price * item.quantity), 0);
});

const incrementQuantity = (item) => {
  if (item.quantity < item.maxQuantity) {
    item.quantity++;
  }
};

const decrementQuantity = (item) => {
  if (item.quantity > 0) {
    item.quantity--;
  }
};

const copyToClipboard = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text);

    copiedItems.value[type] = true;

    setTimeout(() => {
      copiedItems.value[type] = false;
    }, 2000);

    toast.success(t('orders.copied', 'Copied to clipboard!'));
  } catch (err) {
    console.error('Failed to copy: ', err);
    toast.error(t('orders.copyFailed', 'Failed to copy. Please try again.'));
  }
};

const submitReturnRequest = () => {

  if (totalReturnQuantity.value === 0) {
    toast.error(t('orders.noItemsSelected', 'Please select at least one item to return'));
    return;
  }

  if (!returnReason.value.trim()) {
    toast.error(t('orders.reasonRequired', 'Please provide a reason for your return'));
    return;
  }

  const returnDataPayload = {
    orderId: orderData.value.id,
    returnDetails: returnItems.value
        .filter(item => item.quantity > 0)
        .map(item => ({
          orderDetailId: item.orderDetailId,
          returnQuantity: item.quantity
        })),
    reason: returnReason.value.trim(),
    totalReturnAmount: totalReturnAmount.value
  };

  returnMutation.mutate(returnDataPayload);
};

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

const payOrder = () => {
  if (orderData.value && orderData.value.status === 'UNPAID') {
    router.push(`/payment/${orderData.value.id}`);
  }
};

const printOrder = () => {
  window.print();
};

const downloadInvoice = async () => {
  try {
    const response = await axios.get(`/orders/invoice/${orderId}`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], {type: 'application/pdf'});
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${orderData.value?.orderCode || orderId}.pdf`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(t('orders.invoiceDownloaded', 'Invoice downloaded successfully'));
  } catch (error) {
    console.error('Error downloading invoice:', error);
    toast.error(t('orders.invoiceDownloadFailed', 'Failed to download invoice'));
  }
};

const backToOrders = () => {
  router.push('/orders');
};
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6 print:p-4">

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 print:hidden">
      <div class="flex items-center mb-3 sm:mb-0">
        <button
            @click="backToOrders"
            class="flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 mr-4"
        >
          <ArrowLeft class="h-4 w-4 mr-1"/>
          {{ t('orders.backToOrders', 'Back to Orders') }}
        </button>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('orders.orderDetails', 'Order Details') }}</h1>
      </div>

      <div class="flex gap-3">
        <button
            @click="printOrder"
            class="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-md py-2 px-3 shadow-sm hover:bg-gray-50"
        >
          <Printer class="h-4 w-4 mr-2"/>
          {{ t('orders.printOrder', 'Print Order') }}
        </button>

        <button
            v-if="orderData && orderData.status !== 'UNPAID'"
            @click="downloadInvoice"
            class="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-md py-2 px-3 shadow-sm hover:bg-gray-50"
        >
          <Download class="h-4 w-4 mr-2"/>
          {{ t('orders.downloadInvoice', 'Download Invoice') }}
        </button>
      </div>
    </div>

    <div v-if="!user" class="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900">{{ t('orders.loginRequired', 'Login Required') }}</h3>
      <p class="mt-1 text-gray-500">
        {{ t('orders.loginDescription', 'Please login to view your order details') }}
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
        <p class="mt-1 text-gray-500">{{
            t('orders.errorLoadingDetail', 'There was an error loading your order details')
          }}</p>
        <button
            @click="refetch"
            class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {{ t('orders.tryAgain', 'Try Again') }}
        </button>
      </div>

      <div v-else-if="orderData" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div class="lg:col-span-2 space-y-6">

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <div class="flex items-center">
                  <h2 class="text-lg font-medium text-gray-900 mr-3">
                    {{ t('orders.order', 'Order') }} #{{ orderData.orderCode }}
                  </h2>
                  <button
                      @click="copyToClipboard(orderData.orderCode, 'orderCode')"
                      class="p-1 rounded-md hover:bg-gray-100 transition-colors focus:outline-none"
                      :class="{ 'bg-gray-100': copiedItems.orderCode }"
                      title="Copy order code"
                  >
                    <CheckCheck v-if="copiedItems.orderCode" class="h-4 w-4 text-green-600"/>
                    <Copy v-else class="h-4 w-4 text-gray-600"/>
                  </button>
                </div>
                <p class="text-sm text-gray-500 mt-1">
                  {{ t('orders.placed', 'Placed on') }} {{ formatDate(orderData.createdAt) }}
                </p>
                <p v-if="orderData.updatedAt !== orderData.createdAt" class="text-sm text-gray-500 mt-1">
                  {{ t('orders.updated', 'Last updated') }} {{ formatDate(orderData.updatedAt) }}
                </p>
              </div>

              <div class="mt-4 sm:mt-0">
                <span
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    :class="getStatusClass(orderData.status)"
                >
                  {{ getStatusDisplay(orderData.status) }}
                </span>
              </div>
            </div>

            <div v-if="['PENDING_CONFIRMATION', 'PENDING_SHIPPING', 'SHIPPING', 'DELIVERED'].includes(orderData.status)"
                 class="mt-6 mb-4 pt-6 border-t border-gray-200">
              <div class="px-2 sm:px-4">
                <h4 class="text-sm font-medium text-gray-700 mb-6 text-center">
                  {{ t('orders.orderProgress', 'Order Progress') }}
                </h4>

                <div class="hidden sm:block relative">

                  <div class="absolute top-6 left-0 right-0 h-0.5 bg-gray-200"></div>

                  <div
                    class="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-green-500 to-green-600 transition-all duration-700 ease-in-out"
                    :style="{ width: `${(getCurrentOrderStep / 3) * 100}%` }"
                  ></div>

                  <div class="relative flex justify-between items-start">

                    <div class="flex flex-col items-center group absolute left-0 -translate-x-1/2">
                    <div
                        class="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-500 ease-in-out transform hover:scale-105 mb-3"
                        :class="getCurrentOrderStep >= 0 ?
                          'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200' :
                          'bg-white border-gray-300 text-gray-400'"
                      >
                        <Check v-if="getCurrentOrderStep > 0" class="h-5 w-5 animate-pulse"/>
                        <div v-else-if="getCurrentOrderStep === 0" class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        <span v-else class="text-sm font-semibold">1</span>
                    </div>
                      <div class="text-center max-w-[100px]">
                        <p class="text-xs font-medium leading-tight"
                           :class="getCurrentOrderStep >= 0 ? 'text-green-600' : 'text-gray-500'">
                          {{ t('orders.pendingConfirmation') }}
                        </p>
                        <p v-if="getCurrentOrderStep === 0" class="text-xs text-green-500 mt-1 font-medium">
                          {{ t('orders.current', 'Current') }}
                        </p>
                    </div>
                  </div>

                    <div class="flex flex-col items-center group absolute left-1/3 -translate-x-1/2">
                      <div
                        class="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-500 ease-in-out transform hover:scale-105 mb-3"
                        :class="getCurrentOrderStep >= 1 ?
                          'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200' :
                          'bg-white border-gray-300 text-gray-400'"
                      >
                        <Check v-if="getCurrentOrderStep > 1" class="h-5 w-5 animate-pulse"/>
                        <div v-else-if="getCurrentOrderStep === 1" class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        <span v-else class="text-sm font-semibold">2</span>
                    </div>
                      <div class="text-center max-w-[100px]">
                        <p class="text-xs font-medium leading-tight"
                           :class="getCurrentOrderStep >= 1 ? 'text-green-600' : 'text-gray-500'">
                          {{ t('orders.pendingShipping') }}
                        </p>
                        <p v-if="getCurrentOrderStep === 1" class="text-xs text-green-500 mt-1 font-medium">
                          {{ t('orders.current', 'Current') }}
                        </p>
                    </div>
                  </div>

                    <div class="flex flex-col items-center group absolute left-2/3 -translate-x-1/2">
                      <div
                        class="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-500 ease-in-out transform hover:scale-105 mb-3"
                        :class="getCurrentOrderStep >= 2 ?
                          'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200' :
                          'bg-white border-gray-300 text-gray-400'"
                      >
                        <Check v-if="getCurrentOrderStep > 2" class="h-5 w-5 animate-pulse"/>
                        <div v-else-if="getCurrentOrderStep === 2" class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        <span v-else class="text-sm font-semibold">3</span>
                    </div>
                      <div class="text-center max-w-[100px]">
                        <p class="text-xs font-medium leading-tight"
                           :class="getCurrentOrderStep >= 2 ? 'text-green-600' : 'text-gray-500'">
                          {{ t('orders.shipping') }}
                        </p>
                        <p v-if="getCurrentOrderStep === 2" class="text-xs text-green-500 mt-1 font-medium">
                          {{ t('orders.current', 'Current') }}
                        </p>
                    </div>
                  </div>

                    <div class="flex flex-col items-center group absolute right-0 translate-x-1/2">
                      <div
                        class="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-500 ease-in-out transform hover:scale-105 mb-3"
                        :class="getCurrentOrderStep >= 3 ?
                          'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200' :
                          'bg-white border-gray-300 text-gray-400'"
                      >
                        <Check v-if="getCurrentOrderStep >= 3" class="h-5 w-5"/>
                        <span v-else class="text-sm font-semibold">4</span>
                    </div>
                      <div class="text-center max-w-[100px]">
                        <p class="text-xs font-medium leading-tight"
                           :class="getCurrentOrderStep >= 3 ? 'text-green-600' : 'text-gray-500'">
                          {{ t('orders.delivered') }}
                        </p>
                        <p v-if="getCurrentOrderStep === 3" class="text-xs text-green-500 mt-1 font-medium">
                          {{ t('orders.completed', 'Completed') }}
                        </p>
                  </div>
                </div>

                    <div class="h-20 w-full"></div>
                  </div>
                </div>

                <div class="sm:hidden space-y-4">

                  <div class="flex items-center space-x-3 p-3 rounded-lg"
                       :class="getCurrentOrderStep >= 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'">
                    <div
                      class="flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0"
                      :class="getCurrentOrderStep >= 0 ?
                        'bg-green-500 border-green-500 text-white' :
                        'bg-white border-gray-300 text-gray-400'"
                    >
                      <Check v-if="getCurrentOrderStep > 0" class="h-4 w-4"/>
                      <div v-else-if="getCurrentOrderStep === 0" class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span v-else class="text-xs font-semibold">1</span>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium"
                         :class="getCurrentOrderStep >= 0 ? 'text-green-700' : 'text-gray-600'">
                        {{ t('orders.pendingConfirmation') }}
                      </p>
                      <p v-if="getCurrentOrderStep === 0" class="text-xs text-green-600 font-medium">
                        {{ t('orders.current', 'Current') }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-3 p-3 rounded-lg"
                       :class="getCurrentOrderStep >= 1 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'">
                    <div
                      class="flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0"
                      :class="getCurrentOrderStep >= 1 ?
                        'bg-green-500 border-green-500 text-white' :
                        'bg-white border-gray-300 text-gray-400'"
                    >
                      <Check v-if="getCurrentOrderStep > 1" class="h-4 w-4"/>
                      <div v-else-if="getCurrentOrderStep === 1" class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span v-else class="text-xs font-semibold">2</span>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium"
                         :class="getCurrentOrderStep >= 1 ? 'text-green-700' : 'text-gray-600'">
                        {{ t('orders.pendingShipping') }}
                      </p>
                      <p v-if="getCurrentOrderStep === 1" class="text-xs text-green-600 font-medium">
                        {{ t('orders.current', 'Current') }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-3 p-3 rounded-lg"
                       :class="getCurrentOrderStep >= 2 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'">
                    <div
                      class="flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0"
                      :class="getCurrentOrderStep >= 2 ?
                        'bg-green-500 border-green-500 text-white' :
                        'bg-white border-gray-300 text-gray-400'"
                    >
                      <Check v-if="getCurrentOrderStep > 2" class="h-4 w-4"/>
                      <div v-else-if="getCurrentOrderStep === 2" class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span v-else class="text-xs font-semibold">3</span>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium"
                         :class="getCurrentOrderStep >= 2 ? 'text-green-700' : 'text-gray-600'">
                        {{ t('orders.shipping') }}
                      </p>
                      <p v-if="getCurrentOrderStep === 2" class="text-xs text-green-600 font-medium">
                        {{ t('orders.current', 'Current') }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-3 p-3 rounded-lg"
                       :class="getCurrentOrderStep >= 3 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'">
                    <div
                      class="flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0"
                      :class="getCurrentOrderStep >= 3 ?
                        'bg-green-500 border-green-500 text-white' :
                        'bg-white border-gray-300 text-gray-400'"
                    >
                      <Check v-if="getCurrentOrderStep >= 3" class="h-4 w-4"/>
                      <span v-else class="text-xs font-semibold">4</span>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium"
                         :class="getCurrentOrderStep >= 3 ? 'text-green-700' : 'text-gray-600'">
                        {{ t('orders.delivered') }}
                      </p>
                      <p v-if="getCurrentOrderStep === 3" class="text-xs text-green-600 font-medium">
                        {{ t('orders.completed', 'Completed') }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="mt-6 text-center">
                  <div class="inline-flex items-center px-4 py-2 bg-gray-50 rounded-full">
                    <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span class="text-sm text-gray-600">
                      {{ t('orders.step', 'Step') }} {{ getCurrentOrderStep + 1 }} {{ t('orders.of', 'of') }} 4:
                      <span class="font-medium text-gray-900">{{ getStatusDisplay(orderData.status) }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
                v-if="['UNPAID', 'PENDING_CONFIRMATION', 'DELIVERED'].includes(orderData.status)"
                class="flex flex-wrap gap-3 mt-4 border-t border-gray-200 pt-4"
            >

              <button
                  v-if="orderData.status === 'UNPAID'"
                  @click="payOrder()"
                  class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1"
              >
                {{ t('orders.payNow', 'Pay Now') }}
              </button>

              <Dialog v-if="isEligibleForReturn"
                      v-model:open="dialogOpen"
                      @update:open="(open) => { if (open) initReturnItems(); returnReason = ''; }">
                <DialogTrigger as-child>
                  <button
                      class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-1"
                  >
                    {{ t('orders.requestReturn', 'Request Return') }}
                  </button>
                </DialogTrigger>
                <DialogContent class="sm:max-w-[700px] md:max-w-[800px] max-h-[90vh] overflow-y-auto w-[90vw]">
                  <DialogHeader>
                    <DialogTitle>{{ t('orders.returnRequest', 'Request Return') }}</DialogTitle>
                    <DialogDescription>
                      {{ t('orders.returnDescription', 'Select items you would like to return and provide a reason.') }}
                    </DialogDescription>
                  </DialogHeader>

                  <div class="space-y-2 mt-2">
                    <h4 class="font-medium text-sm">{{ t('orders.selectItems', 'Select items to return') }}</h4>

                    <div class="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
                      <div v-for="item in returnItems" :key="item.orderDetailId"
                           class="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-0">

                        <div class="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                          <img :src="item.thumbnail" :alt="item.productName" class="w-full h-full object-contain">
                        </div>

                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{{ item.productName }}</p>
                          <p class="text-xs text-gray-500">{{ t('orders.unitPrice', 'Unit Price') }}: {{
                              displayCurrency(item.price)
                            }}</p>
                        </div>

                        <div class="flex items-center space-x-2">
                          <button
                              @click="decrementQuantity(item)"
                              class="text-gray-500 hover:text-gray-700 focus:outline-none bg-gray-100 hover:bg-gray-200 rounded-full p-0.5"
                              :disabled="item.quantity <= 0"
                              :class="{'opacity-50': item.quantity <= 0}"
                          >
                            <MinusCircle class="h-4 w-4"/>
                          </button>

                          <span class="text-sm font-medium w-6 text-center">{{ item.quantity }}</span>

                          <button
                              @click="incrementQuantity(item)"
                              class="text-gray-500 hover:text-gray-700 focus:outline-none bg-gray-100 hover:bg-gray-200 rounded-full p-0.5"
                              :disabled="item.quantity >= item.maxQuantity"
                              :class="{'opacity-50': item.quantity >= item.maxQuantity}"
                          >
                            <PlusCircle class="h-4 w-4"/>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div v-if="totalReturnQuantity > 0" class="py-3 border-t border-gray-200 space-y-2">
                      <div class="flex justify-between text-sm">
                        <span>{{ t('orders.totalReturnItems', 'Total Items') }}</span>
                        <span>{{ totalReturnQuantity }}</span>
                      </div>
                      <div class="flex justify-between text-sm font-medium">
                        <span>{{ t('orders.totalRefundAmount', 'Total Refund Amount') }}</span>
                        <span>{{ displayCurrencyWithVND(totalReturnAmount) }}</span>
                      </div>
                    </div>

                    <div class="space-y-2 pt-4">
                      <label for="return-reason" class="block text-sm font-medium text-gray-700">
                        {{ t('orders.returnReason', 'Reason for Return') }} <span class="text-red-500">*</span>
                      </label>
                      <textarea
                          id="return-reason"
                          v-model="returnReason"
                          rows="4"
                          class="w-full rounded-md border border-gray-300 shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          :placeholder="t('orders.returnReasonPlaceholder', 'Please explain why you are returning these items...')"
                      ></textarea>
                      <p class="text-xs text-gray-500">
                        {{
                          t('orders.returnNoteLength', 'Please provide a detailed explanation (min. 10 characters).')
                        }}</p>
                    </div>
                  </div>

                  <DialogFooter class="flex flex-col justify-end mt-6">
                    <div class="flex gap-4 mt-4">

                      <button
                          type="button"
                          @click="dialogOpen = false"
                          class="px-4 py-2 text-sm rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-200 w-1/3 border border-gray-300">
                        {{ t('common.cancel', 'Cancel') }}
                      </button>

                      <button
                          type="button"
                          @click="submitReturnRequest"
                          :disabled="returnMutation.isPending.value || totalReturnQuantity === 0 || returnReason.length < 10"
                          :class="{'opacity-50': returnMutation.isPending.value || totalReturnQuantity === 0 || returnReason.length < 10,
                                  'shadow-md transform hover:scale-[1.01] transition-all': totalReturnQuantity > 0 && returnReason.length >= 10}"
                          class="px-4 py-2 text-sm rounded-md font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 w-2/3 flex items-center justify-center space-x-2 border border-green-500"
                      >
                        <span v-if="returnMutation.isPending.value">
                          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                               fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ t('common.processing', 'Processing...') }}
                        </span>
                        <span v-else class="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none"
                               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 5l0 14M5 12l14 0"></path>
                          </svg>
                          {{ t('orders.submitReturn', 'Submit Return Request') }}
                        </span>
                      </button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div v-if="['UNPAID', 'PENDING_CONFIRMATION'].includes(orderData.status)">

                <Dialog
                    v-if="orderData.status === 'PENDING_CONFIRMATION' && orderData.paymentMethod === 'BANK_TRANSFER'">
                  <DialogTrigger as-child>
                    <button
                        class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1"
                    >
                      {{ t('orders.cancelOrder', 'Cancel Order') }}
                    </button>
                  </DialogTrigger>
                  <DialogContent class="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>{{ t('orders.refundInformation', 'Refund Information') }}</DialogTitle>
                      <DialogDescription>
                        {{ t('orders.refundDescription', 'Please provide your banking information for the refund.') }}
                      </DialogDescription>
                    </DialogHeader>

                    <div class="grid gap-4 py-4">
                      <div class="grid grid-cols-4 items-center gap-4">
                        <label for="bank-name" class="text-right text-sm font-medium">
                          {{ t('orders.bankName', 'Bank Name') }} <span class="text-red-500">*</span>
                        </label>
                        <input
                            id="bank-name"
                            v-model="refundInfo.bankName"
                            class="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Enter your bank name"
                        />
                      </div>

                      <div class="grid grid-cols-4 items-center gap-4">
                        <label for="account-number" class="text-right text-sm font-medium">
                          {{ t('orders.accountNumber', 'Account Number') }} <span class="text-red-500">*</span>
                        </label>
                        <input
                            id="account-number"
                            v-model="refundInfo.accountNumber"
                            class="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Enter your account number"
                        />
                      </div>

                      <div class="grid grid-cols-4 items-center gap-4">
                        <label class="text-right text-sm font-medium">
                          {{ t('orders.refundAmount', 'Refund Amount') }}
                        </label>
                        <div class="col-span-3 flex h-10 items-center">
                          <span class="font-medium">{{ displayCurrencyWithVND(calculateRefundAmount) }}</span>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <button
                          type="button"
                          class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 mr-2"
                          @click="$event.target.closest('dialog').close()"
                      >
                        {{ t('common.cancel', 'Cancel') }}
                      </button>
                      <button
                          type="button"
                          @click="submitRefundInfo"
                          :disabled="cancelWithRefund.isPending.value"
                          class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                      >
                        <span v-if="cancelWithRefund.isPending.value">
                          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                               fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ t('common.processing', 'Processing...') }}
                        </span>
                        <span v-else>{{ t('orders.submitRefundInfo', 'Submit Refund Information') }}</span>
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog v-else>
                  <AlertDialogTrigger as-child>
                    <button
                        class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1"
                    >
                      {{ t('orders.cancelOrder', 'Cancel Order') }}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{{ t('orders.confirmCancel', 'Confirm Order Cancellation') }}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {{
                          t('orders.cancelConfirmText', 'Are you sure you want to cancel this order? This action cannot be undone.')
                        }}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{{ t('common.cancel', 'Cancel') }}</AlertDialogCancel>
                      <AlertDialogAction
                          @click="cancelMutation.mutate()"
                          :disabled="cancelMutation.isPending.value"
                          class="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                      >
                        {{
                          cancelMutation.isPending.value ?
                              t('common.processing', 'Processing...') :
                              t('orders.confirmCancellation', 'Confirm Cancellation')
                        }}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          <div v-if="orderData.status === 'CANCELLED' && orderData.cancelReason"
               class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="font-medium text-gray-900">{{ t('orders.cancellationDetails', 'Cancellation Details') }}</h3>
            </div>
            <div class="p-6">
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-1">{{
                    t('orders.cancelReason', 'Cancellation Reason')
                  }}</h4>
                <p class="text-sm bg-red-50 p-3 rounded-md border border-red-200">{{ orderData.cancelReason }}</p>
              </div>
            </div>
          </div>

          <div v-if="orderData.status === 'REJECTED_RETURN' && orderData.rejectReturnReason"
               class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="font-medium text-gray-900">{{ t('orders.returnRejectionDetails', 'Return Rejection Details') }}</h3>
            </div>
            <div class="p-6">
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-1">{{
                    t('orders.rejectReturnReason', 'Return Rejection Reason')
                  }}</h4>
                <p class="text-sm bg-red-50 p-3 rounded-md border border-red-200">{{ orderData.rejectReturnReason }}</p>
              </div>
            </div>
          </div>

          <div v-if="isPendingReturn && returnData && returnData.result"
               class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="font-medium text-gray-900">{{ t('orders.returnDetails', 'Return Details') }}</h3>
            </div>

            <div class="p-6">

              <div class="mb-4">
                <h4 class="text-sm font-medium text-gray-700 mb-1">{{
                    t('orders.returnReason', 'Reason for Return')
                  }}</h4>
                <p class="text-sm bg-gray-50 p-3 rounded-md">{{ returnData.result.reason }}</p>
              </div>

              <div class="mb-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">{{
                    t('orders.returnedItems', 'Returned Items')
                  }}</h4>
                <div class="border border-gray-200 rounded-md divide-y divide-gray-200">
                  <div v-for="returnItem in returnData.result.returnDetails" :key="returnItem.id" class="p-3">

                    <div v-for="orderItem in orderData.orderDetails" :key="orderItem.id">
                      <div v-if="orderItem.productId === returnItem.productId" class="flex items-center">
                        <div class="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-md overflow-hidden mr-3">
                          <img :src="orderItem.productThumbnail" :alt="orderItem.productName"
                               class="w-full h-full object-contain">
                        </div>
                        <div class="flex-1">
                          <p class="text-sm font-medium text-gray-900">{{ orderItem.productName }}</p>
                          <div class="flex justify-between mt-1">
                            <p class="text-xs text-gray-500">
                              {{ t('orders.returnQuantity', 'Return Quantity') }}: {{ returnItem.returnQuantity }}
                            </p>
                            <p class="text-xs font-medium">
                              {{ displayCurrencyWithVND(orderItem.priceAtPurchase * returnItem.returnQuantity) }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex justify-between pt-3 border-t border-gray-200">
                <span class="text-sm font-medium text-gray-700">{{
                    t('orders.totalReturnAmount', 'Total Refund Amount')
                  }}</span>
                <span class="text-sm font-bold text-gray-900">{{
                    displayCurrencyWithVND(returnData.result.totalReturnAmount)
                  }}</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="font-medium text-gray-900">{{ t('orders.items', 'Order Items') }}</h3>
            </div>

            <div class="divide-y divide-gray-200">
              <div v-for="item in orderData.orderDetails" :key="item.id" class="p-6 flex flex-col sm:flex-row">
                <div class="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-md overflow-hidden">
                  <img
                      :src="item.productThumbnail"
                      :alt="item.productName"
                      class="w-full h-full object-contain"
                  />
                </div>
                <div class="flex-1 sm:ml-6 mt-4 sm:mt-0">
                  <div class="flex flex-col sm:flex-row sm:justify-between">
                    <div>
                      <h4 class="text-base font-medium text-gray-900">{{ item.productName }}</h4>
                      <p class="mt-1 text-sm text-gray-500">{{ item.productCategoryName }}</p>
                      <p class="mt-1 text-sm text-gray-500">{{ t('orders.quantity', 'Quantity') }}: {{
                          item.quantity
                        }}</p>

                      <div
                          v-if="['DELIVERED', 'RETURNED', 'REJECTED_RETURN'].includes(orderData.status) && item.isRated === false"
                          class="mt-2">
                        <router-link
                            :to="{
                              name: 'product',
                              params: {
                                categorySlug: getSlug(item.productCategoryName || 'category'),
                                productSlug: getSlug(item.productName || 'product'),
                                productId: item.productId
                              }
                            }"
                            class="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                               stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                          </svg>
                          {{ t('product.rateThisProduct', 'Rate this product') }}
                        </router-link>
                      </div>
                    </div>
                    <div class="mt-4 sm:mt-0 text-right">
                      <p class="text-base font-medium text-gray-900">
                        {{ displayCurrencyWithVND(item.priceAtPurchase * item.quantity) }}
                      </p>
                      <p class="mt-1 text-sm text-gray-500">
                        {{ displayCurrencyWithVND(item.priceAtPurchase) }} × {{ item.quantity }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 class="font-medium text-gray-900 mb-4">{{ t('orders.paymentSummary', 'Payment Summary') }}</h3>

            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600">{{ t('orders.subtotal', 'Subtotal') }}</span>
                <span class="font-medium">{{ displayCurrencyWithVND(orderData.subtotal) }}</span>
              </div>

              <div class="flex justify-between">
                <span class="text-gray-600">{{ t('orders.shippingFee', 'Shipping') }}</span>
                <span class="font-medium">{{ displayCurrencyWithVND(orderData.shippingFee) }}</span>
              </div>

              <div v-if="orderData.discountAmount > 0" class="flex justify-between text-green-600">
                <span>{{ t('orders.discount', 'Discount') }}
                  <span v-if="orderData.voucherCode" class="text-xs ml-1">({{ orderData.voucherCode }})</span>
                </span>
                <span class="font-medium">-{{ displayCurrencyWithVND(orderData.discountAmount) }}</span>
              </div>

              <div class="flex justify-between pt-3 border-t border-gray-100 text-lg font-medium">
                <span>{{ t('orders.total', 'Total') }}</span>
                <span>{{ displayCurrencyWithVND(orderData.totalAmount) }}</span>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-gray-200">
              <h4 class="font-medium text-gray-900 mb-2">{{ t('orders.paymentMethod', 'Payment Method') }}</h4>
              <p class="text-gray-600">
                {{
                  orderData.paymentMethod === 'CASH_ON_DELIVERY'
                      ? t('checkout.cod', 'Cash on Delivery')
                      : t('checkout.bankTransfer', 'Bank Transfer')
                }}
              </p>

              <div v-if="orderData.paymentMethod === 'BANK_TRANSFER' && orderData.status !== 'CANCELLED'" class="mt-2">
                <p class="text-sm" :class="orderData.status === 'UNPAID' ? 'text-yellow-600' : 'text-green-600'">
                  {{
                    orderData.status === 'UNPAID'
                        ? t('orders.paymentPending', 'Payment Pending')
                        : t('orders.paymentComplete', 'Payment Complete')
                  }}
                </p>
              </div>
            </div>

            <div v-if="refundData && refundData.result" class="mt-6 pt-4 border-t border-gray-200">
              <h4 class="font-medium text-gray-900 mb-2">{{ t('orders.refundInformation', 'Refund Information') }}</h4>

              <div class="space-y-3">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ t('orders.bankName', 'Bank Name') }}</span>
                  <span class="font-medium">{{ refundData.result.bankName }}</span>
                </div>

                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ t('orders.accountNumber', 'Account Number') }}</span>
                  <span class="font-medium">{{ refundData.result.accountNumber }}</span>
                </div>

                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ t('orders.refundAmount', 'Refund Amount') }}</span>
                  <span class="font-medium">{{ displayCurrencyWithVND(refundData.result.refundAmount) }}</span>
                </div>

                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ t('orders.status', 'Status') }}</span>
                  <span
                      class="font-medium px-2 py-0.5 rounded-full text-xs"
                      :class="refundData.result.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'"
                  >
                    {{
                      refundData.result.status === 'PENDING'
                          ? t('orders.refundPending', 'Pending')
                          : t('orders.refunded', 'Refunded')
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 class="font-medium text-gray-900 mb-4">{{ t('orders.shippingInfo', 'Shipping Information') }}</h3>

            <div class="space-y-3">
              <div>
                <h4 class="text-sm font-medium text-gray-900">{{ t('orders.recipient', 'Recipient') }}</h4>
                <p class="mt-1 text-gray-600">{{ orderData.recipientName }}</p>
              </div>

              <div>
                <h4 class="text-sm font-medium text-gray-900">{{ t('orders.phoneNumber', 'Phone Number') }}</h4>
                <p class="mt-1 text-gray-600">{{ orderData.phoneNumber }}</p>
              </div>

              <div>
                <h4 class="text-sm font-medium text-gray-900">{{ t('orders.address', 'Address') }}</h4>
                <p class="mt-1 text-gray-600 break-words">{{ orderData.shippingAddress }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  body * {
    visibility: hidden;
  }

  .print\:p-4, .print\:p-4 * {
    visibility: visible;
  }

  .print\:hidden {
    display: none !important;
  }
}
</style>

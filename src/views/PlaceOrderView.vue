<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useRouter} from 'vue-router';
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import axios from "axios";
import {displayCurrency} from "@/utils/localeUtil.js";
import {userData} from "@/utils/authUtil.js";
import {accountModalStore} from "@/stores/accountModalStore.js";
import {toast} from "vue-sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import locationData from '@/assets/location.json';

const {t} = useI18n();
const router = useRouter();
const queryClient = useQueryClient();
const user = userData.user;

document.title = t('checkout.title', 'Checkout');

if (!user) {
  accountModalStore.openLoginModal();
  toast.info(t('checkout.loginRequired', 'Please login to proceed with checkout'));
}

const {data: cartData, isPending, isError} = useQuery({
  queryKey: ['cart'],
  queryFn: async () => {
    const {data} = await axios.get('/carts');
    return data;
  },
  enabled: !!user
});

const cartItems = computed(() => cartData.value?.result || []);
const isEmpty = computed(() => cartItems.value.length === 0);

const provinces = ref([]);
const districts = ref([]);
const wards = ref([]);

const addressInfo = ref({
  recipientName: user?.fullName || '',
  phoneNumber: user?.phoneNumber || '',
  provinceCode: '',
  districtCode: '',
  wardCode: '',
  specificAddress: '',
  provinceName: '',
  districtName: '',
  wardName: ''
});

const selectedProvince = computed(() =>
    addressInfo.value.provinceCode ? provinces.value.find(p => p.code === addressInfo.value.provinceCode) : null
);

const availableDistricts = computed(() =>
    selectedProvince.value ? districts.value.filter(d => d.province_code === selectedProvince.value.code) : []
);

const selectedDistrict = computed(() =>
    addressInfo.value.districtCode ? districts.value.find(d => d.code === addressInfo.value.districtCode) : null
);

const availableWards = computed(() =>
    selectedDistrict.value ? wards.value.filter(w => w.district_code === selectedDistrict.value.code) : []
);

onMounted(() => {

  provinces.value = locationData.map((province, index) => ({
    code: index.toString(),
    name: province.name
  }));
});

watch(() => addressInfo.value.provinceCode, (newProvinceCode) => {
  if (newProvinceCode) {
    addressInfo.value.districtCode = '';
    addressInfo.value.wardCode = '';
    addressInfo.value.provinceName = provinces.value.find(p => p.code === newProvinceCode)?.name || '';

    const provinceIndex = parseInt(newProvinceCode);
    if (provinceIndex >= 0 && provinceIndex < locationData.length) {
      const provinceData = locationData[provinceIndex];
      districts.value = provinceData.districts.map((district, index) => ({
        code: `${provinceIndex}_${index}`,
        name: district.name,
        province_code: newProvinceCode
      }));
    }
  } else {
    districts.value = [];
    wards.value = [];
    addressInfo.value.districtCode = '';
    addressInfo.value.wardCode = '';
    addressInfo.value.provinceName = '';
    addressInfo.value.districtName = '';
    addressInfo.value.wardName = '';
  }
});

watch(() => addressInfo.value.districtCode, (newDistrictCode) => {
  if (newDistrictCode) {
    addressInfo.value.wardCode = '';
    addressInfo.value.districtName = districts.value.find(d => d.code === newDistrictCode)?.name || '';

    const [provinceIndex, districtIndex] = newDistrictCode.split('_').map(Number);
    if (
        provinceIndex >= 0 &&
        provinceIndex < locationData.length &&
        districtIndex >= 0 &&
        districtIndex < locationData[provinceIndex].districts.length
    ) {
      const districtData = locationData[provinceIndex].districts[districtIndex];
      wards.value = districtData.wards.map((ward, index) => ({
        code: `${provinceIndex}_${districtIndex}_${index}`,
        name: ward.name,
        district_code: newDistrictCode
      }));
    }
  } else {
    wards.value = [];
    addressInfo.value.wardCode = '';
    addressInfo.value.districtName = '';
    addressInfo.value.wardName = '';
  }
});

watch(() => addressInfo.value.wardCode, (newWardCode) => {
  if (newWardCode) {
    addressInfo.value.wardName = wards.value.find(w => w.code === newWardCode)?.name || '';
  } else {
    addressInfo.value.wardName = '';
  }
});

const paymentMethods = ref([
  {
    id: 'CASH_ON_DELIVERY',
    name: t('checkout.cod', 'Cash on Delivery'),
    selected: true,
    description: t('checkout.codDescription', 'Pay when you receive your order'),
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>`
  },
  {
    id: 'BANK_TRANSFER',
    name: t('checkout.bankTransfer', 'Bank Transfer'),
    selected: false,
    description: t('checkout.bankTransferDescription', 'Make payment via bank transfer'),
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>`
  }
]);

const selectedPaymentMethod = ref('CASH_ON_DELIVERY');

const selectPaymentMethod = (methodId) => {
  selectedPaymentMethod.value = methodId;
  paymentMethods.value.forEach(method => {
    method.selected = method.id === methodId;
  });
};

const {data: voucherData, isPending: isVoucherPending, isError: isVoucherError} = useQuery({
  queryKey: ['vouchers'],
  queryFn: async () => {
    const {data} = await axios.get('/vouchers');
    return data;
  },
  enabled: !!user
});

const availableVouchers = computed(() => {
  if (!voucherData.value?.success || !voucherData.value?.result) return [];

  const now = new Date();

  return voucherData.value.result.filter(voucher => {
    const startDate = new Date(voucher.startDate);
    const endDate = new Date(voucher.endDate);

    return (
        voucher.status === true &&
        voucher.used < voucher.quantity &&
        now >= startDate &&
        now <= endDate
    );
  });
});

const selectedVoucherCode = ref(null);
const selectedVoucher = computed(() => {
  if (!selectedVoucherCode.value || !voucherData.value?.result) return null;
  return voucherData.value.result.find(v => v.code === selectedVoucherCode.value);
});
const dialogOpen = ref(false);

const isVoucherValid = (voucher) => {
  if (!voucher) return false;

  const orderTotal = subtotal.value + shippingFee.value;

  if (voucher.minOrderAmount && orderTotal < voucher.minOrderAmount) {
    return false;
  }

  if (voucher.maxOrderAmount && orderTotal > voucher.maxOrderAmount) {
    return false;
  }

  return true;
};

const calculateVoucherDiscount = (voucher, baseAmount) => {
  if (!voucher) return 0;

  let discountAmount = 0;

  if (voucher.discountType === 'PERCENTAGE') {

    discountAmount = baseAmount * (voucher.discountAmount / 100);

    if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
      discountAmount = voucher.maxDiscountAmount;
    }
  } else if (voucher.discountType === 'FIXED') {

    discountAmount = voucher.discountAmount;
  }

  return Math.min(discountAmount, baseAmount);
};

const totalBeforeDiscount = computed(() => {
  return subtotal.value + shippingFee.value;
});

const discountAmount = computed(() => {
  if (!selectedVoucher.value) return 0;

  if (!isVoucherValid(selectedVoucher.value)) {
    return 0;
  }

  return calculateVoucherDiscount(selectedVoucher.value, totalBeforeDiscount.value);
});

const formatVoucherDiscount = (voucher) => {
  if (!voucher) return '';

  if (voucher.discountType === 'PERCENTAGE') {
    return `${voucher.discountAmount}%`;
  } else {
    return displayCurrency(voucher.discountAmount);
  }
};

const getVoucherRequirement = (voucher) => {
  if (!voucher) return '';

  const requirements = [];

  if (voucher.minOrderAmount) {
    requirements.push(`${t('checkout.minOrder')} ${displayCurrency(voucher.minOrderAmount)}`);
  }

  if (voucher.maxDiscountAmount && voucher.discountType === 'PERCENTAGE') {
    requirements.push(`${t('checkout.maxDiscount')} ${displayCurrency(voucher.maxDiscountAmount)}`);
  }

  return requirements.join(' • ');
};

const applyVoucher = (voucher) => {
  if (!isVoucherValid(voucher)) {
    toast.error(t('checkout.voucherInvalid', 'This voucher cannot be applied to your order'));
    return;
  }

  selectedVoucherCode.value = voucher.code;
  dialogOpen.value = false;
  toast.success(t('checkout.voucherApplied', 'Voucher successfully applied'));
};

const removeVoucher = () => {
  selectedVoucherCode.value = null;
  toast.info(t('checkout.voucherRemoved', 'Voucher removed'));
};

const subtotal = computed(() => {
  return cartItems.value.reduce((total, item) => {
    return total + (item.productPromotionPrice * item.quantity);
  }, 0);
});

const shippingFee = computed(() => {

  if (addressInfo.value.provinceCode === '0') {
    return 3000;
  }
  return 5000;
});

const finalTotal = computed(() => {
  const total = subtotal.value + shippingFee.value - discountAmount.value;

  return Math.max(0, total);
});

const backToCart = () => {
  router.push('/cart');
};

const getFullAddress = computed(() => {
  if (!addressInfo.value.specificAddress) return '';

  const parts = [
    addressInfo.value.specificAddress,
    addressInfo.value.wardName,
    addressInfo.value.districtName,
    addressInfo.value.provinceName
  ].filter(Boolean);

  return parts.join(', ');
});

const shippingAddress = computed(() => {
  const parts = [
    addressInfo.value.specificAddress || '',
    addressInfo.value.wardName || '',
    addressInfo.value.districtName || '',
    addressInfo.value.provinceName || ''
  ].filter(Boolean);

  return parts.join(', ');
});

const getOrderStatus = (paymentMethodId, total) => {
  if (total === 0) {
    return 'PENDING_CONFIRMATION';
  }

  switch (paymentMethodId) {
    case 'CASH_ON_DELIVERY':
      return 'PENDING_CONFIRMATION';
    case 'BANK_TRANSFER':
      return 'UNPAID';
    default:
      return 'UNPAID';
  }
};

const placeOrderMutation = useMutation({
  mutationFn: async (orderInfo) => {
    const response = await axios.post('/orders', orderInfo);
    return response.data;
  },
  onSuccess: (data) => {
    if (data.result.paymentMethod === 'BANK_TRANSFER' && data.result.status === 'UNPAID') {
      toast.success(t('checkout.orderSuccess', 'Order placed successfully!') + ' ' +
          t('checkout.statusUnpaid', 'Please complete the payment to process your order.') + ' ' +
          t('checkout.redirectToPayment', 'You will be redirected to the payment page.'));
      router.push(`/payment/${data.result.id}`);
    } else {
      toast.success(t('checkout.orderSuccess', 'Order placed successfully!') + ' ' +
          t('checkout.redirectToOrderDetail', 'You will be redirected to your order details.'));
      router.push(`/orders/${data.result.id}`);
    }
  }
})

const showConfirmDialog = ref(false);

const placeOrder = () => {

  if (!validateAddressInfo()) {
    return;
  }

  const selectedPaymentMethod = paymentMethods.value.find(method => method.selected);
  if (!selectedPaymentMethod) {
    toast.error(t('checkout.selectPaymentMethod', 'Please select a payment method'));
    return;
  }

  showConfirmDialog.value = true;
};

const confirmPlaceOrder = () => {
  const selectedPaymentMethod = paymentMethods.value.find(method => method.selected);
  const orderStatus = getOrderStatus(selectedPaymentMethod.id, finalTotal.value);

  const orderData = {
    voucherId: selectedVoucher.value?.id || null,
    subtotal: subtotal.value,
    type: 'ONLINE',
    totalAmount: finalTotal.value,
    shippingFee: shippingFee.value,
    discountAmount: discountAmount.value,
    status: orderStatus,
    paymentMethod: selectedPaymentMethod.id,
    recipientName: addressInfo.value.recipientName,
    phoneNumber: addressInfo.value.phoneNumber,
    shippingAddress: shippingAddress.value,
    orderDetails: cartItems.value.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: item.productPromotionPrice
    }))
  };

  placeOrderMutation.mutate(orderData);
};

const validateAddressInfo = () => {
  if (!addressInfo.value.recipientName) {
    toast.error(t('validation.recipientNameRequired', 'Please enter recipient name'));
    return false;
  }

  if (!addressInfo.value.phoneNumber) {
    toast.error(t('validation.phoneNumberRequired', 'Please enter phone number'));
    return false;
  }

  if (!addressInfo.value.provinceCode) {
    toast.error(t('validation.provinceRequired', 'Please select a province/city'));
    return false;
  }

  if (!addressInfo.value.districtCode) {
    toast.error(t('validation.districtRequired', 'Please select a district'));
    return false;
  }

  if (!addressInfo.value.wardCode) {
    toast.error(t('validation.wardRequired', 'Please select a ward'));
    return false;
  }

  if (!addressInfo.value.specificAddress) {
    toast.error(t('validation.specificAddressRequired', 'Please enter a specific address'));
    return false;
  }

  return true;
};
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('checkout.title', 'Checkout') }}</h1>
      <p class="text-gray-600 mt-1">
        {{ t('checkout.steps', 'Complete your order by providing your shipping and payment details') }}
      </p>
    </div>

    <button
        @click="backToCart"
        class="mb-6 flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
      </svg>
      {{ t('checkout.backToCart', 'Back to Cart') }}
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">
            {{ t('checkout.shippingInformation', 'Shipping Information') }}
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label for="recipientName" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('checkout.recipientName', 'Recipient Name') }} *
              </label>
              <input
                  type="text"
                  id="recipientName"
                  v-model="addressInfo.recipientName"
                  class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label for="phoneNumber" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('checkout.phoneNumber', 'Phone Number') }} *
              </label>
              <input
                  type="tel"
                  id="phoneNumber"
                  v-model="addressInfo.phoneNumber"
                  class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label for="province" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('checkout.province', 'Province/City') }} *
              </label>
              <select
                  id="province"
                  v-model="addressInfo.provinceCode"
                  class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">{{ t('checkout.selectProvince', 'Select Province/City') }}</option>
                <option
                    v-for="province in provinces"
                    :key="province.code"
                    :value="province.code"
                >
                  {{ province.name }}
                </option>
              </select>
            </div>
            <div>
              <label for="district" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('checkout.district', 'District') }} *
              </label>
              <select
                  id="district"
                  v-model="addressInfo.districtCode"
                  class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  :disabled="!addressInfo.provinceCode"
              >
                <option value="">{{ t('checkout.selectDistrict', 'Select District') }}</option>
                <option
                    v-for="district in availableDistricts"
                    :key="district.code"
                    :value="district.code"
                >
                  {{ district.name }}
                </option>
              </select>
            </div>
            <div>
              <label for="ward" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('checkout.ward', 'Ward/Commune') }} *
              </label>
              <select
                  id="ward"
                  v-model="addressInfo.wardCode"
                  class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  :disabled="!addressInfo.districtCode"
              >
                <option value="">{{ t('checkout.selectWard', 'Select Ward/Commune') }}</option>
                <option
                    v-for="ward in availableWards"
                    :key="ward.code"
                    :value="ward.code"
                >
                  {{ ward.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="mb-4">
            <label for="specificAddress" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('checkout.specificAddress', 'Specific Address') }} *
            </label>
            <input
                type="text"
                id="specificAddress"
                v-model="addressInfo.specificAddress"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div v-if="getFullAddress" class="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <p class="text-sm text-gray-700 font-medium mb-1">{{
                t('checkout.deliveryAddress', 'Delivery Address:')
              }}</p>
            <p class="text-sm text-gray-900">{{ getFullAddress }}</p>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">
            {{ t('checkout.paymentMethod', 'Payment Method') }}
          </h2>

          <div class="space-y-4">
            <div
                v-for="method in paymentMethods"
                :key="method.id"
                class="border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md"
                :class="{
                'border-primary-500 bg-primary-50 ring-2 ring-primary-200': method.selected,
                'border-gray-200 hover:border-gray-300': !method.selected
              }"
                @click="selectPaymentMethod(method.id)"
            >
              <div class="flex items-start">
                <div class="mr-4 text-primary-600" v-html="method.icon"></div>
                <div class="flex-1">
                  <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-900">{{ method.name }}</span>
                    <div v-if="method.selected"
                         class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                      {{ t('checkout.selected', 'Selected') }}
                    </div>
                  </div>
                  <p class="mt-1 text-sm text-gray-500">{{ method.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium text-gray-900">
              {{ t('checkout.vouchers', 'Vouchers') }}
            </h2>

            <Dialog v-model:open="dialogOpen">
              <DialogTrigger as-child>
                <button
                    class="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-600 rounded-md hover:bg-primary-50"
                >
                  {{ t('checkout.chooseVoucher', 'Choose Voucher') }}
                </button>
              </DialogTrigger>
              <DialogContent class="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{{ t('checkout.availableVouchers', 'Available Vouchers') }}</DialogTitle>
                  <DialogDescription>
                    {{ t('checkout.selectOneVoucher', 'Select one voucher to apply to your order') }}
                  </DialogDescription>
                </DialogHeader>

                <div class="space-y-3 mt-4 max-h-[60vh] overflow-y-auto">
                  <div
                      v-for="voucher in availableVouchers"
                      :key="voucher.id"
                      class="border rounded-md p-4 cursor-pointer flex items-center justify-between"
                      :class="{
                        'border-primary-500 bg-primary-50': selectedVoucherCode && selectedVoucherCode === voucher.code,
                        'border-gray-200 hover:border-primary-300': !selectedVoucherCode || selectedVoucherCode !== voucher.code
                      }"
                      @click="applyVoucher(voucher)"
                  >
                    <div class="flex items-center">
                      <div class="h-5 w-5 mr-3 flex items-center justify-center border rounded-full"
                           :class="{
                             'border-primary-500': selectedVoucherCode && selectedVoucherCode === voucher.code,
                             'border-gray-300': !selectedVoucherCode || selectedVoucherCode !== voucher.code
                           }">
                        <div v-if="selectedVoucherCode && selectedVoucherCode === voucher.code"
                             class="h-3 w-3 rounded-full bg-primary-500"></div>
                      </div>
                      <div>
                        <span class="text-sm font-medium text-gray-900">{{ voucher.code }}</span>
                        <p class="text-xs text-gray-500">
                          {{ voucher.discountType === 'PERCENTAGE' ? 'Percentage discount' : 'Fixed discount' }}
                          {{ getVoucherRequirement(voucher) ? ' • ' + getVoucherRequirement(voucher) : '' }}
                        </p>
                      </div>
                    </div>
                    <div class="text-sm font-medium text-green-600">
                      -{{ formatVoucherDiscount(voucher) }}
                    </div>
                  </div>
                </div>

                <DialogFooter class="flex justify-end gap-2 mt-4">
                  <button
                      @click="dialogOpen = false"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {{ t('checkout.cancel', 'Cancel') }}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div v-if="selectedVoucher"
               class="flex items-center justify-between border rounded-md p-3 bg-primary-50 border-primary-500">
            <div class="flex items-center">
              <div class="mr-3 p-1 bg-primary-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" viewBox="0 0 20 20"
                     fill="currentColor">
                  <path fill-rule="evenodd"
                        d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 4.707a1 1 0 00-1.414-1.414L6 7.586l-.293-.293a1 1 0 00-1.414 1.414l1 1a1 1 0 001.414 0l3-3z"
                        clip-rule="evenodd"/>
                </svg>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-900">{{ selectedVoucher.code }}</span>
                <p class="text-xs text-gray-600">{{ getVoucherRequirement(selectedVoucher) }}</p>
              </div>
            </div>
            <div class="flex items-center">
              <div class="text-sm font-medium text-green-600 mr-3">
                -{{ displayCurrency(discountAmount) }}
              </div>
              <button @click="removeVoucher" class="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-else
               class="border rounded-md p-4 border-dashed border-gray-300 flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"/>
            </svg>
            <p class="text-sm text-gray-500">{{ t('checkout.noVoucherSelected', 'No voucher selected') }}</p>
            <button
                @click="dialogOpen = true"
                class="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {{ t('checkout.chooseVoucher', 'Choose a voucher') }}
            </button>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">{{ t('checkout.orderSummary', 'Order Summary') }}</h2>

          <div v-if="isPending" class="py-8 flex justify-center items-center">
            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>

          <div v-else-if="isError" class="py-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-red-500 mb-2" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <p class="text-sm text-gray-500">{{ t('cart.errorLoading', 'There was an error loading your cart') }}</p>
            <button
                @click="queryClient.invalidateQueries(['cart'])"
                class="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              {{ t('cart.tryAgain', 'Try Again') }}
            </button>
          </div>

          <div v-else-if="isEmpty" class="py-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-gray-400 mb-2" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <p class="text-sm text-gray-500">{{ t('cart.empty', 'Your cart is empty') }}</p>
            <button
                @click="router.push('/')"
                class="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              {{ t('cart.addItems', 'Add items to cart') }}
            </button>
          </div>

          <div v-else>
            <div class="mb-4">
              <h3 class="text-sm font-medium text-gray-900 mb-2">{{ t('checkout.items', 'Items') }}</h3>
              <div class="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                <div v-for="item in cartItems" :key="item.id" class="flex items-start">
                  <div class="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                    <img
                        :src="item.productThumbnail"
                        :alt="item.productName"
                        class="w-full h-full object-contain"
                    />
                  </div>
                  <div class="ml-3 flex-1">
                    <p class="text-sm font-medium text-gray-900 truncate" :title="item.productName">{{
                        item.productName
                      }}</p>
                    <p class="text-xs text-gray-500">{{ t('checkout.quantity', 'Qty') }}: {{ item.quantity }}</p>
                  </div>
                  <div class="text-sm font-medium text-gray-900 ml-2">
                    {{ displayCurrency(item.productPromotionPrice * item.quantity) }}
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-gray-200 pt-4 mt-4">
              <dl class="space-y-3">
                <div class="flex items-center justify-between">
                  <dt class="text-sm text-gray-600">{{ t('checkout.subtotal', 'Subtotal') }}</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ displayCurrency(subtotal) }}</dd>
                </div>

                <div class="flex items-center justify-between">
                  <dt class="text-sm text-gray-600">{{ t('checkout.shipping', 'Shipping') }}</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ displayCurrency(shippingFee) }}</dd>
                </div>

                <div class="text-xs text-gray-500 italic ml-1 -mt-1 mb-2">
                  <span v-if="addressInfo.provinceCode === '0'">
                    {{ t('checkout.shippingExplanationHanoi', 'Reduced shipping fee for Hà Nội') }}
                  </span>
                  <span v-else-if="addressInfo.provinceCode">
                    {{ t('checkout.shippingExplanationOther', 'Standard shipping fee for other provinces') }}
                  </span>
                  <span v-else>
                    {{ t('checkout.shippingExplanationSelect', 'Select a province to see shipping cost') }}
                  </span>
                </div>

                <div v-if="selectedVoucher" class="flex items-center justify-between">
                  <dt class="text-sm text-green-600">{{ t('checkout.discount', 'Discount') }}</dt>
                  <dd class="text-sm font-medium text-green-600">
                    -{{ displayCurrency(discountAmount) }}
                  </dd>
                </div>

                <div class="flex items-center justify-between border-t border-gray-200 pt-3 mt-3">
                  <dt class="text-base font-medium text-gray-900">{{ t('checkout.total', 'Total') }}</dt>
                  <dd class="text-base font-medium text-gray-900">{{ displayCurrency(finalTotal) }}</dd>
                </div>

                <div v-if="finalTotal === 0" class="mt-2 text-sm text-green-600 font-medium text-center">
                  {{ t('checkout.freeOrderNotice', 'Your order is free due to applied discount') }}
                </div>
              </dl>
            </div>

            <div class="mt-6">
              <button
                  @click="placeOrder"
                  :disabled="isEmpty"
                  class="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ t('checkout.placeOrder', 'Place Order') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AlertDialog v-model:open="showConfirmDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('checkout.confirmOrder', 'Confirm your order') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{
            t('checkout.confirmOrderDescription', 'Are you sure you want to place this order? You will be charged for the items in your cart.')
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('checkout.cancel', 'Cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="confirmPlaceOrder" class="bg-green-600 hover:bg-green-700">
          {{ t('checkout.confirm', 'Confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

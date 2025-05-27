<script setup>
import {useRouter} from 'vue-router';
import {displayCurrency} from '@/utils/localeUtil.js';
import getSlug from "@/utils/slugUtil.js";
import {useI18n} from 'vue-i18n';
import {useMutation, useQueryClient} from "@tanstack/vue-query";
import axios from "axios";
import {toast} from "vue-sonner";
import {ref} from 'vue';

const {t} = useI18n();
const router = useRouter();
const queryClient = useQueryClient();

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  badge: {
    type: String,
    default: null
  }
});

const quantity = ref(1);

const addToCart = useMutation({
  mutationFn: async () => {
    const response = await axios.post(`/carts?productId=${props.product.id}&quantity=${quantity.value}`);
    return response.data;
  },
  onSuccess: () => {
    toast.success(t('cart.addedToCart', 'Added to cart'));
    queryClient.invalidateQueries(['cart']);
  }
});

const goToProductDetail = () => {
  const categorySlug = getSlug(props.product.categoryName || props.product.translatedCategoryName || 'category');
  const productSlug = getSlug(props.product.name || props.product.translatedName || 'product');
  router.push({
    name: 'product',
    params: {
      categorySlug,
      productSlug,
      productId: props.product.id
    }
  });
};
const prefetchOnMouseOver = (productId) => {

  if (queryClient.getQueryData(['productDetail', productId])) return;
  queryClient.prefetchQuery({
    queryKey: ['productDetail', productId],
    queryFn: async () => {
      const {data} = await axios.get(`/products/${productId}?client=true`);
      console.log(data);
      return data;
    }
  });
};
const handleAddToCart = (event) => {
  event.stopPropagation();
  addToCart.mutate();
};
</script>

<template>
  <div
      @mouseover="prefetchOnMouseOver(product.id)"
      class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full border border-gray-200">
    <div @click="goToProductDetail" class="block relative cursor-pointer">
      <div class="aspect-square overflow-hidden relative">
        <img
            :src="product.thumbnail || 'https://via.placeholder.com/300'"
            :alt="product.name"
            class="object-contain"
            loading="lazy"
        />
        <div class="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        <div class="absolute top-3 left-3 flex space-x-1">
          <div v-if="badge === 'bestseller'" class="badge-bestseller">{{ t('home.bestSeller', 'Best Seller') }}</div>
          <div v-if="badge === 'new'" class="badge-new">{{ t('home.new', 'New') }}</div>
          <div v-if="product.discountPercentage > 0" class="badge-sale">-{{ product.discountPercentage }}%</div>
        </div>
      </div>
    </div>
    <div class="p-2 flex-grow flex flex-col">
      <div class="mb-0.5 flex items-center">
        <div class="rating">
          <span v-for="i in 5" :key="i" class="text-sm">
            <span v-if="i <= product.avgRating" class="text-yellow-400">★</span>
            <span v-else class="text-gray-300">★</span>
          </span>
        </div>
      </div>
      <h3 class="text-sm font-medium text-gray-900 mb-0.5 line-clamp-2">
        {{ product.translatedName || product.name }}
      </h3>
      <div class="mt-auto">
        <div class="flex items-center justify-between mb-0.5">
          <div>
            <span v-if="product.discountPercentage && product.discountPercentage > 0"
                  class="text-sm text-gray-500 line-through">
              {{ displayCurrency(product.price) }}
            </span>
            <div class="text-base font-bold text-gray-900">
              {{ displayCurrency(product.promotionPrice) }}
            </div>
          </div>
        </div>
        <div class="flex space-x-2">
          <button @click="goToProductDetail"
                  class="btn-primary flex-grow py-1">
            {{ t('product.details', 'View Details') }}
          </button>
          <button
              class="btn-icon"
              v-require-login
              @click="handleAddToCart"
              :disabled="addToCart.isPending.value || !product.stock"
              :class="{ 'opacity-50 cursor-not-allowed': !product.stock }"
          >
            <div v-if="addToCart.isPending.value"
                 class="animate-spin h-5 w-5 border-t-2 border-b-2 border-gray-700 rounded-full"></div>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.aspect-square {
  aspect-ratio: 1 / 0.8;
  background-color: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-height: 100%;
    width: auto;
    max-width: 90%;
    object-fit: contain;
    padding: 0.25rem;
    transition: transform 0.3s ease;
  }
}

.group:hover img {
  transform: scale(1.05);
}

.badge-bestseller {
  background-color: #f59e0b;
  color: white;
  font-size: 0.65rem;
  font-weight: 500;
  padding: 0.15rem 0.35rem;
  border-radius: 9999px;
}

.badge-new {
  background-color: #6366f1;
  color: white;
  font-size: 0.65rem;
  font-weight: 500;
  padding: 0.15rem 0.35rem;
  border-radius: 9999px;
}

.badge-sale {
  background-color: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.35rem;
  border-radius: 9999px;
}

.btn-primary {
  background-color: var(--color-primary-600, #2563eb);
  color: white;
  padding: 0.2rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  transition: background-color 0.2s;
  text-align: center;

  &:hover {
    background-color: var(--color-primary-700, #1d4ed8);
  }
}

.btn-icon {
  background-color: #f3f4f6;
  color: #374151;
  padding: 0.3rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #e5e7eb;
  }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 2;
  max-height: 2rem;
  font-size: 0.85rem;
}
</style>

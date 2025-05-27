<script setup>
import {useQuery} from "@tanstack/vue-query";
import axios from "axios";
import {useI18n} from "vue-i18n";
import {computed, onMounted} from 'vue';
import ProductCard from '@/components/ProductCard.vue';

const {t, locale} = useI18n();

onMounted(() => {
  document.title = t('categories.title', 'Product Categories');
});

const {data: productsData, isLoading: isProductsLoading, isError: isProductsError} = useQuery({
  queryKey: ['products', locale.value],
  queryFn: async () => {
    const {data} = await axios.get(`/products`);
    return data;
  },
});

const categorizedProducts = computed(() => {
  if (!productsData.value?.result) return [];

  const products = productsData.value.result.filter(product => product.status && product.categoryStatus);

  const uniqueCategories = [...new Set(products.map(product => product.categoryName))];

  return uniqueCategories.map(categoryName => {
    const categoryProducts = products.filter(product => product.categoryName === categoryName);

    const categoryId = categoryProducts[0]?.categoryId;

    return {
      id: categoryId,
      name: categoryName,
      products: categoryProducts,
      productCount: categoryProducts.length
    };
  }).filter(category => category.productCount > 0);
});

const totalProducts = computed(() => {
  if (!productsData.value?.result) return 0;
  return productsData.value.result.filter(product => product.status && product.categoryStatus).length;
});

const totalCategories = computed(() => {
  return categorizedProducts.value.length;
});

const isLoading = computed(() => isProductsLoading.value);

const scrollToCategory = (categoryId) => {
  const element = document.getElementById(`category-${categoryId}`);
  if (element) {
    element.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
};
</script>

<template>
  <div class="bg-white">

    <div class="bg-gradient-to-r from-gray-800 to-gray-900 py-6">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-white">
              {{ t('categories.title', 'Product Categories') }}
            </h1>
            <p class="text-gray-300 mt-1">
              {{ t('categories.subtitle', 'Discover our wide range of products organized by categories') }}
            </p>
          </div>

          <div class="hidden md:flex space-x-6 text-center">
            <div class="bg-blue-500 bg-opacity-90 rounded-lg p-3 backdrop-blur-sm">
              <div class="text-xl font-bold text-white">{{ totalCategories }}</div>
              <div class="text-xs text-blue-100">{{ t('categories.categoriesCount', 'Categories') }}</div>
            </div>
            <div class="bg-green-500 bg-opacity-90 rounded-lg p-3 backdrop-blur-sm">
              <div class="text-xl font-bold text-white">{{ totalProducts }}</div>
              <div class="text-xs text-green-100">{{ t('about.products', 'Products') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-gray-50 border-b border-gray-200 mb-4">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
        <nav class="flex py-3" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-1">
            <li>
              <router-link to="/" class="text-gray-500 hover:text-gray-700 text-sm font-medium">
                {{ t('common.home', 'Home') }}
              </router-link>
            </li>
            <li class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
              <span class="ml-1 text-primary-600 text-sm font-medium" aria-current="page">
                {{ t('categories.title', 'Product Categories') }}
              </span>
            </li>
          </ol>
        </nav>
      </div>
    </div>

    <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">

      <div v-if="isLoading" class="py-8 text-center">
        <div
            class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"
        ></div>
        <p class="mt-4 text-gray-600">{{ t('categories.loading', 'Loading categories...') }}</p>
      </div>

      <div v-else-if="isProductsError" class="py-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-400" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        <h3 class="mt-2 text-lg font-medium text-gray-900">{{ t('categories.error', 'Error Loading Categories') }}</h3>
        <p class="mt-1 text-gray-500">
          {{ t('categories.errorMessage', 'Unable to load product categories. Please try again later.') }}
        </p>
      </div>

      <div v-else-if="categorizedProducts.length > 0" class="mb-6">
        <div class="bg-white border rounded-lg p-4 top-4">
          <h2 class="text-lg font-medium text-gray-900 mb-4">{{ t('categories.title', 'Categories') }}</h2>
          <div class="flex flex-wrap gap-2">
            <button
                v-for="category in categorizedProducts"
                :key="category.id"
                @click="scrollToCategory(category.id)"
                class="px-4 py-2 bg-gray-100 hover:bg-primary-100 text-gray-700 hover:text-primary-700 rounded-full text-sm font-medium transition-colors duration-200"
            >
              {{ category.name }}
              <span class="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{{ category.productCount }}</span>
            </button>
          </div>
        </div>

        <div class="mt-6">
          <div
              v-for="category in categorizedProducts"
              :key="category.id"
              :id="`category-${category.id}`"
              class="mb-12"
          >

            <div class="mb-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold text-gray-900">{{ category.name }}</h2>
                <div class="text-sm text-gray-500">
                  {{ category.productCount }} {{ t('categories.productsCount', 'products') }}
                </div>
              </div>
              <div class="h-1 bg-gradient-to-r from-primary-600 to-primary-400 rounded-full w-20"></div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <ProductCard
                  v-for="product in category.products"
                  :key="product.id"
                  :product="product"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="py-8 text-center bg-gray-50 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <h3 class="mt-2 text-lg font-medium text-gray-900">{{
            t('categories.noCategories', 'No Categories Available')
          }}</h3>
        <p class="mt-1 text-gray-500">
          {{ t('categories.noCategoriesMessage', 'There are currently no product categories available.') }}
        </p>
        <router-link
            to="/"
            class="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors duration-200"
        >
          {{ t('categories.backToHome', 'Back to Home') }}
        </router-link>
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
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
  padding: 0.3rem 0.75rem;
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

img {
  max-height: 100%;
  width: auto;
  max-width: 90%;
  object-fit: contain;
  padding: 0.25rem;
  transition: transform 0.3s ease;
}

.group:hover img {
  transform: scale(1.05);
}
</style>

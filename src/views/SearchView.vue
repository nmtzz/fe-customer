<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import {useRoute, useRouter} from "vue-router";
import {useQuery} from "@tanstack/vue-query";
import axios from "axios";
import {useI18n} from "vue-i18n";
import {getCurrentExchangeRate, getExchangeRate, refreshExchangeRate} from '../utils/localeUtil';
import getSlug from "@/utils/slugUtil.js";
import ProductCard from '@/components/ProductCard.vue';

const {t, locale} = useI18n();
const route = useRoute();
const router = useRouter();

const query = computed(() => route.query.q || '');

const selectedSort = ref('newest');
const selectedBrands = ref([]);
const availableBrands = ref([]);
const selectedCategories = ref([]);
const availableCategories = ref([]);
const priceRange = ref([null, null]);
const showFilters = ref(false);
const displayLimit = ref(20);

onMounted(() => {
  updateTitle();
  getExchangeRate();
});

watch(query, () => {
  updateTitle();
});

const updateTitle = () => {
  if (query.value) {
    document.title = `${t('search.searchingFor', 'Searching for')} "${query.value}"`;
  } else {
    document.title = t('search.title', 'Search Results');
  }
};

watch(locale, () => {
  refreshExchangeRate(locale.value);
  updateTitle();
}, {immediate: true});

const product = useQuery({
  queryKey: ['search', query.value, locale.value],
  queryFn: async () => {
    const {data} = await axios.get(`/products`);
    return data;
  },
  enabled: computed(() => !!route.query.q)
});

const matchesProducts = computed(() => {
  if (!product.data.value || !product.data.value.result) return [];
  return product.data.value.result.filter(p => {
        if (!p.status || !p.categoryStatus) return false;
        if (p.name.toLowerCase().includes(query.value.toLowerCase())) return true;
        if (p.categoryName.toLowerCase().includes(query.value.toLowerCase())) return true;
        return !!(p.brand && p.brand.toLowerCase().includes(query.value.toLowerCase()));
      }
  );
});
computed(() => {
  if (!matchesProducts.value || matchesProducts.value.length === 0) return [0, 10000];

  const products = matchesProducts.value.filter(product => product.isActive);

  if (products.length === 0) return [0, 10000];

  const prices = products.map(product => {
    const priceInVND = product.discountPercentage > 0
        ? product.promotionPrice
        : product.price;

    return locale.value !== 'vi'
        ? priceInVND * getCurrentExchangeRate()
        : priceInVND;
  });

  const min = Math.floor(Math.min(...prices));
  const max = Math.ceil(Math.max(...prices));

  return [min, max];
});
const filteredProducts = computed(() => {
  if (!matchesProducts.value) return [];

  let products = matchesProducts.value.filter(product =>
      product.status && product.categoryStatus
  );

  if (selectedCategories.value.length > 0) {
    products = products.filter(product =>
        selectedCategories.value.includes(product.categoryName)
    );
  }

  if (selectedBrands.value.length > 0) {
    products = products.filter(product =>
        selectedBrands.value.includes(product.brand)
    );
  }

  products = products.filter(product => {
    const actualPrice = product.discountPercentage > 0
        ? product.promotionPrice
        : product.price;

    const minPrice = priceRange.value[0];
    const maxPrice = priceRange.value[1];

    if (minPrice === null && maxPrice === null) {
      return true;
    }

    const exchangeRateValue = getCurrentExchangeRate();
    const effectiveMinPrice = minPrice !== null ? minPrice / exchangeRateValue : Number.MIN_SAFE_INTEGER;
    const effectiveMaxPrice = maxPrice !== null ? maxPrice / exchangeRateValue : Number.MAX_SAFE_INTEGER;

    return actualPrice >= effectiveMinPrice && actualPrice <= effectiveMaxPrice;
  });

  switch (selectedSort.value) {
    case 'newest':
      products.sort((a, b) => b.id - a.id);
      break;
    case 'price-low':
      products.sort((a, b) => {
        const priceA = a.promotionPrice || a.price;
        const priceB = b.promotionPrice || b.price;
        return priceA - priceB;
      });
      break;
    case 'price-high':
      products.sort((a, b) => {
        const priceA = a.promotionPrice || a.price;
        const priceB = b.promotionPrice || b.price;
        return priceB - priceA;
      });
      break;
    case 'best-selling':
      products.sort((a, b) => (b.sold || 0) - (a.sold || 0));
      break;
    case 'discounted':
      products.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0));
      break;
  }

  return products;
});

const extractBrands = () => {
  if (!matchesProducts.value) return [];

  const products = matchesProducts.value.filter(product =>
      product.status &&
      product.categoryStatus &&
      product.brand
  );

  availableBrands.value = [...new Set(products.map(product => product.brand))]
      .filter(brand => brand && brand.trim() !== '')
      .sort((a, b) => a.localeCompare(b));
};

const extractCategories = () => {
  if (!matchesProducts.value) return [];

  const products = matchesProducts.value.filter(product =>
      product.status &&
      product.categoryStatus &&
      product.categoryName
  );

  availableCategories.value = [...new Set(products.map(product => product.categoryName))]
      .filter(category => category && category.trim() !== '')
      .sort((a, b) => a.localeCompare(b));
};

watch(matchesProducts, () => {
  extractBrands();
  extractCategories();
  selectedBrands.value = [];
  selectedCategories.value = [];
}, {immediate: true});

const toggleFilters = () => {
  showFilters.value = !showFilters.value;
};

const clearFilters = () => {
  selectedBrands.value = [];
  selectedCategories.value = [];
  priceRange.value = [null, null];
  selectedSort.value = 'newest';
};

const toggleBrand = (brand) => {
  if (selectedBrands.value.includes(brand)) {
    selectedBrands.value = selectedBrands.value.filter(b => b !== brand);
  } else {
    selectedBrands.value.push(brand);
  }
};

const toggleCategory = (category) => {
  if (selectedCategories.value.includes(category)) {
    selectedCategories.value = selectedCategories.value.filter(c => c !== category);
  } else {
    selectedCategories.value.push(category);
  }
};

const displayedProducts = computed(() => {
  return filteredProducts.value.slice(0, displayLimit.value);
});

const hasMoreProducts = computed(() => {
  return displayLimit.value < filteredProducts.value.length;
});

const loadMoreProducts = () => {
  displayLimit.value += 10;
};

const handleMinPriceChange = (event) => {
  const value = Number(event.target.value);
  if (!isNaN(value) && (priceRange.value[1] === null || value <= priceRange.value[1])) {
    priceRange.value = [value, priceRange.value[1]];
  }
};

const handleMaxPriceChange = (event) => {
  const value = Number(event.target.value);
  if (!isNaN(value) && (priceRange.value[0] === null || value >= priceRange.value[0])) {
    priceRange.value = [priceRange.value[0], value];
  }
};

const goToProductDetail = (product) => {
  const categorySlug = getSlug(product.categoryName || product.translatedCategoryName || 'category');
  const productSlug = getSlug(product.name || product.translatedName || 'product');
  router.push({
    name: 'product',
    params: {
      categorySlug,
      productSlug,
      productId: product.id
    }
  });
};
</script>

<template>
  <div class="bg-white">

    <div class="bg-gradient-to-r from-gray-800 to-gray-900 py-6">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-white">
              {{ t('search.title', 'Search Results') }}
            </h1>
            <p v-if="query" class="text-gray-300 mt-1">
              {{ t('search.searchingFor', 'Searching for') }}: "{{ query }}"
            </p>
          </div>
          <button
              @click="toggleFilters"
              class="md:hidden px-3 py-2 bg-white bg-opacity-10 rounded-md text-white flex items-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            <span>{{ t('category.filter', 'Filter') }}</span>
          </button>
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
                {{ t('search.results', 'Search Results') }}
              </span>
            </li>
          </ol>
        </nav>
      </div>
    </div>

    <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
      <div class="flex flex-col md:flex-row gap-6">

        <div
            class="md:w-64 flex-shrink-0"
            :class="{ 'hidden md:block': !showFilters, 'block': showFilters }"
        >
          <div class="bg-white border rounded-lg p-4 sticky top-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-medium text-gray-900">{{ t('category.filters', 'Filters') }}</h2>
              <button
                  @click="clearFilters"
                  class="text-sm text-primary-600 hover:text-primary-800"
              >
                {{ t('category.clearAll', 'Clear All') }}
              </button>
            </div>

            <div class="mb-6">
              <h3 class="text-sm font-medium text-gray-900 mb-2">{{ t('category.sortBy', 'Sort By') }}</h3>
              <select
                  v-model="selectedSort"
                  class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
              >
                <option value="newest">{{ t('category.newest', 'Newest') }}</option>
                <option value="price-low">{{ t('category.priceLow', 'Price: Low to High') }}</option>
                <option value="price-high">{{ t('category.priceHigh', 'Price: High to Low') }}</option>
                <option value="best-selling">{{ t('category.bestSelling', 'Best Selling') }}</option>
                <option value="discounted">{{ t('category.discounted', 'Highest Discount') }}</option>
              </select>
            </div>

            <div class="mb-6">
              <h3 class="text-sm font-medium text-gray-900 mb-2">{{ t('category.priceRange', 'Price Range') }}</h3>

              <div class="flex items-center justify-between mt-4 gap-2">
                <div class="flex-1">
                  <label class="text-xs text-gray-500 mb-1 block">{{ t('category.min', 'Min') }}</label>
                  <input
                      type="number"
                      v-model.number="priceRange[0]"
                      @change="handleMinPriceChange"
                      class="w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                  />
                </div>
                <div class="flex-1">
                  <label class="text-xs text-gray-500 mb-1 block">{{ t('category.max', 'Max') }}</label>
                  <input
                      type="number"
                      v-model.number="priceRange[1]"
                      @change="handleMaxPriceChange"
                      class="w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div class="mb-6">
              <h3 class="text-sm font-medium text-gray-900 mb-2">{{ t('category.brands', 'Brands') }}</h3>
              <div v-if="availableBrands.length > 0" class="max-h-48 overflow-y-auto">
                <div
                    v-for="brand in availableBrands"
                    :key="brand"
                    class="flex items-center space-x-2 mb-2"
                >
                  <input
                      type="checkbox"
                      :id="`brand-${brand}`"
                      :checked="selectedBrands.includes(brand)"
                      @change="toggleBrand(brand)"
                      class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  >
                  <label :for="`brand-${brand}`"
                         class="text-sm text-gray-700 cursor-pointer hover:text-primary-600">{{ brand }}</label>
                </div>
              </div>
              <div v-else class="text-sm text-gray-500 italic">
                {{ t('search.noBrands', 'No brands available in search results') }}
              </div>
              <div v-if="selectedBrands.length > 0" class="mt-2">
                <button
                    @click="selectedBrands = []"
                    class="text-xs text-primary-600 hover:text-primary-800 underline"
                >
                  {{ t('category.clearBrands', 'Clear brand selection') }}
                </button>
              </div>
            </div>

            <div class="mb-6">
              <h3 class="text-sm font-medium text-gray-900 mb-2">{{ t('category.categories', 'Categories') }}</h3>
              <div v-if="availableCategories.length > 0" class="max-h-48 overflow-y-auto">
                <div
                    v-for="category in availableCategories"
                    :key="category"
                    class="flex items-center space-x-2 mb-2"
                >
                  <input
                      type="checkbox"
                      :id="`category-${category}`"
                      :checked="selectedCategories.includes(category)"
                      @change="toggleCategory(category)"
                      class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  >
                  <label :for="`category-${category}`"
                         class="text-sm text-gray-700 cursor-pointer hover:text-primary-600">{{ category }}</label>
                </div>
              </div>
              <div v-else class="text-sm text-gray-500 italic">
                {{ t('search.noCategories', 'No categories available in search results') }}
              </div>
              <div v-if="selectedCategories.length > 0" class="mt-2">
                <button
                    @click="selectedCategories = []"
                    class="text-xs text-primary-600 hover:text-primary-800 underline"
                >
                  {{ t('category.clearCategories', 'Clear category selection') }}
                </button>
              </div>
            </div>

            <button
                @click="toggleFilters"
                class="md:hidden w-full py-2 bg-primary-600 text-white rounded-md mt-4"
            >
              {{ t('category.applyFilters', 'Apply Filters') }}
            </button>
          </div>
        </div>

        <div class="flex-grow">
          <div class="flex justify-between items-center mb-4">
            <p class="text-sm text-gray-500">
              {{ filteredProducts.length }} {{ t('search.productsFound', 'products found') }}
            </p>
          </div>

          <div v-if="product.isLoading.value" class="py-8 text-center">
            <div
                class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"
            ></div>
            <p class="mt-4 text-gray-600">{{ t('common.loading', 'Loading...') }}</p>
          </div>

          <div v-else-if="product.isError.value" class="py-8 text-center">
            <p class="text-red-500">{{ t('search.errorLoading', 'Error loading search results') }}</p>
          </div>

          <div v-else-if="!query" class="py-8 text-center bg-gray-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <h3 class="mt-2 text-lg font-medium text-gray-900">{{ t('search.noQuery', 'Enter a search term') }}</h3>
            <p class="mt-1 text-gray-500">
              {{ t('search.noQueryDescription', 'Please enter a search term to find products') }}
            </p>
          </div>

          <div v-else-if="filteredProducts.length === 0" class="py-8 text-center bg-gray-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z"/>
            </svg>
            <h3 class="mt-2 text-lg font-medium text-gray-900">{{ t('search.noResults', 'No products found') }}</h3>
            <p class="mt-1 text-gray-500">
              {{ t('search.tryDifferentSearch', 'Try different keywords or check your spelling') }}
            </p>
            <button
                @click="clearFilters"
                class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              {{ t('category.clearFilters', 'Clear Filters') }}
            </button>
          </div>

          <div v-else>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div v-for="product in displayedProducts" :key="product.id">
                <ProductCard :product="product"/>
              </div>
            </div>

            <div class="mt-8 text-center">
              <button
                  v-if="hasMoreProducts"
                  @click="loadMoreProducts"
                  class="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                {{ t('search.loadMore', 'Load More Products') }}
              </button>
              <p
                  v-else-if="filteredProducts.length > 0"
                  class="text-gray-500 py-3"
              >
                {{ t('search.allProductsLoaded', 'All search results have been loaded') }}
              </p>
            </div>
          </div>
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

<script setup>
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import {useRoute, useRouter} from "vue-router";
import {computed, ref, watch} from "vue";
import axios from "axios";
import {useI18n} from "vue-i18n";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,} from "@/components/ui/carousel";
import {Tabs, TabsContent, TabsList, TabsTrigger,} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import Autoplay from "embla-carousel-autoplay";
import {displayCurrency, displayDate, displayDateShort} from "@/utils/localeUtil.js";
import {toast} from "vue-sonner";
import ProductCard from '@/components/ProductCard.vue';
import {userData} from "@/utils/authUtil.js";
import viewedProductsStore from "@/stores/viewedProductsStore.js";

const rating = ref(5);
const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const productId = computed(() => parseInt(route.params.productId));
const {data, isPending, isError} = useQuery({
  queryKey: ['productDetail', productId.value],
  queryFn: async () => {
    const {data} = await axios.get(`/products/${productId.value}?client=true`);
    return data;
  },
  select(data) {
    if (data && data.result && !data.result.status || !data.result.categoryStatus) {
      window.location.href = '/404';
    }
    return data;
  }
})
const queryClient = useQueryClient();
const addToCart = useMutation({
  mutationFn: async () => {
    const response = await axios.post(`/carts?productId=${productId.value}&quantity=${quantity.value}`);
    return response.data;
  },
  onSuccess: () => {
    toast.success(t('cart.addedToCart', 'Added to cart'));
    queryClient.invalidateQueries(['cart']);
  }
})
const mainApi = ref(null);
const thumbnailApi = ref(null);

const selectedIndex = ref(0);

const onMainCreate = (api) => {
  mainApi.value = api;

  api.on("select", () => {

    selectedIndex.value = api.selectedScrollSnap();
    thumbnailApi.value?.scrollTo(selectedIndex.value);
  });
};

const onThumbCreate = (api) => {
  thumbnailApi.value = api;
};

const onThumbClick = (index) => {
  mainApi.value?.scrollTo(index);
};

watch(selectedIndex, (newIndex) => {
  thumbnailApi.value?.scrollTo(newIndex);
});
const goToQuickBuy = () => {
  router.push({
    name: 'quick-buy',
    params: {
      productSlug: route.params.productSlug,
      productIdToBuy: productId.value
    },
    query: {
      quantity: quantity.value
    }
  });
};

const product = computed(() => {
  document.title = data?.value?.result?.name || 'Product';
  if (data?.value?.result) {
    viewedProductsStore.addViewedProduct(data.value.result.id);
    queryClient.invalidateQueries(['viewedProducts']);
  }
  return data?.value?.result
});
const images = computed(() => {

  const allImages = [];
  if (product.value?.thumbnail) {
    allImages.push({
      id: 'thumbnail',
      url: product.value.thumbnail
    });
  }
  return [...allImages, ...(product.value?.productImages || [])];
});

const currentRatingsPage = ref(0);
const totalRatingsPages = ref(0);
const totalRatingsElements = ref(0);

const {
  data: ratingsData,
  isPending: isRatingsPending,
  isError: isRatingsError,
  refetch: refetchRatings
} = useQuery({
  queryKey: ['productRatings', productId.value, currentRatingsPage.value],
  queryFn: async () => {
    try {
      const {data} = await axios.get(`/ratings/${productId.value}?page=${currentRatingsPage.value}`);
      return data;
    } catch (error) {
      console.error('Error fetching ratings:', error);
      throw error;
    }
  },
  enabled: computed(() => !!productId.value)
});
const {data: ratableData} = useQuery({
  queryKey: ['ratable', productId.value],
  queryFn: async () => {
    try {
      const {data} = await axios.get(`/ratings/ratable/${productId.value}`);
      return data;
    } catch (error) {
      console.error('Error fetching ratable:', error);
      throw error;
    }
  },
  enabled: computed(() => !!productId.value && !!userData.user)
})
const {data: isRatedData} = useQuery({
  queryKey: ['isRated', productId.value],
  queryFn: async () => {
    try {
      const {data} = await axios.get(`/ratings/is-rated/${productId.value}`);
      return data;
    } catch (error) {
      console.error('Error fetching isRated:', error);
      throw error;
    }
  },
  enabled: computed(() => !!productId.value && !!userData.user)
})
const isRated = computed(() => {
  if (!isRatedData?.value || !isRatedData?.value?.result) return false;
  return isRatedData.value.result;
})
const ratable = computed(() => {
  if (!ratableData?.value || !ratableData?.value?.result) return false;
  return ratableData.value.result;
})
const {data: loadRatedData} = useQuery({
  queryKey: ['loadRated', productId.value],
  queryFn: async () => {
    try {
      const {data} = await axios.get(`/ratings/user/${productId.value}`);
      return data;
    } catch (error) {
      console.error('Error fetching isRated:', error);
      throw error;
    }
  },
  enabled: computed(() => !!productId.value && !!userData.user)
})
watch(ratingsData, (newData) => {
  if (newData?.result) {
    totalRatingsPages.value = newData.result.totalPages;
    totalRatingsElements.value = newData.result.totalElements;
  }
}, {immediate: true});

watch(currentRatingsPage, () => {
  refetchRatings();
});

const ratings = computed(() => ratingsData?.value?.result?.content || []);

const productRatings = computed(() => data?.value?.result?.ratings);

const relatedProducts = computed(() => data?.value?.result?.relatedProducts);
const calculateAverageRating = computed(() => {

  if (product.value?.avgRating) return product.value.avgRating;

  if (!productRatings.value || productRatings.value.length === 0) return 0;
  const total = productRatings.value.reduce((acc, rating) => acc + rating.rating, 0);
  return total / productRatings.value.length;
});

const nextRatingsPage = () => {
  if (currentRatingsPage.value < totalRatingsPages.value - 1) {
    currentRatingsPage.value++;
  }
};

const prevRatingsPage = () => {
  if (currentRatingsPage.value > 0) {
    currentRatingsPage.value--;
  }
};

const productSpecs = computed(() => {
  if (!product.value?.specs) return [];
  try {
    return Object.entries(JSON.parse(product.value.specs)).map(([name, value]) => ({
      name,
      value
    }));
  } catch (e) {
    console.error("Error parsing product specs:", e);
    return [];
  }
});

const discountAmount = computed(() => {
  if (!product.value) return 0;
  return product.value.price - product.value.promotionPrice;
});

const isOnSale = computed(() => {
  if (!product.value) return false;
  return product.value.discountPercentage > 0;
});

const quantity = ref(1);

const incrementQuantity = () => {
  if (quantity.value < 3 && product.value && quantity.value < product.value.stock) {
    quantity.value++;
  }
};

const decrementQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--;
  }
};

const updateQuantity = (event) => {
  const value = parseInt(event.target.value);
  if (isNaN(value) || value < 1) {
    quantity.value = 1;
  } else if (value > 3) {
    quantity.value = 3;
  } else if (product.value && value > product.value.stock) {
    quantity.value = product.value.stock;
  } else {
    quantity.value = value;
  }
};

const isReviewDialogOpen = ref(false);
const reviewRating = ref(5);
const reviewComment = ref('');
const isEditMode = ref(false);

const resetReviewForm = () => {
  reviewRating.value = 5;
  reviewComment.value = '';
  isEditMode.value = false;
};

const editReview = () => {

  if (existingRating.value) {
    reviewRating.value = existingRating.value.rating;
    reviewComment.value = existingRating.value.comment;
    isEditMode.value = true;
    isViewRatingDialogOpen.value = false;
    isReviewDialogOpen.value = true;
  }
};

const isViewRatingDialogOpen = ref(false);
const existingRating = computed(() => {
  return loadRatedData?.value?.result;
});

const saveRatingMutation = useMutation({
  mutationFn: async (ratingData) => {
    return await axios.post('/ratings', ratingData);
  },
  onSuccess: () => {
    const message = isEditMode.value
        ? t('product.reviewUpdated', 'Review updated successfully')
        : t('product.reviewSubmitted', 'Review submitted successfully');
    toast.success(message);
    refetchRatings();
    queryClient.invalidateQueries(['loadRated', productId.value]);
    queryClient.invalidateQueries(['isRated', productId.value]);
  }
})
const submitReview = () => {
  saveRatingMutation.mutate({
    id: existingRating?.value?.id || null,
    productId: productId.value,
    rating: reviewRating.value,
    comment: reviewComment.value
  });
  isReviewDialogOpen.value = false;
  resetReviewForm();
};
</script>
<template>

  <div class="bg-gray-50 border-b border-gray-200 border-t border-gray-200">
    <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
      <nav class="flex py-3" aria-label="Breadcrumb">
        <ol class="flex items-center space-x-1">
          <li>
            <a href="/" class="text-gray-500 hover:text-gray-700 text-sm font-medium">
              {{ t('common.home', 'Home') }}
            </a>
          </li>
          <li v-if="product?.categoryName" class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <router-link
                :to="`/category/${product.categoryId}`"
                class="ml-1 text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              {{ product.categoryName }}
            </router-link>
          </li>
          <li class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <span class="ml-1 text-primary-600 text-sm font-medium" aria-current="page">
              {{ product?.name }}
            </span>
          </li>
        </ol>
      </nav>
    </div>
  </div>

  <div v-if="product" class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">

      <div>

        <div class="relative overflow-hidden rounded-lg border bg-white shadow-sm mb-4 w-full">
          <Carousel
              class="w-full"
              @init-api="onMainCreate"
              :opts="{ loop: true, dragFree: true, startIndex: 0 }"
          >
            <CarouselContent>
              <CarouselItem v-for="(image, index) in images" :key="image.id">
                <div class="h-[400px] w-full p-2 flex items-center justify-center bg-white">
                  <img
                      :src="image.url"
                      :alt="`Product image ${index + 1}`"
                      class="h-auto max-h-[380px] w-auto max-w-full object-contain"
                      style="display: block; margin: 0 auto;"
                  />
                </div>
              </CarouselItem>
            </CarouselContent>
            <div class="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
              <CarouselPrevious class="relative pointer-events-auto h-8 w-8 rounded-full opacity-80"/>
              <CarouselNext class="relative pointer-events-auto h-8 w-8 rounded-full opacity-80"/>
            </div>
          </Carousel>
        </div>

        <div class="relative mt-4">
          <Carousel
              @init-api="onThumbCreate"
              class="w-full"
              :opts="{ align: 'start', containScroll: 'trimSnaps' }"
          >
            <CarouselContent class="-ml-4">
              <CarouselItem
                  v-for="(image, index) in images"
                  :key="image.id"
                  class="pl-4 basis-1/5 md:basis-1/6 lg:basis-1/7"
              >
                <div
                    @click="onThumbClick(index)"
                    class="relative h-20 w-20 cursor-pointer overflow-hidden rounded-md bg-white"
                >
                  <div
                      class="absolute inset-0 rounded-md border-2 transition-all"
                      :class="selectedIndex === index ? 'border-amber-500 ring-2 ring-amber-300' : 'border-gray-300 hover:border-gray-400'"
                  ></div>
                  <img
                      :src="image.url"
                      :alt="`Product thumbnail ${index + 1}`"
                      class="h-full w-full object-cover object-center"
                  />
                </div>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>
      </div>

      <div class="space-y-5 relative">

        <div class="flex flex-col md:flex-row md:items-start">
          <div class="flex-grow">
            <div class="product-title-container">
              <h1 class="text-2xl font-bold text-gray-900">{{ product.name }}</h1>
              <span v-if="product.sku" class="sku-badge">
                <span class="text-gray-500">{{ t('product.sku') }}:</span>
                <span class="text-gray-700 ml-1 font-semibold">{{ product.sku }}</span>
              </span>
            </div>
            <p class="text-sm text-gray-500 mt-1">{{ t('product.brand') }}: {{ product.brand }}</p>
          </div>

          <div v-if="isOnSale"
               class="mt-3 md:mt-0 md:max-w-[250px] md:absolute md:top-0 md:right-0 z-10 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <div class="flex items-start">
              <div class="text-amber-500 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="ml-2">
                <h3 class="text-sm font-medium text-amber-800">{{ t('product.specialOffer') }}</h3>
                <div class="text-sm text-amber-700">
                  <p>{{ t('product.save') }} {{ displayCurrency(discountAmount) }} ({{ product.discountPercentage }}%
                    {{ t('product.off') }})</p>
                  <div v-if="product.promotionEndDate" class="mt-1 flex items-center text-xs text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {{ t('product.offerEnds') }}: {{
                      displayDate(product.promotionEndDate)
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center">
          <div class="flex items-center">
            <svg v-for="i in 5" :key="i" class="w-5 h-5"
                 :class="i <= Math.round(calculateAverageRating) ? 'text-yellow-400' : 'text-gray-300'"
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
          <p class="ml-2 text-sm text-gray-500">{{ calculateAverageRating.toFixed(1) }} ({{ totalRatingsElements || 0 }}
            reviews)</p>
        </div>

        <div>
          <div class="flex items-center">
            <p class="text-3xl font-bold text-red-600">
              {{ displayCurrency(product.promotionPrice) }}
            </p>
            <p v-if="isOnSale" class="ml-3 text-base text-gray-500 line-through">
              {{ displayCurrency(product.price) }}
            </p>
            <div v-if="isOnSale"
                 class="ml-3 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center">
              -{{ product.discountPercentage }}%
            </div>
          </div>
        </div>

        <div class="mt-0.5">
          <p class="text-sm">
            <span class="font-medium text-gray-700">{{ t('product.availability') }}:</span>
            <span v-if="product.stock > 0" class="text-green-600 font-medium">
              {{ t('product.inStock') }} ({{ product.stock }} {{ t('product.available') }})
            </span>
            <span v-else class="text-red-600 font-medium">
              {{ t('product.outOfStock') }}
            </span>
          </p>
        </div>

        <div class="" v-if="product.stock > 0">
          <div class="flex items-center">
            <button
                type="button"
                @click="decrementQuantity"
                class="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100"
                :disabled="quantity <= 1 || product.stock === 0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
              </svg>
            </button>
            <input
                id="quantity"
                type="number"
                min="1"
                max="3"
                disabled
                v-model="quantity"
                @change="updateQuantity"
                class="w-16 h-10 border-t border-b border-gray-300 text-center focus:ring-primary-500 focus:border-primary-500 text-gray-900 appearance-none"
                style="-moz-appearance: textfield; appearance: textfield;"
            />
            <button
                type="button"
                @click="incrementQuantity"
                class="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
                :disabled="quantity >= 3 || quantity >= product.stock || product.stock === 0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
            <span v-if="product.stock > 0" class="ml-3 text-sm text-gray-500">
              {{ product.stock }} {{ t('product.available', 'available') }} ({{ t('product.maxQuantity', 'Max 3 per order') }})
            </span>
            <span v-else class="ml-3 text-sm text-red-500">
              {{ t('product.outOfStock') }}
            </span>
          </div>
        </div>

        <div class="space-y-3 md:mr-6 mt-10">

          <button
              v-if="product.stock > 0"
              v-require-login
              type="button"
              @click="addToCart.mutate()"
              class="w-full bg-orange-500 py-3 px-8 rounded-md font-medium text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="addToCart.isPending.value">
            <span v-if="addToCart.isPending.value">{{ t('cart.adding', 'Adding...') }}</span>
            <span v-else>{{ t('product.addToCart') }}</span>
          </button>

          <button
              v-else
              type="button"
              class="w-full bg-gray-400 py-3 px-8 rounded-md font-medium text-white shadow-sm cursor-not-allowed opacity-75"
              disabled
          >
            {{ t('product.outOfStock') }}
          </button>

          <button
              v-if="product.stock > 0"
              v-require-login
              type="button"
              @click="goToQuickBuy"
              class="w-full bg-purple-600 py-3 px-8 rounded-md font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ t('product.buyNow') }}
          </button>
        </div>
      </div>
    </div>

    <div class="mt-12 border-t border-gray-200 pt-8">
      <Tabs default-value="description" class="w-full">
        <TabsList
            class="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full border-b border-gray-200">
          <TabsTrigger
              value="description"
              class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-0 border-b-2 data-[state=active]:border-b-primary-600 data-[state=inactive]:border-b-transparent"
          >
            {{ t('product.description') }}
          </TabsTrigger>
          <TabsTrigger
              value="specifications"
              class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-0 border-b-2 data-[state=active]:border-b-primary-600 data-[state=inactive]:border-b-transparent"
          >
            {{ t('product.specifications') }}
          </TabsTrigger>
          <TabsTrigger
              value="reviews"
              class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-0 border-b-2 data-[state=active]:border-b-primary-600 data-[state=inactive]:border-b-transparent"
          >
            {{ t('product.reviews') }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" class="mt-6 animate-in fade-in-50 duration-200">
          <div class="bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
            <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-primary-500" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ t('product.productDescription') }}
            </h3>
            <div class="prose prose-sm max-w-none text-gray-600 leading-relaxed">
              <div v-if="product.description" v-html="product.description.replace(/\n/g, '<br>')"></div>
              <div v-else class="text-gray-500 italic">{{ t('product.noDescription') }}</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="specifications" class="mt-6 animate-in fade-in-50 duration-200">
          <div class="bg-white rounded-lg border border-gray-100 shadow-sm">
            <div class="p-6 border-b border-gray-100">
              <h3 class="text-lg font-medium text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-primary-500" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                {{ t('product.technicalSpecifications') }}
              </h3>
            </div>
            <div class="divide-y divide-gray-100 rounded-md overflow-hidden border border-gray-200">
              <div v-if="productSpecs.length > 0">
                <div v-for="(spec, index) in productSpecs" :key="index"
                     class="grid grid-cols-1 md:grid-cols-3 py-2 px-4 transition-colors"
                     :class="index % 2 === 0 ? 'bg-white' : 'bg-gray-100'">
                  <div class="text-gray-700 font-medium text-sm">{{ spec.name }}</div>
                  <div class="col-span-1 md:col-span-2 text-gray-800 text-sm">{{ spec.value }}</div>
                </div>
              </div>
              <div v-else class="p-6 text-gray-500 italic">{{ t('product.noSpecifications') }}</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" class="mt-6 animate-in fade-in-50 duration-200">
          <div class="bg-white rounded-lg border border-gray-100 shadow-sm">
            <div class="p-6 border-b border-gray-100">
              <h3 class="text-lg font-medium text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-primary-500" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
                {{ t('product.customerReviews') }}
              </h3>
            </div>
            <div class="p-6">

              <div
                  class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8 p-4 bg-gray-50 rounded-lg mb-6">
                <div class="flex items-center space-x-4">
                  <div class="text-4xl font-bold text-primary-500">{{ calculateAverageRating.toFixed(1) }}</div>
                  <div>
                    <div class="flex items-center">
                      <svg v-for="i in 5" :key="i" class="w-5 h-5"
                           :class="i <= Math.round(calculateAverageRating) ? 'text-yellow-400' : 'text-gray-300'"
                           xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    </div>
                    <p class="text-sm text-gray-500">{{ t('product.basedOn') }} {{ totalRatingsElements || 0 }}
                      reviews</p>
                  </div>
                </div>
                <div class="md:ml-auto">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                          v-if="ratable && !isRated"
                          v-require-login
                          class="mt-4 inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                          @click="resetReviewForm(); isReviewDialogOpen = true"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        {{ t('product.beFirstToReview') }}
                      </button>
                    </DialogTrigger>
                  </Dialog>
                  <div v-if="isRated && userData.user" class="text-sm text-gray-500 italic flex items-center">
                    <span>{{ t('product.alreadyReviewed', 'You have already reviewed this product') }}</span>
                    <button @click="isViewRatingDialogOpen = true"
                            class="ml-2 text-emerald-600 hover:text-emerald-700 underline text-sm font-medium">
                      {{ t('product.viewYourReview', 'View your review') }}
                    </button>
                  </div>
                  <div v-else-if="!ratable && userData.user" class="mt-3 text-sm text-gray-500 italic">
                    {{ t('product.cannotReview', 'You need to purchase this product to review it') }}
                  </div>
                </div>
              </div>

              <div v-if="isRatingsPending" class="py-8 text-center">
                <div
                    class="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p class="mt-4 text-gray-600">{{ t('common.loading', 'Loading...') }}</p>
              </div>

              <div v-else-if="isRatingsError" class="py-8 text-center">
                <p class="text-red-500">{{ t('product.errorLoadingReviews', 'Error loading reviews') }}</p>
                <button @click="refetchRatings" class="mt-2 text-primary-600 hover:underline">
                  {{ t('common.tryAgain', 'Try Again') }}
                </button>
              </div>

              <div v-else-if="ratings && ratings.length > 0" class="space-y-6 divide-y divide-gray-100">
                <div v-for="rating in ratings" :key="rating.id" class="pt-6 first:pt-0">
                  <div class="flex items-start">
                    <div class="flex-shrink-0">
                      <div
                          class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {{ (rating.userFullName || 'A')[0].toUpperCase() }}
                      </div>
                    </div>
                    <div class="ml-3 flex-1">
                      <div class="flex items-center mb-1">
                        <p class="text-sm font-medium text-gray-900">{{ rating.userFullName || 'Anonymous' }}</p>
                        <span class="mx-2 text-gray-300">•</span>
                        <p class="text-sm text-gray-500">{{ displayDateShort(rating.createdAt) }}</p>
                      </div>
                      <div class="flex items-center mb-2">
                        <svg v-for="i in 5" :key="i" class="w-4 h-4"
                             :class="i <= rating.rating ? 'text-yellow-400' : 'text-gray-300'"
                             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path
                              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span class="ml-1 text-xs text-gray-500">{{ t('product.verifiedPurchase') }}</span>
                      </div>
                      <div class="text-gray-700 text-sm">{{ rating.comment }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="totalRatingsPages > 1" class="pt-6 flex justify-center items-center space-x-2">
                  <button
                      @click="prevRatingsPage"
                      class="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="currentRatingsPage === 0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>

                  <div class="text-sm text-gray-700">
                    {{ t('pagination.page', 'Page') }} {{ currentRatingsPage + 1 }} {{ t('pagination.of', 'of') }}
                    {{ totalRatingsPages }}
                  </div>

                  <button
                      @click="nextRatingsPage"
                      class="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="currentRatingsPage >= totalRatingsPages - 1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div v-else class="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
                <p class="text-gray-500 italic">{{ t('product.noReviews') }}</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                        v-if="ratable && !isRated"
                        v-require-login
                        class="mt-4 inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                        @click="resetReviewForm(); isReviewDialogOpen = true"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                      {{ t('product.beFirstToReview') }}
                    </button>
                  </DialogTrigger>
                </Dialog>
                <div v-if="isRated && userData.user" class="mt-3 text-sm text-gray-500 italic">
                  {{ t('product.alreadyReviewed', 'You have already reviewed this product') }}
                </div>
                <div v-else-if="!ratable && userData.user" class="mt-3 text-sm text-gray-500 italic">
                  {{ t('product.cannotReview', 'You need to purchase this product to review it') }}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>

    <div v-if="relatedProducts && relatedProducts.length > 0" class="mt-16 border-t border-gray-200 pt-8">
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('product.relatedProducts', 'Related Products') }}</h2>
        <p class="text-gray-600 max-w-3xl mx-auto text-sm">
          {{ t('product.relatedProductsSubtitle', 'You might also be interested in these similar products') }}
        </p>
        <div class="w-20 h-1 bg-primary-500 mx-auto mt-3"></div>
      </div>

      <Carousel class="w-full" :plugins="[Autoplay({ delay: 3500, stopOnInteraction: false })]">
        <CarouselContent class="-ml-2 md:-ml-4">
          <CarouselItem v-for="product in relatedProducts" :key="product.id"
                        class="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
            <ProductCard :product="product"/>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    </div>
  </div>

  <div v-else-if="isPending" class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
    <div class="w-full h-60 flex items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  </div>

  <div v-else-if="isError" class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
    <div class="w-full py-8 text-center">
      <p class="text-red-500">{{ t('common.error') }}</p>
    </div>
  </div>

  <Dialog v-model:open="isViewRatingDialogOpen">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ t('product.yourReview', 'Your Review') }}</DialogTitle>
        <DialogDescription>
          {{ t('product.reviewSubmittedOn', 'Submitted on') }} {{ displayDateShort(existingRating?.createdAt) }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">
            {{ t('product.rating', 'Rating') }}
          </label>
          <div class="flex items-center">
            <div class="flex gap-1">
              <div v-for="star in 5" :key="star" class="focus:outline-none">
                <svg
                    class="w-6 h-6"
                    :class="star <= existingRating?.rating ? 'text-yellow-400' : 'text-gray-300'"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
              </div>
            </div>
            <span class="ml-2 text-sm text-gray-500">{{ existingRating?.rating }}/5</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">
            {{ t('product.reviewComment', 'Comment') }}
          </label>
          <div class="w-full border rounded-md py-2 px-3 bg-gray-50 text-gray-700 min-h-[80px]">
            {{ existingRating?.comment }}
          </div>
        </div>
      </div>

      <DialogFooter class="flex justify-between">
        <button
            @click="editReview"
            class="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-md transition-colors flex items-center shadow-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
               stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          {{ t('product.editReview', 'Edit Review') }}
        </button>

        <button
            @click="isViewRatingDialogOpen = false"
            class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md transition-colors flex items-center shadow-sm font-medium"
        >
          {{ t('common.close', 'Close') }}
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="isReviewDialogOpen" @update:open="val => !val && resetReviewForm()">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          {{ isEditMode ? t('product.editReview', 'Edit Review') : t('product.writeReview', 'Write a Review') }}
        </DialogTitle>
        <DialogDescription>
          {{ t('product.reviewDescription', 'Share your experience with this product.') }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="flex flex-col gap-2">
          <label for="rating" class="text-sm font-medium">
            {{ t('product.rating', 'Rating') }}
          </label>
          <div class="flex items-center">

            <div class="flex gap-1">
              <button
                  v-for="star in 5"
                  :key="star"
                  @mouseover="reviewRating = star"
                  @click="reviewRating = star"
                  class="focus:outline-none"
                  type="button"
              >
                <svg
                    class="w-8 h-8"
                    :class="star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
              </button>
            </div>
            <span class="ml-2 text-sm text-gray-500">{{ reviewRating }}/5</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="comment" class="text-sm font-medium">
            {{ t('product.reviewComment', 'Comment') }}
          </label>
          <textarea
              id="comment"
              v-model="reviewComment"
              rows="4"
              class="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              :placeholder="t('product.reviewPlaceholder', 'Write your review here...')"
          ></textarea>
        </div>
      </div>

      <DialogFooter>
        <button
            @click="submitReview"
            class="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-md transition-colors flex items-center shadow-sm font-medium"
        >
          {{ isEditMode ? t('product.updateReview', 'Update Review') : t('product.submitReview', 'Submit Review') }}
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
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

.rounded-xl {
  border-radius: 0.75rem;
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

.badge-sale {
  background-color: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  border-radius: 0 0 0 0.5rem;
}

.rating {
  display: inline-flex;
  align-items: center;
}

[data-state="inactive"] {
  border-bottom-color: transparent !important;
}

.TabsList {
  border-bottom: 1px solid #e5e7eb;
}

.product-title-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.25rem;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  }
}

.sku-badge {
  display: inline-flex;
  align-items: center;
  background-color: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  @media (max-width: 639px) {
    align-self: flex-start;
  }
}

input[type="number"] {

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  text-align: center;
  padding-left: 0;
  padding-right: 0;
  font-weight: 500;
}
</style>

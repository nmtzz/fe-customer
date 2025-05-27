<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {useQuery} from '@tanstack/vue-query';
import {useI18n} from 'vue-i18n';
import axios from 'axios';
import {Carousel, CarouselContent, CarouselItem,} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import getSlug from "@/utils/slugUtil.js";
import {useRouter} from 'vue-router';
import ProductCard from '@/components/ProductCard.vue';

import heroImage1 from '../assets/images/hero-image-1.jpg';
import heroImage2 from '../assets/images/hero-image-2.jpg';
import heroImage3 from '../assets/images/hero-image-3.jpg';
import viewedProductsStore from "@/stores/viewedProductsStore.js";

const heroImages = [
  {src: heroImage1, alt: "Tech gadgets collection"},
  {src: heroImage2, alt: "Modern tech devices"},
  {src: heroImage3, alt: "Workspace with gadgets"}
];

const {t, locale} = useI18n();
const router = useRouter();

const currentSlide = ref(0);

const startCarousel = () => {
  setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % heroImages.length;
  }, 5000);
};

const changeSlide = (index) => {
  currentSlide.value = index;
};

onMounted(() => {
  startCarousel();
  document.title = t('common.home', 'Home');
});

const {data: productsData, isLoading, isError} = useQuery({
  queryKey: ['products', locale.value],
  queryFn: async () => {
    try {

      const {data} = await axios.get('/products');
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return {result: []};
    }
  }
});
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

const products = computed(() => {
  if (!productsData.value || !productsData.value.result) return [];
  return productsData.value.result.filter(product => product.status && product.categoryStatus);
});

const bestSellingProducts = computed(() => {
  if (!products.value) return [];
  return [...products.value]
      .filter(product => product.sold && product.sold > 0)
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 12);
});

const newProducts = computed(() => {
  if (!products.value) return [];
  return [...products.value]
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .slice(0, 12);
});

const countdownInterval = ref(null);
const countdown = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0
});

const startCountdown = (endDate) => {
  if (!endDate) return;

  const updateCountdown = () => {
    const now = new Date();
    const end = new Date(endDate);
    const timeRemaining = end - now;

    if (timeRemaining <= 0) {
      countdown.value = {days: 0, hours: 0, minutes: 0, seconds: 0};
      clearInterval(countdownInterval.value);
      return;
    }

    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    countdown.value = {days, hours, minutes, seconds};
  };

  updateCountdown();
  countdownInterval.value = setInterval(updateCountdown, 1000);
};

const promotionEndDate = computed(() => {
  if (discountedProducts.value && discountedProducts.value.length > 0 && discountedProducts.value[0].promotionEndDate) {
    return discountedProducts.value[0].promotionEndDate;
  }
  return null;
});

const discountedProducts = computed(() => {
  if (!products.value) return [];
  const discounted = [...products.value]
      .filter(product => product.discountPercentage && product.discountPercentage > 0 && product.promotionEndDate)
      .sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0))
      .slice(0, 12);

  if (discounted.length > 0 && discounted[0].promotionEndDate) {
    startCountdown(discounted[0].promotionEndDate);
  }

  return discounted;
});

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

onMounted(() => {
  startCarousel();
});

onBeforeUnmount(() => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value);
  }
});
</script>

<template>
  <div class="bg-white">
    <section class="bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div class="text-center sm:text-left space-y-1 order-2 sm:order-1">
          <h1 class="text-3xl font-bold text-white">
            {{ t('home.heroTitle') || 'Latest Tech Gadgets' }}
          </h1>
          <p class="text-base text-indigo-100 mb-2">
            {{ t('home.heroSubtitle') || 'Discover amazing products at unbeatable prices.' }}
          </p>
          <div class="flex flex-wrap justify-center sm:justify-start gap-2">
            <router-link to="/all-products" class="btn-hero-primary">
              {{ t('home.shopNow') || 'Shop Now' }}
            </router-link>
            <router-link to="/categories" class="btn-hero-outline">
              {{ t('home.browseCategories') || 'Browse Categories' }}
            </router-link>
          </div>
        </div>
        <div class="order-1 sm:order-2 relative">

          <div class="carousel-container rounded-md">

            <div v-for="(image, index) in heroImages" :key="index"
                 class="carousel-slide"
                 :class="{ active: currentSlide === index }">
              <img
                  :src="image.src"
                  :alt="image.alt"
                  class="carousel-image"
              />
              <div class="carousel-overlay"></div>
            </div>

            <div class="carousel-dots">
              <button
                  v-for="(_, index) in heroImages"
                  :key="index"
                  @click="changeSlide(index)"
                  class="carousel-dot"
                  :class="{ active: currentSlide === index }"
                  aria-label="Change slide"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-8 bg-white">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-4">
        <div class="text-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('home.bestSellers') || 'Best Sellers' }}</h2>
          <p class="text-gray-600 max-w-3xl mx-auto text-sm">
            {{ t('home.bestSellersSubtitle') || 'Our most popular products based on sales. Updated daily.' }}</p>
          <div class="w-20 h-1 bg-primary-500 mx-auto mt-3"></div>
        </div>

        <div v-if="isLoading" class="py-8 text-center">
          <div
              class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="mt-4 text-gray-600">{{ t('common.loading') }}</p>
        </div>

        <div v-else-if="isError" class="py-8 text-center">
          <p class="text-red-500">{{ t('home.errorLoading') || 'Error loading products' }}</p>
        </div>

        <div v-else-if="bestSellingProducts.length === 0" class="py-8 text-center">
          <p class="text-gray-500">{{ t('home.noProductsFound') || 'No products found' }}</p>
        </div>

        <div v-else>
          <Carousel class="w-full" :plugins="[Autoplay({ delay: 3000, stopOnInteraction: false })]">
            <CarouselContent class="-ml-2 md:-ml-4">
              <CarouselItem v-for="product in bestSellingProducts.slice(0, 12)" :key="product.id"
                            class="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
                <ProductCard :product="product" badge="bestseller"/>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>

    <section class="py-8 bg-gray-50">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-4">
        <div class="text-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('home.newArrivals') || 'New Arrivals' }}</h2>
          <p class="text-gray-600 max-w-3xl mx-auto text-sm">{{
              t('home.newArrivalsSubtitle') || 'Check out our latest products and be the first to get the newest tech.'
            }}</p>
          <div class="w-20 h-1 bg-primary-500 mx-auto mt-3"></div>
        </div>

        <div v-if="isLoading" class="py-8 text-center">
          <div
              class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="mt-4 text-gray-600">{{ t('common.loading') }}</p>
        </div>

        <div v-else-if="isError" class="py-8 text-center">
          <p class="text-red-500">{{ t('home.errorLoading') || 'Error loading products' }}</p>
        </div>

        <div v-else-if="newProducts.length === 0" class="py-8 text-center">
          <p class="text-gray-500">{{ t('home.noProductsFound') || 'No products found' }}</p>
        </div>

        <div v-else>
          <Carousel class="w-full" :plugins="[Autoplay({ delay: 4000, stopOnInteraction: false })]">
            <CarouselContent class="-ml-2 md:-ml-4">
              <CarouselItem v-for="product in newProducts.slice(0, 12)" :key="product.id"
                            class="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
                <ProductCard :product="product" badge="new"/>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>

    <section v-if="!isLoading && !isError && discountedProducts.length > 0" class="py-8 bg-white">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-4">
        <div class="text-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('home.deals') || 'Special Deals' }}</h2>
          <p class="text-gray-600 max-w-3xl mx-auto text-sm">{{
              t('home.dealsSubtitle') || 'Limited time offers on select products. Grab them before they\'re gone!'
            }}</p>
          <div class="w-20 h-1 bg-red-500 mx-auto mt-3"></div>

          <div v-if="promotionEndDate"
               class="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg inline-flex items-center">
            <div class="text-base font-semibold text-red-700 mr-2">{{ t('home.offerEndsIn') || 'Offer ends in:' }}</div>
            <div class="grid grid-flow-col gap-1 text-center auto-cols-max">
              <div v-if="countdown.days > 0" class="flex flex-col p-1 bg-white rounded-md text-red-700">
                <span class="countdown font-mono text-xl">
                  <span>{{ countdown.days }}</span>
                </span>
                <span class="text-xs">{{ t('home.days') || 'days' }}</span>
              </div>
              <div class="flex flex-col p-1 bg-white rounded-md text-red-700">
                <span class="countdown font-mono text-xl">
                  <span>{{ countdown.hours }}</span>
                </span>
                <span class="text-xs">{{ t('home.hours') || 'hours' }}</span>
              </div>
              <div class="flex flex-col p-1 bg-white rounded-md text-red-700">
                <span class="countdown font-mono text-xl">
                  <span>{{ countdown.minutes }}</span>
                </span>
                <span class="text-xs">{{ t('home.min') || 'min' }}</span>
              </div>
              <div class="flex flex-col p-1 bg-white rounded-md text-red-700">
                <span class="countdown font-mono text-xl">
                  <span>{{ countdown.seconds }}</span>
                </span>
                <span class="text-xs">{{ t('home.sec') || 'sec' }}</span>
              </div>
            </div>
          </div>
        </div>

        <Carousel class="w-full" :plugins="[Autoplay({ delay: 3500, stopOnInteraction: false })]">
          <CarouselContent class="-ml-2 md:-ml-4">
            <CarouselItem v-for="product in discountedProducts.slice(0, 12)" :key="product.id"
                          class="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
              <ProductCard :product="product"/>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    </section>

    <section v-if="!isLoadingViewedProducts && !isErrorViewedProducts && viewedProductsData?.result?.length > 0"
             class="py-8 bg-gray-50">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-4">
        <div class="text-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('home.recentlyViewed') || 'Recently Viewed' }}</h2>
          <p class="text-gray-600 max-w-3xl mx-auto text-sm">{{
              t('home.recentlyViewedSubtitle') || 'Products you\'ve recently checked out. Continue exploring where you left off.'
            }}</p>
          <div class="w-20 h-1 bg-purple-500 mx-auto mt-3"></div>
        </div>

        <div v-if="isLoadingViewedProducts" class="py-8 text-center">
          <div
              class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="mt-4 text-gray-600">{{ t('common.loading') }}</p>
        </div>

        <div v-else-if="isErrorViewedProducts" class="py-8 text-center">
          <p class="text-red-500">{{ t('home.errorLoading') || 'Error loading products' }}</p>
        </div>

        <div v-else>
          <Carousel class="w-full" :plugins="[Autoplay({ delay: 4500, stopOnInteraction: false })]">
            <CarouselContent class="-ml-2 md:-ml-4">
              <CarouselItem v-for="product in viewedProductsData.result.slice(0, 12)" :key="product.id"
                            class="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
                <ProductCard :product="product" badge="viewed"/>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
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

.rounded-xl {
  border-radius: 0.75rem;
}

.border {
  border-width: 1px;
  border-style: solid;
}

.carousel-container {
  position: relative;
  height: 220px;
  overflow: hidden;
  background-color: transparent;
  border: none;
  width: 100%;
  border-radius: 0.375rem;
}

@media (min-width: 640px) {
  .carousel-container {
    height: 260px;
  }
}

@media (min-width: 768px) {
  .carousel-container {
    height: 300px;
  }
}

.carousel-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.carousel-slide.active {
  opacity: 1;
  z-index: 1;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 0.375rem;
  padding: 0;
  max-width: none;
  max-height: none;
}

.btn-hero-primary {
  border-radius: 0.25rem;
  background-color: white;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #4f46e5;
  transition: background-color 0.2s;
}

.btn-hero-primary:hover {
  background-color: #eef2ff;
}

.btn-hero-outline {
  border-radius: 0.25rem;
  border: 1px solid white;
  background-color: transparent;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: white;
  transition: background-color 0.2s;
}

.btn-hero-outline:hover {
  background-color: rgba(255, 255, 255, 0.1);
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
  padding: 0.3rem 0.7rem;
  border-radius: 0 0 0 0.5rem;
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

.btn-outline {
  border: 2px solid var(--color-primary-600, #2563eb);
  color: var(--color-primary-600, #2563eb);
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background-color: var(--color-primary-600, #2563eb);
    color: white;
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

.carousel-container {
  position: relative;
  height: 300px;
  overflow: hidden;
  background-color: transparent;
  border: none;
  width: 100%;
  border-radius: 0.375rem;
}

@media (min-width: 640px) {
  .carousel-container {
    height: 350px;
  }
}

@media (min-width: 768px) {
  .carousel-container {
    height: 400px;
  }
}

.carousel-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.carousel-slide.active {
  opacity: 1;
  z-index: 1;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 0.375rem;
  padding: 0;
  max-width: none;
  max-height: none;
}

.carousel-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(79, 70, 229, 0.05) 0%, rgba(217, 70, 239, 0.15) 100%);
  mix-blend-mode: normal;
  pointer-events: none;
  border-radius: 0.375rem;
}

.carousel-dots {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 10;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  transition: background-color 0.3s ease;
}

.carousel-dot.active {
  background-color: white;
}

.carousel-dot:hover {
  background-color: rgba(255, 255, 255, 0.8);
}

.countdown {
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdown span {
  min-width: 1.5em;
  text-align: center;
}

.bg-red-50 {
  background-color: #fef2f2;
}

.text-red-700 {
  color: #b91c1c;
}

.border-red-100 {
  border-color: #fee2e2;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>

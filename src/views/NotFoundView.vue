<script setup>
import {useRouter} from 'vue-router';
import {useI18n} from 'vue-i18n';
import {ArrowLeft, Frown, Home} from 'lucide-vue-next';
import { onMounted } from 'vue';

const router = useRouter();
const {t} = useI18n();

onMounted(() => {
  document.title = t('notFound.title', 'Page Not Found');
});

const goHome = () => {
  router.push('/');
};

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-16 flex flex-col items-center justify-center">

    <div class="text-center">
      <h1 class="text-7xl sm:text-9xl font-bold text-primary-600 mb-4">404</h1>
      <h2 class="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4">{{ t('notFound.title', 'Page Not Found') }}</h2>
      <p class="text-base sm:text-lg text-gray-600 max-w-md mx-auto mb-8">
        {{
          t('notFound.description', "We couldn't find the page you're looking for. It might have been moved or doesn't exist.")
        }}
      </p>
    </div>

    <div class="my-8">
      <div class="w-64 h-64 sm:w-80 sm:h-80 bg-gray-50 rounded-full flex items-center justify-center">
        <div class="text-center">
          <Frown class="h-32 w-32 mx-auto text-gray-300" stroke-width="1"/>
          <span class="block text-gray-500 text-lg mt-4">{{ t('notFound.oops', 'Oops!') }}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 mt-4">
      <button
          @click="goHome"
          class="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
      >
        <Home class="h-5 w-5 mr-2" stroke-width="2"/>
        {{ t('notFound.goHome', 'Go to Homepage') }}
      </button>
      <button
          @click="goBack"
          class="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
      >
        <ArrowLeft class="h-5 w-5 mr-2" stroke-width="2"/>
        {{ t('notFound.goBack', 'Go Back') }}
      </button>
    </div>

    <div class="mt-12 text-center">
      <p class="text-sm text-gray-500">
        {{ t('notFound.lookingFor', 'Looking for something specific?') }}
      </p>
      <p class="text-sm text-gray-500">
        {{ t('notFound.trySearch', 'Try using the search at the top of the page') }}
      </p>
    </div>
  </div>
</template>

<style scoped>

</style>

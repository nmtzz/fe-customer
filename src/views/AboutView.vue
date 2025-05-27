<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const team = ref([
  {
    name: 'Trần Hoàng Long',
    role: 'Leader',
    gender: 'male'
  },
  {
    name: 'Nguyễn Minh Thuận',
    role: 'Member',
    gender: 'male'
  },
  {
    name: 'Hoàng Thị Thu Hà',
    role: 'Member',
    gender: 'female'
  },
  {
    name: 'Bạch Quốc Khánh',
    role: 'Member',
    gender: 'male'
  },
  {
    name: 'Lê Xuân Dương',
    role: 'Member',
    gender: 'male'
  }
]);

const companyStats = ref([
  { value: '2025', label: t('about.founded', 'Founded') },
  { value: '25+', label: t('about.teamMembers', 'Team Members') },
  { value: '10K+', label: t('about.happyCustomers', 'Happy Customers') },
  { value: '150+', label: t('about.products', 'Products') }
]);

onMounted(() => {
  document.title = t('about.title', 'About Us');
});
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">

    <section class="bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500 rounded-lg overflow-hidden mb-12">
      <div class="py-12 px-6 md:px-12 text-center text-white">
        <h1 class="text-3xl md:text-4xl font-bold mb-4">{{ t('about.title', 'About Gadgetify') }}</h1>
        <p class="text-lg text-indigo-100 max-w-3xl mx-auto">
          {{ t('about.subtitle', 'Your trusted destination for the latest tech gadgets and innovations') }}
        </p>
      </div>
    </section>

    <section class="mb-16">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('about.ourMission', 'Our Mission') }}</h2>
        <div class="w-20 h-1 bg-primary-500 mx-auto mt-2"></div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p class="text-gray-700 text-center max-w-3xl mx-auto leading-relaxed">
          {{ t('about.missionText', 'At Gadgetify, we are dedicated to bringing the latest technology to everyone. We believe in providing high-quality products at competitive prices with exceptional customer service. Our goal is to make cutting-edge technology accessible to all and help our customers stay connected in this fast-paced digital world.') }}
        </p>
      </div>
    </section>

    <section class="mb-16">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="(stat, index) in companyStats" :key="index" class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <div class="text-2xl md:text-3xl font-bold text-primary-600">{{ stat.value }}</div>
          <div class="text-sm text-gray-600 mt-1">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <section class="mb-16">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('about.ourStory', 'Our Story') }}</h2>
        <div class="w-20 h-1 bg-primary-500 mx-auto mt-2"></div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="prose max-w-3xl mx-auto">
          <p class="text-gray-700 mb-4">
            {{ t('about.storyPart1', 'Founded in 2015, Gadgetify started as a small online store with a passion for technology and innovation. What began as a modest selection of smartphone accessories has grown into a comprehensive tech marketplace offering everything from smartphones and laptops to smart home devices and wearables.') }}
          </p>
          <p class="text-gray-700 mb-4">
            {{ t('about.storyPart2', 'Our journey has been defined by our commitment to quality and customer satisfaction. We carefully curate our product selection, partnering with leading brands and emerging innovators to bring you the best technology has to offer.') }}
          </p>
          <p class="text-gray-700">
            {{ t('about.storyPart3', 'Today, we serve customers nationwide with fast shipping, competitive prices, and dedicated customer support. As technology continues to evolve, we remain committed to being your trusted destination for all things tech.') }}
          </p>
        </div>
      </div>
    </section>

    <section class="mb-16">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('about.ourTeam', 'Our Team') }}</h2>
        <div class="w-20 h-1 bg-primary-500 mx-auto mt-2"></div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div v-for="(member, index) in team" :key="index" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="w-full h-48 bg-primary-100 flex items-center justify-center">

            <svg v-if="member.gender === 'female'" xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>

            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="p-4 text-center">
            <h3 class="font-bold text-gray-900">{{ member.name }}</h3>
            <p class="text-sm text-gray-600">{{ member.role }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-8">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('about.contactUs', 'Contact Us') }}</h2>
        <div class="w-20 h-1 bg-primary-500 mx-auto mt-2"></div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div class="text-center">
            <div class="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="font-bold text-gray-900 mb-1">{{ t('about.email', 'Email') }}</h3>
            <p class="text-sm text-gray-600">support@gadgetify.com</p>
          </div>

          <div class="text-center">
            <div class="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 class="font-bold text-gray-900 mb-1">{{ t('about.phone', 'Phone') }}</h3>
            <p class="text-sm text-gray-600">0961 077 831</p>
          </div>

          <div class="text-center">
            <div class="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="font-bold text-gray-900 mb-1">{{ t('about.address', 'Address') }}</h3>
            <p class="text-sm text-gray-600">Hanoi Viet Nam</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.bg-primary-100 {
  background-color: #e0e7ff;
}

.text-primary-600 {
  color: #4f46e5;
}

.bg-primary-500 {
  background-color: #6366f1;
}

.prose p {
  margin-bottom: 1rem;
  line-height: 1.7;
}
</style>

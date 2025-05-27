<script setup>
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import ChatBot from "@/components/ChatBot.vue";
import {Toaster} from '@/components/ui/sonner';
import {onMounted, ref} from 'vue';
import {getExchangeRate} from "@/utils/localeUtil.js";
import {useI18n} from "vue-i18n";

getExchangeRate()
const {d} = useI18n();
const shouldShowFooter = ref(false);

const onRouterViewLoaded = () => {

  setTimeout(() => {
    shouldShowFooter.value = true;
  }, 100);
};

onMounted(() => {

  onRouterViewLoaded();
});
</script>

<template>
  <div>
    <Toaster :rich-colors="true" :expand="true"></Toaster>
    <app-header></app-header>

    <router-view :key="$route.fullPath" v-slot="{ Component }">
      <keep-alive>
        <component :key="$route.fullPath" :is="Component" @vue:mounted="onRouterViewLoaded"/>
      </keep-alive>
    </router-view>

    <app-footer v-if="shouldShowFooter"></app-footer>

    <ChatBot/>
  </div>
</template>

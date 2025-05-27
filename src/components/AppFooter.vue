<template>

  <FooterContent/>
</template>

<script setup>
import {defineAsyncComponent, h} from 'vue';

const LoadingPlaceholder = () => h('div', {class: 'footer-placeholder'});

const FooterContent = defineAsyncComponent({
  loader: () => import('./FooterContent.vue'),
  loadingComponent: LoadingPlaceholder,
  delay: 0,
  timeout: 3000,
  errorComponent: LoadingPlaceholder,
  onError(error, retry, fail, attempts) {
    if (attempts <= 3) {
      retry();
    } else {
      fail();
    }
  }
});
</script>

<style scoped>
.footer-placeholder {
  height: 20px;
  width: 100%;
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';

const { t } = useI18n();

const form = ref({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: ''
});

const isSubmitting = ref(false);

const submitForm = async () => {
  if (!form.value.name || !form.value.email || !form.value.message) {
    toast.error(t('contact.formError', 'Please fill in all required fields'));
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.value.email)) {
    toast.error(t('contact.invalidEmail', 'Please enter a valid email address'));
    return;
  }

  isSubmitting.value = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success(t('contact.formSuccess', 'Your message has been sent! We\'ll get back to you soon.'));
    form.value = {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    };
  } catch (error) {
    toast.error(t('contact.formError', 'There was an error submitting your message. Please try again.'));
  } finally {
    isSubmitting.value = false;
  }
};

document.title = t('contact.title', 'Contact Us');
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">

    <section class="bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500 rounded-lg overflow-hidden mb-12">
      <div class="py-12 px-6 md:px-12 text-center text-white">
        <h1 class="text-3xl md:text-4xl font-bold mb-4">{{ t('contact.title', 'Contact Us') }}</h1>
        <p class="text-lg text-indigo-100 max-w-3xl mx-auto">
          {{ t('contact.subtitle', 'Have a question or need assistance? We\'re here to help!') }}
        </p>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

      <div class="lg:col-span-1">
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full">
          <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('contact.getInTouch', 'Get in Touch') }}</h2>

          <div class="space-y-6">
            <div class="flex items-start">
              <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 text-sm mb-1">{{ t('contact.email', 'Email Us') }}</h3>
                <p class="text-gray-700">support@gadgetify.com</p>
              </div>
            </div>

            <div class="flex items-start">
              <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 text-sm mb-1">{{ t('contact.phone', 'Call Us') }}</h3>
                <p class="text-gray-700">0961077831</p>
              </div>
            </div>

            <div class="flex items-start">
              <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 text-sm mb-1">{{ t('contact.visit', 'Visit Us') }}</h3>
                <p class="text-gray-700">Hanoi Viet Nam</p>
              </div>
            </div>

            <div class="flex items-start">
              <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 text-sm mb-1">{{t('contact.businessHours', 'Working Hours')}}</h3>
                <p class="text-gray-700">00:00 - 00:00</p>
              </div>
            </div>
          </div>

          <div class="mt-8">
            <h3 class="font-semibold text-gray-900 text-sm mb-3">{{ t('contact.followUs', 'Follow Us') }}</h3>
            <div class="flex space-x-4">
              <a href="#" class="h-10 w-10 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-primary-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-facebook" viewBox="0 0 16 16">
                  <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
                </svg>
              </a>
              <a href="#" class="h-10 w-10 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-primary-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-twitter" viewBox="0 0 16 16">
                  <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
                </svg>
              </a>
              <a href="#" class="h-10 w-10 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-primary-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-instagram" viewBox="0 0 16 16">
                  <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
              </a>
              <a href="#" class="h-10 w-10 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-primary-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-linkedin" viewBox="0 0 16 16">
                  <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('contact.sendMessage', 'Send Us a Message') }}</h2>

          <form @submit.prevent="submitForm" class="space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('contact.name', 'Your Name') }} *
                </label>
                <input
                  type="text"
                  id="name"
                  v-model="form.name"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('contact.emailAddress', 'Email Address') }} *
                </label>
                <input
                  type="email"
                  id="email"
                  v-model="form.email"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('contact.phoneNumber', 'Phone Number') }}
                </label>
                <input
                  type="tel"
                  id="phone"
                  v-model="form.phone"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label for="subject" class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('contact.subject', 'Subject') }}
                </label>
                <input
                  type="text"
                  id="subject"
                  v-model="form.subject"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label for="message" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('contact.message', 'Your Message') }} *
              </label>
              <textarea
                id="message"
                v-model="form.message"
                rows="6"
                class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                required
              ></textarea>
            </div>

            <div>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center justify-center disabled:opacity-70"
              >
                <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isSubmitting ? t('contact.sending', 'Sending...') : t('contact.sendMessage', 'Send Message') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <section class="mt-12">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('contact.faq', 'Frequently Asked Questions') }}</h2>
        <div class="w-20 h-1 bg-primary-500 mx-auto mt-2"></div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="max-w-3xl mx-auto divide-y divide-gray-200">
          <div class="py-4">
            <details class="group">
              <summary class="flex justify-between items-center font-medium cursor-pointer list-none">
                <span>{{ t('contact.faq1Title', 'How long does shipping take?') }}</span>
                <span class="transition group-open:rotate-180">
                  <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
            </details>
          </div>

          <div class="py-4">
            <details class="group">
              <summary class="flex justify-between items-center font-medium cursor-pointer list-none">
                <span>{{ t('contact.faq2Title', 'What is your return policy?') }}</span>
                <span class="transition group-open:rotate-180">
                  <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
            </details>
          </div>

          <div class="py-4">
            <details class="group">
              <summary class="flex justify-between items-center font-medium cursor-pointer list-none">
                <span>{{ t('contact.faq3Title', 'Do you offer international shipping?') }}</span>
                <span class="transition group-open:rotate-180">
                  <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
            </details>
          </div>

          <div class="py-4">
            <details class="group">
              <summary class="flex justify-between items-center font-medium cursor-pointer list-none">
                <span>{{ t('contact.faq4Title', 'How can I track my order?') }}</span>
                <span class="transition group-open:rotate-180">
                  <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
            </details>
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

.bg-primary-200 {
  background-color: #c7d2fe;
}

.text-primary-600 {
  color: #4f46e5;
}

.bg-primary-500 {
  background-color: #6366f1;
}

.bg-primary-600 {
  background-color: #4f46e5;
}

.hover\:bg-primary-700:hover {
  background-color: #4338ca;
}

.focus\:ring-primary-500:focus {
  --tw-ring-color: #6366f1;
}

.focus\:border-primary-500:focus {
  border-color: #6366f1;
}

details summary::-webkit-details-marker {
  display: none;
}
</style>

<script setup>
import {computed, onMounted, ref} from "vue";
import {useI18n} from "vue-i18n";
import axios from "axios";
import {useMutation, useQuery, useQueryClient} from "@tanstack/vue-query";
import {toast} from 'vue-sonner'
import {Bell, ChevronDown, CircleUserRound, Globe, Menu, Phone, Search, ShoppingCart, X} from 'lucide-vue-next';
import {useRouter} from 'vue-router';
import {accountModalStore} from '@/stores/accountModalStore';
import {userData} from "@/utils/authUtil.js";
import getSlug from "@/utils/slugUtil.js";
import {refreshExchangeRate, displayDate} from "@/utils/localeUtil.js";
import {useTokenClient} from "vue3-google-signin";
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

const router = useRouter();
const queryClient = useQueryClient();
const isMenuOpen = ref(false);
const isLocaleDropdownOpen = ref(false);
const isAccountDropdownOpen = ref(false);
const isNotificationDropdownOpen = ref(false);
const isCategoriesDropdownOpen = ref(false);
const searchQuery = ref('');

const loginForm = ref({email: '', password: ''});
const registerForm = ref({fullName: '', email: '', password: '', role: 'CUSTOMER', status: true});

const availableLocales = ref([
  {code: 'en', name: 'English'},
  {code: 'vi', name: 'Tiếng Việt'}
]);
const {locale, t} = useI18n();

onMounted(() => {
  const savedLocale = localStorage.getItem('locale');
  if (savedLocale && locale.value !== savedLocale) {
    locale.value = savedLocale;
  }

});
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  isAccountDropdownOpen.value = false;
  toast.success(t('header.logoutSuccess'));

  window.location.reload();
};

const changeLocale = (newLocale) => {
  axios.defaults.headers.common['Accept-Language'] = newLocale.code;
  locale.value = newLocale.code;
  localStorage.setItem('locale', newLocale.code);

  refreshExchangeRate(newLocale.code);

  window.location.reload();
}

const currentLocale = computed(() => {
  return availableLocales.value.find(l => l.code === locale.value);
})

const {data: cartData, isLoading: isCartLoading} = useQuery({
  queryKey: ['cart'],
  queryFn: async () => {
    try {
      const {data} = await axios.get('/carts');
      return data;
    } catch (error) {
      console.error("Error fetching cart:", error);
      return {result: []};
    }
  },
  enabled: computed(() => !!userData.user),
  refetchInterval: 300000,
  refetchOnWindowFocus: true,
  refetchOnMount: true
});

const cartItemCount = computed(() => {
  if (!cartData.value || !cartData.value.result) return 0;

  return cartData.value.result.reduce((total, item) => {
    return total + (item.quantity || 0);
  }, 0);
});

const {data: rawCategories, isPending, isError} = useQuery({
  queryKey: ['categories', locale],
  queryFn: async () => {
    const {data} = await axios.get('/categories');
    return data;
  }
})
const prefetchOnMouseOver = (categoryId) => {
  if (queryClient.getQueryData(['products', locale.value, categoryId])) return;
  queryClient.prefetchQuery({
    queryKey: ['products', locale.value, categoryId],
    queryFn: async () => {
      const {data} = await axios.get('/products');
      return data;
    }
  });
};
const categories = computed(() => {
  if (!rawCategories.value || !rawCategories.value?.result) return [];
  return rawCategories.value?.result?.filter(c => c.status);
});

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      name: 'search',
      query: {q: searchQuery.value}
    });
  }
}

const toggleMobileMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
}

const closeMobileMenu = () => {
  if (isMenuOpen.value) {
    isMenuOpen.value = false;
  }
}

const closeLocaleDropdown = () => {
  isLocaleDropdownOpen.value = false;
}

const closeAccountDropdown = () => {
  isAccountDropdownOpen.value = false;
}

const closeNotificationDropdown = () => {
  isNotificationDropdownOpen.value = false;
}

const closeCategoriesDropdown = () => {
  isCategoriesDropdownOpen.value = false;
}

const loginMutation = useMutation({
  mutationFn: async (credentials) => {
    const response = await axios.post('/users/login', credentials);
    return response.data;
  },
  onSuccess: (data) => {
    if (data.success && data.result) {
      const role = data.result.role;
      if (role === 'STAFF' || role === 'ADMIN') {
        toast.error(t('auth.staffAccountError'));
        return;
      }
      const {token} = data.result;

      localStorage.setItem('user', JSON.stringify({
        fullName: data.result.fullName,
        email: data.result.email,
        phoneNumber: data?.result?.phoneNumber || '',
        pictureUrl: data?.result?.pictureUrl || '',
        provider: data?.result?.provider || '',
      }));
      localStorage.setItem('token', token);
      toast.success(t('auth.loginSuccess', 'Login successful'), {
        description: t('auth.redirectShortly', 'You will be redirected shortly...'),
      });

      loginForm.value = {email: '', password: ''};
      accountModalStore.closeLoginModal();

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast.error(t('auth.loginFailed', 'Login failed'), {
        description: data.message || t('auth.invalidCredentials', 'Invalid email or password'),
      });
    }
  }
});

const registerMutation = useMutation({
  mutationFn: async (userData) => {
    const response = await axios.post('/users/register', userData);
    return response.data;
  },
  onSuccess: (data) => {
    if (data.success && data.result) {
      const {token} = data.result;
      localStorage.setItem('user', JSON.stringify({
        fullName: data.result.fullName,
        email: data.result.email,
      }));
      localStorage.setItem('token', token);

      toast.success(t('auth.registerSuccess', 'Registration successful'), {
        description: t('auth.redirectShortly', 'You will be redirected shortly...'),
      });

      registerForm.value = {fullName: '', email: '', password: ''};
      accountModalStore.closeRegisterModal();

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast.error(t('auth.registerFailed', 'Registration failed'), {
        description: data.message || t('auth.accountCreationError', 'Could not create account'),
      });
    }
  }
});

const handleLogin = () => {
  loginMutation.mutate(loginForm.value);
};

const handleRegister = () => {
  registerMutation.mutate(registerForm.value);
};
const goToProductByCategory = (category) => {
  const categorySlug = getSlug(category.name);
  router.push({
    name: 'category',
    params: {slug: categorySlug, categoryId: category.id}
  });
}

const handleCartClick = () => {
  if (!userData.user) {
    accountModalStore.openLoginModal();
    toast.info(t('header.loginToViewCart', 'Please login to view your cart'));
  } else {
    router.push('/cart');
  }
};
const pictureUrl = computed(() => {
  console.log(userData?.user?.pictureUrl);
  return userData?.user?.pictureUrl || 'https://placehold.co/600x400/EEE/31343C';
});
const loginWithGoogleMutation = useMutation({
  mutationFn: async (googleUser) => {
    const response = await axios.post(`/users/login/google`, googleUser);
    return response.data;
  },
  onSuccess: (data) => {
    if (data.success && data.result) {
      const {token} = data.result;
      localStorage.setItem('user', JSON.stringify({
        fullName: data.result.fullName,
        email: data.result.email,
        pictureUrl: data?.result?.pictureUrl || '',
      }));
      localStorage.setItem('token', token);

      toast.success(t('auth.loginSuccess', 'Login successful'), {
        description: t('auth.redirectShortly', 'You will be redirected shortly...'),
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast.error(t('auth.googleLoginError'));
    }
  }
})
const handleOnSuccess = async (response) => {
  console.log("Access Token: ", response);
  const accessToken = response.access_token;
  const res = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
  console.log(res.data);
  const user = {
    email: res.data.email,
    fullName: res.data.name,
    pictureUrl: res.data.picture,
    provider: 'GOOGLE',
  }
  loginWithGoogleMutation.mutate(user);
};

const handleOnError = (errorResponse) => {
  console.log("Error: ", errorResponse);
  toast.error(t('auth.googleLoginError'));
};
const {isReady, login} = useTokenClient({
  onSuccess: handleOnSuccess,
  onError: handleOnError,
});
const notifications = useQuery({
  queryKey: ['notifications'],
  queryFn: async () => {
    const {data} = await axios.get('/notifications');
    return data;
  },
  enabled: computed(() => !!userData.user)
})

const notificationsList = computed(() => {
  return notifications.data?.value?.result || [];
});

const unreadNotificationsCount = computed(() => {
  return notificationsList.value.filter(notification => !notification.isRead).length;
});

const markAsReadMutation = useMutation({
  mutationFn: async (notificationId) => {
    await axios.patch(`/notifications/read/${notificationId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['notifications']);
  }
});

const markAllAsReadMutation = useMutation({
  mutationFn: async () => {
    return await axios.patch('/notifications/read-all');
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['notifications']);
    toast.success(t('notifications.allMarkedAsRead', 'All notifications marked as read'));
  }
});

const handleNotificationClick = (notification) => {
  if (!notification.isRead) {
    markAsReadMutation.mutate(notification.id);
  }

  if (notification.link) {
    router.push(notification.link);
  }

  closeNotificationDropdown();
};

</script>

<template>
  <header class="bg-white shadow-sm">

    <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
      <div class="flex justify-between items-center h-16">

        <div class="flex items-center lg:hidden">
          <button @click="toggleMobileMenu"
                  class="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500">
            <span class="sr-only">{{ isMenuOpen ? t('header.closeMenu') : t('header.openMenu') }}</span>
            <Menu v-if="!isMenuOpen" class="h-6 w-6" aria-hidden="true"/>
            <X v-else class="h-6 w-6" aria-hidden="true"/>
          </button>
        </div>

        <div class="flex-shrink-0 flex items-center">
          <router-link to="/" class="text-xl sm:text-2xl font-bold text-primary-600 hover:text-primary-700">
            GADGETIFY
          </router-link>
        </div>

        <div class="hidden sm:flex flex-1 justify-center px-2 lg:px-4">
          <div class="w-full max-w-lg">
            <div class="relative flex items-center">
              <input
                  v-model="searchQuery"
                  type="text"
                  @keyup.enter="handleSearch"
                  :placeholder="t('header.search')"
                  class="w-full h-10 px-3 sm:px-4 pr-10 sm:pr-12 rounded-full text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 cursor-pointer"
                   @click="handleSearch">
                <Search class="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600"/>
              </div>
            </div>
          </div>
        </div>

        <div class="hidden lg:flex lg:items-center lg:space-x-5 xl:space-x-6">

          <div v-if="userData.user" class="relative" v-click-outside="closeNotificationDropdown">
            <button @click="isNotificationDropdownOpen = !isNotificationDropdownOpen"
                    class="relative flex items-center text-gray-700 hover:text-gray-900 p-2 rounded-md">
              <Bell class="h-5 w-5"/>
              <transition name="badge">
                <span
                    v-if="unreadNotificationsCount > 0"
                    class="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full border border-white animate-pulse"
                >
                  {{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}
                </span>
              </transition>
            </button>

            <div v-if="isNotificationDropdownOpen"
                 class="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 max-h-96 overflow-hidden">

              <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-900">
                  {{ t('notifications.title', 'Notifications') }}
                </h3>
                <button
                    v-if="unreadNotificationsCount > 0"
                    @click="markAllAsReadMutation.mutate()"
                    :disabled="markAllAsReadMutation.isPending.value"
                    class="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  {{ t('notifications.markAllRead', 'Mark all as read') }}
                </button>
              </div>

              <div class="max-h-80 overflow-y-auto">
                <div v-if="notifications.isPending.value" class="px-4 py-6 text-center">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  <p class="text-sm text-gray-500 mt-2">{{ t('notifications.loading', 'Loading...') }}</p>
                </div>

                <div v-else-if="notificationsList.length === 0" class="px-4 py-6 text-center">
                  <Bell class="h-8 w-8 text-gray-400 mx-auto mb-2"/>
                  <p class="text-sm text-gray-500">{{ t('notifications.empty', 'No notifications yet') }}</p>
                </div>

                <div v-else>
                  <button
                      v-for="notification in notificationsList"
                      :key="notification.id"
                      @click="handleNotificationClick(notification)"
                      class="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                      :class="{ 'bg-blue-50': !notification.isRead }"
                  >
                    <div class="flex items-start space-x-3">

                      <div class="flex-shrink-0 mt-1">
                        <div
                            v-if="!notification.isRead"
                            class="w-2 h-2 bg-blue-600 rounded-full"
                        ></div>
                        <div v-else class="w-2 h-2"></div>
                      </div>

                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900 line-clamp-2"
                           :class="{ 'font-medium': !notification.isRead }">
                          {{ notification.content }}
                        </p>
                        <p class="text-xs text-gray-500 mt-1">
                          {{ displayDate(notification.createdAt) }}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
                             </div>
             </div>
          </div>

          <div class="relative" v-click-outside="closeLocaleDropdown">
            <button @click="isLocaleDropdownOpen = !isLocaleDropdownOpen"
                    class="flex items-center text-gray-700 hover:text-gray-900">
              <Globe class="h-5 w-5 mr-1"/>
              <span class="text-sm font-medium">{{ currentLocale.name }}</span>
              <ChevronDown class="h-4 w-4 ml-1" :class="{'transform rotate-180': isLocaleDropdownOpen}"/>
            </button>
            <div v-if="isLocaleDropdownOpen"
                 class="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div class="py-1">
                <a
                    v-for="loc in availableLocales"
                    :key="loc.code"
                    @click="changeLocale(loc); isLocaleDropdownOpen = false"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    :class="{'bg-gray-100': loc.code === locale.value}"
                >
                  {{ loc.name }}
                </a>
              </div>
            </div>
          </div>

          <div class="relative" v-click-outside="closeAccountDropdown">
            <button @click="isAccountDropdownOpen = !isAccountDropdownOpen"
                    class="flex items-center text-gray-700 hover:text-gray-900">
              <Avatar v-if="userData?.user?.pictureUrl" class="h-6 w-6 mr-1">
                <AvatarImage loading="lazy" alt="UserPicture" :src="pictureUrl"/>
                <AvatarFallback>
                  {{ userData?.user?.fullName?.[0] || userData?.user?.email?.[0] || '?' }}
                </AvatarFallback>
              </Avatar>
              <CircleUserRound v-else class="h-5 w-5 mr-1"/>
              <span v-if="userData.user" class="text-sm font-medium">
                {{ userData?.user?.fullName || userData?.user?.email }}
              </span>
              <span v-else class="text-sm font-medium">{{ t('header.account') }}</span>
              <ChevronDown class="h-4 w-4 ml-1" :class="{'transform rotate-180': isAccountDropdownOpen}"/>
            </button>
            <div v-if="isAccountDropdownOpen"
                 class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div v-if="!userData.user" class="py-1">
                <button @click="accountModalStore.openLoginModal(); isAccountDropdownOpen = false"
                        class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  {{ t('header.login') }}
                </button>
                <button @click="accountModalStore.openRegisterModal(); isAccountDropdownOpen = false"
                        class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  {{ t('header.register') }}
                </button>
              </div>

              <div v-else class="py-1">
                <div class="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                  {{ userData?.user?.email }}
                </div>
                <router-link to="/account" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  {{ t('header.myProfile') }}
                </router-link>
                <router-link to="/orders" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  {{ t('header.myOrders') }}
                </router-link>
                <div class="border-t border-gray-100"></div>
                <button @click="handleLogout"
                        class="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                  {{ t('header.logout') }}
                </button>
              </div>
            </div>
          </div>

          <div
              class="relative inline-block cursor-pointer"
              @click="handleCartClick"
              :title="userData.user && cartItemCount === 0 ? t('header.emptyCart', 'Your cart is empty') : ''"
          >
            <ShoppingCart class="h-6 w-6 text-gray-700 hover:text-gray-900"/>
            <transition name="badge">
              <span
                  v-if="userData.user && cartItemCount > 0"
                  class="absolute -top-3 -right-3 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full border-2 border-white shadow-sm animate-pulse"
                  style="z-index: 1;"
              >
                {{ cartItemCount > 9 ? '9+' : cartItemCount }}
              </span>
            </transition>
          </div>
        </div>

        <div class="flex items-center space-x-1 lg:hidden">

          <button @click="handleSearch" class="p-2 text-gray-700 hover:text-gray-900 focus:outline-none">
            <Search class="h-5 w-5"/>
          </button>

          <div
              class="p-2 relative inline-block cursor-pointer"
              @click="handleCartClick"
          >
            <ShoppingCart class="h-5 w-5 text-gray-700 hover:text-gray-900"/>
            <transition name="badge">
              <span
                  v-if="userData.user && cartItemCount > 0"
                  class="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full border-2 border-white shadow-sm animate-pulse"
                  style="z-index: 1;"
              >
                {{ cartItemCount > 9 ? '9+' : cartItemCount }}
              </span>
            </transition>
          </div>
        </div>
      </div>

      <div class="sm:hidden pb-3 px-1">
        <div class="relative flex items-center">
          <input
              v-model="searchQuery"
              type="text"
              @keyup.enter="handleSearch"
              :placeholder="t('header.search')"
              class="w-full h-10 px-3 pr-10 rounded-full text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <div class="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer" @click="handleSearch">
            <Search class="h-4 w-4 text-gray-400 hover:text-gray-600"/>
          </div>
        </div>
      </div>
    </div>

    <nav class="hidden md:block bg-gray-50 border-t border-gray-100">
      <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
        <div class="flex items-center justify-between h-12">

          <div class="flex items-center space-x-6">

            <div class="relative" v-click-outside="closeCategoriesDropdown">
              <button
                  @click="isCategoriesDropdownOpen = !isCategoriesDropdownOpen"
                  class="flex items-center text-sm font-medium text-gray-700 hover:text-primary-600 py-3 px-4 -ml-4 rounded-md hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span class="mr-2">{{ t('header.categories', 'Categories') }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" :class="{'transform rotate-180': isCategoriesDropdownOpen}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div v-if="isCategoriesDropdownOpen"
                   class="absolute left-0 mt-1 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 max-h-80 overflow-y-auto">

                <div v-if="isPending" class="px-4 py-6 text-center">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  <p class="text-sm text-gray-500 mt-2">{{ t('header.loading', 'Loading...') }}</p>
                </div>

                <div v-else-if="isError" class="px-4 py-3 text-center">
                  <p class="text-sm text-red-500">{{ t('header.errorLoading', 'Error loading categories') }}</p>
                </div>

                <div v-else class="py-2">
                  <button
                  v-for="category in categories"
                  :key="category.id"
                  @mouseover="prefetchOnMouseOver(category.id)"
                      @click="goToProductByCategory(category); closeCategoriesDropdown()"
                      class="w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div class="flex items-center">
                      <span class="font-medium">{{ category.name }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
              </div>
                  </button>

                  <div class="border-t border-gray-100 mt-2 pt-2">
                    <router-link
                        to="/categories"
                        @click="closeCategoriesDropdown()"
                        class="w-full text-left block px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <div class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        {{ t('header.viewAllCategories', 'View All Categories') }}
                      </div>
                    </router-link>
                  </div>
                </div>
              </div>
            </div>

            <router-link
                to="/about"
                class="text-sm font-medium text-gray-700 hover:text-primary-600 py-3 px-4 rounded-md hover:bg-gray-100 transition-colors"
            >
              {{ t('header.about', 'About') }}
            </router-link>

            <router-link
                to="/contact"
                class="text-sm font-medium text-gray-700 hover:text-primary-600 py-3 px-4 rounded-md hover:bg-gray-100 transition-colors"
            >
              {{ t('header.contact', 'Contact') }}
            </router-link>
          </div>

          <div class="flex items-center">
            <a target="_blank" href="https://zalo.me/0961077831" class="flex items-center text-sm font-medium text-gray-700 hover:text-primary-600 py-3 px-4 -mr-4 rounded-md hover:bg-gray-100 transition-colors">
              <Phone class="h-4 w-4 mr-2 text-primary-600" />
              <span>{{ t('header.hotline', 'Hotline') }}: <strong>0961 077 831</strong></span>
            </a>
          </div>
        </div>
      </div>
    </nav>

    <div v-if="isMenuOpen"
         class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
         @click="closeMobileMenu"></div>

    <transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 -translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-full"
    >
      <div v-if="isMenuOpen"
           class="fixed top-0 left-0 bottom-0 w-[280px] max-w-[80vw] bg-white shadow-lg z-50 overflow-y-auto lg:hidden">

        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <router-link to="/" class="text-xl font-bold text-primary-600" @click="closeMobileMenu">
            GADGETIFY
          </router-link>
          <button @click="closeMobileMenu" class="p-2 text-gray-500 hover:text-gray-700 focus:outline-none">
            <X class="h-5 w-5"/>
          </button>
        </div>

        <div class="px-2 py-3">

          <div v-if="userData.user" class="px-4 py-3 mb-2 bg-gray-50 rounded-md">
            <div class="text-sm font-medium text-gray-700">{{ userData.user.fullName }}</div>
            <div class="text-xs text-gray-500">{{ userData.user.email }}</div>
          </div>

          <div class="px-2 mb-4">
            <div class="relative">
              <input
                  v-model="searchQuery"
                  type="text"
                  @keyup.enter="handleSearch(); closeMobileMenu()"
                  :placeholder="t('header.search')"
                  class="w-full h-10 px-3 pr-10 rounded-md text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                   @click="handleSearch(); closeMobileMenu()">
                <Search class="h-4 w-4 text-gray-400 hover:text-gray-600"/>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {{ t('header.categories') }}
            </div>
            <div v-if="isPending" class="px-3 py-2 text-sm text-gray-500">{{ t('header.loading') }}</div>
            <div v-else-if="isError" class="px-3 py-2 text-sm text-red-500">{{ t('header.errorLoading') }}</div>
            <div v-else class="space-y-1">
              <div
                  v-for="category in categories"
                  :key="category.id"
                  @click="goToProductByCategory(category); closeMobileMenu()"
                  class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
              >
                {{ category.name }}
              </div>
            </div>
          </div>

          <div class="mb-4 border-t border-gray-200 pt-4">
            <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {{ t('header.account') }}
            </div>

            <div v-if="!userData.user" class="space-y-1">
              <button
                  @click="accountModalStore.openLoginModal(); closeMobileMenu()"
                  class="w-full text-left block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                {{ t('header.login') }}
              </button>
              <button
                  @click="accountModalStore.openRegisterModal(); closeMobileMenu()"
                  class="w-full text-left block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                {{ t('header.register') }}
              </button>
            </div>

            <div v-else class="space-y-1">
              <router-link
                  to="/account"
                  @click="closeMobileMenu()"
                  class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                {{ t('header.myProfile') }}
              </router-link>
              <router-link
                  to="/orders"
                  @click="closeMobileMenu()"
                  class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                {{ t('header.myOrders') }}
              </router-link>

              <Dialog>
                <DialogTrigger as-child>
                  <button
                      class="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Bell class="h-4 w-4 mr-2"/>
                    {{ t('notifications.title', 'Notifications') }}
                    <transition name="badge">
                      <span
                          v-if="unreadNotificationsCount > 0"
                          class="ml-auto inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full border border-white"
                      >
                        {{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}
                      </span>
                    </transition>
                  </button>
                </DialogTrigger>
                <DialogContent class="sm:max-w-[425px] max-h-[80vh] lg:hidden">
                  <DialogHeader>
                    <DialogTitle class="flex items-center justify-between">
                      {{ t('notifications.title', 'Notifications') }}
                      <button
                          v-if="unreadNotificationsCount > 0"
                          @click="markAllAsReadMutation.mutate()"
                          :disabled="markAllAsReadMutation.isPending.value"
                          class="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {{ t('notifications.markAllRead', 'Mark all as read') }}
                      </button>
                    </DialogTitle>
                  </DialogHeader>

                  <div class="max-h-[60vh] overflow-y-auto">
                    <div v-if="notifications.isPending.value" class="py-8 text-center">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      <p class="text-sm text-gray-500 mt-3">{{ t('notifications.loading', 'Loading...') }}</p>
                    </div>

                    <div v-else-if="notificationsList.length === 0" class="py-8 text-center">
                      <Bell class="h-12 w-12 text-gray-400 mx-auto mb-3"/>
                      <p class="text-gray-500">{{ t('notifications.empty', 'No notifications yet') }}</p>
                    </div>

                    <div v-else class="space-y-1">
                      <button
                          v-for="notification in notificationsList"
                          :key="notification.id"
                          @click="handleNotificationClick(notification)"
                          class="w-full text-left p-3 hover:bg-gray-50 rounded-md transition-colors"
                          :class="{ 'bg-blue-50': !notification.isRead }"
                      >
                        <div class="flex items-start space-x-3">

                          <div class="flex-shrink-0 mt-1">
                            <div
                                v-if="!notification.isRead"
                                class="w-3 h-3 bg-blue-600 rounded-full"
                            ></div>
                            <div v-else class="w-3 h-3"></div>
                          </div>

                          <div class="flex-1 min-w-0">
                            <p class="text-sm text-gray-900"
                               :class="{ 'font-medium': !notification.isRead }">
                              {{ notification.content }}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                              {{ displayDate(notification.createdAt) }}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <div
                  class="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                  @click="userData.user ? (router.push('/cart'), closeMobileMenu()) : (accountModalStore.openLoginModal(), toast.info(t('header.loginToViewCart', 'Please login to view your cart')), closeMobileMenu())"
              >
                <ShoppingCart class="h-4 w-4 mr-2"/>
                {{ t('header.cart') }}
                <transition name="badge">
                  <span
                      v-if="userData.user && cartItemCount > 0"
                      class="ml-auto inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full border border-white"
                  >
                    {{ cartItemCount > 9 ? '9+' : cartItemCount }}
                  </span>
                </transition>
              </div>

              <a href="tel:+1234567890" class="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                <Phone class="h-4 w-4 mr-2 text-primary-600"/>
                <span>{{ t('header.hotline', 'Hotline') }}: <strong>+1 (234) 567-890</strong></span>
              </a>
              <button
                  @click="handleLogout()"
                  class="w-full text-left block px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-gray-50"
              >
                {{ t('header.logout') }}
              </button>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-4">
            <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {{ t('header.language') }}
            </div>
            <div class="space-y-1">
              <button
                  v-for="loc in availableLocales"
                  :key="loc.code"
                  @click="changeLocale(loc); closeMobileMenu()"
                  class="w-full text-left flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  :class="{'bg-gray-100': loc.code === locale.value}"
              >
                {{ loc.name }}
                <span v-if="loc.code === locale.value" class="ml-auto text-primary-600">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </header>

  <div v-if="accountModalStore.loginModalOpen"
       class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-gray-900/75 p-4">
    <div
        class="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md border border-indigo-100 animate-appear">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-semibold text-gray-800">{{ t('header.login') }}</h2>
        <button @click="accountModalStore.closeLoginModal()" class="text-gray-500 hover:text-gray-700">
          <X class="h-6 w-6"/>
        </button>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <label for="login-email" class="block text-sm font-medium text-gray-700 mb-1">{{
              t('header.emailAddress')
            }}</label>
          <input type="text" id="login-email" v-model="loginForm.email" required
                 class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                 placeholder="you@example.com">
        </div>
        <div class="mb-4">
          <label for="login-password" class="block text-sm font-medium text-gray-700 mb-1">{{
              t('header.password')
            }}</label>
          <input type="password" id="login-password" v-model="loginForm.password" required
                 class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                 placeholder="••••••••">
        </div>
        <div class="mb-6 text-right">
          <button
              type="button"
              @click="accountModalStore.closeLoginModal(); router.push('/forget-password')"
              class="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
          >
            {{ t('header.forgotPassword', 'Forgot Password?') }}
          </button>
        </div>
        <button type="submit"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                :disabled="loginMutation.isPending.value">
          <span v-if="loginMutation.isPending.value">{{ t('common.loading') }}...</span>
          <span v-else>{{ t('header.login') }}</span>
        </button>
      </form>
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600 mb-2">{{ t('header.or') }}</p>
        <button @click="() => login()"
                :disabled="!isReady"
                class="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-150 ease-in-out">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google"
               class="h-5 w-5 mr-2">
          {{ t('header.signInWithGoogle') }}
        </button>
      </div>
      <p class="mt-6 text-center text-sm text-gray-600">
        {{ t('header.dontHaveAccount') }}
        <button @click="accountModalStore.closeLoginModal(); accountModalStore.openRegisterModal()"
                class="font-medium text-indigo-600 hover:text-indigo-500">
          {{ t('header.registerHere') }}
        </button>
      </p>
    </div>
  </div>

  <div v-if="accountModalStore.registerModalOpen"
       class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-gray-900/75 p-4">
    <div
        class="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md border border-indigo-100 animate-appear">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-semibold text-gray-800">{{ t('header.createAccount') }}</h2>
        <button @click="accountModalStore.closeRegisterModal()" class="text-gray-500 hover:text-gray-700">
          <X class="h-6 w-6"/>
        </button>
      </div>
      <form @submit.prevent="handleRegister">
        <div class="mb-4">
          <label for="register-fullname" class="block text-sm font-medium text-gray-700 mb-1">{{
              t('header.fullName')
            }}</label>
          <input type="text" id="register-fullname" v-model="registerForm.fullName" required
                 class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                 placeholder="John Doe">
        </div>
        <div class="mb-4">
          <label for="register-email" class="block text-sm font-medium text-gray-700 mb-1">{{
              t('header.emailAddress')
            }}</label>
          <input type="email" id="register-email" v-model="registerForm.email" required
                 class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                 placeholder="you@example.com">
        </div>
        <div class="mb-6">
          <label for="register-password" class="block text-sm font-medium text-gray-700 mb-1">{{
              t('header.password')
            }}</label>
          <input type="password" id="register-password" v-model="registerForm.password" required
                 class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                 placeholder="••••••••">
        </div>
        <button type="submit"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                :disabled="registerMutation.isPending.value">
          <span v-if="registerMutation.isPending.value">{{ t('common.loading') }}...</span>
          <span v-else>{{ t('header.register') }}</span>
        </button>
      </form>
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600 mb-2">{{ t('header.or') }}</p>
        <button @click="() => login()"
                :disabled="!isReady"
                class="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-150 ease-in-out">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google"
               class="h-5 w-5 mr-2">
          {{ t('header.signUpWithGoogle') }}
        </button>
      </div>
      <p class="mt-6 text-center text-sm text-gray-600">
        {{ t('header.alreadyHaveAccount') }}
        <button @click="accountModalStore.closeRegisterModal(); accountModalStore.openLoginModal()"
                class="font-medium text-indigo-600 hover:text-indigo-500">
          {{ t('header.loginHere') }}
        </button>
      </p>
    </div>
  </div>

  <div v-if="isLocaleDropdownOpen || isAccountDropdownOpen || isCategoriesDropdownOpen"
       class="fixed inset-0 z-0"
       @click="isLocaleDropdownOpen = false; isAccountDropdownOpen = false; isNotificationDropdownOpen = false; isCategoriesDropdownOpen = false;"></div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes appear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-appear {
  animation: appear 0.2s ease-out forwards;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.transition {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.duration-150 {
  transition-duration: 150ms;
}

.duration-200 {
  transition-duration: 200ms;
}

.duration-300 {
  transition-duration: 300ms;
}

.ease-in {
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
}

.ease-out {
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
}

.opacity-0 {
  opacity: 0;
}

.opacity-100 {
  opacity: 1;
}

.-translate-x-full {
  transform: translateX(-100%);
}

.translate-x-0 {
  transform: translateX(0);
}

.-translate-y-2 {
  transform: translateY(-0.5rem);
}

.translate-y-0 {
  transform: translateY(0);
}

.badge-enter-active, .badge-leave-active {
  transition: all 0.3s ease;
}

.badge-enter-from, .badge-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

.badge-enter-to, .badge-leave-from {
  opacity: 1;
  transform: scale(1);
}

.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
</style>

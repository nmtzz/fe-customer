<script setup>
import {userData} from "@/utils/authUtil.js";
import {Button} from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {ref, onMounted} from 'vue';
import {CircleUserRound} from 'lucide-vue-next';
import {useMutation} from "@tanstack/vue-query";
import {toast} from "vue-sonner";
import axios from "axios";
import {useI18n} from "vue-i18n";

const user = userData.user;
const {t} = useI18n();

onMounted(() => {
  document.title = t('account.title', 'Account Settings');
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const changePasswordMutation = useMutation({
  mutationFn: async ({oldPassword, newPassword}) => {
    return await axios.patch(`/users/change-password?oldPassword=${oldPassword}&newPassword=${newPassword}`);
  },
  onSuccess: () => {
    toast.success(t('account.passwordChanged', 'Password changed successfully'));
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }
})
const updateProfileMutation = useMutation({
  mutationFn: async ({fullName, phoneNumber}) => {
    return await axios.patch(`/users/update-profile?fullName=${fullName}&phoneNumber=${phoneNumber}`);
  },
  onSuccess: () => {
    toast.success(t('account.profileUpdated', 'Profile updated successfully'));
  }
})
const handleUpdateProfile = () => {
  if (user.fullName.trim() === '' || user.phoneNumber.trim() === '') {
    toast.error(t('account.fillAllFields', 'Please fill in all fields'));
    return;
  }
  updateProfileMutation.mutate({
    fullName: user.fullName,
    phoneNumber: user.phoneNumber
  });
};
const handleChangePassword = () => {
  console.log('Changing password...');
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.error(t('account.passwordsDoNotMatch', 'Passwords do not match'));
    return;
  }
  changePasswordMutation.mutate({
    oldPassword: passwordForm.value.currentPassword,
    newPassword: passwordForm.value.newPassword
  });
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p class="mt-2 text-gray-600">Manage your account information and security settings</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-gray-900">Profile Information</h2>
              <AlertDialog>
                <AlertDialogTrigger as-child>
                  <Button variant="outline">
                    Save
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to save your change to your profile?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="handleUpdateProfile">Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div class="flex items-center mb-6">
              <div class="relative">
                <img
                    loading="lazy"
                    v-if="user?.pictureUrl !== ''"
                    :src="user?.pictureUrl"
                    :alt="user?.fullName || 'User Avatar'"
                    class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <CircleUserRound v-else class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"/>
                <div class="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white"></div>
              </div>
              <div class="ml-6">
                <h3 class="text-lg font-medium text-gray-900">{{ userData?.user?.fullName || 'User Name' }}</h3>
                <p class="text-sm text-gray-500">{{ user?.email || 'user@example.com' }}</p>
                <div class="flex items-center mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="user?.provider === 'GOOGLE' ? 'bg-blue-100 text-blue-800' : ''">
                    <svg v-if="user?.provider === 'GOOGLE'" class="w-3 h-3 mr-1" viewBox="0 0 24 24">
                      <path fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {{ user?.provider === 'GOOGLE' ? 'Google Account' : '' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                    type="text"
                    v-model="user.fullName"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                    type="email"
                    v-model="user.email"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                    readonly
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                    type="tel"
                    v-model="user.phoneNumber"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                <input
                    type="text"
                    :value="user?.provider === 'GOOGLE' ? 'Google Account' : 'Local Account'"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                    readonly
                />
              </div>
            </div>
          </div>

          <div v-if="user?.provider !== 'GOOGLE'" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <div class="mb-6">
              <h2 class="text-xl font-semibold text-gray-900">Change Password</h2>
              <p class="mt-1 text-sm text-gray-600">Update your password to keep your account secure</p>
            </div>

            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <div class="relative">
                  <input
                      :type="showCurrentPassword ? 'text' : 'password'"
                      v-model="passwordForm.currentPassword"
                      class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your current password"
                  />
                  <button
                      type="button"
                      @click="showCurrentPassword = !showCurrentPassword"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg v-if="showCurrentPassword" class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                    </svg>
                    <svg v-else class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div class="relative">
                  <input
                      :type="showNewPassword ? 'text' : 'password'"
                      v-model="passwordForm.newPassword"
                      class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your new password"
                  />
                  <button
                      type="button"
                      @click="showNewPassword = !showNewPassword"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg v-if="showNewPassword" class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                    </svg>
                    <svg v-else class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <div class="relative">
                  <input
                      :type="showConfirmPassword ? 'text' : 'password'"
                      v-model="passwordForm.confirmPassword"
                      class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Confirm your new password"
                  />
                  <button
                      type="button"
                      @click="showConfirmPassword = !showConfirmPassword"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg v-if="showConfirmPassword" class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                    </svg>
                    <svg v-else class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex justify-end space-x-3">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger as-child>
                    <Button variant="outline">
                      Save
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Confirm password change?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction @click="handleChangePassword">Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Account Status</span>
                <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Email Verified</span>
                <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div class="space-y-3">
              <Button @click="$router.push('/orders')" variant="outline" class="w-full justify-start">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Order History
              </Button>
              <Button @click="$router.push('/cart')" variant="outline" class="w-full justify-start">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                Cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

.bg-gray-50 {
  background-color: #f9fafb;
}

input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

button:hover {
  transition: all 0.2s ease-in-out;
}

img {
  transition: transform 0.2s ease-in-out;
}

img:hover {
  transform: scale(1.05);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

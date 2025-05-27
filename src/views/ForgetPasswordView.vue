<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ArrowLeft, Mail, X, Eye, EyeOff } from 'lucide-vue-next'
import axios from 'axios'
import { useMutation } from "@tanstack/vue-query"
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import {
  PinInput,
  PinInputGroup,
  PinInputSlot,
} from '@/components/ui/pin-input'

const router = useRouter()
const { t } = useI18n()

onMounted(() => {
  document.title = t('forgetPassword.title', 'Password Recovery')
})

const email = ref('')
const pin = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const currentStep = ref(1)

const sendPinMutation = useMutation({
  mutationFn: async () => {
    return await axios.post('/users/forgot-password', null, {
      params: { email: email.value }
    })
  },
  onSuccess: () => {
    toast.success(t('forgetPassword.emailSent', 'Password reset PIN sent'), {
      description: t('forgetPassword.checkEmail', 'Please check your email for the PIN code')
    })
    currentStep.value = 2
  }
})

const verifyPinMutation = useMutation({
  mutationFn: async () => {
    return await axios.post('/users/verify-pin', null, {
      params: {
        email: email.value,
        pin: pin.value?.join('')
      }
    })
  },
  onSuccess: () => {
    toast.success(t('forgetPassword.pinVerified', 'PIN verified successfully'))
    currentStep.value = 3
  }
})

const resetPasswordMutation = useMutation({
  mutationFn: async () => {
    return await axios.post('/users/recover-password', null, {
      params: {
        email: email.value,
        password: newPassword.value
      }
    })
  },
  onSuccess: () => {
    toast.success(t('forgetPassword.passwordReset', 'Password reset successfully'), {
      description: t('forgetPassword.redirectLogin', 'You can now login with your new password')
    })
    setTimeout(() => {
      router.push('/')
    }, 1000)
  }
})

const handleSendPin = () => {
  if (!email.value) {
    toast.error(t('forgetPassword.emailRequired', 'Email is required'))
    return
  }
  sendPinMutation.mutate()
}

const handleVerifyPin = () => {
  if (!pin.value || pin.value.length !== 5) {
    toast.error(t('forgetPassword.pinRequired', 'Please enter the 5-digit PIN'))
    return
  }
  console.log('Verifying PIN:', pin.value?.join(''));
  verifyPinMutation.mutate()
}

const handleResetPassword = () => {
  if (!newPassword.value) {
    toast.error(t('forgetPassword.passwordRequired', 'Password is required'))
    return
  }
  if (newPassword.value.length < 6) {
    toast.error(t('forgetPassword.passwordTooShort', 'Password must be at least 6 characters'))
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error(t('forgetPassword.passwordMismatch', 'Passwords do not match'))
    return
  }
  resetPasswordMutation.mutate()
}

const goBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  } else {
    router.push('/')
  }
}

const stepStates = computed(() => {
  return {
    step1: currentStep.value >= 1 ? 'complete' : 'inactive',
    step2: currentStep.value >= 2 ? 'complete' : currentStep.value === 1 ? 'inactive' : 'inactive',
    step3: currentStep.value >= 3 ? 'complete' : currentStep.value < 3 ? 'inactive' : 'inactive'
  }
})

const isAnyMutationPending = computed(() => {
  return sendPinMutation.isPending.value || verifyPinMutation.isPending.value || resetPasswordMutation.isPending.value
})
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
    <div class="max-w-2xl mx-auto space-y-6">

      <div class="text-center">
        <router-link to="/" class="text-3xl font-bold text-primary-600 hover:text-primary-700">
          {{ t('forgetPassword.companyName', 'GADGETIFY') }}
        </router-link>
      </div>

      <div class="bg-white p-6 md:p-8 rounded-lg shadow-2xl border border-indigo-100 animate-appear">

        <div class="text-center mb-8">
          <h2 class="text-2xl font-semibold text-gray-800">
            {{ t('forgetPassword.title', 'Password Recovery') }}
          </h2>
          <p class="mt-2 text-sm text-gray-600">
            {{ t('forgetPassword.subtitle', 'Follow the steps below to reset your password') }}
          </p>
        </div>

        <div class="mb-12">

          <div class="hidden md:block">
            <Stepper
              v-model="currentStep"
              class="w-full"
              orientation="horizontal"
            >

              <StepperItem :step="1">
                <StepperTrigger class="flex flex-col items-center gap-3 p-4 group">
                  <StepperIndicator
                    class="w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-lg group-hover:shadow-xl"
                    :class="{
                      'bg-primary text-primary-foreground border-primary': currentStep >= 1,
                      'bg-muted text-muted-foreground border-muted': currentStep < 1
                    }"
                  >
                    <svg v-if="currentStep > 1" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    <span v-else>1</span>
                  </StepperIndicator>
                  <div class="text-center space-y-1 max-w-[140px]">
                    <StepperTitle
                      class="text-base font-semibold transition-colors duration-200"
                      :class="{
                        'text-primary': currentStep >= 1,
                        'text-muted-foreground': currentStep < 1
                      }"
                    >
                      {{ t('forgetPassword.step1Title', 'Email Verification') }}
                    </StepperTitle>
                    <StepperDescription class="text-sm text-muted-foreground leading-relaxed">
                      {{ t('forgetPassword.step1Desc', 'Enter your email to receive a PIN') }}
                    </StepperDescription>
                  </div>
                </StepperTrigger>
                <StepperSeparator
                  class="transition-colors duration-300"
                  :class="{
                    'bg-primary': currentStep > 1,
                    'bg-muted': currentStep <= 1
                  }"
                />
              </StepperItem>

              <StepperItem :step="2">
                <StepperTrigger class="flex flex-col items-center gap-3 p-4 group">
                  <StepperIndicator
                    class="w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-lg group-hover:shadow-xl"
                    :class="{
                      'bg-primary text-primary-foreground border-primary': currentStep >= 2,
                      'bg-muted text-muted-foreground border-muted': currentStep < 2
                    }"
                  >
                    <svg v-if="currentStep > 2" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    <span v-else>2</span>
                  </StepperIndicator>
                  <div class="text-center space-y-1 max-w-[140px]">
                    <StepperTitle
                      class="text-base font-semibold transition-colors duration-200"
                      :class="{
                        'text-primary': currentStep >= 2,
                        'text-muted-foreground': currentStep < 2
                      }"
                    >
                      {{ t('forgetPassword.step2Title', 'PIN Verification') }}
                    </StepperTitle>
                    <StepperDescription class="text-sm text-muted-foreground leading-relaxed">
                      {{ t('forgetPassword.step2Desc', 'Enter the PIN sent to your email') }}
                    </StepperDescription>
                  </div>
                </StepperTrigger>
                <StepperSeparator
                  class="transition-colors duration-300"
                  :class="{
                    'bg-green-500': currentStep > 2,
                    'bg-muted': currentStep <= 2
                  }"
                />
              </StepperItem>

              <StepperItem :step="3">
                <StepperTrigger class="flex flex-col items-center gap-3 p-4 group">
                  <StepperIndicator
                    class="w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-lg group-hover:shadow-xl"
                    :class="{
                      'bg-green-500 text-white border-green-500': currentStep >= 3,
                      'bg-muted text-muted-foreground border-muted': currentStep < 3
                    }"
                  >
                    <svg v-if="currentStep >= 3" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    <span v-else>3</span>
                  </StepperIndicator>
                  <div class="text-center space-y-1 max-w-[140px]">
                    <StepperTitle
                      class="text-base font-semibold transition-colors duration-200"
                      :class="{
                        'text-green-600': currentStep >= 3,
                        'text-muted-foreground': currentStep < 3
                      }"
                    >
                      {{ t('forgetPassword.step3Title', 'New Password') }}
                    </StepperTitle>
                    <StepperDescription class="text-sm text-muted-foreground leading-relaxed">
                      {{ t('forgetPassword.step3Desc', 'Create your new password') }}
                    </StepperDescription>
                  </div>
                </StepperTrigger>
              </StepperItem>
            </Stepper>
          </div>

          <div class="md:hidden">
            <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 mb-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                    :class="{
                      'bg-indigo-600 text-white': currentStep >= 1 && currentStep < 3,
                      'bg-green-600 text-white': currentStep === 3,
                      'bg-gray-300 text-gray-600': currentStep < 1
                    }"
                  >
                    <svg v-if="currentStep === 3" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    <span v-else>{{ currentStep }}</span>
                  </div>
                  <div class="text-left">
                    <div class="text-base font-semibold text-gray-900">
                      <span v-if="currentStep === 1">{{ t('forgetPassword.step1Title', 'Email Verification') }}</span>
                      <span v-else-if="currentStep === 2">{{ t('forgetPassword.step2Title', 'PIN Verification') }}</span>
                      <span v-else-if="currentStep === 3">{{ t('forgetPassword.step3Title', 'New Password') }}</span>
                    </div>
                    <div class="text-sm text-gray-600 font-medium">
                      Step {{ currentStep }} {{ t('forgetPassword.stepOf', 'of') }} 3
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm text-gray-500 font-medium">
                    {{ Math.round((currentStep / 3) * 100) }}%
                  </div>
                </div>
              </div>

              <div class="mb-4">
                <div class="bg-white/70 rounded-full h-3 shadow-inner">
                  <div
                    class="h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                    :class="{
                      'bg-gradient-to-r from-indigo-500 to-indigo-600': currentStep < 3,
                      'bg-gradient-to-r from-green-500 to-green-600': currentStep === 3
                    }"
                    :style="{ width: `${(currentStep / 3) * 100}%` }"
                  ></div>
                </div>
              </div>

              <div class="text-center">
                <p class="text-sm text-gray-700 leading-relaxed">
                  <span v-if="currentStep === 1">{{ t('forgetPassword.step1Desc', 'Enter your email to receive a PIN') }}</span>
                  <span v-else-if="currentStep === 2">{{ t('forgetPassword.step2Desc', 'Enter the PIN sent to your email') }}</span>
                  <span v-else-if="currentStep === 3">{{ t('forgetPassword.step3Desc', 'Create your new password') }}</span>
                </p>
              </div>

              <div class="flex justify-center space-x-2 mt-4">
                <div
                  v-for="step in 3"
                  :key="step"
                  class="w-2 h-2 rounded-full transition-all duration-300"
                  :class="{
                    'bg-indigo-600': step <= currentStep && currentStep < 3,
                    'bg-green-600': step <= currentStep && currentStep === 3,
                    'bg-gray-300': step > currentStep
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">

          <div v-if="currentStep === 1" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('forgetPassword.emailAddress', 'Email address') }}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                v-model="email"
                :disabled="isAnyMutationPending"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="button"
              @click="handleSendPin"
              :disabled="!email || sendPinMutation.isPending.value"
              class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <span v-if="sendPinMutation.isPending.value" class="flex items-center justify-center">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {{ t('forgetPassword.sending', 'Sending PIN...') }}
              </span>
              <span v-else>
                {{ t('forgetPassword.sendPin', 'Send PIN') }}
              </span>
            </button>
          </div>

          <div v-if="currentStep === 2" class="space-y-6">
            <div class="text-center">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div class="flex items-center justify-center mb-2">
                  <div class="bg-blue-100 rounded-full p-2">
                    <Mail class="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <p class="text-sm text-gray-700">
                  {{ t('forgetPassword.pinSentTo', 'We sent a 5-digit PIN to') }}
                </p>
                <p class="font-medium text-gray-900 mt-1">{{ email }}</p>
              </div>

              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-4">
                  {{ t('forgetPassword.enterPin', 'Enter PIN Code') }}
                </label>
                <div class="flex justify-center">
                  <PinInput
                    v-model="pin"
                    :length="5"
                    :disabled="verifyPinMutation.isPending.value"
                    @complete="handleVerifyPin"
                    class="gap-3"
                  >
                    <PinInputGroup class="flex gap-3">
                      <PinInputSlot
                        v-for="(id, index) in 5"
                        :key="id"
                        :index="index"
                        class="w-14 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:border-gray-400"
                        :class="{
                          'border-indigo-500 bg-indigo-50': pin && pin[index],
                          'border-red-300 bg-red-50': verifyPinMutation.isError.value,
                          'opacity-50 cursor-not-allowed': verifyPinMutation.isPending.value
                        }"
                      />
                    </PinInputGroup>
                  </PinInput>
                </div>
                <p class="text-xs text-gray-500 mt-3">
                  {{ t('forgetPassword.pinHint', 'Enter the 5-digit code sent to your email') }}
                </p>
              </div>
            </div>

            <div class="flex space-x-3">
              <button
                type="button"
                @click="goBack"
                :disabled="isAnyMutationPending"
                class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out disabled:opacity-50"
              >
                {{ t('common.back', 'Back') }}
              </button>

              <button
                type="button"
                @click="handleVerifyPin"
                :disabled="!pin || pin.length !== 5 || verifyPinMutation.isPending.value"
                class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span v-if="verifyPinMutation.isPending.value" class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {{ t('forgetPassword.verifying', 'Verifying...') }}
                </span>
                <span v-else>
                  {{ t('forgetPassword.verifyPin', 'Verify PIN') }}
                </span>
              </button>
            </div>

            <div class="text-center">
              <p class="text-sm text-gray-600">
                {{ t('forgetPassword.didNotReceive', 'Didn\'t receive the PIN?') }}
                <button
                  @click="sendPinMutation.mutate()"
                  :disabled="sendPinMutation.isPending.value"
                  class="font-medium text-indigo-600 hover:text-indigo-500 ml-1"
                >
                  {{ t('forgetPassword.resendPin', 'Resend PIN') }}
                </button>
              </p>
            </div>
          </div>

          <div v-if="currentStep === 3" class="space-y-6">
            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('forgetPassword.newPassword', 'New Password') }}
              </label>
              <div class="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  v-model="newPassword"
                  :disabled="isAnyMutationPending"
                  class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <Eye v-if="!showPassword" class="h-4 w-4 text-gray-400" />
                  <EyeOff v-else class="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('forgetPassword.confirmPassword', 'Confirm Password') }}
              </label>
              <div class="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  v-model="confirmPassword"
                  :disabled="isAnyMutationPending"
                  class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <Eye v-if="!showConfirmPassword" class="h-4 w-4 text-gray-400" />
                  <EyeOff v-else class="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div class="flex space-x-3">
              <button
                type="button"
                @click="goBack"
                :disabled="isAnyMutationPending"
                class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out disabled:opacity-50"
              >
                {{ t('common.back', 'Back') }}
              </button>

              <button
                type="button"
                @click="handleResetPassword"
                :disabled="!newPassword || !confirmPassword || resetPasswordMutation.isPending.value"
                class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span v-if="resetPasswordMutation.isPending.value" class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {{ t('forgetPassword.resetting', 'Resetting...') }}
                </span>
                <span v-else>
                  {{ t('forgetPassword.resetPassword', 'Reset Password') }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-8 text-center">
          <p class="text-sm text-gray-600">
            {{ t('forgetPassword.rememberPassword', 'Remember your password?') }}
            <button
              @click="router.push('/')"
              class="font-medium text-indigo-600 hover:text-indigo-500 ml-1"
            >
              {{ t('forgetPassword.backToLogin', 'Back to Login') }}
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.transition {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.duration-150 {
  transition-duration: 150ms;
}

.ease-in-out {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.border-3 {
  border-width: 3px;
}

.group:hover .group-hover\:shadow-xl {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
</style>

<script setup>
import {ref} from 'vue';
import {useI18n} from 'vue-i18n';
import axios from 'axios';
import {useQuery} from "@tanstack/vue-query";
import {getCurrentExchangeRate} from "@/utils/localeUtil.js";

const {t, locale} = useI18n();

const chatHistory = ref([]);
const userInput = ref('');
const isOpen = ref(false);

const toggleChat = () => {
  isOpen.value = !isOpen.value;
};
const {data: productsData} = useQuery({
  queryKey: ['products-chatbot'],
  queryFn: async () => {
    const {data} = await axios.get('/products');
    return data;
  },
  select(data) {
  if (!data || !data.result) return [];
    const products = data.result.filter(product =>
        product.status && product.categoryStatus && product.stock > 0
    );
    return products.map(product => ({
      id: product.id,
      name: product.name,
      category: product.categoryName,
      price: locale.value !== 'vi'
          ? product.price * 0.000039
          : product.price,
      brand: product.brand,
      stock: product.stock,
      description: product.description
    }));
  }
})
const sendMessage = async () => {
  const userMessage = userInput.value.trim();
  if (userMessage) {
    chatHistory.value.push({role: 'user', parts: [{text: userMessage}]});
    userInput.value = ''
    const defaultContext = [
      {
        role: 'model',
        parts: [{text: t('chatbot.systemPrompt1')}]
      },
      {
        role: 'model',
        parts: [{text: t('chatbot.systemPrompt2')}]
      },
      {
        role: 'model',
        parts: [{text: t('chatbot.systemPrompt4') + ' ' + JSON.stringify(productsData.value)}]
      },
      {
        role: 'model',
        parts: [{text: t('chatbot.systemPrompt5')}]
      },
      {
        role: 'model',
        parts: [{text: t('chatbot.systemPrompt6')}]
      },
      {
        role: 'model',
        parts: [{text: t('chatbot.systemPrompt3')}]
      },
    ];
    try {
      const payload = {
        contents: [
          ...defaultContext,
          ...chatHistory.value
        ],
        generationConfig: {
          responseMimeType: "text/plain"
        }
      };

      const response = await axios.post('/chats', payload);

      if (response.data && response.data.candidates && response.data.candidates.length > 0 && response.data.candidates[0].content && response.data.candidates[0].content.parts) {
        const geminiResponse = response.data.candidates[0].content.parts[0].text;
        chatHistory.value.push({role: 'model', parts: [{text: geminiResponse}]});
      } else {
        chatHistory.value.push({role: 'error', parts: [{text: t('chatbot.noResponse')}]});
      }
    } catch (error) {
      console.error('Error sending request to Gemini:', error);
      chatHistory.value.push({role: 'error', parts: [{text: t('chatbot.connectionError')}]});
    }
  }
};
</script>

<template>
  <div class="chatbot-container">

    <button
        @click="toggleChat"
        class="chat-toggle-btn"
        :class="{ 'open': isOpen }"
    >
      <svg v-if="!isOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>

    <div v-if="isOpen" class="chat-window">

      <div class="chat-header">
        <div class="header-content">
          <h3>{{ t('chatbot.title') }}</h3>
          <p class="ai-disclaimer">{{ t('chatbot.aiDisclaimer') }}</p>
        </div>
        <button @click="toggleChat" class="close-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="chat-messages" id="chat-container">
        <div v-if="chatHistory.length === 0" class="welcome-message">
          <p><strong>{{ t('chatbot.welcomeMessage') }}</strong></p>
          <div class="disclaimer">
            <p>⚠️ <strong>{{ t('chatbot.importantNotice') }}</strong></p>
            <ul>
              <li>{{ t('chatbot.accuracyWarning') }}</li>
              <li>{{ t('chatbot.errorWarning') }}</li>
            </ul>
          </div>
          <div class="privacy-notice">
            <p>🔒 <strong>{{ t('chatbot.chatDataNotice') }}</strong></p>
            <ul>
              <li>{{ t('chatbot.dataClearing') }}</li>
              <li>{{ t('chatbot.saveImportantInfo') }}</li>
            </ul>
          </div>
        </div>
        <div
            v-for="(message, index) in chatHistory"
            :key="index"
            class="message"
            :class="{
            'user-message': message.role === 'user',
            'bot-message': message.role === 'model',
            'error-message': message.role === 'error'
          }"
        >
          <div class="message-content">
            <div class="message-avatar">
              <span v-if="message.role === 'user'">👤</span>
              <span v-else-if="message.role === 'model'">🤖</span>
              <span v-else>⚠️</span>
            </div>
            <div class="message-text">
              {{ message.parts[0].text }}
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <input
            type="text"
            v-model="userInput"
            @keypress.enter="sendMessage"
            :placeholder="t('chatbot.inputPlaceholder')"
            class="input-field"
        >
        <button @click="sendMessage" class="send-btn" :disabled="!userInput.trim()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22,2 15,22 11,13 2,9 22,2"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chatbot-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-toggle-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  position: relative;
}

.chat-toggle-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

.chat-toggle-btn.open {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
}

.chat-window {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 350px;
  height: 500px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  flex: 1;
}

.chat-header h3 {
  margin: 0 0 2px 0;
  font-size: 16px;
  font-weight: 600;
}

.ai-disclaimer {
  margin: 0;
  font-size: 11px;
  opacity: 0.8;
  font-style: italic;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.welcome-message {
  text-align: center;
  color: #666;
  padding: 20px;
}

.welcome-message p:first-child {
  font-size: 16px;
  margin-bottom: 16px;
  color: #333;
}

.disclaimer {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  text-align: left;
  font-size: 12px;
  line-height: 1.4;
}

.disclaimer p {
  margin: 0 0 8px 0;
  color: #856404;
  font-weight: 600;
}

.disclaimer ul {
  margin: 0;
  padding-left: 16px;
  color: #856404;
}

.disclaimer li {
  margin-bottom: 4px;
}

.privacy-notice {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  text-align: left;
  font-size: 12px;
  line-height: 1.4;
}

.privacy-notice p {
  margin: 0 0 8px 0;
  color: #0c5460;
  font-weight: 600;
}

.privacy-notice ul {
  margin: 0;
  padding-left: 16px;
  color: #0c5460;
}

.privacy-notice li {
  margin-bottom: 4px;
}

.message {
  display: flex;
  margin-bottom: 12px;
}

.user-message {
  justify-content: flex-end;
}

.bot-message, .error-message {
  justify-content: flex-start;
}

.message-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 80%;
}

.user-message .message-content {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.bot-message .message-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.error-message .message-avatar {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.message-text {
  background: #f8f9fa;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.user-message .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.error-message .message-text {
  background: #ffe6e6;
  color: #d63031;
  border: 1px solid #ff7675;
}

.chat-input {
  padding: 16px;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 8px;
  background: #f8f9fa;
}

.input-field {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  outline: none;
  font-size: 14px;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: #667eea;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .chatbot-container {
    bottom: 10px;
    right: 10px;
  }

  .chat-window {
    width: calc(100vw - 40px);
    height: 70vh;
    bottom: 80px;
    right: -10px;
  }

  .chat-toggle-btn {
    width: 50px;
    height: 50px;
  }
}
</style>

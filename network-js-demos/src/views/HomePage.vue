<template>
  <div class="relative">
    <!-- Hero Section -->
    <div class="relative py-20 px-4">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          {{ t('home.hero.title') }}
        </h1>
        <p class="text-xl md:text-2xl text-secondary mb-4">
          {{ t('home.hero.subtitle') }}
        </p>
        <p class="text-lg text-secondary mb-8 max-w-2xl mx-auto">
          {{ t('home.hero.description') }}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <router-link to="/showcase" class="btn-primary">
            🚀 {{ t('home.hero.cta') }}
          </router-link>
          <a href="https://github.com/guinetik/js-network-stats" target="_blank" class="btn-secondary">
            📚 {{ t('home.hero.github') }}
          </a>
        </div>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="container-main section py-16">
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(feature, index) in t('home.features')"
          :key="index"
          class="card p-6 hover:shadow-xl transition-shadow"
        >
          <div class="text-4xl mb-4">{{ feature.icon }}</div>
          <h3 class="text-xl font-bold mb-2">{{ feature.title }}</h3>
          <p class="text-secondary">{{ feature.description }}</p>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="container-main section py-16">
      <div class="max-w-3xl mx-auto">
        <div class="card overflow-hidden">
          <div class="flex items-center justify-between px-6 py-3 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
            <span class="text-secondary font-mono text-sm">{{ t('home.code.title') }}</span>
            <div class="flex gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div class="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
          </div>
          <pre class="p-6 overflow-x-auto bg-gray-900 text-gray-100"><code class="text-sm">{{ t('home.code.snippet') }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
</script>

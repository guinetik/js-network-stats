<template>
  <!-- Network Particle Background -->
  <canvas id="particles"></canvas>

  <!-- Content Wrapper -->
  <div class="content-wrapper">
    <!-- Header -->
    <header class="header">
      <div class="container-main header-content">
        <!-- Logo -->
        <div class="flex items-center gap-4">
          <router-link to="/" class="logo">
            @guinetik/network-js
          </router-link>
        </div>

        <!-- Hamburger Menu Button (Mobile) -->
        <button
          @click="toggleMobileMenu"
          class="md:hidden btn-icon"
          aria-label="Toggle menu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Navigation (Desktop) -->
        <nav class="nav hidden md:flex">
          <router-link
            to="/showcase"
            class="nav-link"
            active-class="nav-link-active"
          >
            {{ t('nav.showcase') }}
          </router-link>
          <router-link
            to="/explorer"
            class="nav-link"
            active-class="nav-link-active"
          >
            {{ t('nav.explorer') }}
          </router-link>
          <router-link
            to="/family"
            class="nav-link"
            active-class="nav-link-active"
          >
            {{ t('nav.family') }}
          </router-link>
          <router-link
            to="/docs"
            class="nav-link"
            active-class="nav-link-active"
          >
            {{ t('nav.docs') }}
          </router-link>
        </nav>

        <!-- Controls (Desktop) -->
        <div class="hidden md:flex items-center space-x-4">
          <!-- Language Switcher -->
          <select
            v-model="lang"
            @change="changeLanguage(lang)"
            class="px-3 py-1 rounded-md bg-secondary text-primary border border-color text-sm"
          >
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>

          <!-- Dark Mode Toggle -->
          <button
            @click="toggleDarkMode"
            class="btn-icon"
            :title="t('common.darkMode')"
          >
            <span v-if="!darkMode" class="text-xl">🌙</span>
            <span v-else class="text-xl">☀️</span>
          </button>

          <!-- GitHub Link -->
          <a
            href="https://github.com/guinetik/js-network-stats"
            target="_blank"
            class="btn-icon"
            title="View on GitHub"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    </header>

    <!-- Mobile Menu Overlay -->
    <transition name="mobile-menu">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-50 md:hidden"
        @click="closeMobileMenu"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50"></div>

        <!-- Menu Panel -->
        <div
          class="absolute top-0 right-0 bottom-0 w-72 bg-[var(--color-bg-primary)] shadow-xl"
          @click.stop
        >
          <div class="flex flex-col h-full p-6">
            <!-- Close Button -->
            <div class="flex justify-between items-center mb-8">
              <h2 class="text-xl font-bold">Menu</h2>
              <button @click="closeMobileMenu" class="btn-icon">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Mobile Navigation Links -->
            <nav class="flex flex-col space-y-2 mb-8">
              <router-link
                to="/showcase"
                class="nav-link text-lg py-3 px-4 rounded-md hover:bg-[var(--color-bg-secondary)] transition-colors"
                active-class="bg-[var(--color-bg-secondary)] text-accent"
                @click="closeMobileMenu"
              >
                {{ t('nav.showcase') }}
              </router-link>
              <router-link
                to="/explorer"
                class="nav-link text-lg py-3 px-4 rounded-md hover:bg-[var(--color-bg-secondary)] transition-colors"
                active-class="bg-[var(--color-bg-secondary)] text-accent"
                @click="closeMobileMenu"
              >
                {{ t('nav.explorer') }}
              </router-link>
              <router-link
                to="/family"
                class="nav-link text-lg py-3 px-4 rounded-md hover:bg-[var(--color-bg-secondary)] transition-colors"
                active-class="bg-[var(--color-bg-secondary)] text-accent"
                @click="closeMobileMenu"
              >
                {{ t('nav.family') }}
              </router-link>
              <router-link
                to="/docs"
                class="nav-link text-lg py-3 px-4 rounded-md hover:bg-[var(--color-bg-secondary)] transition-colors"
                active-class="bg-[var(--color-bg-secondary)] text-accent"
                @click="closeMobileMenu"
              >
                {{ t('nav.docs') }}
              </router-link>
            </nav>

            <!-- Mobile Controls -->
            <div class="border-t border-[var(--color-border)] pt-6 space-y-4">
              <!-- Language Switcher -->
              <div>
                <label class="block text-sm font-medium mb-2">{{ t('common.language') }}</label>
                <select
                  v-model="lang"
                  @change="changeLanguage(lang)"
                  class="w-full px-3 py-2 rounded-md bg-secondary text-primary border border-color"
                >
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <!-- Dark Mode Toggle -->
              <button
                @click="toggleDarkMode"
                class="w-full flex items-center justify-between px-4 py-3 rounded-md bg-secondary hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <span>{{ t('common.darkMode') }}</span>
                <span class="text-2xl">{{ darkMode ? '☀️' : '🌙' }}</span>
              </button>

              <!-- GitHub Link -->
              <a
                href="https://github.com/guinetik/js-network-stats"
                target="_blank"
                class="flex items-center justify-between px-4 py-3 rounded-md bg-secondary hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <span>View on GitHub</span>
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Main Content -->
    <main class="page">
      <router-view v-slot="{ Component }">
        <transition name="page-transition" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Footer (hidden on demo pages) -->
    <footer
      v-if="!isDemoPage"
      class="footer"
    >
      <div class="container-main footer-content">
        <p class="mb-2">
          {{ t('footer.madeBy') }} 🧠
          {{ t('footer.by') }}
          <a href="https://github.com/guinetik" target="_blank" class="text-accent">@guinetik</a>
        </p>
        <p class="text-sm">{{ t('footer.license') }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from './composables/useI18n';
import { useDarkMode } from './composables/useDarkMode';
import { initParticles } from '../lib/particles.js';

const route = useRoute();
const { lang, t, changeLanguage } = useI18n();
const { darkMode, toggleDarkMode } = useDarkMode();

// Mobile menu state
const mobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};

const isDemoPage = computed(() => {
  const demoPages = ['showcase', 'explorer', 'family'];
  return demoPages.includes(route.name);
});

onMounted(() => {
  initParticles();
});
</script>

<style>
/* Page transition */
.page-transition-enter-active,
.page-transition-leave-active {
  transition: opacity 0.2s ease;
}

.page-transition-enter-from,
.page-transition-leave-to {
  opacity: 0;
}

/* Mobile menu transition */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.3s ease;
}

.mobile-menu-enter-active .absolute.top-0,
.mobile-menu-leave-active .absolute.top-0 {
  transition: transform 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

.mobile-menu-enter-from .absolute.top-0,
.mobile-menu-leave-to .absolute.top-0 {
  transform: translateX(100%);
}

.mobile-menu-enter-to .absolute.top-0,
.mobile-menu-leave-from .absolute.top-0 {
  transform: translateX(0);
}
</style>

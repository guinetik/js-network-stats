import Alpine from 'alpinejs';
import Navigo from 'navigo';
import { translations } from './i18n.js';
import { initParticles } from './particles.js';

export function app() {
    return {
        page: 'home',
        router: null,
        darkMode: localStorage.getItem('darkMode') === 'true',
        lang: localStorage.getItem('lang') || 'en',
        translations,

        get t() {
            return this.translations[this.lang];
        },

        init() {
            // Initialize router
            this.router = new Navigo('/', { hash: false });

            this.router.on('/', () => {
                this.page = 'home';
            });

            this.router.on('/network', () => {
                this.page = 'network';
            });

            this.router.on('/family', () => {
                this.page = 'family';
            });

            this.router.on('/docs', () => {
                this.page = 'docs';
            });

            // Check for GitHub Pages redirect
            const redirect = sessionStorage.getItem('redirect');
            if (redirect) {
                sessionStorage.removeItem('redirect');
                this.router.navigate(redirect);
            } else {
                this.router.resolve();
            }

            // Initialize particle network
            initParticles();

            // Apply dark mode on init
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            }
        },

        navigate(path) {
            this.router.navigate(path);
        },

        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('darkMode', this.darkMode);

            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }

            // Notify iframes about dark mode change
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                iframe.contentWindow.postMessage({
                    type: 'darkModeChange',
                    darkMode: this.darkMode
                }, '*');
            });
        },

        saveLang() {
            localStorage.setItem('lang', this.lang);
        }
    }
}

// Make app function available to Alpine
window.app = app;

// Initialize Alpine
Alpine.data('app', app);
Alpine.start();

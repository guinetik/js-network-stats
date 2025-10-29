import Alpine from 'alpinejs';
import Navigo from 'navigo';
import { translations } from './i18n.js';
import { initParticles } from './particles.js';
import { ComponentManager } from './lib/component-manager.js';

export function app() {
    return {
        page: 'home',
        router: null,
        darkMode: localStorage.getItem('darkMode') === 'true',
        lang: localStorage.getItem('lang') || 'en',
        translations,
        componentManager: new ComponentManager(),
        networkGraphComponent: null,
        templateCache: {},

        get t() {
            return this.translations[this.lang];
        },

        async init() {
            // Initialize router
            this.router = new Navigo('/', { hash: false });

            this.router.on('/', () => {
                this.loadPage('home');
            });

            this.router.on('/network', async () => {
                await this.loadPage('network');
            });

            this.router.on('/explorer', () => {
                this.loadPage('explorer');
            });

            this.router.on('/family', () => {
                this.loadPage('family');
            });

            this.router.on('/docs', () => {
                this.loadPage('docs');
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

        async loadPage(pageName) {
            // Cleanup previous component
            await this.componentManager.cleanup();

            // Set page
            this.page = pageName;

            // For component pages, we'll initialize them after the template is loaded
            // This happens in the template's x-init
        },

        async loadTemplate(name) {
            // Check cache first
            if (this.templateCache[name]) {
                return this.templateCache[name];
            }

            try {
                const response = await fetch(`templates/${name}.html`);
                const html = await response.text();
                this.templateCache[name] = html;
                return html;
            } catch (error) {
                console.error(`Failed to load template: ${name}`, error);
                return `<div class="p-8 text-red-600">Failed to load template: ${name}</div>`;
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

            // No need for postMessage anymore - dark mode is reactive through Alpine!
        },

        saveLang() {
            localStorage.setItem('lang', this.lang);
        }
    }
}

// Import component initializers
import { initNetworkGraphComponent } from './components/network-graph-init.js';

// Make app function available to Alpine
window.app = app;

// Register Alpine components
Alpine.data('app', app);
Alpine.data('networkGraphComponent', () => initNetworkGraphComponent());

// Initialize Alpine
Alpine.start();

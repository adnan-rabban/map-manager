export class SettingsManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'system';
        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.bindEvents();
    }

    bindEvents() {
        const btnSettings = document.getElementById('btn-settings');
        const modal = document.getElementById('settings-modal');
        const overlay = document.getElementById('settings-overlay');
        const btnClose = document.getElementById('btn-close-settings');
        
        if (btnSettings) {
            btnSettings.addEventListener('click', () => {
                overlay.classList.add('open');
            });
        }

        if (btnClose) {
            btnClose.addEventListener('click', () => {
                overlay.classList.remove('open');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('open');
                }
            });
        }

        // Theme Toggles
        const radios = document.querySelectorAll('input[name="theme"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
            // Set initial state
            if (radio.value === this.theme) {
                radio.checked = true;
            }
        });
    }

    setTheme(mode) {
        this.theme = mode;
        localStorage.setItem('theme', mode);
        this.applyTheme(mode);
    }

    applyTheme(mode) {
        if (mode === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } else {
            document.body.setAttribute('data-theme', mode);
        }
    }
}

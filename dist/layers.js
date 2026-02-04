export class LayerSwitcher {
    constructor(mapEngine) {
        this.panel = null;
        this.mapEngine = mapEngine;
        this.initUI();
    }
    initUI() {
        // Bind to existing elements for cleaner separation
        this.panel = document.getElementById('layer-panel');
        const btnToggle = document.getElementById('btn-layers');
        if (!this.panel || !btnToggle)
            return;
        // Toggle Visibility
        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.panel &&
                this.panel.classList.contains('visible') &&
                !this.panel.contains(e.target) &&
                !btnToggle.contains(e.target)) {
                this.closePanel();
            }
        });
        // Layer Options
        const options = this.panel.querySelectorAll('.layer-option');
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                const styleId = opt.dataset.style;
                if (styleId) {
                    this.setLayer(styleId);
                }
                // Update active state
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    }
    togglePanel() {
        if (!this.panel)
            return;
        this.panel.classList.toggle('visible');
        const btn = document.getElementById('btn-layers');
        if (btn)
            btn.classList.toggle('active');
    }
    closePanel() {
        if (!this.panel)
            return;
        this.panel.classList.remove('visible');
        const btn = document.getElementById('btn-layers');
        if (btn)
            btn.classList.remove('active');
    }
    setLayer(styleId) {
        if (this.mapEngine && typeof this.mapEngine.setStyle === 'function') {
            this.mapEngine.setStyle(styleId);
        }
    }
}

export class LayerSwitcher {
    constructor(mapEngine) {
        this.mapEngine = mapEngine;
        this.panel = null;
        this.initUI();
    }

    initUI() {
        // Create Panel if not exists (though we plan to put it in HTML, 
        // let's assume we bind to existing elements for cleaner separation)
        this.panel = document.getElementById('layer-panel');
        const btnToggle = document.getElementById('btn-layers');
        
        if (!this.panel || !btnToggle) return;

        // Toggle Visibility
        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.panel.classList.contains('visible') && 
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
                this.setLayer(styleId);
                
                // Update active state
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    }

    togglePanel() {
        this.panel.classList.toggle('visible');
        const btn = document.getElementById('btn-layers');
        if (btn) btn.classList.toggle('active');
    }

    closePanel() {
        this.panel.classList.remove('visible');
        const btn = document.getElementById('btn-layers');
        if (btn) btn.classList.remove('active');
    }

    setLayer(styleId) {
        if (this.mapEngine) {
            this.mapEngine.setStyle(styleId);
        }
    }
}

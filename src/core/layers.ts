import { MapEngine } from './map.js';

export class LayerSwitcher {
    private mapEngine: MapEngine;
    private panel: HTMLElement | null = null;

    constructor(mapEngine: MapEngine) {
        this.mapEngine = mapEngine;
        this.initUI();
    }

    private initUI(): void {
        // Bind to existing elements
        this.panel = document.getElementById('layer-panel');
        const btnToggle = document.getElementById('btn-layers');
        
        if (!this.panel || !btnToggle) return;

        // Toggle Visibility
        btnToggle.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            this.togglePanel();
        });

        // Close when clicking outside
        document.addEventListener('click', (e: Event) => {
            if (this.panel && 
                this.panel.classList.contains('visible') && 
                !this.panel.contains(e.target as Node) && 
                !btnToggle.contains(e.target as Node)) {
                this.closePanel();
            }
        });

        // Layer Options
        const options = this.panel.querySelectorAll<HTMLElement>('.layer-option');
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                const styleId = opt.dataset.style;
                if (styleId) {

                    this.setLayer(styleId);
                }
                
                // Update active state in UI
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    }

    private togglePanel(): void {
        if (!this.panel) return;
        
        this.panel.classList.toggle('visible');
        const btn = document.getElementById('btn-layers');
        if (btn) btn.classList.toggle('active');
    }

    private closePanel(): void {
        if (!this.panel) return;
        
        this.panel.classList.remove('visible');
        const btn = document.getElementById('btn-layers');
        if (btn) btn.classList.remove('active');
    }

    /**
     * Set layer style via MapEngine
     * MapEngine akan otomatis handle dark mode internally
     */
    private setLayer(styleId: string): void {
        if (this.mapEngine && typeof this.mapEngine.setStyle === 'function') {
            // Call MapEngine's setStyle which will respect current dark mode
            this.mapEngine.setStyle(styleId);
        } else {
            console.error('MapEngine setStyle method not available');
        }
    }
}
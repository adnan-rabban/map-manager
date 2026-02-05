export class CustomTooltip {
    constructor() {
        this.delay = 600;
        this.timer = null;
        this.hideTimer = null;
        this.activeElement = null;
        this.isTooltipVisible = false;
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'custom-tooltip';
        this.tooltip.className = 'macos-tooltip';
        document.body.appendChild(this.tooltip);
        this.applyStyles();
        this.init();
    }
    applyStyles() {
        const styleId = 'macos-tooltip-styles-v2';
        if (!document.getElementById(styleId)) {
            // Remove old style if it exists
            const oldStyle = document.getElementById('macos-tooltip-styles');
            if (oldStyle)
                oldStyle.remove();
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .macos-tooltip {
                    position: fixed;
                    z-index: 10000;
                    pointer-events: none;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
                    font-size: 11px;
                    line-height: 1.4;
                    padding: 4px 8px;
                    background: rgba(30, 30, 30, 0.92);
                    color: rgba(255, 255, 255, 0.95);
                    border-radius: 5px;
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    box-shadow: 
                        0 0 0 0.5px rgba(255, 255, 255, 0.1) inset,
                        0 4px 12px rgba(0, 0, 0, 0.3),
                        0 1px 3px rgba(0, 0, 0, 0.4);
                    max-width: 250px;
                    word-wrap: break-word;
                    font-weight: 400;
                    letter-spacing: 0.01em;
                    
                    /* Explicitly remove arrows in case of cache/conflict */
                    &::after, &::before {
                        display: none !important;
                        content: none !important;
                    }
                    
                    /* Initial hidden state */
                    opacity: 0;
                    visibility: hidden;
                    transform: scale(0.85) translateY(-8px);
                    transform-origin: center bottom;
                    
                    /* macOS-style spring animation */
                    transition: 
                        opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                        visibility 0s linear 0.25s;
                }

                .macos-tooltip.show {
                    opacity: 1;
                    visibility: visible;
                    transform: scale(1) translateY(0);
                    transition: 
                        opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                        visibility 0s linear 0s;
                }

                .macos-tooltip.hide {
                    opacity: 0;
                    visibility: hidden;
                    transform: scale(0.9) translateY(-4px);
                    transition: 
                        opacity 0.2s cubic-bezier(0.4, 0, 1, 1),
                        transform 0.25s cubic-bezier(0.4, 0, 1, 1),
                        visibility 0s linear 0.2s;
                }

                /* Position variants for different placements */
                .macos-tooltip.position-top {
                    transform-origin: center bottom;
                }

                .macos-tooltip.position-top.show {
                    transform: scale(1) translateY(0);
                }

                .macos-tooltip.position-top:not(.show) {
                    transform: scale(0.85) translateY(-8px);
                }

                .macos-tooltip.position-bottom {
                    transform-origin: center top;
                }

                .macos-tooltip.position-bottom.show {
                    transform: scale(1) translateY(0);
                }

                .macos-tooltip.position-bottom:not(.show) {
                    transform: scale(0.85) translateY(8px);
                }

                .macos-tooltip.position-left {
                    transform-origin: right center;
                }
                
                .macos-tooltip.position-right {
                    transform-origin: left center;
                }

                /* Light mode support */
                @media (prefers-color-scheme: light) {
                    .macos-tooltip {
                        background: rgba(255, 255, 255, 0.92);
                        color: rgba(0, 0, 0, 0.85);
                        box-shadow: 
                            0 0 0 0.5px rgba(0, 0, 0, 0.08) inset,
                            0 4px 12px rgba(0, 0, 0, 0.15),
                            0 1px 3px rgba(0, 0, 0, 0.1);
                    }


                }

                /* Reduce motion for accessibility */
                @media (prefers-reduced-motion: reduce) {
                    .macos-tooltip {
                        transition: opacity 0.15s ease, visibility 0s linear 0.15s;
                        transform: none !important;
                    }
                    
                    .macos-tooltip.show {
                        transition: opacity 0.15s ease, visibility 0s linear 0s;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    init() {
        document.addEventListener('mouseover', (e) => this.handleMouseOver(e));
        document.addEventListener('mouseout', (e) => this.handleMouseOut(e));
        document.addEventListener('mousedown', () => this.hide());
        window.addEventListener('scroll', () => this.hide(), true);
        window.addEventListener('resize', () => {
            if (this.isTooltipVisible && this.activeElement) {
                this.updatePosition(this.activeElement);
            }
        });
    }
    handleMouseOver(e) {
        const target = e.target.closest('[data-tooltip]');
        if (!target)
            return;
        // Quick switch between tooltips (macOS behavior)
        if (this.isTooltipVisible && target !== this.activeElement) {
            if (this.timer !== null)
                clearTimeout(this.timer);
            if (this.hideTimer !== null)
                clearTimeout(this.hideTimer);
            this.activeElement = target;
            const text = target.getAttribute('data-tooltip');
            if (text) {
                // Immediate switch with smooth transition
                this.switchTooltip(target, text);
            }
            return;
        }
        if (target === this.activeElement)
            return;
        this.hide();
        this.activeElement = target;
        const text = target.getAttribute('data-tooltip');
        if (!text)
            return;
        this.timer = window.setTimeout(() => {
            if (this.activeElement === target) {
                this.show(target, text);
            }
        }, this.delay);
    }
    handleMouseOut(e) {
        const target = e.target.closest('[data-tooltip]');
        if (target && target === this.activeElement) {
            if (!target.contains(e.relatedTarget)) {
                if (this.timer !== null)
                    clearTimeout(this.timer);
                this.hide();
                this.activeElement = null;
            }
        }
    }
    show(element, text) {
        if (this.hideTimer !== null)
            clearTimeout(this.hideTimer);
        this.tooltip.textContent = text;
        // Remove hide class and force reflow
        this.tooltip.classList.remove('hide');
        void this.tooltip.offsetWidth;
        // Position first (invisible)
        this.updatePosition(element);
        // Then animate in with slight delay for smoother appearance
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.tooltip.classList.add('show');
                this.isTooltipVisible = true;
            });
        });
    }
    switchTooltip(element, text) {
        // Smooth crossfade for switching between tooltips
        this.tooltip.classList.remove('show');
        this.tooltip.classList.add('hide');
        setTimeout(() => {
            this.tooltip.textContent = text;
            this.tooltip.classList.remove('hide');
            void this.tooltip.offsetWidth;
            this.updatePosition(element);
            requestAnimationFrame(() => {
                this.tooltip.classList.add('show');
            });
        }, 100); // Quick fade out before switching
    }
    hide() {
        if (this.timer !== null)
            clearTimeout(this.timer);
        if (this.hideTimer !== null)
            clearTimeout(this.hideTimer);
        if (!this.isTooltipVisible)
            return;
        this.tooltip.classList.remove('show');
        this.tooltip.classList.add('hide');
        this.isTooltipVisible = false;
        // Clean up classes after animation
        this.hideTimer = window.setTimeout(() => {
            this.tooltip.classList.remove('hide');
            this.tooltip.classList.remove('position-top', 'position-bottom');
        }, 250);
    }
    updatePosition(element) {
        const rect = element.getBoundingClientRect();
        // Use offsetWidth/Height to get unscaled layout dimensions
        const width = this.tooltip.offsetWidth;
        const height = this.tooltip.offsetHeight;
        let top = rect.bottom + 6;
        let left = rect.left + (rect.width / 2) - (width / 2);
        let position = 'bottom';
        const padding = 8;
        // Horizontal bounds
        if (left + width > window.innerWidth - padding) {
            left = window.innerWidth - width - padding;
        }
        if (left < padding) {
            left = padding;
        }
        // Vertical bounds - flip to top if needed
        if (top + height > window.innerHeight - padding) {
            top = rect.top - height - 6;
            position = 'top';
        }
        // Update position classes for correct animation direction
        this.tooltip.classList.remove('position-top', 'position-bottom');
        this.tooltip.classList.add(`position-${position}`);
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }
}

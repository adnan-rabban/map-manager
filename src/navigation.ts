import { notify } from './notifications.js';
import type { MapEngine } from './map.js';
import type { Location, LngLat, Coordinates, SearchFeature, Route, CoordinatesCallback } from './types';

// Declare global maptilersdk
declare const maptilersdk: any;

export class Navigation {
    private map: MapEngine;
    private startCoords: Coordinates | null = null;
    private destCoords: Coordinates | null = null;
    private panel: HTMLElement | null = null;
    private startInput: HTMLInputElement | null = null;
    private destInput: HTMLInputElement | null = null;
    private suggestions: HTMLElement | null = null;
    private isNavigating: boolean = false;
    private watchId: number | null = null;
    private navMarker: any = null;
    private navPuckEl: HTMLElement | null = null;
    private userLocationPopup: any = null;

    constructor(mapEngine: MapEngine) {
        this.map = mapEngine;
        this.initUI();
    }

    private initUI(): void {
        this.panel = document.getElementById('nav-panel');
        this.startInput = document.getElementById('nav-start') as HTMLInputElement;
        this.destInput = document.getElementById('nav-dest') as HTMLInputElement;
        this.suggestions = document.getElementById('nav-suggestions');
        
        // Buttons
        const btnCloseNav = document.getElementById('btn-close-nav');
        const btnStartNav = document.getElementById('btn-start-nav');
        const btnMyLocation = document.getElementById('btn-my-location');
        const btnOpenNav = document.getElementById('btn-open-nav');
        const btnClear = document.getElementById('btn-clear-route');

        if (btnCloseNav) {
            btnCloseNav.addEventListener('click', () => this.togglePanel(false));
        }
        if (btnStartNav) {
            btnStartNav.addEventListener('click', () => this.startNavigation());
        }
        if (btnMyLocation) {
            btnMyLocation.addEventListener('click', () => this.useMyLocation());
        }
        if (btnOpenNav) {
            btnOpenNav.addEventListener('click', () => this.togglePanel(true));
        }
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                this.map.clearRoute();
                this.stopRealTimeNavigation();
                btnClear.classList.remove('visible');
                
                const instructions = document.getElementById('nav-instructions');
                if (instructions) instructions.remove();
            });
        }
        
        // Input Autocomplete
        if (this.startInput) {
            this.setupAutocomplete(this.startInput, 'btn-clear-start', (coords) => this.startCoords = coords);
        }
        if (this.destInput) {
            this.setupAutocomplete(this.destInput, 'btn-clear-dest', (coords) => this.destCoords = coords);
        }
    }

    private togglePanel(show: boolean): void {
        if (show) {
            this.panel?.classList.add('open');
            const sidebar = document.getElementById('sidebar-panel');
            if (sidebar) sidebar.classList.add('collapsed');
        } else {
            this.panel?.classList.remove('open');
        }
    }

    setDestination(location: Location): void {
        this.togglePanel(true);
        if (this.destInput) {
            this.destInput.value = location.name;
        }
        this.destCoords = { lng: location.lng, lat: location.lat };
    }

    private async useMyLocation(): Promise<void> {
        if (!navigator.geolocation) {
            notify.show("Geolocation not supported", 'error');
            return;
        }

        if (this.startInput) {
            this.startInput.value = "Locating...";
        }
        
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.startCoords = {
                    lng: pos.coords.longitude,
                    lat: pos.coords.latitude
                };
                if (this.startInput) {
                    this.startInput.value = "My Location";
                }
                this.destInput?.focus();
                
                const clearBtn = document.getElementById('btn-clear-start');
                if (clearBtn) clearBtn.classList.remove('hidden');

                notify.show("Location found", 'success');
            },
            (err) => {
                console.error(err);
                if (this.startInput) {
                    this.startInput.value = "";
                }
                notify.show("Could not get location", 'error');
            }
        );
    }

    private setupAutocomplete(input: HTMLInputElement, clearBtnId: string, callback: CoordinatesCallback): void {
        let debounceTimer: number;
        const clearBtn = document.getElementById(clearBtnId);
        
        const toggleClearBtn = (): void => {
            if (!clearBtn) return;
            if (input.value.length > 0) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        };

        toggleClearBtn();

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                input.focus();
                toggleClearBtn();
                this.suggestions?.classList.add('hidden');
                callback(null);
            });
        }
        
        input.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const query = target.value;
            toggleClearBtn();
            clearTimeout(debounceTimer);
            
            if (query.length < 3) {
                this.suggestions?.classList.add('hidden');
                return;
            }

            debounceTimer = window.setTimeout(async () => {
                const results = await this.map.searchPlaces(query);
                if (input.value !== query) return;
                this.showSuggestions(results, input, callback);
            }, 300);
        });
    }

    private showSuggestions(features: SearchFeature[], activeInput: HTMLInputElement, coordCallback: CoordinatesCallback): void {
        if (!this.suggestions) return;

        if (features.length === 0) {
            this.suggestions.classList.add('hidden');
            return;
        }

        this.suggestions.innerHTML = features.map(f => {
            const parts = f.place_name.split(',');
            const mainText = parts[0];
            const subText = parts.slice(1).join(',').trim();
            const badgeHtml = f.category ? `<span class="ios-badge">${f.category}</span>` : '';
            
            return `
            <div class="search-result-item">
                <div class="result-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div class="result-text">
                    <div class="result-main">${mainText} ${badgeHtml}</div>
                    <div class="result-sub">${subText || ''}</div>
                </div>
            </div>
            `;
        }).join('');
        
        this.suggestions.classList.remove('hidden');

        const items = this.suggestions.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            item.addEventListener('click', () => {
                const feature = features[index];
                activeInput.value = feature.place_name;
                coordCallback({
                    lng: feature.center[0],
                    lat: feature.center[1]
                });
                this.suggestions?.classList.add('hidden');
            });
        });
    }

    private async startNavigation(): Promise<void> {
        if (!this.startCoords || !this.destCoords) {
            notify.show("Please set both start and destination", 'error');
            return;
        }

        const routes = await this.map.calculateRoute(this.startCoords, this.destCoords);
        
        if (!routes || routes.length === 0) return;

        const btnClear = document.getElementById('btn-clear-route');
        if (btnClear) btnClear.classList.add('visible');

        this.displayInstructions(routes[0]);

        this.map.onRouteChanged((route: Route) => {
            this.displayInstructions(route);
        });
    }

    private displayInstructions(route: Route): void {
        let existing = document.getElementById('nav-instructions');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'nav-instructions';
        container.className = 'nav-instructions';

        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMins = Math.round(route.duration / 60);

        container.innerHTML = `
            <div style="padding: 12px 16px; border-bottom: 1px solid rgba(0,0,0,0.05); background: rgba(255,255,255,0.8);">
                <div style="font-weight: 600; font-size: 15px; color: var(--primary);">
                    ${distanceKm} km • ${durationMins} min
                </div>
            </div>
            <button id="btn-follow-user" class="btn-follow-user" style="margin: 12px 16px 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Start "Follow User" Mode
            </button>
        `;

        this.panel?.appendChild(container);

        const btnFollow = container.querySelector('#btn-follow-user');
        if (btnFollow) {
            btnFollow.addEventListener('click', () => {
                if (this.isNavigating) {
                    this.stopRealTimeNavigation();
                } else {
                    this.startRealTimeNavigation();
                }
            });
        }
    }

    private async startRealTimeNavigation(): Promise<void> {
        if (!navigator.geolocation) {
            notify.show("Geolocation not supported", 'error');
            return;
        }

        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }

        this.isNavigating = true;

        const btnFollow = document.getElementById('btn-follow-user');
        if (btnFollow) {
            btnFollow.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                Exit Navigation
            `;
            (btnFollow as HTMLElement).style.backgroundColor = '#FF3B30';
            (btnFollow as HTMLElement).style.color = 'white';
        }

        if (!this.navMarker) {
            const el = document.createElement('div');
            el.className = 'nav-puck-wrapper';
            el.innerHTML = `
                <div class="nav-puck">
                    <svg viewBox="0 0 100 100" width="48" height="48" style="overflow: visible;">
                        <defs>
                            <linearGradient id="wazeBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#5CC0FF;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#007AFF;stop-opacity:1" />
                            </linearGradient>
                            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.25"/>
                            </filter>
                        </defs>
                        <g filter="url(#dropShadow)">
                            <path d="M50 15 L85 85 L50 70 L15 85 Z" fill="url(#wazeBlue)" stroke="white" stroke-width="6" stroke-linejoin="round" />
                        </g>
                    </svg>
                </div>`;
            
            this.navMarker = new maptilersdk.Marker({
                element: el,
                rotationAlignment: 'map',
                pitchAlignment: 'map'
            })
            .setLngLat([0, 0])
            .addTo(this.map.map);
            
            this.navPuckEl = el.querySelector('.nav-puck');

            el.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                const lngLat = this.navMarker.getLngLat();
                if (!lngLat) return;

                const html = `
                    <div class="poi-popup">
                        <h3>My Location</h3>
                         <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 8px;">
                            <strong>Lat:</strong> ${lngLat.lat.toFixed(6)}<br>
                            <strong>Lng:</strong> ${lngLat.lng.toFixed(6)}
                        </div>
                         <div style="font-size: 0.8em; color: #888;">
                            Updates in real-time
                        </div>
                    </div>
                `;

                if (this.userLocationPopup) this.userLocationPopup.remove();
                
                this.userLocationPopup = new maptilersdk.Popup({ 
                    offset: 25, 
                    className: 'glass-popup', 
                    closeButton: true 
                })
                    .setLngLat(lngLat)
                    .setHTML(html)
                    .addTo(this.map.map);
                    
                this.userLocationPopup.on('close', () => {
                     this.userLocationPopup = null;
                });
            });
        }

        notify.show("Starting Real-Time Navigation...", 'success');

        const options: PositionOptions = {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000 
        };

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { longitude, latitude, heading, speed } = pos.coords;
                const coords: [number, number] = [longitude, latitude];

                if (this.navMarker) this.navMarker.setLngLat(coords);

                if (this.userLocationPopup && this.userLocationPopup.isOpen()) {
                     this.userLocationPopup.setLngLat(coords);
                     const html = `
                        <div class="poi-popup">
                            <h3>My Location</h3>
                             <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 8px;">
                                <strong>Lat:</strong> ${latitude.toFixed(6)}<br>
                                <strong>Lng:</strong> ${longitude.toFixed(6)}
                            </div>
                             <div style="font-size: 0.8em; color: #888;">
                                Speed: ${speed ? (speed * 3.6).toFixed(1) + ' km/h' : '0 km/h'}
                            </div>
                        </div>
                    `;
                    this.userLocationPopup.setHTML(html);
                }

                const bearing = heading || 0;
                if (this.navPuckEl) {
                   this.navPuckEl.style.transform = `rotate(${bearing}deg)`;
                }

                this.map.map.easeTo({
                    center: coords,
                    zoom: 18,
                    pitch: 60,
                    bearing: bearing,
                    duration: 1000,
                    easing: (t: number) => t * (2 - t)
                });
            },
            (err) => {
                console.error(err);
                if (err.code === 1) notify.show("Location permission denied", 'error');
                else notify.show("Signal lost. Searching...", 'error');
            },
            options
        );
    }

    private stopRealTimeNavigation(): void {
        this.isNavigating = false;
        
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (this.navMarker) {
            this.navMarker.remove();
            this.navMarker = null;
            this.navPuckEl = null;
        }

        const btnFollow = document.getElementById('btn-follow-user');
        if (btnFollow) {
            btnFollow.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Start "Follow User" Mode
            `;
            (btnFollow as HTMLElement).style.backgroundColor = '';
            (btnFollow as HTMLElement).style.color = '';
        }

        this.map.map.easeTo({
            pitch: 0,
            bearing: 0,
            zoom: 15,
            duration: 1000
        });

        notify.show("Navigation stopped.", 'info');
    }
}

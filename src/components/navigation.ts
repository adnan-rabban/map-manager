import { notify } from './notifications.js';
import type { MapEngine } from '../core/map.js';
import type { Location, LngLat, Coordinates, SearchFeature, Route, CoordinatesCallback } from '../types/types';

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
    
    private lastBearing: number = 0;
    private lastCoords: [number, number] | null = null;
    private lastTimestamp: number = 0;
    private deviceHeading: number | null = null;
    private orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

    constructor(mapEngine: MapEngine) {
        this.map = mapEngine;
        this.initUI();
    }

    private initUI(): void {
        this.panel = document.getElementById('nav-panel');
        this.startInput = document.getElementById('nav-start') as HTMLInputElement;
        this.destInput = document.getElementById('nav-dest') as HTMLInputElement;
        this.suggestions = document.getElementById('nav-suggestions');
        
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
                this.map.resetCamera();
                this.stopRealTimeNavigation();
                btnClear.classList.remove('visible');
                
                const instructions = document.getElementById('nav-instructions');
                if (instructions) instructions.remove();
            });
        }
        
        if (this.startInput) {
            this.setupAutocomplete(this.startInput, 'btn-clear-start', (coords) => this.startCoords = coords);
        }
        if (this.destInput) {
            this.setupAutocomplete(this.destInput, 'btn-clear-dest', (coords) => this.destCoords = coords);
        }
    }

    private togglePanel(show: boolean): void {
        const sidebar = document.getElementById('sidebar-panel');
        const appContainer = document.getElementById('app');
        const btnSidebar = document.getElementById('btn-open-sidebar');

        if (show) {
           this.panel?.classList.add('open');
           if (sidebar) sidebar.classList.add('collapsed');
           if (appContainer) appContainer.classList.add('collapsed-view'); 
           if (btnSidebar) btnSidebar.style.display = 'flex';
        } else {
            this.panel?.classList.remove('open');
           if (sidebar) sidebar.classList.remove('collapsed');
           if (appContainer) appContainer.classList.remove('collapsed-view'); 
           
           if (btnSidebar) btnSidebar.style.display = '';
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
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const accuracy = pos.coords.accuracy;
                
                if (accuracy > 100) {
                    console.warn(`Low GPS accuracy: ${accuracy}m`);
                    notify.show(`Location found (accuracy: ${Math.round(accuracy)}m). Try moving to open area for better signal.`, 'warning');
                }
                
                const lng = pos.coords.longitude;
                const lat = pos.coords.latitude;
                
                console.log('GPS Coordinates:', { lng, lat, accuracy });
                
                this.startCoords = { lng, lat };
                
                if (this.startInput) {
                    this.startInput.value = `My Location (±${Math.round(accuracy)}m)`;
                }
                
                this.map.flyTo({
                    center: [lng, lat],
                    zoom: 17,
                    pitch: 45,
                    essential: true,
                    duration: 2000
                });

                this.destInput?.focus();
                
                const clearBtn = document.getElementById('btn-clear-start');
                if (clearBtn) clearBtn.classList.remove('hidden');

                notify.show(`Location found with ${Math.round(accuracy)}m accuracy`, 'success');
            },
            (err) => {
                console.error('Geolocation Error:', err);
                
                if (this.startInput) {
                    this.startInput.value = "";
                }
                
                let errorMessage = "Could not get location. ";
                
                switch(err.code) {
                    case err.PERMISSION_DENIED:
                        errorMessage += "Please allow location access.";
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMessage += "GPS signal unavailable. Try moving to open area.";
                        break;
                    case err.TIMEOUT:
                        errorMessage += "Request timeout. Please try again.";
                        break;
                    default:
                        errorMessage += "Unknown error occurred.";
                }
                
                notify.show(errorMessage, 'error');
            },
            options
        );
    }

    private resetRouteUI(): void {
        const headerCard = document.querySelector('.route-header-card');
        const listCard = document.querySelector('.route-list-card');
        const followBtn = document.getElementById('btn-follow-user');
        
        if (headerCard) headerCard.remove();
        if (listCard) listCard.remove();
        if (followBtn) followBtn.remove();
        
        const origBtn = document.getElementById('btn-start-nav');
        if (origBtn) origBtn.style.display = 'block';

        const clearBtn = document.getElementById('btn-clear-route');
        if (clearBtn) clearBtn.classList.remove('visible');

        this.map.clearRoute();
        this.activeRoute = null;
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
                this.resetRouteUI();
            });
        }
        
        input.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const query = target.value;
            toggleClearBtn();
            clearTimeout(debounceTimer);
            
            if (query.length > 0) {
               this.resetRouteUI();
            }
            
            if (query.length < 3) {
                this.suggestions?.classList.add('hidden');
                return;
            }
            
            debounceTimer = window.setTimeout(async () => {
                const results = await this.map.searchPlaces(query);
                this.showSuggestions(results, input, callback);
            }, 300);
        });
    }

    private showSuggestions(results: SearchFeature[], input: HTMLInputElement, callback: CoordinatesCallback): void {
        const suggestions = this.suggestions;
        if (!suggestions) return;
        
        suggestions.innerHTML = '';
        
        if (results.length === 0) {
            suggestions.classList.add('hidden');
            return;
        }
        
        results.forEach((r) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = r.place_name || r.text || 'Unknown';
            div.addEventListener('click', () => {
                input.value = r.place_name || r.text || '';
                const center = r.center;
                if (center && center.length >= 2) {
                    callback({ lng: center[0], lat: center[1] });
                }
                suggestions.classList.add('hidden');
            });
            suggestions.appendChild(div);
        });
        
        suggestions.classList.remove('hidden');
    }

    private async startNavigation(): Promise<void> {
        if (!this.startCoords || !this.destCoords) {
            notify.show("Please set start and destination", 'warning');
            return;
        }

        const response = await this.map.getRoute(this.startCoords, this.destCoords);
        const routes = response?.routes;
        
        if (!routes || routes.length === 0) {
            notify.show("No route found", 'error');
            return;
        }

        this.map.drawRoutes(routes, 0);
        this.activeRoute = routes[0];
        this.buildRouteUI(routes);

        const btnClear = document.getElementById('btn-clear-route');
        if (btnClear) btnClear.classList.add('visible');
    }



    private activeRoute: Route | null = null;
    private hudPanel: HTMLElement | null = null;
    private lastAnnouncedStepIndex: number = -1;

    private buildRouteUI(routes: Route[]): void {
        const origBtn = document.getElementById('btn-start-nav');
        if (origBtn) origBtn.style.display = 'none';

        const existingFollow = document.getElementById('btn-follow-user');
        if (existingFollow) existingFollow.remove();

        const btnFollow = document.createElement('button');
        btnFollow.id = 'btn-follow-user';
        btnFollow.className = 'btn-primary';
        btnFollow.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            Start "Follow User" Mode
        `;
        btnFollow.addEventListener('click', () => {
            if (this.isNavigating) {
                this.stopRealTimeNavigation();
            } else {
                this.startRealTimeNavigation();
            }
        });
        origBtn?.parentElement?.appendChild(btnFollow);
    }

    private createHUD(): void {
        if (this.hudPanel) return;

        const hud = document.createElement('div');
        hud.id = 'nav-hud';
        hud.className = 'nav-hud hidden';
        hud.innerHTML = `
            <div class="nav-hud-instruction"></div>
            <div class="nav-hud-distance"></div>
        `;
        document.body.appendChild(hud);
        this.hudPanel = hud;
    }

    private updateHUD(step: any, distanceToStep: number): void {
        if (!this.hudPanel) return;

        const instrEl = this.hudPanel.querySelector('.nav-hud-instruction');
        const distEl = this.hudPanel.querySelector('.nav-hud-distance');

        if (instrEl) instrEl.textContent = step.text || 'Continue';
        if (distEl) distEl.textContent = `${Math.round(distanceToStep)} m`;
    }

    private startRealTimeNavigation(): void {
        if (!this.activeRoute) {
            notify.show("No active route", 'error');
            return;
        }

        if (this.map.geolocateControl) {
            const isTracking = this.map.geolocateControl._watchState !== 'OFF';
            if (isTracking) {
                this.map.geolocateControl.trigger();
            }
        }

        this.map.map.getContainer().classList.add('nav-active');

        this.isNavigating = true;
        this.createHUD();
        this.hudPanel?.classList.remove('hidden');

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
            if (typeof maptilersdk === 'undefined') {
                console.error("MapTiler SDK not loaded");
                notify.show("MapTiler SDK Error", "error");
                return;
            }

            const el = document.createElement('div');
            el.className = 'nav-puck-wrapper';
            el.innerHTML = `
                <div class="nav-puck">
                    <svg viewBox="0 0 100 100" width="48" height="48" style="overflow: visible;">
                        <desc>Navigation Arrow</desc>
                        <path d="M50 15 L85 85 L50 70 L15 85 Z" fill="#007AFF" stroke="white" stroke-width="6" stroke-linejoin="round" />
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
        }

        if (window.DeviceOrientationEvent) {
             this.orientationHandler = (event: DeviceOrientationEvent) => {
                 if (event.alpha !== null) {
                     let heading: number | null = null;
                     
                     if ((event as any).webkitCompassHeading) {
                         heading = (event as any).webkitCompassHeading;
                     } else {
                         heading = 360 - (event.alpha || 0);
                     }
                     
                     if (heading !== null) {
                         this.deviceHeading = heading % 360;
                     }
                 }
             };
             window.addEventListener('deviceorientation', this.orientationHandler, true);
        }

        notify.show("Starting Real-Time Navigation...", 'success');

        const watchOptions = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (!this.isNavigating) return;

                const { longitude, latitude, heading, speed, accuracy } = pos.coords;
                
                if (accuracy > 50) {
                    console.warn(`Navigation with low accuracy: ${accuracy}m`);
                }
                
                const coords: [number, number] = [longitude, latitude];
                const timestamp = pos.timestamp;

                let currentSpeed = speed;
                if (currentSpeed === null && this.lastCoords && this.lastTimestamp) {
                    const dist = this.getDist(this.lastCoords[1], this.lastCoords[0], latitude, longitude);
                    const timeDiff = (timestamp - this.lastTimestamp) / 1000;
                    if (timeDiff > 0) {
                        currentSpeed = dist / timeDiff;
                    }
                }
                currentSpeed = currentSpeed || 0;

                let bearing = heading;
                
                if (!bearing && this.lastCoords) {
                     const dist = this.getDist(this.lastCoords[1], this.lastCoords[0], latitude, longitude);
                     if (dist > 2) {
                         bearing = this.calculateBearing(this.lastCoords[1], this.lastCoords[0], latitude, longitude);
                     }
                }

                // Fallback to compass if stationary or no GPS bearing
                if ((bearing === null || bearing === undefined || isNaN(bearing)) && currentSpeed < 1) { // < 1 m/s (~3.6 km/h)
                    if (this.deviceHeading !== null) {
                        bearing = this.deviceHeading;
                    }
                }

                if (bearing === null || bearing === undefined || isNaN(bearing)) {
                    bearing = this.lastBearing;
                }
                
                this.lastBearing = bearing;
                this.lastCoords = coords;
                this.lastTimestamp = timestamp;

                if (this.navMarker) this.navMarker.setLngLat(coords);
                if (this.navPuckEl) this.navPuckEl.style.transform = `rotate(${bearing}deg)`;
                
                let targetZoom = 18;
                let targetPitch = 50;

                if (currentSpeed > 15) {
                    targetZoom = 15;
                    targetPitch = 60;
                } else if (currentSpeed > 8) {
                    targetZoom = 16.5; 
                    targetPitch = 55;
                } else {
                    targetZoom = 18.5;
                    targetPitch = 45;
                }

                this.map.map.easeTo({
                    center: coords,
                    zoom: targetZoom,
                    pitch: targetPitch,
                    bearing: bearing,
                    duration: 1000,
                    easing: (t: number) => t
                });

                if (this.activeRoute && this.activeRoute.instructions) {
                    let minDist = Infinity;
                    let closestStepIndex = -1;

                    this.activeRoute.instructions.forEach((instr, idx) => {
                        if (instr.maneuver && instr.maneuver.location) {
                            const d = this.getDist(latitude, longitude, instr.maneuver.location[1], instr.maneuver.location[0]);
                            if (d < minDist) {
                                minDist = d;
                                closestStepIndex = idx;
                            }
                        }
                    });

                    if (closestStepIndex !== -1) {
                         const step = this.activeRoute.instructions[closestStepIndex];
                         this.updateHUD(step, minDist);

                         if (minDist < 50 && closestStepIndex > this.lastAnnouncedStepIndex) {
                             if ('speechSynthesis' in window) {
                                 const utterance = new SpeechSynthesisUtterance(`In 50 meters, ${step.text}`);
                                 window.speechSynthesis.speak(utterance);
                             }

                             
                             notify.show(`Turn: ${step.text}`, 'info');
                             this.lastAnnouncedStepIndex = closestStepIndex;
                         }
                    }
                }
            },
            (err) => {
                console.error('Navigation Geolocation Error:', err);
                
                let errorMessage = "GPS error during navigation: ";
                switch(err.code) {
                    case err.PERMISSION_DENIED:
                        errorMessage += "Location access denied";
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMessage += "GPS signal lost";
                        break;
                    case err.TIMEOUT:
                        errorMessage += "GPS timeout";
                        break;
                    default:
                        errorMessage += "Unknown error";
                }
                notify.show(errorMessage, 'error');
            },
            watchOptions
        );
    }

    private calculateBearing(startLat: number, startLng: number, destLat: number, destLng: number): number {
        const startLatRad = startLat * Math.PI / 180;
        const startLngRad = startLng * Math.PI / 180;
        const destLatRad = destLat * Math.PI / 180;
        const destLngRad = destLng * Math.PI / 180;

        const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
        const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
                  Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
        
        let brng = Math.atan2(y, x);
        brng = brng * 180 / Math.PI;
        return (brng + 360) % 360;
    }

    private getDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    private stopRealTimeNavigation(): void {
        this.isNavigating = false;
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (this.orientationHandler && window.DeviceOrientationEvent) {
             window.removeEventListener('deviceorientation', this.orientationHandler, true);
             this.orientationHandler = null;
        }

        if (this.navMarker) {
            try {
                this.navMarker.remove();
            } catch (e) {
                console.error("Error removing marker:", e);
            }
            this.navMarker = null;
        }
        
        this.map.map.getContainer().classList.remove('nav-active');

        this.hudPanel?.classList.add('hidden');

        const btnFollow = document.getElementById('btn-follow-user');
        if (btnFollow) {
            btnFollow.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Start "Follow User" Mode
            `;
            (btnFollow as HTMLElement).style.backgroundColor = '';
            (btnFollow as HTMLElement).style.color = '';
        }

        this.map.map.easeTo({ pitch: 0, bearing: 0, zoom: 15, duration: 1000 });
        notify.show("Navigation stopped.", 'info');
    }
}
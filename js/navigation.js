import { notify } from './notifications.js';

export class Navigation {
    constructor(mapEngine) {
        this.map = mapEngine;
        this.startCoords = null;
        this.destCoords = null;
        
        this.initUI();
    }

    initUI() {
        this.panel = document.getElementById('nav-panel');
        this.startInput = document.getElementById('nav-start');
        this.destInput = document.getElementById('nav-dest');
        this.suggestions = document.getElementById('nav-suggestions');
        
        // Buttons
        document.getElementById('btn-close-nav').addEventListener('click', () => this.togglePanel(false));
        document.getElementById('btn-start-nav').addEventListener('click', () => this.startNavigation());
        document.getElementById('btn-my-location').addEventListener('click', () => this.useMyLocation());
        
        // Open Nav Button (Main)
        const btnOpenNav = document.getElementById('btn-open-nav');
        if(btnOpenNav) {
            btnOpenNav.addEventListener('click', () => {
                this.togglePanel(true);
            });
        }
        
        // Clear Route Button
        const btnClear = document.getElementById('btn-clear-route');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                this.map.clearRoute();
                this.stopRealTimeNavigation(); // Fix: Stop navigation when clearing
                btnClear.classList.remove('visible');
                
                // Clear Instructions
                const instructions = document.getElementById('nav-instructions');
                if (instructions) instructions.remove();
                
                // Also reset inputs if needed, or keep panel open?
                // For now, just clear map.
            });
        }
        
        // Input Autocomplete
        this.setupAutocomplete(this.startInput, 'btn-clear-start', (coords) => this.startCoords = coords);
        this.setupAutocomplete(this.destInput, 'btn-clear-dest', (coords) => this.destCoords = coords);
    }

    togglePanel(show) {
        if (show) {
            this.panel.classList.add('open');
            // Close sidebar if open
            document.getElementById('sidebar-panel').classList.add('collapsed');
        } else {
            this.panel.classList.remove('open');
            // FIX: Do NOT clear route here. Allow map to keep route visible.
            // this.map.clearRoute(); 
            // document.getElementById('btn-clear-route').classList.remove('visible');
            
            // Optional: We can keep instructions or clear them. 
            // Usually, if we close the panel, we might want to clear instructions to save memory? 
            // But if we re-open, we'd want them back.
            // For now, let's leave them.
        }
    }

    setDestination(location) {
        this.togglePanel(true);
        this.destInput.value = location.name;
        this.destCoords = { lng: location.lng, lat: location.lat };
    }

    async useMyLocation() {
        if (!navigator.geolocation) {
            notify.show("Geolocation not supported", 'error');
            return;
        }

        this.startInput.value = "Locating...";
        
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.startCoords = {
                    lng: pos.coords.longitude,
                    lat: pos.coords.latitude
                };
                this.startInput.value = "My Location";
                this.destInput.focus(); // Focus destination after finding location
                
                // Toggle clear button for start input since we set value
                const clearBtn = document.getElementById('btn-clear-start');
                if(clearBtn) clearBtn.classList.remove('hidden');

                notify.show("Location found", 'success');
            },
            (err) => {
                console.error(err);
                this.startInput.value = "";
                notify.show("Could not get location", 'error');
            }
        );
    }

    setupAutocomplete(input, clearBtnId, callback) {
        let debounceTimer;
        const clearBtn = document.getElementById(clearBtnId);
        
        // Toggle Clear Button Visibility
        const toggleClearBtn = () => {
             if (input.value.length > 0) {
                 clearBtn.classList.remove('hidden');
             } else {
                 clearBtn.classList.add('hidden');
             }
        };

        // Initial check
        toggleClearBtn();

        // Clear Button Interaction
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                input.focus();
                toggleClearBtn();
                this.suggestions.classList.add('hidden');
                callback(null); // Clear coords
            });
        }
        
        input.addEventListener('input', (e) => {
            const query = e.target.value;
            toggleClearBtn();
            clearTimeout(debounceTimer);
            
            if (query.length < 3) {
                this.suggestions.classList.add('hidden');
                return;
            }

            debounceTimer = setTimeout(async () => {
                const results = await this.map.searchPlaces(query);
                // Fix: Discard results if input has changed (e.g. user cleared it)
                if (input.value !== query) return;
                this.showSuggestions(results, input, callback);
            }, 300);
        });
        
        // Focus handler to show history? (Optional)
    }

    showSuggestions(features, activeInput, coordCallback) {
        if (features.length === 0) {
            this.suggestions.classList.add('hidden');
            return;
        }

        this.suggestions.innerHTML = features.map(f => {
            // Split place name for better display if possible, or just use full
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

        // Click handler
        const items = this.suggestions.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            item.addEventListener('click', () => {
                const feature = features[index];
                activeInput.value = feature.place_name;
                coordCallback({
                    lng: feature.center[0],
                    lat: feature.center[1]
                });
                this.suggestions.classList.add('hidden');
            });
        });
    }

    async startNavigation() {
        if (!this.startCoords || !this.destCoords) {
            notify.show("Please select both start and destination points", 'error');
            return;
        }

        notify.show("Calculating route...", 'info');
        
        // Subscribe to route changes happening in MapEngine (e.g. user clicks gray route)
        this.map.onRouteChanged((newRoute) => {
            this.renderInstructions(newRoute);
        });

        const route = await this.map.calculateRoute(this.startCoords, this.destCoords);
        
        if (route) {
            // Show clear button immediately
            const clearBtn = document.getElementById('btn-clear-route');
            if (clearBtn) clearBtn.classList.add('visible');
            
            // Render text instructions
            this.renderInstructions(route);
            
            // Mobile: Close panel to see map?
            if (window.innerWidth < 600) {
                 this.togglePanel(false);
            }
        }
    }

    renderInstructions(route) {
        // Create container if missing (it might be missing if we haven't added it to HTML yet via JS, 
        // but let's append it to nav-panel if not found)
        let container = document.getElementById('nav-instructions');
        if (!container) {
            container = document.createElement('div');
            container.id = 'nav-instructions';
            container.className = 'nav-instructions';
            this.panel.appendChild(container);
        }

        if (!route.legs || !route.legs[0]) return;

        const steps = route.legs[0].steps;
        const html = steps.map((step, index) => {
            // Simple icon logic (could be improved with mapping 'maneuver.type' to specific icons)
            let icon = '↑';
            if (step.maneuver) {
                const type = step.maneuver.type;
                const modifier = step.maneuver.modifier;
                
                if (type === 'turn') {
                    if (modifier && modifier.includes('right')) icon = '→';
                    if (modifier && modifier.includes('left')) icon = '←';
                } else if (type === 'depart') {
                   icon = '○';
                } else if (type === 'arrive') {
                   icon = '★';
                }
            }
            
            // Format distance
            let dist = step.distance < 1000 
                ? `${Math.round(step.distance)} m` 
                : `${(step.distance / 1000).toFixed(1)} km`;

            // Format Instruction Text
            let text = step.maneuver.instruction; // Try standard instruction first
            
            if (!text) {
                const m = step.maneuver;
                const name = step.name ? `onto ${step.name}` : '';
                const type = m.type;
                const modifier = m.modifier ? m.modifier.replace(/_/g, ' ') : '';
                
                if (type === 'depart') text = `Head ${modifier} ${name}`;
                else if (type === 'arrive') text = `Arrive at destination`;
                else if (type === 'roundabout') text = `At roundabout, take exit ${m.exit} ${name}`;
                else if (type === 'turn') text = `Turn ${modifier} ${name}`;
                else if (type === 'merge') text = `Merge ${modifier} ${name}`;
                else if (type === 'fork') text = `Keep ${modifier} ${name}`;
                else if (type === 'continue') text = `Continue ${modifier} ${name}`;
                else if (type === 'new name') text = `Continue ${name}`;
                else text = `${type} ${modifier} ${name}`;
                
                // Capitalize first letter
                text = text.charAt(0).toUpperCase() + text.slice(1);
            }

            return `
                <div class="instruction-step">
                    <div class="step-icon">${icon}</div>
                    <div class="step-content">
                        <div class="step-text">${text}</div>
                        <div class="step-dist">${dist}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add Header
        const duration = Math.round(route.duration / 60);
        const totalDist = (route.distance / 1000).toFixed(1);
        
        container.innerHTML = `
            <div style="padding: 0 10px 10px; border-bottom: 1px solid rgba(0,0,0,0.05); margin-bottom: 10px;">
                <div style="font-weight: 700; font-size: 18px; color: var(--primary);">${duration} min <span style="font-weight:400; color:var(--text-secondary); font-size: 14px;">(${totalDist} km)</span></div>
            </div>
            ${html}
             <div style="padding: 16px 10px;">
                <button id="btn-follow-user" class="btn-follow-user" style="width: 100%;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    Start "Follow User" Mode
                </button>
            </div>
        `;


        // Bind Follow Button
        const btnFollow = container.querySelector('#btn-follow-user');
        if(btnFollow) {
            btnFollow.addEventListener('click', () => {
                if (this.isNavigating) {
                    this.stopRealTimeNavigation();
                } else {
                    this.startRealTimeNavigation();
                }
            });
        }
    }

    async startRealTimeNavigation() {
        if (!navigator.geolocation) {
            notify.show("Geolocation not supported", 'error');
            return;
        }

        // Clean up existing watcher if any
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }

        this.isNavigating = true; // State flag

        // Update Button UI
        const btnFollow = document.getElementById('btn-follow-user');
        if (btnFollow) {
            btnFollow.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                Exit Navigation
            `;
            btnFollow.style.backgroundColor = '#FF3B30'; // Red
            btnFollow.style.color = 'white';
        }

        // Create Custom Marker (Blue Triangle) if not exists
        if (!this.navMarker) {
            const el = document.createElement('div');
            el.className = 'nav-puck-wrapper';
            // Waze-like Arrow: SVG for better shape control (Blue gradient, white border, rounded)
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
            .setLngLat([0, 0]) // Init somewhere
            .addTo(this.map.map); // Accessing raw Map instance from MapEngine
            
            this.navPuckEl = el.querySelector('.nav-puck');

            // Click to show coordinates
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const lngLat = this.navMarker.getLngLat();
                if(!lngLat) return;

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
                
                this.userLocationPopup = new maptilersdk.Popup({ offset: 25, className: 'glass-popup', closeButton: true })
                    .setLngLat(lngLat)
                    .setHTML(html)
                    .addTo(this.map.map);
                    
                this.userLocationPopup.on('close', () => {
                     this.userLocationPopup = null;
                });
            });
        }

        notify.show("Starting Real-Time Navigation...", 'success');

        const options = {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000 
        };

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { longitude, latitude, heading, speed } = pos.coords;
                const coords = [longitude, latitude];

                // Update Marker Position
                if (this.navMarker) this.navMarker.setLngLat(coords);

                // Update Popup if open
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

                // Update Marker Rotation (Heading)
                const bearing = heading || 0;
                if (this.navPuckEl) {
                   this.navPuckEl.style.transform = `rotate(${bearing}deg)`;
                }

                // Smooth Camera Update
                this.map.map.easeTo({
                    center: coords,
                    zoom: 18, // Close up for navigation
                    pitch: 60, // 3D View
                    bearing: bearing, // Rotate map to follow heading
                    duration: 1000,
                    easing: (t) => t * (2 - t) // EaseOutQuad
                });
            },
            (err) => {
                console.error(err);
                if (err.code === 1) notify.show("Location permission denied", 'error');
                else notify.show("Signal lost. Searching...", 'warning');
            },
            options
        );
    }

    stopRealTimeNavigation() {
        this.isNavigating = false;
        
        // Stop Watch
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Remove Marker
        if (this.navMarker) {
            this.navMarker.remove();
            this.navMarker = null;
            this.navPuckEl = null;
        }

        // Reset UI Button
        const btnFollow = document.getElementById('btn-follow-user');
        if (btnFollow) {
            btnFollow.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Start "Follow User" Mode
            `;
            btnFollow.style.backgroundColor = ''; // Reset to default
            btnFollow.style.color = '';
        }

        // Reset Map View (Optional: Go back to route bounds or just stop tilting)
        this.map.map.easeTo({
            pitch: 0,
            bearing: 0,
            zoom: 15,
            duration: 1000
        });

        notify.show("Navigation stopped.", 'info');
    }
}

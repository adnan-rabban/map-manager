import { notify } from './notifications.js';

export class Navigation {
    constructor(mapEngine) {
        this.map = mapEngine;
        this.startCoords = null;
        this.destCoords = null;
        
        this.currentRoute = null;
        this.currentStepIndex = 0;
        this.isNavigating = false;
        this.voiceEnabled = true;

        this.initUI();
        this.initDashboardUI();
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
                this.stopRealTimeNavigation(); 
                btnClear.classList.remove('visible');
                
                const instructions = document.getElementById('nav-instructions');
                if (instructions) instructions.remove();
            });
        }
        
        // Input Autocomplete
        this.setupAutocomplete(this.startInput, 'btn-clear-start', (coords) => this.startCoords = coords);
        this.setupAutocomplete(this.destInput, 'btn-clear-dest', (coords) => this.destCoords = coords);
    }
    
    initDashboardUI() {
        this.dashboard = document.getElementById('nav-dashboard');
        
        // End Button
        document.getElementById('btn-end-trip').addEventListener('click', () => {
            this.stopRealTimeNavigation();
        });

        // Voice Toggle
        const btnVoice = document.getElementById('btn-voice-toggle');
        btnVoice.addEventListener('click', () => {
            this.voiceEnabled = !this.voiceEnabled;
            btnVoice.style.opacity = this.voiceEnabled ? '1' : '0.5';
            
            const icon = this.voiceEnabled ? 
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>' :
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            btnVoice.innerHTML = icon;
            
            if(this.voiceEnabled) {
                this.speak("Voice guidance enabled.");
            }
        });
    }

    togglePanel(show) {
        if (show) {
            this.panel.classList.add('open');
            document.getElementById('sidebar-panel').classList.add('collapsed');
        } else {
            this.panel.classList.remove('open');
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
                this.destInput.focus(); 
                
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
        
        const toggleClearBtn = () => {
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
                this.suggestions.classList.add('hidden');
                callback(null); 
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
                if (input.value !== query) return;
                this.showSuggestions(results, input, callback);
            }, 300);
        });
    }

    showSuggestions(features, activeInput, coordCallback) {
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
        
        this.map.onRouteChanged((newRoute) => {
            this.currentRoute = newRoute;
            this.renderInstructions(newRoute);
        });

        const route = await this.map.calculateRoute(this.startCoords, this.destCoords);
        
        if (route) {
            this.currentRoute = route;
            const clearBtn = document.getElementById('btn-clear-route');
            if (clearBtn) clearBtn.classList.add('visible');
            
            this.renderInstructions(route);
            
            if (window.innerWidth < 600) {
                 this.togglePanel(false);
            }
        }
    }

    renderInstructions(route) {
        let container = document.getElementById('nav-instructions');
        if (!container) {
            container = document.createElement('div');
            container.id = 'nav-instructions';
            container.className = 'nav-instructions';
            this.panel.appendChild(container);
        }

        if (!route.legs || !route.legs[0]) return;

        const steps = route.legs[0].steps;
        this.steps = steps; // Store for tracking

        const html = steps.map((step, index) => {
            const { icon, text, dist } = this.formatStep(step);
            return `
                <div class="instruction-step" data-index="${index}">
                    <div class="step-icon">${icon}</div>
                    <div class="step-content">
                        <div class="step-text">${text}</div>
                        <div class="step-dist">${dist}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        const duration = Math.round(route.duration / 60);
        const totalDist = (route.distance / 1000).toFixed(1);
        
        container.innerHTML = `
            <div style="padding: 0 10px 10px; border-bottom: 1px solid rgba(0,0,0,0.05); margin-bottom: 10px;">
                <div style="font-weight: 700; font-size: 18px; color: var(--primary);">${duration} min <span style="font-weight:400; color:var(--text-secondary); font-size: 14px;">(${totalDist} km)</span></div>
            </div>
            ${html}
             <div style="padding: 16px 10px;">
                <button id="btn-start-drive" class="btn btn-primary" style="width: 100%; font-size: 16px; padding: 12px;">
                    Start Navigation
                </button>
            </div>
        `;

        const btnDrive = container.querySelector('#btn-start-drive');
        if(btnDrive) {
            btnDrive.addEventListener('click', () => {
                this.startRealTimeNavigation();
            });
        }
    }
    
    // Helper to format step info
    formatStep(step) {
        let icon = '↑';
        let rawIcon = 'straight'; // For SVG mapping later
        
        if (step.maneuver) {
            const type = step.maneuver.type;
            const modifier = step.maneuver.modifier;
            
            if (type === 'turn') {
                if (modifier && modifier.includes('right')) { icon = '→'; rawIcon = 'right'; }
                if (modifier && modifier.includes('left')) { icon = '←'; rawIcon = 'left'; }
                if (modifier && modifier.includes('sharp right')) { icon = '↱'; rawIcon = 'sharp-right'; }
                if (modifier && modifier.includes('sharp left')) { icon = '↰'; rawIcon = 'sharp-left'; }
            } else if (type === 'depart') {
               icon = '○'; rawIcon = 'depart';
            } else if (type === 'arrive') {
               icon = '★'; rawIcon = 'arrive';
            } else if (type === 'roundabout') {
               icon = '↻'; rawIcon = 'roundabout';
            }
        }
        
        let dist = step.distance < 1000 
            ? `${Math.round(step.distance)} m` 
            : `${(step.distance / 1000).toFixed(1)} km`;

        let text = step.maneuver.instruction;
        
        if (!text) {
            // Fallback text generation
            const m = step.maneuver;
            const name = step.name ? `onto ${step.name}` : '';
            const type = m.type;
            const modifier = m.modifier ? m.modifier.replace(/_/g, ' ') : '';
            
            if (type === 'depart') text = `Head ${modifier} ${name}`;
            else if (type === 'arrive') text = `Arrive at destination`;
            else if (type === 'roundabout') text = `Take exit ${m.exit}`;
            else if (type === 'turn') text = `Turn ${modifier} ${name}`;
            else if (type === 'merge') text = `Merge ${modifier} ${name}`;
            else if (type === 'new name') text = `Continue ${name}`;
            else text = `${type} ${modifier} ${name}`;
            
            text = text.charAt(0).toUpperCase() + text.slice(1);
        }
        
        return { icon, text, dist, rawIcon };
    }

    async startRealTimeNavigation() {
        if (!navigator.geolocation) {
            notify.show("Geolocation not supported", 'error');
            return;
        }

        // Init State
        this.currentStepIndex = 0;
        this.isNavigating = true;
        this.spokenAnnouncements = new Set(); // Track spoken distances for current step
        
        // Show Dashboard
        this.dashboard.classList.add('active');
        document.body.classList.add('nav-active');
        
        // Speak First Instruction
        if(this.steps && this.steps.length > 0) {
            const firstStep = this.steps[0];
            this.updateDashboardUI(firstStep, 0);
            
            // Speak full initial instruction
            const { text } = this.formatStep(firstStep);
            this.speak(text);
        }

        // Clean up watching
        if (this.watchId) navigator.geolocation.clearWatch(this.watchId);

        // Marker Setup
        this.createNavMarker();

        notify.show("Starting Navigation...", 'success');

        const options = {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 10000 
        };

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => this.handlePositionUpdate(pos),
            (err) => {
                console.error(err);
                if (err.code === 1) notify.show("Location permission denied", 'error');
                else notify.show("Signal lost...", 'warning');
            },
            options
        );
        
        // WAKE LOCK (Keep screen on)
        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.log("Wake Lock not supported");
        }
    }
    
    handlePositionUpdate(pos) {
        if(!this.isNavigating) return;

        // Valid coords?
        if (!pos || !pos.coords) return;

        const { longitude, latitude, heading, speed } = pos.coords;
        const coords = [longitude, latitude];

        // 1. Update Marker Position (The "Puck")
        if (this.navMarker) {
             this.navMarker.setLngLat(coords);
        }

        // Bearing/Heading Logic
        // Use heading if available, else usage last known
        const bearing = heading !== null && !isNaN(heading) ? heading : (this.lastBearing || 0);
        this.lastBearing = bearing;

        // Rotate Puck Icon
        if (this.navPuckEl) {
             this.navPuckEl.style.transform = `rotate(${bearing}deg)`;
        }

        // 2. Camera Tracking (Strict Follow Mode)
        if (this.map && this.map.map) {
             this.map.map.easeTo({
                center: coords,
                zoom: 18.5,
                pitch: 60,
                bearing: bearing, 
                duration: 1000, 
                easing: (t) => t // Linear
            });
        }

        // 3. Logic: Check progress
        this.checkRouteProgress(coords, speed || 0);
    }

    checkRouteProgress(userCoords, speed) {
        if (!this.steps || !this.currentRoute) return;
        
        if (this.currentStepIndex >= this.steps.length - 1) {
             return; // Arrived
        }
        
        // Current Step Target: Start of NEXT step
        const nextStep = this.steps[this.currentStepIndex + 1];
        const targetLngLat = nextStep.maneuver.location; 
        
        const distToTurn = this.getDistanceFromCoords(userCoords, targetLngLat);
        
        // UI Update (Distance)
        document.getElementById('nav-step-dist').innerText = distToTurn < 1000 
            ? `${Math.round(distToTurn)} m`
            : `${(distToTurn / 1000).toFixed(1)} km`;

        // --- PREDICTIVE ANNOUNCEMENTS ---
        const { text } = this.formatStep(nextStep); // What we will do NEXT
        
        // Zones: 1km, 500m, 200m
        // We use a Set to ensure we only say it once per step
        
        // 1 KM Warning
        if (distToTurn < 1100 && distToTurn > 900 && !this.spokenAnnouncements.has(1000)) {
            this.speak(`In 1 kilometer, ${text}`);
            this.spokenAnnouncements.add(1000);
        }
        
        // 500m Warning
        if (distToTurn < 550 && distToTurn > 450 && !this.spokenAnnouncements.has(500)) {
            this.speak(`In 500 meters, ${text}`);
            this.spokenAnnouncements.add(500);
        }

        // 200m Warning (Prepare)
        if (distToTurn < 250 && distToTurn > 150 && !this.spokenAnnouncements.has(200)) {
            this.speak(`In 200 meters, ${text}`);
            this.spokenAnnouncements.add(200);
        }
        
        // --- STEP ADVANCE ---
        const ARRIVAL_THRESHOLD = 35; // meters (slightly larger for robustness)
        
        if (distToTurn < ARRIVAL_THRESHOLD) {
            // Commit the Turn
            this.currentStepIndex++;
            
            // New active step
            const currentActiveStep = this.steps[this.currentStepIndex];
            
            // Update UI
            this.updateDashboardUI(currentActiveStep, distToTurn);
            
            // Speak "Turn Now"
            this.speak(currentActiveStep.maneuver.instruction); // "Turn Right onto..." or "Turn Right"
            
            // Reset Memory for New Step
            this.spokenAnnouncements.clear();
            
            // Check Final Arrival
            if (currentActiveStep.maneuver.type === 'arrive') {
                this.speak("You have arrived at your destination.");
                setTimeout(() => this.stopRealTimeNavigation(), 5000);
            }
        }
    }
    
    speak(text) {
        if (!this.voiceEnabled || !window.speechSynthesis) return;
        
        // Cancel current
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
         // utterance.lang = 'en-US'; 
        window.speechSynthesis.speak(utterance);
    }
    
    // Haversine Formula for distance (meters)
    getDistanceFromCoords(coord1, coord2) {
        // coord: [lng, lat]
        const R = 6371e3; // metres
        const φ1 = coord1[1] * Math.PI/180; 
        const φ2 = coord2[1] * Math.PI/180;
        const Δφ = (coord2[1]-coord1[1]) * Math.PI/180;
        const Δλ = (coord2[0]-coord1[0]) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    createNavMarker() {
        if (this.navMarker) return;
        
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
    }

    // Simulation for Testing
    startSimulation() {
        if (!this.currentRoute) return;
        
        this.stopRealTimeNavigation();
        this.isNavigating = true;
        this.dashboard.classList.add('active');
        document.body.classList.add('nav-active');
        this.createNavMarker();
        
        const coords = this.currentRoute.geometry.coordinates;
        let i = 0;
        
        notify.show("Starting Simulation...", 'info');
        
        this.simInterval = setInterval(() => {
            if (i >= coords.length) {
                clearInterval(this.simInterval);
                this.stopRealTimeNavigation();
                return;
            }
            
            const c = coords[i];
            // Fake position object
            this.handlePositionUpdate({
                coords: {
                    longitude: c[0],
                    latitude: c[1],
                    heading: 0, // Could calculate bearing
                    speed: 10 // m/s
                }
            });
            
            i++;
        }, 100); // Fast forward
    }

    stopRealTimeNavigation() {
        this.isNavigating = false;
        
        // Stop Simulation
        if (this.simInterval) {
            clearInterval(this.simInterval);
            this.simInterval = null;
        }

        // Stop Real Geolocation
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        if(this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }

        if (this.navMarker) {
            this.navMarker.remove();
            this.navMarker = null;
        }
        
        // Hide Dashboard
        if (this.dashboard) this.dashboard.classList.remove('active');
        document.body.classList.remove('nav-active');

        this.map.map.easeTo({
            pitch: 0,
            bearing: 0,
            zoom: 15,
            duration: 1000
        });

        notify.show("Navigation stopped.", 'info');
    }
}

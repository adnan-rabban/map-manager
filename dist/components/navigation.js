import { notify } from './notifications.js';
export class Navigation {
    constructor(mapEngine) {
        this.startCoords = null;
        this.destCoords = null;
        this.panel = null;
        this.startInput = null;
        this.destInput = null;
        this.suggestions = null;
        this.isNavigating = false;
        this.watchId = null;
        this.navMarker = null;
        this.navPuckEl = null;
        this.userLocationPopup = null;
        this.activeRoute = null;
        this.lastAnnouncedStepIndex = -1;
        this.hudPanel = null;
        this.map = mapEngine;
        this.initUI();
    }
    initUI() {
        this.panel = document.getElementById('nav-panel');
        this.startInput = document.getElementById('nav-start');
        this.destInput = document.getElementById('nav-dest');
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
                if (instructions)
                    instructions.remove();
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
    togglePanel(show) {
        if (show) {
            this.panel?.classList.add('open');
            const sidebar = document.getElementById('sidebar-panel');
            if (sidebar)
                sidebar.classList.add('collapsed');
        }
        else {
            this.panel?.classList.remove('open');
        }
    }
    setDestination(location) {
        this.togglePanel(true);
        if (this.destInput) {
            this.destInput.value = location.name;
        }
        this.destCoords = { lng: location.lng, lat: location.lat };
    }
    async useMyLocation() {
        if (!navigator.geolocation) {
            notify.show("Geolocation not supported", 'error');
            return;
        }
        if (this.startInput) {
            this.startInput.value = "Locating...";
        }
        navigator.geolocation.getCurrentPosition((pos) => {
            this.startCoords = {
                lng: pos.coords.longitude,
                lat: pos.coords.latitude
            };
            if (this.startInput) {
                this.startInput.value = "My Location";
            }
            this.destInput?.focus();
            const clearBtn = document.getElementById('btn-clear-start');
            if (clearBtn)
                clearBtn.classList.remove('hidden');
            notify.show("Location found", 'success');
        }, (err) => {
            console.error(err);
            if (this.startInput) {
                this.startInput.value = "";
            }
            notify.show("Could not get location", 'error');
        });
    }
    resetRouteUI() {
        // Remove Dynamic Cards
        const headerCard = document.querySelector('.route-header-card');
        const listCard = document.querySelector('.route-list-card');
        const followBtn = document.getElementById('btn-follow-user');
        if (headerCard)
            headerCard.remove();
        if (listCard)
            listCard.remove();
        if (followBtn)
            followBtn.remove();
        // Restore Original "Start Navigation" (Calculate) Button
        const origBtn = document.getElementById('btn-start-nav');
        if (origBtn)
            origBtn.style.display = 'block';
        // Hide Clear Route Button
        const clearBtn = document.getElementById('btn-clear-route');
        if (clearBtn)
            clearBtn.classList.remove('visible');
        // Clear Map Route layer
        this.map.clearRoute();
        this.activeRoute = null;
    }
    setupAutocomplete(input, clearBtnId, callback) {
        let debounceTimer;
        const clearBtn = document.getElementById(clearBtnId);
        const toggleClearBtn = () => {
            if (!clearBtn)
                return;
            if (input.value.length > 0) {
                clearBtn.classList.remove('hidden');
            }
            else {
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
                this.resetRouteUI(); // Reset UI when cleared
            });
        }
        input.addEventListener('input', (e) => {
            const target = e.target;
            const query = target.value;
            toggleClearBtn();
            clearTimeout(debounceTimer);
            // If user is typing, assume they want a new route -> Reset UI
            if (query.length > 0) {
                this.resetRouteUI();
            }
            if (query.length < 3) {
                this.suggestions?.classList.add('hidden');
                return;
            }
            debounceTimer = window.setTimeout(async () => {
                const results = await this.map.searchPlaces(query);
                if (input.value !== query)
                    return;
                this.showSuggestions(results, input, callback);
            }, 300);
        });
    }
    showSuggestions(features, activeInput, coordCallback) {
        if (!this.suggestions)
            return;
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
    createHUD() {
        if (document.getElementById('nav-hud'))
            return;
        const app = document.getElementById('app');
        const hud = document.createElement('div');
        hud.id = 'nav-hud';
        hud.className = 'nav-hud hidden';
        hud.innerHTML = `
            <div class="nav-hud-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </div>
            <div class="nav-hud-content">
                <div class="nav-hud-text">Proceed to route</div>
                <div class="nav-hud-dist">-- m</div>
            </div>
        `;
        app?.appendChild(hud);
        this.hudPanel = hud;
    }
    updateHUD(instruction, distance) {
        if (!this.hudPanel)
            return;
        const iconEl = this.hudPanel.querySelector('.nav-hud-icon');
        const textEl = this.hudPanel.querySelector('.nav-hud-text');
        const distEl = this.hudPanel.querySelector('.nav-hud-dist');
        if (textEl)
            textEl.textContent = instruction.text;
        if (distEl)
            distEl.textContent = distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
        // Update Icon based on instruction icon string
        // Simplified mapping for brevity (real implementation would switch SVG paths)
    }
    async startNavigation() {
        if (!this.startCoords || !this.destCoords) {
            notify.show("Please set both start and destination", 'error');
            return;
        }
        const routes = await this.map.calculateRoute(this.startCoords, this.destCoords);
        if (!routes || routes.length === 0)
            return;
        this.activeRoute = routes[0]; // Store active route
        this.lastAnnouncedStepIndex = -1; // Reset announcements
        this.createHUD(); // Ensure HUD exists
        const btnClear = document.getElementById('btn-clear-route');
        if (btnClear)
            btnClear.classList.add('visible');
        this.displayInstructions(routes[0]);
        this.map.onRouteChanged((route) => {
            this.activeRoute = route;
            this.displayInstructions(route);
        });
    }
    displayInstructions(route) {
        // Clear existing dynamic elements
        const existingCard = document.querySelector('.route-header-card');
        const existingList = document.querySelector('.route-list-card');
        const existingBtn = document.getElementById('btn-follow-user');
        // Hide original start button if present to prevent duplication
        const origBtn = document.getElementById('btn-start-nav');
        if (origBtn)
            origBtn.style.display = 'none';
        if (existingCard)
            existingCard.remove();
        if (existingList)
            existingList.remove();
        if (existingBtn)
            existingBtn.remove();
        // Fallback cleanup
        document.querySelectorAll('.nav-card.route-card').forEach(el => el.remove());
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMins = Math.round(route.duration / 60);
        // 1. Route Header Card (Summary)
        const headerCard = document.createElement('div');
        headerCard.className = 'nav-card route-header-card';
        headerCard.innerHTML = `
            <div class="route-stats-large">
                <span class="stat-time">${durationMins} min</span>
                <span class="stat-dist">(${distanceKm} km)</span>
            </div>
            <div class="route-via">via Fastest Route</div>
        `;
        // 2. Steps List Card (Scrollable)
        const listCard = document.createElement('div');
        listCard.className = 'nav-card route-list-card';
        let listHtml = `<div class="route-steps-scroller">`;
        if (route.instructions) {
            route.instructions.forEach((step, index) => {
                const isLast = index === route.instructions.length - 1;
                listHtml += `
                    <div class="step-item ${isLast ? 'last' : ''}">
                        <div class="step-icon ${step.icon}"></div>
                        <div class="step-details">
                            <div class="step-text">${step.text}</div>
                            <div class="step-dist">${step.distance < 1000 ? Math.round(step.distance) + ' m' : (step.distance / 1000).toFixed(1) + ' km'}</div>
                        </div>
                    </div>
                `;
            });
        }
        listHtml += `</div>`;
        listCard.innerHTML = listHtml;
        // 3. Follow Button (Bottom)
        const btnFn = document.createElement('button');
        btnFn.id = 'btn-follow-user';
        btnFn.className = 'btn-wide-action';
        btnFn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>Start Navigation</span>
        `;
        // Append All
        this.panel?.appendChild(headerCard);
        this.panel?.appendChild(listCard);
        this.panel?.appendChild(btnFn);
        // Event Listeners
        btnFn.addEventListener('click', () => {
            if (this.isNavigating) {
                this.stopRealTimeNavigation();
            }
            else {
                this.startRealTimeNavigation();
            }
        });
    }
    async startRealTimeNavigation() {
        if (!navigator.geolocation) {
            notify.show("Geolocation not supported", 'error');
            return;
        }
        if (this.watchId)
            navigator.geolocation.clearWatch(this.watchId);
        this.isNavigating = true;
        this.createHUD();
        this.hudPanel?.classList.remove('hidden');
        // Update Button State
        const btnFollow = document.getElementById('btn-follow-user');
        if (btnFollow) {
            btnFollow.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                Exit Navigation
            `;
            btnFollow.style.backgroundColor = '#FF3B30';
            btnFollow.style.color = 'white';
        }
        // Create Navigation Puck
        if (!this.navMarker) {
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
        notify.show("Starting Real-Time Navigation...", 'success');
        this.watchId = navigator.geolocation.watchPosition((pos) => {
            // Safeguard: If navigation stopped while this callback was pending
            if (!this.isNavigating)
                return;
            const { longitude, latitude, heading, speed } = pos.coords;
            const coords = [longitude, latitude];
            const currentSpeed = speed || 0; // m/s
            const bearing = heading || 0;
            // 1. Update Puck Position & Rotation
            if (this.navMarker)
                this.navMarker.setLngLat(coords);
            if (this.navPuckEl)
                this.navPuckEl.style.transform = `rotate(${bearing}deg)`;
            // 2. Dynamic Camera Logic
            // Faster = Zoom Out, Tilt Up. Slower = Zoom In, Pitch Down (more top-down for precision?).
            // Actually usually faster = pitch up to see distinct, slower = pitch down?
            // User Request: "Straight/Fast: Zoom out. Turn/Slow: Zoom in."
            let targetZoom = 18;
            let targetPitch = 50;
            if (currentSpeed > 15) { // > 54 km/h
                targetZoom = 15; // Zoom out
                targetPitch = 60; // See further
            }
            else if (currentSpeed > 8) { // > 30 km/h
                targetZoom = 16.5;
                targetPitch = 55;
            }
            else { // Slow / Stopped
                targetZoom = 18.5; // Zoom in for details
                targetPitch = 45;
            }
            this.map.map.easeTo({
                center: coords,
                zoom: targetZoom,
                pitch: targetPitch,
                bearing: bearing, // Rotate map to follow user heading
                duration: 1000,
                easing: (t) => t // Linear-ish for smoothness
            });
            // 3. Navigation Instruction Logic (Threshold Announcements)
            if (this.activeRoute && this.activeRoute.instructions) {
                // Find next step
                // Naive approach: Find nearest step that hasn't been passed
                // Ideally we track progress index.
                // Simple Logic: Find closest instruction
                let minDist = Infinity;
                let closestStepIndex = -1;
                this.activeRoute.instructions.forEach((instr, idx) => {
                    // Calculate distance from user to maneuver point
                    if (instr.maneuver && instr.maneuver.location) {
                        const d = this.getDist(latitude, longitude, instr.maneuver.location[1], instr.maneuver.location[0]);
                        if (d < minDist) {
                            minDist = d;
                            closestStepIndex = idx;
                        }
                    }
                });
                // Only consider "upcoming" (we skip simplistic "past" checks for this demo)
                if (closestStepIndex !== -1) {
                    const step = this.activeRoute.instructions[closestStepIndex];
                    this.updateHUD(step, minDist);
                    // Threshold Announcement (e.g. at 50m)
                    if (minDist < 50 && closestStepIndex > this.lastAnnouncedStepIndex) {
                        // Announce!
                        const utterance = new SpeechSynthesisUtterance(`In 50 meters, ${step.text}`);
                        window.speechSynthesis.speak(utterance);
                        notify.show(`Turn: ${step.text}`, 'info');
                        this.lastAnnouncedStepIndex = closestStepIndex;
                    }
                }
            }
        }, (err) => console.error(err), { enableHighAccuracy: true, maximumAge: 2000 });
    }
    getDist(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    stopRealTimeNavigation() {
        this.isNavigating = false;
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.navMarker) {
            try {
                this.navMarker.remove();
            }
            catch (e) {
                console.error("Error removing marker:", e);
            }
            this.navMarker = null;
        }
        this.hudPanel?.classList.add('hidden'); // Hide HUD
        // Reset Button
        const btnFollow = document.getElementById('btn-follow-user');
        if (btnFollow) {
            btnFollow.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Start "Follow User" Mode
            `;
            btnFollow.style.backgroundColor = '';
            btnFollow.style.color = '';
        }
        // Reset Camera
        this.map.map.easeTo({ pitch: 0, bearing: 0, zoom: 15, duration: 1000 });
        notify.show("Navigation stopped.", 'info');
    }
}

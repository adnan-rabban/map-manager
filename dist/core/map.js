// Replace this with your MapTiler API Key!
const MAPTILER_KEY = 'bdQDjDEtrztzKNBE2KZO';
import { notify } from '../components/notifications.js';
export class MapEngine {
    constructor(containerId) {
        this.currentBaseStyle = 'streets-v2';
        this.isDarkMode = false;
        this.markers = {};
        this.clickCallback = null;
        this.poiClickCallback = null;
        this.currentPopup = null;
        this.routes = [];
        this.activeRouteIndex = 0;
        this.lastRouteData = null;
        this.onRouteChangedCallback = null;
        this.isReady = false;
        this.onPopupCloseCallback = null;
        // Helper for markers (already defined above)
        // private markers: Record<string, MapTilerMarker> = {};
        // Style IDs untuk MapTiler
        this.STYLE_IDS = {
            STREETS: 'streets-v2', // Streets Light
            STREETS_DARK: 'streets-v2-dark', // Streets Dark (OFFICIAL MAPTILER DARK)
            SATELLITE: 'satellite', // Satellite
            HYBRID: 'hybrid', // Hybrid
            DATAVIZ_DARK: 'dataviz-dark', // Alternative Dark (lebih kontras)
        };
        if (typeof maptilersdk === 'undefined') {
            console.error("MapTiler SDK not loaded");
            throw new Error("MapTiler SDK not loaded");
        }
        maptilersdk.config.apiKey = MAPTILER_KEY;
        // Deteksi dark mode dari localStorage
        this.isDarkMode = this.getDarkModePreference();
        // Set initial style berdasarkan dark mode
        const initialStyle = this.getEffectiveStyleUrl(this.currentBaseStyle);
        this.map = new maptilersdk.Map({
            container: containerId,
            style: initialStyle,
            center: [106.8456, -6.2088], // Jakarta
            zoom: 15.5,
            pitch: 45,
            bearing: -17.6,
            geolocate: true,
            terrainControl: true,
            scaleControl: true,
            navigationControl: true,
            logoControl: false
        });
        this.init();
    }
    onReady(callback) {
        if (this.isReady) {
            callback();
        }
        else {
            this.map.once('load', () => {
                this.isReady = true;
                callback();
            });
        }
    }
    getDarkModePreference() {
        return localStorage.getItem('theme') === 'dark';
    }
    /**
     * CORE LOGIC: Menentukan style URL yang sesuai berdasarkan base style dan dark mode
     */
    getEffectiveStyleUrl(baseStyle) {
        let targetStyle = baseStyle;
        // Jika dark mode aktif DAN style adalah streets, gunakan versi dark
        if (this.isDarkMode && baseStyle === this.STYLE_IDS.STREETS) {
            targetStyle = this.STYLE_IDS.STREETS_DARK;
        }
        // Jika dark mode non-aktif DAN style adalah dark streets, kembalikan ke light
        if (!this.isDarkMode && baseStyle === this.STYLE_IDS.STREETS_DARK) {
            targetStyle = this.STYLE_IDS.STREETS;
        }
        // Build URL dengan MapTiler API Key
        return `https://api.maptiler.com/maps/${targetStyle}/style.json?key=${MAPTILER_KEY}`;
    }
    /**
     * Update map style (dipanggil saat style berubah)
     */
    updateMapStyle() {
        const newStyleUrl = this.getEffectiveStyleUrl(this.currentBaseStyle);
        console.log(`🗺️  Switching map style to: ${newStyleUrl}`);
        this.map.setStyle(newStyleUrl);
        // Re-apply 3D buildings dan routes setelah style loaded
        this.map.once('styledata', () => {
            if (this.lastRouteData && this.lastRouteData.routes) {
                this.drawRoutes(this.lastRouteData.routes, this.lastRouteData.activeIndex);
            }
            this.add3DBuildings();
        });
    }
    /**
     * PUBLIC METHOD: Sinkronisasi dengan dark mode dari UI
     * Dipanggil dari app.ts saat user toggle dark mode
     */
    syncWithDarkMode(isDark) {
        console.log(`🌓 Dark mode sync: ${isDark}`);
        this.isDarkMode = isDark;
        // Update map container class untuk styling tambahan
        const container = this.map.getContainer();
        if (isDark) {
            container.classList.add('map-dark-mode');
        }
        else {
            container.classList.remove('map-dark-mode');
        }
        // Update map style
        this.updateMapStyle();
    }
    /**
     * PUBLIC METHOD: Set base style (dipanggil dari Layer Switcher)
     * @param styleId - ID style yang dipilih user (STREETS, SATELLITE, HYBRID)
     */
    setStyle(styleId) {
        console.log(`🎨 User selected style: ${styleId}`);
        // Normalisasi style ID
        const normalizedStyleId = styleId.toUpperCase();
        // Map user-friendly names ke actual style IDs
        const styleMapping = {
            'STREETS': this.STYLE_IDS.STREETS,
            'STREETS-V2': this.STYLE_IDS.STREETS,
            'SATELLITE': this.STYLE_IDS.SATELLITE,
            'HYBRID': this.STYLE_IDS.HYBRID,
        };
        this.currentBaseStyle = styleMapping[normalizedStyleId] || this.STYLE_IDS.STREETS;
        // Update style dengan mempertimbangkan dark mode
        this.updateMapStyle();
    }
    add3DBuildings() {
        if (!this.map || !this.map.getStyle())
            return;
        // Check if layer already exists
        if (this.map.getLayer('3d-buildings'))
            return;
        // Check if source exists
        const style = this.map.getStyle();
        if (!style || !style.sources) {
            console.warn("No sources found in style");
            return;
        }
        const sources = style.sources;
        let sourceId = 'openmaptiles';
        if (!sources[sourceId]) {
            // Try to find a vector source
            const sourceKeys = Object.keys(sources);
            const found = sourceKeys.find(k => sources[k].type === 'vector');
            if (found)
                sourceId = found;
            else {
                // If no vector source, check if we have composite (Mapbox/MapTiler custom)
                if (sources['composite'])
                    sourceId = 'composite';
                else {
                    // console.warn("No vector source found for 3D buildings");
                    return;
                }
            }
        }
        this.map.addLayer({
            'id': '3d-buildings',
            'source': sourceId,
            'source-layer': 'building',
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': this.isDarkMode ? '#1a1a1a' : '#c9c9c9',
                'fill-extrusion-height': [
                    'interpolate', ['linear'], ['zoom'],
                    15, 0,
                    15.05, ['get', 'render_height']
                ],
                'fill-extrusion-base': [
                    'interpolate', ['linear'], ['zoom'],
                    15, 0,
                    15.05, ['get', 'render_min_height']
                ],
                'fill-extrusion-opacity': this.isDarkMode ? 0.7 : 0.6
            }
        });
    }
    init() {
        this.map.on('load', () => {
            this.isReady = true;
            this.map.setPitch(60);
            this.applyCustomTooltipsToControls();
            // Add 3D buildings
            this.add3DBuildings();
            // Apply dark theme if dark mode is active
            const isDarkMode = this.getDarkModePreference();
            if (isDarkMode) {
                this.syncWithDarkMode(true);
            }
        });
        // POI Interaction (Cursor)
        this.map.on('mouseenter', (e) => {
            const features = this.map.queryRenderedFeatures(e.point);
            const isPoi = features.some((f) => f.properties && f.properties.name && f.source !== 'route');
            this.map.getCanvas().style.cursor = isPoi ? 'pointer' : '';
        });
        this.map.on('mouseleave', () => {
            if (!this.map.getCanvas().style.cursor.includes('grab')) {
                this.map.getCanvas().style.cursor = '';
            }
        });
        // Initialize Click Listeners
        this.map.on('click', (e) => {
            // Generic POI detection (works across different styles/layers)
            const features = this.map.queryRenderedFeatures(e.point);
            const viableFeature = features.find((f) => f.properties &&
                f.properties.name &&
                (f.layer.type === 'symbol' || f.layer.id.includes('label')) // Flexible check
            );
            if (viableFeature) {
                if (this.poiClickCallback) {
                    // Fly to location
                    this.map.flyTo({
                        center: e.lngLat,
                        zoom: 17,
                        pitch: 60,
                        bearing: 0,
                        essential: true,
                        duration: 1500
                    });
                    // Normalize POI data
                    const category = (viableFeature.properties.class || 'Place')
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase());
                    const poi = {
                        id: viableFeature.id || Date.now(),
                        name: viableFeature.properties.name || viableFeature.properties.name_en || 'Unknown Place',
                        category: category,
                        lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat }
                    };
                    this.poiClickCallback(poi);
                    return;
                }
            }
            if (this.clickCallback) {
                this.clickCallback({ lng: e.lngLat.lng, lat: e.lngLat.lat });
            }
        });
        // Handle Map Errors
        this.map.on('error', (e) => {
            if (e && e.error && e.error.message) {
                // Suppress image loading errors (not critical)
                if (e.error.message.includes('Image') || e.error.message.includes('sprite')) {
                    console.debug("Map image warning (non-critical):", e.error.message);
                    return;
                }
                console.warn("Map Error:", e.error.message);
                if (e.error.message.includes('404') || e.error.message.includes('style')) {
                    console.error("Failed to load map resource:", e.error);
                }
            }
        });
    }
    applyCustomTooltipsToControls() {
        // Custom tooltips logic here
        // ... (keep existing implementation)
    }
    // ========================================
    // MARKER METHODS
    // ========================================
    addMarker(id, lngLat, options) {
        if (this.markers[id]) {
            this.markers[id].remove();
        }
        // Create container for custom styling (mirroring backup)
        const container = document.createElement('div');
        container.className = 'marker-wrapper';
        const el = document.createElement('div');
        el.className = 'custom-marker';
        container.appendChild(el);
        const marker = new maptilersdk.Marker({
            element: container,
            anchor: 'center'
        })
            .setLngLat([lngLat.lng, lngLat.lat])
            .addTo(this.map);
        if (options?.onClick) {
            container.style.cursor = 'pointer';
            container.addEventListener('click', (e) => {
                e.stopPropagation();
                options.onClick();
            });
        }
        this.markers[id] = marker;
    }
    removeMarker(id) {
        if (this.markers[id]) {
            this.markers[id].remove();
            delete this.markers[id];
        }
    }
    // ========================================
    // EVENT CALLBACK REGISTRATION
    // ========================================
    onClick(callback) {
        this.clickCallback = callback;
    }
    onPOIClick(callback) {
        this.poiClickCallback = callback;
    }
    // ========================================
    // MAP ACTIONS
    // ========================================
    flyTo(lngOrOptions, lat) {
        const cinematicDefaults = {
            zoom: 17,
            pitch: 50,
            essential: true,
            duration: 1200
        };
        if (typeof lngOrOptions === 'number' && typeof lat === 'number') {
            this.map.flyTo({
                ...cinematicDefaults,
                center: [lngOrOptions, lat]
            });
        }
        else if (typeof lngOrOptions === 'object') {
            // Handle case where app passes {lng, lat} directly
            if ('lng' in lngOrOptions && 'lat' in lngOrOptions && !lngOrOptions.center) {
                this.map.flyTo({
                    ...cinematicDefaults,
                    center: lngOrOptions,
                    ...lngOrOptions // Allow overrides if any (e.g. duration)
                });
            }
            else {
                // Standard options object
                this.map.flyTo({
                    ...cinematicDefaults, // Apply defaults first
                    ...lngOrOptions // Allow explicit overrides
                });
            }
        }
    }
    // ========================================
    // ROUTE METHODS
    // ========================================
    async getRoute(start, end) {
        try {
            const startLng = 'lng' in start ? start.lng : start.longitude || 0;
            const startLat = 'lat' in start ? start.lat : start.latitude || 0;
            const endLng = 'lng' in end ? end.lng : end.longitude || 0;
            const endLat = 'lat' in end ? end.lat : end.latitude || 0;
            // MapTiler / OSRM format: coordinates separated by semicolons
            const url = `https://api.maptiler.com/routing/driving/${startLng},${startLat};${endLng},${endLat}?key=${MAPTILER_KEY}&geometries=geojson&steps=true&overview=full`;
            const response = await fetch(url);
            if (!response.ok)
                throw new Error('Route request failed');
            const data = await response.json();
            // Map OSRM response to our Route interface
            // Note: MapTiler API returns OSRM format
            return {
                routes: data.routes.map((r) => ({
                    distance: r.distance,
                    duration: r.duration,
                    geometry: r.geometry,
                    legs: r.legs,
                    instructions: this.parseInstructions(r.legs[0])
                }))
            };
        }
        catch (e) {
            console.error("Route fetch failed:", e);
            notify.show('Could not find route', 'error');
            return null;
        }
    }
    parseInstructions(leg) {
        if (!leg || !leg.steps)
            return [];
        // Simple mapping of OSRM steps to instructions
        return leg.steps.map((step) => {
            let icon = 'straight';
            if (step.maneuver) {
                if (step.maneuver.type === 'turn') {
                    if (step.maneuver.modifier && step.maneuver.modifier.includes('left'))
                        icon = 'turn-left';
                    else if (step.maneuver.modifier && step.maneuver.modifier.includes('right'))
                        icon = 'turn-right';
                }
                else if (step.maneuver.type === 'depart')
                    icon = 'start';
                else if (step.maneuver.type === 'arrive')
                    icon = 'destination';
            }
            return {
                text: step.name || step.maneuver.type || 'Proceed',
                distance: step.distance,
                icon: icon,
                maneuver: step.maneuver
            };
        });
    }
    drawRoutes(routes, activeIndex = 0) {
        this.clearRoute();
        if (!routes || routes.length === 0)
            return;
        const route = routes[activeIndex];
        this.routes = routes;
        this.activeRouteIndex = activeIndex;
        // Cache for style switches
        this.lastRouteData = { routes, activeIndex };
        if (!route.geometry)
            return;
        // Add Source
        this.map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': route.geometry
            }
        });
        // Add Layer (Under labels, above roads)
        this.map.addLayer({
            'id': 'route-line',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#007AFF', // iOS blue
                'line-width': 6,
                'line-opacity': 0.8
            }
        }, this.map.getLayer('poi-label') ? 'poi-label' : undefined); // Place before labels if possible
        // Fit bounds
        if (typeof maptilersdk !== 'undefined') {
            const coordinates = route.geometry.coordinates;
            if (coordinates && coordinates.length > 0) {
                const bounds = coordinates.reduce((bounds, coord) => {
                    return bounds.extend(coord);
                }, new maptilersdk.LngLatBounds(coordinates[0], coordinates[0]));
                this.map.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 16
                });
            }
        }
        if (this.onRouteChangedCallback) {
            this.onRouteChangedCallback(route);
        }
    }
    clearRoute() {
        if (this.map.getLayer('route-line')) {
            this.map.removeLayer('route-line');
        }
        if (this.map.getSource('route')) {
            this.map.removeSource('route');
        }
        this.routes = [];
        this.lastRouteData = null;
        this.activeRouteIndex = 0;
    }
    onRouteChanged(callback) {
        this.onRouteChangedCallback = callback;
    }
    // ========================================
    // SEARCH METHODS
    // ========================================
    async searchPlaces(query) {
        if (!query || query.length < 3)
            return [];
        try {
            const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}`;
            const response = await fetch(url);
            if (!response.ok)
                throw new Error('Search request failed');
            const data = await response.json();
            return data.features || [];
        }
        catch (e) {
            console.error("Search failed:", e);
            notify.show('Search failed', 'error');
            return [];
        }
    }
    async reverseGeocode(lng, lat) {
        try {
            const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}`;
            const response = await fetch(url);
            if (!response.ok)
                throw new Error('Geocoding request failed');
            const data = await response.json();
            return data.features?.[0] || null;
        }
        catch (e) {
            console.error("Reverse geocode failed:", e);
            notify.show('Could not find address', 'error');
            return null;
        }
    }
    // ========================================
    // POPUP METHODS (keep existing)
    // ========================================
    showPopup(lngLat, html, onClose) {
        if (this.currentPopup) {
            this.currentPopup.remove();
        }
        this.onPopupCloseCallback = onClose || null;
        const closeBtnHtml = `
            <button class="maplibregl-popup-close-button custom-popup-close" type="button" aria-label="Close popup">×</button>
        `;
        const finalHtml = `<div style="position:relative;">${html}${closeBtnHtml}</div>`;
        this.currentPopup = new maptilersdk.Popup({
            offset: 25,
            className: 'glass-popup',
            closeButton: false,
            maxWidth: 'none'
        })
            .setLngLat(lngLat)
            .setHTML(finalHtml)
            .addTo(this.map);
        const popupEl = this.currentPopup?.getElement();
        if (popupEl) {
            setTimeout(() => {
                const closeBtn = popupEl.querySelector('.custom-popup-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.closePopupAnimated();
                    });
                }
            }, 10);
        }
        this.currentPopup?.on('close', () => {
            this.triggerPopupClose();
        });
    }
    triggerPopupClose() {
        this.currentPopup = null;
        if (this.onPopupCloseCallback) {
            try {
                this.onPopupCloseCallback();
            }
            catch (e) {
                console.error('Error in popup close callback:', e);
            }
            this.onPopupCloseCallback = null;
        }
    }
    closePopupAnimated() {
        if (!this.currentPopup)
            return;
        const popup = this.currentPopup;
        const el = popup.getElement();
        if (el) {
            el.classList.add('closing');
            const onEnd = () => {
                popup.remove();
                el.removeEventListener('animationend', onEnd);
            };
            el.addEventListener('animationend', onEnd, { once: true });
            setTimeout(() => {
                if (popup.isOpen()) {
                    popup.remove();
                }
            }, 350);
        }
        else {
            popup.remove();
        }
    }
    enableFollowMode(enabled) {
        if (enabled) {
            this.map.flyTo({
                zoom: 17,
                pitch: 60,
                essential: true
            });
            const geolocateControl = this.map._controls?.find((c) => c instanceof maptilersdk.GeolocateControl);
            if (geolocateControl) {
                geolocateControl.trigger();
            }
        }
    }
}

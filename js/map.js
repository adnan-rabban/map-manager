// Replace this with your MapTiler API Key!
const MAPTILER_KEY = 'snWlaRIgy45mGaS7gkfz';

import { notify } from './notifications.js';

export class MapEngine {
    constructor(containerId) {
        if (typeof maptilersdk === 'undefined') {
            console.error("MapTiler SDK not loaded");
            return;
        }

        maptilersdk.config.apiKey = MAPTILER_KEY;

        this.currentStyle = maptilersdk.MapStyle.STREETS;

        this.map = new maptilersdk.Map({
            container: containerId,
            style: this.currentStyle,
            center: [106.8456, -6.2088], // Jakarta
            zoom: 15.5,
            // HYBRID 3D CONFIGURATION
            pitch: 50, 
            maxPitch: 60,
            bearing: -17.6,
            geolocate: false, 
            geolocateControl: false,
            terrainControl: true, // Enable 3D Terrain
            scaleControl: true,
            navigationControl: true,
            logoControl: false,
            antialias: true // Sharp/Smooth edges for 3D buildings
        });

        // Store control instances
        this.geolocateControl = new maptilersdk.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true
        });
        this.map.addControl(this.geolocateControl);

        // Marker Data Store (In-Memory)
        this.markersData = new Map();
        this.hoveredMarkerId = null; // For hover effect
        
        this.init();
    }

    init() {
        this.map.on('load', () => {
             this.map.setPitch(50);

             // Dynamic Pitch Adjustment
             this.map.on('zoom', () => {
                 if (this.map.getZoom() < 14 && this.map.getPitch() > 10) {
                     this.map.easeTo({ pitch: 0, duration: 300 });
                 }
             });

             // Initialize Marker Source & Layer DIRECTLY (No Image Loading)
             this.setupMarkerLayer();

             // Apply Custom Tooltips to Map Controls
             this.applyCustomTooltipsToControls();
             
             // Setup Interactions
             this.setupInteractions();
        });
    }

    setupMarkerLayer() {
        // Add GeoJSON Source
        const sourceId = 'markers-source';
        if (!this.map.getSource(sourceId)) {
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                },
                promoteId: 'id' // Critical for setFeatureState to work on hover
            });
        }

        // Layer Ordering: Find the first symbol layer (labels) to place markers below text
        const layers = this.map.getStyle().layers;
        let firstSymbolId;
        for (const layer of layers) {
            if (layer.type === 'symbol') {
                firstSymbolId = layer.id;
                break;
            }
        }

        // Add Circle Layer (Vector Marker - iOS Style)
        if (!this.map.getLayer('markers-layer')) {
            this.map.addLayer({
                id: 'markers-layer',
                type: 'circle',
                source: sourceId,
                paint: {
                    // iOS Style: Blue Circle, White Border
                    'circle-radius': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        12, // Radius when hovered
                        9   // Default radius
                    ],
                    'circle-color': '#007AFF',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#FFFFFF',
                    'circle-pitch-alignment': 'viewport' // Keeps circle facing screen
                }
            }, firstSymbolId); 
        }
    }

    updateMarkersSource() {
        if (!this.map.getSource('markers-source')) return;

        const features = [];
        for (const [id, data] of this.markersData) {
            features.push({
                type: 'Feature',
                id: id, // Top-level ID for setFeatureState
                geometry: {
                    type: 'Point',
                    coordinates: [data.location.lng, data.location.lat]
                },
                properties: {
                    id: id,
                    name: data.location.name || 'Location'
                }
            });
        }

        this.map.getSource('markers-source').setData({
            type: 'FeatureCollection',
            features: features
        });
    }

    addMarker(location, onClick) {
        if (!location || isNaN(location.lng) || isNaN(location.lat)) return;
        if (location.lat < -90 || location.lat > 90) return;

        // Store data
        this.markersData.set(location.id, {
            location: location,
            onClick: onClick
        });

        this.updateMarkersSource();
    }

    removeMarker(id) {
        if (this.markersData.has(id)) {
            this.markersData.delete(id);
            this.updateMarkersSource();
        }
    }

    setupInteractions() {
        // 1. Marker Interaction (Hover Effect & Click)
        this.map.on('mousemove', 'markers-layer', (e) => {
            this.map.getCanvas().style.cursor = 'pointer';
            
            if (e.features.length > 0) {
                if (this.hoveredMarkerId !== null) {
                    this.map.setFeatureState(
                        { source: 'markers-source', id: this.hoveredMarkerId },
                        { hover: false }
                    );
                }
                this.hoveredMarkerId = e.features[0].id;
                this.map.setFeatureState(
                    { source: 'markers-source', id: this.hoveredMarkerId },
                    { hover: true }
                );
            }
        });

        this.map.on('mouseleave', 'markers-layer', () => {
            this.map.getCanvas().style.cursor = '';
            
            if (this.hoveredMarkerId !== null) {
                this.map.setFeatureState(
                    { source: 'markers-source', id: this.hoveredMarkerId },
                    { hover: false }
                );
            }
            this.hoveredMarkerId = null;
        });

        this.map.on('click', 'markers-layer', (e) => {
            // Because we use promoteId='id', feature.id is available
            if (e.features.length > 0) {
                const id = e.features[0].id; 
                const item = this.markersData.get(id);
                if (item && item.onClick) {
                    item.onClick(item.location);
                }
            }
        });

        // 2. Global Map Click
        this.map.on('click', (e) => {
             const features = this.map.queryRenderedFeatures(e.point);
             
             // Check if we clicked our marker layer first (top priority)
             const isMarker = features.some(f => f.layer.id === 'markers-layer');
             if (isMarker) return; 

             // Check for POIs (Built-in)
             const viablePoi = features.find(f => 
                f.properties && 
                f.properties.name && 
                f.layer.type === 'symbol' &&
                f.layer.id !== 'markers-layer'
            );

            if (viablePoi) {
                 this.handlePoiClick(viablePoi, e.lngLat);
                 return;
            }

            if (this.clickCallback) {
                this.clickCallback(e.lngLat);
            }
        });

        // 3. POI Hover Cursor
        this.map.on('mouseenter', (e) => {
            // Priority to markers logic handling cursor
            if (this.map.getCanvas().style.cursor === 'pointer') return;
            
            const features = this.map.queryRenderedFeatures(e.point, {
                 layers: this.map.getStyle().layers.filter(l => l.type === 'symbol' && l.id !== 'markers-layer').map(l => l.id)
            });
            const isPoi = features.some(f => f.properties && f.properties.name);
            if(isPoi) this.map.getCanvas().style.cursor = 'pointer';
        });
    }

    handlePoiClick(feature, lngLat) {
        this.map.flyTo({
            center: lngLat,
            zoom: 17,
            pitch: 50, 
            essential: true,
            duration: 1500
        });

        if (this.poiClickCallback) {
            const category = (feature.properties.class || 'Place').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            this.poiClickCallback({
                name: feature.properties.name,
                category: category,
                lngLat: lngLat,
                id: feature.id || Date.now()
            });
        }
    }

    applyCustomTooltipsToControls() {
        const updateTooltips = () => {
            const controls = this.map.getContainer().querySelectorAll('.maplibregl-ctrl button, .mapboxgl-ctrl button');
            controls.forEach(btn => {
                const title = btn.getAttribute('title');
                if (title) {
                    btn.setAttribute('data-tooltip', title);
                    btn.setAttribute('aria-label', title);
                    btn.removeAttribute('title');
                }
            });
        };

        updateTooltips();
        const observer = new MutationObserver((mutations) => {
             updateTooltips();
        });

        const ctrlContainer = this.map.getContainer().querySelector('.maplibregl-ctrl-top-right');
        if (ctrlContainer) {
            observer.observe(ctrlContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] });
        }
    }

    setStyle(styleId) {
        if (!maptilersdk.MapStyle[styleId]) return;
        this.currentStyle = maptilersdk.MapStyle[styleId];
        this.map.setStyle(this.currentStyle);
        
        this.map.once('styledata', () => {
            if (this.lastRouteData && this.lastRouteData.routes) {
                this.drawRoutes(this.lastRouteData.routes, this.lastRouteData.activeIndex);
            }
            
            // Re-setup layer (Source is usually kept if it wasn't removed, but layers are gone)
            // Note: MapLibre setStyle() removes all sources and layers usually.
            // So we need to re-add everything.
             this.setupMarkerLayer();
             this.updateMarkersSource();
        });
    }

    onMapClick(callback) {
        this.clickCallback = callback;
    }

    onPoiClick(callback) {
        this.poiClickCallback = callback;
    }

    flyTo(lng, lat) {
        this.map.flyTo({
            center: [lng, lat],
            zoom: 17,
            pitch: 50,
            essential: true,
            duration: 1200
        });
    }

    async calculateRoute(start, end) {
        this.clearRoute();
        
        if (!start || !end || isNaN(start.lng) || isNaN(start.lat)) {
            notify.show("Invalid coordinates for routing.", 'error');
            return null;
        }

        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) {
                notify.show(`Routing failed: ${res.statusText}`, 'error');
                return null;
            }

            const data = await res.json();
            if(data.routes && data.routes.length > 0) {
                this.routes = data.routes;
                this.activeRouteIndex = 0;
                this.drawRoutes(this.routes, this.activeRouteIndex);
                
                const mainRoute = this.routes[this.activeRouteIndex];
                notify.show(`Found ${data.routes.length} route(s).`, 'success');
                return mainRoute;
            } else {
                notify.show("No route found.", 'error');
                return null;
            }
        } catch(e) {
             console.error("Network Error:", e);
             notify.show("Network error.", 'error');
             return null;
        }
    }

    drawRoutes(routes, activeIndex) {
        this.lastRouteData = { routes, activeIndex };

        const features = routes.map((route, index) => ({
            'type': 'Feature',
            'properties': {
                'index': index,
                'isMain': index === activeIndex
            },
            'geometry': route.geometry
        }));

        const geojson = { 'type': 'FeatureCollection', 'features': features };

        if (!this.map.getSource('routes')) {
            this.map.addSource('routes', { 'type': 'geojson', 'data': geojson, 'lineMetrics': true });
            
             const layers = this.map.getStyle().layers;
             const firstSymbolId = layers.find(l => l.type === 'symbol')?.id;

            this.map.addLayer({
                'id': 'routes-alt',
                'type': 'line',
                'source': 'routes',
                'filter': ['==', 'isMain', false],
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': {
                    'line-color': '#999999',
                    'line-width': 6,
                    'line-opacity': 0.6,
                    'line-dasharray': [2, 2]
                }
            }, firstSymbolId);
            
             this.map.addLayer({
                'id': 'routes-alt-touch',
                'type': 'line',
                'source': 'routes',
                'filter': ['==', 'isMain', false],
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-color': 'transparent', 'line-width': 20, 'line-opacity': 0 }
            }, firstSymbolId);

            this.map.addLayer({
                'id': 'route-main',
                'type': 'line',
                'source': 'routes',
                'filter': ['==', 'isMain', true],
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-color': '#007AFF', 'line-width': 6, 'line-opacity': 0.9 }
            }, firstSymbolId);

            this.setupRouteInteraction();

        } else {
            this.map.getSource('routes').setData(geojson);
        }

        if(routes[activeIndex]) {
             const coordinates = routes[activeIndex].geometry.coordinates;
             const bounds = new maptilersdk.LngLatBounds(coordinates[0], coordinates[0]);
             for (const coord of coordinates) bounds.extend(coord);
             this.map.fitBounds(bounds, { padding: 100 });
        }
    }

    setupRouteInteraction() {
        this.map.on('mouseenter', 'routes-alt-touch', () => this.map.getCanvas().style.cursor = 'pointer');
        this.map.on('mouseleave', 'routes-alt-touch', () => this.map.getCanvas().style.cursor = '');
        this.map.on('click', 'routes-alt-touch', (e) => {
            if (e.features.length) this.switchRoute(e.features[0].properties.index);
        });
        this.map.on('click', 'routes-alt', (e) => {
             if (e.features.length) this.switchRoute(e.features[0].properties.index);
        });
    }

    switchRoute(index) {
        if(index === this.activeRouteIndex) return;
        this.activeRouteIndex = index;
        this.drawRoutes(this.routes, this.activeRouteIndex);
        if (this.onRouteChangedCallback) this.onRouteChangedCallback(this.routes[index]);
        
        const mainRoute = this.routes[index];
        const durationMins = Math.round(mainRoute.duration / 60);
        const distanceKm = (mainRoute.distance / 1000).toFixed(1);
        notify.show(`Selected route: ${distanceKm} km (${durationMins} min)`, 'info');
    }

    onRouteChanged(callback) {
        this.onRouteChangedCallback = callback;
    }

    clearRoute() {
        if (this.map.getSource('routes')) {
            this.map.getSource('routes').setData({ 'type': 'FeatureCollection', 'features': [] });
        }
        this.routes = [];
        this.lastRouteData = null;
    }

    async searchPlaces(query) {
        if (!query || query.length < 3) return [];
        const center = this.map.getCenter();
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${center.lat}&lon=${center.lng}&limit=8`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            return (data.features || []).map(f => {
                const p = f.properties;
                const addressParts = [p.name, p.street, p.city || p.town || p.village, p.state, p.country].filter(Boolean);
                const uniqueParts = [...new Set(addressParts)];
                const placeName = uniqueParts.join(', ');
                let category = '';
                if (p.osm_value) category = p.osm_value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                return {
                    id: p.osm_id || Math.random().toString(),
                    center: f.geometry.coordinates,
                    place_name: placeName,
                    text: p.name || placeName.split(',')[0],
                    category: category,
                    properties: { name: p.name || placeName.split(',')[0], address: placeName, category: category }
                };
            });
        } catch (e) {
            console.error("Search error:", e);
            return [];
        }
    }

    async reverseGeocode(lng, lat) {
        const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}&limit=1`;
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
             return (data.features && data.features.length > 0) ? data.features[0] : null;
        } catch (e) {
            return null;
        }
    }

    enableFollowMode(enabled) {
        if (enabled) {
            this.map.flyTo({ zoom: 17, pitch: 50, essential: true });
            if (this.geolocateControl) this.geolocateControl.trigger();
        }
    }

    showPopup(lngLat, content) {
        if (this.currentPopup) this.currentPopup.remove();

        const container = document.createElement('div');
        container.style.position = 'relative';
        if (typeof content === 'string') container.innerHTML = content;
        else if (content instanceof Node) container.appendChild(content);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'maplibregl-popup-close-button custom-popup-close';
        closeBtn.innerHTML = `<svg class="icon-circlex" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="9" y1="15" x2="15" y2="9"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        closeBtn.onclick = (e) => { e.stopPropagation(); this.closePopupAnimated(); };
        container.appendChild(closeBtn);

        this.currentPopup = new maptilersdk.Popup({ offset: 25, className: 'glass-popup', closeButton: false, maxWidth: 'none' })
            .setLngLat(lngLat)
            .setDOMContent(container)
            .addTo(this.map);

        this.currentPopup.on('close', () => { this.currentPopup = null; });
    }

    closePopupAnimated() {
        if (!this.currentPopup) return;
        const popup = this.currentPopup;
        const el = popup.getElement();
        if (el) {
            el.classList.add('closing');
            const onEnd = () => popup.remove();
            el.addEventListener('animationend', onEnd, { once: true });
            setTimeout(onEnd, 300);
        } else {
            popup.remove();
        }
    }
}

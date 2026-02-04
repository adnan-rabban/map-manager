// Replace this with your MapTiler API Key!
const MAPTILER_KEY = 'bdQDjDEtrztzKNBE2KZO';
import { notify } from '../components/notifications.js';
export class MapEngine {
    constructor(containerId) {
        this.markers = {};
        this.clickCallback = null;
        this.poiClickCallback = null;
        this.currentPopup = null;
        this.routes = [];
        this.activeRouteIndex = 0;
        this.lastRouteData = null;
        this.onRouteChangedCallback = null;
        if (typeof maptilersdk === 'undefined') {
            console.error("MapTiler SDK not loaded");
            throw new Error("MapTiler SDK not loaded");
        }
        maptilersdk.config.apiKey = MAPTILER_KEY;
        this.currentStyle = maptilersdk.MapStyle.STREETS;
        this.map = new maptilersdk.Map({
            container: containerId,
            style: this.currentStyle,
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
    init() {
        this.map.on('load', () => {
            this.map.setPitch(60);
            this.applyCustomTooltipsToControls();
        });
        // Handle Map Errors (404s on tiles, styles, etc)
        this.map.on('error', (e) => {
            if (e && e.error && e.error.message) {
                // Filter out common minor errors or log them
                console.warn("Map Error:", e.error.message);
                // If it's a style load error, notify user
                if (e.error.message.includes('404') || e.error.message.includes('style')) {
                    console.error("Failed to load map resource:", e.error);
                }
            }
        });
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
            let shouldUpdate = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldUpdate = true;
                    break;
                }
            }
            if (shouldUpdate)
                updateTooltips();
        });
        const ctrlContainer = this.map.getContainer().querySelector('.maplibregl-ctrl-top-right') || this.map.getContainer();
        if (ctrlContainer) {
            observer.observe(ctrlContainer, { childList: true, subtree: true });
        }
        // POI Interaction
        this.map.on('mouseenter', (e) => {
            const features = this.map.queryRenderedFeatures(e.point);
            const isPoi = features.some((f) => f.properties && f.properties.name && f.source !== 'route');
            this.map.getCanvas().style.cursor = isPoi ? 'pointer' : '';
        });
        this.map.on('mouseleave', () => {
            this.map.getCanvas().style.cursor = '';
        });
        this.map.on('click', (e) => {
            const features = this.map.queryRenderedFeatures(e.point);
            const viableFeature = features.find((f) => f.properties &&
                f.properties.name &&
                f.layer.type === 'symbol');
            if (viableFeature) {
                this.map.flyTo({
                    center: e.lngLat,
                    zoom: 17,
                    pitch: 60,
                    bearing: 0,
                    essential: true,
                    duration: 1500
                });
                if (this.poiClickCallback) {
                    const category = (viableFeature.properties.class || 'Place')
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase());
                    this.poiClickCallback({
                        name: viableFeature.properties.name,
                        category: category,
                        lngLat: e.lngLat,
                        id: viableFeature.id || Date.now()
                    });
                }
                return;
            }
            if (this.clickCallback) {
                this.clickCallback(e.lngLat);
            }
        });
    }
    setStyle(styleId) {
        if (!maptilersdk.MapStyle[styleId])
            return;
        this.currentStyle = maptilersdk.MapStyle[styleId];
        this.map.setStyle(this.currentStyle);
        this.map.once('styledata', () => {
            if (this.lastRouteData && this.lastRouteData.routes) {
                this.drawRoutes(this.lastRouteData.routes, this.lastRouteData.activeIndex);
            }
        });
    }
    onMapClick(callback) {
        this.clickCallback = callback;
    }
    onPoiClick(callback) {
        this.poiClickCallback = callback;
    }
    addMarker(location, onClick) {
        if (!location || isNaN(location.lng) || isNaN(location.lat))
            return;
        if (location.lat < -90 || location.lat > 90)
            return;
        if (this.markers[location.id]) {
            this.markers[location.id].remove();
        }
        const container = document.createElement('div');
        container.className = 'marker-wrapper';
        const el = document.createElement('div');
        el.className = 'custom-marker';
        container.appendChild(el);
        const marker = new maptilersdk.Marker({
            element: container,
            anchor: 'center'
        })
            .setLngLat([location.lng, location.lat])
            .addTo(this.map);
        container.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick(location);
        });
        this.markers[location.id] = marker;
    }
    removeMarker(id) {
        if (this.markers[id]) {
            this.markers[id].remove();
            delete this.markers[id];
        }
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
        if (!start || !end || isNaN(start.lng) || isNaN(start.lat) || isNaN(end.lng) || isNaN(end.lat)) {
            notify.show("Invalid coordinates for routing.", 'error');
            return null;
        }
        notify.show("Calculating route...", 'info');
        // Use OSRM public routing API (Fall back from MapTiler to avoid 404)
        // Request steps=true for turn-by-turn instructions
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                notify.show("Route calculation failed.", 'error');
                return null;
            }
            const data = await res.json();
            if (!data.routes || data.routes.length === 0) {
                notify.show("No route found.", 'error');
                return null;
            }
            // Parse instructions from OSRM steps
            const routes = data.routes.map((r) => {
                if (r.legs && r.legs.length > 0) {
                    const steps = r.legs[0].steps;
                    r.instructions = steps.map((s) => {
                        let text = s.maneuver.type;
                        if (s.maneuver.modifier) {
                            text += ` ${s.maneuver.modifier}`;
                        }
                        if (s.name) {
                            text += ` on ${s.name}`;
                        }
                        if (s.maneuver.type === 'arrive') {
                            text = "Arrive at destination";
                        }
                        // Icon mapping
                        let icon = 'arrow-up';
                        const m = s.maneuver.modifier;
                        if (m && m.includes('left'))
                            icon = 'arrow-left';
                        else if (m && m.includes('right'))
                            icon = 'arrow-right';
                        else if (m && m.includes('uturn'))
                            icon = 'rotate-cw';
                        else if (s.maneuver.type === 'arrive')
                            icon = 'map-pin';
                        return {
                            text: text,
                            distance: s.distance,
                            maneuver: s.maneuver,
                            icon: icon
                        };
                    });
                }
                return r;
            });
            this.routes = routes;
            this.activeRouteIndex = 0;
            this.drawRoutes(routes, 0);
            notify.show(`Found ${routes.length} route${routes.length > 1 ? 's' : ''}`, 'success');
            return routes;
        }
        catch (err) {
            console.error(err);
            notify.show("Network error while routing.", 'error');
            return null;
        }
    }
    drawRoutes(routes, activeIndex) {
        this.lastRouteData = { routes, activeIndex };
        const features = routes.map((route, index) => ({
            type: 'Feature',
            properties: {
                isMain: index === activeIndex,
                distance: route.distance,
                duration: route.duration
            },
            geometry: route.geometry
        }));
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
        if (!this.map.getSource('routes')) {
            this.map.addSource('routes', {
                type: 'geojson',
                data: geojson
            });
            this.map.addLayer({
                id: 'route-alternative',
                type: 'line',
                source: 'routes',
                filter: ['!', ['get', 'isMain']],
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#C0C0C0',
                    'line-width': 5,
                    'line-opacity': 0.5
                }
            });
            this.map.addLayer({
                id: 'route-main',
                type: 'line',
                source: 'routes',
                filter: ['get', 'isMain'],
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#007AFF',
                    'line-width': 8
                }
            });
            this.map.on('click', 'route-alternative', (e) => {
                if (e.features && e.features.length > 0) {
                    const clickedIndex = routes.findIndex(r => r.distance === e.features[0].properties.distance);
                    if (clickedIndex !== -1 && clickedIndex !== activeIndex) {
                        this.switchRoute(clickedIndex);
                    }
                }
            });
            this.map.on('mouseenter', 'route-alternative', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            this.map.on('mouseleave', 'route-alternative', () => {
                this.map.getCanvas().style.cursor = '';
            });
        }
        else {
            this.map.getSource('routes').setData(geojson);
        }
        const allCoords = routes.flatMap(r => r.geometry.coordinates);
        if (allCoords.length > 0) {
            const bounds = allCoords.reduce((bounds, coord) => {
                return bounds.extend(coord);
            }, new maptilersdk.LngLatBounds(allCoords[0], allCoords[0]));
            this.map.fitBounds(bounds, {
                padding: { top: 80, bottom: 80, left: 80, right: 80 },
                duration: 1500
            });
        }
    }
    switchRoute(index) {
        if (!this.routes || index < 0 || index >= this.routes.length)
            return;
        console.log("Switching to route index:", index);
        this.activeRouteIndex = index;
        this.drawRoutes(this.routes, this.activeRouteIndex);
        if (this.onRouteChangedCallback) {
            this.onRouteChangedCallback(this.routes[index]);
        }
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
            this.map.getSource('routes').setData({
                'type': 'FeatureCollection',
                'features': []
            });
        }
        this.routes = [];
        this.lastRouteData = null;
    }
    async searchPlaces(query) {
        if (!query || query.length < 3)
            return [];
        const center = this.map.getCenter();
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${center.lat}&lon=${center.lng}&limit=8`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            return (data.features || []).map((f) => {
                const p = f.properties;
                const addressParts = [
                    p.name,
                    p.street,
                    p.city || p.town || p.village,
                    p.state,
                    p.country
                ].filter(Boolean);
                const uniqueParts = [...new Set(addressParts)];
                const placeName = uniqueParts.join(', ');
                let category = '';
                if (p.osm_value) {
                    category = p.osm_value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                }
                return {
                    id: p.osm_id || Math.random().toString(),
                    center: f.geometry.coordinates,
                    place_name: placeName,
                    text: p.name || placeName.split(',')[0],
                    category: category,
                    properties: {
                        name: p.name || placeName.split(',')[0],
                        address: placeName,
                        category: category
                    }
                };
            });
        }
        catch (e) {
            console.error("Search error (Photon):", e);
            return [];
        }
    }
    async reverseGeocode(lng, lat) {
        const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}&limit=1`;
        try {
            const res = await fetch(url);
            if (!res.ok)
                return null;
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                return data.features[0];
            }
            return null;
        }
        catch (e) {
            console.error("Reverse geocoding error:", e);
            return null;
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
    showPopup(lngLat, html) {
        if (this.currentPopup) {
            this.currentPopup.remove();
        }
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
            this.currentPopup = null;
        });
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
        }
        else {
            popup.remove();
        }
    }
}

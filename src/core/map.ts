// Replace this with your MapTiler API Key!
const MAPTILER_KEY = 'bdQDjDEtrztzKNBE2KZO';

import { notify } from '../components/notifications.js';
import type {
    Location,
    LngLat,
    POI,
    SearchFeature,
    Route,
    RouteResponse,
    MapClickCallback,
    POIClickCallback,
    MarkerClickCallback,
    RouteChangedCallback,
    MapTilerMap,
    MapTilerMarker,
    MapTilerPopup
} from '../types/types';

// Declare global maptilersdk (loaded from CDN)
declare const maptilersdk: any;

export class MapEngine {
    map: MapTilerMap;
    private currentStyle: any;
    private markers: Record<string, MapTilerMarker> = {};
    private clickCallback: MapClickCallback | null = null;
    private poiClickCallback: POIClickCallback | null = null;
    currentPopup: MapTilerPopup | null = null;
    private routes: Route[] = [];
    private activeRouteIndex: number = 0;
    private lastRouteData: { routes: Route[]; activeIndex: number } | null = null;
    private onRouteChangedCallback: RouteChangedCallback | null = null;
    private isReady: boolean = false;
    private onPopupCloseCallback: (() => void) | null = null;

    constructor(containerId: string) {
        if (typeof maptilersdk === 'undefined') {
            console.error("MapTiler SDK not loaded");
            throw new Error("MapTiler SDK not loaded");
        }

        maptilersdk.config.apiKey = MAPTILER_KEY;

        const isDarkMode = this.getDarkModePreference();
        this.currentStyle = isDarkMode 
            ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
            : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

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

    onReady(callback: () => void): void {
        if (this.isReady) {
            callback();
        } else {
            this.map.once('load', () => {
                // Ensure isReady is true before callback if event fires
                this.isReady = true; 
                callback();
            });
        }
    }

    private getDarkModePreference(): boolean {
        return localStorage.getItem('theme') === 'dark';
    }

    syncWithDarkMode(isDark: boolean): void {
        const newStyle = isDark 
            ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
            : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;
        
        // Save current state
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const pitch = this.map.getPitch();
        const bearing = this.map.getBearing();

        this.map.setStyle(newStyle);
        
        this.map.once('styledata', () => {
            // Restore state
            this.map.jumpTo({
                center: center,
                zoom: zoom,
                pitch: pitch,
                bearing: bearing
            });

            // Re-draw routes
            if (this.lastRouteData && this.lastRouteData.routes) {
                this.drawRoutes(this.lastRouteData.routes, this.lastRouteData.activeIndex);
            }

            // Restore/Add 3D buildings
            this.add3DBuildings();
        });
    }

    add3DBuildings(): void {
        if (!this.map || !this.map.getStyle()) return;

        // Check if layer already exists
        if (this.map.getLayer('3d-buildings')) return;

        // Check if source exists (OpenMapTiles is standard)
        if (!this.map.getSource('openmaptiles')) {
            // Some styles might use 'maptiler_planet' or different source names
            // If openmaptiles is missing, we might try to find a suitable source or return.
            // But for standard MapTiler styles, it's usually there or implicity available if we add it.
            // Actually, usually styles define sources. If not present, we can't add layer easily without adding source.
            // Let's assume standard vector styles have it or we check 'composite'.
            
            // Standard MapTiler checks:
            const sources = this.map.getStyle().sources;
            let sourceId = 'openmaptiles';
            
            if (!sources[sourceId]) {
               // Try to find a vector source
               const found = Object.keys(sources).find(k => sources[k].type === 'vector');
               if (found) sourceId = found;
               else {
                   console.warn("No vector source found for 3D buildings");
                   return;
               }
            }
            
            this.map.addLayer({
                'id': '3d-buildings',
                'source': sourceId,
                'source-layer': 'building',
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                    'fill-extrusion-color': '#4a4a4a', // Dark mode color default
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
                    'fill-extrusion-opacity': 0.6
                }
            });
            return;
        }

        this.map.addLayer({
            'id': '3d-buildings',
            'source': 'openmaptiles',
            'source-layer': 'building',
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#4a4a4a',
                'fill-extrusion-height': ['get', 'render_height'],
                'fill-extrusion-base': ['get', 'render_min_height'],
                'fill-extrusion-opacity': 0.6
            }
        });
    }

    private init(): void {
        this.map.on('load', () => {
            this.isReady = true;
            this.map.setPitch(60);
            this.applyCustomTooltipsToControls();
            
            // Initial check for 3D buildings if starting in dark mode or just high zoom
            // Actually, we can just add them if possible.
            // But let's respect dark mode logic or just add them generally?
            // User requested "buat pada mode dark bangunan 3d pada light mode tetap ada"
            // Means: 3D buildings should exist in BOTH, or specifically ensure they are enabled in dark mode like in light mode.
            // Standard light mode streets-v2 often has them. dataviz-dark might not.
            // So we blindly add them if missing.
            this.add3DBuildings();
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

    private applyCustomTooltipsToControls(): void {
        const updateTooltips = (): void => {
            const controls = this.map.getContainer().querySelectorAll<HTMLButtonElement>('.maplibregl-ctrl button, .mapboxgl-ctrl button');
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
            if (shouldUpdate) updateTooltips();
        });

        const ctrlContainer = this.map.getContainer().querySelector('.maplibregl-ctrl-top-right') || this.map.getContainer();
        if (ctrlContainer) {
            observer.observe(ctrlContainer, { childList: true, subtree: true });
        }

        // POI Interaction
        this.map.on('mouseenter', (e: any) => {
            const features = this.map.queryRenderedFeatures(e.point);
            const isPoi = features.some((f: any) => f.properties && f.properties.name && f.source !== 'route');
            this.map.getCanvas().style.cursor = isPoi ? 'pointer' : '';
        });

        this.map.on('mouseleave', () => {
            this.map.getCanvas().style.cursor = '';
        });

        this.map.on('click', (e: any) => {
            const features = this.map.queryRenderedFeatures(e.point);
            const viableFeature = features.find((f: any) => 
                f.properties && 
                f.properties.name && 
                f.layer.type === 'symbol'
            );

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
                        .replace(/\b\w/g, (l: string) => l.toUpperCase());
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

    setStyle(styleId: string): void {
        if (!maptilersdk.MapStyle[styleId]) return;
        this.currentStyle = maptilersdk.MapStyle[styleId];
        this.map.setStyle(this.currentStyle);
        
        this.map.once('styledata', () => {
            if (this.lastRouteData && this.lastRouteData.routes) {
                this.drawRoutes(this.lastRouteData.routes, this.lastRouteData.activeIndex);
            }
        });
    }

    onMapClick(callback: MapClickCallback): void {
        this.clickCallback = callback;
    }

    onPoiClick(callback: POIClickCallback): void {
        this.poiClickCallback = callback;
    }

    addMarker(location: Location, onClick: MarkerClickCallback): void {
        if (!location || isNaN(location.lng) || isNaN(location.lat)) return;
        if (location.lat < -90 || location.lat > 90) return;

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

        container.addEventListener('click', (e: Event) => {
            e.stopPropagation(); 
            onClick(location);
        });

        this.markers[location.id] = marker;
    }

    removeMarker(id: string): void {
        if (this.markers[id]) {
            this.markers[id].remove();
            delete this.markers[id];
        }
    }

    flyTo(lng: number, lat: number): void {
        this.map.flyTo({
            center: [lng, lat],
            zoom: 17,
            pitch: 50,
            essential: true,
            duration: 1200
        });
    }

    async calculateRoute(start: LngLat, end: LngLat): Promise<Route[] | null> {
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
            const data: any = await res.json();
            
            if (!data.routes || data.routes.length === 0) {
                notify.show("No route found.", 'error');
                return null;
            }

            // Parse instructions from OSRM steps
            const routes = data.routes.map((r: any) => {
                if (r.legs && r.legs.length > 0) {
                    const steps = r.legs[0].steps;
                    r.instructions = steps.map((s: any) => {
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
                        if (m && m.includes('left')) icon = 'arrow-left';
                        else if (m && m.includes('right')) icon = 'arrow-right';
                        else if (m && m.includes('uturn')) icon = 'rotate-cw';
                        else if (s.maneuver.type === 'arrive') icon = 'map-pin';

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
        } catch (err) {
            console.error(err);
            notify.show("Network error while routing.", 'error');
            return null;
        }
    }

    private drawRoutes(routes: Route[], activeIndex: number): void {
        this.lastRouteData = { routes, activeIndex };

        const features = routes.map((route, index) => ({
            type: 'Feature' as const,
            properties: {
                isMain: index === activeIndex,
                distance: route.distance,
                duration: route.duration
            },
            geometry: route.geometry
        }));

        const geojson = {
            type: 'FeatureCollection' as const,
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

            (this.map as any).on('click', 'route-alternative', (e: any) => {
                if (e.features && e.features.length > 0) {
                    const clickedIndex = routes.findIndex(r => 
                        r.distance === e.features[0].properties.distance
                    );
                    if (clickedIndex !== -1 && clickedIndex !== activeIndex) {
                        this.switchRoute(clickedIndex);
                    }
                }
            });

            (this.map as any).on('mouseenter', 'route-alternative', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });

            (this.map as any).on('mouseleave', 'route-alternative', () => {
                this.map.getCanvas().style.cursor = '';
            });
        } else {
            this.map.getSource('routes').setData(geojson);
        }

        const allCoords = routes.flatMap(r => r.geometry.coordinates);
        if (allCoords.length > 0) {
            const bounds = allCoords.reduce((bounds, coord) => {
                return bounds.extend(coord as [number, number]);
            }, new maptilersdk.LngLatBounds(allCoords[0], allCoords[0]));

            (this.map as any).fitBounds(bounds, {
                padding: { top: 80, bottom: 80, left: 80, right: 80 },
                duration: 1500
            });
        }
    }

    switchRoute(index: number): void {
        if (!this.routes || index < 0 || index >= this.routes.length) return;

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

    onRouteChanged(callback: RouteChangedCallback): void {
        this.onRouteChangedCallback = callback;
    }

    clearRoute(): void {
        if (this.map.getSource('routes')) {
            this.map.getSource('routes').setData({
                'type': 'FeatureCollection',
                'features': []
            });
        }
        this.routes = [];
        this.lastRouteData = null;
    }

    async searchPlaces(query: string): Promise<SearchFeature[]> {
        if (!query || query.length < 3) return [];
        
        const center = this.map.getCenter();
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${center.lat}&lon=${center.lng}&limit=8`;
        
        try {
            const res = await fetch(url);
            const data: any = await res.json();
            
            return (data.features || []).map((f: any): SearchFeature => {
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
                    category = p.osm_value.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
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

        } catch (e) {
            console.error("Search error (Photon):", e);
            return [];
        }
    }

    async reverseGeocode(lng: number, lat: number): Promise<SearchFeature | null> {
        const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}&limit=1`;
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data: any = await res.json();
            if (data.features && data.features.length > 0) {
                return data.features[0];
            }
            return null;
        } catch (e) {
            console.error("Reverse geocoding error:", e);
            return null;
        }
    }

    enableFollowMode(enabled: boolean): void {
        if (enabled) {
            this.map.flyTo({
                zoom: 17,
                pitch: 60,
                essential: true
            });
            
            const geolocateControl = this.map._controls?.find((c: any) => c instanceof maptilersdk.GeolocateControl);
            if (geolocateControl) {
                geolocateControl.trigger();
            }
        }
    }

    showPopup(lngLat: LngLat, html: string, onClose?: () => void): void {
        if (this.currentPopup) {
            this.currentPopup.remove();
        }

        // Store the callback
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
                    closeBtn.addEventListener('click', (e: Event) => {
                        e.stopPropagation();
                        console.log('Close button clicked');
                        this.closePopupAnimated(); 
                    });
                }
            }, 10);
        }

        this.currentPopup?.on('close', () => {
            console.log('Popup closed event fired');
            this.triggerPopupClose();
        });
    }

    private triggerPopupClose(): void {
        this.currentPopup = null;
        if (this.onPopupCloseCallback) {
            console.log('Executing popup close callback');
            try {
                this.onPopupCloseCallback();
            } catch (e) {
                console.error('Error in popup close callback:', e);
            }
            this.onPopupCloseCallback = null;
        }
    }

    closePopupAnimated(): void {
        if (!this.currentPopup) return;
        
        const popup = this.currentPopup;
        const el = popup.getElement();
        
        if (el) {
            el.classList.add('closing');
            
            const onEnd = () => {
                popup.remove();
                el.removeEventListener('animationend', onEnd);
            };
            el.addEventListener('animationend', onEnd, { once: true });
            
            // Safety timeout in case animationend doesn't fire
            setTimeout(() => {
                if (popup.isOpen()) { 
                     popup.remove(); 
                }
            }, 350); 
        } else {
            popup.remove();
        }
    }
}

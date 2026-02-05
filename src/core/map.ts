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
        // Use streets-v2 for all modes
        this.currentStyle = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

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
        const container = this.map.getContainer();
        if (isDark) {
            container.classList.add('map-dark-mode');
        } else {
            container.classList.remove('map-dark-mode');
        }
    }

    add3DBuildings(): void {
        if (!this.map || !this.map.getStyle()) return;

        // Check if layer already exists
        if (this.map.getLayer('3d-buildings')) return;

        // Check if source exists (OpenMapTiles is standard)
        if (!this.map.getSource('openmaptiles')) {
            // Some styles might use 'maptiler_planet' or different source names
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
                    'fill-extrusion-color': '#4a4a4a',
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
            
            // Add 3D buildings
            this.add3DBuildings();
            
            // Apply dark theme if dark mode is active
            const isDarkMode = this.getDarkModePreference();
            if (isDarkMode) {
                this.syncWithDarkMode(true);
            }
        });

        // Handle Map Errors (404s on tiles, styles, etc)
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

        setTimeout(updateTooltips, 100);
    }

    onClick(callback: MapClickCallback): void {
        this.clickCallback = callback;
    }

    onPOIClick(callback: POIClickCallback): void {
        this.poiClickCallback = callback;
    }

    addMarker(id: string, lngLat: LngLat, options?: any): void {
        if (this.markers[id]) {
            this.markers[id].remove();
        }

        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.style.backgroundImage = 'url(/assets/marker.png)';
        markerEl.style.width = '32px';
        markerEl.style.height = '32px';
        markerEl.style.backgroundSize = 'contain';
        markerEl.style.backgroundRepeat = 'no-repeat';
        markerEl.style.cursor = 'pointer';

        const marker = new maptilersdk.Marker({ element: markerEl })
            .setLngLat(lngLat)
            .addTo(this.map);

        if (options?.onClick) {
            markerEl.addEventListener('click', (e: MouseEvent) => {
                e.stopPropagation();
                options.onClick(id, lngLat);
            });
        }

        this.markers[id] = marker;
    }

    removeMarker(id: string): void {
        if (this.markers[id]) {
            this.markers[id].remove();
            delete this.markers[id];
        }
    }

    removeAllMarkers(): void {
        Object.keys(this.markers).forEach(id => this.removeMarker(id));
    }

    flyTo(lngLat: LngLat, zoom?: number): void {
        this.map.flyTo({
            center: lngLat,
            zoom: zoom || 16,
            essential: true
        });
    }

    async getRoute(from: LngLat, to: LngLat): Promise<RouteResponse | null> {
        const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=true&steps=true`;

        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data: RouteResponse = await res.json();
            if (data.routes && data.routes.length > 0) {
                return data;
            }
            return null;
        } catch (e) {
            console.error("Routing error:", e);
            return null;
        }
    }

    drawRoutes(routes: Route[], activeIndex: number = 0): void {
        // FIX: Add null check for routes
        if (!routes || routes.length === 0) {
            console.warn("drawRoutes called with empty or undefined routes");
            return;
        }

        this.routes = routes;
        this.activeRouteIndex = activeIndex;
        this.lastRouteData = { routes, activeIndex };

        const mainRoute = routes[activeIndex];
        const alternativeRoutes = routes.filter((_, i) => i !== activeIndex);

        const features = [
            {
                type: 'Feature',
                properties: { type: 'main', index: activeIndex },
                geometry: mainRoute.geometry
            },
            ...alternativeRoutes.map((route, i) => {
                const altIndex = routes.indexOf(route);
                return {
                    type: 'Feature',
                    properties: { type: 'alternative', index: altIndex },
                    geometry: route.geometry
                };
            })
        ];

        const geojson = {
            'type': 'FeatureCollection',
            'features': features
        };

        if (!this.map.getSource('routes')) {
            this.map.addSource('routes', {
                'type': 'geojson',
                'data': geojson
            });

            this.map.addLayer({
                'id': 'route-alternative',
                'type': 'line',
                'source': 'routes',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': [
                        'case',
                        ['==', ['get', 'type'], 'alternative'],
                        '#9ca3af',
                        'transparent'
                    ],
                    'line-width': 6,
                    'line-opacity': 0.5
                }
            });

            this.map.addLayer({
                'id': 'route-main',
                'type': 'line',
                'source': 'routes',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': [
                        'case',
                        ['==', ['get', 'type'], 'main'],
                        '#3b82f6',
                        'transparent'
                    ],
                    'line-width': 8
                }
            });

            (this.map as any).on('click', 'route-alternative', (e: any) => {
                if (e.features && e.features.length > 0) {
                    const clickedIndex = e.features[0].properties.index;
                    // FIX: Add null check for this.routes
                    if (!this.routes || this.routes.length === 0) return;
                    
                    const activeIndex = this.routes.findIndex(
                        (r) => r === this.routes[this.activeRouteIndex]
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
        // FIX: Add null check for routes
        if (!this.routes || this.routes.length === 0 || index < 0 || index >= this.routes.length) {
            console.warn("switchRoute called with invalid index or empty routes");
            return;
        }

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

    setStyle(styleId: string): void {
        // Handle full URL or simple style ID
        let styleUrl = styleId;
        if (!styleId.startsWith('http')) {
            styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${MAPTILER_KEY}`;
        }
        
        this.currentStyle = styleUrl;
        this.map.setStyle(styleUrl);
        
        this.map.once('styledata', () => {
            if (this.lastRouteData && this.lastRouteData.routes) {
                 this.drawRoutes(this.lastRouteData.routes, this.lastRouteData.activeIndex);
            }
            this.add3DBuildings();
        });
    }
}
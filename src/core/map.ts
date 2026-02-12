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
    MapTilerPopup,
    Coordinates
} from '../types/types';

declare const maptilersdk: any;

export class MapEngine {
    map: MapTilerMap;
    private currentBaseStyle: string = 'streets-v2';
    private isDarkMode: boolean = false;
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

    private readonly STYLE_IDS = {
        STREETS: 'streets-v2',           // Streets Light
        STREETS_DARK: 'streets-v2-dark', // Streets Dark (OFFICIAL MAPTILER DARK)
        SATELLITE: 'satellite',          // Satellite
        HYBRID: 'hybrid',                // Hybrid
        DATAVIZ_DARK: 'dataviz-dark',   // Alternative Dark (lebih kontras)
    };

    geolocateControl: any;

    constructor(containerId: string) {
        if (typeof maptilersdk === 'undefined') {
            console.error("MapTiler SDK not loaded");
            throw new Error("MapTiler SDK not loaded");
        }

        maptilersdk.config.apiKey = MAPTILER_KEY;

        this.isDarkMode = this.getDarkModePreference();
        
        const initialStyle = this.getEffectiveStyleUrl(this.currentBaseStyle);

        this.map = new maptilersdk.Map({
            container: containerId,
            style: initialStyle,
            center: [106.8456, -6.2088],
            zoom: 15.5,
            pitch: 45,
            bearing: -17.6,
            geolocate: false,
            terrainControl: true,
            scaleControl: true,
            navigationControl: true,
            logoControl: false
        });

        const geolocateControl = new maptilersdk.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true,
            showAccuracyCircle: false
        });

        this.map.addControl(geolocateControl, 'top-right');
        this.init();
    }

    onReady(callback: () => void): void {
        if (this.isReady) {
            callback();
        } else {
            this.map.once('load', () => {
                this.isReady = true; 
                callback();
            });
        }
    }

    private getDarkModePreference(): boolean {
        return localStorage.getItem('theme') === 'dark';
    }

    private getEffectiveStyleUrl(baseStyle: string): string {
        let targetStyle = baseStyle;

        if (this.isDarkMode && baseStyle === this.STYLE_IDS.STREETS) {
            targetStyle = this.STYLE_IDS.STREETS_DARK;
        }
        
        if (!this.isDarkMode && baseStyle === this.STYLE_IDS.STREETS_DARK) {
            targetStyle = this.STYLE_IDS.STREETS;
        }
        return `https://api.maptiler.com/maps/${targetStyle}/style.json?key=${MAPTILER_KEY}`;
    }
    private updateMapStyle(): void {
        const newStyleUrl = this.getEffectiveStyleUrl(this.currentBaseStyle);
        const cachedRoute = this.lastRouteData;


        
        this.map.setStyle(newStyleUrl);
        
        this.map.once('idle', () => {
            this.add3DBuildings();

            if (cachedRoute && cachedRoute.routes) {

                this.drawRoutes(cachedRoute.routes, cachedRoute.activeIndex, true);
            }
        });
    }

    syncWithDarkMode(isDark: boolean): void {

        
        this.isDarkMode = isDark;
        const container = this.map.getContainer();
        if (isDark) {
            container.classList.add('map-dark-mode');
        } else {
            container.classList.remove('map-dark-mode');
        }

        this.updateMapStyle();
    }
    setStyle(styleId: string): void {

        
        const normalizedStyleId = styleId.toUpperCase();
        
        const styleMapping: Record<string, string> = {
            'STREETS': this.STYLE_IDS.STREETS,
            'STREETS-V2': this.STYLE_IDS.STREETS,
            'SATELLITE': this.STYLE_IDS.SATELLITE,
            'HYBRID': this.STYLE_IDS.HYBRID,
        };

        this.currentBaseStyle = styleMapping[normalizedStyleId] || this.STYLE_IDS.STREETS;
        
        this.updateMapStyle();
    }

    add3DBuildings(): void {
        if (!this.map || !this.map.getStyle()) return;

        if (
            this.currentBaseStyle === this.STYLE_IDS.SATELLITE || 
            this.currentBaseStyle === this.STYLE_IDS.HYBRID
        ) {
            return;
        }

        if (this.map.getLayer('3d-buildings')) return;

        const style = this.map.getStyle();
        if (!style || !style.sources) {
            console.warn("No sources found in style");
            return;
        }

        const sources = style.sources;
        let sourceId = 'openmaptiles';
        
        if (!sources[sourceId]) {
            const sourceKeys = Object.keys(sources);
            const found = sourceKeys.find(k => sources[k].type === 'vector');
            if (found) sourceId = found;
            else {
                if (sources['composite']) sourceId = 'composite';
                else {
                    return;
                }
            }
        }
        
        let existingLayerId: string | null = null;

        if (style.layers) {
            const buildingLayer = style.layers.find((l: any) => 
                l.source === sourceId && 
                (l['source-layer'] === 'building' || l.id.includes('building')) && 
                l.type === 'fill-extrusion'
            );
            if (buildingLayer) {
                existingLayerId = buildingLayer.id;
            }
        }

        if (existingLayerId) {
             this.map.setPaintProperty(existingLayerId, 'fill-extrusion-height', [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['to-number', ['get', 'render_height'], 0]
            ]);
            
            this.map.setPaintProperty(existingLayerId, 'fill-extrusion-base', [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['to-number', ['get', 'render_min_height'], 0]
            ]);
            
            return; 
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
                    15.05, ['to-number', ['get', 'render_height'], 0]
                ],
                'fill-extrusion-base': [
                    'interpolate', ['linear'], ['zoom'],
                    15, 0,
                    15.05, ['to-number', ['get', 'render_min_height'], 0]
                ],
                'fill-extrusion-opacity': this.isDarkMode ? 0.7 : 0.6
            }
        });
    }

    private init(): void {
        this.map.on('load', () => {
            this.isReady = true;
            this.map.setPitch(60);
            this.applyCustomTooltipsToControls();
            
            this.add3DBuildings();
            
            const isDarkMode = this.getDarkModePreference();
            if (isDarkMode) {
                this.syncWithDarkMode(true);
            }
        });

        this.map.on('mouseenter', (e: any) => {
            const features = this.map.queryRenderedFeatures(e.point);
            const isPoi = features.some((f: any) => f.properties && f.properties.name && f.source !== 'route');
            this.map.getCanvas().style.cursor = isPoi ? 'pointer' : '';
        });

        this.map.on('mouseleave', () => {
            if (!this.map.getCanvas().style.cursor.includes('grab')) {
               this.map.getCanvas().style.cursor = '';
            }
        });

        this.map.on('click', (e: any) => {
            const features = this.map.queryRenderedFeatures(e.point);
            const viableFeature = features.find((f: any) => 
                f.properties && 
                f.properties.name && 
                (f.layer.type === 'symbol' || f.layer.id.includes('label'))
            );

            if (viableFeature) {
                if (this.poiClickCallback) {
                    this.map.flyTo({
                        center: e.lngLat,
                        zoom: 17,
                        pitch: 60,
                        bearing: 0,
                        essential: true,
                        duration: 1500
                    });

                     const category = (viableFeature.properties.class || 'Place')
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l: string) => l.toUpperCase());

                     const poi: POI = {
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

        this.map.on('error', (e) => {
            if (e && e.error && e.error.message) {
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
    }
    
    addMarker(id: string, lngLat: LngLat, options?: { onClick?: () => void; color?: string }): void {
        if (this.markers[id]) {
            this.markers[id].remove();
        }

        const container = document.createElement('div');
        container.className = 'marker-wrapper';

        const el = document.createElement('div');
        el.className = 'custom-marker-dot'; // Changed class name to match CSS
        
        if (options?.color) {
            el.style.backgroundColor = options.color;
            // Add a subtle border for better visibility on dark/light maps if needed
            // el.style.borderColor = ... 
        }

        container.appendChild(el);

        const marker = new maptilersdk.Marker({
            element: container,
            anchor: 'center'
        })
            .setLngLat([lngLat.lng, lngLat.lat])
            .addTo(this.map);

        if (options?.onClick) {
            container.style.cursor = 'pointer';
            container.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                options.onClick!();
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

    clearMarkers(): void {
        Object.keys(this.markers).forEach(id => {
            this.markers[id].remove();
        });
        this.markers = {};
    }

    onClick(callback: MapClickCallback): void {
        this.clickCallback = callback;
    }

    onPOIClick(callback: POIClickCallback): void {
        this.poiClickCallback = callback;
    }

    flyTo(lngOrOptions: number | any, lat?: number): void {
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
        } else if (typeof lngOrOptions === 'object') {
            if ('lng' in lngOrOptions && 'lat' in lngOrOptions && !lngOrOptions.center) {
                 this.map.flyTo({
                    ...cinematicDefaults,
                    center: lngOrOptions,
                    ...lngOrOptions
                });
            } else {
                this.map.flyTo({
                    ...cinematicDefaults,
                    ...lngOrOptions
                });
            }
        }
    }

    async getRoute(start: Coordinates | LngLat, end: Coordinates | LngLat): Promise<RouteResponse | null> {
        try {
            const startLng = 'lng' in start ? start.lng : (start as any).longitude || 0;
            const startLat = 'lat' in start ? start.lat : (start as any).latitude || 0;
            const endLng = 'lng' in end ? end.lng : (end as any).longitude || 0;
            const endLat = 'lat' in end ? end.lat : (end as any).latitude || 0;
            
            const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&steps=true&geometries=geojson`;
            


            const response = await fetch(url);
            if (!response.ok) throw new Error('Route request failed');
            
            const data = await response.json();
            
            if (!data.routes || data.routes.length === 0) {
                console.warn("No routes found");
                return null;
            }

            return {
                routes: data.routes.map((r: any) => ({
                    distance: r.distance,
                    duration: r.duration,
                    geometry: r.geometry,
                    legs: r.legs,
                    instructions: this.parseInstructions(r.legs[0])
                }))
            };
        } catch (e) {
            console.error("Route fetch failed:", e);
            notify.show('Could not find route. Please try again.', 'error');
            return null;
        }
    }

    private parseInstructions(leg: any): any[] {
        if (!leg || !leg.steps) return [];
        
        return leg.steps.map((step: any) => {
            let icon = 'arrow-up';
            
            if (step.maneuver) {
                const type = step.maneuver.type;
                const modifier = step.maneuver.modifier;
                if (type === 'arrive' || type === 'destination') {
                    icon = 'map-pin';
                } else if (modifier) {
                    if (modifier.includes('uturn')) icon = 'rotate-cw';
                    else if (modifier.includes('left')) icon = 'arrow-left';
                    else if (modifier.includes('right')) icon = 'arrow-right';
                }
            }

            return {
                text: step.name || step.maneuver.type || 'Proceed',
                distance: step.distance,
                icon: icon,
                maneuver: step.maneuver
            };
        });
    }

    drawRoutes(routes: Route[], activeIndex: number = 0, isRedraw: boolean = false): void {
        if (this.map.getLayer('route-line')) this.map.removeLayer('route-line');
        if (this.map.getLayer('route-casing')) this.map.removeLayer('route-casing');
        if (this.map.getSource('route')) this.map.removeSource('route');
        
        if (!routes || routes.length === 0) return;
        
        const route = routes[activeIndex];
        this.routes = routes;
        this.activeRouteIndex = activeIndex;
        this.lastRouteData = { routes, activeIndex };

        if (!route.geometry || !route.geometry.coordinates) {
            console.error("❌ Route geometry missing");
            return;
        }

        this.map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': route.geometry
            }
        });

        this.map.addLayer({
            'id': 'route-casing',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#FFFFFF',
                'line-width': 10,
                'line-opacity': 0.8
            }
        });
        this.map.addLayer({
            'id': 'route-line',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#007AFF',
                'line-width': 6,
                'line-opacity': 1
            }
        });

        if (!isRedraw && typeof maptilersdk !== 'undefined') {
             const coordinates = route.geometry.coordinates;
             if (Array.isArray(coordinates) && coordinates.length > 0) {
                 const bounds = new maptilersdk.LngLatBounds(coordinates[0], coordinates[0]);
                 coordinates.forEach((coord: any) => bounds.extend(coord));
                 
                 this.map.fitBounds(bounds, {
                     padding: { top: 150, bottom: 150, left: 50, right: 50 },
                     maxZoom: 16,
                     duration: 1500
                 });
             }
        }
        
        if (this.onRouteChangedCallback) {
            this.onRouteChangedCallback(route);
        }
    }

    clearRoute(): void {
        if (this.map.getLayer('route-line')) {
            this.map.removeLayer('route-line');
        }
        if (this.map.getLayer('route-casing')) {
            this.map.removeLayer('route-casing');
        }

        if (this.map.getSource('route')) {
            this.map.removeSource('route');
        }
        this.routes = [];
        this.lastRouteData = null;
        this.activeRouteIndex = 0;
    }

    onRouteChanged(callback: RouteChangedCallback): void {
        this.onRouteChangedCallback = callback;
    }
    
    async searchPlaces(query: string): Promise<SearchFeature[]> {
        if (!query || query.length < 3) return [];
        
        try {
            const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Search request failed');
            
            const data = await response.json();
            return data.features || [];
        } catch (e) {
            console.error("Search failed:", e);
            notify.show('Search failed', 'error');
            return [];
        }
    }

    async reverseGeocode(lng: number, lat: number): Promise<SearchFeature | null> {
        try {
            const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Geocoding request failed');
            
            const data = await response.json();
            return data.features?.[0] || null;
        } catch (e) {
            console.error("Reverse geocode failed:", e);
            notify.show('Could not find address', 'error');
            return null;
        }
    }
    
    showPopup(lngLat: LngLat, html: string, onClose?: () => void): void {
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
                    closeBtn.addEventListener('click', (e: Event) => {
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

    private triggerPopupClose(): void {
        this.currentPopup = null;
        if (this.onPopupCloseCallback) {
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
            
            setTimeout(() => {
                if (popup.isOpen()) { 
                     popup.remove(); 
                }
            }, 350); 
        } else {
            popup.remove();
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

    resetCamera(): void {
        this.map.flyTo({
            center: [106.8456, -6.2088],
            zoom: 15.5,
            pitch: 45,
            bearing: -17.6,
            duration: 2000,
            essential: true
        });
    }
}
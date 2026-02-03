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
            pitch: 45,
            bearing: -17.6,
            geolocate: false, 
            geolocateControl: false, // Ensure it's disabled
            terrainControl: true,
            scaleControl: true,
            navigationControl: true,
            logoControl: false // Disable default logo
        });

        // Store control instances for access later
        this.geolocateControl = new maptilersdk.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true
        });
        this.map.addControl(this.geolocateControl);

        this.markers = {}; // Store markers BY ID
        this.clickCallback = null;
        
        this.init();
    }

    init() {
        this.map.on('load', () => {
             this.map.setPitch(60); 

             // Apply Custom Tooltips to Map Controls
             this.applyCustomTooltipsToControls();
        });
    }

    applyCustomTooltipsToControls() {
        const updateTooltips = () => {
            const controls = this.map.getContainer().querySelectorAll('.maplibregl-ctrl button, .mapboxgl-ctrl button');
            controls.forEach(btn => {
                const title = btn.getAttribute('title');
                if (title) {
                    btn.setAttribute('data-tooltip', title);
                    btn.setAttribute('aria-label', title); // Accessiblity
                    btn.removeAttribute('title');
                }
            });
        };

        // Initial run
        updateTooltips();

        // Observe for new controls (e.g. if added lazily)
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


        // ... existing POI logic ...
        // POI Interaction: Change cursor
        this.map.on('mouseenter', (e) => {
             // ... existing ...
             const features = this.map.queryRenderedFeatures(e.point);
             const isPoi = features.some(f => f.properties && f.properties.name && f.source !== 'route');
             this.map.getCanvas().style.cursor = isPoi ? 'pointer' : '';
        });

        this.map.on('mouseleave', () => {
             this.map.getCanvas().style.cursor = '';
        });

        this.map.on('click', (e) => {
            // ... existing click logic ...
            // Check for POIs first
            const features = this.map.queryRenderedFeatures(e.point);
            
             const viableFeature = features.find(f => 
                f.properties && 
                f.properties.name && 
                f.layer.type === 'symbol' // Usually icons/labels
            );

            if (viableFeature) {
                // Fly to the location smoothly
                this.map.flyTo({
                    center: e.lngLat,
                    zoom: 17,
                    pitch: 60,
                    bearing: 0,
                    essential: true,
                    duration: 1500
                });

                if (this.poiClickCallback) {
                    const category = (viableFeature.properties.class || 'Place').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    this.poiClickCallback({
                        name: viableFeature.properties.name,
                        category: category,
                        lngLat: e.lngLat,
                        id: viableFeature.id || Date.now()
                    });
                }
                return; // Stop here, don't trigger background click
            }

            if (this.clickCallback) {
                this.clickCallback(e.lngLat);
            }
        });
    }

    setStyle(styleId) {
        if (!maptilersdk.MapStyle[styleId]) return;
        this.currentStyle = maptilersdk.MapStyle[styleId];
        this.map.setStyle(this.currentStyle);
        
        // Re-add route if it existed, as setStyle clears sources/layers
        this.map.once('styledata', () => {
            if (this.lastRouteData && this.lastRouteData.routes) {
                this.drawRoutes(this.lastRouteData.routes, this.lastRouteData.activeIndex);
            }
            // Also need to re-add markers? Markers are usually DOM elements so they stay overlayed, 
            // but if they were symbol layers they would be gone. 
            // Our markers are DOM markers (maptilersdk.Marker), so they persist!
        });
    }



    onMapClick(callback) {
        this.clickCallback = callback;
    }

    onPoiClick(callback) {
        this.poiClickCallback = callback;
    }

    addMarker(location, onClick) {
        if (!location || isNaN(location.lng) || isNaN(location.lat)) return;
        if (location.lat < -90 || location.lat > 90) return;

        // Prevent duplicate markers
        if (this.markers[location.id]) {
            this.markers[location.id].remove();
        }

        // Wrapper for positioning (controlled by Map SDK)
        const container = document.createElement('div');
        container.className = 'marker-wrapper';

        // Actual visual element (animations/styles)
        const el = document.createElement('div');
        el.className = 'custom-marker';
        
        container.appendChild(el);
        
        const marker = new maptilersdk.Marker({
            element: container,
            anchor: 'center'
        })
            .setLngLat([location.lng, location.lat])
            .addTo(this.map);

        // Click event on the container (easier hit target)
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

        // OSRM Routing API (Free & Reliable)
        // Added alternatives=true to get multiple routes
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        
        try {
            console.log("Fetching route:", url);
            const res = await fetch(url);
            
            if (!res.ok) {
                notify.show(`Routing failed: ${res.statusText}`, 'error');
                return null;
            }

            const data = await res.json();
            if(data.routes && data.routes.length > 0) {
                this.routes = data.routes; // Store all routes
                this.activeRouteIndex = 0; // Default to first (best)
                
                this.drawRoutes(this.routes, this.activeRouteIndex);
                
                const mainRoute = this.routes[this.activeRouteIndex];
                const durationMins = Math.round(mainRoute.duration / 60);
                const distanceKm = (mainRoute.distance / 1000).toFixed(1);
                
                notify.show(`Found ${data.routes.length} route(s). Best: ${distanceKm} km (${durationMins} min)`, 'success');
                
                return mainRoute;
            } else {
                notify.show("No route found.", 'error');
                return null;
            }
        } catch(e) {
             console.error("Network Error:", e);
             notify.show("Network error: Could not connect to routing service.", 'error');
             return null;
        }
    }

    drawRoutes(routes, activeIndex) {
        this.lastRouteData = { routes, activeIndex }; // Persistence

        // We need to add sources/layers for EACH route to make them individually clickable.
        // Or simpler: One source with multiple features, but we need to update styles based on properties.
        
        // Approach: One source 'routes', with features having 'isMain' property.
        
        const features = routes.map((route, index) => ({
            'type': 'Feature',
            'properties': {
                'index': index,
                'isMain': index === activeIndex
            },
            'geometry': route.geometry
        }));

        const geojson = {
            'type': 'FeatureCollection',
            'features': features
        };

        if (!this.map.getSource('routes')) {
            this.map.addSource('routes', {
                'type': 'geojson',
                'data': geojson,
                 'lineMetrics': true // Required for gradient lines? Not using gradients yet.
            });
            
            // Layer for ALTERNATIVE routes (Gray, Dashed, Background)
            this.map.addLayer({
                'id': 'routes-alt',
                'type': 'line',
                'source': 'routes',
                'filter': ['==', 'isMain', false], // Only show non-main routes
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#999999',
                    'line-width': 6,
                    'line-opacity': 0.6,
                    'line-dasharray': [2, 2]
                }
            });
            
             // Layer for ALTERNATIVE routes (Invisible Click Target - Wider)
             this.map.addLayer({
                'id': 'routes-alt-touch',
                'type': 'line',
                'source': 'routes',
                'filter': ['==', 'isMain', false],
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': {
                    'line-color': 'transparent',
                    'line-width': 20, // Easy to click
                    'line-opacity': 0
                }
            });

            // Layer for MAIN route (Blue, Solid, Foreground)
            this.map.addLayer({
                'id': 'route-main',
                'type': 'line',
                'source': 'routes',
                'filter': ['==', 'isMain', true], // Only show main route
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#007AFF',
                    'line-width': 6,
                    'line-opacity': 0.9
                }
            });

            // Interaction: Click handling
            this.setupRouteInteraction();

        } else {
            this.map.getSource('routes').setData(geojson);
        }

        // Fit bounds to MAIN route
        if(routes[activeIndex]) {
             const coordinates = routes[activeIndex].geometry.coordinates;
            const bounds = new maptilersdk.LngLatBounds(coordinates[0], coordinates[0]);
            for (const coord of coordinates) {
                bounds.extend(coord);
            }
            this.map.fitBounds(bounds, { padding: 100 });
        }
    }

    setupRouteInteraction() {
        // Change cursor on hover over alternative routes
        this.map.on('mouseenter', 'routes-alt-touch', () => {
             this.map.getCanvas().style.cursor = 'pointer';
        });
        this.map.on('mouseleave', 'routes-alt-touch', () => {
             this.map.getCanvas().style.cursor = '';
        });

        // Click on alternative route
        this.map.on('click', 'routes-alt-touch', (e) => {
            if (e.features.length > 0) {
                const index = e.features[0].properties.index;
                this.switchRoute(index);
            }
        });
        
        // Also allow clicking the visible dash line directly
        this.map.on('click', 'routes-alt', (e) => {
             if (e.features.length > 0) {
                const index = e.features[0].properties.index;
                this.switchRoute(index);
            }
        });
    }

    switchRoute(index) {
        if(index === this.activeRouteIndex) return;

        console.log("Switching to route index:", index);
        this.activeRouteIndex = index;
        
        // Redraw (updates styles based on 'isMain' property)
        this.drawRoutes(this.routes, this.activeRouteIndex);

        // Notify Listeners (Navigation.js needs to know to update text)
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
        if (!query || query.length < 3) return [];
        
        // Photon API (by Komoot, based on OSM)
        // param 'q': query
        // param 'lat', 'lon': Focus/Bias location
        // param 'limit': 8 (Requested)
        
        const center = this.map.getCenter();
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${center.lat}&lon=${center.lng}&limit=8`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            
            // Photon returns GeoJSON FeatureCollection
            // Map features to app format: { id, center, place_name, text, properties: { name, address } }
            
            return (data.features || []).map(f => {
                const p = f.properties;
                // Construct a display string (Address) from available properties
                const addressParts = [
                    p.name, 
                    p.street, 
                    p.city || p.town || p.village, 
                    p.state, 
                    p.country
                ].filter(Boolean); // Remove null/undefined
                
                // Remove duplicates if name is repeated in address parts (common in Photon)
                const uniqueParts = [...new Set(addressParts)];
                const placeName = uniqueParts.join(', ');

                // Format Category (osm_value)
                // e.g. "university" -> "University", "bus_stop" -> "Bus Stop"
                let category = '';
                if (p.osm_value) {
                    category = p.osm_value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                }

                return {
                    id: p.osm_id || Math.random().toString(),
                    center: f.geometry.coordinates, // [lng, lat]
                    place_name: placeName,
                    text: p.name || placeName.split(',')[0],
                    category: category, // New property
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

    async reverseGeocode(lng, lat) {
        const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}&limit=1`;
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                return data.features[0];
            }
            return null;
        } catch (e) {
            console.error("Reverse geocoding error:", e);
            return null;
        }
    }

    enableFollowMode(enabled) {
        if (enabled) {
            // Trigger built-in geolocate control if possible, or manual tracking
            // Since we set geolocate: true in constructor, we can access it via _controls?
            // Safer way: manual approach or find the control instance.
            // Simplified approach: Just ensuring we are tracking if supported.
            
            this.map.flyTo({
                zoom: 17,
                pitch: 60,
                essential: true
            });
            
            if (this.geolocateControl) {
                this.geolocateControl.trigger();
            }
        }
    }

    showPopup(lngLat, content) {
        if (this.currentPopup) {
            this.currentPopup.remove();
        }

        // Create a container div
        const container = document.createElement('div');
        container.style.position = 'relative';

        // Add content
        if (typeof content === 'string') {
            container.innerHTML = content;
        } else if (content instanceof Node) {
            container.appendChild(content);
        }

        // Add Close Button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'maplibregl-popup-close-button custom-popup-close';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close popup');
        closeBtn.innerHTML = '×';
        
        // Attach listener immediately (no setTimeout needed)
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closePopupAnimated();
        });

        container.appendChild(closeBtn);

        this.currentPopup = new maptilersdk.Popup({ 
            offset: 25, 
            className: 'glass-popup', 
            closeButton: false, // We use ours
            maxWidth: 'none'
        })
            .setLngLat(lngLat)
            .setDOMContent(container) // Use setDOMContent instead of setHTML
            .addTo(this.map);

        this.currentPopup.on('close', () => {
            this.currentPopup = null;
        });
    }

    closePopupAnimated() {
        if (!this.currentPopup) return;
        
        const popup = this.currentPopup;
        const el = popup.getElement();
        
        if (el) {
            el.classList.add('closing');
            
            // Wait for animation
            const onEnd = () => {
                popup.remove(); 
            };
            el.addEventListener('animationend', onEnd, { once: true });
            
            // Safety fallback
            setTimeout(onEnd, 300);
        } else {
            popup.remove();
        }
    }
}

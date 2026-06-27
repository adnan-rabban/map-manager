import React, { useEffect, useRef } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { useMapStore } from '../../store/useMapStore.js';
import type { Location, LngLat, POI } from '../../types/types';

const MAPTILER_KEY = 'bdQDjDEtrztzKNBE2KZO';

export const MapViewer: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<Record<string, maptilersdk.Marker>>({});
  
  const {
    locations,
    selectedLocation,
    setSelectedLocation,
    theme,
    activeMapStyle,
    routes,
    activeRouteIndex,
    isAddModalOpen,
    isEditModalId,
    setClickedCoords,
    setStartPoint,
    setDestPoint,
    setNavigationOpen,
    setAddModalOpen
  } = useMapStore();

  const currentPopupRef = useRef<maptilersdk.Popup | null>(null);

  // Helper: Get style ID
  const getStyleUrl = (baseStyle: 'STREETS' | 'HYBRID', isDark: boolean): string => {
    if (baseStyle === 'HYBRID') {
      return 'hybrid';
    } else if (isDark) {
      return 'streets-v2-dark';
    }
    return 'streets-v2';
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    maptilersdk.config.apiKey = MAPTILER_KEY;

    const initialStyle = getStyleUrl(activeMapStyle, theme === 'dark');

    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [106.8456, -6.2088],
      zoom: 15.5,
      pitch: 45,
      bearing: -17.6,
      geolocate: true,
      terrainControl: true,
      scaleControl: true,
      navigationControl: true,
    });

    mapInstance.current = map;

    // Map Event Listeners
    map.on('load', () => {
      map.setPitch(60);
      add3DBuildings(map, theme === 'dark');
    });

    // Map click
    map.on('click', (e: any) => {
      const features = map.queryRenderedFeatures(e.point);
      const viableFeature = features.find((f: any) => 
        f.properties && 
        f.properties.name && 
        (f.layer.type === 'symbol' || f.layer.id.includes('label'))
      );

      // Handle POI Click
      if (viableFeature) {
        map.flyTo({
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
        showPoiPopup(poi);
        return;
      }

      // Handle Normal Map Click for coordinates picker
      const isModalOpen = useMapStore.getState().isAddModalOpen || !!useMapStore.getState().isEditModalId;
      if (isModalOpen) {
        setClickedCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      }
    });

    // Cursor hover
    map.on('mouseenter', (e: any) => {
      const features = map.queryRenderedFeatures(e.point);
      const isPoi = features.some((f: any) => f.properties && f.properties.name && f.source !== 'route');
      map.getCanvas().style.cursor = isPoi ? 'pointer' : '';
    });

    map.on('mouseleave', () => {
      if (!map.getCanvas().style.cursor.includes('grab')) {
        map.getCanvas().style.cursor = '';
      }
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // 2. Sync Style & Theme
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const newStyleUrl = getStyleUrl(activeMapStyle, theme === 'dark');
    map.setStyle(newStyleUrl);

    map.once('idle', () => {
      add3DBuildings(map, theme === 'dark');
      // Redraw routes if exist
      const activeRoutes = useMapStore.getState().routes;
      const activeIndex = useMapStore.getState().activeRouteIndex;
      if (activeRoutes.length > 0) {
        drawRouteOnMap(map, activeRoutes[activeIndex], true);
      }
    });

    // Toggle body data theme class
    const container = map.getContainer();
    if (theme === 'dark') {
      container.classList.add('map-dark-mode');
    } else {
      container.classList.remove('map-dark-mode');
    }
  }, [activeMapStyle, theme]);

  // 3. Sync Markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const currentMarkers = markersRef.current;
    const visibleLocations = locations.filter(loc => !loc.hidden);
    const visibleIds = new Set(visibleLocations.map(l => l.id));

    // Remove old markers
    Object.keys(currentMarkers).forEach(id => {
      if (!visibleIds.has(id)) {
        currentMarkers[id].remove();
        delete currentMarkers[id];
      }
    });

    // Add or Update markers
    visibleLocations.forEach(loc => {
      const existing = currentMarkers[loc.id];
      if (existing) {
        existing.setLngLat([loc.lng, loc.lat]);
        const element = existing.getElement();
        const dot = element.querySelector('.custom-marker-dot') as HTMLElement;
        if (dot && loc.color) {
          dot.style.backgroundColor = loc.color;
        }
      } else {
        const container = document.createElement('div');
        container.className = 'marker-wrapper';
        container.style.cursor = 'pointer';

        const dot = document.createElement('div');
        dot.className = 'custom-marker-dot';
        if (loc.color) {
          dot.style.backgroundColor = loc.color;
        }
        container.appendChild(dot);

        const marker = new maptilersdk.Marker({
          element: container,
          anchor: 'center'
        })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);

        container.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedLocation(loc);
          map.flyTo({
            center: [loc.lng, loc.lat],
            zoom: 17,
            pitch: 50,
            essential: true,
            duration: 1200
          });
        });

        currentMarkers[loc.id] = marker;
      }
    });
  }, [locations]);

  // 4. Sync Selected Location (FlyTo + Popup)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !selectedLocation) {
      if (currentPopupRef.current) {
        currentPopupRef.current.remove();
        currentPopupRef.current = null;
      }
      return;
    }

    // Close previous popup
    if (currentPopupRef.current) {
      currentPopupRef.current.remove();
    }

    const popupHtml = `
      <div class="poi-popup">
        <div class="poi-header">
          <h3>${selectedLocation.name}</h3>
          <div class="poi-subtitle">${selectedLocation.desc || 'Marked Location'}</div>
        </div>
        <div class="poi-divider"></div>
        <div class="poi-body">
          <div class="poi-coords">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
            ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}
          </div>
          <div class="poi-actions">
            <button class="btn-ios-primary" id="btn-selected-nav">Navigate</button>
            <button class="btn-ios-secondary" id="btn-selected-edit">Edit</button>
          </div>
        </div>
      </div>
    `;

    const popup = new maptilersdk.Popup({
      offset: 25,
      className: 'glass-popup',
      closeButton: true,
      maxWidth: 'none'
    })
      .setLngLat([selectedLocation.lng, selectedLocation.lat])
      .setHTML(popupHtml)
      .addTo(map);

    currentPopupRef.current = popup;

    popup.on('close', () => {
      if (useMapStore.getState().selectedLocation?.id === selectedLocation.id) {
        setSelectedLocation(null);
      }
    });

    // Attach click events
    setTimeout(() => {
      const btnNav = document.getElementById('btn-selected-nav');
      const btnEdit = document.getElementById('btn-selected-edit');

      if (btnNav) {
        btnNav.addEventListener('click', () => {
          setDestPoint(selectedLocation.name, { lng: selectedLocation.lng, lat: selectedLocation.lat });
          setNavigationOpen(true);
          popup.remove();
        });
      }

      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          useMapStore.getState().setEditModalId(selectedLocation.id);
          popup.remove();
        });
      }
    }, 50);

  }, [selectedLocation]);

  // 5. Sync Routes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (routes.length === 0) {
      clearRouteFromMap(map);
      return;
    }

    const route = routes[activeRouteIndex];
    if (route) {
      drawRouteOnMap(map, route, false);
    }
  }, [routes, activeRouteIndex]);

  // POI Popup Handler
  const showPoiPopup = (poi: POI) => {
    const map = mapInstance.current;
    if (!map) return;

    if (currentPopupRef.current) {
      currentPopupRef.current.remove();
    }

    const popupHtml = `
      <div class="poi-popup">
        <div class="poi-header">
          <h3>${poi.name}</h3>
          <div class="poi-subtitle">${poi.category}</div>
        </div>
        <div class="poi-divider"></div>
        <div class="poi-body">
          <div class="poi-coords">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
            ${poi.lngLat.lat.toFixed(6)}, ${poi.lngLat.lng.toFixed(6)}
          </div>
          <div class="poi-actions">
            <button class="btn-ios-primary" id="btn-poi-nav">Navigate</button>
            <button class="btn-ios-secondary" id="btn-poi-save">Save</button>
          </div>
        </div>
      </div>
    `;

    const popup = new maptilersdk.Popup({
      offset: 25,
      className: 'glass-popup',
      closeButton: true,
      maxWidth: 'none'
    })
      .setLngLat(poi.lngLat)
      .setHTML(popupHtml)
      .addTo(map);

    currentPopupRef.current = popup;

    setTimeout(() => {
      const btnNav = document.getElementById('btn-poi-nav');
      const btnSave = document.getElementById('btn-poi-save');

      if (btnNav) {
        btnNav.addEventListener('click', () => {
          setDestPoint(poi.name, { lng: poi.lngLat.lng, lat: poi.lngLat.lat });
          setNavigationOpen(true);
          popup.remove();
        });
      }

      if (btnSave) {
        btnSave.addEventListener('click', () => {
          // Open add modal and set clicked coords to this POI
          setClickedCoords({ lng: poi.lngLat.lng, lat: poi.lngLat.lat });
          setAddModalOpen(true);
          popup.remove();
        });
      }
    }, 50);
  };

  // Helper to draw route
  const drawRouteOnMap = (map: maptilersdk.Map, route: any, isRedraw: boolean) => {
    clearRouteFromMap(map);

    if (!route || !route.geometry || !route.geometry.coordinates) return;

    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    map.addLayer({
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#FFFFFF',
        'line-width': 10,
        'line-opacity': 0.8
      }
    });

    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#007AFF',
        'line-width': 6,
        'line-opacity': 1
      }
    });

    if (!isRedraw) {
      const coordinates = route.geometry.coordinates;
      if (Array.isArray(coordinates) && coordinates.length > 0) {
        const bounds = new maptilersdk.LngLatBounds(coordinates[0], coordinates[0]);
        coordinates.forEach((coord: any) => bounds.extend(coord));

        map.fitBounds(bounds, {
          padding: { top: 150, bottom: 150, left: 50, right: 50 },
          maxZoom: 16,
          duration: 1500
        });
      }
    }
  };

  const clearRouteFromMap = (map: maptilersdk.Map) => {
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getLayer('route-casing')) map.removeLayer('route-casing');
    if (map.getSource('route')) map.removeSource('route');
  };

  // Helper for 3D buildings
  const add3DBuildings = (map: maptilersdk.Map, isDark: boolean) => {
    if (!map || !map.getStyle()) return;

    const currentStyle = map.getStyle();
    if (!currentStyle || !currentStyle.sources) return;

    // Check if satellite or hybrid
    const styleUrl = (currentStyle as any).id || '';
    if (styleUrl.includes('satellite') || styleUrl.includes('hybrid')) {
      if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings');
      return;
    }

    if (map.getLayer('3d-buildings')) return;

    const sources = currentStyle.sources;
    let sourceId = 'openmaptiles';
    
    if (!sources[sourceId]) {
      const found = Object.keys(sources).find(k => sources[k].type === 'vector');
      if (found) sourceId = found;
      else return;
    }

    map.addLayer({
      id: '3d-buildings',
      source: sourceId,
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': isDark ? '#1a1a1a' : '#c9c9c9',
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
        'fill-extrusion-opacity': isDark ? 0.7 : 0.6
      }
    });
  };

  return (
    <div 
      id="map-container" 
      ref={mapContainerRef} 
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  );
};

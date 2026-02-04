// ===================================
// TYPE DEFINITIONS
// Global types untuk Map Manager App
// ===================================

// Location/Place Types
export interface Location {
  id: string;
  name: string;
  desc?: string;
  lng: number;
  lat: number;
  hidden?: boolean;
}

export interface Coordinates {
  lng: number;
  lat: number;
}

export interface LngLat {
  lng: number;
  lat: number;
}

// POI (Point of Interest) Types
export interface POI {
  id: string | number;
  name: string;
  category: string;
  lngLat: LngLat;
}

// Search Result Types
export interface SearchFeature {
  id: string;
  center: [number, number]; // [lng, lat]
  place_name: string;
  text: string;
  category?: string;
  properties: {
    name: string;
    address: string;
    category?: string;
  };
  context?: Array<{ text: string }>;
}

// Route Types
export interface RouteInstruction {
  text: string;
  distance: number;
  icon: string;
}

export interface Route {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  instructions?: RouteInstruction[];
}

export interface RouteResponse {
  routes: Route[];
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationConfig {
  titles: string[];
  icons: string[];
}

export interface NotificationConfigMap {
  success: NotificationConfig;
  error: NotificationConfig;
  info: NotificationConfig;
  [key: string]: NotificationConfig;
}

// MapTiler SDK Types (simplified - for real app use @types/maptiler-sdk)
export interface MapTilerMarker {
  remove(): void;
  setLngLat(coords: [number, number] | LngLat): MapTilerMarker;
  getLngLat(): LngLat;
  addTo(map: any): MapTilerMarker;
  getElement(): HTMLElement;
}

export interface MapTilerPopup {
  remove(): void;
  setLngLat(coords: [number, number] | LngLat): MapTilerPopup;
  setHTML(html: string): MapTilerPopup;
  addTo(map: any): MapTilerPopup;
  getElement(): HTMLElement;
  on(event: string, callback: () => void): void;
  isOpen(): boolean;
}

export interface MapTilerMap {
  on(event: string, callback: (e?: any) => void): void;
  once(event: string, callback: () => void): void;
  flyTo(options: any): void;
  easeTo(options: any): void;
  setStyle(style: any): void;
  getSource(id: string): any;
  getLayer(id: string): any;
  addSource(id: string, source: any): void;
  addLayer(layer: any): void;
  removeLayer(id: string): void;
  removeSource(id: string): void;
  setPaintProperty(layer: string, property: string, value: any): void;
  setPitch(pitch: number): void;
  getCenter(): LngLat;
  getContainer(): HTMLElement;
  queryRenderedFeatures(point: any, options?: any): any[];
  getCanvas(): HTMLCanvasElement;
  _controls?: any[];
}

// Event Types
export interface MapClickEvent {
  lngLat: LngLat;
  point: { x: number; y: number };
}

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}

// Callback Types
export type MarkerClickCallback = (location: Location) => void;
export type POIClickCallback = (poi: POI) => void;
export type MapClickCallback = (lngLat: LngLat) => void;
export type RouteChangedCallback = (route: Route) => void;
export type CoordinatesCallback = (coords: Coordinates | null) => void;

// Store Export Data
export type LocationsExport = Location[];

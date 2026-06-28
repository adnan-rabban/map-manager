import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Location, Group, Route, Coordinates, Geofence, AssetStatus, AssetCategory } from '../types/types';

interface MapState {
  // Auth State
  isAuthenticated: boolean;
  currentUser: { username: string; role: 'admin' | 'operator' } | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;

  // Data State
  locations: Location[];
  groups: Group[];
  geofences: Geofence[];
  selectedLocation: Location | null;
  
  // UI State
  theme: 'light' | 'dark';
  isSidebarOpen: boolean;
  isNavigationOpen: boolean;
  isLayersOpen: boolean;
  isSettingsOpen: boolean;
  isAddModalOpen: boolean;
  isEditModalId: string | null;
  clickedCoords: Coordinates | null;
  activeMapStyle: 'STREETS' | 'HYBRID';
  filterStatus: AssetStatus | 'all';
  filterCategory: AssetCategory | 'all';
  
  // Navigation State
  startCoords: Coordinates | null;
  destCoords: Coordinates | null;
  startPlaceName: string;
  destPlaceName: string;
  routes: Route[];
  activeRouteIndex: number;
  isRealTimeNavigating: boolean;

  // Actions
  // Group CRUD
  addGroup: (name: string) => Group;
  updateGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  toggleGroupCollapse: (id: string) => void;
  
  // Location CRUD
  addLocation: (location: Omit<Location, 'id'>) => Location;
  updateLocation: (id: string, updatedFields: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  assignLocationToGroup: (locationId: string, groupId: string | null) => void;
  importData: (newLocations: unknown, targetGroupId?: string) => boolean;

  // Geofence Actions
  addGeofence: (geofence: Omit<Geofence, 'id'>) => Geofence;
  deleteGeofence: (id: string) => void;

  // UI Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setNavigationOpen: (isOpen: boolean) => void;
  setLayersOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setSelectedLocation: (loc: Location | null) => void;
  setAddModalOpen: (isOpen: boolean) => void;
  setEditModalId: (id: string | null) => void;
  setClickedCoords: (coords: Coordinates | null) => void;
  setActiveMapStyle: (style: 'STREETS' | 'HYBRID') => void;
  setFilterStatus: (status: AssetStatus | 'all') => void;
  setFilterCategory: (category: AssetCategory | 'all') => void;
  
  // Navigation Actions
  setStartPoint: (name: string, coords: Coordinates | null) => void;
  setDestPoint: (name: string, coords: Coordinates | null) => void;
  setRoutes: (routes: Route[], activeIndex?: number) => void;
  setActiveRouteIndex: (index: number) => void;
  setRealTimeNavigating: (isNavigating: boolean) => void;
  clearRoute: () => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      currentUser: null,
      locations: [
        {
          id: "1",
          name: "Logistics Hub Alpha",
          desc: "Main dispatch depot for logistics and sorting",
          lng: 106.8456,
          lat: -6.2088,
          groupId: "group-hubs",
          status: "active",
          category: "hub",
          telemetry: { uptime: 99.8, signalStrength: 95 },
          lastUpdated: new Date().toISOString()
        },
        {
          id: "2",
          name: "Delivery Truck #42",
          desc: "Transit truck carrying retail goods",
          lng: 106.8520,
          lat: -6.2150,
          groupId: "group-fleet",
          status: "active",
          category: "vehicle",
          telemetry: { speed: 55, temperature: 24, battery: 85, signalStrength: 80 },
          lastUpdated: new Date().toISOString()
        },
        {
          id: "3",
          name: "IoT Temperature Sensor A",
          desc: "Environmental monitoring inside cold storage",
          lng: 106.8400,
          lat: -6.2020,
          groupId: "group-sensors",
          status: "maintenance",
          category: "sensor",
          telemetry: { temperature: -18.5, battery: 12, signalStrength: 45 },
          lastUpdated: new Date().toISOString()
        },
        {
          id: "4",
          name: "South Warehousing Complex",
          desc: "Bulk storage facilities and loading bay",
          lng: 106.8610,
          lat: -6.2210,
          groupId: "group-hubs",
          status: "offline",
          category: "warehouse",
          telemetry: { uptime: 0, signalStrength: 0 },
          lastUpdated: new Date().toISOString()
        }
      ],
      groups: [
        { id: "group-hubs", name: "Depots & Hubs", isCollapsed: false },
        { id: "group-fleet", name: "Active Fleet", isCollapsed: false },
        { id: "group-sensors", name: "Sensor Networks", isCollapsed: false }
      ],
      geofences: [
        {
          id: "geo-1",
          name: "Depot Geofence Area",
          type: "polygon",
          coordinates: [
            { lng: 106.843, lat: -6.205 },
            { lng: 106.848, lat: -6.205 },
            { lng: 106.848, lat: -6.210 },
            { lng: 106.843, lat: -6.210 }
          ],
          color: "#3b82f6",
          areaSize: 250000
        }
      ],
      selectedLocation: null,
      theme: 'light',
      isSidebarOpen: true,
      isNavigationOpen: false,
      isLayersOpen: false,
      isSettingsOpen: false,
      isAddModalOpen: false,
      isEditModalId: null,
      clickedCoords: null,
      activeMapStyle: 'STREETS',
      filterStatus: 'all',
      filterCategory: 'all',
      
      startCoords: null,
      destCoords: null,
      startPlaceName: '',
      destPlaceName: '',
      routes: [],
      activeRouteIndex: 0,
      isRealTimeNavigating: false,

      // Group CRUD
      addGroup: (name) => {
        const newGroup: Group = {
          id: Date.now().toString(),
          name,
          isCollapsed: false
        };
        set((state) => ({
          groups: [...state.groups, newGroup]
        }));
        return newGroup;
      },
      updateGroup: (id, name) => {
        set((state) => ({
          groups: state.groups.map(g => g.id === id ? { ...g, name } : g)
        }));
      },
      deleteGroup: (id) => {
        set((state) => ({
          groups: state.groups.filter(g => g.id !== id),
          locations: state.locations.filter(loc => loc.groupId !== id)
        }));
      },
      toggleGroupCollapse: (id) => {
        set((state) => ({
          groups: state.groups.map(g => g.id === id ? { ...g, isCollapsed: !g.isCollapsed } : g)
        }));
      },

      // Location CRUD
      addLocation: (location) => {
        const newLocation: Location = {
          ...location,
          id: Date.now().toString(),
          status: location.status || 'active',
          category: location.category || 'hub',
          telemetry: location.telemetry || { uptime: 100, signalStrength: 100 },
          lastUpdated: new Date().toISOString()
        };
        set((state) => ({
          locations: [...state.locations, newLocation]
        }));
        return newLocation;
      },
      updateLocation: (id, updatedFields) => {
        set((state) => ({
          locations: state.locations.map(l => l.id === id ? { ...l, ...updatedFields, lastUpdated: new Date().toISOString() } : l)
        }));
        // Update selectedLocation if it was updated
        const currentSelected = get().selectedLocation;
        if (currentSelected && currentSelected.id === id) {
          set({ selectedLocation: { ...currentSelected, ...updatedFields, lastUpdated: new Date().toISOString() } });
        }
      },
      deleteLocation: (id) => {
        set((state) => ({
          locations: state.locations.filter(l => l.id !== id),
          selectedLocation: state.selectedLocation?.id === id ? null : state.selectedLocation
        }));
      },
      assignLocationToGroup: (locationId, groupId) => {
        set((state) => ({
          locations: state.locations.map(l => {
            if (l.id === locationId) {
              const updated = { ...l, lastUpdated: new Date().toISOString() };
              if (groupId) {
                updated.groupId = groupId;
              } else {
                delete updated.groupId;
              }
              return updated;
            }
            return l;
          })
        }));
      },
      importData: (newLocations, targetGroupId) => {
        if (!Array.isArray(newLocations)) return false;
        
        const valid = newLocations.filter((l: any) => 
          l.name && 
          (!l.lng || !isNaN(parseFloat(l.lng))) && 
          (!l.lat || !isNaN(parseFloat(l.lat)))
        ).map((l: any) => ({
            id: l.id || `import-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: l.name,
            desc: l.desc || '',
            lng: parseFloat(l.lng),
            lat: parseFloat(l.lat),
            hidden: l.hidden === 'true' || l.hidden === true,
            groupId: targetGroupId,
            status: l.status || 'active',
            category: l.category || 'hub',
            telemetry: l.telemetry || { uptime: 100, signalStrength: 100 },
            lastUpdated: l.lastUpdated || new Date().toISOString()
        })).filter(l => !isNaN(l.lng) && !isNaN(l.lat));
        
        if (valid.length === 0) return false;

        set((state) => {
          const updatedLocations = [...state.locations];
          valid.forEach(newItem => {
            const idx = updatedLocations.findIndex(existing => existing.id === newItem.id);
            if (idx !== -1) {
              updatedLocations[idx] = newItem;
            } else {
              updatedLocations.push(newItem);
            }
          });
          return { locations: updatedLocations };
        });
        
        return true;
      },

      // Geofence Actions
      addGeofence: (geofence) => {
        const newGeo: Geofence = {
          ...geofence,
          id: `geo-${Date.now()}`
        };
        set((state) => ({
          geofences: [...state.geofences, newGeo]
        }));
        return newGeo;
      },
      deleteGeofence: (id) => {
        set((state) => ({
          geofences: state.geofences.filter(g => g.id !== id)
        }));
      },

      // UI Actions
      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      setNavigationOpen: (isOpen) => set({ isNavigationOpen: isOpen }),
      setLayersOpen: (isOpen) => set({ isLayersOpen: isOpen }),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
      setSelectedLocation: (loc) => set({ selectedLocation: loc }),
      setAddModalOpen: (isOpen) => set({ isAddModalOpen: isOpen }),
      setEditModalId: (id) => set({ isEditModalId: id }),
      setClickedCoords: (coords) => set({ clickedCoords: coords }),
      setActiveMapStyle: (style) => set({ activeMapStyle: style }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      setFilterCategory: (category) => set({ filterCategory: category }),

      // Navigation Actions
      setStartPoint: (name, coords) => set({ startPlaceName: name, startCoords: coords }),
      setDestPoint: (name, coords) => set({ destPlaceName: name, destCoords: coords }),
      setRoutes: (routes, activeIndex = 0) => set({ routes, activeRouteIndex: activeIndex }),
      setActiveRouteIndex: (index) => set({ activeRouteIndex: index }),
      setRealTimeNavigating: (isNavigating) => set({ isRealTimeNavigating: isNavigating }),
      clearRoute: () => set({
        routes: [],
        activeRouteIndex: 0,
        startCoords: null,
        destCoords: null,
        startPlaceName: '',
        destPlaceName: '',
        isRealTimeNavigating: false
      }),

      // Auth Actions
      login: (username, password) => {
        const cleanUser = username.trim().toLowerCase();
        console.log("Zustand login action executing with cleanUser:", cleanUser);
        if (cleanUser === 'admin' && password === 'admin123') {
          console.log("Logging in as Administrator");
          set({
            isAuthenticated: true,
            currentUser: { username: 'Administrator', role: 'admin' }
          });
          return { success: true };
        } else if (cleanUser === 'operator' && password === 'operator123') {
          console.log("Logging in as Operator Lapangan");
          set({
            isAuthenticated: true,
            currentUser: { username: 'Operator Lapangan', role: 'operator' }
          });
          return { success: true };
        }
        console.log("Login credentials invalid");
        return { success: false, error: 'Username atau Password salah!' };
      },
      logout: () => set({
        isAuthenticated: false,
        currentUser: null,
        isSettingsOpen: false,
        isAddModalOpen: false,
        isEditModalId: null,
      })
    }),
    {
      name: 'map-manager-storage',
      partialize: (state) => ({
        locations: state.locations,
        groups: state.groups,
        geofences: state.geofences,
        theme: state.theme,
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
      }),
    }
  )
);

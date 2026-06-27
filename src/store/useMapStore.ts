import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Location, Group, Route, Coordinates } from '../types/types';

interface MapState {
  // Data State
  locations: Location[];
  groups: Group[];
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
      locations: [
        {
          id: "1",
          name: "Example Location",
          desc: "A sample point",
          lng: 106.8456,
          lat: -6.2088,
        }
      ],
      groups: [],
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
          id: Date.now().toString()
        };
        set((state) => ({
          locations: [...state.locations, newLocation]
        }));
        return newLocation;
      },
      updateLocation: (id, updatedFields) => {
        set((state) => ({
          locations: state.locations.map(l => l.id === id ? { ...l, ...updatedFields } : l)
        }));
        // Update selectedLocation if it was updated
        const currentSelected = get().selectedLocation;
        if (currentSelected && currentSelected.id === id) {
          set({ selectedLocation: { ...currentSelected, ...updatedFields } });
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
              const updated = { ...l };
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
            groupId: targetGroupId
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
      })
    }),
    {
      name: 'map-manager-storage',
      partialize: (state) => ({
        locations: state.locations,
        groups: state.groups,
        theme: state.theme,
      }),
    }
  )
);

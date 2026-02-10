import type { Location, Group, LocationsExport } from '../types/types';

export class Store {
  private locations: Location[];
  private groups: Group[];

  constructor() {
    this.locations = this.loadLocations();
    this.groups = this.loadGroups();
    // Default data if empty for demo purposes
    if (this.locations.length === 0) {
      this.locations = [
        {
          id: "1",
          name: "Example Location",
          desc: "A sample point",
          lng: 106.8456,
          lat: -6.2088,
        }, // Jakarta default
      ];
      this.save();
    }
  }

  private loadLocations(): Location[] {
    try {
        const data = localStorage.getItem("map-locations");

        const parsed: Location[] = data ? JSON.parse(data) : [];
        const filtered = parsed.filter(l => 
            l.lat >= -90 && l.lat <= 90 && 
            l.lng >= -180 && l.lng <= 180
        );

        return filtered;
    } catch (e) {
        console.error('[Store] Failed to load locations:', e);
        return [];
    }
  }

  private loadGroups(): Group[] {
    try {
        const data = localStorage.getItem("map-groups");
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('[Store] Failed to load groups:', e);
        return [];
    }
  }

  private save(): void {
    try {

        localStorage.setItem("map-locations", JSON.stringify(this.locations));
        localStorage.setItem("map-groups", JSON.stringify(this.groups));
    } catch (e) {
        console.error('[Store] Failed to save data:', e);
    }
  }

  getGroups(): Group[] {
    return this.groups;
  }

  addGroup(name: string): Group {
    const newGroup: Group = {
      id: Date.now().toString(),
      name,
      isCollapsed: false
    };
    this.groups.push(newGroup);
    this.save();
    return newGroup;
  }

  updateGroup(id: string, name: string): void {
    const group = this.groups.find(g => g.id === id);
    if (group) {
        group.name = name;
        this.save();
    }
  }

  deleteGroup(id: string): void {
    // 1. Remove group
    this.groups = this.groups.filter(g => g.id !== id);
    
    // 2. Cascade Delete: Remove locations in this group
    this.locations = this.locations.filter(loc => loc.groupId !== id);

    this.save();
  }

  toggleGroupCollapse(id: string): void {
    const group = this.groups.find(g => g.id === id);
    if (group) {
        group.isCollapsed = !group.isCollapsed;
        this.save();
    }
  }

  assignLocationToGroup(locationId: string, groupId: string | null): void {
      const loc = this.locations.find(l => l.id === locationId);
      if (loc) {
          if (groupId) {
              loc.groupId = groupId;
          } else {
              delete loc.groupId;
          }
          this.save();
      }
  }

  getAll(): Location[] {
    return this.locations;
  }

  add(location: Omit<Location, 'id'>): Location {
    const newLocation: Location = {
      ...location,
      id: Date.now().toString()
    };
    this.locations.push(newLocation);
    this.save();
    return newLocation;
  }

  update(id: string, updatedFields: Partial<Location>): void {
    const idx = this.locations.findIndex((l) => l.id === id);
    if (idx !== -1) {
      this.locations[idx] = { ...this.locations[idx], ...updatedFields };
      this.save();
    }
  }

  delete(id: string): void {
    this.locations = this.locations.filter((l) => l.id !== id);
    this.save();
  }

  importData(newLocations: unknown, targetGroupId?: string): boolean {
    if (!Array.isArray(newLocations)) return false;
    
    // Perbaikan: Validasi lebih fleksibel (ID opsional)
    const valid = newLocations.filter((l: any) => 
      l.name && 
      (!l.lng || !isNaN(parseFloat(l.lng))) && 
      (!l.lat || !isNaN(parseFloat(l.lat)))
    ).map((l: any) => ({
        // Jika ID tidak ada, buat ID baru menggunakan timestamp + random
        id: l.id || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: l.name,
        desc: l.desc || '',
        // Pastikan lng/lat dikonversi ke number (jika dari CSV string)
        lng: parseFloat(l.lng),
        lat: parseFloat(l.lat),
        hidden: l.hidden === 'true' || l.hidden === true ? true : false,
        groupId: targetGroupId // Assign group if provided
    })).filter(l => !isNaN(l.lng) && !isNaN(l.lat)); // Final safety check
    
    if (valid.length === 0) return false;

    // Merge strategy
    valid.forEach(newItem => {
        const idx = this.locations.findIndex(existing => existing.id === newItem.id);
        if (idx !== -1) {
            this.locations[idx] = newItem;
        } else {
            this.locations.push(newItem);
        }
    });
    
    this.save();
    return true;
  }

  moveLocation(locationId: string, targetGroupId: string | null): void {
      const loc = this.locations.find(l => l.id === locationId);
      if (loc) {
          if (targetGroupId) {
              loc.groupId = targetGroupId;
          } else {
              delete loc.groupId;
          }
          this.save();
      }
  }
}

import type { Location, LocationsExport } from './types';

export class Store {
  private locations: Location[];

  constructor() {
    this.locations = this.load();
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

  private load(): Location[] {
    const data = localStorage.getItem("map-locations");
    const parsed: Location[] = data ? JSON.parse(data) : [];
    // Filter out invalid coordinates immediately affecting the app
    return parsed.filter(l => 
        l.lat >= -90 && l.lat <= 90 && 
        l.lng >= -180 && l.lng <= 180
    );
  }

  private save(): void {
    localStorage.setItem("map-locations", JSON.stringify(this.locations));
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

  update(updatedLoc: Location): void {
    const idx = this.locations.findIndex((l) => l.id === updatedLoc.id);
    if (idx !== -1) {
      this.locations[idx] = updatedLoc;
      this.save();
    }
  }

  delete(id: string): void {
    this.locations = this.locations.filter((l) => l.id !== id);
    this.save();
  }

  importData(newLocations: unknown): boolean {
    if (!Array.isArray(newLocations)) return false;
    
    // Validate basics - type guard
    const valid = newLocations.filter((l: any): l is Location => 
      l.id && 
      l.name && 
      typeof l.lng === 'number' && 
      typeof l.lat === 'number' &&
      !isNaN(l.lng) && 
      !isNaN(l.lat)
    );
    
    // Merge strategy: Overwrite matching IDs, add new ones
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

  exportData(): LocationsExport {
    return this.locations;
  }
}

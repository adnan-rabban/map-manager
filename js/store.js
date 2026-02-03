export class Store {
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

  load() {
    const data = localStorage.getItem("map-locations");
    const parsed = data ? JSON.parse(data) : [];
    // Filter out invalid coordinates immediately affecting the app
    return parsed.filter(l => 
        l.lat >= -90 && l.lat <= 90 && 
        l.lng >= -180 && l.lng <= 180
    );
  }

  save() {
    localStorage.setItem("map-locations", JSON.stringify(this.locations));
  }

  getAll() {
    return this.locations;
  }

  add(location) {
    location.id = crypto.randomUUID ? crypto.randomUUID() : `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.locations.push(location);
    this.save();
    return location;
  }

  update(updatedLoc) {
    const idx = this.locations.findIndex((l) => l.id === updatedLoc.id);
    if (idx !== -1) {
      this.locations[idx] = updatedLoc;
      this.save();
    }
  }

  delete(id) {
    this.locations = this.locations.filter((l) => l.id !== id);
    this.save();
  }

  importData(newLocations) {
    if (!Array.isArray(newLocations)) return false;
    
    // Validate basics
    const valid = newLocations.filter(l => l.id && l.name && !isNaN(l.lng) && !isNaN(l.lat));
    
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
}

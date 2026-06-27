import React, { useState, useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore.js';
import { notify } from '../notifications.js';

export const ModalOverlay: React.FC = () => {
  const {
    isAddModalOpen,
    isEditModalId,
    setAddModalOpen,
    setEditModalId,
    clickedCoords,
    setClickedCoords,
    groups,
    locations,
    addLocation,
    updateLocation
  } = useMapStore();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [groupId, setGroupId] = useState('');
  const [color, setColor] = useState('#007AFF');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isEdit = !!isEditModalId;
  const isOpen = isAddModalOpen || isEdit;

  // Initialize fields on open or change
  useEffect(() => {
    if (isEditModalId) {
      const loc = locations.find(l => l.id === isEditModalId);
      if (loc) {
        setName(loc.name);
        setDesc(loc.desc || '');
        setLat(loc.lat.toString());
        setLng(loc.lng.toString());
        setGroupId(loc.groupId || '');
        setColor(loc.color || '#007AFF');
      }
    } else {
      setName('');
      setDesc('');
      setLat('');
      setLng('');
      setGroupId('');
      setColor('#007AFF');
    }
  }, [isAddModalOpen, isEditModalId]);

  // Autofill coordinates from map click
  useEffect(() => {
    if (clickedCoords && isOpen) {
      setLat(clickedCoords.lat.toFixed(6));
      setLng(clickedCoords.lng.toFixed(6));
      
      // Perform reverse geocoding
      const fetchAddress = async () => {
        notify.show('Fetching address...', 'info');
        try {
          const MAPTILER_KEY = 'bdQDjDEtrztzKNBE2KZO';
          const url = `https://api.maptiler.com/geocoding/${clickedCoords.lng},${clickedCoords.lat}.json?key=${MAPTILER_KEY}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error('Reverse geocoding failed');
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            setName(feature.place_name || feature.text);
            const context = feature.context ? feature.context.map((c: any) => c.text).join(', ') : '';
            setDesc(context);
            notify.show('Address found!', 'success');
          }
        } catch {
          notify.show('Failed to fetch address', 'error');
        }
      };
      
      fetchAddress();
    }
  }, [clickedCoords]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (!name.trim()) {
      notify.show('Name is required', 'error');
      return;
    }

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      notify.show('Invalid coordinates', 'error');
      return;
    }

    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      notify.show('Coordinates out of range', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      desc: desc.trim(),
      lat: parsedLat,
      lng: parsedLng,
      color,
      groupId: groupId || undefined
    };

    if (isEdit && isEditModalId) {
      updateLocation(isEditModalId, payload);
      notify.show('Location updated successfully', 'success');
      setEditModalId(null);
    } else {
      addLocation(payload);
      notify.show('Location saved successfully', 'success');
      setAddModalOpen(false);
    }

    setClickedCoords(null);
  };

  const handleClose = () => {
    setAddModalOpen(false);
    setEditModalId(null);
    setClickedCoords(null);
  };

  const currentGroupName = groupId ? (groups.find(g => g.id === groupId)?.name || 'Uncategorized') : 'Uncategorized';

  return (
    <div id="modal-overlay" className="modal-overlay open">
      <div className="modal">
        <h2 style={{ marginBottom: '20px' }}>{isEdit ? 'Edit Location' : 'Add Location'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              className="form-control"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Headquarters"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              className="form-control"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Short description"
            />
          </div>
          <div className="form-group">
            <label>Coordinates (Lat, Lng)</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="number"
                step="any"
                className="form-control"
                placeholder="Latitude"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
              <input
                type="number"
                step="any"
                className="form-control"
                placeholder="Longitude"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '5px' }}>
              Tip: Click on the map to autofill coordinates
            </small>
          </div>

          <div className="form-group">
            <label>Marker Color</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
              {['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FFCC00'].map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: color === c ? '2px solid white' : 'none',
                    boxShadow: color === c ? '0 0 4px rgba(0,0,0,0.5)' : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Folder / Group</label>
            <div className={`custom-select-wrapper ${isDropdownOpen ? 'open' : ''}`}>
              <div 
                className="custom-select-trigger" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>{currentGroupName}</span>
              </div>
              <div className="custom-options">
                <div 
                  className={`custom-option ${!groupId ? 'selected' : ''}`}
                  onClick={() => { setGroupId(''); setIsDropdownOpen(false); }}
                >
                  Uncategorized
                </div>
                {groups.map(g => (
                  <div
                    key={g.id}
                    className={`custom-option ${groupId === g.id ? 'selected' : ''}`}
                    onClick={() => { setGroupId(g.id); setIsDropdownOpen(false); }}
                  >
                    {g.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Location
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

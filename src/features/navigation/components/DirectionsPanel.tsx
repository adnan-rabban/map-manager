import React, { useState, useEffect } from 'react';
import { useMapStore } from '../../../store/useMapStore.js';
import { notify } from '../../../components/notifications.js';
import type { SearchFeature, Route, Coordinates } from '../../../types/types';

export const DirectionsPanel: React.FC = () => {
  const {
    isNavigationOpen,
    setNavigationOpen,
    startCoords,
    destCoords,
    startPlaceName,
    destPlaceName,
    setStartPoint,
    setDestPoint,
    routes,
    setRoutes,
    clearRoute,
    isRealTimeNavigating,
    setRealTimeNavigating
  } = useMapStore();

  const [startQuery, setStartQuery] = useState(startPlaceName);
  const [destQuery, setDestQuery] = useState(destPlaceName);
  const [startSuggestions, setStartSuggestions] = useState<SearchFeature[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<SearchFeature[]>([]);
  const [activeInput, setActiveInput] = useState<'start' | 'dest' | null>(null);

  // Keep queries in sync with store (e.g. when setting destination from a POI/marker click)
  useEffect(() => {
    setStartQuery(startPlaceName);
  }, [startPlaceName]);

  useEffect(() => {
    setDestQuery(destPlaceName);
  }, [destPlaceName]);

  // Autocomplete Suggestions
  useEffect(() => {
    if (activeInput !== 'start' || startQuery.length < 3) {
      setStartSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const suggestions = await fetchSuggestions(startQuery);
      setStartSuggestions(suggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [startQuery, activeInput]);

  useEffect(() => {
    if (activeInput !== 'dest' || destQuery.length < 3) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const suggestions = await fetchSuggestions(destQuery);
      setDestSuggestions(suggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [destQuery, activeInput]);

  const fetchSuggestions = async (query: string): Promise<SearchFeature[]> => {
    try {
      const MAPTILER_KEY = 'bdQDjDEtrztzKNBE2KZO';
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return data.features || [];
    } catch {
      return [];
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      notify.show('Geolocation is not supported by your browser', 'error');
      return;
    }
    notify.show('Fetching location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        setStartPoint('My Location', coords);
        setStartQuery('My Location');
        notify.show('Location found!', 'success');
      },
      () => {
        notify.show('Failed to retrieve your location', 'error');
      }
    );
  };

  const handleCalculateRoute = async () => {
    if (!startCoords || !destCoords) {
      notify.show('Please specify start and destination', 'warning');
      return;
    }

    notify.show('Calculating route...', 'info');
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&steps=true&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('OSRM request failed');
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        notify.show('No routes found', 'warning');
        return;
      }

      const formattedRoutes: Route[] = data.routes.map((r: any) => ({
        distance: r.distance,
        duration: r.duration,
        geometry: r.geometry,
        legs: r.legs,
        instructions: parseInstructions(r.legs[0])
      }));

      setRoutes(formattedRoutes, 0);
      notify.show('Route found!', 'success');
    } catch (e) {
      console.error(e);
      notify.show('Could not find route', 'error');
    }
  };

  const parseInstructions = (leg: any): any[] => {
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
  };

  const formatDistance = (m: number): string => {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  };

  const formatDuration = (s: number): string => {
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} min`;
  };

  return (
    <>
      <div id="nav-panel" className={`nav-panel ${isNavigationOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <h2>Directions</h2>
          <button
            id="btn-close-nav"
            className="btn-icon"
            onClick={() => setNavigationOpen(false)}
            data-tooltip="Close Navigation"
            aria-label="Close Navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>
          </button>
        </div>

        <div className="nav-inputs">
          <div className="input-wrapper">
            <div className="input-icon start-dot"></div>
            <input
              type="text"
              id="nav-start"
              placeholder="Start Point"
              autoComplete="off"
              value={startQuery}
              onFocus={() => setActiveInput('start')}
              onChange={(e) => setStartQuery(e.target.value)}
            />
            {startQuery && (
              <button
                className="btn-input-clear"
                onClick={() => {
                  setStartQuery('');
                  setStartPoint('', null);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
            <button
              id="btn-my-location"
              className="btn-icon-inside"
              onClick={useMyLocation}
              data-tooltip="Use My Location"
              aria-label="Use My Location"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>

          {/* Start suggestions */}
          {activeInput === 'start' && startSuggestions.length > 0 && (
            <div className="nav-suggestions">
              {startSuggestions.map(f => (
                <div
                  key={f.id}
                  className="suggestion-item"
                  onClick={() => {
                    const [lng, lat] = f.center;
                    setStartPoint(f.place_name, { lng, lat });
                    setStartQuery(f.place_name);
                    setStartSuggestions([]);
                    setActiveInput(null);
                  }}
                >
                  {f.place_name}
                </div>
              ))}
            </div>
          )}

          <div className="connector-line"></div>

          <div className="input-wrapper">
            <div className="input-icon dest-pin"></div>
            <input
              type="text"
              id="nav-dest"
              placeholder="Destination"
              autoComplete="off"
              value={destQuery}
              onFocus={() => setActiveInput('dest')}
              onChange={(e) => setDestQuery(e.target.value)}
            />
            {destQuery && (
              <button
                className="btn-input-clear"
                onClick={() => {
                  setDestQuery('');
                  setDestPoint('', null);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
          </div>

          {/* Dest suggestions */}
          {activeInput === 'dest' && destSuggestions.length > 0 && (
            <div className="nav-suggestions">
              {destSuggestions.map(f => (
                <div
                  key={f.id}
                  className="suggestion-item"
                  onClick={() => {
                    const [lng, lat] = f.center;
                    setDestPoint(f.place_name, { lng, lat });
                    setDestQuery(f.place_name);
                    setDestSuggestions([]);
                    setActiveInput(null);
                  }}
                >
                  {f.place_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          id="btn-start-nav" 
          className="btn btn-primary btn-block"
          onClick={handleCalculateRoute}
          style={{ marginTop: '16px' }}
        >
          Calculate Route
        </button>

        {/* Display routing steps */}
        {routes.length > 0 && routes[0].instructions && (
          <div className="nav-instructions-wrapper" style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
              <div>
                <strong>{formatDistance(routes[0].distance)}</strong>
                <span style={{ color: '#888', marginLeft: '10px' }}>({formatDuration(routes[0].duration)})</span>
              </div>
            </div>
            {routes[0].instructions.map((inst, i) => (
              <div key={i} className="instruction-step" style={{ display: 'flex', gap: '10px', padding: '8px 0', fontSize: '13px' }}>
                <span className="step-icon">🏁</span>
                <div className="step-text" style={{ flex: 1 }}>{inst.text}</div>
                <span className="step-dist" style={{ color: '#999' }}>{formatDistance(inst.distance)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {routes.length > 0 && (
        <button
          id="btn-clear-route"
          className="btn-clear-route visible"
          onClick={() => {
            clearRoute();
            setStartQuery('');
            setDestQuery('');
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>
          Clear Route
        </button>
      )}
    </>
  );
};

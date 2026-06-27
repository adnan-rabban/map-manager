import React from 'react';
import { useMapStore } from '../../store/useMapStore.js';

export const LayerPanel: React.FC = () => {
  const {
    isLayersOpen,
    activeMapStyle,
    setActiveMapStyle
  } = useMapStore();

  if (!isLayersOpen) return null;

  return (
    <div id="layer-panel" className="layer-panel active" style={{ display: 'block' }}>
      <h3>Map Style</h3>
      <div className="layer-grid">
        <div 
          className={`layer-option ${activeMapStyle === 'STREETS' ? 'active' : ''}`} 
          onClick={() => setActiveMapStyle('STREETS')}
        >
          <div className="layer-preview preview-streets"></div>
          <span>Streets</span>
        </div>
        <div 
          className={`layer-option ${activeMapStyle === 'HYBRID' ? 'active' : ''}`} 
          onClick={() => setActiveMapStyle('HYBRID')}
        >
          <div className="layer-preview preview-hybrid"></div>
          <span>Satellite Hybrid</span>
        </div>
      </div>
    </div>
  );
};

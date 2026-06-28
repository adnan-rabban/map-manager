import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMapStore } from '../../../store/useMapStore.js';
import { LocationList } from './LocationList.js';
import { notify } from '../../../components/notifications.js';
import type { SearchFeature, AssetStatus, AssetCategory } from '../../../types/types';
import { BarChart3, Layers, MapPin, Trash2, Shield } from 'lucide-react';

type SidebarTab = 'assets' | 'analytics' | 'geofences';

// ── SVG Donut Chart Component ──
const DonutChart = ({ data, size = 120 }: { data: { label: string; value: number; color: string }[]; size?: number }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ margin: '0 auto', display: 'block' }}>
      {data.map((d, i) => {
        const pct = d.value / total;
        const dashLen = pct * circumference;
        const dashOffset = -offset;
        offset += dashLen;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={14}
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700" fontFamily="var(--font-family)">
        {total}
      </text>
      <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="500" fontFamily="var(--font-family)" style={{ textTransform: 'uppercase' }}>
        TOTAL ASSETS
      </text>
    </svg>
  );
};

// ── Bar Row Component ──
const BarRow = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', padding: '3px 0' }}>
    <span style={{ width: '70px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 500, fontSize: '10px' }}>{label}</span>
    <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
    </div>
    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', minWidth: '16px', textAlign: 'right' }}>{value}</span>
  </div>
);

export const Sidebar: React.FC = () => {
  const {
    locations,
    groups,
    geofences,
    selectedLocation,
    isSidebarOpen,
    setSidebarOpen,
    addGroup,
    importData,
    setSelectedLocation,
    setAddModalOpen,
    activeMapStyle,
    currentUser,
    filterStatus,
    filterCategory,
    setFilterStatus,
    setFilterCategory,
    deleteGeofence
  } = useMapStore();

  const [activeTab, setActiveTab] = useState<SidebarTab>('assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchFeature[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filtered locations ──
  const filteredLocations = useMemo(() => {
    let result = locations;
    if (filterStatus !== 'all') {
      result = result.filter(l => l.status === filterStatus);
    }
    if (filterCategory !== 'all') {
      result = result.filter(l => l.category === filterCategory);
    }
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(q) || (l.desc && l.desc.toLowerCase().includes(q)));
    }
    return result;
  }, [locations, filterStatus, filterCategory, localSearch]);

  // ── Analytics data ──
  const analytics = useMemo(() => {
    const byStatus = {
      active: locations.filter(l => l.status === 'active').length,
      maintenance: locations.filter(l => l.status === 'maintenance').length,
      critical: locations.filter(l => l.status === 'critical').length,
      offline: locations.filter(l => l.status === 'offline').length,
    };
    const byCategory = {
      warehouse: locations.filter(l => l.category === 'warehouse').length,
      vehicle: locations.filter(l => l.category === 'vehicle').length,
      sensor: locations.filter(l => l.category === 'sensor').length,
      hub: locations.filter(l => l.category === 'hub').length,
    };
    const activeRatio = locations.length > 0 ? Math.round((byStatus.active / locations.length) * 100) : 0;
    return { byStatus, byCategory, activeRatio, total: locations.length };
  }, [locations]);

  // Search places using MapTiler Geocoding API
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchLoading(true);
      try {
        const MAPTILER_KEY = 'bdQDjDEtrztzKNBE2KZO';
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(searchQuery)}.json?key=${MAPTILER_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data.features || []);
      } catch (e) {
        console.error(e);
        notify.show('Search failed', 'error');
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Import JSON/CSV handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          let data;
          if (result.trim().startsWith('[') || result.trim().startsWith('{')) {
            data = JSON.parse(result);
          } else {
            data = csvToJson(result);
          }

          // Create a new folder named after the file
          const folderName = file.name.replace(/\.[^/.]+$/, "");
          const newFolder = addGroup(folderName);

          if (importData(data, newFolder.id)) {
            notify.show(`Successfully imported locations to folder "${folderName}"`, 'success');
          } else {
            notify.show('No valid locations found in file', 'warning');
          }
        }
      } catch (err) {
        console.error(err);
        notify.show('Failed to parse file. Check format.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const csvToJson = (csv: string): any[] => {
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const firstLine = lines[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"\\r]+/g, ''));
    const hasHeader = headers.includes('lat') && headers.includes('lng');
    const dataRows = hasHeader ? lines.slice(1) : lines;
    
    return dataRows.map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      if (hasHeader) {
        const obj: any = {};
        headers.forEach((h, i) => {
          if (values[i] !== undefined) {
            obj[h] = values[i];
          }
        });
        return obj;
      } else {
        return {
          name: values[0],
          lat: values[1],
          lng: values[2],
          desc: values[3] || ''
        };
      }
    });
  };

  // Export JSON handler for all locations
  const handleExportAll = () => {
    const allLocations = useMapStore.getState().locations;
    if (allLocations.length === 0) {
      notify.show('No locations to export', 'warning');
      return;
    }
    const data = JSON.stringify(allLocations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-locations-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.show('All locations exported successfully', 'success');
  };

  // Add folder modal
  const handleNewFolder = () => {
    const name = prompt('Enter folder name:');
    if (name && name.trim()) {
      addGroup(name.trim());
      notify.show('Folder created successfully', 'success');
    }
  };

  // ── Render Tab Content ──
  const renderAssetsTab = () => (
    <>
      {/* Filter Bar */}
      <div className="filter-bar">
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AssetStatus | 'all')}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="critical">Critical</option>
          <option value="offline">Offline</option>
        </select>
        <select
          className="filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as AssetCategory | 'all')}
        >
          <option value="all">All Types</option>
          <option value="warehouse">Warehouse</option>
          <option value="vehicle">Vehicle</option>
          <option value="sensor">Sensor</option>
          <option value="hub">Hub</option>
        </select>
      </div>

      {/* Local Search */}
      <div style={{ padding: '0 16px 6px' }}>
        <input
          type="text"
          placeholder="Filter assets by name..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--card-border)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Asset count summary */}
      <div style={{ padding: '0 16px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="section-header" style={{ flex: 1, padding: '0' }}>
          Assets <span className="count-badge">{filteredLocations.length}</span>
        </span>
      </div>

      <div className="panel-actions">
        <button
          id="btn-export"
          className="btn btn-secondary btn-sm"
          onClick={handleExportAll}
          data-tooltip="Export Data"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Export
        </button>

        {currentUser?.role === 'admin' && (
          <>
            <button
              id="btn-import"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              data-tooltip="Import Data"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Import
            </button>
            <input
              type="file"
              id="file-import"
              accept=".json,.csv"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleImportFile}
            />

            <button 
              id="btn-add-group" 
              onClick={handleNewFolder}
              data-tooltip="New Folder"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
            </button>
          </>
        )}
      </div>

      <div className="panel-content">
        <div id="location-list" className="location-list">
          {filteredLocations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
              {locations.length === 0 ? 'No assets registered. Click + to add.' : 'No assets match current filters.'}
            </div>
          ) : (
            <LocationList
              groups={groups}
              locations={filteredLocations}
              onFlyTo={(id) => {
                const loc = locations.find(l => l.id === id);
                if (loc) {
                  setSelectedLocation(loc);
                }
              }}
              onEdit={(id) => useMapStore.getState().setEditModalId(id)}
              onDelete={(id) => {
                const loc = locations.find(l => l.id === id);
                if (loc && confirm(`Are you sure you want to delete ${loc.name}?`)) {
                  useMapStore.getState().deleteLocation(id);
                  notify.show('Asset removed', 'success');
                }
              }}
              onToggleVisibility={(id) => {
                const loc = locations.find(l => l.id === id);
                if (loc) {
                  useMapStore.getState().updateLocation(id, { hidden: !loc.hidden });
                  notify.show(loc.hidden ? 'Asset visible' : 'Asset hidden', 'info');
                }
              }}
              onDeleteGroup={(group) => {
                if (confirm(`Delete folder "${group.name}"? All assets inside will be removed.`)) {
                  useMapStore.getState().deleteGroup(group.id);
                  notify.show('Folder deleted', 'success');
                }
              }}
              onRenameGroup={(group) => {
                const name = prompt('Rename folder to:', group.name);
                if (name && name.trim()) {
                  useMapStore.getState().updateGroup(group.id, name.trim());
                  notify.show('Folder renamed', 'success');
                }
              }}
              onExportGroup={async (group) => {
                const groupLocations = locations.filter(l => l.groupId === group.id);
                if (groupLocations.length === 0) {
                  notify.show('Folder is empty', 'warning');
                  return;
                }
                const format = prompt('Export format (json, csv, xlsx):', 'json');
                if (!format) return;
                
                if (format === 'json') {
                  const data = JSON.stringify(groupLocations, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `folder-${group.name}-${new Date().toISOString().slice(0, 10)}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  notify.show('Folder exported as JSON', 'success');
                } else if (format === 'csv' || format === 'xlsx') {
                  try {
                    const XLSX = await import('xlsx');
                    const flatData = groupLocations.map(loc => ({
                      Name: loc.name,
                      Description: loc.desc || '',
                      Latitude: loc.lat,
                      Longitude: loc.lng,
                      Status: loc.status || '',
                      Category: loc.category || '',
                    }));
                    const worksheet = XLSX.utils.json_to_sheet(flatData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Locations");
                    if (format === 'csv') {
                      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
                      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `folder-${group.name}.csv`;
                      a.click();
                    } else {
                      XLSX.writeFile(workbook, `folder-${group.name}.xlsx`);
                    }
                    notify.show(`Folder exported as ${format.toUpperCase()}`, 'success');
                  } catch (e) {
                    console.error(e);
                    notify.show('Failed to export folder', 'error');
                  }
                }
              }}
              onAssignLocationToGroup={(loc, gId) => {
                useMapStore.getState().assignLocationToGroup(loc.id, gId);
              }}
              selectedLocationId={selectedLocation?.id}
            />
          )}
        </div>
      </div>
    </>
  );

  const renderAnalyticsTab = () => (
    <div className="panel-content" style={{ padding: '12px 16px' }}>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Assets</span>
          <span className="kpi-value">{analytics.total}</span>
          <span className="kpi-subtext">{geofences.length} geofences defined</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active Ratio</span>
          <span className="kpi-value" style={{ color: analytics.activeRatio >= 70 ? 'var(--status-active)' : analytics.activeRatio >= 40 ? 'var(--status-maintenance)' : 'var(--status-critical)' }}>
            {analytics.activeRatio}%
          </span>
          <span className="kpi-subtext">{analytics.byStatus.active} of {analytics.total} online</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Alerts</span>
          <span className="kpi-value" style={{ color: analytics.byStatus.critical > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
            {analytics.byStatus.critical + analytics.byStatus.maintenance}
          </span>
          <span className="kpi-subtext">{analytics.byStatus.critical} critical, {analytics.byStatus.maintenance} maint.</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Offline</span>
          <span className="kpi-value" style={{ color: 'var(--status-offline)' }}>{analytics.byStatus.offline}</span>
          <span className="kpi-subtext">Disconnected assets</span>
        </div>
      </div>

      {/* Donut Chart - Status */}
      <div className="chart-container">
        <div className="chart-title">Status Distribution</div>
        <DonutChart data={[
          { label: 'Active', value: analytics.byStatus.active, color: 'var(--status-active)' },
          { label: 'Maintenance', value: analytics.byStatus.maintenance, color: 'var(--status-maintenance)' },
          { label: 'Critical', value: analytics.byStatus.critical, color: 'var(--status-critical)' },
          { label: 'Offline', value: analytics.byStatus.offline, color: 'var(--status-offline)' },
        ]} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
          {[
            { label: 'Active', color: 'var(--status-active)', count: analytics.byStatus.active },
            { label: 'Maint.', color: 'var(--status-maintenance)', count: analytics.byStatus.maintenance },
            { label: 'Critical', color: 'var(--status-critical)', count: analytics.byStatus.critical },
            { label: 'Offline', color: 'var(--status-offline)', count: analytics.byStatus.offline },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color }} />
              {s.label} ({s.count})
            </div>
          ))}
        </div>
      </div>

      {/* Bar Chart - Category */}
      <div className="chart-container">
        <div className="chart-title">Category Breakdown</div>
        <BarRow label="Warehouse" value={analytics.byCategory.warehouse} max={analytics.total} color="var(--category-warehouse)" />
        <BarRow label="Vehicle" value={analytics.byCategory.vehicle} max={analytics.total} color="var(--category-vehicle)" />
        <BarRow label="Sensor" value={analytics.byCategory.sensor} max={analytics.total} color="var(--category-sensor)" />
        <BarRow label="Hub" value={analytics.byCategory.hub} max={analytics.total} color="var(--category-hub)" />
      </div>
    </div>
  );

  const renderGeofencesTab = () => (
    <div className="panel-content" style={{ padding: '12px 16px' }}>
      <div className="section-header">
        Geofence Zones <span className="count-badge">{geofences.length}</span>
      </div>
      
      {geofences.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
          No geofences defined yet.
        </div>
      ) : (
        geofences.map(geo => (
          <div key={geo.id} className="geofence-item">
            <div className="geofence-info">
              <div className="geofence-color-dot" style={{ background: geo.color || '#3b82f6' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{geo.name}</div>
                <div className="geofence-meta">
                  {geo.type === 'polygon' ? 'Polygon' : 'Circle'} 
                  {geo.areaSize ? ` · ${(geo.areaSize / 1000).toFixed(1)}k m²` : ''}
                  {geo.radius ? ` · ${geo.radius}m radius` : ''}
                </div>
              </div>
            </div>
            {currentUser?.role === 'admin' && (
              <button
                className="btn-icon-sm"
                onClick={() => {
                  if (confirm(`Delete geofence "${geo.name}"?`)) {
                    deleteGeofence(geo.id);
                    notify.show('Geofence deleted', 'success');
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))
      )}

      {/* Geofence info panel */}
      <div className="chart-container" style={{ marginTop: '12px' }}>
        <div className="chart-title">Geofencing Info</div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          Geofence zones define virtual boundaries on the map. Assets entering or leaving a zone can trigger status alerts. Use the map drawing tools to create new zones.
        </p>
      </div>
    </div>
  );

  return (
    <div id="sidebar-panel" className={`panel ${isSidebarOpen ? '' : 'collapsed'}`}>
      <div className="panel-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>Asset Control</h1>
          </div>
          <div id="search-container" className="search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                id="search-input"
                placeholder="Search places globally..."
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  id="btn-clear-search"
                  className="btn-input-clear"
                  onClick={() => setSearchQuery('')}
                  data-tooltip="Clear Search"
                  aria-label="Clear Search"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
            </div>
            <button
              id="btn-trigger-search"
              className="btn-input-search"
              data-tooltip="Search"
              aria-label="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>

            {searchResults.length > 0 && (
              <div id="search-results" className="search-results">
                {searchResults.map((f) => {
                  const parts = f.place_name.split(',');
                  const mainText = parts[0];
                  const subText = parts.slice(1).join(',').trim();
                  const badgeHtml = f.category ? <span className="ios-badge">{f.category}</span> : null;

                  return (
                    <div
                      key={f.id}
                      className="search-result-item"
                      onClick={() => {
                        const [lng, lat] = f.center;
                        setSelectedLocation({
                          id: f.id,
                          name: mainText,
                          desc: subText,
                          lng,
                          lat
                        });
                        setSearchQuery('');
                      }}
                    >
                      <div className="result-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      </div>
                      <div className="result-text">
                        <div className="result-main">{mainText} {badgeHtml}</div>
                        <div className="result-sub">{subText || ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <button
          id="btn-close-sidebar"
          className="panel-close-btn"
          onClick={() => setSidebarOpen(false)}
          data-tooltip="Close Sidebar"
          aria-label="Close Sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="sidebar-tabs">
        <button className={`sidebar-tab ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>
          <MapPin size={14} />
          Assets
        </button>
        <button className={`sidebar-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <BarChart3 size={14} />
          Analytics
        </button>
        <button className={`sidebar-tab ${activeTab === 'geofences' ? 'active' : ''}`} onClick={() => setActiveTab('geofences')}>
          <Shield size={14} />
          Zones
        </button>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'assets' && renderAssetsTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
      {activeTab === 'geofences' && renderGeofencesTab()}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useMapStore } from '../../../store/useMapStore.js';
import { LocationList } from './LocationList.js';
import { notify } from '../../../components/notifications.js';
import type { SearchFeature } from '../../../types/types';

export const Sidebar: React.FC = () => {
  const {
    locations,
    groups,
    selectedLocation,
    isSidebarOpen,
    setSidebarOpen,
    addGroup,
    importData,
    setSelectedLocation,
    setAddModalOpen,
    activeMapStyle
  } = useMapStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchFeature[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"\r]+/g, ''));
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

  return (
    <div id="sidebar-panel" className={`panel ${isSidebarOpen ? '' : 'collapsed'}`}>
      <div className="panel-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>Locations</h1>
          </div>
          <div id="search-container" className="search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                id="search-input"
                placeholder="Search places..."
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

      <div className="panel-actions">
        <button
          id="btn-export"
          className="btn btn-secondary btn-sm"
          onClick={handleExportAll}
          data-tooltip="Export Data"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Export All
        </button>
        <button
          id="btn-import"
          className="btn btn-secondary btn-sm"
          onClick={() => fileInputRef.current?.click()}
          data-tooltip="Import Data"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
        </button>
      </div>

      <div className="panel-content">
        <div id="location-list" className="location-list">
          {locations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
              No locations yet. Click the + button.
            </div>
          ) : (
            <LocationList
              groups={groups}
              locations={locations}
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
                  notify.show('Location deleted', 'success');
                }
              }}
              onToggleVisibility={(id) => {
                const loc = locations.find(l => l.id === id);
                if (loc) {
                  useMapStore.getState().updateLocation(id, { hidden: !loc.hidden });
                  notify.show(loc.hidden ? 'Location visible' : 'Location hidden', 'info');
                }
              }}
              onDeleteGroup={(group) => {
                if (confirm(`Are you sure you want to delete folder "${group.name}"? All locations inside will be deleted.`)) {
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
    </div>
  );
};

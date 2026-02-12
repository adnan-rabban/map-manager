import { Store } from './store/store.js';
import { MapEngine } from './core/map.js';
import { Navigation } from './components/navigation.js';
import { notify } from './components/notifications.js';
import { CustomTooltip } from './components/tooltip.js';
import { LayerSwitcher } from './core/layers.js';
import type { Location, Group, POI, LngLat, SearchFeature } from './types/types';

// React Imports
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App as ReactApp } from './components/react/App.js';

class App {
    private store: Store;
    private map: MapEngine;
    private nav: Navigation;
    private layers: LayerSwitcher;
    private tooltip: CustomTooltip;
    private reactRoot: Root | null = null;
    private selectedLocation: Location | null = null;
    
    constructor() {
        this.store = new Store();
        this.map = new MapEngine('map-container');
        this.nav = new Navigation(this.map);
        this.layers = new LayerSwitcher(this.map);
        this.tooltip = new CustomTooltip();

        this.initUI();
    }

    private initUI(): void {
        // Initialize React Root
        const listContainer = document.getElementById('location-list');
        if (listContainer) {
            this.reactRoot = createRoot(listContainer);
        }

        this.renderList();
        this.setupModal();
        this.setupSidebar();
        this.setupDataManagement();
        this.setupSearch();
        this.setupSettings();
        this.setupScrollbarBehavior();
        
        // POI Click Handler
        this.map.onPOIClick((poi: POI) => {
            const popupHtml = `
                <div class="poi-popup">
                    <div class="poi-header">
                        <h3>${poi.name}</h3>
                        <div class="poi-subtitle">${poi.category}</div>
                    </div>
                    <div class="poi-divider"></div>
                    <div class="poi-body">
                        <div class="poi-coords">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                            ${poi.lngLat.lat.toFixed(6)}, ${poi.lngLat.lng.toFixed(6)}
                        </div>
                        <div class="poi-actions">
                            <button class="btn-ios-primary" id="btn-poi-nav-${poi.id}">Navigate</button>
                            <button class="btn-ios-secondary" id="btn-poi-save-${poi.id}">Save</button>
                        </div>
                    </div>
                </div>
            `;
            this.map.showPopup(poi.lngLat, popupHtml);
            
            setTimeout(() => {
                const btnNav = document.getElementById(`btn-poi-nav-${poi.id}`);
                const btnSave = document.getElementById(`btn-poi-save-${poi.id}`);
                
                if (btnNav) {
                    btnNav.addEventListener('click', () => {
                        this.nav.setDestination({ 
                            id: poi.id.toString(), 
                            name: poi.name, 
                            lng: poi.lngLat.lng, 
                            lat: poi.lngLat.lat 
                        });
                        if (this.map.currentPopup) this.map.currentPopup.remove();
                    });
                }
                
                if (btnSave) {
                    btnSave.addEventListener('click', () => {
                        this.showLocationModal('add', {
                            id: '', // Dummy
                            name: poi.name,
                            desc: poi.category,
                            lat: poi.lngLat.lat,
                            lng: poi.lngLat.lng
                        });
                        
                        if (this.map.currentPopup) this.map.currentPopup.remove();
                    });
                }
            }, 50);
        });

        // Load markers when map loads
        setTimeout(() => {
            this.store.getAll().forEach(loc => {
                if (!loc.hidden) {
                    this.map.addMarker(
                        loc.id,
                        { lng: loc.lng, lat: loc.lat },
                        { 
                            onClick: () => this.onMarkerClick(loc),
                            color: loc.color
                        }
                    );
                }
            });
        }, 1000);

        // Map click for form filling
        this.map.onClick(async (lngLat: LngLat) => {
            const modal = document.getElementById('modal-overlay'); // Ensure consistent ID usage
            // OR document.getElementById('location-modal') as used in showLocationModal
            // Check if ANY modal is open
            const openModal =document.querySelector('.modal-overlay.open');
            
            if (openModal && openModal.id === 'location-modal') {
                const lngInput = document.getElementById('modal-lng') as HTMLInputElement;
                const latInput = document.getElementById('modal-lat') as HTMLInputElement;
                
                if (lngInput) lngInput.value = lngLat.lng.toFixed(6);
                if (latInput) latInput.value = lngLat.lat.toFixed(6);
                
                notify.show('Fetching address...', 'info');
                const feature = await this.map.reverseGeocode(lngLat.lng, lngLat.lat);
                if (feature) {
                    const nameInput = document.getElementById('modal-name') as HTMLInputElement;
                    const descInput = document.getElementById('modal-desc') as HTMLInputElement;
                    
                    if (nameInput) nameInput.value = feature.place_name || feature.text;
                    const context = feature.context ? feature.context.map(c => c.text).join(', ') : '';
                    if (descInput) descInput.value = context;
                    notify.show('Address found!', 'success');
                }
                return;
            }
        });
    }

    // --- React Integration ---
    private renderList(): void {
        if (!this.reactRoot) return;

        const groups = this.store.getGroups();
        const locations = this.store.getAll();

        this.reactRoot.render(
            <ReactApp 
                initialGroups={groups}
                initialLocations={locations}
                onAssignLocationToGroup={(location, groupId) => {
                    this.store.assignLocationToGroup(location.id, groupId);
                    this.renderList(); // Re-render to update UI
                }}
                onFlyTo={(id) => {
                    const loc = this.store.getAll().find(l => l.id === id);
                    if (loc) {
                        this.map.flyTo({ lng: loc.lng, lat: loc.lat });
                        notify.show(`Viewing ${loc.name}`, 'info');
                    }
                }}
                onEdit={(id, updates) => {
                    if (updates) {
                        // Direct update (e.g. color change)
                        this.store.update(id, updates);
                        const updatedLoc = this.store.getAll().find(l => l.id === id);
                        if (updatedLoc) {
                            this.map.addMarker(
                                updatedLoc.id,
                                { lng: updatedLoc.lng, lat: updatedLoc.lat },
                                { 
                                    onClick: () => this.onMarkerClick(updatedLoc),
                                    color: updatedLoc.color 
                                }
                            );
                            this.renderList();
                        }
                    } else {
                        // Open Edit Modal
                        this.editLocation(id);
                    }
                }}
                onDelete={(id) => {
                    const loc = this.store.getAll().find(l => l.id === id);
                    if (loc) {
                         const content = document.createElement('div');
                         content.style.marginTop = '16px';
                         content.innerHTML = `
                            <p class="modal-desc">Are you sure you want to delete <strong>${loc.name}</strong>? This action cannot be undone.</p>
                         `;
                         
                         this.createModal('Delete Location', content, () => {
                             this.deleteLocation(loc.id);
                             // notification handled in deleteLocation
                         }, 'Delete', true);
                    }
                }}
                onToggleVisibility={(id) => {
                    this.toggleVisibility(id);
                }}
                onDeleteGroup={(group) => {
                    this.showDeleteGroupModal(group);
                }}
                onRenameGroup={(group) => {
                    this.showRenameGroupModal(group);
                }}
            />
        );
    }

    private setupDataManagement(): void {
        const btnExport = document.getElementById('btn-export');
        const btnImport = document.getElementById('btn-import');
        const fileImport = document.getElementById('file-import') as HTMLInputElement;
        
        // Export/Import
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const data = JSON.stringify(this.store.getAll(), null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `locations-${new Date().toISOString().slice(0,10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                notify.show('Data exported successfully', 'success');
            });
        }

        if (btnImport && fileImport) {
            btnImport.addEventListener('click', () => {
                fileImport.click();
            });

            fileImport.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event: ProgressEvent<FileReader>) => {
                    try {
                        const result = event.target?.result;
                        if (typeof result === 'string') {
                            let data;
                            if (result.trim().startsWith('[') || result.trim().startsWith('{')) {
                                data = JSON.parse(result);
                            } else {
                                data = this.csvToJson(result);
                            }

                            let tempGroupId: string | undefined;
                            if (file && file.name) {
                                const groupName = file.name.replace(/\.[^/.]+$/, ""); 
                                const newGroup = this.store.addGroup(groupName);
                                tempGroupId = newGroup.id;
                            }

                            if (this.store.importData(data, tempGroupId)) {
                                this.renderList();
                                this.store.getAll().forEach(loc => {
                                    this.map.addMarker(
                                        loc.id,
                                        { lng: loc.lng, lat: loc.lat },
                                        { onClick: () => this.onMarkerClick(loc) }
                                    );
                                });
                                notify.show(`Successfully imported locations`, 'success');
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
                fileImport.value = ''; 
            });
        }
    }

    private createModal(title: string, contentUi: HTMLElement, onSave: () => void, saveText: string = 'Save', isDestructive: boolean = false): void {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay open';
        // Give generic modals an ID if needed, or rely on class logic
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal';
        
        const header = document.createElement('h3');
        header.className = 'modal-title';
        header.textContent = title;
        
        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        
        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn-cancel';
        btnCancel.textContent = 'Cancel';
        btnCancel.addEventListener('click', () => modal.remove());
        
        const btnSave = document.createElement('button');
        btnSave.className = 'btn-save';
        btnSave.textContent = saveText;
        
        if (isDestructive) {
            btnSave.style.backgroundColor = '#FF3B30'; // Red for destructive
            btnSave.style.color = 'white';
        }
        
        const closeModal = () => {
            modal.classList.add('closing');
            modal.addEventListener('animationend', () => {
                modal.remove();
            }, { once: true });
        };

        btnCancel.addEventListener('click', closeModal);
        
        btnSave.addEventListener('click', () => {
            onSave();
            closeModal();
        });
        
        actions.appendChild(btnCancel);
        actions.appendChild(btnSave);
        
        modalContent.appendChild(header);
        modalContent.appendChild(contentUi);
        modalContent.appendChild(actions);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        // Focus first input if exists
        const input = contentUi.querySelector('input');
        if (input) input.focus();
    }
    
    private showRenameGroupModal(group: Group): void {
        const content = document.createElement('div');
        content.style.marginTop = '16px';
        content.innerHTML = `
            <div class="form-group">
                <label>Folder Name</label>
                <input type="text" class="form-control" value="${group.name}" id="rename-group-input">
            </div>
        `;
        
        this.createModal('Rename Folder', content, () => {
            const input = content.querySelector('#rename-group-input') as HTMLInputElement;
            if (input && input.value.trim()) {
                this.store.updateGroup(group.id, input.value.trim());
                this.renderList();
            }
        }, 'Save');
    }

    private showAddGroupModal(): void {
        const content = document.createElement('div');
        content.style.marginTop = '16px';
        content.innerHTML = `
            <div class="form-group">
                <label>Folder Name</label>
                <input type="text" class="form-control" id="new-group-name" placeholder="e.g. Vacation Spots" autocomplete="off">
            </div>
        `;
        
        this.createModal('New Folder', content, () => {
            const input = content.querySelector('#new-group-name') as HTMLInputElement;
            const name = input ? input.value.trim() : '';
            
            if (name) {
                this.store.addGroup(name);
                this.renderList();
                notify.show('Folder created successfully', 'success');
            }
        }, 'Create Folder'); 
        
        setTimeout(() => {
            const input = content.querySelector('input');
            if (input) input.focus();
        }, 100);
    }

    private showDeleteGroupModal(group: Group): void {
        const content = document.createElement('div');
        content.style.marginTop = '16px';
        content.innerHTML = `
            <p class="modal-desc">Are you sure you want to delete folder <strong>${group.name}</strong>? All locations inside will be <strong>permanently deleted</strong>.</p>
        `;
        
            this.createModal('Delete Folder', content, () => {
                const locationsToRemove = this.store.getAll().filter(l => l.groupId === group.id);
                
                locationsToRemove.forEach(loc => {
                    this.map.removeMarker(loc.id);
                });

                this.store.deleteGroup(group.id);
                
                this.renderList();
                notify.show('Folder deleted', 'success');
            }, 'Delete', true);
    }
    
    private showLocationModal(mode: 'add'|'edit', location?: Location): void {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay open';
        modal.id = 'location-modal';
        
        const groups = this.store.getGroups();
        
        let selectedGroupId = location?.groupId || '';
        const initialGroupName = selectedGroupId 
            ? groups.find(g => g.id === selectedGroupId)?.name 
            : 'Uncategorized';

        const optionsHtml = [
            `<div class="custom-option ${selectedGroupId === '' ? 'selected' : ''}" data-value="">Uncategorized</div>`,
            ...groups.map(g => 
                `<div class="custom-option ${g.id === selectedGroupId ? 'selected' : ''}" data-value="${g.id}">${g.name}</div>`
            )
        ].join('');

        modal.innerHTML = `
            <div class="modal">
                <h3 class="modal-title">${mode === 'add' ? 'Add Location' : 'Edit Location'}</h3>
                <div class="form-group" style="margin-top:20px;">
                    <label>Name</label>
                    <input type="text" id="modal-name" class="form-control" value="${location?.name || ''}" placeholder="Location Name">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="modal-desc" class="form-control" value="${location?.desc || ''}" placeholder="Description (optional)">
                </div>
                
                <div class="form-group">
                   <label>Coordinates (Lat, Lng)</label>
                   <div class="input-row">
                       <div class="input-group">
                           <input type="number" id="modal-lat" class="form-control" value="${location?.lat || ''}" step="any" placeholder="Latitude">
                       </div>
                       <div class="input-group">
                           <input type="number" id="modal-lng" class="form-control" value="${location?.lng || ''}" step="any" placeholder="Longitude">
                       </div>
                   </div>
                </div>

                <div class="form-group">
                    <label>Folder / Group</label>
                    <div class="custom-select-wrapper" id="modal-group-wrapper">
                        <div class="custom-select-trigger" id="modal-group-trigger">
                            <span>${initialGroupName}</span>
                        </div>
                        <div class="custom-options">
                            ${optionsHtml}
                        </div>
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="btn-cancel" id="btn-modal-cancel">Cancel</button>
                    <button class="btn-save" id="btn-modal-save">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const btnCancel = modal.querySelector('#btn-modal-cancel');
        const btnSave = modal.querySelector('#btn-modal-save');
        const nameInput = modal.querySelector('#modal-name') as HTMLInputElement;
        const latInput = modal.querySelector('#modal-lat') as HTMLInputElement;
        const lngInput = modal.querySelector('#modal-lng') as HTMLInputElement;
        
        const dropdownWrapper = modal.querySelector('#modal-group-wrapper') as HTMLElement;
        const dropdownTrigger = modal.querySelector('#modal-group-trigger') as HTMLElement;
        const dropdownOptions = modal.querySelector('.custom-options') as HTMLElement;
        const triggerSpan = dropdownTrigger.querySelector('span') as HTMLElement;

        nameInput.focus();

        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownWrapper.classList.toggle('open');
        });

        dropdownOptions.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownOptions.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                selectedGroupId = (option as HTMLElement).dataset.value || '';
                triggerSpan.textContent = option.textContent;
                
                dropdownWrapper.classList.remove('open');
            });
        });

        const closeDropdown = (e: Event) => {
            if (!dropdownWrapper.contains(e.target as Node)) {
                dropdownWrapper.classList.remove('open');
            }
        };
        document.addEventListener('click', closeDropdown);


        const cleanup = () => {
            document.removeEventListener('click', closeDropdown);
            modal.classList.add('closing');
            modal.addEventListener('animationend', () => {
                modal.remove();
            }, { once: true });
        };

        btnCancel?.addEventListener('click', cleanup);

        btnSave?.addEventListener('click', () => {
            const name = nameInput.value;
            const desc = (modal.querySelector('#modal-desc') as HTMLInputElement).value;
            
            if (!name) {
                notify.show('Name is required', 'error');
                return;
            }

            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);
            
            if (isNaN(lat) || isNaN(lng)) {
                    notify.show('Invalid coordinates', 'error');
                    return;
            }

            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                 notify.show('Coordinates out of range', 'error');
                 return;
            }

            if (mode === 'add') {
                this.store.add({
                    name,
                    desc,
                    lat,
                    lng,
                    groupId: selectedGroupId || undefined
                });
                
                const newLoc = this.store.getAll().slice(-1)[0]; 
                 this.map.addMarker(
                        newLoc.id, 
                        { lng: newLoc.lng, lat: newLoc.lat }, 
                        { 
                            onClick: () => this.onMarkerClick(newLoc),
                            color: newLoc.color
                        }
                    );
                 notify.show('Location saved successfully', 'success');

            } else if (mode === 'edit' && location) {
                 this.store.update(location.id, {
                     name,
                     desc,
                     lat,
                     lng,
                     groupId: selectedGroupId || undefined 
                 });

                 this.map.addMarker(
                    location.id,
                    { lng, lat },
                    { 
                        onClick: () => this.onMarkerClick({ ...location, lat, lng, name, desc }),
                        color: location.color
                    }
                 );

                 notify.show('Location updated successfully', 'success');
            }

            this.renderList();
            cleanup();
        });
    }

    private csvToJson(csv: string): any[] {
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
    }

    private setupSearch(): void {
        const input = document.getElementById('search-input') as HTMLInputElement;
        const resultsContainer = document.getElementById('search-results');
        const clearBtn = document.getElementById('btn-clear-search');
        
        let debounceTimer: number;

        const toggleClear = (): void => {
            if (!clearBtn) return;
            if (input.value.length > 0) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        };

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                toggleClear();
                resultsContainer?.classList.add('hidden');
                input.focus();
            });
        }

        const btnSearch = document.getElementById('btn-trigger-search');
        if (btnSearch) {
            btnSearch.addEventListener('click', async () => {
                const query = input.value;
                if (query.length < 3) return;
                
                const results = await this.map.searchPlaces(query);
                this.renderSearchResults(results);
                input.focus();
            });
        }

        input?.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const query = target.value;
            toggleClear();
            clearTimeout(debounceTimer);

            if (query.length < 3) {
                resultsContainer?.classList.add('hidden');
                return;
            }

            debounceTimer = window.setTimeout(async () => {
                const results = await this.map.searchPlaces(query);
                this.renderSearchResults(results);
            }, 300);
        });
    }

    private setupSettings(): void {
        const btnSettings = document.getElementById('btn-settings');
        const settingsMenu = document.getElementById('settings-menu');
        const toggleDarkMode = document.getElementById('dark-mode-toggle') as HTMLInputElement;
        
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark';

        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (toggleDarkMode) toggleDarkMode.checked = true;
        }

        this.map.onReady(() => {
             this.map.syncWithDarkMode(isDark);
        });

        if (btnSettings && settingsMenu) {
            btnSettings.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                
                settingsMenu.classList.toggle('active');
                if (settingsMenu.classList.contains('active')) {
                    settingsMenu.classList.remove('hidden');
                }

                btnSettings.classList.toggle('active');
            });

            document.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                if (!settingsMenu.contains(target) && !btnSettings.contains(target)) {
                    if (settingsMenu.classList.contains('active')) {
                         settingsMenu.classList.remove('active');
                         btnSettings.classList.remove('active');
                    }
                }
            });
        }

        if (toggleDarkMode) {
            toggleDarkMode.addEventListener('change', () => {
                const isDark = toggleDarkMode.checked;
                
                if (isDark) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                    localStorage.setItem('theme', 'light');
                }
                
                this.map.syncWithDarkMode(isDark);
            });
        }
    }

    private renderSearchResults(features: SearchFeature[]): void {
        const container = document.getElementById('search-results');
        if (!container) return;

        if (features.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = features.map(f => {
            const parts = f.place_name.split(',');
            const mainText = parts[0];
            const subText = parts.slice(1).join(',').trim();
            const badgeHtml = f.category ? `<span class="ios-badge">${f.category}</span>` : '';
            
            return `
            <div class="search-result-item" data-lng="${f.center[0]}" data-lat="${f.center[1]}">
                <div class="result-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div class="result-text">
                    <div class="result-main">${mainText} ${badgeHtml}</div>
                    <div class="result-sub">${subText || ''}</div>
                </div>
            </div>
            `;
        }).join('');

        container.classList.remove('hidden');

        const items = container.querySelectorAll('.search-result-item');
        items.forEach((item) => {
            item.addEventListener('click', () => {
                const lng = parseFloat((item as HTMLElement).dataset.lng || '0');
                const lat = parseFloat((item as HTMLElement).dataset.lat || '0');
                
                this.map.flyTo({ lng, lat });
                container.classList.add('hidden');
                
                const input = document.getElementById('search-input') as HTMLInputElement;
                if (input) input.value = '';
                
                const clearBtn = document.getElementById('btn-clear-search');
                if (clearBtn) clearBtn.classList.add('hidden');
            });
        });
    }

    private setupSidebar(): void {
        const sidebar = document.getElementById('sidebar-panel');
        const btnToggle = document.getElementById('btn-open-sidebar');
        const btnClose = sidebar?.querySelector('.panel-close-btn');
        const container = document.getElementById('app');

        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                sidebar?.classList.remove('collapsed');
                container?.classList.remove('collapsed-view');
            });
        }

        const btnAddGroup = document.getElementById('btn-add-group');
        if (btnAddGroup) {
            btnAddGroup.addEventListener('click', () => {
                this.showAddGroupModal();
            });
        }

        if (btnClose) {
            btnClose.addEventListener('click', () => {
                sidebar?.classList.add('collapsed');
                container?.classList.add('collapsed-view');
            });
        }
    }

    private setupScrollbarBehavior(): void {
        const scrollContainers = document.querySelectorAll('.panel-content');
        
        scrollContainers.forEach(container => {
            let isScrollingTimer: number;

            container.addEventListener('scroll', () => {
                container.classList.add('is-scrolling');
                
                window.clearTimeout(isScrollingTimer);
                
                isScrollingTimer = window.setTimeout(() => {
                    container.classList.remove('is-scrolling');
                }, 1500);
            });
        });

        const resizeObserver = new ResizeObserver(() => {
            this.checkScrollbar();
        });

        scrollContainers.forEach(panel => resizeObserver.observe(panel));
        
        const listEl = document.getElementById('location-list');
        if (listEl) resizeObserver.observe(listEl);
    }

    private checkScrollbar(): void {
        const panels = document.querySelectorAll('.panel-content');
        panels.forEach(panel => {
            if (panel.scrollHeight > panel.clientHeight) {
                panel.classList.add('has-scrollbar');
            } else {
                panel.classList.remove('has-scrollbar');
            }
        });
    }

    private setupModal(): void {
        const btnAdd = document.getElementById('btn-add');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                this.showLocationModal('add');
            });
        }
    }

    private deleteLocation(id: string): void {
        this.store.delete(id);
        this.map.removeMarker(id);
        this.renderList();
        notify.show('Location deleted', 'success');
    }

    private editLocation(id: string): void {
        const loc = this.store.getAll().find(l => l.id === id);
        if (loc) {
            this.showLocationModal('edit', loc);
            this.map.flyTo({ lng: loc.lng, lat: loc.lat });
        }
    }

    private toggleVisibility(id: string): void {
        const loc = this.store.getAll().find(l => l.id === id);
        if (loc) {
            loc.hidden = !loc.hidden;
            this.store.update(loc.id, { hidden: loc.hidden });

            if (loc.hidden) {
                this.map.removeMarker(id);
                notify.show('Location hidden', 'info');
            } else {
                this.map.addMarker(
                    loc.id,
                    { lng: loc.lng, lat: loc.lat },
                    { onClick: () => this.onMarkerClick(loc) }
                );
                notify.show('Location visible', 'success');
            }
            this.renderList(); // Force React update to show eye icon change
        }
    }

    private onMarkerClick(location: Location): void {
        this.selectedLocation = location;
        this.map.flyTo({ lng: location.lng, lat: location.lat });
        
        const popupHtml = `
            <div class="poi-popup">
                <div class="poi-header">
                    <h3>${location.name}</h3>
                    <div class="poi-subtitle">${location.desc || 'Marked Location'}</div>
                </div>
                <div class="poi-divider"></div>
                <div class="poi-body">
                    <div class="poi-coords">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                        ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
                    </div>
                    
                    <div class="poi-actions">
                        <button class="btn-ios-primary" id="btn-popup-nav-${location.id}">
                            Navigate
                        </button>
                        <button class="btn-ios-secondary" id="btn-popup-edit-${location.id}">
                            Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const handleClosePopup = () => {
            this.selectedLocation = null;
            // React app handles active state, but here we might want to tell React somehow?
            // For now, React doesn't know about selection changes initiated by Map.
            // OPTIONAL: We could pass a prop `selectedId` to ReactApp if we wanted list to highlight.
            // But we don't have that plumbing yet.
        };

        this.map.showPopup(
            { lng: location.lng, lat: location.lat }, 
            popupHtml,
            handleClosePopup 
        );

        setTimeout(() => {
            const btnNav = document.getElementById(`btn-popup-nav-${location.id}`);
            const btnEdit = document.getElementById(`btn-popup-edit-${location.id}`);

            if (btnNav) {
                btnNav.addEventListener('click', () => {
                    this.nav.setDestination(location);
                    if (this.map.currentPopup) this.map.currentPopup.remove();
                });
            }

            if (btnEdit) {
                btnEdit.addEventListener('click', () => {
                    this.editLocation(location.id);
                    if (this.map.currentPopup) this.map.currentPopup.remove();
                });
            }
        }, 50);
    }
}

const app = new App();

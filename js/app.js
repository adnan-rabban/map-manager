import { Store } from './store.js';
import { MapEngine } from './map.js';
import { Navigation } from './navigation.js'; 
import { SettingsManager } from './settings.js';
import { notify } from './notifications.js';
import { CustomTooltip } from './tooltip.js';
import { escapeHTML } from './utils.js'; // Import Sanitizer
import { LayerSwitcher } from './layers.js';

class App {
    constructor() {
        this.store = new Store();
        this.map = new MapEngine('map-container');
        this.nav = new Navigation(this.map); // Init Navigation
        this.layers = new LayerSwitcher(this.map); // Init Layer Switcher
        this.settings = new SettingsManager();
        this.tooltip = new CustomTooltip();

        this.initUI();
    }

    initUI() {
        this.renderList();
        this.setupModal();
        this.setupSidebar();

        this.setupDataManagement();
        this.setupSearch();

        // POI Click Handler (Map Features)
        this.map.onPoiClick((poi) => {
            const container = document.createElement('div');
            container.className = 'poi-popup';
            container.innerHTML = `
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
            `;

            // Bind events directly
            const btnNav = container.querySelector(`#btn-poi-nav-${poi.id}`);
            const btnSave = container.querySelector(`#btn-poi-save-${poi.id}`);
            
            if (btnNav) {
                btnNav.addEventListener('click', () => {
                        this.nav.setDestination({ lat: poi.lngLat.lat, lng: poi.lngLat.lng, name: poi.name });
                        if (this.map.currentPopup) this.map.currentPopup.remove();
                });
            }
            
            if (btnSave) {
                    btnSave.addEventListener('click', () => {
                        document.getElementById('btn-add').click();
                        // Auto-fill form
                        document.getElementById('loc-lng').value = poi.lngLat.lng.toFixed(6);
                        document.getElementById('loc-lat').value = poi.lngLat.lat.toFixed(6);
                        document.getElementById('loc-name').value = poi.name;
                        document.getElementById('loc-desc').value = poi.category;
                        
                        if (this.map.currentPopup) this.map.currentPopup.remove();
                    });
            }

            this.map.showPopup(poi.lngLat, container);
        });

        // Load markers when map loads
        setTimeout(() => {
            this.store.getAll().forEach(loc => {
                if (!loc.hidden) {
                    this.map.addMarker(loc, (l) => this.onMarkerClick(l));
                }
            });
        }, 1000);

        this.map.onMapClick(async (lngLat) => {
            const modal = document.getElementById('modal-overlay');
            
            // Mode 1: Filling "Add Location" Form
            if (modal.classList.contains('open')) {
                document.getElementById('loc-lng').value = lngLat.lng.toFixed(6);
                document.getElementById('loc-lat').value = lngLat.lat.toFixed(6);
                
                notify.show('Fetching address...', 'info');
                const feature = await this.map.reverseGeocode(lngLat.lng, lngLat.lat);
                if (feature) {
                    document.getElementById('loc-name').value = feature.place_name || feature.text;
                    const context = feature.context ? feature.context.map(c => c.text).join(', ') : '';
                    document.getElementById('loc-desc').value = context;
                    notify.show('Address found!', 'success');
                }
                return;
            }


            

        });
    }

    setupDataManagement() {
        const btnExport = document.getElementById('btn-export');
        const btnImport = document.getElementById('btn-import');
        const fileImport = document.getElementById('file-import');
        const listEl = document.getElementById('location-list');
        const globalMenu = document.getElementById('global-context-menu');

        // Helper: Close Global Menu with Animation
        const closeGlobalMenu = () => {
            const menu = document.getElementById('global-context-menu');
            if (!menu || !menu.classList.contains('active')) return;

            menu.classList.add('closing');
            menu.classList.remove('active');
            menu.dataset.currentId = '';
            
            const onEnd = () => {
                menu.classList.remove('closing');
                menu.classList.add('hidden');
                menu.removeEventListener('animationend', onEnd);
            };
            menu.addEventListener('animationend', onEnd, { once: true });
        };

        // Helper to handle actions (Edit, Delete, Nav)
        const handleAction = (e) => {
            const btnNav = e.target.closest('.js-nav');
            const btnEdit = e.target.closest('.js-edit');
            const btnDelete = e.target.closest('.js-delete');
            const item = e.target.closest('.location-item');

                // Case 1: View Location Button (ex-Navigate)
                if (btnNav) {
                    e.stopPropagation();
                    const id = btnNav.dataset.id;
                    const loc = this.store.getAll().find(l => l.id === id);
                    if (loc) {
                         this.map.flyTo(loc.lng, loc.lat);
                         notify.show(`Viewing ${loc.name}`, 'info');
                    }
                    return;
                }

                // Case 2: Edit Button
                if (btnEdit) {
                    e.stopPropagation();
                    const id = btnEdit.dataset.id;
                    this.editLocation(id);
                    return;
                }

                // Case 3: Delete Button
                if (btnDelete) {
                    e.stopPropagation();
                    const id = btnDelete.dataset.id;
                    const loc = this.store.getAll().find(l => l.id === id);

                    // Trigger Custom Dialog
                    deleteTargetId = id;
                    
                    // Update Dialog Content
                    const desc = deleteDialog.querySelector('.modal-desc');
                    if (desc) {
                         const name = loc ? loc.name : 'this location';
                         // user requested: "perbaiki kalimatnya... judul dan sub judul"
                         desc.innerHTML = `Are you sure you want to delete <strong>${name}</strong>? This action cannot be undone.`;
                    }

                    deleteDialog.classList.add('open');
                    
                    // Close context menu if open
                    closeGlobalMenu();
                    return;
                }

                // Case 5: Toggle Visibility
                const btnToggle = e.target.closest('.js-toggle-visibility');
                if (btnToggle) {
                    e.stopPropagation();
                    const id = btnToggle.dataset.id;
                    this.toggleVisibility(id);
                    closeGlobalMenu();
                    return;
                }

                // Case 4: Row Click (Fly To) - Only if not buttons
                // Case 3b: Menu Button (New Global)
                const btnMenu = e.target.closest('.js-menu');
                if (btnMenu) {
                    e.stopPropagation();
                    const id = btnMenu.dataset.id;
                    const menu = document.getElementById('global-context-menu');
                    
                    // Toggle Logic
                    // If menu is active AND belongs to this ID, close it
                    if (menu.classList.contains('active') && menu.dataset.currentId === id) {
                        closeGlobalMenu();
                        return;
                    }

                    // Open / Switch
                    menu.classList.remove('hidden', 'closing');
                    menu.dataset.currentId = id; 
                    
                    // Populate Menu
                    const loc = this.store.getAll().find(l => l.id === id);
                    const isHidden = loc ? loc.hidden : false;
                    
                    const eyeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
                    const eyeOffIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

                    menu.innerHTML = `
                        <button class="dropdown-item js-toggle-visibility" data-id="${id}">
                            ${isHidden ? eyeIcon : eyeOffIcon}
                            ${isHidden ? 'Show on Map' : 'Hide from Map'}
                        </button>
                        <button class="dropdown-item js-delete" data-id="${id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; color: #ff3b30;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete
                        </button>
                    `;

                    // Calculate Position
                    const rect = btnMenu.getBoundingClientRect();
                    menu.style.display = 'block'; 
                    
                    // Trigger Reflow for animation restart if needed (optional but good practice)
                    void menu.offsetWidth;
                    menu.classList.add('active');
                    
                    // Align to bottom-right of button normally
                    let top = rect.bottom + 4;
                    let left = rect.right - 150; // Align right edge (approx width)

                    // Simple boundary check
                    if (left < 10) left = rect.left;
                    
                    menu.style.top = `${top}px`;
                    menu.style.left = `${left}px`;
                    
                    // Set transform origin for cool zoom effect
                    const originX = rect.right - left; // Relative to menu left
                    menu.style.transformOrigin = `${originX}px top`;

                    return;
                }

                // Case 4: Row Click (Fly To) - Only if not buttons
                if (item && !btnNav && !btnEdit && !btnDelete && !btnMenu && !e.target.closest('.dropdown-menu')) {
                    const id = item.dataset.id;
                    const loc = this.store.getAll().find(l => l.id === id);
                    if (loc) {
                        this.map.flyTo(loc.lng, loc.lat);
                    }
                }
        };

        // Close global menu on click outside
        document.addEventListener('click', (e) => {
             // If clicking outside menu AND outside any menu button
            if (!e.target.closest('.dropdown-menu') && !e.target.closest('.js-menu')) {
                 closeGlobalMenu();
            }
        });
        if (listEl) listEl.addEventListener('click', handleAction);
        if (globalMenu) globalMenu.addEventListener('click', handleAction);

        // Delete Dialog Logic
        const deleteDialog = document.getElementById('delete-dialog-overlay');
        const btnCancelDelete = document.getElementById('btn-cancel-delete');
        const btnConfirmDelete = document.getElementById('btn-confirm-delete');
        let deleteTargetId = null;

        const closeDeleteDialog = () => {
             deleteDialog.classList.remove('open');
             deleteTargetId = null;
        };

        // Confirm Delete
        if(btnConfirmDelete) {
            btnConfirmDelete.addEventListener('click', () => {
                if (deleteTargetId) {
                    this.deleteLocation(deleteTargetId);
                    notify.show('Location deleted', 'success');
                }
                closeDeleteDialog();
            });
        }
        
        // Cancel Delete
        if(btnCancelDelete) {
            btnCancelDelete.addEventListener('click', closeDeleteDialog);
        }

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

        if (btnImport) {
            btnImport.addEventListener('click', () => {
                fileImport.click();
            });

            fileImport.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (this.store.importData(data)) {
                             this.renderList();
                             this.store.getAll().forEach(loc => {
                                this.map.addMarker(loc, (l) => this.onMarkerClick(l));
                             });
                             notify.show('Data imported successfully', 'success');
                        } else {
                             notify.show('Invalid data format', 'error');
                        }
                    } catch (err) {
                        console.error(err);
                        notify.show('Failed to parse file', 'error');
                    }
                };
                reader.readAsText(file);
                // Reset to allow selecting same file again
                fileImport.value = '';
            });
        }
    }

    setupSearch() {
        const input = document.getElementById('search-input');
        const resultsContainer = document.getElementById('search-results');
        const clearBtn = document.getElementById('btn-clear-search');
        
        let debounceTimer;

        // Toggle clear button
        const toggleClear = () => {
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
                resultsContainer.classList.add('hidden');
                input.focus();
            });
        }

        const btnSearch = document.getElementById('btn-trigger-search');
        if (btnSearch) {
            btnSearch.addEventListener('click', async () => {
                const query = input.value;
                if (query.length < 3) return;
                
                // Trigger search immediately
                const results = await this.map.searchPlaces(query);
                this.renderSearchResults(results);
                input.focus();
            });
        }

        input.addEventListener('input', (e) => {
            const query = e.target.value;
            toggleClear();
            clearTimeout(debounceTimer);

            if (query.length < 3) {
                resultsContainer.classList.add('hidden');
                return;
            }

            debounceTimer = setTimeout(async () => {
                const results = await this.map.searchPlaces(query);
                // Fix: Discard if input has changed
                if (input.value !== query) return;
                this.renderSearchResults(results);
            }, 300);
        });
        
        // Hide results on outside click
        document.addEventListener('click', (e) => {
            if (!document.getElementById('search-container').contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });
    }

    renderSearchResults(results) {
        const container = document.getElementById('search-results');
        
        if (results.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = results.map(item => {
            // Photon returns object with properties
            // We standardized it in map.js to: { id, center, place_name, text, properties, category }
            const badgeHtml = item.category ? `<span class="ios-badge">${item.category}</span>` : '';
            
            return `
            <div class="search-result-item" data-id="${item.id}">
                <div class="result-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div class="result-text">
                    <div class="result-main">${item.text} ${badgeHtml}</div>
                    <div class="result-sub">${item.place_name}</div>
                </div>
            </div>
            `;
        }).join('');

        container.classList.remove('hidden');

        // Click listeners
        container.querySelectorAll('.search-result-item').forEach((el, index) => {
            el.addEventListener('click', () => {
                const item = results[index];
                const lngLat = { lng: item.center[0], lat: item.center[1] };
                
                this.map.flyTo(lngLat.lng, lngLat.lat);
                
                // Show Identity Popup
                const container = document.createElement('div');
                container.className = 'poi-popup';
                container.innerHTML = `
                    <div class="poi-header">
                        <h3>${item.text}</h3>
                        <div class="poi-subtitle">${item.place_name}</div>
                    </div>
                    <div class="poi-divider"></div>
                    <div class="poi-body">
                            <button class="btn-ios-primary" id="btn-add-from-search" style="width:100%;">
                            Add to Locations
                        </button>
                    </div>
                `;

                const btn = container.querySelector('#btn-add-from-search');
                if (btn) {
                    btn.addEventListener('click', () => {
                        document.getElementById('btn-add').click(); // Open Sidebar/Modal
                        document.getElementById('loc-lng').value = lngLat.lng.toFixed(6);
                        document.getElementById('loc-lat').value = lngLat.lat.toFixed(6);
                        document.getElementById('loc-name').value = item.text;
                        document.getElementById('loc-desc').value = item.place_name;
                        
                        if (this.map.currentPopup) this.map.currentPopup.remove();
                    });
                }

                this.map.showPopup(lngLat, container);

                container.classList.add('hidden');
                document.getElementById('search-input').value = ''; // Optional: keep or clear? Clearing usually better for "jump to"
            });
        });
    }

    setupSidebar() {
        const sidebar = document.getElementById('sidebar-panel');
        const container = document.getElementById('app');
        const btnClose = document.getElementById('btn-close-sidebar');
        const btnOpen = document.getElementById('btn-open-sidebar');

        const toggleSidebar = (show) => {
            if (show) {
                sidebar.classList.remove('collapsed');
                container.classList.remove('collapsed-view');
            } else {
                sidebar.classList.add('collapsed');
                container.classList.add('collapsed-view');
            }
        };

        btnClose.addEventListener('click', () => toggleSidebar(false));
        btnOpen.addEventListener('click', () => toggleSidebar(true));
        
        if (window.innerWidth < 600) {
            toggleSidebar(false);
        }
    }

    renderList() {
        const listEl = document.getElementById('location-list');
        const locations = this.store.getAll();

        if (locations.length === 0) {
            listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No locations yet. Click the + button.</div>';
            return;
        }

        listEl.innerHTML = locations.map((loc, index) => `
            <div class="location-item" data-id="${loc.id}" style="animation-delay: ${index * 0.05}s">
                    <div class="location-info">
                    <h3>${escapeHTML(loc.name)}</h3>
                    <p>${escapeHTML(loc.desc || 'No description')}</p>
                </div>
                <div style="display: flex; gap: 4px;">
                     <button class="btn btn-icon js-nav" data-id="${loc.id}" data-tooltip="View Location" aria-label="View Location">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                     </button>
                     <button class="btn btn-icon js-edit" data-id="${loc.id}" data-tooltip="Edit" aria-label="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                     </button>
                     
                     <div class="more-options-wrapper" style="position: relative;">
                        <button class="btn btn-icon js-menu" data-id="${loc.id}" data-tooltip="More Options" aria-label="More Options">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                     </div>
                </div>
            </div>
        `).join('');

        // Listeners are now handled by event delegation in setupDataManagement
    }

    setupModal() {
        const modal = document.getElementById('modal-overlay');
        const btnAdd = document.getElementById('btn-add');
        const btnCancel = document.getElementById('btn-cancel');
        const form = document.getElementById('location-form');

        const openModal = () => {
             form.reset();
             document.getElementById('loc-id').value = ''; 
             const title = modal.querySelector('h2');
             if (title) title.textContent = 'Add Location';
             modal.classList.add('open');
        };
        
        const closeModal = () => modal.classList.remove('open');

        btnAdd.addEventListener('click', openModal);
        btnCancel.addEventListener('click', closeModal);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('loc-id').value;
            const name = document.getElementById('loc-name').value;
            const desc = document.getElementById('loc-desc').value;
            const lng = parseFloat(document.getElementById('loc-lng').value);
            const lat = parseFloat(document.getElementById('loc-lat').value);

            // Validation
            if (isNaN(lng) || isNaN(lat)) {
                notify.show('Invalid coordinates', 'error');
                return;
            }
            
            // Validate Ranges
            if (lat < -90 || lat > 90) {
                 notify.show('Latitude must be between -90 and 90', 'error');
                 return;
            }
            if (lng < -180 || lng > 180) {
                 notify.show('Longitude must be between -180 and 180', 'error');
                 return;
            }

            const data = { id, name, desc, lng, lat };

            try {
                if (id) {
                    this.store.update(data);
                    notify.show('Location updated successfully', 'success');
                } else {
                    const newLoc = this.store.add(data);
                    this.map.addMarker(newLoc, (l) => this.onMarkerClick(l));
                    notify.show('Location saved successfully', 'success');
                }

                this.renderList();
                closeModal(); // Close immediately
                this.map.flyTo(lng, lat);
            } catch (err) {
                console.error(err);
                notify.show('Failed to save location', 'error');
            }
        });
    }

    deleteLocation(id) {
        this.store.delete(id);
        this.map.removeMarker(id);
        this.renderList();
    }

    editLocation(id) {
        const loc = this.store.getAll().find(l => l.id === id);
        if (!loc) return;

        // Fill form
        document.getElementById('loc-id').value = loc.id;
        document.getElementById('loc-name').value = loc.name;
        document.getElementById('loc-desc').value = loc.desc || '';
        document.getElementById('loc-lng').value = loc.lng;
        document.getElementById('loc-lat').value = loc.lat;

        // Open Modal
        const modal = document.getElementById('modal-overlay');
        modal.classList.add('open');
        
        // Optional: Update modal title to "Edit Location"
        const title = modal.querySelector('h2');
        if (title) title.textContent = 'Edit Location';
        
        // Fly to verify
        this.map.flyTo(loc.lng, loc.lat);
    }

    toggleVisibility(id) {
        const loc = this.store.getAll().find(l => l.id === id);
        if (loc) {
            loc.hidden = !loc.hidden;
            this.store.update(loc);

            if (loc.hidden) {
                this.map.removeMarker(id);
                notify.show('Location hidden', 'info');
            } else {
                this.map.addMarker(loc, (l) => this.onMarkerClick(l));
                notify.show('Location visible', 'success');
            }
        }
    }

    onMarkerClick(location) {
        this.map.flyTo(location.lng, location.lat);
        
        // Show Popup with Actions
        const container = document.createElement('div');
        container.className = 'poi-popup';
        container.innerHTML = `
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
        `;

        const btnNav = container.querySelector(`#btn-popup-nav-${location.id}`);
        const btnEdit = container.querySelector(`#btn-popup-edit-${location.id}`);

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
        
        this.map.showPopup({ lng: location.lng, lat: location.lat }, container);

        // Sync with Sidebar
        const sidebar = document.getElementById('sidebar-panel');
        if (sidebar && sidebar.classList.contains('collapsed')) {
             // Optional: Don't force open sidebar if we have a popup now?
             // Let's keep it closed to avoid clutter, since we have the popup.
             // But valid to highlight if open.
        }
        
        const items = document.querySelectorAll('.location-item');
        items.forEach(el => el.classList.remove('active'));
        const activeEl = document.querySelector(`.location-item[data-id="${location.id}"]`);
        if (activeEl) {
            activeEl.classList.add('active');
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

const app = new App();


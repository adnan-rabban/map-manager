import { Store } from './store/store.js';
import { MapEngine } from './core/map.js';
import { Navigation } from './components/navigation.js';
import { notify } from './components/notifications.js';
import { CustomTooltip } from './components/tooltip.js';
import { LayerSwitcher } from './core/layers.js';
class App {
    constructor() {
        this.store = new Store();
        this.map = new MapEngine('map-container');
        this.nav = new Navigation(this.map);
        this.layers = new LayerSwitcher(this.map);
        this.tooltip = new CustomTooltip();
        this.initUI();
    }
    initUI() {
        this.renderList();
        this.setupModal();
        this.setupSidebar();
        this.setupDataManagement();
        this.setupSearch();
        // POI Click Handler
        this.map.onPoiClick((poi) => {
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
                        if (this.map.currentPopup)
                            this.map.currentPopup.remove();
                    });
                }
                if (btnSave) {
                    btnSave.addEventListener('click', () => {
                        const btnAdd = document.getElementById('btn-add');
                        btnAdd?.click();
                        const lngInput = document.getElementById('loc-lng');
                        const latInput = document.getElementById('loc-lat');
                        const nameInput = document.getElementById('loc-name');
                        const descInput = document.getElementById('loc-desc');
                        if (lngInput)
                            lngInput.value = poi.lngLat.lng.toFixed(6);
                        if (latInput)
                            latInput.value = poi.lngLat.lat.toFixed(6);
                        if (nameInput)
                            nameInput.value = poi.name;
                        if (descInput)
                            descInput.value = poi.category;
                        if (this.map.currentPopup)
                            this.map.currentPopup.remove();
                    });
                }
            }, 50);
        });
        // Load markers when map loads
        setTimeout(() => {
            this.store.getAll().forEach(loc => {
                if (!loc.hidden) {
                    this.map.addMarker(loc, (l) => this.onMarkerClick(l));
                }
            });
        }, 1000);
        // Map click for form filling
        this.map.onMapClick(async (lngLat) => {
            const modal = document.getElementById('modal-overlay');
            if (modal?.classList.contains('open')) {
                const lngInput = document.getElementById('loc-lng');
                const latInput = document.getElementById('loc-lat');
                if (lngInput)
                    lngInput.value = lngLat.lng.toFixed(6);
                if (latInput)
                    latInput.value = lngLat.lat.toFixed(6);
                notify.show('Fetching address...', 'info');
                const feature = await this.map.reverseGeocode(lngLat.lng, lngLat.lat);
                if (feature) {
                    const nameInput = document.getElementById('loc-name');
                    const descInput = document.getElementById('loc-desc');
                    if (nameInput)
                        nameInput.value = feature.place_name || feature.text;
                    const context = feature.context ? feature.context.map(c => c.text).join(', ') : '';
                    if (descInput)
                        descInput.value = context;
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
        const closeGlobalMenu = () => {
            const menu = document.getElementById('global-context-menu');
            if (!menu || !menu.classList.contains('active'))
                return;
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
        const handleAction = (e) => {
            const target = e.target;
            const btnNav = target.closest('.js-nav');
            const btnEdit = target.closest('.js-edit');
            const btnDelete = target.closest('.js-delete');
            const btnToggle = target.closest('.js-toggle-visibility');
            const btnMenu = target.closest('.js-menu');
            const item = target.closest('.location-item');
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
            if (btnEdit) {
                e.stopPropagation();
                const id = btnEdit.dataset.id;
                if (id)
                    this.editLocation(id);
                return;
            }
            if (btnDelete) {
                e.stopPropagation();
                const id = btnDelete.dataset.id;
                const loc = this.store.getAll().find(l => l.id === id);
                const deleteDialog = document.getElementById('delete-dialog-overlay');
                const desc = deleteDialog?.querySelector('.modal-desc');
                if (desc && loc) {
                    const name = loc.name;
                    desc.innerHTML = `Are you sure you want to delete <strong>${name}</strong>? This action cannot be undone.`;
                }
                deleteDialog?.classList.add('open');
                deleteDialog?.setAttribute('data-delete-id', id || '');
                closeGlobalMenu();
                return;
            }
            if (btnToggle) {
                e.stopPropagation();
                const id = btnToggle.dataset.id;
                if (id)
                    this.toggleVisibility(id);
                closeGlobalMenu();
                return;
            }
            if (btnMenu) {
                e.stopPropagation();
                const id = btnMenu.dataset.id;
                const menu = document.getElementById('global-context-menu');
                if (menu?.classList.contains('active') && menu.dataset.currentId === id) {
                    closeGlobalMenu();
                    return;
                }
                if (menu && id) {
                    menu.classList.remove('hidden', 'closing');
                    menu.dataset.currentId = id;
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
                    const rect = btnMenu.getBoundingClientRect();
                    menu.style.display = 'block';
                    void menu.offsetWidth;
                    menu.classList.add('active');
                    let top = rect.bottom + 4;
                    let left = rect.right - 150;
                    if (left < 10)
                        left = rect.left;
                    menu.style.top = `${top}px`;
                    menu.style.left = `${left}px`;
                    const originX = rect.right - left;
                    menu.style.transformOrigin = `${originX}px top`;
                }
                return;
            }
            if (item && !btnNav && !btnEdit && !btnDelete && !btnMenu && !target.closest('.dropdown-menu')) {
                const id = item.dataset.id;
                const loc = this.store.getAll().find(l => l.id === id);
                if (loc) {
                    this.map.flyTo(loc.lng, loc.lat);
                }
            }
        };
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!target.closest('.dropdown-menu') && !target.closest('.js-menu')) {
                closeGlobalMenu();
            }
        });
        if (listEl)
            listEl.addEventListener('click', handleAction);
        if (globalMenu)
            globalMenu.addEventListener('click', handleAction);
        // Delete Dialog
        const deleteDialog = document.getElementById('delete-dialog-overlay');
        const btnCancelDelete = document.getElementById('btn-cancel-delete');
        const btnConfirmDelete = document.getElementById('btn-confirm-delete');
        const closeDeleteDialog = () => {
            deleteDialog?.classList.remove('open');
            deleteDialog?.removeAttribute('data-delete-id');
        };
        if (btnConfirmDelete) {
            btnConfirmDelete.addEventListener('click', () => {
                const deleteId = deleteDialog?.getAttribute('data-delete-id');
                if (deleteId) {
                    this.deleteLocation(deleteId);
                    notify.show('Location deleted', 'success');
                }
                closeDeleteDialog();
            });
        }
        if (btnCancelDelete) {
            btnCancelDelete.addEventListener('click', closeDeleteDialog);
        }
        // Export/Import
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const data = JSON.stringify(this.store.getAll(), null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `locations-${new Date().toISOString().slice(0, 10)}.json`;
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
            fileImport.addEventListener('change', (e) => {
                const target = e.target;
                const file = target.files?.[0];
                if (!file)
                    return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const result = event.target?.result;
                        if (typeof result === 'string') {
                            const data = JSON.parse(result);
                            if (this.store.importData(data)) {
                                this.renderList();
                                this.store.getAll().forEach(loc => {
                                    this.map.addMarker(loc, (l) => this.onMarkerClick(l));
                                });
                                notify.show('Data imported successfully', 'success');
                            }
                            else {
                                notify.show('Invalid data format', 'error');
                            }
                        }
                    }
                    catch (err) {
                        console.error(err);
                        notify.show('Failed to parse file', 'error');
                    }
                };
                reader.readAsText(file);
                fileImport.value = '';
            });
        }
    }
    setupSearch() {
        const input = document.getElementById('search-input');
        const resultsContainer = document.getElementById('search-results');
        const clearBtn = document.getElementById('btn-clear-search');
        let debounceTimer;
        const toggleClear = () => {
            if (!clearBtn)
                return;
            if (input.value.length > 0) {
                clearBtn.classList.remove('hidden');
            }
            else {
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
                if (query.length < 3)
                    return;
                const results = await this.map.searchPlaces(query);
                this.renderSearchResults(results);
                input.focus();
            });
        }
        input?.addEventListener('input', (e) => {
            const target = e.target;
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
    renderSearchResults(features) {
        const container = document.getElementById('search-results');
        if (!container)
            return;
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
                const lng = parseFloat(item.dataset.lng || '0');
                const lat = parseFloat(item.dataset.lat || '0');
                this.map.flyTo(lng, lat);
                container.classList.add('hidden');
                const input = document.getElementById('search-input');
                if (input)
                    input.value = '';
                const clearBtn = document.getElementById('btn-clear-search');
                if (clearBtn)
                    clearBtn.classList.add('hidden');
            });
        });
    }
    setupSidebar() {
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
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                sidebar?.classList.add('collapsed');
                container?.classList.add('collapsed-view');
            });
        }
    }
    renderList() {
        const listEl = document.getElementById('location-list');
        if (!listEl)
            return;
        const locations = this.store.getAll();
        listEl.innerHTML = locations.map(loc => `
            <div class="location-item" data-id="${loc.id}">
                <div class="location-info">
                    <h3>${loc.name}</h3>
                    <p>${loc.desc || 'No description'}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn-icon js-nav" data-id="${loc.id}" data-tooltip="View on map">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </button>
                    <button class="btn-icon js-edit" data-id="${loc.id}" data-tooltip="Edit location">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon js-menu" data-id="${loc.id}" data-tooltip="More options">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }
    setupModal() {
        const modal = document.getElementById('modal-overlay');
        const btnAdd = document.getElementById('btn-add');
        const btnCancel = document.getElementById('btn-cancel');
        const form = document.getElementById('location-form');
        const openModal = () => {
            form?.reset();
            const idInput = document.getElementById('loc-id');
            if (idInput)
                idInput.value = '';
            const title = modal?.querySelector('h2');
            if (title)
                title.textContent = 'Add Location';
            modal?.classList.add('open');
        };
        const closeModal = () => modal?.classList.remove('open');
        btnAdd?.addEventListener('click', openModal);
        btnCancel?.addEventListener('click', closeModal);
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const idInput = document.getElementById('loc-id');
            const nameInput = document.getElementById('loc-name');
            const descInput = document.getElementById('loc-desc');
            const lngInput = document.getElementById('loc-lng');
            const latInput = document.getElementById('loc-lat');
            const id = idInput.value;
            const name = nameInput.value;
            const desc = descInput.value;
            const lng = parseFloat(lngInput.value);
            const lat = parseFloat(latInput.value);
            if (isNaN(lng) || isNaN(lat)) {
                notify.show('Invalid coordinates', 'error');
                return;
            }
            if (lat < -90 || lat > 90) {
                notify.show('Latitude must be between -90 and 90', 'error');
                return;
            }
            if (lng < -180 || lng > 180) {
                notify.show('Longitude must be between -180 and 180', 'error');
                return;
            }
            const data = { name, desc, lng, lat };
            if (id) {
                data.id = id;
            }
            try {
                if (id) {
                    this.store.update(data);
                    notify.show('Location updated successfully', 'success');
                }
                else {
                    const newLoc = this.store.add(data);
                    this.map.addMarker(newLoc, (l) => this.onMarkerClick(l));
                    notify.show('Location saved successfully', 'success');
                }
                this.renderList();
                closeModal();
                this.map.flyTo(lng, lat);
            }
            catch (err) {
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
        if (!loc)
            return;
        const idInput = document.getElementById('loc-id');
        const nameInput = document.getElementById('loc-name');
        const descInput = document.getElementById('loc-desc');
        const lngInput = document.getElementById('loc-lng');
        const latInput = document.getElementById('loc-lat');
        if (idInput)
            idInput.value = loc.id;
        if (nameInput)
            nameInput.value = loc.name;
        if (descInput)
            descInput.value = loc.desc || '';
        if (lngInput)
            lngInput.value = loc.lng.toString();
        if (latInput)
            latInput.value = loc.lat.toString();
        const modal = document.getElementById('modal-overlay');
        modal?.classList.add('open');
        const title = modal?.querySelector('h2');
        if (title)
            title.textContent = 'Edit Location';
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
            }
            else {
                this.map.addMarker(loc, (l) => this.onMarkerClick(l));
                notify.show('Location visible', 'success');
            }
        }
    }
    onMarkerClick(location) {
        this.map.flyTo(location.lng, location.lat);
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
        this.map.showPopup({ lng: location.lng, lat: location.lat }, popupHtml);
        setTimeout(() => {
            const btnNav = document.getElementById(`btn-popup-nav-${location.id}`);
            const btnEdit = document.getElementById(`btn-popup-edit-${location.id}`);
            if (btnNav) {
                btnNav.addEventListener('click', () => {
                    this.nav.setDestination(location);
                    if (this.map.currentPopup)
                        this.map.currentPopup.remove();
                });
            }
            if (btnEdit) {
                btnEdit.addEventListener('click', () => {
                    this.editLocation(location.id);
                    if (this.map.currentPopup)
                        this.map.currentPopup.remove();
                });
            }
        }, 50);
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

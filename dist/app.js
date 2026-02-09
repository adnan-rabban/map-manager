import { Store } from './store/store.js';
import { MapEngine } from './core/map.js';
import { Navigation } from './components/navigation.js';
import { notify } from './components/notifications.js';
import { CustomTooltip } from './components/tooltip.js';
import { LayerSwitcher } from './core/layers.js';
class App {
    constructor() {
        this.selectedLocation = null;
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
        this.setupSettings();
        this.setupScrollbarBehavior();
        // POI Click Handler
        this.map.onPOIClick((poi) => {
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
                        this.showLocationModal('add', {
                            id: '', // Dummy
                            name: poi.name,
                            desc: poi.category,
                            lat: poi.lngLat.lat,
                            lng: poi.lngLat.lng
                        });
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
                    this.map.addMarker(loc.id, { lng: loc.lng, lat: loc.lat }, { onClick: () => this.onMarkerClick(loc) });
                }
            });
        }, 1000);
        // Map click for form filling
        this.map.onClick(async (lngLat) => {
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
            const btnMove = target.closest('.js-move-group');
            const item = target.closest('.location-item');
            if (btnNav) {
                e.stopPropagation();
                const id = btnNav.dataset.id;
                const loc = this.store.getAll().find(l => l.id === id);
                if (loc) {
                    this.map.flyTo({ lng: loc.lng, lat: loc.lat });
                    notify.show(`Viewing ${loc.name}`, 'info');
                }
                return;
            }
            if (btnEdit) {
                e.stopPropagation();
                const id = btnEdit.dataset.id;
                const loc = this.store.getAll().find(l => l.id === id);
                if (loc)
                    this.showLocationModal('edit', loc);
                return;
            }
            if (btnDelete) {
                e.stopPropagation();
                const id = btnDelete.dataset.id;
                const loc = this.store.getAll().find(l => l.id === id);
                if (loc) {
                    const content = document.createElement('div');
                    content.style.marginTop = '16px';
                    content.innerHTML = `
                        <p class="modal-desc">Are you sure you want to delete <strong>${loc.name}</strong>? This action cannot be undone.</p>
                     `;
                    this.createModal('Delete Location', content, () => {
                        this.deleteLocation(loc.id);
                        notify.show('Location deleted', 'success');
                    }, 'Delete', true);
                }
                closeGlobalMenu();
                return;
            }
            if (btnMove) {
                e.stopPropagation();
                const locId = btnMove.dataset.id;
                const groupId = btnMove.dataset.groupId;
                if (locId) {
                    this.store.assignLocationToGroup(locId, groupId || null);
                    this.renderList();
                    notify.show(groupId ? 'Moved to folder' : 'Removed from folder', 'success');
                }
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
                    const groups = this.store.getGroups();
                    let groupOptions = '';
                    if (groups.length > 0) {
                        const groupItems = groups.map(g => {
                            const isCurrent = loc && loc.groupId === g.id;
                            return `<button class="dropdown-item js-move-group" data-id="${id}" data-group-id="${g.id}">
                                ${isCurrent ? '✓ ' : ''}Move to ${g.name}
                            </button>`;
                        }).join('');
                        const removeGroupItem = loc && loc.groupId ?
                            `<button class="dropdown-item js-move-group" data-id="${id}" data-group-id="">Remove from Folder</button>` : '';
                        groupOptions = `
                                       ${groupItems}
                                       ${removeGroupItem}
                                       <div class="dropdown-divider"></div>`;
                    }
                    menu.innerHTML = `
                        ${groupOptions}
                        <button class="dropdown-item js-toggle-visibility" data-id="${id}">
                            ${isHidden ? eyeIcon : eyeOffIcon}
                            ${isHidden ? 'Show on Map' : 'Hide from Map'}
                        </button>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item js-delete" data-id="${id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
                    this.map.flyTo({ lng: loc.lng, lat: loc.lat });
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
        // Delete Dialog - REMOVED (Replaced by createModal)
        // const deleteDialog = document.getElementById('delete-dialog-overlay');
        // ... (Cleanup old listeners to avoid errors if elements exist but unused)
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
                            let data;
                            // LOGIKA DETEKSI FORMAT (JSON vs CSV)
                            if (result.trim().startsWith('[') || result.trim().startsWith('{')) {
                                // Coba parse sebagai JSON
                                data = JSON.parse(result);
                            }
                            else {
                                // Jika bukan JSON, asumsikan CSV
                                data = this.csvToJson(result);
                            }
                            // Auto-create Group from filename
                            let tempGroupId;
                            if (file && file.name) {
                                const groupName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
                                const newGroup = this.store.addGroup(groupName);
                                tempGroupId = newGroup.id;
                            }
                            if (this.store.importData(data, tempGroupId)) {
                                this.renderList();
                                this.store.getAll().forEach(loc => {
                                    this.map.addMarker(loc.id, { lng: loc.lng, lat: loc.lat }, { onClick: () => this.onMarkerClick(loc) });
                                });
                                notify.show(`Successfully imported locations`, 'success');
                            }
                            else {
                                notify.show('No valid locations found in file', 'warning');
                            }
                        }
                    }
                    catch (err) {
                        console.error(err);
                        notify.show('Failed to parse file. Check format.', 'error');
                    }
                };
                reader.readAsText(file);
                fileImport.value = ''; // Reset input agar bisa upload file yang sama lagi
            });
        }
    }
    createModal(title, contentUi, onSave, saveText = 'Save', isDestructive = false) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay open';
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
        if (input)
            input.focus();
    }
    showRenameGroupModal(group) {
        const content = document.createElement('div');
        content.style.marginTop = '16px';
        content.innerHTML = `
            <div class="form-group">
                <label>Folder Name</label>
                <input type="text" class="form-control" value="${group.name}" id="rename-group-input">
            </div>
        `;
        this.createModal('Rename Folder', content, () => {
            const input = content.querySelector('#rename-group-input');
            if (input && input.value.trim()) {
                this.store.updateGroup(group.id, input.value.trim());
                this.renderList();
            }
        }, 'Save');
    }
    showAddGroupModal() {
        // 1. Siapkan konten HTML form
        const content = document.createElement('div');
        content.style.marginTop = '16px';
        content.innerHTML = `
            <div class="form-group">
                <label>Folder Name</label>
                <input type="text" class="form-control" id="new-group-name" placeholder="e.g. Vacation Spots" autocomplete="off">
            </div>
        `;
        // 2. Panggil Helper createModal
        this.createModal('New Folder', content, () => {
            const input = content.querySelector('#new-group-name');
            const name = input ? input.value.trim() : '';
            if (name) {
                this.store.addGroup(name);
                this.renderList();
                notify.show('Folder created successfully', 'success');
            }
        }, 'Create Folder'); // Teks tombol save
        // 3. Auto-focus ke input setelah modal muncul (Opsional, UX bagus)
        setTimeout(() => {
            const input = content.querySelector('input');
            if (input)
                input.focus();
        }, 100);
    }
    showDeleteGroupModal(group) {
        const content = document.createElement('div');
        content.style.marginTop = '16px';
        content.innerHTML = `
            <p class="modal-desc">Are you sure you want to delete folder <strong>${group.name}</strong>? All locations inside will be <strong>permanently deleted</strong>.</p>
        `;
        this.createModal('Delete Folder', content, () => {
            // 1. Get all locations in this group first
            const locationsToRemove = this.store.getAll().filter(l => l.groupId === group.id);
            // 2. Remove markers visually
            locationsToRemove.forEach(loc => {
                this.map.removeMarker(loc.id);
            });
            // 3. Delete group (locations will be auto-deleted by store logic due to cascade delete)
            this.store.deleteGroup(group.id);
            this.renderList();
            notify.show('Folder deleted', 'success');
        }, 'Delete', true);
    }
    showLocationModal(mode, location) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay open';
        modal.id = 'location-modal';
        const groups = this.store.getGroups();
        // --- CUSTOM DROPDOWN LOGIC PREP ---
        // Determine initial selected group
        let selectedGroupId = location?.groupId || '';
        const initialGroupName = selectedGroupId
            ? groups.find(g => g.id === selectedGroupId)?.name
            : 'Uncategorized';
        // Build Options HTML
        const optionsHtml = [
            `<div class="custom-option ${selectedGroupId === '' ? 'selected' : ''}" data-value="">Uncategorized</div>`,
            ...groups.map(g => `<div class="custom-option ${g.id === selectedGroupId ? 'selected' : ''}" data-value="${g.id}">${g.name}</div>`)
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
                    <!-- Custom Select Markup -->
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
        // --- ELEMENTS ---
        const btnCancel = modal.querySelector('#btn-modal-cancel');
        const btnSave = modal.querySelector('#btn-modal-save');
        const nameInput = modal.querySelector('#modal-name');
        const latInput = modal.querySelector('#modal-lat');
        const lngInput = modal.querySelector('#modal-lng');
        // Custom Dropdown Elements
        const dropdownWrapper = modal.querySelector('#modal-group-wrapper');
        const dropdownTrigger = modal.querySelector('#modal-group-trigger');
        const dropdownOptions = modal.querySelector('.custom-options');
        const triggerSpan = dropdownTrigger.querySelector('span');
        nameInput.focus();
        // --- DROPDOWN EVENT LISTENERS ---
        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownWrapper.classList.toggle('open');
        });
        // Option Selection
        dropdownOptions.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                // Update selection state
                dropdownOptions.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                // Update Logic
                selectedGroupId = option.dataset.value || '';
                triggerSpan.textContent = option.textContent;
                // Close
                dropdownWrapper.classList.remove('open');
            });
        });
        // Close when clicking outside
        const closeDropdown = (e) => {
            if (!dropdownWrapper.contains(e.target)) {
                dropdownWrapper.classList.remove('open');
            }
        };
        document.addEventListener('click', closeDropdown);
        // --- MODAL ACTIONS ---
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
            const desc = modal.querySelector('#modal-desc').value;
            if (!name) {
                notify.show('Name is required', 'error');
                return;
            }
            // Get Lat/Lng from inputs
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);
            if (isNaN(lat) || isNaN(lng)) {
                notify.show('Invalid coordinates', 'error');
                return;
            }
            // Check Lat/Lng validity range
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
                this.map.addMarker(newLoc.id, { lng: newLoc.lng, lat: newLoc.lat }, { onClick: () => this.onMarkerClick(newLoc) });
                notify.show('Location saved successfully', 'success');
            }
            else if (mode === 'edit' && location) {
                this.store.update(location.id, {
                    name,
                    desc,
                    lat,
                    lng,
                    groupId: selectedGroupId || undefined
                });
                // Re-add marker with new position
                this.map.addMarker(location.id, { lng, lat }, { onClick: () => this.onMarkerClick({ ...location, lat, lng, name, desc }) } // Optimistic update
                );
                notify.show('Location updated successfully', 'success');
            }
            this.renderList();
            cleanup();
        });
    }
    csvToJson(csv) {
        const lines = csv.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0)
            return [];
        // 1. Auto-Detect Delimiter (Cek baris pertama)
        const firstLine = lines[0];
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        // Pilih yang lebih banyak muncul
        const delimiter = semicolonCount > commaCount ? ';' : ',';
        // 2. Parse Headers
        const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"\r]+/g, ''));
        const hasHeader = headers.includes('lat') && headers.includes('lng');
        const dataRows = hasHeader ? lines.slice(1) : lines;
        return dataRows.map(line => {
            // Gunakan delimiter yang sudah dideteksi
            const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
            if (hasHeader) {
                const obj = {};
                headers.forEach((h, i) => {
                    // Hindari error jika values kurang dari headers
                    if (values[i] !== undefined) {
                        obj[h] = values[i];
                    }
                });
                return obj;
            }
            else {
                return {
                    name: values[0],
                    lat: values[1],
                    lng: values[2],
                    desc: values[3] || ''
                };
            }
        });
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
    setupSettings() {
        const btnSettings = document.getElementById('btn-settings');
        const settingsMenu = document.getElementById('settings-menu');
        const toggleDarkMode = document.getElementById('dark-mode-toggle');
        // Load Saved Theme
        // Load Saved Theme
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark';
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (toggleDarkMode)
                toggleDarkMode.checked = true;
        }
        // Tunggu map benar-benar loaded dengan handling race condition (via wrapper)
        this.map.onReady(() => {
            console.log('MapEngine Ready: syncing dark mode:', isDark);
            this.map.syncWithDarkMode(isDark);
        });
        // Toggle Menu
        if (btnSettings && settingsMenu) {
            console.log('Settings Setup: Elements found');
            btnSettings.addEventListener('click', (e) => {
                console.log('Settings Button Clicked!');
                e.stopPropagation();
                settingsMenu.classList.toggle('active');
                if (settingsMenu.classList.contains('active')) {
                    settingsMenu.classList.remove('hidden');
                }
                else {
                    // Small timeout to allow animation to play before hiding if we were doing display:none
                    // But here we rely on opacity, so just toggle active is mostly enough.
                    // However, user prompt explicitly mentioned 'hidden' class usage or start state.
                    // The CSS handles opacity. ensuring 'hidden' is removed when active is crucial if hidden does display:none.
                }
                btnSettings.classList.toggle('active');
            });
            // Close when clicking outside
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (!settingsMenu.contains(target) && !btnSettings.contains(target)) {
                    if (settingsMenu.classList.contains('active')) {
                        console.log('Closing settings menu (click outside)');
                        settingsMenu.classList.remove('active');
                        btnSettings.classList.remove('active');
                    }
                }
            });
        }
        else {
            console.error('Settings Setup: Buttons not found!');
        }
        // Toggle Dark Mode
        if (toggleDarkMode) {
            toggleDarkMode.addEventListener('change', () => {
                const isDark = toggleDarkMode.checked;
                if (isDark) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    localStorage.setItem('theme', 'dark');
                }
                else {
                    document.documentElement.removeAttribute('data-theme');
                    localStorage.setItem('theme', 'light');
                }
                this.map.syncWithDarkMode(isDark);
            });
        }
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
                this.map.flyTo({ lng, lat });
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
    setupScrollbarBehavior() {
        const scrollContainers = document.querySelectorAll('.panel-content');
        scrollContainers.forEach(container => {
            let isScrollingTimer;
            container.addEventListener('scroll', () => {
                container.classList.add('is-scrolling');
                window.clearTimeout(isScrollingTimer);
                isScrollingTimer = window.setTimeout(() => {
                    container.classList.remove('is-scrolling');
                }, 1500);
            });
        });
    }
    renderList() {
        const listEl = document.getElementById('location-list');
        if (!listEl)
            return;
        const locations = this.store.getAll();
        const groups = this.store.getGroups();
        if (locations.length === 0 && groups.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.5;">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <p style="margin: 0; font-weight: 500;">No saved locations</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.7;">Click the + button to save your first spot.</p>
                </div>
            `;
            return;
        }
        listEl.innerHTML = '';
        // --- DRAG & DROP HANDLERS ---
        const handleDragStart = (e) => {
            e.dataTransfer.setData('text/plain', e.target.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
            e.target.classList.add('dragging');
        };
        const handleDragEnd = (e) => {
            e.target.classList.remove('dragging');
        };
        const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // Ensure we target the header or drop zone, not children
            const target = e.currentTarget;
            if (target) {
                target.classList.add('drag-over');
            }
        };
        const handleDragLeave = (e) => {
            const target = e.currentTarget;
            // Check if we are really leaving the element, not just entering a child
            // relatedTarget is where the mouse went
            if (target && !target.contains(e.relatedTarget)) {
                target.classList.remove('drag-over');
            }
        };
        const handleDropGroup = (e) => {
            e.preventDefault();
            const header = e.currentTarget;
            header.classList.remove('drag-over');
            const locId = e.dataTransfer.getData('text/plain');
            const groupId = header.dataset.id;
            if (locId && groupId) {
                this.store.moveLocation(locId, groupId);
                this.renderList();
                notify.show('Location moved to folder', 'success');
            }
        };
        const handleDropUncategorized = (e) => {
            e.preventDefault();
            const zone = e.currentTarget;
            zone.classList.remove('drag-over');
            const locId = e.dataTransfer.getData('text/plain');
            if (locId) {
                this.store.moveLocation(locId, null); // Move to uncategorized
                this.renderList();
                notify.show('Removed from folder', 'success');
            }
        };
        // 1. Render Groups
        groups.forEach(group => {
            const groupLocs = locations.filter(l => l.groupId === group.id);
            const groupEl = document.createElement('div');
            groupEl.className = 'group-item';
            groupEl.innerHTML = `
                <div class="group-header js-toggle-group" data-id="${group.id}">
                    <div style="display:flex;align-items:center;gap:8px;flex:1;">
                        <svg class="folder-icon ${group.isCollapsed ? '' : 'open'}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        <span class="group-name">${group.name}</span>
                        <span style="font-size:12px;color:var(--text-secondary);opacity:0.7;">(${groupLocs.length})</span>
                    </div>
                    <div class="group-actions">
                        <button class="btn-icon-sm js-rename-group prop-stop" data-id="${group.id}" data-tooltip="Rename Folder">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-icon-sm js-delete-group prop-stop" data-id="${group.id}" data-tooltip="Delete Folder">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="group-content-wrapper ${group.isCollapsed ? '' : 'open'}" id="group-${group.id}">
                    <div class="group-content-inner">
                        ${groupLocs.map(loc => this.createLocationItemHTML(loc)).join('')}
                    </div>
                </div>
            `;
            listEl.appendChild(groupEl);
            // Allow Drop on Group Header
            const header = groupEl.querySelector('.group-header');
            if (header) {
                header.addEventListener('dragover', handleDragOver);
                header.addEventListener('dragleave', handleDragLeave);
                header.addEventListener('drop', handleDropGroup);
            }
        });
        // 2. Render Uncategorized
        const uncategorized = locations.filter(l => !l.groupId);
        if (uncategorized.length > 0) {
            const uncategorizedEl = document.createElement('div');
            uncategorizedEl.className = 'uncategorized-list';
            if (groups.length > 0) {
                uncategorizedEl.style.marginTop = '0px';
                uncategorizedEl.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
                uncategorizedEl.style.paddingTop = '6px';
            }
            uncategorizedEl.innerHTML = uncategorized.map(loc => this.createLocationItemHTML(loc)).join('');
            // Add Header for Uncategorized to act as Drop Zone
            const uncatHeader = document.createElement('div');
            uncatHeader.className = 'uncategorized-header';
            uncatHeader.textContent = 'Uncategorized';
            uncatHeader.style.padding = '8px 12px';
            uncatHeader.style.fontSize = '12px';
            uncatHeader.style.fontWeight = '600';
            uncatHeader.style.color = 'var(--text-secondary)';
            uncatHeader.style.textTransform = 'uppercase';
            uncatHeader.style.letterSpacing = '0.5px';
            // Make Uncategorized Header a Drop Zone
            uncatHeader.addEventListener('dragover', handleDragOver);
            uncatHeader.addEventListener('dragleave', handleDragLeave);
            uncatHeader.addEventListener('drop', handleDropUncategorized);
            if (uncategorizedEl.firstChild) {
                uncategorizedEl.insertBefore(uncatHeader, uncategorizedEl.firstChild);
            }
            else {
                uncategorizedEl.appendChild(uncatHeader);
            }
            listEl.appendChild(uncategorizedEl);
        }
        // Attach Event Listeners for Groups
        this.attachGroupListeners(listEl);
        // Attach Drag Events to Items
        listEl.querySelectorAll('.location-item').forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        });
    }
    createLocationItemHTML(loc) {
        return `
            <div class="location-item" draggable="true" data-id="${loc.id}">
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
        `;
    }
    attachGroupListeners(container) {
        // Toggle Collapse
        container.querySelectorAll('.js-toggle-group').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.target;
                if (target.closest('.prop-stop'))
                    return;
                const id = el.dataset.id;
                if (id) {
                    this.store.toggleGroupCollapse(id);
                    // Manual DOM Toggle for smooth animation
                    const groupWrapper = document.getElementById(`group-${id}`);
                    const icon = el.querySelector('.folder-icon');
                    if (groupWrapper) {
                        groupWrapper.classList.toggle('open');
                    }
                    if (icon) {
                        icon.classList.toggle('open');
                    }
                }
            });
        });
        // Rename Group
        container.querySelectorAll('.js-rename-group').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = el.dataset.id;
                const group = this.store.getGroups().find(g => g.id === id);
                if (group && id) {
                    this.showRenameGroupModal(group);
                }
            });
        });
        // Delete Group
        container.querySelectorAll('.js-delete-group').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = el.dataset.id;
                const group = this.store.getGroups().find(g => g.id === id);
                if (group && id) {
                    this.showDeleteGroupModal(group);
                }
            });
        });
    }
    setupModal() {
        const btnAdd = document.getElementById('btn-add');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                this.showLocationModal('add');
            });
        }
    }
    deleteLocation(id) {
        this.store.delete(id);
        this.map.removeMarker(id);
        this.renderList();
        notify.show('Location deleted', 'success');
    }
    editLocation(id) {
        const loc = this.store.getAll().find(l => l.id === id);
        if (loc) {
            this.showLocationModal('edit', loc);
            this.map.flyTo({ lng: loc.lng, lat: loc.lat });
        }
    }
    toggleVisibility(id) {
        const loc = this.store.getAll().find(l => l.id === id);
        if (loc) {
            loc.hidden = !loc.hidden;
            this.store.update(loc.id, { hidden: loc.hidden });
            if (loc.hidden) {
                this.map.removeMarker(id);
                notify.show('Location hidden', 'info');
            }
            else {
                this.map.addMarker(loc.id, { lng: loc.lng, lat: loc.lat }, { onClick: () => this.onMarkerClick(loc) });
                notify.show('Location visible', 'success');
            }
        }
    }
    onMarkerClick(location) {
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
        // Define close handler to reset state
        const handleClosePopup = () => {
            this.selectedLocation = null;
            const activeItem = document.querySelector('.location-item.active');
            if (activeItem) {
                activeItem.classList.remove('active');
            }
        };
        this.map.showPopup({ lng: location.lng, lat: location.lat }, popupHtml, handleClosePopup // Pass the close handler
        );
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

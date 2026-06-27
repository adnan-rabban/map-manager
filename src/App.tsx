import React, { useState, useEffect } from 'react';
import { 
    DndContext, 
    DragOverlay, 
    DragStartEvent, 
    DragEndEvent, 
    useSensor, 
    useSensors, 
    PointerSensor,
    TouchSensor
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { useMapStore } from './store/useMapStore.js';
import { MapViewer } from './features/map/components/MapViewer.js';
import { Sidebar } from './features/locations/components/Sidebar.js';
import { DirectionsPanel } from './features/navigation/components/DirectionsPanel.js';
import { ModalOverlay } from './features/locations/components/ModalOverlay.js';
import { SettingsMenu } from './features/map/components/SettingsMenu.js';
import { LayerPanel } from './features/map/components/LayerPanel.js';
import { LocationItem } from './features/locations/components/LocationItem.js';
import { CustomTooltip } from './components/tooltip.js';

export const App: React.FC = () => {
  const {
    locations,
    assignLocationToGroup,
    isSidebarOpen,
    setSidebarOpen,
    isNavigationOpen,
    setNavigationOpen,
    isLayersOpen,
    setLayersOpen,
    isSettingsOpen,
    setSettingsOpen,
    setAddModalOpen,
    theme,
    setTheme
  } = useMapStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState<number | undefined>(undefined);

  // Initialize Custom Tooltips and Local Theme on mount
  useEffect(() => {
    // Tooltips will auto-attach to [data-tooltip] elements
    new CustomTooltip();

    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme as 'light' | 'dark');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    if (active.data.current?.type === 'LOCATION') {
      const element = document.querySelector(`[data-id="${active.id}"]`) as HTMLElement;
      if (element) {
        setDragWidth(element.offsetWidth);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragWidth(undefined);

    if (!over) return;

    const activeLocation = locations.find(l => l.id === active.id);
    if (!activeLocation) return;

    if (over.data.current?.type === 'GROUP') {
      const targetGroupId = over.id as string;
      if (activeLocation.groupId !== targetGroupId) {
        assignLocationToGroup(activeLocation.id, targetGroupId);
      }
    } else if (over.data.current?.type === 'UNCATEGORIZED') {
      if (activeLocation.groupId !== undefined) {
        assignLocationToGroup(activeLocation.id, null);
      }
    }
  };

  const activeLocation = activeId ? locations.find(l => l.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div id="app" className={`panel-container ${!isSidebarOpen && isNavigationOpen ? 'collapsed-view' : ''}`}>
        
        {/* Background Map Viewer */}
        <MapViewer />

        {/* Sidebar Panel */}
        <Sidebar />

        {/* Directions Panel */}
        <DirectionsPanel />

        {/* Modals & Dialogs */}
        <ModalOverlay />
        <SettingsMenu />
        <LayerPanel />

        {/* Sidebar Open Toggle Button (Visible when sidebar is closed) */}
        {!isSidebarOpen && (
          <button
            id="btn-open-sidebar"
            className="btn-toggle-sidebar"
            onClick={() => setSidebarOpen(true)}
            data-tooltip="Open Sidebar"
            aria-label="Open Sidebar"
          >
            <div className="icon-panel-left-open-anim">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" className="icon-frame"></rect>
                <path d="M9 3v18" className="icon-sidebar-line"></path>
                <path d="m14 9 3 3-3 3" className="icon-chevron"></path>
              </svg>
            </div>
          </button>
        )}

        {/* Navigation Open Toggle Button */}
        <button
          id="btn-open-nav"
          className={`btn-toggle-nav ${isNavigationOpen ? 'active' : ''}`}
          onClick={() => setNavigationOpen(!isNavigationOpen)}
          data-tooltip="Directions"
          aria-label="Directions"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
        </button>

        {/* Layer Switcher Panel Toggle Button */}
        <button
          id="btn-layers"
          className={`btn-toggle-layers ${isLayersOpen ? 'active' : ''}`}
          onClick={() => setLayersOpen(!isLayersOpen)}
          data-tooltip="Map Layers"
          aria-label="Map Layers"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path className="icon-layers-path1" d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
            <path className="icon-layers-path2" d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
            <path className="icon-layers-path3" d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
          </svg>
        </button>

        {/* Settings Panel Toggle Button */}
        <button
          id="btn-settings"
          className={`btn-settings ${isSettingsOpen ? 'active' : ''}`}
          onClick={() => setSettingsOpen(!isSettingsOpen)}
          data-tooltip="Settings"
          aria-label="Settings"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path>
            <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
            <path d="M12 2v2"></path>
            <path d="M12 22v-2"></path>
            <path d="m17 20.66-1-1.73"></path>
            <path d="M11 10.27 7 3.34"></path>
            <path d="m20.66 17-1.73-1"></path>
            <path d="m3.34 7 1.73 1"></path>
            <path d="M14 12h8"></path>
            <path d="M2 12h2"></path>
            <path d="m20.66 7-1.73 1"></path>
            <path d="m3.34 17 1.73-1"></path>
            <path d="m17 3.34-1 1.73"></path>
            <path d="m11 13.73-4 6.93"></path>
          </svg>
        </button>

        {/* Floating Add Location Button */}
        <button
          id="btn-add"
          className="fab-add"
          onClick={() => setAddModalOpen(true)}
          data-tooltip="Add Location"
          aria-label="Add Location"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        {/* Notification Toast Container */}
        <div id="notification-container" className="notification-container"></div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeId && activeLocation ? (
          <LocationItem 
            location={activeLocation} 
            isOverlay 
            width={dragWidth}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
export default App;

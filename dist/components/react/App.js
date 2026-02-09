import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { LocationList } from './LocationList.js';
import { LocationItem } from './LocationItem.js';
export const App = ({ initialGroups, initialLocations, onAssignLocationToGroup, onFlyTo, onEdit, onDelete, onToggleVisibility, onDeleteGroup, onRenameGroup }) => {
    // Local state to keep UI snappy before sync with Store/Vanilla app
    // In a full React app, this would be the source of truth.
    // Here we might need to rely on props updating, but for drag visual we need local state or props.
    // NOTE: For this hybrid approach, we will rely on Props updates triggering re-renders, 
    // EXCEPT for the 'overlay' which needs immediate feedback.
    const [activeId, setActiveId] = useState(null);
    const [dragWidth, setDragWidth] = useState(undefined);
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5, // Prevent accidental drags on simple clicks
        },
    }), useSensor(TouchSensor, {
        activationConstraint: {
            delay: 250,
            tolerance: 5,
        }
    }));
    const handleDragStart = (event) => {
        const { active } = event;
        setActiveId(active.id);
        // Capture width of the dragged element
        if (active.data.current?.type === 'LOCATION') {
            const element = document.querySelector(`[data-id="${active.id}"]`);
            if (element) {
                setDragWidth(element.offsetWidth);
            }
        }
    };
    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        setDragWidth(undefined);
        console.log('[ReactApp] Drag End:', { active: active.id, over: over?.id });
        if (!over)
            return;
        const activeLocation = initialLocations.find(l => l.id === active.id);
        if (!activeLocation) {
            console.warn('[ReactApp] Active location not found in props:', active.id);
            return;
        }
        // Logic to determine where it was dropped
        // 1. Dropped on a Group
        if (over.data.current?.type === 'GROUP') {
            const targetGroupId = over.id;
            // Only update if changed
            if (activeLocation.groupId !== targetGroupId) {
                console.log('[ReactApp] Assigning to group:', targetGroupId);
                onAssignLocationToGroup(activeLocation, targetGroupId);
            }
        }
        // 2. Dropped on Uncategorized Zone
        else if (over.data.current?.type === 'UNCATEGORIZED') {
            if (activeLocation.groupId !== null && activeLocation.groupId !== undefined) {
                console.log('[ReactApp] Removing from group (Uncategorized)');
                onAssignLocationToGroup(activeLocation, null);
            }
        }
        else {
            console.log('[ReactApp] Dropped on unknown target:', over);
        }
    };
    const activeLocation = activeId ? initialLocations.find(l => l.id === activeId) : null;
    return (_jsxs(DndContext, { sensors: sensors, onDragStart: handleDragStart, onDragEnd: handleDragEnd, children: [_jsx(LocationList, { groups: initialGroups, locations: initialLocations, onFlyTo: onFlyTo, onEdit: onEdit, onDelete: onDelete, onToggleVisibility: onToggleVisibility, onDeleteGroup: onDeleteGroup, onRenameGroup: onRenameGroup }), _jsx(DragOverlay, { modifiers: [restrictToWindowEdges], children: activeId && activeLocation ? (_jsx(LocationItem, { location: activeLocation, isOverlay: true, width: dragWidth })) : null })] }));
};

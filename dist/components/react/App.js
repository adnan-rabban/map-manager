import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { LocationList } from './LocationList.js';
import { LocationItem } from './LocationItem.js';
export const App = ({ initialGroups, initialLocations, onAssignLocationToGroup, onFlyTo, onEdit, onDelete, onToggleVisibility, onDeleteGroup, onRenameGroup }) => {
    const [activeId, setActiveId] = useState(null);
    const [dragWidth, setDragWidth] = useState(undefined);
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
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
        if (!over)
            return;
        const activeLocation = initialLocations.find(l => l.id === active.id);
        if (!activeLocation) {
            console.warn('[ReactApp] Active location not found in props:', active.id);
            return;
        }
        if (over.data.current?.type === 'GROUP') {
            const targetGroupId = over.id;
            if (activeLocation.groupId !== targetGroupId) {
                onAssignLocationToGroup(activeLocation, targetGroupId);
            }
        }
        else if (over.data.current?.type === 'UNCATEGORIZED') {
            if (activeLocation.groupId !== null && activeLocation.groupId !== undefined) {
                onAssignLocationToGroup(activeLocation, null);
            }
        }
        else {
        }
    };
    const activeLocation = activeId ? initialLocations.find(l => l.id === activeId) : null;
    return (_jsxs(DndContext, { sensors: sensors, onDragStart: handleDragStart, onDragEnd: handleDragEnd, children: [_jsx(LocationList, { groups: initialGroups, locations: initialLocations, onFlyTo: onFlyTo, onEdit: onEdit, onDelete: onDelete, onToggleVisibility: onToggleVisibility, onDeleteGroup: onDeleteGroup, onRenameGroup: onRenameGroup }), _jsx(DragOverlay, { modifiers: [restrictToWindowEdges], children: activeId && activeLocation ? (_jsx(LocationItem, { location: activeLocation, isOverlay: true, width: dragWidth })) : null })] }));
};

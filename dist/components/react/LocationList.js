import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDroppable } from '@dnd-kit/core';
import { GroupItem } from './GroupItem.js';
import { LocationItem } from './LocationItem.js';
export const LocationList = ({ groups, locations, onFlyTo, onEdit, onDelete, onToggleVisibility, onDeleteGroup, onRenameGroup }) => {
    // Defines the "Uncategorized" drop zone (root level)
    const { setNodeRef, isOver } = useDroppable({
        id: 'uncategorized-zone',
        data: {
            type: 'UNCATEGORIZED',
            id: null // Represents null groupId
        }
    });
    // Separation of concerns: Grouped vs Uncategorized locations
    const groupedLocations = locations.filter(l => l.groupId);
    const uncategorizedLocations = locations.filter(l => !l.groupId);
    return (_jsxs("div", { className: "location-list-container", children: [_jsx("div", { className: "groups-section", children: groups.map(group => (_jsx(GroupItem, { group: group, locations: groupedLocations.filter(l => l.groupId === group.id), onFlyTo: onFlyTo, onEdit: onEdit, onDelete: onDelete, onToggleVisibility: onToggleVisibility, onDeleteGroup: onDeleteGroup, onRenameGroup: onRenameGroup }, group.id))) }), _jsx("hr", { style: { margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-color)' } }), _jsxs("div", { ref: setNodeRef, className: "uncategorized-section", style: {
                    minHeight: '100px',
                    backgroundColor: isOver ? 'rgba(0, 122, 255, 0.05)' : 'transparent',
                    borderRadius: '8px',
                    border: isOver ? '2px dashed var(--accent-color)' : '2px dashed transparent',
                    transition: 'all 0.2s ease',
                    padding: '8px'
                }, children: [_jsxs("div", { style: {
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }, children: ["Uncategorized (", uncategorizedLocations.length, ")"] }), uncategorizedLocations.length > 0 ? (uncategorizedLocations.map(loc => (_jsx(LocationItem, { location: loc, onFlyTo: onFlyTo, onEdit: onEdit, onDelete: onDelete, onToggleVisibility: onToggleVisibility }, loc.id)))) : (_jsx("div", { style: { padding: '20px', textAlign: 'center', color: '#ccc', fontStyle: 'italic' }, children: "Drop items here to remove from folder" }))] })] }));
};

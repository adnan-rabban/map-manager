import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { LocationItem } from './LocationItem.js';
export const GroupItem = ({ group, locations, onFlyTo, onEdit, onDelete, onToggleVisibility, onDeleteGroup, onRenameGroup }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: group.id,
        data: {
            type: 'GROUP',
            group
        }
    });
    const [isCollapsed, setIsCollapsed] = useState(group.isCollapsed || false);
    const style = {
        border: isOver ? '2px solid var(--accent-color)' : '1px solid transparent',
        backgroundColor: isOver ? 'rgba(0, 122, 255, 0.1)' : undefined,
        borderRadius: '8px',
        marginBottom: '8px',
        transition: 'all 0.2s ease',
    };
    return (_jsxs("div", { ref: setNodeRef, style: style, className: "group-item", children: [_jsxs("div", { className: "group-header", children: [_jsxs("div", { className: "group-title", onClick: () => setIsCollapsed(!isCollapsed), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 1 }, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: {
                                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                    marginRight: '8px'
                                }, children: _jsx("polyline", { points: "6 9 12 15 18 9" }) }), _jsx("span", { style: { fontWeight: 600 }, children: group.name }), _jsxs("span", { style: { fontSize: '12px', color: '#888', marginLeft: '8px' }, children: ["(", locations.length, ")"] })] }), _jsxs("div", { className: "group-actions", children: [_jsx("button", { className: "btn-icon-sm", onClick: (e) => { e.stopPropagation(); onRenameGroup(group); }, title: "Rename Folder", children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }) }), _jsx("button", { className: "btn-icon-sm", onClick: (e) => { e.stopPropagation(); onDeleteGroup(group); }, title: "Delete Folder", style: { color: '#ff4d4f' }, children: _jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }) }) })] })] }), !isCollapsed && (_jsx("div", { className: "group-content", style: { paddingLeft: '12px', marginTop: '8px' }, children: locations.length > 0 ? (locations.map(loc => (_jsx(LocationItem, { location: loc, onFlyTo: onFlyTo, onEdit: onEdit, onDelete: onDelete, onToggleVisibility: onToggleVisibility }, loc.id)))) : (_jsx("div", { style: { padding: '8px', fontSize: '12px', color: '#999', fontStyle: 'italic' }, children: "Empty folder" })) }))] }));
};

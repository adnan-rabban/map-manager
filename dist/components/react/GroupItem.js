import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { LocationItem } from './LocationItem.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Folder, FolderOpen, Edit, Trash2, Download } from 'lucide-react';
export const GroupItem = ({ group, locations, onFlyTo, onEdit, onDelete, onToggleVisibility, onDeleteGroup, onRenameGroup, onExportGroup, groups, onAssignLocationToGroup }) => {
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
        borderRadius: '12px',
        marginBottom: '8px',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
    };
    const springConfig = {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 1
    };
    return (_jsxs(motion.div, { ref: setNodeRef, style: style, className: "group-item", layout: "position", transition: springConfig, children: [_jsxs("div", { className: "group-header", children: [_jsxs("div", { className: "group-title", onClick: () => setIsCollapsed(!isCollapsed), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 1 }, children: [_jsx(motion.div, { animate: { rotate: isCollapsed ? -90 : 0 }, transition: { type: "spring", stiffness: 200, damping: 20 }, style: { display: 'flex', alignItems: 'center', marginRight: '8px' }, children: _jsx(ChevronDown, { size: 16 }) }), _jsx("div", { style: { marginRight: '8px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }, children: isCollapsed ? _jsx(Folder, { size: 16 }) : _jsx(FolderOpen, { size: 16 }) }), _jsx("span", { style: { fontWeight: 600 }, children: group.name }), _jsxs("span", { style: { fontSize: '12px', color: '#888', marginLeft: '8px' }, children: ["(", locations.length, ")"] })] }), _jsxs("div", { className: "group-actions", children: [_jsx("button", { className: "btn-icon-sm", onClick: (e) => { e.stopPropagation(); onRenameGroup(group); }, "data-tooltip": "Rename Folder", children: _jsx(Edit, { size: 14 }) }), _jsx("button", { className: "btn-icon-sm", onClick: (e) => { e.stopPropagation(); onExportGroup(group); }, "data-tooltip": "Export Folder", children: _jsx(Download, { size: 14 }) }), _jsx("button", { className: "btn-icon-sm", onClick: (e) => { e.stopPropagation(); onDeleteGroup(group); }, "data-tooltip": "Delete Folder", style: { color: '#ff4d4f' }, children: _jsx(Trash2, { size: 14 }) })] })] }), _jsx(AnimatePresence, { initial: false, children: !isCollapsed && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: springConfig, style: { overflow: 'hidden' }, children: _jsx("div", { style: { paddingLeft: '12px', paddingBottom: '12px', paddingRight: '4px' }, children: _jsx("div", { style: { marginTop: '8px' }, children: locations.length > 0 ? (locations.map(loc => (_jsx(LocationItem, { location: loc, onFlyTo: onFlyTo, onEdit: onEdit, onDelete: onDelete, onToggleVisibility: onToggleVisibility, groups: groups, onAssignLocationToGroup: onAssignLocationToGroup }, loc.id)))) : (_jsx("div", { style: { padding: '8px', fontSize: '12px', color: '#999', fontStyle: 'italic' }, children: "Empty folder" })) }) }) }, "content")) })] }));
};

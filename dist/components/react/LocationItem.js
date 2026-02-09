import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
export const LocationItem = ({ location, isOverlay, onFlyTo, onEdit, onDelete, onToggleVisibility }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: location.id,
        disabled: isOverlay, // Disable dragging capability for the overlay copy
        data: {
            type: 'LOCATION',
            location
        }
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);
    const style = {
        // Ghost style: When dragging (and NOT overlay), reduce opacity
        // If it IS overlay, forced opacity 1
        opacity: isOverlay ? 1 : (isDragging ? 0.3 : 1),
        // Overlay style: Lift effect
        transform: isOverlay ? 'scale(1.05)' : undefined,
        boxShadow: isOverlay ? '0 8px 24px rgba(0,0,0,0.2)' : undefined,
        cursor: isOverlay ? 'grabbing' : 'grab',
        zIndex: isOverlay ? 999 : undefined,
        // Only set background on overlay to prevent transparency issues
        // Otherwise let CSS handle the default background
        backgroundColor: isOverlay ? 'var(--card-bg)' : undefined,
        position: 'relative',
    };
    return (_jsxs("div", { ref: !isOverlay ? setNodeRef : undefined, ...(!isOverlay ? listeners : {}), ...(!isOverlay ? attributes : {}), className: `location-item ${isOverlay ? 'overlay-item' : ''}`, style: style, "data-id": location.id, children: [_jsxs("div", { className: "location-info", onClick: () => onFlyTo?.(location.id), children: [_jsx("h3", { children: location.name }), location.desc && _jsx("p", { children: location.desc })] }), _jsxs("div", { className: "location-actions", ref: menuRef, children: [_jsx("button", { className: "btn-icon-sm", onClick: (e) => { e.stopPropagation(); onToggleVisibility?.(location.id); }, "data-tooltip": location.hidden ? "Show on map" : "Hide from map", children: location.hidden ? (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }), _jsx("line", { x1: "1", y1: "1", x2: "23", y2: "23" })] })) : (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] })) }), _jsx("button", { className: `dropdown-btn ${isMenuOpen ? 'active' : ''}`, onClick: (e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }, "data-tooltip": "More options", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "1" }), _jsx("circle", { cx: "12", cy: "5", r: "1" }), _jsx("circle", { cx: "12", cy: "19", r: "1" })] }) }), _jsxs("div", { className: `location-actions-menu ${isMenuOpen ? 'open' : ''}`, children: [_jsxs("button", { className: "dropdown-item", onClick: (e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onEdit?.(location.id);
                                }, children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }), "Edit"] }), _jsxs("button", { className: "dropdown-item delete", onClick: (e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onDelete?.(location.id);
                                }, children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })] }), "Delete"] })] })] })] }));
};

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { Eye, EyeOff, MoreVertical, Edit, Trash2 } from 'lucide-react';
export const LocationItem = ({ location, isOverlay, width, onFlyTo, onEdit, onDelete, onToggleVisibility }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: location.id,
        disabled: isOverlay, // Disable dragging capability for the overlay copy
        data: {
            type: 'LOCATION',
            location
        }
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState(null);
    // Refs
    const menuRef = useRef(null);
    const triggerRef = useRef(null);
    // Handlers
    const closeMenu = () => {
        setIsVisible(false);
        setTimeout(() => {
            setIsMenuOpen(false);
            setMenuPosition(null);
        }, 200); // Match CSS transition duration
    };
    const toggleMenu = (e) => {
        e.stopPropagation();
        if (isMenuOpen) {
            closeMenu();
            return;
        }
        // Calculate position
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const MENU_HEIGHT = 100; // Approximate height of menu (2 items + padding)
            // Check if there is space below
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpwards = spaceBelow < MENU_HEIGHT;
            if (openUpwards) {
                // Open UPWARDS
                setMenuPosition({
                    // Position above button (approximate height)
                    top: rect.top - 90,
                    // Move menu to the RIGHT of the button so it doesn't cover card
                    left: rect.left + 5
                });
            }
            else {
                // Open DOWNWARDS (Default)
                setMenuPosition({
                    top: rect.bottom + 8,
                    // Move menu to the RIGHT of the button so it doesn't cover card
                    left: rect.left + 5
                });
            }
            setIsMenuOpen(true);
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        }
    };
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target) &&
                triggerRef.current && !triggerRef.current.contains(event.target)) {
                closeMenu();
            }
        };
        const handleScroll = () => {
            if (isMenuOpen)
                closeMenu();
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, { capture: true });
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, { capture: true });
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
        // Fix width when dragging out of context
        width: width ? `${width}px` : undefined,
        // Prevent distractions while dragging
        userSelect: isOverlay ? 'none' : undefined,
        touchAction: 'none', // ALWAYS prevent browser pan/scroll on the item itself
        borderRadius: '12px', // Ensure rounded corners are consistent
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { ref: !isOverlay ? setNodeRef : undefined, ...(!isOverlay ? listeners : {}), ...(!isOverlay ? attributes : {}), className: `location-item ${isOverlay ? 'overlay-item' : ''}`, style: style, "data-id": location.id, children: [_jsxs("div", { className: "location-info", onClick: () => onFlyTo?.(location.id), children: [_jsx("h3", { children: location.name }), location.desc && _jsx("p", { children: location.desc })] }), _jsxs("div", { className: "location-actions", children: [_jsx("button", { className: "btn-icon-sm", onClick: (e) => { e.stopPropagation(); onToggleVisibility?.(location.id); }, "data-tooltip": location.hidden ? "Show on map" : "Hide from map", children: location.hidden ? (_jsx(EyeOff, { size: 14 })) : (_jsx(Eye, { size: 14 })) }), _jsx("button", { ref: triggerRef, className: `dropdown-btn ${isMenuOpen ? 'active' : ''}`, onClick: toggleMenu, "data-tooltip": "More options", children: _jsx(MoreVertical, { size: 16 }) })] })] }), isMenuOpen && menuPosition && createPortal(_jsxs("div", { ref: menuRef, className: `location-actions-menu ${isVisible ? 'visible' : ''}`, style: {
                    position: 'fixed',
                    top: menuPosition.top,
                    left: menuPosition.left,
                    zIndex: 9999,
                }, children: [_jsxs("button", { className: "dropdown-item", onClick: (e) => {
                            e.stopPropagation();
                            closeMenu();
                            onEdit?.(location.id);
                        }, children: [_jsx(Edit, { size: 14, style: { marginRight: '8px' } }), "Edit"] }), _jsxs("button", { className: "dropdown-item delete", onClick: (e) => {
                            e.stopPropagation();
                            closeMenu();
                            onDelete?.(location.id);
                        }, children: [_jsx(Trash2, { size: 14, style: { marginRight: '8px' } }), "Delete"] })] }), document.body)] }));
};

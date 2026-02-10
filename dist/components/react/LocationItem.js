import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { Eye, EyeOff, MoreVertical, Edit, Trash2 } from "lucide-react";
export const LocationItem = ({ location, isOverlay, width, onFlyTo, onEdit, onDelete, onToggleVisibility, }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: location.id,
        disabled: isOverlay,
        data: {
            type: "LOCATION",
            location,
        },
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
        }, 200);
    };
    const toggleMenu = (e) => {
        e.stopPropagation();
        if (isMenuOpen) {
            closeMenu();
            return;
        }
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const MENU_HEIGHT = 100;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpwards = spaceBelow < MENU_HEIGHT;
            if (openUpwards) {
                setMenuPosition({
                    top: rect.top - 90,
                    left: rect.left + 5,
                });
            }
            else {
                setMenuPosition({
                    top: rect.bottom + 8,
                    left: rect.left + 5,
                });
            }
            setIsMenuOpen(true);
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        }
    };
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current &&
                !menuRef.current.contains(event.target) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target)) {
                closeMenu();
            }
        };
        const handleScroll = () => {
            if (isMenuOpen)
                closeMenu();
        };
        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("scroll", handleScroll, { capture: true });
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, { capture: true });
        };
    }, [isMenuOpen]);
    const style = {
        opacity: isOverlay ? 1 : isDragging ? 0.3 : 1,
        transform: isOverlay ? "scale(1.05)" : undefined,
        boxShadow: isOverlay ? "0 8px 24px rgba(0,0,0,0.2)" : undefined,
        cursor: isOverlay ? "grabbing" : "grab",
        zIndex: isOverlay ? 999 : undefined,
        backgroundColor: isOverlay ? "var(--card-bg)" : undefined,
        position: "relative",
        width: width ? `${width}px` : undefined,
        userSelect: isOverlay ? "none" : undefined,
        touchAction: "none",
        borderRadius: "12px",
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { ref: !isOverlay ? setNodeRef : undefined, ...(!isOverlay ? listeners : {}), ...(!isOverlay ? attributes : {}), className: `location-item ${isOverlay ? "overlay-item" : ""}`, style: style, "data-id": location.id, children: [_jsxs("div", { className: "location-info", onClick: () => onFlyTo?.(location.id), children: [_jsx("h3", { children: location.name }), location.desc && _jsx("p", { children: location.desc })] }), _jsxs("div", { className: "location-actions", children: [_jsx("button", { className: "btn-icon-sm", onClick: (e) => {
                                    e.stopPropagation();
                                    onToggleVisibility?.(location.id);
                                }, "data-tooltip": location.hidden ? "Show on map" : "Hide from map", children: location.hidden ? _jsx(EyeOff, { size: 14 }) : _jsx(Eye, { size: 14 }) }), _jsx("button", { ref: triggerRef, className: `dropdown-btn ${isMenuOpen ? "active" : ""}`, onClick: toggleMenu, "data-tooltip": "More options", children: _jsx(MoreVertical, { size: 16 }) })] })] }), isMenuOpen &&
                menuPosition &&
                createPortal(_jsxs("div", { ref: menuRef, className: `location-actions-menu ${isVisible ? "visible" : ""}`, style: {
                        position: "fixed",
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 9999,
                    }, children: [_jsxs("button", { className: "dropdown-item", onClick: (e) => {
                                e.stopPropagation();
                                closeMenu();
                                onEdit?.(location.id);
                            }, children: [_jsx(Edit, { size: 14, style: { marginRight: "8px" } }), "Edit"] }), _jsx("div", { className: "dropdown-divider" }), _jsxs("button", { className: "dropdown-item delete", onClick: (e) => {
                                e.stopPropagation();
                                closeMenu();
                                onDelete?.(location.id);
                            }, children: [_jsx(Trash2, { size: 14, style: { marginRight: "8px" } }), "Delete"] })] }), document.body)] }));
};

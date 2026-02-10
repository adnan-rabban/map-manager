import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { Eye, EyeOff, MoreVertical, Edit, Trash2, ChevronRight, Folder, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
const MenuItem = ({ id, icon: Icon, label, onClick, isDanger = false, hasSubmenu = false, isHovered, onMouseEnter, children, layoutId }) => {
    return (_jsxs("div", { className: "dropdown-item-wrapper", onMouseEnter: onMouseEnter, style: { position: 'relative' }, children: [_jsxs("button", { className: `dropdown-item ${isDanger ? 'delete' : ''}`, onClick: (e) => {
                    if (!hasSubmenu) {
                        e.stopPropagation();
                        onClick?.(e);
                    }
                }, style: {
                    position: 'relative',
                    zIndex: 10,
                    background: 'transparent',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: isHovered && isDanger ? '#ffffff' : (isDanger ? '#ff3b30' : 'var(--text-primary)')
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center' }, children: [_jsx(Icon, { size: 14, style: { marginRight: "8px" } }), label] }), hasSubmenu && _jsx(ChevronRight, { size: 14 })] }), isHovered && (_jsx(motion.div, { layoutId: layoutId, style: {
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: isDanger ? '#ff3b30' : 'var(--hover-highlight)',
                    borderRadius: '6px',
                    zIndex: 0
                }, transition: { type: "spring", stiffness: 300, damping: 30 } })), _jsx(AnimatePresence, { children: hasSubmenu && isHovered && children })] }));
};
export const LocationItem = ({ location, isOverlay, width, onFlyTo, onEdit, onDelete, onToggleVisibility, groups = [], onAssignLocationToGroup, }) => {
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
    const [hoveredMainItem, setHoveredMainItem] = useState(null);
    const [hoveredSubItem, setHoveredSubItem] = useState(null);
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
            setHoveredMainItem(null);
            setHoveredSubItem(null);
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
    const handleMoveToGroup = (groupId) => {
        onAssignLocationToGroup?.(location, groupId);
        closeMenu();
    };
    return (_jsxs(_Fragment, { children: [_jsxs(motion.div, { layoutId: location.id, ref: !isOverlay ? setNodeRef : undefined, ...(!isOverlay ? listeners : {}), ...(!isOverlay ? attributes : {}), className: `location-item ${isOverlay ? "overlay-item" : ""}`, style: style, "data-id": location.id, children: [_jsxs("div", { className: "location-info", onClick: () => onFlyTo?.(location.id), children: [_jsx("h3", { children: location.name }), location.desc && _jsx("p", { children: location.desc })] }), _jsxs("div", { className: "location-actions", children: [_jsx("button", { className: "btn-icon-sm", onClick: (e) => {
                                    e.stopPropagation();
                                    onToggleVisibility?.(location.id);
                                }, "data-tooltip": location.hidden ? "Show on map" : "Hide from map", children: location.hidden ? _jsx(EyeOff, { size: 14 }) : _jsx(Eye, { size: 14 }) }), _jsx("button", { ref: triggerRef, className: `dropdown-btn ${isMenuOpen ? "active" : ""}`, onClick: toggleMenu, "data-tooltip": "More options", children: _jsx(MoreVertical, { size: 16 }) })] })] }), isMenuOpen &&
                menuPosition &&
                createPortal(_jsx("div", { ref: menuRef, className: `location-actions-menu ${isVisible ? "visible" : ""}`, style: {
                        position: "fixed",
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 9999,
                        padding: '4px',
                        overflow: 'visible'
                    }, onMouseLeave: () => {
                        setHoveredMainItem(null);
                        setHoveredSubItem(null);
                    }, onPointerDown: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation(), onClick: (e) => e.stopPropagation(), children: _jsxs("div", { style: { position: 'relative' }, children: [_jsx(MenuItem, { id: "edit", icon: Edit, label: "Edit", onClick: () => {
                                    closeMenu();
                                    onEdit?.(location.id);
                                }, isHovered: hoveredMainItem === "edit", onMouseEnter: () => setHoveredMainItem("edit"), layoutId: `main-menu-highlight-${location.id}` }), _jsx(MenuItem, { id: "move-to", icon: Folder, label: "Move to", hasSubmenu: true, isHovered: hoveredMainItem === "move-to", onMouseEnter: () => setHoveredMainItem("move-to"), layoutId: `main-menu-highlight-${location.id}`, children: _jsx(motion.div, { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -10 }, transition: { duration: 0.15 }, style: {
                                        position: 'absolute',
                                        top: 0,
                                        left: '100%',
                                        paddingLeft: '8px',
                                        zIndex: 10000,
                                        height: '100%',
                                    }, children: _jsxs("div", { className: "location-submenu-card", style: { minWidth: '180px' }, children: [_jsxs("div", { className: "submenu-grid", children: [_jsxs("div", { style: { position: 'relative' }, onMouseEnter: () => setHoveredSubItem('uncategorized'), children: [_jsxs("button", { className: "dropdown-item", onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    handleMoveToGroup(null);
                                                                }, style: { position: 'relative', zIndex: 10, width: '100%', background: 'transparent', color: 'var(--text-primary)' }, children: [_jsx(Folder, { size: 14, style: { marginRight: "8px", opacity: 0.5 } }), "Uncategorized"] }), hoveredSubItem === 'uncategorized' && (_jsx(motion.div, { layoutId: `submenu-highlight-${location.id}`, style: {
                                                                    position: 'absolute',
                                                                    inset: 0,
                                                                    backgroundColor: 'var(--hover-highlight)',
                                                                    borderRadius: '6px',
                                                                    zIndex: 0
                                                                } }))] }), groups.map(group => (_jsxs("div", { style: { position: 'relative' }, onMouseEnter: () => setHoveredSubItem(group.id), children: [_jsxs("button", { className: "dropdown-item", onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    handleMoveToGroup(group.id);
                                                                }, style: { position: 'relative', zIndex: 10, width: '100%', background: 'transparent', color: 'var(--text-primary)' }, children: [_jsx(Folder, { size: 14, style: { marginRight: "8px", color: 'var(--accent-color)' } }), group.name] }), hoveredSubItem === group.id && (_jsx(motion.div, { layoutId: `submenu-highlight-${location.id}`, style: {
                                                                    position: 'absolute',
                                                                    inset: 0,
                                                                    backgroundColor: 'var(--hover-highlight)',
                                                                    borderRadius: '6px',
                                                                    zIndex: 0
                                                                } }))] }, group.id)))] }), _jsx("div", { className: "dropdown-divider", style: { margin: '4px 0', backgroundColor: 'var(--divider-color)' } }), _jsxs(motion.button, { whileHover: {
                                                    backgroundColor: "rgba(37, 99, 235, 0.1)",
                                                    color: "#2563eb",
                                                }, onMouseEnter: () => setHoveredSubItem(null), onClick: (e) => {
                                                    e.stopPropagation();
                                                    // Placeholder for add folder logic
                                                    console.log("Add folder clicked");
                                                }, style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 12px',
                                                    fontSize: '13px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    width: '100%',
                                                    justifyContent: 'center',
                                                    color: 'var(--text-secondary)',
                                                    fontWeight: 500,
                                                    marginTop: '2px',
                                                    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' // Match other items transition
                                                }, children: [_jsx(Plus, { size: 14, style: { marginRight: "6px" } }), "Add Folder"] })] }) }) }), _jsx("div", { className: "dropdown-divider", style: { margin: '4px 0' } }), _jsx(MenuItem, { id: "delete", icon: Trash2, label: "Delete", isDanger: true, onClick: () => {
                                    closeMenu();
                                    onDelete?.(location.id);
                                }, isHovered: hoveredMainItem === "delete", onMouseEnter: () => setHoveredMainItem("delete"), layoutId: `main-menu-highlight-${location.id}` })] }) }), document.body)] }));
};

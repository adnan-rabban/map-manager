import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { Location, Group } from "../../types/types";
import { Eye, EyeOff, MoreVertical, Edit, Trash2, ChevronRight, Folder, Plus, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LocationItemProps {
  location: Location;
  isOverlay?: boolean;
  width?: number;
  onFlyTo?: (id: string) => void;
  onEdit?: (id: string, updates?: Partial<Location>) => void;
  onDelete?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  groups?: Group[];
  onAssignLocationToGroup?: (location: Location, groupId: string | null) => void;
  selectedLocationId?: string | null;
}

const MenuItem = ({
  id,
  icon: Icon,
  label,
  onClick,
  isDanger = false,
  hasSubmenu = false,
  isHovered,
  onMouseEnter,
  children,
  layoutId
}: {
  id: string;
  icon: any;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  isDanger?: boolean;
  hasSubmenu?: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  children?: React.ReactNode;
  layoutId: string;
}) => {
  return (
    <div
      className="dropdown-item-wrapper"
      onMouseEnter={onMouseEnter}
      style={{ position: 'relative' }}
    >
      <button
        className={`dropdown-item ${isDanger ? 'delete' : ''}`}
        onClick={(e) => {
          if (!hasSubmenu) {
            e.stopPropagation();
            onClick?.(e);
          }
        }}
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'transparent',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: isHovered && isDanger ? '#ffffff' : (isDanger ? '#ff3b30' : 'var(--text-primary)')
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Icon size={14} style={{ marginRight: "8px" }} />
          {label}
        </div>
        {hasSubmenu && <ChevronRight size={14} />}
      </button>

      {isHovered && (
        <motion.div
          layoutId={layoutId} 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: isDanger ? '#ff3b30' : 'var(--hover-highlight)',
            borderRadius: '6px',
            zIndex: 0
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      <AnimatePresence>
        {hasSubmenu && isHovered && children}
      </AnimatePresence>
    </div>
  );
};

export const LocationItem: React.FC<LocationItemProps> = ({
  location,
  isOverlay,
  width,
  onFlyTo,
  onEdit,
  onDelete,
  onToggleVisibility,
  groups = [],
  onAssignLocationToGroup,
  selectedLocationId
}) => {
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
  const [hoveredMainItem, setHoveredMainItem] = useState<string | null>(null);
  const [hoveredSubItem, setHoveredSubItem] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Refs
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const toggleMenu = (e: React.MouseEvent) => {
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
      } else {
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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    const handleScroll = () => {
      if (isMenuOpen) closeMenu();
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

  const style: React.CSSProperties = {
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

  const handleMoveToGroup = (groupId: string | null) => {
    onAssignLocationToGroup?.(location, groupId);
    closeMenu();
  };

  const elementRef = useRef<HTMLDivElement | null>(null);

  const setCombinedRef = (node: HTMLDivElement | null) => {
    if (!isOverlay) {
        setNodeRef(node);
    }
    elementRef.current = node;
  };

  const isSelected = selectedLocationId === location.id;

  useEffect(() => {
    if (isSelected && elementRef.current) {
        elementRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

  return (
    <>
      <motion.div
        layoutId={isOverlay ? undefined : location.id}
        ref={setCombinedRef}
        {...(!isOverlay ? listeners : {})}
        {...(!isOverlay ? attributes : {})}
        className={`location-item ${isOverlay ? "overlay-item" : ""} ${isSelected ? "active" : ""}`}
        style={style}
        data-id={location.id}
      >
        <div className="location-info" onClick={() => onFlyTo?.(location.id)}>
          <h3>{location.name}</h3>
          {location.desc && <p>{location.desc}</p>}
        </div>

        <div className="location-actions">
          <button
            className="btn-icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility?.(location.id);
            }}
            data-tooltip={location.hidden ? "Show on map" : "Hide from map"}
          >
            {location.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          <button
            ref={triggerRef}
            className={`dropdown-btn ${isMenuOpen ? "active" : ""}`}
            onClick={toggleMenu}
            data-tooltip="More options"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </motion.div>

      {isMenuOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className={`location-actions-menu ${isVisible ? "visible" : ""}`}
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 9999,
              padding: '4px',
              overflow: 'visible'
            }}
            onMouseLeave={() => {
              setHoveredMainItem(null);
              setHoveredSubItem(null);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'relative' }}>
              <MenuItem
                id="color"
                icon={Palette}
                label="Change Color"
                hasSubmenu={true}
                isHovered={hoveredMainItem === "color"}
                onMouseEnter={() => setHoveredMainItem("color")}
                layoutId={`main-menu-highlight-${location.id}`}
              >
                  <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '100%',
                    paddingLeft: '8px',
                    zIndex: 10000,
                    height: '100%',
                  }}
                >
                  <div 
                    className="location-submenu-card"
                    style={{ minWidth: '160px', padding: '8px' }}
                  >
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {[
                            "#007AFF", // Blue (Default)
                            "#FF3B30", // Red
                            "#34C759", // Green
                            "#FF9500", // Orange
                            "#AF52DE", // Purple
                            "#5856D6", // Indigo
                            "#FF2D55", // Pink
                            "#5AC8FA", // Teal
                        ].map((color) => (
                            <button
                                key={color}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit?.(location.id, { color }); // Re-using onEdit for now or add specific prop
                                    closeMenu();
                                }}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: color,
                                    border: location.color === color ? '2px solid white' : 'none',
                                    boxShadow: location.color === color ? '0 0 0 2px #007AFF' : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                                title={color}
                            />
                        ))}
                     </div>
                  </div>
                </motion.div>
              </MenuItem>
            
              <MenuItem
                id="edit"
                icon={Edit}
                label="Edit"
                onClick={() => {
                  closeMenu();
                  onEdit?.(location.id);
                }}
                isHovered={hoveredMainItem === "edit"}
                onMouseEnter={() => setHoveredMainItem("edit")}
                layoutId={`main-menu-highlight-${location.id}`}
              />

              <MenuItem
                id="move-to"
                icon={Folder}
                label="Move to"
                hasSubmenu={true}
                isHovered={hoveredMainItem === "move-to"}
                onMouseEnter={() => setHoveredMainItem("move-to")}
                layoutId={`main-menu-highlight-${location.id}`}
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '100%',
                    paddingLeft: '8px',
                    zIndex: 10000,
                    height: '100%',
                  }}
                >
                  <div 
                    className="location-submenu-card"
                    style={{ minWidth: '180px' }}
                  >
                    <div className="submenu-grid">
                      <div
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setHoveredSubItem('uncategorized')}
                      >
                        <button
                          className="dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToGroup(null);
                          }}
                          style={{ position: 'relative', zIndex: 10, width: '100%', background: 'transparent', color: 'var(--text-primary)' }}
                        >
                          <Folder size={14} style={{ marginRight: "8px", opacity: 0.5 }} />
                          Uncategorized
                        </button>
                        {hoveredSubItem === 'uncategorized' && (
                          <motion.div
                            layoutId={`submenu-highlight-${location.id}`}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'var(--hover-highlight)',
                              borderRadius: '6px',
                              zIndex: 0
                            }}
                          />
                        )}
                      </div>

                      {groups.map(group => (
                        <div
                          key={group.id}
                          style={{ position: 'relative' }}
                          onMouseEnter={() => setHoveredSubItem(group.id)}
                        >
                          <button
                            className="dropdown-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToGroup(group.id);
                            }}
                            style={{ position: 'relative', zIndex: 10, width: '100%', background: 'transparent', color: 'var(--text-primary)' }}
                          >
                            <Folder size={14} style={{ marginRight: "8px", color: 'var(--accent-color)' }} />
                            {group.name}
                          </button>
                          {hoveredSubItem === group.id && (
                            <motion.div
                              layoutId={`submenu-highlight-${location.id}`}
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'var(--hover-highlight)',
                                borderRadius: '6px',
                                zIndex: 0
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="dropdown-divider" style={{ margin: '4px 0', backgroundColor: 'var(--divider-color)' }} />

                    <motion.button
                      whileHover={{ 
                        backgroundColor: "rgba(37, 99, 235, 0.1)", 
                        color: "#2563eb",
                      }}
                      onMouseEnter={() => setHoveredSubItem(null)} // Clear previous hover state
                      onClick={(e) => {
                        e.stopPropagation();
                        // Placeholder for add folder logic
                        console.log("Add folder clicked");
                      }}
                      style={{ 
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
                      }}
                    >
                      <Plus size={14} style={{ marginRight: "6px" }} />
                      Add Folder
                    </motion.button>

                  </div>
                </motion.div>
              </MenuItem>

              <div className="dropdown-divider" style={{ margin: '4px 0' }} />

              <MenuItem
                id="delete"
                icon={Trash2}
                label="Delete"
                isDanger
                onClick={() => {
                  closeMenu();
                  onDelete?.(location.id);
                }}
                isHovered={hoveredMainItem === "delete"}
                onMouseEnter={() => setHoveredMainItem("delete")}
                layoutId={`main-menu-highlight-${location.id}`}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

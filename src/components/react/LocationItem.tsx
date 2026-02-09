import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { Location } from '../../types/types';
import { Eye, EyeOff, MoreVertical, Edit, Trash2 } from 'lucide-react';

interface LocationItemProps {
    location: Location;
    isOverlay?: boolean;
    width?: number; // Optional width override for drag overlay
    onFlyTo?: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onToggleVisibility?: (id: string) => void;
}

export const LocationItem: React.FC<LocationItemProps> = ({ 
    location, 
    isOverlay, 
    width,
    onFlyTo, 
    onEdit, 
    onDelete, 
    onToggleVisibility 
}) => {
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
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
    
    // Refs
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Handlers
    const closeMenu = () => {
        setIsVisible(false);
        setTimeout(() => {
            setIsMenuOpen(false);
            setMenuPosition(null);
        }, 200); // Match CSS transition duration
    };

    const toggleMenu = (e: React.MouseEvent) => {
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
            } else {
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
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)
            ) {
                closeMenu();
            }
        };

        const handleScroll = () => {
             if (isMenuOpen) closeMenu();
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

    const style: React.CSSProperties = {
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

    return (
        <>
            <div 
                ref={!isOverlay ? setNodeRef : undefined} 
                {...(!isOverlay ? listeners : {})} 
                {...(!isOverlay ? attributes : {})} 
                className={`location-item ${isOverlay ? 'overlay-item' : ''}`}
                style={style}
                data-id={location.id} 
            >
                <div className="location-info" onClick={() => onFlyTo?.(location.id)}>
                    <h3>{location.name}</h3>
                    {location.desc && <p>{location.desc}</p>}
                </div>
                
                <div className="location-actions">
                    {/* Toggle Visibility */}
                    <button 
                        className="btn-icon-sm" 
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(location.id); }}
                        data-tooltip={location.hidden ? "Show on map" : "Hide from map"}
                    >
                        {location.hidden ? (
                            <EyeOff size={14} />
                        ) : (
                            <Eye size={14} />
                        )}
                    </button>

                    {/* Dropdown Menu Trigger */}
                    <button 
                        ref={triggerRef}
                        className={`dropdown-btn ${isMenuOpen ? 'active' : ''}`}
                        onClick={toggleMenu}
                        data-tooltip="More options"
                    >
                        <MoreVertical size={16} />
                    </button>
                {/* Dropdown Content */}
                {/* Note: render logic moved to Portal below */}
            </div>
        </div>

            {/* Portal for Dropdown Menu */}
            {isMenuOpen && menuPosition && createPortal(
                <div 
                    ref={menuRef}
                    className={`location-actions-menu ${isVisible ? 'visible' : ''}`}
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 9999,
                    }}
                >
                    <button 
                        className="dropdown-item" 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            closeMenu(); 
                            onEdit?.(location.id); 
                        }}
                    >
                        <Edit size={14} style={{ marginRight: '8px' }} />
                        Edit
                    </button>
                    <button 
                        className="dropdown-item delete" 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            closeMenu(); 
                            onDelete?.(location.id); 
                        }}
                    >
                        <Trash2 size={14} style={{ marginRight: '8px' }} />
                        Delete
                    </button>
                </div>,
                document.body
            )}
        </>
    );
};

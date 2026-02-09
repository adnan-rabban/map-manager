import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Location } from '../../types/types';

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
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
        touchAction: isOverlay ? 'none' : undefined,
    };

    return (
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
            
            <div className="location-actions" ref={menuRef}>
                {/* Toggle Visibility (Always Visible) */}
                <button 
                    className="btn-icon-sm" 
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(location.id); }}
                    data-tooltip={location.hidden ? "Show on map" : "Hide from map"}
                >
                    {location.hidden ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                </button>

                {/* Dropdown Menu Trigger */}
                <button 
                    className={`dropdown-btn ${isMenuOpen ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                    data-tooltip="More options"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>

                {/* Dropdown Content */}
                <div className={`location-actions-menu ${isMenuOpen ? 'open' : ''}`}>
                    <button 
                        className="dropdown-item" 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsMenuOpen(false); 
                            onEdit?.(location.id); 
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Edit
                    </button>
                    <button 
                        className="dropdown-item delete" 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsMenuOpen(false); 
                            onDelete?.(location.id); 
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

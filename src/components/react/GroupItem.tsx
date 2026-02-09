import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Group, Location } from '../../types/types';
import { LocationItem } from './LocationItem.js';

interface GroupItemProps {
    group: Group;
    locations: Location[];
    onFlyTo: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onDeleteGroup: (group: Group) => void;
    onRenameGroup: (group: Group) => void;
}

export const GroupItem: React.FC<GroupItemProps> = ({ 
    group, 
    locations, 
    onFlyTo, 
    onEdit, 
    onDelete, 
    onToggleVisibility,
    onDeleteGroup,
    onRenameGroup
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: group.id,
        data: {
            type: 'GROUP',
            group
        }
    });

    const [isCollapsed, setIsCollapsed] = useState(group.isCollapsed || false);

    const style: React.CSSProperties = {
        border: isOver ? '2px solid var(--accent-color)' : '1px solid transparent',
        backgroundColor: isOver ? 'rgba(0, 122, 255, 0.1)' : undefined,
        borderRadius: '8px',
        marginBottom: '8px',
        transition: 'all 0.2s ease',
    };

    return (
        <div ref={setNodeRef} style={style} className="group-item">
            <div className="group-header">
                <div 
                    className="group-title" 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 1 }}
                >
                    <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        style={{ 
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            marginRight: '8px'
                        }}
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span style={{ fontWeight: 600 }}>{group.name}</span>
                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>({locations.length})</span>
                </div>
                
                <div className="group-actions">
                     <button 
                        className="btn-icon-sm"
                        onClick={(e) => { e.stopPropagation(); onRenameGroup(group); }}
                        title="Rename Folder"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button 
                        className="btn-icon-sm"
                        onClick={(e) => { e.stopPropagation(); onDeleteGroup(group); }}
                        title="Delete Folder"
                        style={{ color: '#ff4d4f' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="group-content" style={{ paddingLeft: '12px', marginTop: '8px' }}>
                    {locations.length > 0 ? (
                        locations.map(loc => (
                            <LocationItem 
                                key={loc.id} 
                                location={loc}
                                onFlyTo={onFlyTo} 
                                onEdit={onEdit} 
                                onDelete={onDelete} 
                                onToggleVisibility={onToggleVisibility}
                            />
                        ))
                    ) : (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                            Empty folder
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

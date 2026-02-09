import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Group, Location } from '../../types/types';
import { LocationItem } from './LocationItem.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Folder, FolderOpen, Edit, Trash2 } from 'lucide-react';

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
        borderRadius: '12px',
        marginBottom: '8px',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
    };

const springConfig = {
    type: "spring" as const,
    stiffness: 300, 
    damping: 30,
    mass: 1
};

return (
    <motion.div 
        ref={setNodeRef} 
        style={style} 
        className="group-item"
        layout="position"
        transition={springConfig}
    >
        <div className="group-header">
            <div 
                className="group-title" 
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 1 }}
            >
                <motion.div
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }} 
                    style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}
                >
                    <ChevronDown size={16} />
                </motion.div>
                
                <div style={{ marginRight: '8px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    {isCollapsed ? <Folder size={16} /> : <FolderOpen size={16} />}
                </div>

                <span style={{ fontWeight: 600 }}>{group.name}</span>
                <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>({locations.length})</span>
            </div>
            
            <div className="group-actions">
                 <button 
                    className="btn-icon-sm"
                    onClick={(e) => { e.stopPropagation(); onRenameGroup(group); }}
                    data-tooltip="Rename Folder"
                >
                    <Edit size={14} />
                </button>
                <button 
                    className="btn-icon-sm"
                    onClick={(e) => { e.stopPropagation(); onDeleteGroup(group); }}
                    data-tooltip="Delete Folder"
                    style={{ color: '#ff4d4f' }}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>

        <AnimatePresence initial={false}>
            {!isCollapsed && (
                <motion.div 
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={springConfig}
                    style={{ overflow: 'hidden' }}
                >
                    <div style={{ paddingLeft: '12px', paddingBottom: '12px', paddingRight: '4px' }}>
                        <div style={{ marginTop: '8px' }}>
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
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
    );
};

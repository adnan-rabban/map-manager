import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Group, Location } from '../../types/types';
import { GroupItem } from './GroupItem.js';
import { LocationItem } from './LocationItem.js';

interface LocationListProps {
    groups: Group[];
    locations: Location[];
    onFlyTo: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onDeleteGroup: (group: Group) => void;
    onRenameGroup: (group: Group) => void;
}

export const LocationList: React.FC<LocationListProps> = ({
    groups,
    locations,
    onFlyTo,
    onEdit,
    onDelete,
    onToggleVisibility,
    onDeleteGroup,
    onRenameGroup
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'uncategorized-zone',
        data: {
            type: 'UNCATEGORIZED',
            id: null
        }
    });

    const groupedLocations = locations.filter(l => l.groupId);
    const uncategorizedLocations = locations.filter(l => !l.groupId);

    return (
        <div className="location-list" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="groups-section">
                {groups.map(group => (
                    <GroupItem 
                        key={group.id} 
                        group={group} 
                        locations={groupedLocations.filter(l => l.groupId === group.id)}
                        onFlyTo={onFlyTo}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggleVisibility={onToggleVisibility}
                        onDeleteGroup={onDeleteGroup}
                        onRenameGroup={onRenameGroup}
                    />
                ))}
            </div>



            <div 
                ref={setNodeRef} 
                className={`uncategorized-list ${isOver ? 'drag-over' : ''}`}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}
            >
                {groups.length > 0 && (
                    <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)', 
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        padding: '0 8px'
                    }}>
                        Uncategorized ({uncategorizedLocations.length})
                    </div>
                )}

                {uncategorizedLocations.length > 0 ? (
                    uncategorizedLocations.map(loc => (
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
                    <div style={{ padding: '20px', textAlign: 'center', color: '#ccc', fontStyle: 'italic' }}>
                        Drop items here to remove from folder
                    </div>
                )}
            </div>
        </div>
    );
};

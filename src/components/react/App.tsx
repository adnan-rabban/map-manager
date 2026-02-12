import React, { useState } from 'react';
import { 
    DndContext, 
    DragOverlay, 
    DragStartEvent, 
    DragEndEvent, 
    useSensor, 
    useSensors, 
    PointerSensor,
    TouchSensor
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { LocationList } from './LocationList.js';
import { LocationItem } from './LocationItem.js';
import { Group, Location } from '../../types/types';

interface AppProps {
    initialGroups: Group[];
    initialLocations: Location[];
    onAssignLocationToGroup: (item: Location, groupId: string | null) => void;
    onFlyTo: (id: string) => void;
    onEdit: (id: string, updates?: Partial<Location>) => void;
    onDelete: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onDeleteGroup: (group: Group) => void;
    onRenameGroup: (group: Group) => void;
}

export const App: React.FC<AppProps> = ({
    initialGroups,
    initialLocations,
    onAssignLocationToGroup,
    onFlyTo,
    onEdit,
    onDelete,
    onToggleVisibility,
    onDeleteGroup,
    onRenameGroup
}) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragWidth, setDragWidth] = useState<number | undefined>(undefined);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
             activationConstraint: {
                delay: 250,
                tolerance: 5,
             }
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        
        if (active.data.current?.type === 'LOCATION') {
             const element = document.querySelector(`[data-id="${active.id}"]`) as HTMLElement;
             if (element) {
                 setDragWidth(element.offsetWidth);
             }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setDragWidth(undefined);
        


        if (!over) return;

        const activeLocation = initialLocations.find(l => l.id === active.id);
        if (!activeLocation) {
            console.warn('[ReactApp] Active location not found in props:', active.id);
            return;
        }

        if (over.data.current?.type === 'GROUP') {
             const targetGroupId = over.id as string;
             if (activeLocation.groupId !== targetGroupId) {

                 onAssignLocationToGroup(activeLocation, targetGroupId);
             }
        }
        else if (over.data.current?.type === 'UNCATEGORIZED') {
             if (activeLocation.groupId !== null && activeLocation.groupId !== undefined) {

                 onAssignLocationToGroup(activeLocation, null);
             }
        }
        else {

        }
    };
    
    const activeLocation = activeId ? initialLocations.find(l => l.id === activeId) : null;

    return (
        <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
        >
            <LocationList 
                groups={initialGroups}
                locations={initialLocations}
                onFlyTo={onFlyTo}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleVisibility={onToggleVisibility}
                onDeleteGroup={onDeleteGroup}
                onRenameGroup={onRenameGroup}
                onAssignLocationToGroup={onAssignLocationToGroup}
            />

            <DragOverlay modifiers={[restrictToWindowEdges]}>
                {activeId && activeLocation ? (
                    <LocationItem 
                        location={activeLocation} 
                        isOverlay 
                        width={dragWidth}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

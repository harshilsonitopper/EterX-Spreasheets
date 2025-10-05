import React, { useState, useEffect, useRef } from 'react';
import { Sheet } from '../types.ts';
import { vibrate } from '../utils/haptics.ts';

interface SheetTabsProps {
    sheets: Sheet[];
    activeSheetIndex: number;
    onAddSheet: () => void;
    onSwitchSheet: (index: number) => void;
    onRenameSheet: (index: number, newName: string) => void;
    onDeleteSheet: (index: number) => void;
}

const SheetTab: React.FC<{
    sheet: Sheet;
    index: number;
    isActive: boolean;
    onSwitchSheet: (index: number) => void;
    onRename: (index: number, name: string) => void;
    onDelete: (index: number) => void;
}> = ({ sheet, index, isActive, onSwitchSheet, onRename, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draftName, setDraftName] = useState(sheet.name);
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const tabRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleRename = () => {
        if (draftName.trim()) {
            onRename(index, draftName.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleRename();
        else if (e.key === 'Escape') setIsEditing(false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
    };

    const handleDelete = () => {
        vibrate([10, 20, 30]);
        onDelete(index);
    }
    
    const handleSwitch = () => {
        vibrate(20);
        onSwitchSheet(index);
    }

    useEffect(() => {
        const closeMenu = () => setMenuPosition(null);
        if (menuPosition) {
            window.addEventListener('click', closeMenu);
        }
        return () => window.removeEventListener('click', closeMenu);
    }, [menuPosition]);

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="px-4 h-full bg-bg-tertiary text-text-primary outline-none border-b-2 border-accent-primary"
            />
        );
    }

    return (
        <>
            <button
                ref={tabRef}
                onClick={handleSwitch}
                onDoubleClick={() => setIsEditing(true)}
                onContextMenu={handleContextMenu}
                className={`px-4 h-full rounded-t-lg font-medium transition-colors relative ${
                    isActive
                        ? 'border-b-2 border-accent-primary text-accent-primary bg-bg-secondary/70'
                        : 'text-text-secondary hover:bg-bg-tertiary/70'
                }`}
            >
                {sheet.name}
            </button>
            {menuPosition && (
                <div
                    style={{ top: menuPosition.y, left: menuPosition.x }}
                    className="fixed z-50 bg-bg-tertiary/80 backdrop-blur-lg border border-border-primary/50 rounded-lg shadow-2xl w-40 text-sm text-text-secondary animate-fade-in py-1"
                >
                    <button onClick={() => setIsEditing(true)} className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary/70 rounded-md">Rename</button>
                    <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary/70 rounded-md">Delete</button>
                </div>
            )}
        </>
    );
};

const SheetTabs: React.FC<SheetTabsProps> = ({ sheets, activeSheetIndex, onAddSheet, onSwitchSheet, onRenameSheet, onDeleteSheet }) => {
    const handleAdd = () => {
        vibrate();
        onAddSheet();
    };

    return (
        <div className="h-8 bg-transparent flex items-center px-2 flex-shrink-0">
            <div className="flex items-center text-sm h-full">
                {sheets.map((sheet, index) => (
                    <SheetTab
                        key={sheet.id}
                        sheet={sheet}
                        index={index}
                        isActive={index === activeSheetIndex}
                        onSwitchSheet={onSwitchSheet}
                        onRename={onRenameSheet}
                        onDelete={onDeleteSheet}
                    />
                ))}
                <button onClick={handleAdd} className="p-2 ml-1 text-text-muted hover:bg-bg-tertiary/70 rounded-full text-lg leading-none" title="Add Sheet">+</button>
            </div>
        </div>
    );
};

export default SheetTabs;
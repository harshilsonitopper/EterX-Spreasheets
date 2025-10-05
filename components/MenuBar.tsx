import React, { useState, useEffect, useRef } from 'react';
import { EterXLogoIcon, MenuIcon, XIcon, GridIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, SortAscendingIcon, SortDescendingIcon } from './icons.tsx';
import { ContextMenuAction } from './ContextMenu.tsx';


interface MenuBarProps {
    onNewSheet: () => void;
    onSaveSheet: () => void;
    onOpenSheet: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onExportCsv: () => void;
    onContextMenuAction: (action: ContextMenuAction) => void;
}

const Menu: React.FC<{ title: string; children?: React.ReactNode; disabled?: boolean; isOpen: boolean; onToggle: () => void; onOpen: () => void; }> = ({ title, children, disabled, isOpen, onToggle, onOpen }) => {
    return (
        <li className="relative" onMouseLeave={onToggle}>
            <button 
                onClick={onToggle}
                onMouseEnter={onOpen}
                className={`px-3 py-1 rounded-lg transition-all duration-200 ${isOpen ? 'bg-bg-tertiary/70 text-text-primary' : 'hover:bg-bg-tertiary/70 text-text-secondary hover:text-text-primary'} ${disabled ? 'text-text-muted/50 cursor-not-allowed' : ''}`}
                disabled={disabled}
            >
                {title}
            </button>
            {isOpen && !disabled && (
                <div 
                    className="absolute top-full left-0 mt-1.5 bg-bg-secondary/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg z-50 w-56 py-1.5"
                    onClick={onToggle}
                 >
                    {children}
                </div>
            )}
        </li>
    );
};

const MenuItem: React.FC<{ onClick?: () => void; children: React.ReactNode; disabled?: boolean; shortcut?: string, icon?: React.ReactNode }> = ({ onClick, children, disabled, shortcut, icon }) => (
    <button onClick={onClick} disabled={disabled} className="w-full text-left px-3 py-1.5 hover:bg-bg-tertiary/70 hover:text-text-primary disabled:text-text-muted/50 disabled:bg-transparent transition-colors flex justify-between items-center text-sm rounded-md mx-1">
        <span className="flex items-center gap-2">
            {icon && <span className="w-4 h-4">{icon}</span>}
            <span>{children}</span>
        </span>
        {shortcut && <span className="text-xs text-text-muted">{shortcut}</span>}
    </button>
);

const MobileMenu: React.FC<MenuBarProps & {onClose: () => void}> = ({onClose, ...props}) => (
    <div className="fixed inset-0 bg-black/40 z-[100]" onClick={onClose}>
        <div className="bg-bg-secondary w-64 h-full p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                    <EterXLogoIcon className="w-6 h-6"/>
                    <span className="font-title font-semibold text-text-primary">EterX Sheets</span>
                </div>
                <button onClick={onClose}><XIcon /></button>
            </div>
            <div className="text-sm text-text-secondary space-y-1">
                <h3 className="px-3 pt-2 pb-1 text-xs font-semibold text-text-muted">File</h3>
                <MenuItem onClick={props.onNewSheet}>New Workbook</MenuItem>
                <MenuItem onClick={() => document.getElementById('file-input-mobile')?.click()}>Open...</MenuItem>
                <MenuItem onClick={props.onSaveSheet}>Save As...</MenuItem>
                <MenuItem onClick={props.onExportCsv}>Export as CSV</MenuItem>
                <div className="h-px bg-border-primary/50 my-2"></div>
                <h3 className="px-3 pt-2 pb-1 text-xs font-semibold text-text-muted">Edit</h3>
                <MenuItem onClick={() => props.onContextMenuAction('cut')}>Cut</MenuItem>
                <MenuItem onClick={() => props.onContextMenuAction('copy')}>Copy</MenuItem>
                <MenuItem onClick={() => props.onContextMenuAction('paste')}>Paste</MenuItem>
            </div>
        </div>
    </div>
);

const MenuBar: React.FC<MenuBarProps> = ({ onNewSheet, onSaveSheet, onOpenSheet, onExportCsv, onContextMenuAction }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleOpenClick = () => fileInputRef.current?.click();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const handleMenuToggle = (title: string) => {
        setOpenMenu(prev => (prev === title ? null : title));
    };
    
    const handleMenuOpen = (title: string) => {
        if (openMenu !== null && openMenu !== title) {
            setOpenMenu(title);
        }
    };
    
    const handleMenuClose = () => {
        setOpenMenu(null);
    }
    
    const menus = [
        { 
            title: 'File', 
            children: <>
                <MenuItem onClick={onNewSheet} shortcut="Ctrl+N">New Workbook</MenuItem>
                <MenuItem onClick={handleOpenClick} shortcut="Ctrl+O">Open... (JSON)</MenuItem>
                <MenuItem onClick={onSaveSheet} shortcut="Ctrl+S">Save As... (JSON)</MenuItem>
                <div className="h-px bg-border-primary/50 my-1 mx-1"></div>
                <MenuItem onClick={onExportCsv}>Export as CSV</MenuItem>
            </>
        },
        { 
            title: 'Edit', 
            children: <>
                 <MenuItem onClick={() => onContextMenuAction('cut')} shortcut="Ctrl+X">Cut</MenuItem>
                <MenuItem onClick={() => onContextMenuAction('copy')} shortcut="Ctrl+C">Copy</MenuItem>
                <MenuItem onClick={() => onContextMenuAction('paste')} shortcut="Ctrl+V">Paste</MenuItem>
                <div className="h-px bg-border-primary/50 my-1 mx-1"></div>
                <MenuItem onClick={() => onContextMenuAction('clear_content')}>Clear Content</MenuItem>
            </>
        },
        { 
            title: 'Insert', 
            children: <>
                <MenuItem onClick={() => onContextMenuAction('insert_row_above')}>Row Above</MenuItem>
                <MenuItem onClick={() => onContextMenuAction('insert_row_below')}>Row Below</MenuItem>
                <MenuItem onClick={() => onContextMenuAction('delete_row')}>Delete Row</MenuItem>
                <div className="h-px bg-border-primary/50 my-1 mx-1"></div>
                <MenuItem onClick={() => onContextMenuAction('insert_col_left')}>Column Left</MenuItem>
                <MenuItem onClick={() => onContextMenuAction('insert_col_right')}>Column Right</MenuItem>
                <MenuItem onClick={() => onContextMenuAction('delete_col')}>Delete Column</MenuItem>
            </>
        },
        { 
            title: 'Format', 
            children: <>
                 <MenuItem onClick={() => onContextMenuAction('style_align_left')} icon={<AlignLeftIcon className="w-4 h-4"/>}>Align Left</MenuItem>
                 <MenuItem onClick={() => onContextMenuAction('style_align_center')} icon={<AlignCenterIcon className="w-4 h-4"/>}>Align Center</MenuItem>
                 <MenuItem onClick={() => onContextMenuAction('style_align_right')} icon={<AlignRightIcon className="w-4 h-4"/>}>Align Right</MenuItem>
                 <div className="h-px bg-border-primary/50 my-1 mx-1"></div>
                 <MenuItem onClick={() => onContextMenuAction('style_bold')} shortcut="Ctrl+B">Bold</MenuItem>
                 <MenuItem onClick={() => onContextMenuAction('style_italic')} shortcut="Ctrl+I">Italic</MenuItem>
                 <MenuItem onClick={() => onContextMenuAction('style_underline')} shortcut="Ctrl+U">Underline</MenuItem>
            </>
        },
        { 
            title: 'Data', 
            children: <>
                <MenuItem onClick={() => onContextMenuAction('sort_asc')} icon={<SortAscendingIcon className="w-4 h-4"/>}>Sort Selection A-Z</MenuItem>
                <MenuItem onClick={() => onContextMenuAction('sort_desc')} icon={<SortDescendingIcon className="w-4 h-4"/>}>Sort Selection Z-A</MenuItem>
            </>
        },
    ];


    return (
        <nav className="h-10 flex items-center px-2 flex-shrink-0 justify-between md:justify-start">
            <input id="file-input-desktop" type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onOpenSheet} />
            <input id="file-input-mobile" type="file" className="hidden" accept=".json" onChange={onOpenSheet} />

            <div className="flex items-center gap-2 mr-4">
              <EterXLogoIcon className="w-6 h-6"/>
              <span className="font-title font-semibold text-text-primary text-lg">EterX Sheets</span>
            </div>
            
            {/* Desktop Menu */}
            <ul className="hidden md:flex items-center text-sm gap-1" onMouseLeave={handleMenuClose}>
                {menus.map(menu => (
                    <Menu 
                        key={menu.title}
                        title={menu.title} 
                        disabled={!menu.children}
                        isOpen={openMenu === menu.title}
                        onToggle={() => handleMenuToggle(menu.title)}
                        onOpen={() => handleMenuOpen(menu.title)}
                    >
                       {menu.children}
                    </Menu>
                ))}
            </ul>
            
            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center gap-2">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded hover:bg-bg-tertiary text-text-secondary">
                  <MenuIcon />
              </button>
            </div>
            
            {isMobileMenuOpen && <MobileMenu {...{ onNewSheet, onSaveSheet, onOpenSheet, onExportCsv, onContextMenuAction }} onClose={() => setIsMobileMenuOpen(false)} />}
        </nav>
    );
};

export default MenuBar;
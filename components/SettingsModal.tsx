import React, { useState } from 'react';
import { XIcon, PaletteIcon, GridIcon, InfoIcon } from './icons.tsx';
import { themes } from '../themes.ts';
import { Theme } from '../types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange: (theme: Theme) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState('appearance');

  if (!isOpen) return null;

  const TabButton: React.FC<{ id: string; title: string; icon: React.ReactNode }> = ({ id, title, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
        activeTab === id ? 'bg-bg-tertiary text-text-primary font-semibold' : 'hover:bg-bg-tertiary/70 text-text-secondary'
      }`}
    >
      {icon}
      <span>{title}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={onClose}>
      <div 
        className="bg-bg-secondary/70 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-2xl border border-white/10 flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="w-1/3 border-r border-white/10 p-4 bg-black/10">
            <div className="flex items-center mb-6 px-2">
                <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
            </div>
            <nav className="space-y-1">
                <TabButton id="appearance" title="Appearance" icon={<PaletteIcon className="w-5 h-5" />} />
                <TabButton id="spreadsheet" title="Spreadsheet" icon={<GridIcon className="w-5 h-5" />} />
                <TabButton id="about" title="About" icon={<InfoIcon className="w-5 h-5" />} />
            </nav>
        </aside>
        <main className="w-2/3">
            <header className="flex justify-end items-center p-4 h-14">
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-bg-tertiary/70">
                    <XIcon className="text-text-muted" />
                </button>
            </header>
            <div className="p-6 h-[calc(100%-3.5rem)] overflow-y-auto">
                {activeTab === 'appearance' && (
                    <div>
                        <h3 className="text-base font-medium text-text-primary mb-3">Theme</h3>
                        <p className="text-xs text-text-muted mb-4">Choose a theme to customize the look and feel of your workspace.</p>
                        <div className="grid grid-cols-2 gap-4">
                            {themes.map(theme => (
                                <button key={theme.id} onClick={() => onThemeChange(theme)} className="p-3 border border-border-primary/50 rounded-lg hover:border-accent-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent-primary bg-bg-primary/50">
                                    <span className="text-sm text-text-primary font-medium">{theme.name}</span>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="w-5 h-5 rounded-full border border-border-primary" style={{backgroundColor: theme.colors['--color-bg-primary']}}></div>
                                        <div className="w-5 h-5 rounded-full border border-border-primary" style={{backgroundColor: theme.colors['--color-bg-secondary']}}></div>
                                        <div className="w-5 h-5 rounded-full border border-border-primary" style={{backgroundColor: theme.colors['--color-accent-primary']}}></div>
                                        <div className="w-5 h-5 rounded-full border border-border-primary" style={{backgroundColor: theme.colors['--color-text-primary']}}></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'spreadsheet' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-base font-medium text-text-primary mb-2">Grid Density</h3>
                            <p className="text-xs text-text-muted mb-3">Adjust the spacing of cells in the grid.</p>
                             <div className="flex gap-2 text-sm">
                                <label className="flex-1 p-2 border border-border-primary/50 bg-bg-primary/50 rounded-lg text-center cursor-pointer has-[:checked]:bg-bg-tertiary has-[:checked]:border-accent-primary transition-colors">
                                    <input type="radio" name="density" value="compact" className="sr-only" />
                                    Compact
                                </label>
                                <label className="flex-1 p-2 border border-border-primary/50 bg-bg-primary/50 rounded-lg text-center cursor-pointer has-[:checked]:bg-bg-tertiary has-[:checked]:border-accent-primary transition-colors">
                                    <input type="radio" name="density" value="default" className="sr-only" defaultChecked />
                                    Default
                                </label>
                                <label className="flex-1 p-2 border border-border-primary/50 bg-bg-primary/50 rounded-lg text-center cursor-pointer has-[:checked]:bg-bg-tertiary has-[:checked]:border-accent-primary transition-colors">
                                    <input type="radio" name="density" value="comfortable" className="sr-only" />
                                    Comfortable
                                </label>
                            </div>
                        </div>
                         <div>
                            <h3 className="text-base font-medium text-text-primary mb-2">Formula Engine</h3>
                             <div className="flex items-center justify-between bg-bg-primary/50 p-3 rounded-lg border border-border-primary/50">
                               <div>
                                 <p className="text-sm font-medium text-text-primary">High-Precision Mode</p>
                                 <p className="text-xs text-text-muted">Uses a more precise engine for complex calculations (coming soon).</p>
                               </div>
                               <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer opacity-50" disabled/>
                                    <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-bg-tertiary cursor-pointer"></label>
                                </div>
                             </div>
                        </div>
                    </div>
                )}
                {activeTab === 'about' && (
                     <div className="text-sm text-text-secondary space-y-3">
                        <h3 className="text-base font-medium text-text-primary mb-2">About EterX Sheets</h3>
                        <p>EterX Sheets is an intelligent spreadsheet application powered by cutting-edge AI. Analyze, visualize, and manipulate your data with the power of natural language.</p>
                        <p>Version: 1.0.0 (Pre-release)</p>
                        <p>&copy; {new Date().getFullYear()} EterX. All rights reserved.</p>
                    </div>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsModal;
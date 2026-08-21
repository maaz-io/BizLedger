
import React, { useState } from 'react';
import {
  Settings as SettingsIcon, Store, User, CurrencyIcon, Shield, Database,
  Download, Upload, Trash2, Moon, Sun, Save, Lock, Unlock, Eye, EyeOff,
  CheckCircle2, Building2, Phone, MapPin, Percent, ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react';
import { AppSettings } from '../types';
import ConfirmDialog from './ui/ConfirmDialog';

interface SettingsProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onExportData: () => void;
  onImportData: (json: string) => void;
  onClearData: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type SettingsTab = 'business' | 'display' | 'pos' | 'security' | 'data';

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onExportData, onImportData, onClearData, onToast }) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');
  const [showPin, setShowPin] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pinInput, setPinInput] = useState(settings.pinLock || '');
  const [isDirty, setIsDirty] = useState(false);

  const update = (patch: Partial<AppSettings>) => {
    setLocal(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave({ ...local, pinLock: pinInput.length === 4 ? pinInput : null });
    setIsDirty(false);
    onToast('Settings saved successfully!', 'success');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = ev.target?.result as string;
          JSON.parse(json); // validate
          onImportData(json);
          onToast('Data imported successfully!', 'success');
        } catch {
          onToast('Invalid backup file. Please select a valid JSON file.', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'business', label: 'Business', icon: <Building2 size={16} /> },
    { id: 'display', label: 'Display', icon: <Sun size={16} /> },
    { id: 'pos', label: 'POS / Sales', icon: <Store size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
    { id: 'data', label: 'Data', icon: <Database size={16} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Configure your business preferences</p>
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none animate-bounce-in"
          >
            <Save size={16} />
            Save Changes
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6">

        {/* Business Info */}
        {activeTab === 'business' && (
          <div className="space-y-5 animate-fade-in">
            <SectionHeader icon={<Building2 size={18} />} title="Business Information" />
            <FormField label="Business Name" icon={<Store size={16} />}>
              <input
                className="settings-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={local.businessName}
                onChange={e => update({ businessName: e.target.value })}
              />
            </FormField>
            <FormField label="Address" icon={<MapPin size={16} />}>
              <input
                className="settings-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={local.businessAddress}
                onChange={e => update({ businessAddress: e.target.value })}
                placeholder="Store address (shown on receipts)"
              />
            </FormField>
            <FormField label="Phone Number" icon={<Phone size={16} />}>
              <input
                className="settings-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={local.businessPhone}
                onChange={e => update({ businessPhone: e.target.value })}
                placeholder="+92 300 0000000"
              />
            </FormField>
            <FormField label="Currency Symbol" icon={<CurrencyIcon size={16} />}>
              <input
                className="settings-input dark:bg-slate-700 dark:border-slate-600 dark:text-white max-w-[140px]"
                value={local.currencySymbol}
                onChange={e => update({ currencySymbol: e.target.value })}
                placeholder="Rs."
              />
            </FormField>
          </div>
        )}

        {/* Display */}
        {activeTab === 'display' && (
          <div className="space-y-5 animate-fade-in">
            <SectionHeader icon={<Sun size={18} />} title="Display & Theme" />
            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
              <div className="flex items-center gap-3">
                {local.theme === 'dark' ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-amber-500" />}
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {local.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Toggle the application theme</p>
                </div>
              </div>
              <button
                onClick={() => update({ theme: local.theme === 'dark' ? 'light' : 'dark' })}
                className={`w-12 h-6 rounded-full transition-all relative ${local.theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${local.theme === 'dark' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        )}

        {/* POS Settings */}
        {activeTab === 'pos' && (
          <div className="space-y-5 animate-fade-in">
            <SectionHeader icon={<Store size={18} />} title="POS & Sales Configuration" />
            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">Enable Tax</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Apply GST/tax automatically on each sale</p>
              </div>
              <button
                onClick={() => update({ taxEnabled: !local.taxEnabled })}
                className={`transition-colors ${local.taxEnabled ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                {local.taxEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>
            {local.taxEnabled && (
              <FormField label="Tax Rate (%)" icon={<Percent size={16} />}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  className="settings-input dark:bg-slate-700 dark:border-slate-600 dark:text-white max-w-[140px]"
                  value={local.taxRate}
                  onChange={e => update({ taxRate: parseFloat(e.target.value) || 0 })}
                />
              </FormField>
            )}
            <FormField label="Default Low Stock Alert Qty">
              <input
                type="number"
                min={0}
                className="settings-input dark:bg-slate-700 dark:border-slate-600 dark:text-white max-w-[140px]"
                value={local.defaultLowStockThreshold}
                onChange={e => update({ defaultLowStockThreshold: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          </div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <div className="space-y-5 animate-fade-in">
            <SectionHeader icon={<Shield size={18} />} title="Security & Access" />
            <div className="p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 mb-2">
                {pinInput.length === 4 ? <Lock size={18} className="text-indigo-600" /> : <Unlock size={18} className="text-slate-400" />}
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">PIN Lock</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Set a 4-digit PIN to protect the app on startup</p>
                </div>
              </div>
              <div className="relative max-w-[180px]">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  placeholder="Enter 4-digit PIN"
                  className="settings-input dark:bg-slate-700 dark:border-slate-600 dark:text-white tracking-widest text-xl text-center"
                  value={pinInput}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPinInput(v);
                    setIsDirty(true);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pinInput && pinInput.length < 4 && (
                <p className="text-xs text-amber-600">PIN must be exactly 4 digits</p>
              )}
              {pinInput.length === 4 && (
                <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> PIN set. Don't forget it!</p>
              )}
              {pinInput.length === 0 && settings.pinLock && (
                <button
                  onClick={() => { setPinInput(''); setIsDirty(true); }}
                  className="text-xs text-rose-500 font-semibold"
                >
                  Remove PIN Lock
                </button>
              )}
            </div>
          </div>
        )}

        {/* Data Management */}
        {activeTab === 'data' && (
          <div className="space-y-4 animate-fade-in">
            <SectionHeader icon={<Database size={18} />} title="Data Management" />

            <DataAction
              icon={<Download size={18} className="text-emerald-600" />}
              title="Export Backup"
              description="Download all your data as a JSON backup file"
              btnLabel="Export Now"
              btnClass="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
              onClick={onExportData}
            />

            <DataAction
              icon={<Upload size={18} className="text-blue-600" />}
              title="Import Backup"
              description="Restore data from a previously exported JSON file"
              btnLabel="Choose File"
              btnClass="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
              onClick={handleImport}
            />

            <div className="border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl mt-0.5">
                    <Trash2 size={18} className="text-rose-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">Clear All Data</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Permanently delete all products and sales. This cannot be undone.</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmClear(true)}
                  className="shrink-0 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      {isDirty && (
        <div className="fixed bottom-8 right-8 z-50 no-print animate-bounce-in">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-2xl shadow-indigo-400/30 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmClear}
        title="Clear All Data?"
        message="This will permanently delete ALL products and sales from both shops. This action cannot be undone. Make sure to export a backup first."
        confirmLabel="Yes, Delete Everything"
        variant="danger"
        onConfirm={() => { onClearData(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />

      <style>{`
        .settings-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: white;
        }
        .settings-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
      `}</style>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
    <div className="text-indigo-600 dark:text-indigo-400">{icon}</div>
    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">{title}</h3>
  </div>
);

const FormField: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
      {icon && <span className="text-slate-400">{icon}</span>}
      {label}
    </label>
    {children}
  </div>
);

const DataAction: React.FC<{ icon: React.ReactNode; title: string; description: string; btnLabel: string; btnClass: string; onClick: () => void }> = ({
  icon, title, description, btnLabel, btnClass, onClick
}) => (
  <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl gap-4">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-white dark:bg-slate-600 rounded-xl shadow-sm">{icon}</div>
      <div>
        <p className="font-semibold text-slate-800 dark:text-white">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
    <button onClick={onClick} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${btnClass}`}>
      {btnLabel}
    </button>
  </div>
);

export default Settings;

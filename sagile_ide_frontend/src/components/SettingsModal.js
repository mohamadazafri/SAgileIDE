import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const SettingsModal = ({ isOpen, onClose }) => {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    // Apply all settings
    Object.keys(localSettings).forEach((key) => {
      updateSetting(key, localSettings[key]);
    });
    onClose();
  };

  const handleCancel = () => {
    // Reset local settings to current saved settings
    setLocalSettings(settings);
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings({
      fontSize: 14,
      tabSize: 2,
      wordWrap: false,
      autoSaveDelay: 2000,
    });
  };

  const handleChange = (key, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="fas fa-cog"></i>
            Editor Settings
          </h2>
          <button className="modal-close-btn" onClick={handleCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Font Size Setting */}
          <div className="setting-group">
            <label className="setting-label">
              <i className="fas fa-text-height"></i>
              Font Size
            </label>
            <div className="setting-control">
              <input
                type="range"
                min="10"
                max="20"
                value={localSettings.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                className="setting-slider"
              />
              <span className="setting-value">{localSettings.fontSize}px</span>
            </div>
            <p className="setting-description">Adjust the editor font size (10-20px)</p>
          </div>

          {/* Tab Size Setting */}
          <div className="setting-group">
            <label className="setting-label">
              <i className="fas fa-indent"></i>
              Tab Size
            </label>
            <div className="setting-control">
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="tabSize"
                    value="2"
                    checked={localSettings.tabSize === 2}
                    onChange={(e) => handleChange('tabSize', parseInt(e.target.value))}
                  />
                  <span>2 spaces</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="tabSize"
                    value="4"
                    checked={localSettings.tabSize === 4}
                    onChange={(e) => handleChange('tabSize', parseInt(e.target.value))}
                  />
                  <span>4 spaces</span>
                </label>
              </div>
            </div>
            <p className="setting-description">Set the number of spaces for tab indentation</p>
          </div>

          {/* Word Wrap Setting */}
          <div className="setting-group">
            <label className="setting-label">
              <i className="fas fa-align-left"></i>
              Word Wrap
            </label>
            <div className="setting-control">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={localSettings.wordWrap}
                  onChange={(e) => handleChange('wordWrap', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="setting-value">
                {localSettings.wordWrap ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="setting-description">Wrap long lines to fit the editor width</p>
          </div>

          {/* Auto-save Delay Setting */}
          <div className="setting-group">
            <label className="setting-label">
              <i className="fas fa-clock"></i>
              Auto-save Delay
            </label>
            <div className="setting-control">
              <input
                type="range"
                min="1000"
                max="5000"
                step="500"
                value={localSettings.autoSaveDelay}
                onChange={(e) => handleChange('autoSaveDelay', parseInt(e.target.value))}
                className="setting-slider"
              />
              <span className="setting-value">{localSettings.autoSaveDelay / 1000}s</span>
            </div>
            <p className="setting-description">
              Time to wait after typing stops before auto-saving (1-5 seconds)
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleReset}>
            <i className="fas fa-undo"></i>
            Reset to Defaults
          </button>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <i className="fas fa-save"></i>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;


import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  // Initialize settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('sagile-editor-settings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return {
      fontSize: 14, // 10-20px
      tabSize: 2, // 2 or 4 spaces
      wordWrap: false, // true or false
      autoSaveDelay: 2000, // milliseconds (1000-5000)
    };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sagile-editor-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetSettings = () => {
    const defaults = {
      fontSize: 14,
      tabSize: 2,
      wordWrap: false,
      autoSaveDelay: 2000,
    };
    setSettings(defaults);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};


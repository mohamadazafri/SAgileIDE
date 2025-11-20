import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Default to dark theme, but check localStorage first
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('sagile-theme');
    return savedTheme || 'dark';
  });

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('sagile-theme', theme);
    
    // Apply theme to body or root element
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


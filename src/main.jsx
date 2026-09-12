import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { SystemConfigProvider } from './context/SystemConfigContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <SystemConfigProvider>
            <App />
          </SystemConfigProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

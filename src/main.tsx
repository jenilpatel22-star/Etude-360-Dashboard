import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RoleProvider } from './context/RoleContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './data/DataProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RoleProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </RoleProvider>
    </ThemeProvider>
  </StrictMode>,
);

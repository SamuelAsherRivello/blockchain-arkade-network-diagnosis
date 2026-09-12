import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/ibm-plex-sans';
import './style.css';
import { App } from './App.jsx';

createRoot(document.querySelector('#root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

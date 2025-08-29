// index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import './IntegrationTest.css';
import IntegrationTest from './components/IntegrationTest';

// For React 18
const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <IntegrationTest />
  </React.StrictMode>
);
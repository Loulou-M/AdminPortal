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

// If you're still using React 17, use this instead:
/*
import ReactDOM from 'react-dom';
ReactDOM.render(
  <React.StrictMode>
    <IntegrationTest />
  </React.StrictMode>,
  document.getElementById('root')
);
*/
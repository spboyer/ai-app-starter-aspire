import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import { initializeOpenTelemetry } from './telemetry';

// Initialize OpenTelemetry for browser
// Using void to indicate we're running the function for its side effects only
void initializeOpenTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

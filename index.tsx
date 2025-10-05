
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Corrected the import path to be relative and include the file extension.
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Console warnings'i azalt (development için)
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      // React DOM validation warnings
      if (message.includes('validateDOMNesting')) return;
      if (message.includes('<div> cannot appear as a descendant of <p>')) return;
      // Supabase warnings
      if (message.includes('Multiple GoTrueClient')) return;
      if (message.includes('Personnel database henüz')) return;
      // React DevTools warnings
      if (message.includes('Download the React DevTools')) return;
    }
    originalWarn(...args);
  };
  
  console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      if (message.includes('Personnel database henüz')) return;
      if (message.includes('validateDOMNesting')) return;
    }
    originalError(...args);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// Development'ta StrictMode'u kapat console spam'i azaltmak için
if (process.env.NODE_ENV === 'production') {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(<App />);
} 
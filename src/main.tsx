import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CrashScreen } from './components/CrashScreen';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary fallback={(error, reset) => <CrashScreen error={error} onRetry={reset} />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

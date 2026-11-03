import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

// Suppress noisy extension/browser errors
window.addEventListener('error', (event) => {
  if (event.message?.includes('No Listener: tabs:outgoing.message.ready')) {
    event.stopImmediatePropagation();
  }
});

// Also handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('No Listener: tabs:outgoing.message.ready') || 
      event.reason?.includes?.('No Listener: tabs:outgoing.message.ready')) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error.response?.status === 401 || error.response?.status === 403) return false;
        return failureCount < 1;
      },
      staleTime: 5 * 60 * 1000, 
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Toaster position="top-right" />
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
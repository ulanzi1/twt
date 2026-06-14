// SPA entry (Story 1.11b, DD-1). Wires the cache-disabled QueryClient (§4.5) + the
// TanStack Router, then mounts. Tailwind v4 styles load from ./styles.css.

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createQueryClient } from './api/hooks.js';
import { router } from './router.js';
import './styles.css';

const queryClient = createQueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

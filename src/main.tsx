import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './state/store';
import { createRepository } from './storage/repository';
import './index.css';
import App from './App';

const repository = createRepository();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider repository={repository}>
      <App />
    </AppProvider>
  </StrictMode>,
);

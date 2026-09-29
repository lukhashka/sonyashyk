import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registry, assertValidRegistry } from '@/core/modules/registry';
import { registerModuleI18n } from '@/core/i18n';
import { App } from './App';
import '@fontsource-variable/nunito/wght.css';
import '@fontsource-variable/comfortaa/wght.css';
import './styles/globals.css';

assertValidRegistry(registry);
registerModuleI18n(registry);

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

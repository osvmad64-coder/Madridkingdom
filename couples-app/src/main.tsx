import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/plus-jakarta-sans';
import './design/tokens.css';
import './design/base.css';
import './design/components.css';
import './design/animations.css';
import './design/screens.css';
import { App } from './app/App';
import { store } from './store/store';

const root = createRoot(document.getElementById('root')!);

store.init().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

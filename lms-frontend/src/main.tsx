import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // must be imported here or Tailwind classes do nothing
import App from './App.tsx';

document.addEventListener(
  "wheel",
  (event) => {
    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLInputElement &&
      activeElement.type === "number"
    ) {
      event.preventDefault();
    }
  },
  { passive: false }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
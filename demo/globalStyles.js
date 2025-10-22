export const globalStyles = `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  color: var(--foreground);
  background: #24262d;
  flex-direction: column;
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  background: #24262d;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

* {
  box-sizing: border-box;
}

.demo-page-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #24262d;
  display: flex;
  justify-content: center;
}

.demo-widget-container {
  width: 100%;
  max-width: 456px;
  min-width: 270px;
  padding: 0 16px;
}

.demo-widget-content {
  margin-top: 25vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .demo-widget-content {
    margin-top: 15vh;
  }
}

@media (max-width: 480px) {
  .demo-widget-content {
    margin-top: 10vh;
  }
}

@media (max-width: 420px) {
  .demo-nav-button {
    gap: 0;
    padding: 12px;
    justify-content: center;
  }

  .demo-nav-label {
    display: none;
  }
}

.wallet-connect-container {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 50;
}

.demo-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-nav-button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 16px;
  transition: color 250ms ease-in-out;
  font-size: 14px;
  font-weight: 400;
  border-radius: 6px;
  padding: 12px 20px;
  cursor: pointer;
  border: none;
  background: none;
}

.demo-nav-button.active {
  background-color: #111827;
  color: #f9fafb;
}

.demo-nav-button.inactive {
  background-color: transparent;
  color: #d1d5db;
}

.demo-nav-button.inactive:hover {
  color: #d5b7ff;
}

.demo-nav-icon {
  height: 24px;
  width: 24px;
  filter: brightness(0) invert(1);
}

.demo-nav-button.inactive .demo-nav-icon {
  filter: brightness(0) invert(0.8);
}

.demo-nav-button.inactive:hover .demo-nav-icon {
  filter: brightness(0) saturate(100%) invert(85%) sepia(25%) saturate(740%) hue-rotate(215deg) brightness(105%) contrast(97%);
}

.connect-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #f9fafb;
  background: #374151;
  border: 1px solid #4b5563;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.connect-button:hover {
  background: #4b5563;
  border-color: #d5b7ff;
  color: #d5b7ff;
}

.connect-button-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.sw .text-sw-label-l,
.sw h2.text-sw-label-l,
.sw header h2,
.sw [role="dialog"] h2,
.sw [role="dialog"] .text-sw-label-l,
.sw .text-sw-gray-50,
.sw label {
  color: #f9fafb;
}

.sw .text-sw-gray-100,
.sw .text-sw-gray-200 {
  color: #d1d5db;
}

.sw .hover\\:text-sw-gray-50:hover {
  color: #f9fafb;
}

.sw input::placeholder {
  color: #9ca3af;
}

.wallet-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.wallet-indicator {
  width: 8px;
  height: 8px;
  background-color: #22c55e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.wallet-address {
  font-size: 14px;
  font-weight: 500;
  color: #22c55e;
}

.disconnect-button {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
  background: transparent;
  border: 1px solid #374151;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.disconnect-button:hover {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.flex { display: flex; }
.items-center { align-items: center; }
.gap-3 { gap: 0.75rem; }

/* Demo connect wallet button - matches disabled button style */
.demo-connect-wallet-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 12px;
  border: 1px solid #503c68;
  background: transparent;
  color: #7c619f;
  cursor: pointer;
  transition: all 0.2s ease;
}

.demo-connect-wallet-button:hover {
  background: rgba(124, 97, 159, 0.1);
  color: #7c619f;
}
`;

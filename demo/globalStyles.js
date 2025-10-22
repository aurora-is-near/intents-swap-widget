export const globalStyles = `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  height: 100%;
  background: #24262d;
}

.demo-widget-container {
  width: 100%;
  height: 100%;
  max-width: 456px;
  min-width: 270px;
  padding: 10% 16px 0;
  margin: 0 auto;
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

.demo-nav-bar {
  padding: 24px;
  display: flex;
  justify-content: flex-end;
}

.demo-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
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

/* Wallet Connect button for multi-chain wallet connection */
.wallet-connect-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3396FF;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.wallet-connect-button.connected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.wallet-connect-button:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(51, 150, 255, 0.4);
}
`;

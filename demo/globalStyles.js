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
  min-height: 100%;
  background: #24262d;
}

.demo-widget-container {
  height: 100%;
  max-width: 456px;
  min-width: 270px;
  padding: 0 16px 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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

.demo-widget-footer {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  width: 100%;
}
`;

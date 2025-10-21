export const globalStyles = `
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100vh !important;
  color: var(--foreground);
  background: #24262d !important;
  flex-direction: column;
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
}

#root {
  width: 100% !important;
  height: 100vh !important;
  min-height: 100vh !important;
  background: #24262d !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
}

* {
  box-sizing: border-box !important;
}

.demo-page-wrapper {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: #24262d !important;
  display: flex !important;
  justify-content: center !important;
}

.demo-widget-container {
  width: 100% !important;
  max-width: 456px !important;
  min-width: 270px !important;
  padding: 0 16px !important;
}

.demo-widget-content {
  margin-top: 15vh !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
}

@media (max-width: 768px) {
  .demo-widget-content {
    margin-top: 10vh !important;
  }
}

@media (max-width: 480px) {
  .demo-widget-content {
    margin-top: 5vh !important;
  }
}

@media (max-width: 420px) {
  .demo-nav-button {
    gap: 0 !important;
    padding: 12px !important;
    justify-content: center !important;
  }

  .demo-nav-label {
    display: none !important;
  }
}

.wallet-connect-container {
  position: absolute !important;
  top: 24px !important;
  right: 24px !important;
  z-index: 50 !important;
}

.demo-nav {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.demo-nav-button {
  display: flex !important;
  width: 100% !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 16px !important;
  transition: color 250ms ease-in-out !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  border-radius: 6px !important;
  padding: 12px 20px !important;
  cursor: pointer !important;
  border: none !important;
  background: none !important;
}

.demo-nav-button.active {
  background-color: #111827 !important;
  color: #f9fafb !important;
}

.demo-nav-button.inactive {
  background-color: transparent !important;
  color: #d1d5db !important;
}

.demo-nav-button.inactive:hover {
  color: #d5b7ff !important;
}

.demo-nav-icon {
  height: 24px !important;
  width: 24px !important;
  filter: brightness(0) invert(1) !important;
}

.demo-nav-button.inactive .demo-nav-icon {
  filter: brightness(0) invert(0.8) !important;
}

.demo-nav-button.inactive:hover .demo-nav-icon {
  filter: brightness(0) saturate(100%) invert(85%) sepia(25%) saturate(740%) hue-rotate(215deg) brightness(105%) contrast(97%) !important;
}

.connect-button {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  padding: 10px 20px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #f9fafb !important;
  background: #374151 !important;
  border: 1px solid #4b5563 !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.connect-button:hover {
  background: #4b5563 !important;
  border-color: #d5b7ff !important;
  color: #d5b7ff !important;
}

.connect-button-spinner {
  width: 16px !important;
  height: 16px !important;
  border: 2px solid rgba(255, 255, 255, 0.3) !important;
  border-top: 2px solid white !important;
  border-radius: 50% !important;
  animation: spin 1s linear infinite !important;
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
  color: #f9fafb !important;
}

.sw .text-sw-gray-100,
.sw .text-sw-gray-200 {
  color: #d1d5db !important;
}

.sw .hover\\:text-sw-gray-50:hover {
  color: #f9fafb !important;
}

.sw input::placeholder {
  color: #9ca3af !important;
}

.wallet-status {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 8px 16px !important;
  background: rgba(34, 197, 94, 0.1) !important;
  border: 1px solid rgba(34, 197, 94, 0.2) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(8px) !important;
}

.wallet-indicator {
  width: 8px !important;
  height: 8px !important;
  background-color: #22c55e !important;
  border-radius: 50% !important;
  animation: pulse 2s infinite !important;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.wallet-address {
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #22c55e !important;
}

.disconnect-button {
  padding: 8px 16px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #9ca3af !important;
  background: transparent !important;
  border: 1px solid #374151 !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.disconnect-button:hover {
  background: #374151 !important;
  border-color: #4b5563 !important;
  color: #f9fafb !important;
}

.flex { display: flex !important; }
.items-center { align-items: center !important; }
.gap-3 { gap: 0.75rem !important; }

/* Token icon styles - make all token symbols rounded */
.sw img[alt*="ETH"],
.sw img[alt*="BTC"],
.sw img[alt*="TON"],
.sw img[alt*="NEAR"],
.sw img[alt*="USDC"],
.sw img[alt*="USDT"],
.sw img[src*="token"],
.sw img[src*="coin"],
.sw [role="img"],
.sw .token-icon,
.sw .coin-icon {
  border-radius: 9999px !important;
}

/* Generic token container styling */
.sw div[style*="width: 28px"],
.sw div[style*="width: 24px"],
.sw div[style*="width: 32px"] {
  border-radius: 9999px !important;
  overflow: hidden !important;
}

/* Demo connect wallet button - matches disabled button style */
.demo-connect-wallet-button {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 48px !important;
  padding: 0 24px !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  border-radius: 12px !important;
  border: 1px solid #503c68 !important;
  background: transparent !important;
  color: #7c619f !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.demo-connect-wallet-button:hover {
  background: rgba(124, 97, 159, 0.1) !important;
  color: #7c619f !important;
}
`;

import { Info } from 'lucide-react';
import { ConfigSection } from '../../uikit/ConfigSection';
import { useCreator } from '../../hooks/useCreatorConfig';
import { Toggle } from '../../uikit/Toggle';
export function Design() {
  const { state, dispatch } = useCreator();

  return (
    <>
      {/* Mode Section */}
      <ConfigSection title="Mode">
            <div className="flex items-center gap-sw-2xl justify-between">
              <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-800">
                Allow to toggle modes
              </span>
              <button
                onClick={() => dispatch({ type: 'SET_ALLOW_TOGGLE_MODES', payload: !state.allowToggleModes })}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                  state.allowToggleModes ? 'bg-sw-accent-500' : 'bg-sw-gray-800'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    state.allowToggleModes ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-800">
                Default mode
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => dispatch({ type: 'SET_DEFAULT_MODE', payload: 'auto' })}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-sw-md border ${
                    state.defaultMode === 'auto'
                      ? 'bg-sw-gray-800 border-sw-gray-600'
                      : 'border-sw-gray-700'
                  }`}
                >
                  <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-950">Auto</span>
                  <Info className="w-3 h-3 text-sw-gray-950 opacity-50" />
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_DEFAULT_MODE', payload: 'dark' })}
                  className={`px-4 py-2.5 rounded-sw-md border w-16 ${
                    state.defaultMode === 'dark'
                      ? 'bg-sw-gray-800 border-sw-gray-600'
                      : 'border-sw-gray-700'
                  }`}
                >
                  <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-950">Dark</span>
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_DEFAULT_MODE', payload: 'light' })}
                  className={`px-4 py-2.5 rounded-sw-md border w-16 ${
                    state.defaultMode === 'light'
                      ? 'bg-sw-gray-800 border-sw-gray-600'
                      : 'border-sw-gray-700'
                  }`}
                >
                  <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-950">Light</span>
                </button>
              </div>
            </div>
      </ConfigSection>

      {/* Style Section */}
      <ConfigSection title="Style">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-800">
                Style preset
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => dispatch({ type: 'SET_STYLE_PRESET', payload: 'clean' })}
                  className={`px-3 py-2.5 rounded-sw-md border w-16 ${
                    state.stylePreset === 'clean'
                      ? 'bg-sw-gray-800 border-sw-gray-600'
                      : 'border-sw-gray-700'
                  }`}
                >
                  <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-950">Clean</span>
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_STYLE_PRESET', payload: 'bold' })}
                  className={`px-4 py-2.5 rounded-sw-md border w-16 ${
                    state.stylePreset === 'bold'
                      ? 'bg-sw-gray-800 border-sw-gray-600'
                      : 'border-sw-gray-700'
                  }`}
                >
                  <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-950">Bold</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-800">
                Corner radius
              </span>
              <div className="flex items-center gap-2">
                {['none', 's', 'm', 'l'].map((radius) => (
                  <button
                    key={radius}
                    onClick={() => dispatch({ type: 'SET_CORNER_RADIUS', payload: radius as 'none' | 's' | 'm' | 'l' })}
                    className={`w-10 py-2.5 rounded-sw-md border ${
                      state.cornerRadius === radius
                        ? 'bg-sw-gray-800 border-sw-gray-600'
                        : 'border-sw-gray-700'
                    }`}
                  >
                    <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-950">
                      {radius === 'none' ? '–' : radius.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between h-9">
              <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-800">
                Show container wrapper
              </span>
              <button
                onClick={() => dispatch({ type: 'SET_SHOW_CONTAINER_WRAPPER', payload: !state.showContainerWrapper })}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                  state.showContainerWrapper ? 'bg-sw-accent-500' : 'bg-sw-gray-800'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    state.showContainerWrapper ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
      </ConfigSection>

      {/* Colors Section */}
      <ConfigSection title="Colors">
        <ColorInput
          label="Primary color"
          value={state.primaryColor}
          onChange={(val) => dispatch({ type: 'SET_PRIMARY_COLOR', payload: val })}
        />
        <ColorInput
          label="Page background color"
          value={state.pageBackgroundColor}
          onChange={(val) => dispatch({ type: 'SET_PAGE_BACKGROUND_COLOR', payload: val })}
          hasInfo
        />
        <ColorInput
          label="Wrapper background color"
          value={state.wrapperBackgroundColor}
          onChange={(val) => dispatch({ type: 'SET_WRAPPER_BACKGROUND_COLOR', payload: val })}
        />
        <ColorInput
          label="Success color"
          value={state.successColor}
          onChange={(val) => dispatch({ type: 'SET_SUCCESS_COLOR', payload: val })}
        />
        <ColorInput
          label="Warning color"
          value={state.warningColor}
          onChange={(val) => dispatch({ type: 'SET_WARNING_COLOR', payload: val })}
        />
        <ColorInput
          label="Alert color"
          value={state.alertColor}
          onChange={(val) => dispatch({ type: 'SET_ALERT_COLOR', payload: val })}
          disabled
        />
      </ConfigSection>
    </>
  );
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hasInfo?: boolean;
  disabled?: boolean;
}

function ColorInput({ label, value, onChange, hasInfo, disabled }: ColorInputProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 flex-1">
        <span className={`font-semibold text-sm leading-4 tracking-[-0.4px] ${
          disabled ? 'text-sw-gray-600' : 'text-sw-gray-800'
        }`}>
          {label}
        </span>
        {hasInfo && <Info className="w-3 h-3 text-sw-gray-950 opacity-50" />}
      </div>
      <div className="bg-sw-gray-800 rounded-sw-md p-2 flex items-center gap-2 w-28">
        <div
          className="w-[21px] h-5 rounded-md"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="bg-transparent font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-950 w-full outline-none"
        />
      </div>
    </div>
  );
}

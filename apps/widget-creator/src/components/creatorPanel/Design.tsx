import { useState } from 'react';
// import { Info } from 'lucide-react';
import { ConfigSection } from '../../uikit/ConfigSection';
import { useCreator } from '../../hooks/useCreatorConfig';
import { Toggle } from '../../uikit/Toggle';
import { OutlinedButton } from '../../uikit/Button';
import { ColorInput } from './ColorInput';

export function Design() {
  const { state, dispatch } = useCreator();
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  return (
    <div className="space-y-csw-2xl text-csw-gray-200">
      <ConfigSection title="Mode">
        <div className="space-y-csw-xl">
          <Toggle
            label="Allow to toggle modes"
            isEnabled={state.allowToggleModes}
            onChange={(enabled) => {
              dispatch({ type: 'SET_ALLOW_TOGGLE_MODES', payload: enabled });

              if (!enabled) {
                dispatch({ type: 'SET_DEFAULT_MODE', payload: 'dark' });
              }
            }}
          />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
              Default mode
            </span>
            <div className="flex items-center gap-csw-2md">
              {state.allowToggleModes && (
                <OutlinedButton
                  size="sm"
                  onClick={() =>
                    dispatch({ type: 'SET_DEFAULT_MODE', payload: 'auto' })
                  }
                  className={
                    state.defaultMode === 'auto' ? 'bg-csw-gray-800' : ''
                  }>
                  Auto
                </OutlinedButton>
              )}
              <OutlinedButton
                size="sm"
                onClick={() =>
                  dispatch({ type: 'SET_DEFAULT_MODE', payload: 'dark' })
                }
                className={
                  state.defaultMode === 'dark' ? 'bg-csw-gray-800' : ''
                }>
                Dark
              </OutlinedButton>
              <OutlinedButton
                size="sm"
                onClick={() =>
                  dispatch({ type: 'SET_DEFAULT_MODE', payload: 'light' })
                }
                className={
                  state.defaultMode === 'light' ? 'bg-csw-gray-800' : ''
                }>
                Light
              </OutlinedButton>
            </div>
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Style">
        <div className="space-y-csw-xl">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
              Style preset
            </span>
            <div className="flex items-center gap-csw-2md">
              <OutlinedButton
                size="sm"
                onClick={() =>
                  dispatch({ type: 'SET_STYLE_PRESET', payload: 'clean' })
                }
                className={
                  state.stylePreset === 'clean' ? 'bg-csw-gray-800' : ''
                }>
                Clean
              </OutlinedButton>
              <OutlinedButton
                size="sm"
                onClick={() =>
                  dispatch({ type: 'SET_STYLE_PRESET', payload: 'bold' })
                }
                className={
                  state.stylePreset === 'bold' ? 'bg-csw-gray-800' : ''
                }>
                Bold
              </OutlinedButton>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
              Corner radius
            </span>
            <div className="flex items-center gap-csw-2md">
              {['none', 's', 'm', 'l'].map((radius) => (
                <OutlinedButton
                  key={radius}
                  size="sm"
                  onClick={() =>
                    dispatch({
                      type: 'SET_CORNER_RADIUS',
                      payload: radius as 'none' | 's' | 'm' | 'l',
                    })
                  }
                  className={
                    state.cornerRadius === radius ? 'bg-csw-gray-800' : ''
                  }>
                  {radius === 'none' ? '–' : radius.toUpperCase()}
                </OutlinedButton>
              ))}
            </div>
          </div>

          <Toggle
            label="Show container wrapper"
            isEnabled={state.showContainerWrapper}
            onChange={(enabled) =>
              dispatch({ type: 'SET_SHOW_CONTAINER_WRAPPER', payload: enabled })
            }
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Colors">
        <div className="space-y-csw-xl">
          <ColorInput
            label="Primary color"
            value={state.primaryColor}
            onChange={(val) =>
              dispatch({ type: 'SET_PRIMARY_COLOR', payload: val })
            }
            isOpen={openPickerId === 'primaryColor'}
            onOpen={() => setOpenPickerId('primaryColor')}
            onClose={() => setOpenPickerId(null)}
          />
          <ColorInput
            label="Page background color"
            value={state.pageBackgroundColor}
            onChange={(val) =>
              dispatch({ type: 'SET_PAGE_BACKGROUND_COLOR', payload: val })
            }
            isOpen={openPickerId === 'pageBackgroundColor'}
            onOpen={() => setOpenPickerId('pageBackgroundColor')}
            onClose={() => setOpenPickerId(null)}
            hasInfo
          />
          <ColorInput
            label="Wrapper background color"
            value={state.wrapperBackgroundColor}
            onChange={(val) =>
              dispatch({ type: 'SET_WRAPPER_BACKGROUND_COLOR', payload: val })
            }
            isOpen={openPickerId === 'wrapperBackgroundColor'}
            onOpen={() => setOpenPickerId('wrapperBackgroundColor')}
            onClose={() => setOpenPickerId(null)}
          />
          <ColorInput
            label="Success color"
            value={state.successColor}
            onChange={(val) =>
              dispatch({ type: 'SET_SUCCESS_COLOR', payload: val })
            }
            isOpen={openPickerId === 'successColor'}
            onOpen={() => setOpenPickerId('successColor')}
            onClose={() => setOpenPickerId(null)}
          />
          <ColorInput
            label="Warning color"
            value={state.warningColor}
            onChange={(val) =>
              dispatch({ type: 'SET_WARNING_COLOR', payload: val })
            }
            isOpen={openPickerId === 'warningColor'}
            onOpen={() => setOpenPickerId('warningColor')}
            onClose={() => setOpenPickerId(null)}
          />
          <ColorInput
            label="Alert color"
            value={state.alertColor}
            onChange={(val) =>
              dispatch({ type: 'SET_ALERT_COLOR', payload: val })
            }
            isOpen={openPickerId === 'alertColor'}
            onOpen={() => setOpenPickerId('alertColor')}
            onClose={() => setOpenPickerId(null)}
            disabled
          />
        </div>
      </ConfigSection>
    </div>
  );
}

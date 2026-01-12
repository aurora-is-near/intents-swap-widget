import { ConfigSection } from '../../uikit/ConfigSection';
import { useCreator } from '../../hooks/useCreatorConfig';
import { Toggle } from '../../uikit/Toggle';
import { OutlinedButton } from '../../uikit/Button';
import { ColorInput } from './ColorInput';
import { ThemeColorPickerId } from '../../types/colors';

const BORDER_RADIUS_VALUES = ['none', 'sm', 'md', 'lg'] as const;

export function Design() {
  const { state, dispatch } = useCreator();

  const setOpenPickerId = (id: ThemeColorPickerId | null) => {
    dispatch({ type: 'SET_OPEN_THEME_COLOR_PICKER_ID', payload: id });
  };

  return (
    <div className="space-y-csw-2xl text-csw-gray-200">
      <ConfigSection title="Mode">
        <div className="space-y-csw-xl">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
              Color scheme
            </span>
            <div className="flex items-center gap-csw-2md">
              <OutlinedButton
                size="sm"
                state={state.defaultMode === 'auto' ? 'active' : 'default'}
                onClick={() =>
                  dispatch({ type: 'SET_DEFAULT_MODE', payload: 'auto' })
                }>
                Auto
              </OutlinedButton>
              <OutlinedButton
                size="sm"
                state={state.defaultMode === 'dark' ? 'active' : 'default'}
                onClick={() =>
                  dispatch({ type: 'SET_DEFAULT_MODE', payload: 'dark' })
                }>
                Dark
              </OutlinedButton>
              <OutlinedButton
                size="sm"
                state={state.defaultMode === 'light' ? 'active' : 'default'}
                onClick={() =>
                  dispatch({ type: 'SET_DEFAULT_MODE', payload: 'light' })
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
                state={state.stylePreset === 'clean' ? 'active' : 'default'}
                onClick={() =>
                  dispatch({ type: 'SET_STYLE_PRESET', payload: 'clean' })
                }>
                Clean
              </OutlinedButton>
              <OutlinedButton
                size="sm"
                state={state.stylePreset === 'bold' ? 'active' : 'default'}
                onClick={() =>
                  dispatch({ type: 'SET_STYLE_PRESET', payload: 'bold' })
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
              {BORDER_RADIUS_VALUES.map((radius) => (
                <OutlinedButton
                  key={radius}
                  size="sm"
                  state={state.borderRadius === radius ? 'active' : 'default'}
                  onClick={() =>
                    dispatch({
                      type: 'SET_BORDER_RADIUS',
                      payload: radius,
                    })
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
            isOpen={state.openThemeColorPickerId === 'primaryColor'}
            onOpen={() => setOpenPickerId('primaryColor')}
            onClose={() => setOpenPickerId(null)}
          />
          <ColorInput
            label="Surface color"
            value={state.surfaceColor}
            onChange={(val) =>
              dispatch({ type: 'SET_SURFACE_COLOR', payload: val })
            }
            isOpen={state.openThemeColorPickerId === 'surfaceColor'}
            onOpen={() => setOpenPickerId('surfaceColor')}
            onClose={() => setOpenPickerId(null)}
            hasInfo
          />
          <ColorInput
            label="Background color"
            value={state.backgroundColor}
            onChange={(val) =>
              dispatch({ type: 'SET_BACKGROUND_COLOR', payload: val })
            }
            isOpen={state.openThemeColorPickerId === 'backgroundColor'}
            onOpen={() => setOpenPickerId('backgroundColor')}
            onClose={() => setOpenPickerId(null)}
          />
          <ColorInput
            label="Success color"
            value={state.successColor}
            onChange={(val) =>
              dispatch({ type: 'SET_SUCCESS_COLOR', payload: val })
            }
            isOpen={state.openThemeColorPickerId === 'successColor'}
            onOpen={() => setOpenPickerId('successColor')}
            onClose={() => setOpenPickerId(null)}
          />
          <ColorInput
            label="Warning color"
            value={state.warningColor}
            onChange={(val) =>
              dispatch({ type: 'SET_WARNING_COLOR', payload: val })
            }
            isOpen={state.openThemeColorPickerId === 'warningColor'}
            onOpen={() => setOpenPickerId('warningColor')}
            onClose={() => setOpenPickerId(null)}
          />
          <ColorInput
            label="Error color"
            value={state.errorColor}
            onChange={(val) =>
              dispatch({ type: 'SET_ERROR_COLOR', payload: val })
            }
            isOpen={state.openThemeColorPickerId === 'errorColor'}
            onOpen={() => setOpenPickerId('errorColor')}
            onClose={() => setOpenPickerId(null)}
            disabled
          />
        </div>
      </ConfigSection>
    </div>
  );
}

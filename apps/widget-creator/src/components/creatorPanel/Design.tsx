import { ConfigSection } from '../../uikit/ConfigSection';
import { useCreator } from '../../hooks/useCreatorConfig';
import { Toggle } from '../../uikit/Toggle';
import { OutlinedButton } from '../../uikit/Button';
import { ColorInput } from './ColorInput';
import { ThemeColorPickerId } from '../../types/colors';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_BACKGROUND_COLOR,
} from '../../constants';

const BORDER_RADIUS_VALUES = ['none', 'sm', 'md', 'lg'] as const;
const DARK_MODE_COLOR = '#250042';
const LIGHT_MODE_COLOR = '#F8F5FF';

export function Design() {
  const { state, dispatch } = useCreator();

  const setOpenPickerId = (id: ThemeColorPickerId | null) => {
    dispatch({ type: 'SET_OPEN_THEME_COLOR_PICKER_ID', payload: id });
  };

  return (
    <div className="space-y-csw-2xl text-csw-gray-200">
      <ConfigSection title="Style">
        <div className="space-y-csw-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-csw-2md w-full">
              <OutlinedButton
                size="sm"
                className="w-full"
                state={state.stylePreset === 'clean' ? 'active' : 'default'}
                onClick={() =>
                  dispatch({ type: 'SET_STYLE_PRESET', payload: 'clean' })
                }>
                Clean
              </OutlinedButton>
              <OutlinedButton
                size="sm"
                className="w-full"
                state={state.stylePreset === 'bold' ? 'active' : 'default'}
                onClick={() =>
                  dispatch({ type: 'SET_STYLE_PRESET', payload: 'bold' })
                }>
                Bold
              </OutlinedButton>
            </div>
          </div>

          <div className="space-y-csw-xl border-t border-csw-gray-800 pt-csw-2xl mt-csw-2xl">
            <ColorInput
              label="Accent color"
              value={state.accentColor}
              onChange={(val) =>
                dispatch({ type: 'SET_ACCENT_COLOR', payload: val })
              }
              isColorPickerOpen={state.openThemeColorPickerId === 'accentColor'}
              onOpenColorPicker={() => setOpenPickerId('accentColor')}
              onCloseColorPicker={() => setOpenPickerId(null)}
              themes={[DEFAULT_ACCENT_COLOR, '#00D8F0', '#9EED00', '#FFA61E']}
            />
            <ColorInput
              label="Background color"
              value={state.backgroundColor}
              onChange={(val) => {
                if (val === DARK_MODE_COLOR) {
                  dispatch({ type: 'SET_DEFAULT_MODE', payload: 'dark' });
                  dispatch({
                    type: 'SET_BACKGROUND_COLOR',
                    payload: DEFAULT_BACKGROUND_COLOR,
                  });

                  return;
                }

                if (val === LIGHT_MODE_COLOR) {
                  dispatch({ type: 'SET_DEFAULT_MODE', payload: 'light' });
                  dispatch({
                    type: 'SET_BACKGROUND_COLOR',
                    payload: DEFAULT_BACKGROUND_COLOR,
                  });

                  return;
                }

                dispatch({ type: 'SET_BACKGROUND_COLOR', payload: val });
              }}
              isColorPickerOpen={
                state.openThemeColorPickerId === 'backgroundColor'
              }
              onOpenColorPicker={() => setOpenPickerId('backgroundColor')}
              onCloseColorPicker={() => setOpenPickerId(null)}
              themes={[DARK_MODE_COLOR, LIGHT_MODE_COLOR]}
            />
            {state.showContainerWrapper && (
              <ColorInput
                label="Container color"
                value={state.containerColor}
                onChange={(val) =>
                  dispatch({ type: 'SET_CONTAINER_COLOR', payload: val })
                }
                isColorPickerOpen={
                  state.openThemeColorPickerId === 'containerColor'
                }
                onOpenColorPicker={() => setOpenPickerId('containerColor')}
                onCloseColorPicker={() => setOpenPickerId(null)}
                themes={['#250042', '#F8F5FF']}
              />
            )}
            <div className="space-y-csw-xl border-t border-csw-gray-800 pt-csw-2xl mt-csw-2xl">
              <ColorInput
                label="Success color"
                value={state.successColor}
                onChange={(val) =>
                  dispatch({ type: 'SET_SUCCESS_COLOR', payload: val })
                }
                isColorPickerOpen={
                  state.openThemeColorPickerId === 'successColor'
                }
                onOpenColorPicker={() => setOpenPickerId('successColor')}
                onCloseColorPicker={() => setOpenPickerId(null)}
                themes={['#98FFB5', '#00652F']}
              />
              <ColorInput
                label="Warning color"
                value={state.warningColor}
                onChange={(val) =>
                  dispatch({ type: 'SET_WARNING_COLOR', payload: val })
                }
                isColorPickerOpen={
                  state.openThemeColorPickerId === 'warningColor'
                }
                onOpenColorPicker={() => setOpenPickerId('warningColor')}
                onCloseColorPicker={() => setOpenPickerId(null)}
                themes={['#FADFAD', '#A87A04']}
              />
              <ColorInput
                label="Error color"
                value={state.errorColor}
                onChange={(val) =>
                  dispatch({ type: 'SET_ERROR_COLOR', payload: val })
                }
                isColorPickerOpen={
                  state.openThemeColorPickerId === 'errorColor'
                }
                onOpenColorPicker={() => setOpenPickerId('errorColor')}
                onCloseColorPicker={() => setOpenPickerId(null)}
                themes={['#FFB8BE', '#9F002B']}
              />
            </div>
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Layout">
        <div className="space-y-csw-xl">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200 whitespace-nowrap">
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
                  {radius === 'none'
                    ? '–'
                    : radius.substring(0, 1).toUpperCase()}
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
    </div>
  );
}

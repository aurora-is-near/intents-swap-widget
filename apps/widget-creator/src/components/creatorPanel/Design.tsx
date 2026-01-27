import { ConfigSection } from '../../uikit/ConfigSection';
import { useCreator } from '../../hooks/useCreatorConfig';
import { Toggle } from '../../uikit/Toggle';
import { OutlinedButton } from '../../uikit/Button';
import { ColorInputItems } from './ColorInputItems';
import { ThemeColorPickerId } from '../../types/colors';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_ERROR_COLOR_DARK,
  DEFAULT_ERROR_COLOR_LIGHT,
  DEFAULT_SUCCESS_COLOR_DARK,
  DEFAULT_SUCCESS_COLOR_LIGHT,
  DEFAULT_WARNING_COLOR_DARK,
  DEFAULT_WARNING_COLOR_LIGHT,
} from '../../constants';
import { ColorInputGroup } from './ColorInputGroup';
import { ColorInputItem } from './ColorInputItem';

const BORDER_RADIUS_VALUES = ['none', 'sm', 'md', 'lg'] as const;

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
            <ColorInputItems
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
            <ColorInputGroup label="Background color">
              {(['dark', 'light'] as const).map((mode) => (
                <ColorInputItem
                  key={mode}
                  isActive={state.defaultMode === mode}
                  onClick={() => {
                    dispatch({ type: 'SET_DEFAULT_MODE', payload: mode });
                    dispatch({
                      type: 'SET_BACKGROUND_COLOR',
                      payload: DEFAULT_BACKGROUND_COLOR,
                    });
                    dispatch({
                      type: 'SET_SUCCESS_COLOR',
                      payload:
                        mode === 'dark'
                          ? DEFAULT_SUCCESS_COLOR_LIGHT
                          : DEFAULT_SUCCESS_COLOR_DARK,
                    });
                    dispatch({
                      type: 'SET_WARNING_COLOR',
                      payload:
                        mode === 'dark'
                          ? DEFAULT_WARNING_COLOR_LIGHT
                          : DEFAULT_WARNING_COLOR_DARK,
                    });
                    dispatch({
                      type: 'SET_ERROR_COLOR',
                      payload:
                        mode === 'dark'
                          ? DEFAULT_ERROR_COLOR_LIGHT
                          : DEFAULT_ERROR_COLOR_DARK,
                    });
                  }}
                  color={mode}
                />
              ))}
            </ColorInputGroup>
            <div className="space-y-csw-xl border-t border-csw-gray-800 pt-csw-2xl mt-csw-2xl">
              <ColorInputItems
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
                themes={[
                  DEFAULT_SUCCESS_COLOR_LIGHT,
                  DEFAULT_SUCCESS_COLOR_DARK,
                ]}
              />
              <ColorInputItems
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
                themes={[
                  DEFAULT_WARNING_COLOR_LIGHT,
                  DEFAULT_WARNING_COLOR_DARK,
                ]}
              />
              <ColorInputItems
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
                themes={[DEFAULT_ERROR_COLOR_LIGHT, DEFAULT_ERROR_COLOR_DARK]}
              />
            </div>
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Layout">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200 whitespace-nowrap">
            Corner radius
          </span>
          <div className="flex items-center gap-csw-2md">
            {BORDER_RADIUS_VALUES.map((radius) => (
              <OutlinedButton
                key={radius}
                size="sm"
                className="w-[36px] h-[36px]"
                state={state.borderRadius === radius ? 'active' : 'default'}
                onClick={() =>
                  dispatch({
                    type: 'SET_BORDER_RADIUS',
                    payload: radius,
                  })
                }>
                {radius === 'none' ? '–' : radius.substring(0, 1).toUpperCase()}
              </OutlinedButton>
            ))}
          </div>
        </div>

        <div className="border-t border-csw-gray-800 pt-csw-2xl mt-csw-2xl" />

        <Toggle
          label="Show container wrapper"
          isEnabled={state.showContainerWrapper}
          onChange={(enabled) =>
            dispatch({ type: 'SET_SHOW_CONTAINER_WRAPPER', payload: enabled })
          }
        />
      </ConfigSection>
    </div>
  );
}

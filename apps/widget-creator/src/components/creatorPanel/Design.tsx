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
              label="Primary color"
              value={state.primaryColor}
              onChange={(val) =>
                dispatch({ type: 'SET_PRIMARY_COLOR', payload: val })
              }
              isOpen={state.openThemeColorPickerId === 'primaryColor'}
              onOpen={() => setOpenPickerId('primaryColor')}
              onClose={() => setOpenPickerId(null)}
            />
            {state.stylePreset === 'clean' && (
              <ColorInput
                label="Background color"
                value={state.backgroundColor}
                onChange={(val) =>
                  dispatch({ type: 'SET_BACKGROUND_COLOR', payload: val })
                }
                isOpen={state.openThemeColorPickerId === 'backgroundColor'}
                onOpen={() => setOpenPickerId('backgroundColor')}
                onClose={() => setOpenPickerId(null)}
                hasInfo
              />
            )}
            {state.showContainerWrapper && (
              <ColorInput
                label="Container color"
                value={state.containerColor}
                onChange={(val) =>
                  dispatch({ type: 'SET_CONTAINER_COLOR', payload: val })
                }
                isOpen={state.openThemeColorPickerId === 'containerColor'}
                onOpen={() => setOpenPickerId('containerColor')}
                onClose={() => setOpenPickerId(null)}
                hasInfo
              />
            )}
            <div className="space-y-csw-xl border-t border-csw-gray-800 pt-csw-2xl mt-csw-2xl">
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

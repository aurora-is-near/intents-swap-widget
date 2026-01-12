import { useCreator } from './useCreatorConfig';

export function useConfigLink() {
  const { state } = useCreator();

  const generateConfigLink = (): string => {
    // Build URL with all configuration parameters
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    // Configure - User authentication
    params.append('userAuthMode', state.userAuthMode);

    // Configure - Account abstraction
    params.append('accountAbstractionMode', state.accountAbstractionMode);

    // Configure - Networks
    state.selectedNetworks.forEach((network) => {
      params.append('selectedNetworks', network);
    });

    params.append('enableSellToken', state.enableSellToken.toString());
    params.append(
      'autoSelectTopBalanceToken',
      state.autoSelectTopBalanceToken.toString(),
    );
    params.append('defaultSellToken', state.defaultSellToken.tokenSymbol);
    params.append('enableBuyToken', state.enableBuyToken.toString());
    params.append('defaultBuyToken', state.defaultBuyToken.tokenSymbol);

    // Configure - Fee collection
    params.append('enableCustomFees', state.enableCustomFees.toString());
    params.append('feePercentage', state.feePercentage);
    params.append('collectorAddress', state.collectorAddress);

    // Design - Mode
    params.append('defaultMode', state.defaultMode);

    // Design - Style
    params.append('stylePreset', state.stylePreset);
    params.append('borderRadius', state.borderRadius);
    params.append(
      'showContainerWrapper',
      state.showContainerWrapper.toString(),
    );

    // Design - Colors
    params.append('primaryColor', state.primaryColor);
    params.append('surfaceColor', state.surfaceColor);
    params.append('backgroundColor', state.backgroundColor);
    params.append('successColor', state.successColor);
    params.append('warningColor', state.warningColor);
    params.append('errorColor', state.errorColor);

    return `${baseUrl}?${params.toString()}`;
  };

  const copyConfigLink = async (): Promise<void> => {
    const configUrl = generateConfigLink();

    await navigator.clipboard.writeText(configUrl);
  };

  return {
    generateConfigLink,
    copyConfigLink,
  };
}

export function useDecodeConfigLink() {
  const { dispatch } = useCreator();

  const decodeConfigLink = (url: string): void => {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    // Configure - User authentication
    const userAuthMode = params.get('userAuthMode');

    if (userAuthMode === 'standalone' || userAuthMode === 'dapp') {
      dispatch({ type: 'SET_USER_AUTH_MODE', payload: userAuthMode });
    }

    // Configure - Account abstraction
    const accountAbstractionMode = params.get('accountAbstractionMode');

    if (
      accountAbstractionMode === 'enabled' ||
      accountAbstractionMode === 'disabled'
    ) {
      dispatch({
        type: 'SET_ACCOUNT_ABSTRACTION_MODE',
        payload: accountAbstractionMode,
      });
    }

    // Configure - Networks
    const selectedNetworks = params.getAll('selectedNetworks');

    if (selectedNetworks.length > 0) {
      dispatch({ type: 'SET_SELECTED_NETWORKS', payload: selectedNetworks });
    }

    const enableSellToken = params.get('enableSellToken');

    if (enableSellToken === 'true' || enableSellToken === 'false') {
      dispatch({
        type: 'SET_ENABLE_SELL_TOKEN',
        payload: enableSellToken === 'true',
      });
    }

    const autoSelectTopBalanceToken = params.get('autoSelectTopBalanceToken');

    if (
      autoSelectTopBalanceToken === 'true' ||
      autoSelectTopBalanceToken === 'false'
    ) {
      dispatch({
        type: 'SET_AUTO_SELECT_TOP_BALANCE_TOKEN',
        payload: autoSelectTopBalanceToken === 'true',
      });
    }

    const defaultSellToken = params.get('defaultSellToken');

    if (defaultSellToken) {
      dispatch({
        type: 'SET_DEFAULT_SELL_TOKEN',
        payload: { tokenSymbol: defaultSellToken, chain: undefined },
      });
    }

    const enableBuyToken = params.get('enableBuyToken');

    if (enableBuyToken === 'true' || enableBuyToken === 'false') {
      dispatch({
        type: 'SET_ENABLE_BUY_TOKEN',
        payload: enableBuyToken === 'true',
      });
    }

    const defaultBuyToken = params.get('defaultBuyToken');

    if (defaultBuyToken) {
      dispatch({
        type: 'SET_DEFAULT_BUY_TOKEN',
        payload: { tokenSymbol: defaultBuyToken, chain: undefined },
      });
    }

    // Configure - Fee collection
    const enableCustomFees = params.get('enableCustomFees');

    if (enableCustomFees === 'true' || enableCustomFees === 'false') {
      dispatch({
        type: 'SET_ENABLE_CUSTOM_FEES',
        payload: enableCustomFees === 'true',
      });
    }

    const feePercentage = params.get('feePercentage');

    if (feePercentage) {
      dispatch({ type: 'SET_FEE_PERCENTAGE', payload: feePercentage });
    }

    const collectorAddress = params.get('collectorAddress');

    if (collectorAddress) {
      dispatch({ type: 'SET_COLLECTOR_ADDRESS', payload: collectorAddress });
    }

    // Design - Mode
    const defaultMode = params.get('defaultMode');

    if (
      defaultMode === 'auto' ||
      defaultMode === 'dark' ||
      defaultMode === 'light'
    ) {
      dispatch({ type: 'SET_DEFAULT_MODE', payload: defaultMode });
    }

    // Design - Style
    const stylePreset = params.get('stylePreset');

    if (stylePreset === 'clean' || stylePreset === 'bold') {
      dispatch({ type: 'SET_STYLE_PRESET', payload: stylePreset });
    }

    const borderRadius = params.get('borderRadius');

    if (
      borderRadius === 'none' ||
      borderRadius === 'sm' ||
      borderRadius === 'md' ||
      borderRadius === 'lg'
    ) {
      dispatch({ type: 'SET_BORDER_RADIUS', payload: borderRadius });
    }

    const showContainerWrapper = params.get('showContainerWrapper');

    if (showContainerWrapper === 'true' || showContainerWrapper === 'false') {
      dispatch({
        type: 'SET_SHOW_CONTAINER_WRAPPER',
        payload: showContainerWrapper === 'true',
      });
    }

    // Design - Colors
    const primaryColor = params.get('primaryColor');

    if (primaryColor) {
      dispatch({ type: 'SET_PRIMARY_COLOR', payload: primaryColor });
    }

    const surfaceColor = params.get('surfaceColor');

    if (surfaceColor) {
      dispatch({
        type: 'SET_SURFACE_COLOR',
        payload: surfaceColor,
      });
    }

    const backgroundColor = params.get('backgroundColor');

    if (backgroundColor) {
      dispatch({
        type: 'SET_BACKGROUND_COLOR',
        payload: backgroundColor,
      });
    }

    const successColor = params.get('successColor');

    if (successColor) {
      dispatch({ type: 'SET_SUCCESS_COLOR', payload: successColor });
    }

    const warningColor = params.get('warningColor');

    if (warningColor) {
      dispatch({ type: 'SET_WARNING_COLOR', payload: warningColor });
    }

    const errorColor = params.get('errorColor');

    if (errorColor) {
      dispatch({ type: 'SET_ERROR_COLOR', payload: errorColor });
    }
  };

  return { decodeConfigLink };
}

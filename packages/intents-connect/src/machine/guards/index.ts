/**
 * Every precondition the Intents Connect protocol imposes, named after what it
 * prevents. Each throws a `GuardError` carrying a `GuardCode`.
 */
export { amountMustExceedFee } from '@/machine/guards/checks/amountMustExceedFee';
export { destinationTokenIsTouched } from '@/machine/guards/checks/destinationTokenIsTouched';
export { feeMustBeEstimated } from '@/machine/guards/checks/feeMustBeEstimated';
export { memoPresentForStellar } from '@/machine/guards/checks/memoPresentForStellar';
export { mustBeSignedBeforeDeposit } from '@/machine/guards/checks/mustBeSignedBeforeDeposit';
export { mustHaveSigningPayload } from '@/machine/guards/checks/mustHaveSigningPayload';
export { noExecutionInFlight } from '@/machine/guards/checks/noExecutionInFlight';
export { originNetworkMatches } from '@/machine/guards/checks/originNetworkMatches';
export { publicKeyMatchesStandard } from '@/machine/guards/checks/publicKeyMatchesStandard';
export { quoteMustNotHaveMoved } from '@/machine/guards/checks/quoteMustNotHaveMoved';
export { recipientOnlyOnOutOperation } from '@/machine/guards/checks/recipientOnlyOnOutOperation';
export { round1MustBeStepless } from '@/machine/guards/checks/round1MustBeStepless';
export { stepShapeIsLegal } from '@/machine/guards/checks/stepShapeIsLegal';
export { stepsRequiredForRealCreate } from '@/machine/guards/checks/stepsRequiredForRealCreate';
export {
  stepsUsePlaceholder,
  strategiesAreExclusive,
} from '@/machine/guards/checks/strategiesAreExclusive';

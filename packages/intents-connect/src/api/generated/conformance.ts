/**
 * Compile-time conformance between our hand-written domain types and the
 * generated OpenAPI document.
 *
 * ## Why this file exists rather than using the generated types directly
 *
 * Not one of the 26 schemas in the document declares a `required` list, so every
 * generated field is optional. Exposing them as this package's API would make
 * `execution.id`, `quote.depositAddress` and `details.payload` all
 * `T | undefined`, which erases exactly the invariants the guards and the runner
 * exist to enforce — every call site would grow a null check that says nothing.
 *
 * So the generated types are treated as a **checked contract** instead. The
 * assertions below fail `yarn typecheck` when the wire shape drifts. Workflow:
 *
 *   1. `yarn generate:api`
 *   2. `yarn typecheck`
 *   3. a failure here means the API changed and our logic needs a decision —
 *      not that this file needs relaxing.
 *
 * Every check is written so the compiler error NAMES what drifted, e.g.
 * `Type '"OPERATION_REFUNDED"' does not satisfy the constraint 'never'` rather
 * than a bare `false is not true`.
 *
 * This file has no runtime values and is excluded from the build.
 */
import type {
  Execution,
  ExecutionDetails,
  ExecutionQuote,
  ExecutionStatus,
  ExecutionType,
  Intermediary,
  Step,
  SwapType,
} from '@/types/execution';
import type {
  DeleteSignatureEnvelope,
  SigningPayload,
  SigningStandard,
  TonConnectEnvelope,
} from '@/types/signing';
import type { CreateExecutionBody, SubmitSignatureBody } from '@/api/types';
import type { components } from '@/api/generated/openapi';

type Schemas = components['schemas'];

/* ── Assertion helpers ─────────────────────────────────────────────────────── */

/**
 * Compiles only when `T` is `never`. Anything left over is printed in the error,
 * which is what makes these failures self-describing.
 */
type AssertNone<T extends never> = T;

/** Members of `From` that `To` does not cover. */
type UncoveredMembers<From, To> = Exclude<From, To>;

/** Keys of `From` that `To` does not declare. */
type MissingKeys<From, To> = Exclude<keyof From, keyof To>;

/**
 * Keys present on both sides whose value type in `From` is not assignable to the
 * same key in `To`. Optionality is stripped, because the document marks
 * everything optional and that alone is not drift.
 */
type IncompatibleKeys<From, To> = {
  [K in keyof From & keyof To]-?: [NonNullable<From[K]>] extends [
    NonNullable<To[K]>,
  ]
    ? never
    : K;
}[keyof From & keyof To];

type SpecExecution = Schemas['controllers.executionDoc'];
type SpecQuote = Schemas['controllers.executionQuoteDoc'];
type SpecDetails = Schemas['controllers.executionDetailsDoc'];
type SpecPayload = Schemas['controllers.signingPayloadDoc'];
type SpecIntermediary = Schemas['controllers.intermediaryResult'];
type SpecStep = Schemas['controllers.executionStepEVMDoc'];
type SpecCreateBody = Schemas['controllers.createExecutionRequestDoc'];
type SpecSubmitBody = Schemas['controllers.submitSignatureRequestDoc'];
type SpecDeleteBody = Schemas['controllers.deleteExecutionRequestDoc'];
type SpecTonConnect = Schemas['controllers.tonConnectEnvelopeDoc'];

/* ── Enums ──────────────────────────────────────────────────────────────────
 * Checked in both directions. A value added server-side is the most dangerous
 * drift there is: the polling loop would treat an unknown status as "keep
 * waiting", and a new signing standard would reach a wallet that cannot produce
 * it. A value removed means we carry a branch that can never fire. */

export type NoNewStatuses = AssertNone<
  UncoveredMembers<NonNullable<SpecExecution['status']>, ExecutionStatus>
>;
export type NoStaleStatuses = AssertNone<
  UncoveredMembers<ExecutionStatus, NonNullable<SpecExecution['status']>>
>;

export type NoNewSigningStandards = AssertNone<
  UncoveredMembers<NonNullable<SpecPayload['standard']>, SigningStandard>
>;
export type NoStaleSigningStandards = AssertNone<
  UncoveredMembers<SigningStandard, NonNullable<SpecPayload['standard']>>
>;

export type NoNewSwapTypes = AssertNone<
  UncoveredMembers<NonNullable<SpecQuote['swapType']>, SwapType>
>;
export type NoStaleSwapTypes = AssertNone<
  UncoveredMembers<SwapType, NonNullable<SpecQuote['swapType']>>
>;

export type NoNewExecutionTypes = AssertNone<
  UncoveredMembers<NonNullable<SpecExecution['type']>, ExecutionType>
>;

export type NoNewOriginTypes = AssertNone<
  UncoveredMembers<
    NonNullable<SpecIntermediary['originType']>,
    Intermediary['originType']
  >
>;

/* ── Response shapes ────────────────────────────────────────────────────────
 * `Execution['transaction']` is excluded on purpose: the API returns it (both
 * the widget and last-mile read `transaction.evmTxHash`) but the document does
 * not declare it, so requiring it here would fail against a correct spec.
 *
 * Nested objects are compared through their own checks rather than structurally,
 * so a failure points at the specific schema that moved. */

export type ExecutionFieldsExist = AssertNone<
  MissingKeys<Omit<Execution, 'transaction'>, SpecExecution>
>;
export type ExecutionFieldsFit = AssertNone<
  IncompatibleKeys<
    SpecExecution,
    Omit<Execution, 'quote' | 'details' | 'steps' | 'transaction'>
  >
>;

export type QuoteFieldsExist = AssertNone<
  MissingKeys<ExecutionQuote, SpecQuote>
>;
export type QuoteFieldsFit = AssertNone<
  IncompatibleKeys<
    SpecQuote,
    // `depositMemo` is `string | null` for us and `string` on the wire: the key
    // is absent in JSON, which the client normalises to null.
    Omit<ExecutionQuote, 'depositMemo'>
  >
>;

export type DetailsFieldsExist = AssertNone<
  MissingKeys<ExecutionDetails, SpecDetails>
>;
export type DetailsFieldsFit = AssertNone<
  IncompatibleKeys<SpecDetails, Omit<ExecutionDetails, 'payload'>>
>;

export type PayloadFieldsExist = AssertNone<
  MissingKeys<SigningPayload, SpecPayload>
>;
export type PayloadFieldsFit = AssertNone<
  IncompatibleKeys<SpecPayload, SigningPayload>
>;

export type IntermediaryFieldsExist = AssertNone<
  MissingKeys<Intermediary, SpecIntermediary>
>;
export type IntermediaryFieldsFit = AssertNone<
  IncompatibleKeys<SpecIntermediary, Intermediary>
>;

/* ── Request shapes ─────────────────────────────────────────────────────────
 * Reversed: what we send has to be acceptable to the API, so our field types
 * must fit the wire's. Catches a field we send being renamed or retyped. */

export type CreateBodyFieldsAccepted = AssertNone<
  // `steps` is checked below; see the parameters deviation.
  IncompatibleKeys<Omit<CreateExecutionBody, 'steps'>, SpecCreateBody>
>;
export type CreateBodyHasNoUnknownFields = AssertNone<
  MissingKeys<Omit<CreateExecutionBody, 'steps'>, SpecCreateBody>
>;

export type SubmitBodyFieldsAccepted = AssertNone<
  IncompatibleKeys<SubmitSignatureBody, SpecSubmitBody>
>;
export type SubmitBodyHasNoUnknownFields = AssertNone<
  MissingKeys<SubmitSignatureBody, SpecSubmitBody>
>;

export type DeleteBodyFieldsAccepted = AssertNone<
  IncompatibleKeys<DeleteSignatureEnvelope, SpecDeleteBody>
>;

export type TonConnectFieldsAccepted = AssertNone<
  IncompatibleKeys<TonConnectEnvelope, SpecTonConnect>
>;

/* ── Steps ──────────────────────────────────────────────────────────────────
 * The five-key whitelist `stepShapeIsLegal` rejects unknown keys against, so
 * the key set is pinned in both directions: a new wire field would otherwise be
 * rejected client-side before the API ever saw it. */

export type StepFieldsExist = AssertNone<MissingKeys<Step, SpecStep>>;
export type StepHasNoUnmodelledFields = AssertNone<MissingKeys<SpecStep, Step>>;
export type StepFieldsFit = AssertNone<
  IncompatibleKeys<SpecStep, Omit<Step, 'parameters' | 'metadata'>>
>;

/* ── Known deviation: `executionStepEVMDoc.parameters` ──────────────────────
 *
 * The document declares it as `array` of `object`, which generates
 * `Record<string, never>[]` — an uninhabited element type nothing can satisfy.
 * Step parameters are ABI-encoded scalars and tuples (`["0xPool", "94275"]`),
 * never plain objects, as every worked example in the developer guides shows.
 *
 * So this is a spec defect, not a mismatch on our side, and `Step['parameters']`
 * stays `string[]`. The assertion pins the deviation rather than hiding it: it
 * holds while the document is still wrong and starts failing once `parameters`
 * is corrected — at which point delete this block and drop `parameters` from the
 * `StepFieldsFit` exclusion above.
 */
export type StepParametersStillDeviates = AssertNone<
  UncoveredMembers<
    NonNullable<SpecStep['parameters']> extends Record<string, never>[]
      ? never
      : 'spec parameters schema was fixed — re-enable the StepFieldsFit check',
    never
  >
>;

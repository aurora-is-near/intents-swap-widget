import type {
  IntentSigningStandard,
  PreparedIntent,
  SignedIntent,
} from '@/types/intents';

export interface PreparedIntentSigner {
  readonly standard: IntentSigningStandard;
  signIntent(intent: PreparedIntent): Promise<SignedIntent>;
}

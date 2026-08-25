export {
  createExecutionMachine,
  moveTo,
  type ExecutionMachine,
  type ExecutionMachineStore,
  type MoveToOptions,
} from '@/machine/machine';
export { createInitialContext, type Context } from '@/machine/context';
export {
  PHASE_TRANSITIONS,
  TERMINAL_PHASES,
  isTerminalPhase,
  type Phase,
} from '@/machine/phases';
export * as guards from '@/machine/guards';

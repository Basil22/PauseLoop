// Re-export the native module. On web it resolves to PauseLoopNativeModule.web.ts.
export {
  default,
  isNativeAvailable,
  nativeUnavailableReason,
  type PauseLoopNativeEvents,
  type PauseLoopNativeModule,
} from './src/PauseLoopNativeModule';
export * from './src/PauseLoopNative.types';

import { createMockNativeModule } from './mock';
import type { PauseLoopNativeModule } from './PauseLoopNativeModule';

export const isNativeAvailable = false;
export const nativeUnavailableReason =
  'The native Android module is not available on web. This build runs in preview mode.';

export default createMockNativeModule() as unknown as PauseLoopNativeModule;

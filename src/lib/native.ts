import NativeModule, {
  isNativeAvailable as nativeAvailable,
  nativeUnavailableReason as unavailableReason,
} from '@native/index';

export const native = NativeModule;
export const isNativeAvailable = nativeAvailable;
export const nativeUnavailableReason = unavailableReason;
export const isPreviewMode = !nativeAvailable;

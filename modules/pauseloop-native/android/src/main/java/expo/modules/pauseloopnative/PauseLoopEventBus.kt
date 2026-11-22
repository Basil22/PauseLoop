package expo.modules.pauseloopnative

/**
 * Bridges service/overlay events to the Expo module without holding a strong
 * reference to the React context. The listeners are installed in the module's
 * OnCreate block and cleared in OnDestroy.
 */
object PauseLoopEventBus {
  @Volatile
  var overlayActionListener: ((action: String, packageName: String?) -> Unit)? = null

  @Volatile
  var monitoringStateListener: ((running: Boolean) -> Unit)? = null

  fun emitOverlayAction(action: String, packageName: String?) {
    overlayActionListener?.invoke(action, packageName)
  }

  fun emitMonitoringState(running: Boolean) {
    monitoringStateListener?.invoke(running)
  }
}

export interface Stream<T> {
  /** Emits an event to the stream. */
  emit(val: T): any;
  /**
   * Emits an event that terminates this steam. No new items will be emitted after this method is
   * called
   */
  end(): any;
}

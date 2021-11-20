export interface Stream<T> {
  emit(val: T): any;
  /**
   * Emits an event that terminates this steam. No new items will be emitted after this method is
   * called
   */
  end(): any;
}

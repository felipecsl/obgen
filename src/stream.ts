export interface Stream<T> {
  /** Pushes an event to the stream. */
  emit(val: T): any;
  /** Emits an event that terminates this stream. No new items will be emitted after this method is called */
  end?(): any;
}

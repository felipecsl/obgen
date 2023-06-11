import iteratorToIterable, {
  asyncFilterIterator,
  asyncMapIterator,
  filterIterator,
  flatMapIterator,
  iteratorToGenerator,
  mapIterator,
  takeIterator,
} from "./internal/util";
import BufferedIterator from "./bufferedIterator";
import Observable from "./observable";

/** Observable implementations that eagerly buffers events until they are fully consumed by the `Observer` */
export default class AsyncObservable<T> extends Observable<T> {
  private readonly buffer: BufferedIterator<T>;

  constructor(iteratorFn: () => AsyncIterator<T>) {
    super(iteratorFn);
    this.buffer = BufferedIterator.fromIterables(
      iteratorToIterable(iteratorFn)
    );
  }

  /** Iterates over the items in this iterable, draining any previously buffered items */
  override iterable(): AsyncIterable<T> {
    const { buffer } = this;
    return buffer;
  }

  override promise(): Promise<T> {
    return this.iterator()
      .next()
      .then((r) => r.value);
  }

  override iterator(): AsyncIterator<T> {
    return this.buffer;
  }

  /**
   * Collects all items emitted by this `Observable` and returns once a terminal event has been
   * received. Be careful as calling this method on an "infinite" `Observable` will never yield any
   * data.
   */
  override async toArray(): Promise<T[]> {
    const { buffer } = this;
    return buffer.drain();
  }

  /**
   * Calls the provided `mapFn` function on each element of this `Observable` and returns a new
   * `Observable` that emits the result of transforming each element of the input with the provided
   * function.
   */
  override map<O>(mapFn: (item: T) => O): Observable<O> {
    const { buffer } = this;
    return new AsyncObservable(() =>
      iteratorToGenerator(mapIterator(buffer, mapFn))
    );
  }

  /**
   * Calls the provided async `mapFn` function on each element of this `Observable` and returns a new
   * `Observable` that emits the result of transforming each element of the input with the resolved
   * value from the `Promise` returned by `mapFn` function.
   */
  override asyncMap<O>(mapFn: (item: T) => Promise<O>): Observable<O> {
    const { buffer } = this;
    return new AsyncObservable(() =>
      iteratorToGenerator(asyncMapIterator(buffer, mapFn))
    );
  }

  /**
   * Merges this `Observable` with the provided `other` `Observable` by joining both streams into a
   * new single`Observable` which is returned by this function.
   */
  override merge(other: Observable<T>): Observable<T> {
    return new AsyncObservable(() =>
      iteratorToGenerator(
        BufferedIterator.fromIterables(this.iterable(), other.iterable())
      )
    );
  }

  override flatMap<O>(mapFn: (item: T) => AsyncObservable<O>): Observable<O> {
    const { buffer } = this;
    return new AsyncObservable(() =>
      iteratorToGenerator(flatMapIterator(buffer, mapFn))
    );
  }

  /**
   * Returns only the elements of the `Observable` for whom the `Promise` returned from `filterFn`
   * resolves to `true`
   */
  override asyncFilter(filterFn: (item: T) => Promise<boolean>): Observable<T> {
    const { buffer } = this;
    return new AsyncObservable(() =>
      iteratorToGenerator(asyncFilterIterator(buffer, filterFn))
    );
  }

  /** Returns only the elements of the `Observable` for whom `filterFn` returns true */
  override filter(filterFn: (item: T) => boolean): Observable<T> {
    const { buffer } = this;
    return new AsyncObservable(() =>
      iteratorToGenerator(filterIterator(buffer, filterFn))
    );
  }

  /** Returns a new `Observable` that only yields the first `num` items */
  override take(num: number): Observable<T> {
    const { buffer } = this;
    return new AsyncObservable(() =>
      iteratorToGenerator(takeIterator(buffer, num))
    );
  }
}

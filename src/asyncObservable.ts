import iteratorToIterable, {
  asyncFilterIterator,
  asyncMapIterator,
  filterIterator,
  isObserver,
  mapIterator,
  takeIterator,
} from "./internal/util";
import BufferedIterator from "./bufferedIterator";
import Observable from "./observable";
import { Observer } from "./observer";
import { GenericObserver } from "./genericObserver";

export default class AsyncObservable<T> extends Observable<T> {
  private observers = new Set<Observer<T>>();
  private promise: Promise<void> | null = null;

  constructor(iterator: AsyncIterator<T>, observer?: GenericObserver<T>) {
    super(iterator);
    this.addObserver(observer);
    const self = this;
    const subscription = async () => {
      for await (const element of this.iterable()) {
        self.observers.forEach((s) => s.onNext(element));
      }
      self.observers.forEach((s) => s.onComplete && s.onComplete());
    };
    this.promise = subscription();
  }

  override iterable(): AsyncIterable<T> {
    const { iterator } = this;
    return iteratorToIterable(iterator);
  }

  /**
   * Subscribes to events emitted by this `Observable`, calling the provided `observer` function
   * whenever a new item is available. Returns a `Promise` that resolves once the `Observable` has
   * completed emitting all events.
   */
  override async subscribe(observer?: GenericObserver<T>): Promise<unknown> {
    const { promise } = this;
    this.addObserver(observer);
    return new Promise((resolve) => promise!.then(resolve));
  }

  private addObserver(observer?: GenericObserver<T>) {
    const { observers } = this;
    if (observer) {
      observers.add(
        isObserver(observer) ? observer : ({ onNext: observer } as Observer<T>)
      );
    }
  }

  /**
   * Collects all items emitted by this `Observable` and returns once a terminal event has been
   * received. Be careful as calling this method on an "infinite" `Observable` will never yield any
   * data.
   */
  override async toArray(): Promise<T[]> {
    const ret: T[] = [];
    await this.subscribe((i) => ret.push(i));
    return ret;
  }

  /**
   * Calls the provided `mapFn` function on each element of this `Observable` and returns a new
   * `Observable` that emits the result of transforming each element of the input with the provided
   * function.
   */
  override map<O>(mapFn: (item: T) => O): Observable<O> {
    const { iterator } = this;
    return new AsyncObservable(mapIterator(iterator, mapFn));
  }

  /**
   * Calls the provided async `mapFn` function on each element of this `Observable` and returns a new
   * `Observable` that emits the result of transforming each element of the input with the resolved
   * value from the `Promise` returned by `mapFn` function.
   */
  override asyncMap<O>(mapFn: (item: T) => Promise<O>): Observable<O> {
    const { iterator } = this;
    return new AsyncObservable(asyncMapIterator(iterator, mapFn));
  }

  /**
   * Merges this `Observable` with the provided `other` `Observable` by joining both streams into a
   * new single`Observable` which is returned by this function.
   */
  override merge(other: Observable<T>): Observable<T> {
    return new AsyncObservable(
      BufferedIterator.from(this.iterable(), other.iterable())
    );
  }

  override flatMap<O>(mapFn: (item: T) => AsyncObservable<O>): Observable<O> {
    const { iterator } = this;
    let innerIterator: AsyncIterator<O> | null;
    let isDone = false;
    return new AsyncObservable({
      async next() {
        let innerValue = null;
        let innerDone = true;
        while (innerDone) {
          const { value, done } = await iterator.next();
          isDone = done || false;
          if (isDone) {
            return { value: null, done: true };
          } else {
            innerIterator = mapFn(value).iterator;
            const final = await innerIterator.next();
            innerValue = final.value;
            innerDone = final.done || false;
          }
        }
        return { value: innerValue, done: innerDone };
      },
    });
  }

  /**
   * Returns only the elements of the `Observable` for whom the `Promise` returned from `filterFn`
   * resolves to `true`
   */
  override asyncFilter(filterFn: (item: T) => Promise<boolean>): Observable<T> {
    const { iterator } = this;
    return new AsyncObservable(asyncFilterIterator(iterator, filterFn));
  }

  /** Returns only the elements of the `Observable` for whom `filterFn` returns true */
  override filter(filterFn: (item: T) => boolean): Observable<T> {
    const { iterator } = this;
    return new AsyncObservable(filterIterator(iterator, filterFn));
  }

  /** Returns a new `Observable` that only yields the first `num` items */
  override take(num: number): Observable<T> {
    const { iterator } = this;
    return new AsyncObservable(takeIterator(iterator, num));
  }
}

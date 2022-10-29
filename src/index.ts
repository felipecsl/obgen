import AsyncObservable from "./asyncObservable";
import BufferedIterator from "./bufferedIterator";
import DeferredObservable from "./deferredObservable";
import Observable from "./observable";

export interface Stream<T> {
  /** Emits an event to the stream. */
  emit(val: T): any;
  /**
   * Emits an event that terminates this stream. No new items will be emitted after this method is
   * called
   */
  end(): any;
}

/** Creates a new stream that buffers events until they are fully consumed by the `Observer` */
export function buffer<T>(
  onSubscribe: (stream: Stream<T>) => any
): Observable<T> {
  return new AsyncObservable(new BufferedIterator(onSubscribe));
}

/**
 * Creates a new `Observable` that calls the provided `onNext` function **each time** `next()` is
 * called on the underlying `AsyncIterator`.
 */
export function defer<T>(onNext: (stream: Stream<T>) => any): Observable<T> {
  return new DeferredObservable({
    next() {
      return new Promise(async (resolve) => {
        onNext({
          emit(value: T, done: boolean = false) {
            resolve({ value, done });
          },

          end() {
            resolve({ value: null, done: true });
          },
        });
      });
    },
  });
}

/** Returns a new `Observable` that calls the provided `iteratorFn` function to emit events */
export function wrap<T>(iteratorFn: () => AsyncIterator<T>): Observable<T> {
  return new AsyncObservable(iteratorFn());
}

/** Returns a new `Observable` that, upon subscription, emits items from the input `arr` array */
export function from<T>(arr: T[]): Observable<T> {
  let i = 0;
  return defer((stream) => {
    if (i < arr.length) {
      stream.emit(arr[i++]);
    } else {
      stream.end();
    }
  });
}

/**
 * Constructs an `Observable` from a `Promise` by immediately resolving the provided `promiseFn`
 * function.
 */
export async function promise<T>(
  promiseFn: () => Promise<T>
): Promise<Observable<T>> {
  return just(await promiseFn());
}

/**
 * Constructs an `Observable` that defers resolution of the provided `promiseFn` until the
 * `Observable` is subscribed to (eg.: `subscribe()` or `toArray()` called).
 */
export function asyncDefer<T>(promiseFn: () => Promise<T>): Observable<T> {
  let done = false;
  return new DeferredObservable({
    next() {
      return new Promise(async (resolve) => {
        if (!done) {
          const value = await promiseFn();
          resolve({ value, done });
          done = true;
        } else {
          resolve({ value: null, done });
        }
      });
    },
  });
}

/** Returns a new empty `Observable`, which emits no items and ends immediately. */
export function empty<T>(): Observable<T> {
  return defer((stream) => stream.end());
}

/**
 * Creates an `Observable` that, upon subscription, emits the provided value `val` and ends
 * immediately.
 * */
export function just<T>(val: T): Observable<T> {
  return from([val]);
}

/**
 * Returns a new `Observable` that emits an infinite sequence of events on every `interval`
 * milliseconds.
 */
export function interval(interval: number): Observable<any> {
  return buffer((stream) => setInterval(() => stream.emit(null), interval));
}

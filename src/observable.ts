import BufferedIterator from "./bufferedIterator";
import { Stream } from "./stream";
import iteratorToIterable from "./util";

type Observer<T> = (item: T) => any;

export default class Observable<T> {
  constructor(private readonly iterator: AsyncIterator<T>) {}

  iterable(): AsyncIterable<T> {
    const { iterator } = this;
    return iteratorToIterable(iterator);
  }

  /**
   * Subscribes to events emitted by this `Observable`, calling the provided `observer` function
   * whenever a new item is available.
   */
  async subscribe(observer: Observer<T>) {
    for await (const element of this.iterable()) {
      observer(element);
    }
  }

  /**
   * Collects all items emitted by this `Observable` and returns once a terminal event has been
   * received. Be careful as calling this method on an "infinite" `Observable` will never yield any
   * data.
   */
  async toArray(): Promise<T[]> {
    const ret: T[] = [];
    await this.subscribe((i) => ret.push(i));
    return ret;
  }

  /**
   * Calls the provided `mapFn` function on each element of this `Observable` and returns a new
   * `Observable` that emits the result of transforming each element of the input with the provided
   * function.
   */
  map<O>(mapFn: (item: T) => O): Observable<O> {
    const { iterator } = this;
    return new Observable({
      async next() {
        const next = await iterator.next();
        return { value: mapFn(next.value), done: next.done };
      },
    });
  }

  /**
   * Calls the provided async `mapFn` function on each element of this `Observable` and returns a new
   * `Observable` that emits the result of transforming each element of the input with the resolved
   * value from the `Promise` returned by `mapFn` function.
   */
  asyncMap<O>(mapFn: (item: T) => Promise<O>): Observable<O> {
    const { iterator } = this;
    return new Observable({
      async next() {
        const next = await iterator.next();
        return { value: await mapFn(next.value), done: next.done };
      },
    });
  }

  /**
   * Merges this `Observable` with the provided `other` `Observable` by joining both streams into a
   * new single`Observable` which is returned by this function.
   */
  merge(other: Observable<T>): Observable<T> {
    return new Observable(
      BufferedIterator.from(this.iterable(), other.iterable())
    );
  }

  flatMap<O>(mapFn: (item: T) => Observable<O>): Observable<O> {
    const { iterator } = this;
    let innerIterator: AsyncIterator<O> | null;
    let isDone = false;
    return new Observable({
      async next() {
        if (!innerIterator) {
          const { value, done } = await iterator.next();
          isDone = done || false;
          innerIterator = mapFn(value).iterator;
        }
        if (isDone) {
          return { value: null, done: true };
        } else {
          const { value, done } = await innerIterator.next();
          if (done) {
            // inner iterator is done, move outer next
            const { value, done } = await iterator.next();
            isDone = done || false;
            innerIterator = mapFn(value).iterator;
            const final = await innerIterator.next();
            return { value: final.value, done: isDone };
          } else {
            return { value, done };
          }
        }
      },
    });
  }

  /** Returns only the elements of the `Observable` for whom `filterFn` returns true */
  filter(filterFn: (item: T) => boolean): Observable<T> {
    const { iterator } = this;
    return new Observable({
      async next() {
        let next = await iterator.next();
        while (!filterFn(next.value)) {
          next = await iterator.next();
        }
        return next;
      },
    });
  }

  /** Returns a new `Observable` that only yields the first `num` items */
  take(num: number): Observable<T> {
    const { iterator } = this;
    let i = 0;
    return new Observable({
      async next() {
        let next = await iterator.next();
        if (i++ < num) {
          return next;
        } else {
          return { done: true, value: next.value };
        }
      },
    });
  }

  /** Creates a new stream that buffers events until they are fully consumed by the `Observer` */
  static buffer<T>(onSubscribe: (strem: Stream<T>) => any): Observable<T> {
    return new Observable(new BufferedIterator(onSubscribe));
  }

  /**
   * Creates a new `Observable` that calls the provided `onSubscribe` **each time** `next()` is
   * called on the underlying `AsyncIterator`.
   */
  static create<T>(onSubscribe: (stream: Stream<T>) => any): Observable<T> {
    return new Observable({
      next() {
        return new Promise(async (resolve) => {
          onSubscribe({
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

  /** Returns a new `Observable` that calls the provided `onSubscribe` to emit events */
  static wrap<T>(onSubscribe: () => any): Observable<T> {
    return new Observable(onSubscribe());
  }

  /** Returns a new `Observable` that, upon subscription, emits items from the input `arr` array */
  static from<T>(arr: T[]): Observable<T> {
    let i = 0;
    return Observable.create((stream) => {
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
  static async promise<T>(promiseFn: () => Promise<T>): Promise<Observable<T>> {
    return Observable.just(await promiseFn());
  }

  /**
   * Constructs an `Observable` that defers resolution of the provided `promiseFn` until the
   * `Observable` is subscribed to (eg.: `subscribe()` or `toArray()` called).
   */
  static defer<T>(promiseFn: () => Promise<T>): Observable<T> {
    let done = false;
    return new Observable({
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
  static empty<T>(): Observable<T> {
    return Observable.create((stream) => stream.end());
  }

  /**
   * Creates an `Observable` that, upon subscription, emits the provided value `val` and ends
   * immediately.
   * */
  static just<T>(val: T): Observable<T> {
    return Observable.from([val]);
  }

  /**
   * Returns a new `Observable` that emits an infinite sequence of events on every `interval`
   * milliseconds.
   */
  static interval(interval: number): Observable<any> {
    return Observable.buffer((stream) =>
      setInterval(() => stream.emit(null), interval)
    );
  }
}

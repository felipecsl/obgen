import BufferedIterator from "./bufferedIterator";
import { Stream } from "./stream";

type Observer<T> = (item: T) => any;

export default class Observable<T> {
  constructor(private readonly iterator: AsyncIterator<T>) {}

  iterable(): AsyncIterable<T> {
    const { iterator } = this;
    return {
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };
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

  map<O>(mapFn: (item: T) => O): Observable<O> {
    const { iterator } = this;
    return new Observable({
      async next() {
        const next = await iterator.next();
        return { value: mapFn(next.value), done: next.done };
      },
    });
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
  static buffer<T>(createFn: (strem: Stream<T>) => any): Observable<T> {
    return new Observable(new BufferedIterator(createFn));
  }

  /**
   * Creates a new `Observable` that calls the provided `createFn` each time `next()` is called on
   * the underlying stream.
   */
  static create<T>(createFn: (stream: Stream<T>) => any): Observable<T> {
    return new Observable({
      next() {
        return new Promise(async (resolve) => {
          createFn({
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

  /** Returns a new `Observable` that calls the provided `createFn` to emit events */
  static wrap<T>(createFn: () => any): Observable<T> {
    return new Observable(createFn());
  }

  /** Returns a new `Observable` that emits items from an input array */
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

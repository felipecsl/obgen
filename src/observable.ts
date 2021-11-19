interface Stream<T> {
  emit(val: T, done?: boolean): any;
}

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
    return new Observable({
      async next() {
        if (!innerIterator) {
          const next = await iterator.next();
          innerIterator = mapFn(next.value).iterator;
        }
        const innerNext = await innerIterator.next();
        if (innerNext.done) {
          innerIterator = null;
          return { value: innerNext.value, done: false };
        } else {
          return innerNext;
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

  /** Returns a new `Observable` */
  static newInstance<T>(fn: (strem: Stream<T>) => any): Observable<T> {
    return new Observable({
      next() {
        return new Promise(async (resolve) => {
          fn({
            emit(value: T, done: boolean = false) {
              resolve({ value, done });
            },
          });
        });
      },
    });
  }

  /** Returns a new `Observable` that emits items from an input array */
  static from<T>(arr: T[]): Observable<T> {
    let i = 0;
    return Observable.newInstance((stream) => {
      if (i < arr.length) {
        stream.emit(arr[i++], i == arr.length);
      }
    });
  }

  /** Returns a new AsyncIterable that emits one event every `interval` milliseconds */
  static interval(interval: number): Observable<any> {
    return Observable.newInstance((stream) =>
      setTimeout(() => stream.emit(null), interval)
    );
  }
}

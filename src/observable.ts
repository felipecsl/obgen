interface Stream<T> {
  emit(val: T): any;
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
        return { value: mapFn(next.value) };
      },
    });
  }

  /** Returns a new Observable */
  static newInstance<T>(fn: (strem: Stream<T>) => any): Observable<T> {
    return new Observable({
      next() {
        return new Promise(async (resolve) => {
          fn({
            emit(result: T) {
              resolve({ value: result });
            },
          });
        });
      },
    });
  }

  /** Returns a new AsyncIterable that emits one event every `interval` milliseconds */
  static interval(interval: number): Observable<any> {
    return Observable.newInstance((stream) =>
      setTimeout(() => stream.emit(null), interval)
    );
  }
}

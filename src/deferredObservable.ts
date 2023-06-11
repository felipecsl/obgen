import iteratorToIterable, {
  asyncFilterIterator,
  asyncMapIterator,
  filterIterator,
  flatMapIterator,
  mapIterator,
  takeIterator,
} from "./internal/util";
import AsyncObservable from "./asyncObservable";
import BufferedIterator from "./bufferedIterator";
import Observable from "./observable";

/**
 * An Observable implementation that defers iterating over the underlying `AsyncIterator` until `subscribe()` is called.
 */
export default class DeferredObservable<T> extends Observable<T> {
  private _iterator: AsyncIterator<T> | null = null;

  constructor(iteratorFn: () => AsyncIterator<T>) {
    super(iteratorFn);
  }

  override iterable(): AsyncIterable<T> {
    this._iterator = this.iteratorFn();
    const { _iterator } = this;
    return iteratorToIterable(() => _iterator);
  }

  override iterator(): AsyncIterator<T> {
    this._iterator = this._iterator || this.iteratorFn();
    return this._iterator;
  }

  override promise(): Promise<T> {
    return this._iterator.next().then((r) => r.value);
  }

  override asyncFilter(filterFn: (item: T) => Promise<boolean>): Observable<T> {
    const self = this;
    return new DeferredObservable(() =>
      asyncFilterIterator(self.iterator(), filterFn)
    );
  }

  override asyncMap<O>(mapFn: (item: T) => Promise<O>): Observable<O> {
    const self = this;
    return new DeferredObservable(() =>
      asyncMapIterator(self.iterator(), mapFn)
    );
  }

  override filter(filterFn: (item: T) => boolean): Observable<T> {
    const self = this;
    return new DeferredObservable(() =>
      filterIterator(self.iterator(), filterFn)
    );
  }

  override map<O>(mapFn: (item: T) => O): Observable<O> {
    const self = this;
    return new DeferredObservable(() => mapIterator(self.iterator(), mapFn));
  }

  override flatMap<O>(mapFn: (item: T) => AsyncObservable<O>): Observable<O> {
    const self = this;
    return new DeferredObservable(() =>
      flatMapIterator(self.iterator(), mapFn)
    );
  }

  override merge(other: Observable<T>): Observable<T> {
    return new DeferredObservable(() =>
      BufferedIterator.fromIterables(this.iterable(), other.iterable())
    );
  }

  override take(num: number): Observable<T> {
    const self = this;
    return new DeferredObservable(() => takeIterator(self.iterator(), num));
  }

  override async toArray(): Promise<T[]> {
    const buffer = BufferedIterator.fromIterables(this.iterable());
    return buffer.drain();
  }
}

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
import { GenericObserver } from "./genericObserver";

/**
 * An Observable implementation that defers the creation of the underlying `Observer` until `subscribe()` is called.
 */
export default class DeferredObservable<T> extends Observable<T> {
  private inner?: Observable<T>;

  constructor(iterator: AsyncIterator<T>) {
    super(iterator);
  }

  override async subscribe(observer?: GenericObserver<T>): Promise<unknown> {
    const { inner, iterator } = this;
    this.inner = inner || new AsyncObservable(iterator, observer);
    return this.inner.subscribe();
  }

  override asyncFilter(filterFn: (item: T) => Promise<boolean>): Observable<T> {
    const { iterator } = this;
    return new DeferredObservable(asyncFilterIterator(iterator, filterFn));
  }

  override asyncMap<O>(mapFn: (item: T) => Promise<O>): Observable<O> {
    const { iterator } = this;
    return new DeferredObservable(asyncMapIterator(iterator, mapFn));
  }

  override filter(filterFn: (item: T) => boolean): Observable<T> {
    const { iterator } = this;
    return new DeferredObservable(filterIterator(iterator, filterFn));
  }

  override iterable(): AsyncIterable<T> {
    const { iterator } = this;
    return iteratorToIterable(iterator);
  }

  override map<O>(mapFn: (item: T) => O): Observable<O> {
    const { iterator } = this;
    return new DeferredObservable(mapIterator(iterator, mapFn));
  }

  override flatMap<O>(mapFn: (item: T) => AsyncObservable<O>): Observable<O> {
    const { iterator } = this;
    return new DeferredObservable(flatMapIterator(iterator, mapFn));
  }

  override merge(other: Observable<T>): Observable<T> {
    return new DeferredObservable(
      BufferedIterator.from(this.iterable(), other.iterable())
    );
  }

  override take(num: number): Observable<T> {
    const { iterator } = this;
    return new DeferredObservable(takeIterator(iterator, num));
  }

  override async toArray(): Promise<T[]> {
    const ret: T[] = [];
    await this.subscribe((i) => ret.push(i));
    return ret;
  }
}

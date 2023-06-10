import { GenericObserver } from "./genericObserver";
import { isObserver } from "./internal/util";

export default abstract class Observable<T> {
  protected constructor(readonly iteratorFn: () => AsyncIterator<T>) {}

  async subscribe(observer?: GenericObserver<T>): Promise<void> {
    for await (const item of this.iterable()) {
      if (isObserver(observer)) {
        observer.onNext(item);
      } else {
        (observer as (item: T) => any)(item);
      }
    }
    isObserver(observer) && observer.onComplete && observer.onComplete();
  }

  abstract iterable(): AsyncIterable<T>;
  abstract iterator(): AsyncIterator<T>;
  abstract toArray(): Promise<T[]>;
  abstract map<O>(mapFn: (item: T) => O): Observable<O>;
  abstract flatMap<O>(mapFn: (item: T) => Observable<O>): Observable<O>;
  abstract asyncMap<O>(mapFn: (item: T) => Promise<O>): Observable<O>;
  abstract merge(other: Observable<T>): Observable<T>;
  abstract asyncFilter(filterFn: (item: T) => Promise<boolean>): Observable<T>;
  abstract filter(filterFn: (item: T) => boolean): Observable<T>;
  abstract take(num: number): Observable<T>;
}

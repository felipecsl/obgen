import { GenericObserver } from "./deferredObservable";

export type Observer<T> = {
  onNext: (item: T) => any;
  onComplete?: () => any;
  // TODO add onError handling
  onError?: (err: any) => any;
};

export default abstract class Observable<T> {
  protected constructor(readonly iterator: AsyncIterator<T>) {}

  abstract iterable(): AsyncIterable<T>;
  abstract subscribe(observer?: GenericObserver<T>): Promise<unknown>;
  abstract toArray(): Promise<T[]>;
  abstract map<O>(mapFn: (item: T) => O): Observable<O>;
  abstract flatMap<O>(mapFn: (item: T) => Observable<O>): Observable<O>;
  abstract asyncMap<O>(mapFn: (item: T) => Promise<O>): Observable<O>;
  abstract merge(other: Observable<T>): Observable<T>;
  abstract asyncFilter(filterFn: (item: T) => Promise<boolean>): Observable<T>;
  abstract filter(filterFn: (item: T) => boolean): Observable<T>;
  abstract take(num: number): Observable<T>;
}

import { DeferredPromise } from "./deferredPromise";

export class DeferredPromiseResolver<T> {
  private readonly deferred = new DeferredPromise<T>();

  resolve(value: T | null): void {
    const { deferred } = this;
    deferred.resolve!(value as T);
  }

  reject(reason?: any): void {
    const { deferred } = this;
    deferred.reject!(reason);
  }

  promise(): Promise<T> {
    const {
      deferred: { promise },
    } = this;
    return promise!;
  }
}

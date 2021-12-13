import { DeferredPromise } from "./deferredPromise";

export class DeferredPromiseResolver<T> {
  private readonly deferred: DeferredPromise<T> = new DeferredPromise<T>();

  resolve(value: T | null): void {
    this.deferred.resolve!(value as T);
  }

  reject(reason?: any): void {
    this.deferred.reject!(reason);
  }

  promise(): Promise<T> {
    return this.deferred.promise!;
  }
}

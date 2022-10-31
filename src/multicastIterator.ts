import { DeferredPromiseResolver } from "./internal/deferredPromiseResolver";

export default class MulticastIterator<T> implements AsyncIterableIterator<T> {
  private pendingItem: Promise<void> | null = null;
  private readonly deferredPromises: DeferredPromiseResolver<
    IteratorResult<T>
  >[] = [];

  constructor(private readonly inner: AsyncIterator<T>) {}

  [Symbol.asyncIterator]() {
    return this;
  }

  async next(..._: [] | [undefined]): Promise<IteratorResult<T>> {
    const { inner, pendingItem, deferredPromises } = this;
    if (pendingItem) {
      // enqueue pending listener
      const deferredPromise = new DeferredPromiseResolver<IteratorResult<T>>();
      deferredPromises.push(deferredPromise);
      return await deferredPromise.promise();
    } else {
      const self = this;
      return new Promise((resolve) => {
        self.pendingItem = inner.next().then((item) => {
          // resolve this listener
          resolve(item);
          // resolve any other pending listeners
          while (self.deferredPromises.length > 0) {
            deferredPromises.shift()!.resolve(item);
          }
          // clear this pending item, so we can request a new one the next time next() is called
          self.pendingItem = null;
        });
      });
    }
  }
}

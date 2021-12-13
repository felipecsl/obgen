import { Stream } from "./stream";

type DeferredPromise = {
  promise?: Promise<any>;
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
};

class DeferredPromiseResolver {
  private readonly deferred: DeferredPromise = {};

  constructor() {
    this.deferred.promise = new Promise((resolve, reject) => {
      this.deferred.resolve = resolve;
      this.deferred.reject = reject;
    });
  }

  resolve(): void {
    this.deferred.resolve!(null);
  }

  reject(reason?: any): void {
    this.deferred.reject!(reason);
  }

  promise(): Promise<any> {
    return this.deferred.promise!;
  }
}

/**
 * An `AsyncIterator` implementation that buffers events until they are consumed.
 * Calling next() automatically waits until new events are available in the stream.
 *
 * TODO configure max capacity
 * TODO handle backpressure
 */
export default class BufferedIterator<T, TReturn = any, TNext = undefined>
  implements AsyncIterator<T, TReturn, TNext>
{
  private readonly deferredPromises: DeferredPromiseResolver[] = [];
  private readonly buffer: T[] = [];
  // Marks the end of the stream
  private ended = false;

  constructor(createFn: (strem: Stream<T>) => any) {
    const { buffer, ended } = this;
    const self = this;
    createFn({
      end() {
        if (self.ended) {
          throw new Error("Stream has already ended");
        } else {
          self.ended = true;
          self.resolvePromises();
        }
      },

      emit(value: T) {
        // TODO: wrap in a critical section (run exclusively)
        if (ended) {
          throw new Error("Stream has already ended");
        } else {
          buffer.push(value);
        }
        self.resolvePromises();
      },
    });
  }

  async waitForIncomingItems() {
    // lock until an event is emitted by awaiting on promise resolver
    const deferredPromise = new DeferredPromiseResolver();
    this.deferredPromises.push(deferredPromise);
    await deferredPromise.promise();
  }

  private resolvePromises() {
    while (this.deferredPromises.length > 0) {
      this.deferredPromises.shift()!.resolve();
    }
  }

  private endStream(resolve: (_: any) => void) {
    resolve({ value: 0 as any, done: true });
  }

  private emit(resolve: (_: any) => void) {
    resolve({ value: this.buffer.shift() as T });
  }

  next(..._: [] | [TNext]): Promise<IteratorResult<T, TReturn>> {
    return new Promise(async (resolve) => {
      const { buffer, ended } = this;
      if (buffer.length === 0) {
        // buffer is drained
        if (ended) {
          // stream has been fully consumed and ended, mark stream as done
          this.endStream(resolve);
        } else {
          // lock until a new event is emitted
          await this.waitForIncomingItems();
          // resolver lock was acquired
          // the stream may have ended while we were waiting, so we check that again below
          // TODO: Wrap in a critical session
          if (this.ended) {
            this.endStream(resolve);
          } else {
            this.emit(resolve);
          }
        }
      } else {
        this.emit(resolve);
      }
    });
  }
}

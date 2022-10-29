import { DeferredPromiseResolver } from "./internal/deferredPromiseResolver";
import { Stream } from "./index";

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
  private readonly deferredPromises: DeferredPromiseResolver<T>[] = [];
  private readonly buffer: T[] = [];
  // Marks the end of the stream
  private ended = false;

  /** Constructs a new `BufferedIterator` from the provided `AsyncIterable`(s) */
  static from<T>(...iterables: AsyncIterable<T>[]): BufferedIterator<T> {
    return new BufferedIterator(async (stream) => {
      await Promise.all(
        iterables.map(async (iterable) => {
          for await (const item of iterable) {
            stream.emit(item);
          }
        })
      );
      stream.end();
    });
  }

  constructor(onCreate: (stream: Stream<T>) => any) {
    const { buffer, ended } = this;
    const self = this;
    onCreate({
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

  private async waitForIncomingItems() {
    // lock until an event is emitted by awaiting on promise resolver
    const { deferredPromises } = this;
    const deferredPromise = new DeferredPromiseResolver<T>();
    deferredPromises.push(deferredPromise);
    await deferredPromise.promise();
  }

  private resolvePromises() {
    // TODO: wrap in a critical section
    const { deferredPromises } = this;
    while (deferredPromises.length > 0) {
      deferredPromises.shift()!.resolve(null);
    }
  }

  private endStream(resolve: (_: any) => void) {
    resolve({ value: 0 as any, done: true });
  }

  private emit(resolve: (_: any) => void) {
    resolve({ value: this.buffer.shift() });
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

import { DeferredPromiseResolver } from "./internal/deferredPromiseResolver";
import { Stream } from "./index";
import iteratorToIterable from "./internal/util";

/**
 * An `AsyncIterator` implementation that buffers events until they are consumed.
 * Calling next() automatically waits until new events are available in the stream.
 * As items are iterated over, they are removed from the buffer. That means that
 * you can only iterate over each item once.
 *
 * TODO configure max capacity
 * TODO handle backpressure
 */
export default class BufferedIterator<T>
  implements AsyncIterator<T, any, undefined>
{
  private readonly deferredPromises: DeferredPromiseResolver<T>[] = [];
  private readonly buffer: T[] = [];
  // Marks the end of the stream
  private ended = false;

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

  clone(): BufferedIterator<T> {
    const { buffer } = this;
    return new BufferedIterator<T>(async (stream) => {
      buffer.forEach((item) => stream.emit(item));
      for await (const item of iteratorToIterable(() => this)) {
        stream.emit(item);
      }
    });
  }

  /**
   * Drains (collects) all items from the buffer and returns a Promise that resolves to an array once all the items
   * in the stream have been collected. This method clears the buffer, thus subsequent enumerations of the iterator
   * will not yield any items that have already been drained.
   */
  async drain(): Promise<T[]> {
    const buf: T[] = [];
    for await (const item of iteratorToIterable<T>(() => this)) {
      buf.push(item);
    }
    return buf;
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

  next(..._: [] | [undefined]): Promise<IteratorResult<T, any>> {
    const { buffer, ended } = this;
    return new Promise(async (resolve) => {
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

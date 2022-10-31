import { DeferredPromiseResolver } from "./internal/deferredPromiseResolver";
import { Stream } from "./stream";

/**
 * An `AsyncIterableIterator` implementation that buffers events until they are consumed.
 * Iterating it automatically waits until new events are available in the stream.
 * As items are iterated over, they are removed from the buffer. That means that
 * you can only iterate over each item once.
 *
 * TODO configure max capacity
 * TODO handle backpressure
 */
export default class BufferedIterator<T>
  implements AsyncIterableIterator<T>, Stream<T>
{
  private readonly deferredPromises: DeferredPromiseResolver<
    IteratorResult<T>
  >[] = [];
  private readonly buffer: T[] = [];
  // Marks the end of the stream
  private ended = false;

  constructor(onCreate: (stream: Stream<T>) => any = () => {}) {
    onCreate(this);
  }

  /**
   * Marks the stream as ended, which asserts there will be no more incoming items. This releases any currently
   * awaiting listeners.
   */
  end() {
    const { ended } = this;
    if (ended) {
      throw new Error("Stream has already ended");
    } else {
      this.ended = true;
      this.endStream();
    }
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  /**
   * Push an item to the stream. Immediately delivers the new item to any currently awaiting listeners or otherwise
   * enqueues it in the buffer for later delivery.
   */
  emit(value: T) {
    // TODO: wrap in a critical section (run exclusively)
    const { deferredPromises, ended, buffer } = this;
    if (ended) {
      throw new Error("Stream has already ended");
    } else {
      buffer.push(value);
    }
    if (deferredPromises.length > 0) {
      // if there are any active listeners, deliver the new item to
      // all of them and immediately dequeue it
      this.resolvePromises(value);
      buffer.shift();
    }
  }

  /** Constructs a new `BufferedIterator` from the provided `AsyncIterable`(s) */
  static fromIterables<T>(
    ...iterables: AsyncIterable<T>[]
  ): BufferedIterator<T> {
    return new BufferedIterator(async (stream) => {
      await Promise.all(
        iterables.map(async (iterable) => {
          for await (const item of iterable) {
            stream.emit(item);
          }
        })
      );
      stream.end!();
    });
  }

  /**
   * Creates a new BufferedIterator instance with a copy of the current buffer without draining it.
   */
  clone(): BufferedIterator<T> {
    const { buffer, ended } = this;
    return new BufferedIterator<T>(async (stream) => {
      buffer.forEach((item) => stream.emit(item));
      if (ended) {
        stream.end!();
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
    for await (const item of this) {
      buf.push(item);
    }
    return buf;
  }

  /** Release listeners who are waiting for a new item to be yielded */
  private resolvePromises(value: T) {
    const { deferredPromises } = this;
    while (deferredPromises.length > 0) {
      deferredPromises.shift()!.resolve({ value, done: false });
    }
  }

  private endStream() {
    const { deferredPromises } = this;
    while (deferredPromises.length > 0) {
      deferredPromises.shift()!.resolve({ value: null, done: true });
    }
  }

  /**
   * Calling next() consumes (removes) the oldest item from the buffer if one is available or waits until a new item is
   * available before returning it.
   */
  async next(..._: [] | [undefined]): Promise<IteratorResult<T, any>> {
    const { buffer, ended, deferredPromises } = this;
    if (buffer.length > 0) {
      // remove and return the first (oldest) item
      return { value: buffer.shift()!, done: false };
    } else if (ended) {
      // stream has been fully consumed and ended
      return { value: 0 as any, done: true };
    } else {
      const deferredPromise = new DeferredPromiseResolver<IteratorResult<T>>();
      deferredPromises.push(deferredPromise);
      return await deferredPromise.promise();
    }
  }
}

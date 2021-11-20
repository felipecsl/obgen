import { Stream } from "./stream";

class DelayedPromiseResolver {
  private resolveFn: (_: any) => void = (_) => {};
  readonly resolver = (resolve: (_: any) => void) => {
    // TODO: might need to handle concurrency here?
    // multiple observers might overwrite each other here
    this.resolveFn = resolve;
  };

  resolve() {
    if (this.resolveFn) {
      this.resolveFn(null);
    }
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
  private readonly bufferedResolver = new DelayedPromiseResolver();
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
          self.bufferedResolver.resolve();
        }
      },

      emit(value: T) {
        // TODO: wrap in a critical section (run exclusively)
        if (ended) {
          throw new Error("Stream has already ended");
        } else {
          buffer.push(value);
        }
        self.bufferedResolver.resolve();
      },
    });
  }

  async waitForIncomingItems() {
    // lock until an event is emitted by awaiting on promise resolver
    await new Promise(this.bufferedResolver.resolver);
  }

  private endStream(resolve: (_: any) => void) {
    resolve({ value: 0 as any, done: true });
  }

  private emit(resolve: (_: any) => void) {
    resolve({ value: this.buffer.shift() as T });
  }

  next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>> {
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

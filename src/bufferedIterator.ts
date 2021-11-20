import { Stream } from "./stream";

class DelayedPromiseResolver {
  private resolveFn: (_: any) => void;
  readonly resolver = (resolve: (_: any) => void) => {
    this.resolveFn = resolve;
  };

  resolve() {
    this.resolveFn(null);
  }
}
/**
 * An `AsyncIterator` implementation that buffers events until they are consumed.
 * Calling next() automatically waits until new events are available in the stream
 * TODO configure max capacity
 * TODO handle backpressure
 */
export default class BufferedIterator<T, TReturn = any, TNext = undefined>
  implements AsyncIterator<T, TReturn, TNext>
{
  private bufferedResolver: DelayedPromiseResolver;
  // TODO: Use a queue instead of array
  private readonly buffer: T[] = [];
  // current cursor position in the buffer
  private pos = 0;
  // Marks the end of the stream
  private ended = false;

  constructor(createFn: (strem: Stream<T>) => any) {
    const { buffer, ended } = this;
    const self = this;
    createFn({
      end() {
        self.ended = true;
        if (self.bufferedResolver) {
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
        if (self.bufferedResolver) {
          self.bufferedResolver.resolve();
        }
      },
    });
  }

  async waitForIncomingItems() {
    // lock until an event is emitted
    if (!this.bufferedResolver) {
      this.bufferedResolver = new DelayedPromiseResolver();
    }
    // await on promise resolver
    await new Promise(this.bufferedResolver.resolver);
  }

  next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>> {
    return new Promise(async (resolve) => {
      const { pos, buffer, ended } = this;
      if (pos === buffer.length) {
        // buffer is drained
        if (ended) {
          // stream has been fully consumed and ended, mark stream as done
          resolve({ value: 0 as any, done: true });
        } else {
          // lock until a new event is emitted
          await this.waitForIncomingItems();
          // resolver lock was acquired
          // the stream may have ended while we were waiting, so we check that again below
          if (this.ended) {
            resolve({ value: 0 as any, done: true });
          } else {
            resolve({ value: buffer[this.pos++] });
          }
        }
      } else {
        resolve({ value: buffer[this.pos++] });
      }
    });
  }
}

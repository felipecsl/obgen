import { Stream } from "./stream";

/**
 * An `AsyncIterator` implementation that buffers events until they are consumed.
 * TODO configure max capacity
 * TODO handle waiting and backpressure
 */
export default class BufferedIterator<T, TReturn = any, TNext = undefined>
  implements AsyncIterator<T, TReturn, TNext>
{
  // TODO: Use a linked list instead of array
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
      },

      emit(value: T) {
        if (ended) {
          throw new Error("Stream has already ended");
        } else {
          buffer.push(value);
        }
      },
    });
  }

  next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>> {
    return new Promise(async (resolve) => {
      const { pos, buffer, ended } = this;
      if (pos === buffer.length && ended) {
        // stream has been fully consumed and ended, mark stream as done
        resolve({ value: 0 as any, done: true });
      } else {
        if (pos < buffer.length) {
          resolve({ value: buffer[this.pos++] });
        } else {
          // await until a new item is emitted
        }
      }
    });
  }
}

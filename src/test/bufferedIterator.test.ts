import { delay } from "../internal/util";
import BufferedIterator from "../bufferedIterator";

describe("BufferedIterator#emit", () => {
  it("should yield items emitted to the buffer", async () => {
    const buffer = new BufferedIterator();
    const callback = (c: string) => buffer.emit(c);
    callback("a");
    callback("b");
    callback("c");
    delay(100).then(() => callback("d"));
    delay(200).then(() => callback("e"));
    delay(300).then(() => buffer.end());
    const mock = jest.fn();
    for await (const value of buffer) {
      mock(value);
    }
    expect(mock).toHaveBeenNthCalledWith(1, "a");
    expect(mock).toHaveBeenNthCalledWith(2, "b");
    expect(mock).toHaveBeenNthCalledWith(3, "c");
    expect(mock).toHaveBeenNthCalledWith(4, "d");
    expect(mock).toHaveBeenNthCalledWith(5, "e");
    expect(mock).toHaveBeenCalledTimes(5);
  });
  it("should drain the buffer", async () => {
    const buffer = new BufferedIterator();
    buffer.emit(1);
    buffer.emit(2);
    buffer.emit(3);
    buffer.end();
    const items = await buffer.drain();
    expect(items).toEqual([1, 2, 3]);
    // no more items left to be drained
    expect(await buffer.drain()).toEqual([]);
  });
  it("should clone the buffer state", async () => {
    const buffer = new BufferedIterator();
    buffer.emit("a");
    buffer.emit("b");
    buffer.emit("c");
    const clone = buffer.clone();
    buffer.end();
    clone.emit("d");
    clone.end();
    const mock1 = jest.fn();
    const mock2 = jest.fn();
    const promise1 = async () => {
      for await (const value of buffer) {
        mock1(value);
      }
    };
    const promise2 = async () => {
      for await (const value of clone) {
        mock2(value);
      }
    };
    await Promise.all([promise1(), promise2()]);
    expect(mock1).toHaveBeenNthCalledWith(1, "a");
    expect(mock1).toHaveBeenNthCalledWith(2, "b");
    expect(mock1).toHaveBeenNthCalledWith(3, "c");
    expect(mock1).toHaveBeenCalledTimes(3);
    expect(mock2).toHaveBeenNthCalledWith(1, "a");
    expect(mock2).toHaveBeenNthCalledWith(2, "b");
    expect(mock2).toHaveBeenNthCalledWith(3, "c");
    expect(mock2).toHaveBeenNthCalledWith(4, "d");
    expect(mock2).toHaveBeenCalledTimes(4);
  });
});

import BufferedIterator from "../bufferedIterator";
import MulticastIterator from "../multicastIterator";

describe("MulticastIterator", () => {
  it("should allow multiple listeners", async () => {
    const buffer = new BufferedIterator();
    buffer.emit(1);
    buffer.emit(2);
    buffer.emit(3);
    buffer.end();
    const multicastIterator = new MulticastIterator(buffer);
    const mock1 = jest.fn();
    const promise1 = async () => {
      for await (const item of multicastIterator) {
        mock1(item);
      }
    };
    const mock2 = jest.fn();
    const promise2 = async () => {
      for await (const item of multicastIterator) {
        mock2(item);
      }
    };
    await Promise.all([promise1(), promise2()]);
    expect(mock1).toHaveBeenCalledTimes(3);
    expect(mock2).toHaveBeenCalledTimes(3);
  });
});

import Observable from "../observable";
describe("Observable", () => {
  describe("#just", () => {
    describe("#subscribe", () => {
      it("yields hello world", async () => {
        const observable = Observable.just("hello world");
        const mock = jest.fn();
        await observable.subscribe(mock);
        expect(mock).toHaveBeenCalledWith("hello world");
      });
    });
    describe("#toArray", () => {
      it("yields a single item", async () => {
        const observable = Observable.just("hello world");
        expect(await observable.toArray()).toEqual(["hello world"]);
      });
    });
  });
  describe("#from", () => {
    describe("#subscribe", () => {
      it("does not call observer for empty array", async () => {
        const observable = Observable.from([]);
        const mock = jest.fn();
        await observable.subscribe(mock);
        expect(mock).toHaveBeenCalledTimes(0);
      });
      it("calls N times", async () => {
        const observable = Observable.from([3, 2, 1]);
        const mock = jest.fn();
        await observable.subscribe(mock);
        expect(mock).toHaveBeenCalledTimes(3);
        expect(mock).toHaveBeenNthCalledWith(1, 3);
        expect(mock).toHaveBeenNthCalledWith(2, 2);
        expect(mock).toHaveBeenNthCalledWith(3, 1);
      });
    });
    describe("#toArray", () => {
      it("yields an empty array", async () => {
        const observable = Observable.from([]);
        expect(await observable.toArray()).toEqual([]);
      });
      it("yields the input array when toArray() is called", async () => {
        const observable = Observable.from([1, 2, 3]);
        expect(await observable.toArray()).toEqual([1, 2, 3]);
      });
    });
  });
});

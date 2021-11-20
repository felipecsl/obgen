import Observable from "../observable";
import { Stream } from "../stream";
import { times } from "lodash";

describe("Observable", () => {
  describe("#buffer", () => {
    describe("#toArray", () => {
      it("emits buffered items", async () => {
        const observable = Observable.buffer((stream) => {
          stream.emit(1);
          stream.emit(2);
          stream.emit(3);
          stream.emit(4);
          stream.end();
        });
        expect(await observable.toArray()).toEqual([1, 2, 3, 4]);
      });
    });
  });
  describe("#wrap", () => {
    describe("#toArray", () => {
      it("emits items", async () => {
        const observable = Observable.wrap(async function* () {
          yield "a";
          yield "b";
          yield "c";
        });
        expect(await observable.toArray()).toEqual(["a", "b", "c"]);
      });
    });
    describe("#subscribe", () => {
      it("emits items", async () => {
        const observable = Observable.wrap(async function* () {
          yield "a";
          yield "b";
          yield "c";
        });
        const mock = jest.fn();
        await observable.subscribe(mock);
        expect(mock).toHaveBeenCalledTimes(3);
        expect(mock).toHaveBeenNthCalledWith(1, "a");
        expect(mock).toHaveBeenNthCalledWith(2, "b");
        expect(mock).toHaveBeenNthCalledWith(3, "c");
      });
    });
  });
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

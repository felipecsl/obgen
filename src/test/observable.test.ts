import {
  asyncDefer,
  buffer,
  deferredWrap,
  empty,
  from,
  just,
  promise,
  wrap,
} from "../index";
import { times } from "lodash";

describe("Observable", () => {
  describe("#buffer", () => {
    describe("#toArray", () => {
      it("emits buffered items", async () => {
        const observable = buffer((stream) => {
          stream.emit(1);
          stream.emit(2);
          stream.emit(3);
          stream.emit(4);
          stream.end();
        });
        expect(await observable.toArray()).toEqual([1, 2, 3, 4]);
      });

      it("emits new items as they become available", async () => {
        const observable = buffer((stream) => {
          // delay emission for a few milliseconds so that it happens after we subscribe
          times(5, (i) => setTimeout(() => stream.emit(i), i * 100));
          setTimeout(() => stream.end(), 600);
        });
        expect(await observable.toArray()).toEqual([0, 1, 2, 3, 4]);
      });
    });
  });
  describe("#map", () => {
    it("should multiply items in the input array", async () => {
      const observable = from([1, 2, 3]).map((i) => i * 2);
      expect(await observable.toArray()).toEqual([2, 4, 6]);
    });
  });
  describe("#flatMap", () => {
    it("should multiply items in the input array", async () => {
      const observable = from([1, 2, 3]).flatMap((i) => just(i * 2));
      expect(await observable.toArray()).toEqual([2, 4, 6]);
    });
    it("should not emit empty odd items", async () => {
      const observable = from([1, 2, 3, 4, 5, 6, 7, 8, 9]).flatMap((i) =>
        i % 2 === 0 ? just(i) : empty()
      );
      expect(await observable.toArray()).toEqual([2, 4, 6, 8]);
    });
    it("should not emit empty even items", async () => {
      const observable = from([1, 2, 3, 4, 5, 6, 7, 8, 9]).flatMap((i) =>
        i % 2 !== 0 ? just(i) : empty()
      );
      expect(await observable.toArray()).toEqual([1, 3, 5, 7, 9]);
    });
    it("should emit empty array", async () => {
      const observable = from([1, 2, 3, 4, 5, 6, 7, 8, 9]).flatMap((_) =>
        empty()
      );
      expect(await observable.toArray()).toEqual([]);
    });
  });
  describe("#asyncMap", () => {
    it("should multiply items in the input array", async () => {
      const observable = from([1, 2, 3]).asyncMap((i) =>
        Promise.resolve(i * 3)
      );
      expect(await observable.toArray()).toEqual([3, 6, 9]);
    });
  });
  // TODO test rejections
  describe("#merge", () => {
    it("should join multiple observables", async () => {
      const observable = from([0, 1, 2, 3, 4, 5]).merge(from([6, 7, 8, 9]));
      const actual = await observable.toArray();
      // items are expected to be emitted out of order, so we sort them here
      expect(actual.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
    it("should allow merging with empty Observable", async () => {
      const observable = from([0, 1, 2, 3, 4, 5]).merge(empty());
      const actual = await observable.toArray();
      expect(actual).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });
  describe("#promise", () => {
    it("should resolve promise to Observable", async () => {
      const arr = [1];
      const observable = await promise(() => Promise.resolve([...arr]));
      // item 2 should not be included in the output because the promise was already resolved
      arr.push(2);
      // we expect a nested array because its an Observable<number[]> thus toArray() yields number[][]
      expect(await observable.toArray()).toEqual([[1]]);
    });
  });
  describe("#empty", () => {
    it("should emit no items", async () => {
      const observable = empty();
      expect(await observable.toArray()).toEqual([]);
    });
  });
  describe("#defer", () => {
    it("should resolve promise upon subscription", async () => {
      const arr = [1];
      const observable = asyncDefer(() => Promise.resolve([...arr]));
      // item 2 should be included in the output because the Promise is only resolved once `toArray()`
      // is called
      arr.push(2);
      // we expect a nested array because it's an Observable<number[]> thus toArray() yields number[][]
      expect(await observable.toArray()).toEqual([[1, 2]]);
    });
  });
  describe("#wrap", () => {
    describe("#toArray", () => {
      it("emits items", async () => {
        const observable = wrap(async function* () {
          yield "a";
          yield "b";
          yield "c";
        });
        expect(await observable.toArray()).toEqual(["a", "b", "c"]);
      });
    });
    describe("#subscribe", () => {
      it("emits items", async () => {
        const observable = wrap(async function* () {
          yield "a";
          yield "b";
          yield "c";
        });
        const mock = jest.fn();
        await observable.subscribe(mock);
        expect(mock).toHaveBeenNthCalledWith(1, "a");
        expect(mock).toHaveBeenNthCalledWith(2, "b");
        expect(mock).toHaveBeenNthCalledWith(3, "c");
        expect(mock).toHaveBeenCalledTimes(3);
      });
    });
  });
  describe("#deferredWrap", () => {
    describe("#toArray", () => {
      it("emits items", async () => {
        const observable = deferredWrap(async function* () {
          yield "a";
          yield "b";
          yield "c";
        });
        expect(await observable.toArray()).toEqual(["a", "b", "c"]);
      });
    });
    describe("#subscribe", () => {
      it("emits items", async () => {
        const observable = deferredWrap(async function* () {
          yield "a";
          yield "b";
          yield "c";
        });
        const mock = jest.fn();
        await observable.subscribe(mock);
        expect(mock).toHaveBeenNthCalledWith(1, "a");
        expect(mock).toHaveBeenNthCalledWith(2, "b");
        expect(mock).toHaveBeenNthCalledWith(3, "c");
        expect(mock).toHaveBeenCalledTimes(3);
      });
    });
    describe("#subscribe with multiple observers", () => {
      it("emits same items to all observers", async () => {
        const observable = deferredWrap(async function* () {
          yield "a";
          yield "b";
          yield "c";
        });
        const mock1 = jest.fn();
        const mock2 = jest.fn();
        await observable.subscribe(mock1);
        await observable.subscribe(mock2);
        expect(mock1).toHaveBeenNthCalledWith(1, "a");
        expect(mock1).toHaveBeenNthCalledWith(2, "b");
        expect(mock1).toHaveBeenNthCalledWith(3, "c");
        expect(mock2).toHaveBeenNthCalledWith(1, "a");
        expect(mock2).toHaveBeenNthCalledWith(2, "b");
        expect(mock2).toHaveBeenNthCalledWith(3, "c");
        expect(mock1).toHaveBeenCalledTimes(3);
        expect(mock2).toHaveBeenCalledTimes(3);
      });
    });
  });
  describe("#just", () => {
    describe("#subscribe", () => {
      it("yields hello world", async () => {
        const observable = just("hello world");
        const mock = jest.fn();
        await observable.subscribe(mock);
        expect(mock).toHaveBeenCalledWith("hello world");
      });
    });
    describe("#toArray", () => {
      it("yields a single item", async () => {
        const observable = just("hello world");
        expect(await observable.toArray()).toEqual(["hello world"]);
      });
    });
  });
  describe("observer", () => {
    it("should call onNext and onComplete", async () => {
      const observable = just("hello world");
      const mock = { onNext: jest.fn(), onComplete: jest.fn() };
      await observable.subscribe(mock);
      expect(mock.onNext).toHaveBeenCalledWith("hello world");
      expect(mock.onComplete).toHaveBeenCalledTimes(1);
    });
  });
  describe("#filter", () => {
    it("should remove odd numbers", async () => {
      const observable = from([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter(
        (i) => i % 2 === 0
      );
      expect(await observable.toArray()).toEqual([2, 4, 6, 8]);
    });
    it("should remove nothing if nothing matches numbers", async () => {
      const observable = from([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter(
        (i) => i < 10
      );
      expect(await observable.toArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
    it("should remove all items", async () => {
      const observable = from([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter(
        (i) => i > 10
      );
      expect(await observable.toArray()).toEqual([]);
    });
  });
  describe("#asyncFilter", () => {
    it("should remove even numbers", async () => {
      const observable = from([1, 2, 3, 4, 5, 6, 7, 8, 9]).asyncFilter(
        async (i) => Promise.resolve(i % 2 !== 0)
      );
      expect(await observable.toArray()).toEqual([1, 3, 5, 7, 9]);
    });
  });
  describe("#from", () => {
    describe("#subscribe", () => {
      it("does not call observer for empty array", async () => {
        const observable = from([]);
        const mock = jest.fn();
        await observable.subscribe(mock);
        expect(mock).toHaveBeenCalledTimes(0);
      });
      it("calls N times", async () => {
        const observable = from([3, 2, 1]);
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
        const observable = from([]);
        expect(await observable.toArray()).toEqual([]);
      });
      it("yields the input array when toArray() is called", async () => {
        const observable = from([1, 2, 3]);
        expect(await observable.toArray()).toEqual([1, 2, 3]);
      });
    });
  });
});

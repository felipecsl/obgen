import Observable from "../observable";
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

      it("emits new items as they become available", async () => {
        const observable = Observable.buffer((stream) => {
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
      const observable = Observable.from([1, 2, 3]).map((i) => i * 2);
      expect(await observable.toArray()).toEqual([2, 4, 6]);
    });
  });
  describe("#flatMap", () => {
    it("should multiply items in the input array", async () => {
      const observable = Observable.from([1, 2, 3]).flatMap((i) =>
        Observable.just(i * 2)
      );
      expect(await observable.toArray()).toEqual([2, 4, 6]);
    });
    it("should not emit empty odd items", async () => {
      const observable = Observable.from([1, 2, 3, 4, 5, 6, 7, 8, 9]).flatMap(
        (i) => (i % 2 === 0 ? Observable.just(i) : Observable.empty())
      );
      expect(await observable.toArray()).toEqual([2, 4, 6, 8]);
    });
    it("should not emit empty even items", async () => {
      const observable = Observable.from([1, 2, 3, 4, 5, 6, 7, 8, 9]).flatMap(
        (i) => (i % 2 !== 0 ? Observable.just(i) : Observable.empty())
      );
      expect(await observable.toArray()).toEqual([1, 3, 5, 7, 9]);
    });
    it("should emit empty array", async () => {
      const observable = Observable.from([1, 2, 3, 4, 5, 6, 7, 8, 9]).flatMap(
        (_) => Observable.empty()
      );
      expect(await observable.toArray()).toEqual([]);
    });
  });
  describe("#asyncMap", () => {
    it("should multiply items in the input array", async () => {
      const observable = Observable.from([1, 2, 3]).asyncMap((i) =>
        Promise.resolve(i * 3)
      );
      expect(await observable.toArray()).toEqual([3, 6, 9]);
    });
  });
  // TODO test rejections
  describe("#merge", () => {
    it("should join multiple observables", async () => {
      const observable = Observable.from([0, 1, 2, 3, 4, 5]).merge(
        Observable.from([6, 7, 8, 9])
      );
      const actual = await observable.toArray();
      // items are expected to be emitted out of order, so we sort them here
      expect(actual.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
    it("should allow merging with empty Observable", async () => {
      const observable = Observable.from([0, 1, 2, 3, 4, 5]).merge(
        Observable.empty()
      );
      const actual = await observable.toArray();
      expect(actual).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });
  describe("#promise", () => {
    it("should resolve promise to Observable", async () => {
      const arr = [1];
      const observable = await Observable.promise(() =>
        Promise.resolve([...arr])
      );
      // item 2 should not be included in the output because the promise was already resolved
      arr.push(2);
      // we expect a nested array because its an Observable<number[]> thus toArray() yields number[][]
      expect(await observable.toArray()).toEqual([[1]]);
    });
  });
  describe("#empty", () => {
    it("should emit no items", async () => {
      const observable = Observable.empty();
      expect(await observable.toArray()).toEqual([]);
    });
  });
  describe("#defer", () => {
    it("should resolve promise upon subscription", async () => {
      const arr = [1];
      const observable = Observable.defer(() => Promise.resolve([...arr]));
      // item 2 should be included in the output because the Promise is only resolved once `toArray()`
      // is called
      arr.push(2);
      // we expect a nested array because its an Observable<number[]> thus toArray() yields number[][]
      expect(await observable.toArray()).toEqual([[1, 2]]);
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
  describe("observer", () => {
    it("should call onNext and onComplete", async () => {
      const observable = Observable.just("hello world");
      const mock = { onNext: jest.fn(), onComplete: jest.fn() };
      await observable.subscribe(mock);
      expect(mock.onNext).toHaveBeenCalledWith("hello world");
      expect(mock.onComplete).toHaveBeenCalledTimes(1);
    });
  });
  describe("#filter", () => {
    it("should remove odd numbers", async () => {
      const observable = Observable.from([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter(
        (i) => i % 2 === 0
      );
      expect(await observable.toArray()).toEqual([2, 4, 6, 8]);
    });
  });
  describe("#asyncFilter", () => {
    it("should remove even numbers", async () => {
      const observable = Observable.from([
        1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]).asyncFilter(async (i) => Promise.resolve(i % 2 !== 0));
      expect(await observable.toArray()).toEqual([1, 3, 5, 7, 9]);
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

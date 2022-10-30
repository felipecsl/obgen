import { from, interval } from "./index";
import Observable from "./observable";

(async () => {
  for await (const item of testArray().iterable()) {
    console.log(item);
  }
  // const iterator: () => AsyncIterator<string> = async function* () {
  //   yield "a";
  //   yield "b";
  //   yield "c";
  // };
  // const range = {
  //   [Symbol.asyncIterator]() {
  //     return iterator();
  //   },
  // };
  // for await (let value of range) {
  //   console.log(value); // 1, then 2, then 3, then 4, then 5
  // }
})();

// @ts-ignore
function testFlatMap(items: number = 100): Observable<string> {
  const arr = rangeTo(items);
  return from(arr).flatMap((i) => from([`${i}`, `${i}-1`, `${i}-2`, `${i}-3`]));
}

function testArray(items: number = 100): Observable<number> {
  const arr = rangeTo(items);
  return from(arr)
    .map((i) => i * 2)
    .filter((i) => i % 2 == 0)
    .take(10);
}

// @ts-ignore
function testInterval(intervalMs: number = 1000): Observable<string> {
  return interval(intervalMs)
    .map((_) => new Date().getTime())
    .map((i) => (i / 1000).toFixed(0));
}

/** Returns a new array with an integer range sequence from zero to `num` */
function rangeTo(num: number): number[] {
  return [...Array(num).keys()].map((_, i) => i);
}

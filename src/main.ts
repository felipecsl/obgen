import Observable from "./observable";
import { times } from "lodash";

(async () => {
  const observable = testFlatMap();
  for await (const date of observable.iterable()) {
    console.log(date);
  }
})();

function testFlatMap(): Observable<string> {
  const arr = rangeTo(100);
  return Observable.from(arr).flatMap((i) =>
    Observable.from([`${i}`, `${i}-1`, `${i}-2`, `${i}-3`])
  );
}

function testArray(): Observable<number> {
  const arr = rangeTo(100);
  return Observable.from(arr)
    .map((i) => i * 2)
    .filter((i) => i % 2 == 0)
    .take(10);
}

function testTimestamp(): Observable<string> {
  return Observable.interval(1000)
    .map((_) => new Date().getTime())
    .map((i) => (i / 1000).toFixed(0));
}

/** Returns a new array with an integer range sequence from zero to `num` */
function rangeTo(num: number): number[] {
  return times(num).map((_, i) => i);
}

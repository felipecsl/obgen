import Observable from "./observable";

(async () => {
  testArray().subscribe(console.log);
})();

// @ts-ignore
function testFlatMap(items: number = 100): Observable<string> {
  const arr = rangeTo(items);
  return Observable.from(arr).flatMap((i) =>
    Observable.from([`${i}`, `${i}-1`, `${i}-2`, `${i}-3`])
  );
}

function testArray(items: number = 100): Observable<number> {
  const arr = rangeTo(items);
  return Observable.from(arr)
    .map((i) => i * 2)
    .filter((i) => i % 2 == 0)
    .take(10);
}

// @ts-ignore
function testInterval(intervalMs: number = 1000): Observable<string> {
  return Observable.interval(intervalMs)
    .map((_) => new Date().getTime())
    .map((i) => (i / 1000).toFixed(0));
}

/** Returns a new array with an integer range sequence from zero to `num` */
function rangeTo(num: number): number[] {
  return [...Array(num).keys()].map((_, i) => i);
}

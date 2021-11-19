import Observable from "./observable";

(async () => {
  const observable = Observable.interval(1000).map((_) =>
    new Date().toISOString()
  );
  for await (const date of observable.iterable()) {
    console.log(date);
  }
})();

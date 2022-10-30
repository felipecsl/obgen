# Obgen

Observable (reactive streams) pattern implemented using es2015 [async generators](https://tc39.es/proposal-async-iteration/).

## Installation

Using yarn:

```bash
yarn add obgen
```

or using npm:

```bash
npm i --save obgen
```

## Usage

Observables are lazy streams of data that emit items asynchronously. They may be infinite or include an optional terminal event to signal the end of the stream. You can `map`, `filter`, etc.:

```typescript
import Observable from "obgen/dist/observable";
import { asyncDefer, buffer, empty, from, just, promise, wrap } from "obgen";

const arr = [...Array(num).keys()].map((_, i) => i);
const observable = from(arr)
  .map((i) => i * 2)
  .filter((i) => i % 2 == 0)
  .take(10);
```

`Observable`s are lazily evaluated. Items are not collected until you subscribe to them:

```typescript
observable.subscribe(console.log);
// outputs:
// 0
// 2
// 4
// 6
// 8
// 10
// 12
// 14
// 16
// 18
```

If you prefer, you can instead iterate it with for-await as you normally would:

```typescript
for await (const element of observable.iterable()) {
  console.log(element);
}
```

Or collect the items into an array:

```typescript
const array = await observable.toArray();
```

Observables can be created in multiple ways. For example, you can manually wrap an async generator
function (which is not particularly useful by itself):

```typescript
const observable = wrap(async function* () {
  yield "a";
  yield "b";
  yield "c";
});
```

You can also use `buffer()` to accumulate items until subscription time:

```typescript
const observable = buffer((stream) => {
  stream.emit(1);
  stream.emit(2);
  stream.emit(3);
  stream.emit(4);
  stream.end();
});
```

Or asynchronously emit items:

```typescript
const observable = buffer((stream) => {
  // delay emission for a few milliseconds so that it happens after we subscribe
  times(5, (i) => setTimeout(() => stream.emit(i), i * 100));
  setTimeout(() => stream.end(), 600);
});
expect(await observable.toArray()).toEqual([0, 1, 2, 3, 4]);
```

## License

MIT

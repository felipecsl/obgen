import Observable from "../observable";
import { Observer } from "../observer";

export default function iteratorToIterable<T>(
  iteratorFn: () => AsyncIterator<T, any, undefined>
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      return iteratorFn();
    },
  };
}

export function iteratorToGenerator<T>(
  iterator: AsyncIterator<T>
): AsyncGenerator<T> {
  return {
    async next() {
      return iterator.next();
    },

    return(_: T): Promise<IteratorResult<T, any>> {
      return Promise.resolve({ done: true, value: null });
    },

    throw(_: any): Promise<IteratorResult<T, any>> {
      return Promise.resolve({ done: true, value: null });
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function isObserver<T>(observer: any): observer is Observer<T> {
  return typeof observer?.onNext === "function";
}

export function ensure<T>(value: T, errorMsg: string): T | void {
  return value ?? error(errorMsg);
}

const error = (msg: string) => {
  throw new Error(msg);
};

export function mapIterator<T, O>(
  iterator: AsyncIterator<T>,
  mapFn: (item: T) => O
): AsyncIterator<O> {
  return {
    async next() {
      const next = await iterator.next();
      return { value: mapFn(next.value), done: next.done };
    },
  };
}

export function asyncMapIterator<T, O>(
  iterator: AsyncIterator<T>,
  asyncMapFn: (item: T) => Promise<O>
): AsyncIterator<O> {
  return {
    async next() {
      const next = await iterator.next();
      return { value: await asyncMapFn(next.value), done: next.done };
    },
  };
}

export function flatMapIterator<T, O>(
  iterator: AsyncIterator<T>,
  mapFn: (item: T) => Observable<O>
): AsyncIterator<O> {
  let innerIterator: AsyncIterator<O> | null;
  let isDone = false;
  return {
    async next() {
      let innerValue = null;
      let innerDone = true;
      while (innerDone) {
        const { value, done } = await iterator.next();
        isDone = done || false;
        if (isDone) {
          return { value: null, done: true };
        } else {
          innerIterator = mapFn(value).iterator();
          const final = await innerIterator.next();
          innerValue = final.value;
          innerDone = final.done || false;
        }
      }
      return { value: innerValue, done: innerDone };
    },
  };
}

export function filterIterator<T>(
  iterator: AsyncIterator<T>,
  filterFn: (item: T) => boolean
): AsyncIterator<T> {
  return {
    async next() {
      let { value, done } = await iterator.next();
      while (!done && !filterFn(value)) {
        const next = await iterator.next();
        value = next.value;
        done = next.done;
      }
      return { value, done };
    },
  };
}

export function asyncFilterIterator<T>(
  iterator: AsyncIterator<T>,
  asyncFilterFn: (item: T) => Promise<boolean>
): AsyncIterator<T> {
  return {
    async next() {
      let { value, done } = await iterator.next();
      while (!done && !(await asyncFilterFn(value))) {
        const next = await iterator.next();
        value = next.value;
        done = next.done;
      }
      return { value, done };
    },
  };
}

export function takeIterator<T>(
  iterator: AsyncIterator<T>,
  num: number
): AsyncIterator<T> {
  let i = 0;
  return {
    async next() {
      let next = await iterator.next();
      if (i++ < num) {
        return next;
      } else {
        return { done: true, value: next.value };
      }
    },
  };
}

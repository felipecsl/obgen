import { Observer } from "./observer";

export type GenericObserver<T> = Observer<T> | ((item: T) => any);

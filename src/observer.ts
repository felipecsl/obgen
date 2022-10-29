export type Observer<T> = {
  onNext: (item: T) => any;
  onComplete?: () => any;
  // TODO add onError handling
  onError?: (err: any) => any;
};

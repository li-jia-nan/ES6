enum State {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}

// 将需要类型提出来
type Resolve<T> = (value?: T | PromiseLike<T>) => void;
type Reject = (reason?: any) => void;
type Executor<T> = (resolve?: Resolve<T>, reject?: Reject) => void;
type onFulfilled<T, TResult1> =
  | ((value: T) => TResult1 | PromiseLike<TResult1> | T)
  | undefined
  | null;
type onRejected<TResult2> = ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null;

const isFunc = (value: any): value is Function => typeof value === 'function';

class MyPromise<T> {
  PromiseResult: any;
  PromiseState: State;
  private onFulfilledCallbacks: Resolve<T>[] = [];
  private onRejectedCallbacks: Reject[] = [];
  constructor(func: Executor<T>) {
    this.PromiseState = State.PENDING;
    this.PromiseResult = null;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    try {
      func(this.resolve, this.reject);
    } catch (err) {
      this.reject(err);
    }
  }
  private resolve: Resolve<T> = result => {
    if (this.PromiseState === State.PENDING) {
      setTimeout(() => {
        this.PromiseState = State.FULFILLED;
        this.PromiseResult = result;
        this.onFulfilledCallbacks.forEach(callback => {
          callback(result);
        });
      });
    }
  };
  private reject: Reject = reason => {
    if (this.PromiseState === State.PENDING) {
      setTimeout(() => {
        this.PromiseState = State.REJECTED;
        this.PromiseResult = reason;
        this.onRejectedCallbacks.forEach(callback => {
          callback(reason);
        });
      });
    }
  };
  public then = <TResult1 = T, TResult2 = never>(
    onFulfilled?: onFulfilled<T, TResult1>,
    onRejected?: onRejected<TResult2>
  ): MyPromise<TResult1 | TResult2> => {
    onFulfilled = isFunc(onFulfilled)
      ? onFulfilled
      : value => {
          return value;
        };
    onRejected = isFunc(onRejected)
      ? onRejected
      : reason => {
          throw reason;
        };
    const promise2 = new MyPromise<TResult1 | TResult2>((resolve, reject) => {
      if (this.PromiseState === State.FULFILLED) {
        setTimeout(() => {
          try {
            const x = onFulfilled?.(this.PromiseResult) as PromiseLike<TResult1 | TResult2>;
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject?.(e);
          }
        });
      }
      if (this.PromiseState === State.REJECTED) {
        setTimeout(() => {
          try {
            const x = onRejected?.(this.PromiseResult) as PromiseLike<TResult1 | TResult2>;
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject?.(e);
          }
        });
      }
      if (this.PromiseState === State.PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onFulfilled?.(this.PromiseResult) as PromiseLike<TResult1 | TResult2>;
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject?.(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onRejected?.(this.PromiseResult) as PromiseLike<TResult1 | TResult2>;
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject?.(e);
            }
          });
        });
      }
    });
    return promise2;
  };
}

function resolvePromise<T>(
  promise2: MyPromise<T>,
  x: T | PromiseLike<T>,
  resolve?: Resolve<T>,
  reject?: Reject
) {
  if (promise2 === x) {
    return reject?.(new TypeError('Chaining cycle detected for promise'));
  }
  if (x instanceof MyPromise) {
    if (x.PromiseState === State.PENDING) {
      x.then(y => {
        resolvePromise(promise2, y, resolve, reject);
      }, reject);
    }
    if (x.PromiseState === State.FULFILLED) {
      resolve?.(x.PromiseResult);
    }
    if (x.PromiseState === State.REJECTED) {
      reject?.(x.PromiseResult);
    }
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let then;
    try {
      then = (x as PromiseLike<T>).then;
    } catch (e) {
      return reject?.(e);
    }
    if (typeof then === 'function') {
      let called = false;
      try {
        then.call(
          x,
          y => {
            if (called) {
              return;
            }
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          r => {
            if (called) {
              return;
            }
            called = true;
            reject?.(r);
          }
        );
      } catch (e) {
        if (called) {
          return;
        }
        called = true;
        reject?.(e);
      }
    } else {
      resolve?.(x);
    }
  } else {
    return resolve?.(x);
  }
}

// 忽略 typescript 校验
// @ts-ignore
MyPromise.deferred = () => {
  const result: any = {};
  result.promise = new MyPromise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
};

export default MyPromise;

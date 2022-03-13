enum State {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}

type ResolveType = (result?: any) => void;
type RejectType = (reason?: any) => void;
type ConstructorFn = (resolve?: ResolveType, reject?: RejectType) => void;

const isFunc = (value: any): value is Function => typeof value === 'function';

class MyPromise {
  PromiseResult: any;
  PromiseState: State;
  private onFulfilledCallbacks: ResolveType[] = [];
  private onRejectedCallbacks: RejectType[] = [];
  constructor(func: ConstructorFn) {
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
  private resolve = (result: any) => {
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
  private reject = (reason: any) => {
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
  public then = (onFulfilled?: ResolveType, onRejected?: RejectType) => {
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
    const promise2 = new MyPromise((resolve, reject) => {
      if (this.PromiseState === State.FULFILLED) {
        setTimeout(() => {
          try {
            const x = onFulfilled?.(this.PromiseResult);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject?.(e);
          }
        });
      }
      if (this.PromiseState === State.REJECTED) {
        setTimeout(() => {
          try {
            const x = onRejected?.(this.PromiseResult);
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
              let x = onFulfilled?.(this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject?.(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected?.(this.PromiseResult);
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

function resolvePromise(promise2: MyPromise, x: any, resolve?: ResolveType, reject?: RejectType) {
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
      then = x.then;
    } catch (e) {
      return reject?.(e);
    }
    if (typeof then === 'function') {
      let called = false;
      try {
        then.call(
          x,
          (y: any) => {
            if (called) {
              return;
            }
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          (r: any) => {
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

module.exports = MyPromise;

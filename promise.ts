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
  PromiseState: State = State.PENDING;
  onFulfilledCallbacks: ResolveType[] = [];
  onRejectedCallbacks: RejectType[] = [];
  constructor(func: ConstructorFn) {
    this.PromiseState = State.PENDING;
    this.PromiseResult = null;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    try {
      func(this.resolve, this.reject);
    } catch (err) {
      if (err instanceof Error) {
        this.reject(err.message);
      }
    }
  }
  resolve = (result: any) => {
    if (this.PromiseState === State.PENDING) {
      (setImmediate || requestAnimationFrame)(() => {
        this.PromiseState = State.FULFILLED;
        this.PromiseResult = result;
        this.onFulfilledCallbacks.forEach(callback => {
          callback(result);
        });
      });
    }
  };
  reject = (reason: any) => {
    if (this.PromiseState === State.PENDING) {
      (setImmediate || requestAnimationFrame)(() => {
        this.PromiseState = State.REJECTED;
        this.PromiseResult = reason;
        this.onRejectedCallbacks.forEach(callback => {
          callback(reason);
        });
      });
    }
  };
  then = (onFulfilled?: ResolveType, onRejected?: RejectType) => {
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
      if (this.PromiseState === State.PENDING) {
        this.onFulfilledCallbacks.push(() => {
          (setImmediate || requestAnimationFrame)(() => {
            try {
              let x = onFulfilled(this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          (setImmediate || requestAnimationFrame)(() => {
            try {
              let x = onRejected(this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
      }
      if (this.PromiseState === State.FULFILLED) {
        (setImmediate || requestAnimationFrame)(() => {
          try {
            const x = onFulfilled(this.PromiseResult);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      }
      if (this.PromiseState === State.REJECTED) {
        (setImmediate || requestAnimationFrame)(() => {
          try {
            const x = onRejected(this.PromiseResult);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      }
    });
    return promise2;
  };
}

/**
 * 对resolve()、reject() 进行改造增强 针对resolve()和reject()中不同值情况 进行处理
 * @param  {promise} promise2 promise1.then方法返回的新的promise对象
 * @param  {[type]} x         promise1中onFulfilled或onRejected的返回值
 * @param  {[type]} resolve   promise2的resolve方法
 * @param  {[type]} reject    promise2的reject方法
 */
function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {
    return reject(new TypeError('Chaining cycle detected for promise'));
  }
  if (x instanceof MyPromise) {
    if (x.PromiseState === State.PENDING) {
      x.then(y => {
        resolvePromise(promise2, y, resolve, reject);
      }, reject);
    }
    if (x.PromiseState === State.FULFILLED) {
      resolve(x.PromiseResult);
    }
    if (x.PromiseState === State.REJECTED) {
      reject(x.PromiseResult);
    }
  }
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    // 2.3.3 如果 x 为对象或函数
    let then;
    try {
      then = x.then;
    } catch (e) {
      return reject(e);
    }
    if (typeof then === 'function') {
      // 2.3.3.3.3 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
      let called = false; // 避免多次调用
      try {
        then.call(
          x,
          // 2.3.3.3.1 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
          y => {
            if (called) {
              return;
            }
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          // 2.3.3.3.2 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
          r => {
            if (called) {
              return;
            }
            called = true;
            reject(r);
          }
        );
      } catch (e) {
        if (called) {
          return;
        }
        called = true;
        /**
         * 2.3.3.3.4.2 否则以 e 为据因拒绝 promise
         */
        reject(e);
      }
    } else {
      // 2.3.3.4 如果 then 不是函数，以 x 为参数执行 promise
      resolve(x);
    }
  } else {
    // 2.3.4 如果 x 不为对象或者函数，以 x 为参数执行 promise
    return resolve(x);
  }
}

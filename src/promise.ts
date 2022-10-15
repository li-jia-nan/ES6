// 首先将三种状态提出来，用枚举管理
enum State {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}

// 将需要类型提出来
type Resolve<T> = (value?: T | PromiseLike<T>) => void;
type Reject = (reason?: any) => void;
type Executor<T> = (resolve?: Resolve<T>, reject?: Reject) => void;
type onFulfilled<T, TResult1> = ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null;
type onRejected<TResult2> = ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null;
type onFinally = (() => void) | undefined | null;

// eslint-disable-next-line @typescript-eslint/ban-types
const isFunction = (value: any): value is Function => typeof value === 'function';

class MyPromise<T> {
  public PromiseResult!: T;
  public PromiseState!: State;
  private onFulfilledCallbacks: Resolve<T>[] = [];
  private onRejectedCallbacks: Reject[] = [];
  // 构造函数：通过new命令生成对象实例时，自动调用类的构造函数，给类的构造方法constructor添加一个参数func
  constructor(func: Executor<T>) {
    this.PromiseState = State.PENDING; // 指定Promise对象的状态属性 PromiseState，初始值为pending
    this.onFulfilledCallbacks = []; //保存成功回调
    this.onRejectedCallbacks = []; // 保存失败回调
    try {
      /**
       * func()传入resolve和reject，
       * resolve()和reject()方法在外部调用，这里需要注意一下this指向是否正确，如果不正确，需要用bind修正一下
       * new 对象实例时，自动执行func()
       */
      func(this.resolve, this.reject);
    } catch (err) {
      // 生成实例时(执行resolve和reject)，如果报错，就把错误信息传入给reject()方法，并且直接执行reject()方法
      this.reject(err);
    }
  }
  // result为成功态时接收的终值
  private resolve: Resolve<T> = result => {
    // 只能由pedning状态 => fulfilled状态 (避免调用多次resolve reject)
    if (this.PromiseState === State.PENDING) {
      /**
       * 为什么resolve和reject要加setTimeout?
       * 2.2.4规范 onFulfilled 和 onRejected 只允许在 execution context 栈仅包含平台代码时运行.
       * 注1 这里的平台代码指的是引擎、环境以及 promise 的实施代码。实践中要确保 onFulfilled 和 onRejected 方法异步执行，且应该在 then 方法被调用的那一轮事件循环之后的新执行栈中执行。
       * 这个事件队列可以采用“宏任务（macro-task）”机制，比如setTimeout 或者 setImmediate； 也可以采用“微任务（micro-task）”机制来实现， 比如 MutationObserver 或者process.nextTick。
       */
      setTimeout(() => {
        this.PromiseState = State.FULFILLED;
        this.PromiseResult = result as T;
        /**
         * 在执行resolve或者reject的时候，遍历自身的callbacks数组，
         * 看看数组里面有没有then那边 保留 过来的 待执行函数，
         * 然后逐个执行数组里面的函数，执行的时候会传入相应的参数
         */
        this.onFulfilledCallbacks.forEach(callback => {
          callback(result);
        });
      });
    }
  };
  // reason为拒绝态时接收的终值
  private reject: Reject = reason => {
    // 只能由pedning状态 => rejected状态 (避免调用多次resolve reject)
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
  /**
   * [注册 fulfilled 状态 / rejected 状态 对应的回调函数]
   * @param {function} onFulfilled fulfilled状态时 执行的函数
   * @param {function} onRejected rejected状态时 执行的函数
   * @returns {function} newPromsie 返回一个新的promise对象
   */
  public then = <TResult1 = T, TResult2 = never>(
    onFulfilled?: onFulfilled<T, TResult1>,
    onRejected?: onRejected<TResult2>
  ): MyPromise<TResult1 | TResult2> => {
    /**
     * 参数校验：Promise规定then方法里面的两个参数如果不是函数的话就要被忽略
     * 所谓“忽略”并不是什么都不干，
     * 对于onFulfilled来说“忽略”就是将value原封不动的返回，
     * 对于onRejected来说就是返回拒因，
     * onRejected因为是错误分支，我们返回拒因时应该throw一个Error
     */
    onFulfilled = isFunction(onFulfilled)
      ? onFulfilled
      : value => {
          return value as any;
        };
    onRejected = isFunction(onRejected)
      ? onRejected
      : reason => {
          throw reason;
        };
    // 2.2.7 规范 then 方法必须返回一个 promise 对象
    const promise2 = new MyPromise<TResult1 | TResult2>((resolve, reject) => {
      if (this.PromiseState === State.FULFILLED) {
        /**
         * 为什么这里要加定时器setTimeout？
         * 2.2.4规范 onFulfilled 和 onRejected 只有在执行环境堆栈仅包含平台代码时才可被调用 注1
         * 这里的平台代码指的是引擎、环境以及 promise 的实施代码。
         * 实践中要确保 onFulfilled 和 onRejected 方法异步执行，且应该在 then 方法被调用的那一轮事件循环之后的新执行栈中执行。
         * 这个事件队列可以采用“宏任务（macro-task）”机制，比如setTimeout 或者 setImmediate； 也可以采用“微任务（micro-task）”机制来实现， 比如 MutationObserver 或者process.nextTick。
         */
        setTimeout(() => {
          try {
            // 2.2.7.1规范 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行下面的 Promise 解决过程：[[Resolve]](promise2, x)，即运行resolvePromise()
            const x = onFulfilled?.(this.PromiseResult)!;
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            // 2.2.7.2 如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e
            reject?.(e); // 捕获前面onFulfilled中抛出的异常
          }
        });
      }
      if (this.PromiseState === State.REJECTED) {
        setTimeout(() => {
          try {
            const x = onRejected?.(this.PromiseResult)!;
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject?.(e);
          }
        });
      }
      if (this.PromiseState === State.PENDING) {
        // pending 状态保存的 resolve() 和 reject() 回调也要符合 2.2.7.1 和 2.2.7.2 规范
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onFulfilled?.(this.PromiseResult)!;
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject?.(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onRejected?.(this.PromiseResult)!;
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
  /**
   * Promise.resolve()
   * @param {[type]} value 要解析为 Promise 对象的值
   */
  static resolve = <T>(value?: T | PromiseLike<T>): MyPromise<T> => {
    // 如果这个值是一个 promise ，那么将返回这个 promise
    if (value instanceof MyPromise) {
      return value;
    }
    // 否则返回的promise将以此值完成，即以此值执行`resolve()`方法 (状态为fulfilled)
    return new MyPromise(resolve => {
      resolve?.(value);
    });
  };
  /**
   * Promise.reject()
   * @param {*} reason 表示Promise被拒绝的原因
   * @returns
   */
  static reject = <T = never>(reason?: any): MyPromise<T> => {
    // 不需要额外判断
    return new MyPromise((resolve, reject) => {
      reject?.(reason);
    });
  };
  /**
   * Promise.prototype.catch()
   * @param {*} onRejected
   */
  /** */
  public catch = <TResult = never>(onrejected?: onRejected<TResult>): MyPromise<T | TResult> => {
    return this.then(null, onrejected);
  };
  /**
   * Promise.prototype.finally()
   * @param {*} onfinally 无论结果是fulfilled或者是rejected，都会执行的回调函数
   * @returns
   */
  // 无论如何都会执行，不会传值给回调函数
  public finally = (onfinally?: onFinally): MyPromise<T> => {
    return this.then(
      value =>
        MyPromise.resolve(isFunction(onfinally) ? onfinally() : onfinally).then(() => {
          return value;
        }),
      reason =>
        MyPromise.resolve(isFunction(onfinally) ? onfinally() : onfinally).then(() => {
          throw reason;
        })
    );
  };
  /**
   * Promise.all()
   * @param {iterable} promises 一个promise的iterable类型（注：Array，Map，Set都属于ES6的iterable类型）的输入
   * @returns
   */
  static all = <T>(promises: readonly T[]): MyPromise<T[]> => {
    return new MyPromise((resolve, reject) => {
      // 参数校验
      if (Array.isArray(promises)) {
        let result: T[] = []; // 存储结果
        let count = 0; // 计数器
        // 如果传入的参数是一个空的可迭代对象，则返回一个已完成（already resolved）状态的 Promise
        if (promises.length === 0) {
          return resolve?.(promises);
        }
        promises.forEach((item, index) => {
          // MyPromise.resolve方法中已经判断了参数是否为promise与thenable对象，所以无需在该方法中再次判断
          MyPromise.resolve(item).then(
            value => {
              count++;
              // 每个promise执行的结果存储在result中
              result[index] = value;
              // Promise.all 等待所有都完成（或第一个失败）
              if (count === promises.length) {
                resolve?.(result);
              }
            },
            reason => {
              /**
               * 如果传入的 promise 中有一个失败（rejected），
               * Promise.all 异步地将失败的那个结果给失败状态的回调函数，而不管其它 promise 是否完成
               */
              reject?.(reason);
            }
          );
        });
      } else {
        return reject?.(new TypeError('Argument is not iterable'));
      }
    });
  };
  /**
   * Promise.race()
   * @param {iterable} promises 可迭代对象，类似Array。详见 iterable。
   * @returns
   */
  static race = <T>(promises: readonly T[]): MyPromise<T extends PromiseLike<infer U> ? U : T> => {
    return new MyPromise((resolve, reject) => {
      // 参数校验
      if (Array.isArray(promises)) {
        // 如果传入的迭代promises是空的，则返回的 promise 将永远等待。
        if (promises.length) {
          promises.forEach(item => {
            /**
             * 如果迭代包含一个或多个非承诺值和/或已解决/拒绝的承诺，
             * 则 Promise.race 将解析为迭代中找到的第一个值。
             */
            MyPromise.resolve(item).then(resolve, reject);
          });
        }
      } else {
        return reject?.(new TypeError('Argument is not iterable'));
      }
    });
  };
  /**
   * Promise.allSettled()
   * @param {iterable} promises 一个promise的iterable类型（注：Array，Map，Set都属于ES6的iterable类型）的输入
   * @returns
   */
  static allSettled = <T>(
    promises: readonly T[]
  ): MyPromise<PromiseSettledResult<Awaited<T>>[]> => {
    return new MyPromise((resolve, reject) => {
      // 参数校验
      if (Array.isArray(promises)) {
        let result: any[] = []; // 存储结果
        let count = 0; // 计数器
        // 如果传入的是一个空数组，那么就直接返回一个resolved的空数组promise对象
        if (promises.length === 0) {
          return resolve?.(promises);
        }
        promises.forEach((item, index) => {
          // 非promise值，通过Promise.resolve转换为promise进行统一处理
          MyPromise.resolve(item).then(
            value => {
              count++;
              // 对于每个结果对象，都有一个 status 字符串。如果它的值为 fulfilled，则结果对象上存在一个 value 。
              result[index] = { status: 'fulfilled', value };
              // 所有给定的promise都已经fulfilled或rejected后,返回这个promise
              if (count === promises.length) {
                resolve?.(result);
              }
            },
            reason => {
              count++;
              /**
               * 对于每个结果对象，都有一个 status 字符串。如果值为 rejected，则存在一个 reason 。
               * value（或 reason ）反映了每个 promise 决议（或拒绝）的值。
               */
              result[index] = { status: 'rejected', reason };
              // 所有给定的promise都已经fulfilled或rejected后,返回这个promise
              if (count === promises.length) {
                resolve?.(result);
              }
            }
          );
        });
      } else {
        return reject?.(new TypeError('Argument is not iterable'));
      }
    });
  };
  /**
   * Promise.any()
   * @param {iterable} promises 一个promise的iterable类型（注：Array，Map，Set都属于ES6的iterable类型）的输入
   * @returns
   */
  static any = <T>(promises: (T | PromiseLike<T>)[]): MyPromise<T> => {
    return new MyPromise((resolve, reject) => {
      // 参数校验
      if (Array.isArray(promises)) {
        let errors: any[] = []; //
        let count = 0; // 计数器
        // 如果传入的参数是一个空的可迭代对象，则返回一个 已失败（already rejected） 状态的 Promise。
        if (promises.length === 0) {
          return reject?.(new Error('All promises were rejected'));
        }
        promises.forEach(item => {
          // 非Promise值，通过Promise.resolve转换为Promise
          MyPromise.resolve(item).then(
            value => {
              // 只要其中的一个 promise 成功，就返回那个已经成功的 promise
              resolve?.(value);
            },
            reason => {
              count++;
              errors.push(reason);
              /**
               * 如果可迭代对象中没有一个 promise 成功，就返回一个失败的 promise 和 AggregateError 类型的实例，
               * AggregateError是 Error 的一个子类，用于把单一的错误集合在一起。
               */
              if (count === promises.length) {
                reject?.(new Error('All promises were rejected'));
              }
            }
          );
        });
      } else {
        return reject?.(new TypeError('Argument is not iterable'));
      }
    });
  };
}

/**
 * 对 resolve、reject 进行改造增强，针对 resolve 和 reject 中不同值的情况进行处理
 * @param  {promise} promise2 promise1.then 方法返回的新的 promise 对象
 * @param  {[type]} x         promise1 中 onFulfilled 或 onRejected 的返回值
 * @param  {[type]} resolve   promise2 的 resolve 方法
 * @param  {[type]} reject    promise2 的 reject 方法
 */
const resolvePromise = <T>(
  promise2: MyPromise<T>,
  x: T | PromiseLike<T>,
  resolve?: Resolve<T>,
  reject?: Reject
): void => {
  // 2.3.1 规范 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 reject
  if (promise2 === x) {
    return reject?.(new TypeError('Chaining cycle detected for promise'));
  }
  // 2.3.2 规范 如果 x 为 Promise ，则使 promise2 接受 x 的状态
  if (x instanceof MyPromise) {
    if (x.PromiseState === State.PENDING) {
      /**
       * 2.3.2.1 如果 x 处于等待态， promise 需保持为等待态直至 x 被执行或拒绝
       *         注意"直至 x 被执行或拒绝"这句话，
       *         这句话的意思是：x 被执行x，如果执行的时候拿到一个y，还要继续解析y
       */
      x.then(y => {
        resolvePromise(promise2, y, resolve, reject);
      }, reject);
    }
    if (x.PromiseState === State.FULFILLED) {
      // 2.3.2.2 如果 x 处于执行态，用相同的值执行 promise
      resolve?.(x.PromiseResult);
    }
    if (x.PromiseState === State.REJECTED) {
      // 2.3.2.3 如果 x 处于拒绝态，用相同的据因拒绝 promise
      reject?.(x.PromiseResult);
    }
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    // 2.3.3 如果 x 为对象或函数
    let then: PromiseLike<T>['then'];
    try {
      // 2.3.3.1 把 x.then 赋值给 then
      then = (x as PromiseLike<T>).then;
    } catch (e) {
      // 2.3.3.2 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
      return reject?.(e);
    }
    /**
     * 2.3.3.3
     * 如果 then 是函数，将 x 作为函数的作用域 this 调用之。
     * 传递两个回调函数作为参数，
     * 第一个参数叫做 `resolvePromise` ，第二个参数叫做 `rejectPromise`
     */
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
            reject?.(r);
          }
        );
      } catch (e) {
        /**
         * 2.3.3.3.4 如果调用 then 方法抛出了异常 e
         * 2.3.3.3.4.1 如果 resolvePromise 或 rejectPromise 已经被调用，则忽略之
         */
        if (called) {
          return;
        }
        called = true;
        // 2.3.3.3.4.2 否则以 e 为据因拒绝 promise
        reject?.(e);
      }
    } else {
      // 2.3.3.4 如果 then 不是函数，以 x 为参数执行 promise
      resolve?.(x);
    }
  } else {
    // 2.3.4 如果 x 不为对象或者函数，以 x 为参数执行 promise
    resolve?.(x);
  }
};

// 下面这部分代码是用来跑测试用例的，和 Promise 本身无关

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
Reflect.set(MyPromise, 'deferred', () => {
  const result: Record<PropertyKey, any> = {};
  Reflect.set(
    result,
    'promise',
    new MyPromise((resolve, reject) => {
      Reflect.set(result, 'resolve', resolve);
      Reflect.set(result, 'reject', reject);
    })
  );
  return result;
});

module.exports = MyPromise;

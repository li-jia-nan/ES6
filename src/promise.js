'use strict';
exports.__esModule = true;
var State;
(function (State) {
  State['PENDING'] = 'pending';
  State['FULFILLED'] = 'fulfilled';
  State['REJECTED'] = 'rejected';
})(State || (State = {}));
var isFunc = function (value) {
  return typeof value === 'function';
};
var MyPromise = /** @class */ (function () {
  function MyPromise(func) {
    var _this = this;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    this.resolve = function (result) {
      if (_this.PromiseState === State.PENDING) {
        setTimeout(function () {
          _this.PromiseState = State.FULFILLED;
          _this.PromiseResult = result;
          _this.onFulfilledCallbacks.forEach(function (callback) {
            callback(result);
          });
        });
      }
    };
    this.reject = function (reason) {
      if (_this.PromiseState === State.PENDING) {
        setTimeout(function () {
          _this.PromiseState = State.REJECTED;
          _this.PromiseResult = reason;
          _this.onRejectedCallbacks.forEach(function (callback) {
            callback(reason);
          });
        });
      }
    };
    this.then = function (onFulfilled, onRejected) {
      onFulfilled = isFunc(onFulfilled)
        ? onFulfilled
        : function (value) {
            return value;
          };
      onRejected = isFunc(onRejected)
        ? onRejected
        : function (reason) {
            throw reason;
          };
      var promise2 = new MyPromise(function (resolve, reject) {
        if (_this.PromiseState === State.FULFILLED) {
          setTimeout(function () {
            try {
              var x =
                onFulfilled === null || onFulfilled === void 0
                  ? void 0
                  : onFulfilled(_this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject === null || reject === void 0 ? void 0 : reject(e);
            }
          });
        }
        if (_this.PromiseState === State.REJECTED) {
          setTimeout(function () {
            try {
              var x =
                onRejected === null || onRejected === void 0
                  ? void 0
                  : onRejected(_this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject === null || reject === void 0 ? void 0 : reject(e);
            }
          });
        }
        if (_this.PromiseState === State.PENDING) {
          _this.onFulfilledCallbacks.push(function () {
            setTimeout(function () {
              try {
                var x =
                  onFulfilled === null || onFulfilled === void 0
                    ? void 0
                    : onFulfilled(_this.PromiseResult);
                resolvePromise(promise2, x, resolve, reject);
              } catch (e) {
                reject === null || reject === void 0 ? void 0 : reject(e);
              }
            });
          });
          _this.onRejectedCallbacks.push(function () {
            setTimeout(function () {
              try {
                var x =
                  onRejected === null || onRejected === void 0
                    ? void 0
                    : onRejected(_this.PromiseResult);
                resolvePromise(promise2, x, resolve, reject);
              } catch (e) {
                reject === null || reject === void 0 ? void 0 : reject(e);
              }
            });
          });
        }
      });
      return promise2;
    };
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
  return MyPromise;
})();
function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject === null || reject === void 0
      ? void 0
      : reject(new TypeError('Chaining cycle detected for promise'));
  }
  if (x instanceof MyPromise) {
    if (x.PromiseState === State.PENDING) {
      x.then(function (y) {
        resolvePromise(promise2, y, resolve, reject);
      }, reject);
    }
    if (x.PromiseState === State.FULFILLED) {
      resolve === null || resolve === void 0 ? void 0 : resolve(x.PromiseResult);
    }
    if (x.PromiseState === State.REJECTED) {
      reject === null || reject === void 0 ? void 0 : reject(x.PromiseResult);
    }
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    var then = void 0;
    try {
      then = x.then;
    } catch (e) {
      return reject === null || reject === void 0 ? void 0 : reject(e);
    }
    if (typeof then === 'function') {
      var called_1 = false;
      try {
        then.call(
          x,
          function (y) {
            if (called_1) {
              return;
            }
            called_1 = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          function (r) {
            if (called_1) {
              return;
            }
            called_1 = true;
            reject === null || reject === void 0 ? void 0 : reject(r);
          }
        );
      } catch (e) {
        if (called_1) {
          return;
        }
        called_1 = true;
        reject === null || reject === void 0 ? void 0 : reject(e);
      }
    } else {
      resolve === null || resolve === void 0 ? void 0 : resolve(x);
    }
  } else {
    return resolve === null || resolve === void 0 ? void 0 : resolve(x);
  }
}
// 忽略 typescript 校验
// @ts-ignore
MyPromise.deferred = function () {
  var result = {};
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
};
exports['default'] = MyPromise;

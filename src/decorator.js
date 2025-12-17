import overload from "./index.js";

/**
 * 检查设置器参数的类型。
 */
const setterTypeCheckers = new WeakMap();

/**
 * 装饰器：检查设置器参数的类型。
 * @param type 设置器参数的类型检查器。
 * @returns 设置器装饰器。
 */
export function checkSetterType(type) {
    /**
     * 如果类型检查器不存在，则创建一个新的类型检查器并存储在 WeakMap 中。
     */
    if (!setterTypeCheckers.has(type)) {
        setterTypeCheckers.set(type, overload([type], function () { }));
    }

    /**
     * 创建设置器装饰器。
     * @param target 设置器函数。
     * @param context 设置器上下文。
     * @returns 返回一个新的函数，该函数在调用时会执行类型检查。
     */
    return function (target, context) {
        const checker = setterTypeCheckers.get(type);

        /**
         * 返回一个新的函数，该函数在调用时会执行类型检查。
         * @returns 返回设置器的返回值。
         */
        return function (...args) {
            checker?.(...args);
            const result = target.call(this, ...args);
            return result;
        }
    }
}

/**
 * 装饰器：惰性检查设置器参数的类型。
 * @param lambdaType 返回设置器参数类型检查器的函数。
 * @returns 设置器装饰器。
 */
export function lazyCheckSetterType(lambdaType) {
    /**
     * 创建设置器装饰器。
     * @param target 设置器函数。
     * @param context 设置器上下文。
     * @returns 返回一个新的函数，该函数在调用时会执行类型检查。
     */
    return function (target, context) {
        let checker;
        /**
         * 返回一个新的函数，该函数在调用时会执行类型检查。
         * @returns 返回设置器的返回值。
         */
        return function (...args) {
            if (!checker) {
                const type = lambdaType();
                /**
                 * 如果类型检查器不存在，则创建一个新的类型检查器并存储在 WeakMap 中。
                 */
                if (!setterTypeCheckers.has(type)) {
                    setterTypeCheckers.set(type, overload([type], function () { }));
                }
                checker = setterTypeCheckers.get(type);
            }
            checker?.(...args);
            const result = target.call(this, ...args);
            return result;
        }
    }
}
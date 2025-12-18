/**
 * 装饰器：检查设置器参数的类型。
 * @param type 设置器参数的类型检查器。
 * @template This 设置器的 this 类型。
 * @template Args 设置器参数的类型。
 * @template Return 设置器返回值的类型。
 * @returns 设置器装饰器。
 */
export function checkSetterType<This, Args extends any[], Return>(type: Function): Function;

/**
 * 装饰器：惰性检查设置器参数的类型。
 * @param lambdaType 返回设置器参数类型检查器的函数。
 * @returns 设置器装饰器。
 */
export function lazyCheckSetterType(lambdaType: () => any): Function;
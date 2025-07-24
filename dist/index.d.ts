/**
 * 执行重载函数
 * @param {Array<any>} [params] - 参数列表
 * @returns {any} 返回值
 */
function overload(...params): any;

/**
 * 添加函数重载
 * @param {Array} types - 参数类型列表
 * @param {Function} fn - 要调用的函数
 * @returns {Function} 执行重载函数
 * @throws {TypeError} 参数类型错误
 * @throws {SyntaxError} 解析错误
 * @throws {Error} 运行时错误
 */
overload.add = function (types: any[], fn: Function): typeof overload {
  return overload;
};

/**
 * 设置兜底函数
 * @param {Function} fn - 兜底函数
 * @returns {Function} 执行重载函数
 * @throws {TypeError} 参数类型错误
 * @throws {Error} 运行时错误
 */
overload.any = function (fn: Function): typeof overload {
  return overload;
};

/**
 * 返回一个重载函数
 * @param {Array<any>} [defaultTypes] - 默认参数类型列表
 * @param {Function} [defaultFn] - 默认要调用的函数
 * @returns {Function} 执行重载函数
 */
export default function (
  defaultTypes?: Array<any>,
  defaultFn?: Function
): typeof overload;

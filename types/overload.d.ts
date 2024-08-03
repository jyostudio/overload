/**
 * 重载函数
 * @param {Array<any>} [params] - 参数列表
 */
interface overload {
  /**
   * 添加函数重载
   * @param {Array} types - 参数类型列表
   * @param {Function} fn - 要调用的函数
   * @returns {Function} 重载函数
   * @throws {TypeError}
   * @throws {Error}
   */
  add(types: Array<any>, fn: Function): overload;

  /**
   * 设置兜底函数
   * @param {Function} fn - 兜底函数
   * @returns {Function} 重载函数
   * @throws {TypeError}
   * @throws {Error}
   */
  any(fn: Function): overload;
}

/**
 * 返回一个重载函数
 * @param {Array<any>} [defaultTypes] - 默认参数类型列表
 * @param {Function} [defaultFn] - 默认要调用的函数
 * @returns {Function} 重载函数
 */
export default function (
  defaultTypes?: Array<any>,
  defaultFn?: Function
): overload;

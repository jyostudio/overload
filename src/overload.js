/**
 * 类型名称映射表
 * @type {Map<String, String>}
 */
const TYPE_NAMES = new Map([
  ["number", "Number"],
  ["string", "String"],
  ["boolean", "Boolean"],
  ["symbol", "Symbol"],
  ["bigint", "BigInt"],
  ["undefined", "(undefined)"],
]);

/**
 * 内部类型父级标志
 */
const INNER_TYPE_FATHER = "##INNER_TYPE##";

/**
 * 内部类型子级标志
 */
const INNER_TYPE_SON = "@@INNER_TYPE@@";

/**
 * 匹配类型
 * @param {any} param - 传入的参数
 * @param {any} type - 期望的类型
 * @returns {Boolean} 是否匹配
 */
function matchType(param, type) {
  if (Array.isArray(type)) {
    for (let i = 0; i < type.length; i++) {
      if (matchType(param, type[i])) return true;
    }
    return false;
  }

  if (typeof type !== "function") {
    if (
      type === "*" && param !== null ||
      type === "..." ||
      (type === null && param === null) ||
      type === typeof param
    )
      return true;
    return false;
  }

  switch (typeof param) {
    case "function":
    case "object":
      break;
    default:
      param = Object(param);
      break;
  }

  if (param?.[INNER_TYPE_SON]) {
    return param[INNER_TYPE_SON] === type?.[INNER_TYPE_FATHER];
  }

  if (param instanceof type || param === type) return true;

  return false;
}

/**
 * 获取类型名称
 * @param {any} param - 传入的参数
 * @returns {String} 类型名称
 */
function getTypeName(param) {
  if (param === null) return "null";

  if (param === "*") return "(any)";

  const paramType = typeof param;

  if (paramType in TYPE_NAMES) return TYPE_NAMES.get(paramType);

  let className = (param.name || param.constructor.name || "(unknown)").split(" ").pop();

  [INNER_TYPE_FATHER, INNER_TYPE_SON].forEach(v => {
    if (param?.[v]) {
      className += `<${getTypeName(param?.[v])}>`;
    }
  });

  if (paramType === "function" && className === "anonymous")
    return "(anonymous)";

  return className;
}

/**
 * 返回一个重载函数
 * @param {Array<any>} [defaultTypes] - 默认参数类型列表
 * @param {Function} [defaultFn] - 默认要调用的函数
 * @returns {Function} 重载函数
 */
export default function (defaultTypes, defaultFn) {
  const TABLE = new Map();
  let anyFn = null;

  /**
   * 调用兜底函数
   * @param  {...any} args - 参数列表
   * @returns {any} 返回值
   */
  function runAny(...args) {
    if (anyFn) return anyFn.apply(this, args);

    throwStackInfo(new Error(), args);
  }

  /**
   * 抛出堆栈信息
   * @param {Error} err - 错误对象
   * @param {...any} args - 参数列表
   * @throws {Error}
   */
  function throwStackInfo(err, args) {
    const stackList = err.stack.split("\n").splice(3);
    let errorMessage = "";
    let formattedStack = "\n";
    let errorMethodName = "";

    stackList.forEach((stackLine, index, arr) => {
      const parts = stackLine.trim().split(" ");
      const fullMethodName = parts.length === 3 ? parts[1] : "(anonymous)";
      const methodName = fullMethodName.split(".").pop();

      arr[index] = {
        fullMethodName,
        methodName,
        link: parts.length === 3 ? parts[2] : parts[1],
      };

      if (!index) {
        errorMethodName = methodName;
      } else {
        formattedStack += `${methodName}\t${arr[index].link}\n`;
      }
    });

    const matchingTypes = Array.from(TABLE.keys()).find(
      (types) => types.length === args.length
    );

    if (!matchingTypes) {
      errorMessage += `The function "${errorMethodName}" does not have an overload that takes ${args.length} arguments.`;
      errorMessage += formattedStack;
      throw new Error(errorMessage);
    }

    let hasError = false;
    matchingTypes.forEach((expectedType, i) => {
      if (!matchType(args[i], expectedType)) {
        const expectedTypeNames = Array.isArray(expectedType)
          ? expectedType.map(getTypeName).join("、")
          : getTypeName(expectedType);

        errorMessage += `${hasError ? "\n" : ""}Argument ${i + 1
          }: Cannot convert from "${getTypeName(
            args[i]
          )}" to "${expectedTypeNames}".`;
        hasError = true;
      }
    });

    if (hasError) {
      errorMessage = `Error calling function "${errorMethodName}"\n${errorMessage}`;
      errorMessage += formattedStack;
      throw new Error(errorMessage);
    }
  }

  /**
   * 重载函数
   * @param {...any} params - 参数列表
   * @returns {any} 返回值
   */
  function overload(...params) {
    if (!TABLE.size) return runAny.apply(this, params);

    const SAME_LENGTH_MATCH = Array.from(TABLE.keys()).filter(
      (v) => {
        return v.length === params.length || v[v.length - 1] === "...";
      }
    );

    loop: for (let i = 0; i < SAME_LENGTH_MATCH.length; i++) {
      const types = SAME_LENGTH_MATCH[i];

      if (typeof types[0] !== "undefined" && types[0] !== "..." && params.length === 0) {
        continue loop;
      }

      for (let j = 0; j < params.length; j++) {
        if (!matchType(params[j], types[j] || types[types.length - 1])) continue loop;
      }

      return TABLE.get(types).apply(this, params);
    }

    return runAny.apply(this, params);
  }

  /**
   * 添加函数重载
   * @param {Array} types - 参数类型列表
   * @param {Function} fn - 要调用的函数
   * @returns {Function} 重载函数
   * @throws {TypeError}
   * @throws {Error}
   */
  overload.add = function (types, fn) {
    if (!Array.isArray(types)) throw new TypeError(`"types" must be an array.`);

    if (typeof fn !== "function")
      throw new TypeError(`"fn" must be a function.`);

    for (let i = 0; i < types.length; i++) {
      if (types[i] === "..." && i !== types.length - 1) {
        throw new Error(`A "..." parameter must be the last parameter in a formal parameter list.`);
      }
    }

    TABLE.size &&
      Array.from(TABLE.keys()).forEach((key) => {
        if (key.length !== types.length) return;

        for (let i = 0; i < key.length; i++) {
          if (key[i] !== types[i]) return;
        }

        throw new Error(`Function with the same signature already exists.`);
      });

    types.forEach((type) => {
      const isArray = Array.isArray(type);
      if (typeof type !== "function" && !isArray && type !== "*" && type !== "...") {
        throw new Error(`The expected type must be Class, Array, "*" or the last parameter type can also be "...".`);
      }

      if (isArray) {
        for (let i = 0; i < type.length; i++) {
          if (
            typeof type[i] !== "function" &&
            type[i] !== null &&
            type[i] !== "*"
          ) {
            throw new Error(
              `The predetermined type enumeration content must be a Class, null or "*".`
            );
          }
        }
      }
    });

    TABLE.set(types, fn);

    return overload;
  };

  /**
   * 设置兜底函数
   * @param {Function} fn - 兜底函数
   * @returns {Function} 重载函数
   * @throws {TypeError}
   * @throws {Error}
   */
  overload.any = function (fn) {
    if (typeof fn !== "function")
      throw new TypeError(`"fn" must be a function.`);

    if (anyFn) throw new Error(`"any" function is already defined.`);

    anyFn = fn;

    return overload;
  };

  if (Array.isArray(defaultTypes) && typeof defaultFn === "function")
    overload.add(defaultTypes, defaultFn);
  else if (defaultTypes || defaultFn)
    throw new TypeError(`"defaultTypes" must be an array and "defaultFn" must be a function.`);

  return overload;
}

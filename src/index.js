const ANY_STR = "*";
const REST_STR = "...";

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
      if (matchType(param, type[i])) {
        return true;
      }
    }
    return false;
  }

  if (typeof type !== "function") {
    if (
      type === ANY_STR && param !== null ||
      type === REST_STR ||
      (type === null && param === null) ||
      type === typeof param
    ) {
      return true;
    }
    return false;
  }

  switch (typeof param) {
    case "function":
    case "object":
      break;
    case "string": param = String; break;
    case "number": param = Number; break;
    case "boolean": param = Boolean; break;
    case "symbol": param = Symbol; break;
    case "bigint": param = BigInt; break;
    default: param = Object(param); break;
  }

  if (param === type || param instanceof type) {
    return true;
  }

  if (param?.[INNER_TYPE_SON]) {
    return param[INNER_TYPE_SON] === type?.[INNER_TYPE_FATHER];
  }

  return false;
}

/**
 * 获取类型名称
 * @param {any} param - 传入的参数
 * @returns {String} 类型名称
 */
function getTypeName(param) {
  if (param === null) {
    return "null";
  }

  if (param === ANY_STR) {
    return "(任意)";
  }

  const paramType = typeof param;

  if (!["function", "object"].includes(paramType)) {
    return paramType[0].toUpperCase() + paramType.slice(1);;
  }

  let className = (param?.name || param?.constructor?.name || "(未知)").split(" ").pop();

  [INNER_TYPE_FATHER, INNER_TYPE_SON].forEach(v => {
    if (param?.[v]) {
      className += `<${getTypeName(param?.[v])}>`;
    }
  });

  if (paramType === "function" && className === "anonymous") {
    return "(匿名)";
  }

  return className;
}

/**
 * 抛出堆栈信息
 * @param {Error} err - 错误对象
 * @param {...any} args - 参数列表
 * @throws {Error}
 */
function throwStackInfo(err, types, args) {
  const stackList = err.stack.split("\n").splice(3);
  let errorMessage = "";
  let formattedStack = "\n";
  let errorMethodName = "";

  stackList.forEach((stackLine, index, arr) => {
    const parts = stackLine.trim().split(" ");
    const fullMethodName = parts.length === 3 ? parts[1] : `(匿名)`;
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

  const matchingTypes = types.find(v => v.length === args.length);

  if (!matchingTypes) {
    errorMessage += `方法 ${errorMethodName} 不存在 ${args.length} 个参数的重载。`;
    errorMessage += formattedStack;
    throw new Error(errorMessage);
  }

  let hasError = false;
  matchingTypes.forEach((expectedType, i) => {
    if (!matchType(args[i], expectedType)) {
      const expectedTypeNames = Array.isArray(expectedType)
        ? expectedType.map(getTypeName).join("、")
        : getTypeName(expectedType);

      errorMessage += `${hasError ? "\n" : ""}参数${i + 1}：预期 ${expectedTypeNames} 但得到 ${getTypeName(args[i])}。`;

      hasError = true;
    }
  });

  if (hasError) {
    errorMessage = `方法 ${errorMethodName} 调用错误\n${errorMessage}`;
    errorMessage += formattedStack;
    throw new Error(errorMessage);
  }
}

/**
 * 返回一个重载函数
 * @returns {Function} 重载函数
 */
function createOverload() {
  const TYPES = [];
  const FNS = [];
  const OPTIONS = [];
  let anyFn = null;

  /**
   * 调用兜底函数
   * @param  {...any} args - 参数列表
   * @returns {any} 返回值
   */
  function runAny(...args) {
    if (anyFn) {
      return anyFn.apply(this, args);
    }

    throwStackInfo(new Error(), TYPES, args);
  }

  /**
   * 重载函数
   * @param {...any} params - 参数列表
   * @returns {any} 返回值
   */
  function overload(...params) {
    if (!TYPES.length) {
      return runAny.apply(this, params);
    }

    const paramsLength = params.length;

    loop: for (let i = 0; i < TYPES.length; i++) {
      const types = TYPES[i];
      const options = OPTIONS[i];
      const typesLength = types.length;

      if ((options.length !== paramsLength && !options.rest) ||
        (paramsLength === 0 && typesLength && types[0] !== REST_STR)) {
        continue;
      }

      for (let j = 0; j < paramsLength; j++) {
        const type = types[j] || types[typesLength - 1];
        if (!matchType(params[j], type)) {
          try {
            const convert = type?.["⇄"]?.(params[j]);
            if (matchType(convert, type)) {
              params[j] = convert;
              continue;
            }
          } catch { }
          continue loop;
        }
      }

      return FNS[i].apply(this, params);
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
    if (!Array.isArray(TYPES)) {
      throw new TypeError("types 必须是数组。");
    }

    if (typeof fn !== "function") {
      throw new TypeError("fn 必须是函数。");
    }

    for (let i = 0; i < types.length; i++) {
      if (types[i] === REST_STR && i !== types.length - 1) {
        throw new SyntaxError(`${REST_STR} 必须是最后一个参数。`);
      }
    }

    TYPES.forEach((key) => {
      if (key.length !== types.length) {
        return;
      }

      for (let i = 0; i < key.length; i++) {
        if (key[i] !== types[i]) return;
      }

      throw new Error("已存在此签名的重载。");
    });

    TYPES.forEach(type => {
      const isArray = Array.isArray(type);
      if (typeof type !== "function" && !isArray && type !== ANY_STR && type !== REST_STR) {
        throw new TypeError(`期望类型为 Class、Array、${ANY_STR} 或末尾参数也可以是 ${REST_STR}。`);
      }

      if (isArray) {
        for (let i = 0; i < type.length; i++) {
          const typeofStr = typeof type[i];
          if (
            typeofStr !== "function" &&
            !(typeofStr === "object" && typeof type[i]?.constructor === "function") &&
            type[i] !== null &&
            type[i] !== ANY_STR
          ) {
            throw new TypeError(`类型必须为 Class、null 或 ${ANY_STR}。`);
          }
        }
      }
    });

    TYPES.push(types);
    FNS.push(fn);
    OPTIONS.push({
      length: types.length,
      rest: types[types.length - 1] === REST_STR,
    });

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
    if (anyFn) {
      throw new Error("any 函数已存在。");
    }

    if (typeof fn !== "function") {
      throw new TypeError("fn 必须是函数。");
    }

    anyFn = fn;

    return overload;
  };

  return overload;
}

export default createOverload()
  .add([], function () {
    return createOverload();
  })
  .add([Array, Function], function (types, fn) {
    const result = createOverload();
    result.add(types, fn);
    return result;
  });
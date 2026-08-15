import { ANY_STR, REST_STR, TYPE_CONVERT_STR, INNER_TYPE_FATHER, INNER_TYPE_SON, INNER_TYPE_FN, INNER_THROW_FN } from "./constant.js";

/**
 * 匹配类型
 * @param {any} param - 传入的参数
 * @param {any} type - 期望的类型
 * @param {String} [precomputedTypeOfParam] - 已计算好的 typeof param（热路径优化）
 * @returns {Boolean} 是否匹配
 */
function matchType(param, type, precomputedTypeOfParam) {
  if (Array.isArray(type)) {
    for (let i = 0; i < type.length; i++) {
      if (matchType(param, type[i], precomputedTypeOfParam)) {
        return true;
      }
    }
    return false;
  }

  if (type?.[INNER_TYPE_FN]?.(param)) {
    return true;
  }

  if (typeof type !== "function") {
    if (
      (type === ANY_STR && param !== null) ||
      type === REST_STR ||
      (type === null && param === null) ||
      (type === undefined && param === undefined) ||
      type === typeof param
    ) {
      return true;
    }
    return false;
  }

  const typeOfParam = precomputedTypeOfParam === undefined ? typeof param : precomputedTypeOfParam;

  if (typeOfParam === "number" && type === Number) return true;
  if (typeOfParam === "string" && type === String) return true;
  if (typeOfParam === "boolean" && type === Boolean) return true;
  if (typeOfParam === "symbol" && type === Symbol) return true;
  if (typeOfParam === "bigint" && type === BigInt) return true;
  if (type === Object) return typeOfParam === "object";
  if ((typeOfParam === "function" || typeOfParam === "object") && param instanceof type) {
    if (param?.[INNER_TYPE_SON] && type?.[INNER_TYPE_FATHER]) {
      return param[INNER_TYPE_SON] === type[INNER_TYPE_FATHER];
    }

    return true;
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
    return paramType[0].toUpperCase() + paramType.slice(1);
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

  const matchingTypes = types.filter(v => {
    if (v.length > 0 && v[v.length - 1] === REST_STR) {
      return args.length >= v.length - 1;
    }
    return v.length === args.length;
  });

  if (!matchingTypes.length) {
    errorMessage += `方法 ${errorMethodName} 不存在 ${args.length} 个参数的重载。`;
    errorMessage += formattedStack;
    throw new Error(errorMessage);
  }

  let hasError = false;
  matchingTypes.forEach((matchingType) => {
    matchingType.forEach((expectedType, i) => {
      if (!matchType(args[i], expectedType)) {
        const expectedTypeNames = Array.isArray(expectedType)
          ? expectedType.map(getTypeName).join("、")
          : getTypeName(expectedType);

        errorMessage += `${hasError ? "\n" : ""}参数${i + 1}：预期 ${expectedTypeNames} 但得到 ${getTypeName(args[i])}。`;

        if (Array.isArray(expectedType)) {
          expectedType.forEach((type, index) => {
            if (typeof type?.[INNER_THROW_FN] === "function") {
              errorMessage += `${index === 0 ? "\n附加信息：\n" : ""}尝试方案${i + 1} - ${type[INNER_THROW_FN]?.(args[i])}`;
            }
          });
        } else if (typeof expectedType?.[INNER_THROW_FN] === "function") {
          errorMessage += `\n附加信息：\n尝试方案${i + 1} - ${expectedType[INNER_THROW_FN]?.(args[i])}`;
        }

        hasError = true;
      }
    });
  });

  if (hasError) {
    errorMessage = `方法 ${errorMethodName} 调用错误\n${errorMessage}`;
    errorMessage += formattedStack;
    throw new Error(errorMessage);
  }
}

/** null 参数在缓存 key 中的占位（区别于原型为 null 的对象） */
const NULL_KEY = {};

/**
 * 判断一个类型是否只依赖 typeof / instanceof（纯匹配器）。
 * @param {any} type - 期望的类型
 * @returns {Boolean} 是否为纯匹配器
 */
function isPureType(type) {
  if (Array.isArray(type)) {
    for (let i = 0; i < type.length; i++) {
      if (!isPureType(type[i])) {
        return false;
      }
    }
    return true;
  }

  if (type === null || type === undefined) {
    return true;
  }

  if (typeof type === "string") {
    return true;
  }

  if (typeof type === "function") {
    return !type[INNER_TYPE_FN] &&
      typeof type[TYPE_CONVERT_STR] !== "function" &&
      !type[INNER_TYPE_FATHER] &&
      type[Symbol.hasInstance] === Function.prototype[Symbol.hasInstance];
  }

  return false;
}

/**
 * 构造缓存 key：第 0 位是参数个数，之后每位是参数的 typeof；
 * 对象/函数参数使用其原型链锚点（Object.getPrototypeOf）作为 key。
 * 相同 key 保证对所有纯匹配器的判定结果完全一致。
 * @param {IArguments | Array} args - 参数列表
 * @returns {Array} 缓存 key
 */
function buildMemoKey(args) {
  const length = args.length;
  const key = new Array(length + 1);
  key[0] = length;

  for (let i = 0; i < length; i++) {
    const param = args[i];

    if (param === null) {
      key[i + 1] = NULL_KEY;
      continue;
    }

    const typeOfParam = typeof param;
    key[i + 1] = typeOfParam === "object" || typeOfParam === "function"
      ? Object.getPrototypeOf(param)
      : typeOfParam;
  }

  return key;
}

/**
 * 比较两个缓存 key 是否一致。
 * @param {Array} keyA - 缓存 key
 * @param {Array} keyB - 缓存 key
 * @returns {Boolean} 是否一致
 */
function isSameMemoKey(keyA, keyB) {
  if (keyA[0] !== keyB[0]) {
    return false;
  }

  for (let i = 1; i < keyA.length; i++) {
    if (keyA[i] !== keyB[i]) {
      return false;
    }
  }

  return true;
}

/**
 * 检查签名 index 是否匹配 args。
 * @param {Array} types - 全部签名的类型列表
 * @param {Array} options - 全部签名的选项列表
 * @param {Number} index - 签名在 types 中的下标
 * @param {IArguments | Array} args - 参数列表
 * @returns {IArguments | Array | null} 匹配时返回最终参数（发生类型转换时为新建数组），否则返回 null
 */
function matchSignature(types, options, index, args) {
  const signatureTypes = types[index];
  const signatureOptions = options[index];
  const paramsLength = args.length;
  const typesLength = signatureTypes.length;
  const isRest = signatureOptions.rest;

  if ((signatureOptions.length !== paramsLength && !isRest) ||
    (paramsLength === 0 && typesLength && signatureTypes[0] !== REST_STR) ||
    (isRest && paramsLength < typesLength - 1)) {
    return null;
  }

  let convertedArgs = null;

  for (let j = 0; j < paramsLength; j++) {
    // 非 rest 签名直接取对应位置；rest 签名超出声明部分的参数使用最后一个类型
    const type = !isRest || j < typesLength - 1 ? signatureTypes[j] : signatureTypes[typesLength - 1];

    // REST_STR 总是匹配，直接跳过
    if (type === REST_STR) continue;

    const param = args[j];

    // ANY_STR 匹配非 null
    if (type === ANY_STR && param !== null) continue;

    const typeOfParam = typeof param;

    // 内联基础类型检查 (Fast Path，按出现频率排序)
    if (typeOfParam === "number" && type === Number) continue;
    if (typeOfParam === "string" && type === String) continue;
    if (typeOfParam === "boolean" && type === Boolean) continue;
    if (typeOfParam === "function" && type === Function) continue;
    // Object 匹配 object 类型 (包含 null)
    if (typeOfParam === "object" && type === Object) continue;
    if (type === null && param === null) continue;
    if (typeOfParam === "symbol" && type === Symbol) continue;
    if (typeOfParam === "bigint" && type === BigInt) continue;
    if (typeOfParam === "undefined" && type === undefined) continue;

    if (!matchType(param, type, typeOfParam)) {
      if (type && typeof type[TYPE_CONVERT_STR] === "function") {
        const converted = type[TYPE_CONVERT_STR](param);

        if (matchType(converted, type)) {
          if (!convertedArgs) {
            convertedArgs = new Array(paramsLength);
            for (let k = 0; k < paramsLength; k++) {
              convertedArgs[k] = args[k];
            }
          }

          convertedArgs[j] = converted;
          continue;
        }
      }

      return null;
    }
  }

  return convertedArgs || args;
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
   * 是否存在依赖"参数值"而非"类型/原型链"的匹配器。
   * 例如 JSONSchema、自定义 INNER_TYPE_FN、类型转换（⇄）、INNER_TYPE_FATHER、Symbol.hasInstance。
   * 存在时禁用"最近命中签名"缓存，以保证与逐签名扫描完全一致的匹配结果。
   */
  let hasImpureMatcher = false;

  /**
   * 最近命中的签名缓存（MRU 顺序，最多 MEMO_SIZE 条）。
   * 每条为 { key, index }：key 由参数构造，index 为签名在 TYPES 中的下标。
   * 相同 key 保证对所有纯匹配器的判定结果完全一致，因此命中即可直接分派。
   */
  const MEMO_SIZE = 4;
  const memoList = [];

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
  function overload() {
    if (!TYPES.length) {
      return runAny.apply(this, arguments);
    }

    let probedKey = null;

    // 优先探测最近命中的签名（仅当所有匹配器均为纯类型时启用）
    if (!hasImpureMatcher && memoList.length) {
      probedKey = buildMemoKey(arguments);

      for (let m = 0; m < memoList.length; m++) {
        const entry = memoList[m];

        if (!isSameMemoKey(probedKey, entry.key)) {
          continue;
        }

        const args = matchSignature(TYPES, OPTIONS, entry.index, arguments);

        if (args !== null) {
          // 命中后移到最前（MRU）
          if (m !== 0) {
            memoList.splice(m, 1);
            memoList.unshift(entry);
          }

          return FNS[entry.index].apply(this, args);
        }
      }
    }

    for (let i = 0; i < TYPES.length; i++) {
      const args = matchSignature(TYPES, OPTIONS, i, arguments);

      if (args !== null) {
        // 只有非首签名才值得缓存（首签名本身就是扫描第一步）
        if (!hasImpureMatcher && i !== 0) {
          const key = probedKey || buildMemoKey(arguments);

          // 去重后插入到最前（MRU），并裁剪到 MEMO_SIZE
          for (let m = memoList.length - 1; m >= 0; m--) {
            if (isSameMemoKey(memoList[m].key, key)) {
              memoList.splice(m, 1);
            }
          }

          memoList.unshift({ key, index: i });

          if (memoList.length > MEMO_SIZE) {
            memoList.pop();
          }
        }

        return FNS[i].apply(this, args);
      }
    }

    return runAny.apply(this, arguments);
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
    if (!Array.isArray(types)) {
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

    if (!isPureType(types)) {
      hasImpureMatcher = true;
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
import overload from "../src/index.js";
import { ANY_STR, REST_STR } from "../src/constant.js";

const stats = { total: 0, pass: 0, fail: 0 };

function log(msg) {
    console.log(msg);
}

function assert(condition, message) {
    stats.total++;
    if (condition) {
        stats.pass++;
        log(`[PASS] ${message}`);
    } else {
        stats.fail++;
        log(`[FAIL] ${message}`);
    }
}

function assertThrow(fn, expectedErrorMsg, message) {
    stats.total++;
    try {
        fn();
        stats.fail++;
        log(`[FAIL] ${message} - 预期抛出错误但未抛出`);
    } catch (e) {
        if (expectedErrorMsg && !e.message.includes(expectedErrorMsg)) {
            stats.fail++;
            log(`[FAIL] ${message} - 捕获到错误但信息不匹配。预期包含: "${expectedErrorMsg}", 实际: "${e.message}"`);
        } else {
            stats.pass++;
            log(`[PASS] ${message}`);
        }
    }
}

log("--- 开始测试 overload.add 方法 ---");

// 1. 基础参数校验
assertThrow(() => {
    overload().add("not array", () => {});
}, "types 必须是数组", "校验 types 参数不是数组");

assertThrow(() => {
    overload().add([], "not function");
}, "fn 必须是函数", "校验 fn 参数不是函数");

// 2. REST_STR 位置校验
assertThrow(() => {
    overload().add([REST_STR, Number], () => {});
}, "必须是最后一个参数", "校验 REST_STR 必须在最后");

// 3. 非法类型校验
assertThrow(() => {
    overload().add([123], () => {});
}, "期望类型为 Class", "校验非法类型 (数字)");

assertThrow(() => {
    overload().add(["string"], () => {});
}, "期望类型为 Class", "校验非法类型 (字符串)");

assertThrow(() => {
    overload().add([{}], () => {});
}, "期望类型为 Class", "校验非法类型 (普通对象)");

// undefined 是合法的类型占位符，不应报错
try {
    overload().add([undefined], () => {});
    assert(true, "校验合法类型 (undefined)");
} catch (e) {
    assert(false, `校验合法类型 (undefined) 失败: ${e.message}`);
}

// 4. 联合类型校验
assertThrow(() => {
    overload().add([[Number, 123]], () => {});
}, "类型必须为 Class", "校验联合类型中包含非法值");

// 5. 合法类型添加测试
try {
    const fn = overload();
    fn.add([], () => "empty");
    fn.add([Number], () => "number");
    fn.add([String], () => "string");
    fn.add([Boolean], () => "boolean");
    fn.add([Object], () => "object");
    fn.add([Function], () => "function");
    fn.add([Array], () => "array");
    fn.add([Date], () => "date");
    fn.add([RegExp], () => "regexp");
    fn.add([ANY_STR], () => "any");
    fn.add([Number, REST_STR], () => "rest");
    fn.add([[Number, String]], () => "union");
    fn.add([null], () => "null"); // 假设 null 是合法的类型占位符
    
    assert(true, "所有合法类型均成功添加");
} catch (e) {
    assert(false, `添加合法类型时抛出错误: ${e.message}`);
}

// 6. 重复重载校验
assertThrow(() => {
    const fn = overload();
    fn.add([Number], () => {});
    fn.add([Number], () => {});
}, "已存在此签名的重载", "校验重复重载");

// 7. Object vs null 匹配测试 (回归测试)
try {
    const fn = overload();
    fn.add([Object], () => "object");
    
    // 验证 Object 匹配 null (用户期望)
    try {
        const res = fn(null);
        assert(res === "object", "Object 类型应该匹配 null");
    } catch (e) {
        assert(false, `Object 类型应该匹配 null，但抛出了错误: ${e.message}`);
    }

    // 验证 Object 匹配 {}
    assert(fn({}) === "object", "Object 类型匹配 {}");
} catch (e) {
    assert(false, `Object vs null 测试出错: ${e.message}`);
}

log("\n--- 测试统计 ---");
log(`总计: ${stats.total}, 通过: ${stats.pass}, 失败: ${stats.fail}`);

if (stats.fail > 0) {
    process.exit(1);
}

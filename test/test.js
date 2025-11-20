import overload from "../dist/index.js";
import { ANY_STR, REST_STR } from "../src/constant.js";

// 测试框架工具
const container = document.getElementById('test-container');
const consoleOutput = document.getElementById('console-output');
const stats = { total: 0, pass: 0, fail: 0 };

function updateStats() {
    document.getElementById('total-count').textContent = stats.total;
    document.getElementById('pass-count').textContent = stats.pass;
    document.getElementById('fail-count').textContent = stats.fail;
}

function log(msg) {
    consoleOutput.textContent += msg + "\n";
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    console.log(msg);
}

function createGroup(title) {
    const div = document.createElement('div');
    div.className = 'test-group';
    div.innerHTML = `<h3>${title}</h3>`;
    container.appendChild(div);
    return div;
}

function assert(condition, name, groupEl) {
    stats.total++;
    const el = document.createElement('div');
    el.className = `test-case ${condition ? 'pass' : 'fail'}`;
    el.innerHTML = `
        <span class="test-name">${name}</span>
        <span class="test-result">${condition ? 'PASS' : 'FAIL'}</span>
    `;
    groupEl.appendChild(el);
    
    if (condition) {
        stats.pass++;
    } else {
        stats.fail++;
        log(`[FAIL] ${name}`);
    }
    updateStats();
}

function perfTest(name, fn, iterations = 100000, groupEl) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    const ops = Math.floor(iterations / ((end - start) / 1000)).toLocaleString();

    const el = document.createElement('div');
    el.className = 'test-case perf';
    el.innerHTML = `
        <span class="test-name">${name} (${iterations} ops)</span>
        <span class="test-result">${duration}ms | ${ops} ops/sec</span>
    `;
    groupEl.appendChild(el);
    log(`[PERF] ${name}: ${duration}ms`);
}

async function runTests() {
    log("开始运行测试...");

    // --- 功能测试 ---
    const funcGroup = createGroup("功能测试 (Functional Tests)");

    // 1. 基础类型重载
    const fnBasic = overload()
        .add([Number], (n) => `Number: ${n}`)
        .add([String], (s) => `String: ${s}`)
        .add([Boolean], (b) => `Boolean: ${b}`);

    assert(fnBasic(123) === "Number: 123", "基础类型 - Number", funcGroup);
    assert(fnBasic("abc") === "String: abc", "基础类型 - String", funcGroup);
    assert(fnBasic(true) === "Boolean: true", "基础类型 - Boolean", funcGroup);

    // 2. 参数个数重载
    const fnCount = overload()
        .add([], () => "0 args")
        .add([Number], (n) => "1 arg")
        .add([Number, Number], (a, b) => "2 args");

    assert(fnCount() === "0 args", "参数个数 - 0个", funcGroup);
    assert(fnCount(1) === "1 arg", "参数个数 - 1个", funcGroup);
    assert(fnCount(1, 2) === "2 args", "参数个数 - 2个", funcGroup);

    // 3. Object vs Function 区分 (验证之前的修复)
    const fnObjFunc = overload()
        .add([Object], (o) => "Object")
        .add([Function], (f) => "Function");

    assert(fnObjFunc({}) === "Object", "类型区分 - {} 匹配 Object", funcGroup);
    assert(fnObjFunc(() => {}) === "Function", "类型区分 - () => {} 匹配 Function", funcGroup);
    // 验证 Function 不会错误匹配到 Object
    assert(fnObjFunc(function(){}) === "Function", "类型区分 - function(){} 匹配 Function", funcGroup);
    
    // 4. Null 匹配 Object (验证之前的需求)
    const fnNull = overload()
        .add([Object], () => "Object matched");
    assert(fnNull(null) === "Object matched", "特殊类型 - null 匹配 Object", funcGroup);
    
    // 5. 任意类型与剩余参数
    const fnRest = overload()
        .add([String, REST_STR], (first, ...rest) => `${first}, ${rest.length} others`);
    
    assert(fnRest("a", 1, 2, 3) === "a, 3 others", "REST_STR - 剩余参数匹配", funcGroup);
    
    const fnAny = overload()
        .add([ANY_STR, Number], () => "Any + Number");
    assert(fnAny("text", 123) === "Any + Number", "ANY_STR - 匹配 String", funcGroup);
    assert(fnAny({}, 123) === "Any + Number", "ANY_STR - 匹配 Object", funcGroup);

    // 6. 自定义类匹配
    class User {}
    class Admin extends User {}
    const fnClass = overload()
        .add([Admin], () => "Admin")
        .add([User], () => "User"); // 父类在后

    assert(fnClass(new Admin()) === "Admin", "类继承 - 精确匹配子类", funcGroup);
    assert(fnClass(new User()) === "User", "类继承 - 匹配父类", funcGroup);

    // 7. 数组类型 (Union Type)
    const fnUnion = overload()
        .add([[String, Number]], (val) => `Union: ${typeof val}`);
    assert(fnUnion(123) === "Union: number", "联合类型 - Number", funcGroup);
    assert(fnUnion("abc") === "Union: string", "联合类型 - String", funcGroup);

    // 8. 参数转换副作用测试 (验证之前的修复)
    const ConvertType = {
        [Symbol.hasInstance]: () => false, // 永远不直接匹配
        [Symbol.for("TYPE_CONVERT")]: (val) => Number(val) // 尝试转换
    };
    
    const fnSideEffect = overload()
        .add([ConvertType, String], (n, s) => "Match 1") // 第一个参数尝试转换，但第二个参数不匹配
        .add([String, String], (s1, s2) => "Match 2");   // 应该匹配这个

    // 如果副作用没修复，传入 "123", "abc" 时：
    // 1. 尝试 Match 1: "123" 转为 123 (Number)。第二个参数 "abc" (String) 匹配。
    //    等等，上面的例子不太好，因为 ConvertType 转换后是 Number，如果第二个参数不匹配，
    //    我们需要确保 params[0] 还是 "123" 而不是 123。
    
    const fnSideEffect2 = overload()
        .add([ConvertType, Number], (n, num) => "Should not match") // 转换成功，但第二个参数 String != Number，匹配失败
        .add([String, String], (s1, s2) => `Recovered: ${typeof s1}`); // 应该走到这里，且 s1 仍为 String

    try {
        const res = fnSideEffect2("123", "abc");
        assert(res === "Recovered: string", "副作用 - 参数转换不应污染后续重载匹配", funcGroup);
    } catch (e) {
        assert(false, `副作用测试抛出异常: ${e.message}`, funcGroup);
    }


    // --- 错误处理测试 ---
    const errGroup = createGroup("错误处理 (Error Handling)");
    
    const fnErr = overload().add([String], () => {});
    try {
        fnErr(123);
        assert(false, "错误捕获 - 应该抛出错误", errGroup);
    } catch (e) {
        assert(e.message.includes("预期 String 但得到 Number"), "错误捕获 - 错误信息正确", errGroup);
    }


    // --- 性能测试 ---
    const perfGroup = createGroup("性能测试 (Performance Tests)");
    
    // 基准：原生函数
    function nativeAdd(a, b) { return a + b; }
    
    // 重载函数：简单
    const overloadAdd = overload()
        .add([Number, Number], (a, b) => a + b);

    // 重载函数：复杂 (多个重载)
    const overloadComplex = overload()
        .add([String], s => s)
        .add([Boolean], b => b)
        .add([Number, Number], (a, b) => a + b);

    perfTest("原生函数调用 (Native)", () => {
        nativeAdd(1, 2);
    }, 1000000, perfGroup);

    perfTest("重载函数调用 (Simple)", () => {
        overloadAdd(1, 2);
    }, 1000000, perfGroup);

    perfTest("重载函数调用 (Complex - Last Match)", () => {
        overloadComplex(1, 2);
    }, 1000000, perfGroup);

    perfTest("重载创建 (Create Overload)", () => {
        overload().add([Number], () => {});
    }, 10000, perfGroup);

    log("测试完成。");
}

// 延迟一点执行以确保 DOM 渲染
setTimeout(runTests, 100);

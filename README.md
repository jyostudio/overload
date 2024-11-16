# @jyostudio/overload

使 JavaScript 函数拥有一定的重载能力。

## 引用

浏览器

```HTML
<script type="importmap">
  {
    "imports": {
      "@jyostudio/overload": "https://unpkg.com/@jyostudio/overload"
    }
  }
</script>
```

Node.js

```bash
npm install @jyostudio/overload
```

根据环境引用后，用法完全一致，不需要在使用时区分引用地址和方式。

## 用法

下列代码演示了只允许空参数调用的函数。

```javascript
import overload from "@jyostudio/overload";

const fn = overload([], function () {
  console.log("只允许空参数调用。");
});

fn(); // 只允许空参数调用

// Error: The function "(anonymous)" does not have an overload that takes 1 arguments.
fn(123);
```

下面代码演示了如何搭配参数数量和类型进行调用。

```javascript
import overload from "@jyostudio/overload";

const fn = overload()
  .add([], function () {
    console.log("空参数调用");
  })
  .add([String], function (str) {
    console.log("字符串调用");
  })
  .add([Number], function (num) {
    console.log("数字调用");
  })
  .add([String, Number], function () {
    console.log("字符串 + 数字调用");
  });

fn(); // 空参数调用
fn("abc"); // 字符串调用
fn(123); // 数字调用
fn("abc", 123); // 字符串 + 数字调用

// Error calling function "(anonymous)"
// Argument 1: Cannot convert from "Boolean" to "String".
fn(true);

// Error calling function "(anonymous)"
// Argument 1: Cannot convert from "Number" to "String".
// Argument 2: Cannot convert from "String" to "Number".
fn(123, "abc");

// Error: The function "(anonymous)" does not have an overload that takes 3 arguments.
fn("abc", 123, true);
```

当我们想有一个兜底函数时，可以这样做

```javascript
import overload from "@jyostudio/overload";

const fn = overload()
  .add([], function () {
    console.log("空参数调用");
  })
  .any(function (...params) {
    console.log(params.length);
  });

fn(); // 空参数调用
fn(123, "abc"); // 2
```

如果我们有自定义类型

```javascript
import overload from "@jyostudio/overload";

class A {}
class B {}

const fn = overload()
  .add([A], function (a) {
    console.log("用 A 调用");
  })
  .add([B], function (b) {
    console.log("用 B 调用");
  })
  .add([A, B], function (a, b) {
    console.log("用 A + B 调用");
  });

fn(new A()); // 用 A 调用
fn(new B()); // 用 B 调用
fn(new A(), new B()); // 用 A + B 调用

// Error: Error calling function "(anonymous)"
// Argument 1: Cannot convert from "B" to "A".
// Argument 2: Cannot convert from "A" to "B".
fn(new B(), new A());
```

不定类型

```javascript
import overload from "@jyostudio/overload";

const fn = overload().add(["*", String], function (any, str) {
  console.log("用任意类型 + 字符串调用");
});

fn(1, "abc"); // 用任意类型 + 字符串调用
fn(true, "abc"); // 用任意类型 + 字符串调用

// Error: Error calling function "(anonymous)"
// Argument 2: Cannot convert from "Number" to "String".
fn(1, 1);
```

多类型、允许参数为 null

```javascript
import overload from "@jyostudio/overload";

const fn = overload().add(
  [
    [String, Number],
    [Boolean, null],
    ["*", null],
  ],
  function (strOrNum, boolOrNull, anyOrNull) {
    console.log(
      `字符串还是数字？${typeof strOrNum}\n布尔值还是Null？${
        boolOrNull === null ? "null" : typeof boolOrNull
      }\n什么类型？${anyOrNull === null ? "null" : typeof anyOrNull}`
    );
  }
);

fn("abc", true, 1); // string, boolean, number
fn(1, false, "abc"); // number, boolean, string
fn("abc", null, 1); // string, null, number
fn("abc", null, null); // string, null, null

// Error: Error calling function "(anonymous)"
// Argument 1: Cannot convert from "Boolean" to "String、Number".
// Argument 2: Cannot convert from "Number" to "Boolean、null".
fn(true, 1, null);
```

不定参数

```javascript
import overload from "@jyostudio/overload";

const fn = overload().add([String, "..."], function (str, ...params) {
  console.log(str, params);
});

fn("abc", 1, 2, 3, 4, 5, 6, 7); // "abc", [ 1, 2, 3, 4, 5, 6, 7 ]
fn("abc", "bcd", 1, 2); // "abc", [ "bcd", 1, 2 ]


// SyntaxError: Rest parameter must be last formal parameter
const errFn = overload().add([String, "...", "*"], function (str, ...params, any) {});

// SyntaxError: A "..." parameter must be the last parameter in a formal parameter list.
const errFn1 = overload().add([String, "...", "*"], function (str, params, any) {});
```

在类中使用

```javascript
import overload from "@jyostudio/overload";

class A {
  /**
   * 类初始化时直接创建重载
   * 避免使用，如果用非浏览器内置类型可能会出现未定义
   */
  fn = overload().add([], function () {});

  /**
   * 当前脚本解析时立刻创建重载
   * 避免使用，如果用非浏览器内置类型极大概率会出现未定义
   */
  static staticFn = overload().add([], function () {});

  /**
   * 在执行时才创建重载并替换原函数，避免多次重建
   * 这种用法可以在在创建重载前后做一些事情
   * 且不会出现 import 外部类/对象未定义的情况
   */
  fn1(...params) {
    A.prototype.fn1 = overload().add([], function () {});

    return A.prototype.fn1.apply(this, params);
  }

  /**
   * 静态函数定义，作用同上
   */
  static staticFn1(...params) {
    A.staticFn1 = overload().add([], function () {});

    return A.staticFn1.apply(this, params);
  }
}
```

集合类型唯一  
详情请看[这里](https://www.npmjs.com/package/@jyostudio/list)

## 许可证

MIT License

Copyright (c) 2024 nivk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

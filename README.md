# @jyostudio/overload

专为鸿蒙适配

简化 TypeScript 函数重载方式，并使运行时拥有类型检查能力。

## 引用

```bash
ohpm install @jyostudio/overload
```

## 用法

下列代码演示了只允许空参数调用的函数。

```typescript
import overload from "@jyostudio/overload";

const fn = overload([], () => {
  console.log("只允许空参数调用。");
});

fn(); // 只允许空参数调用

// Error: The function "(anonymous)" does not have an overload that takes 1 arguments.
fn(123);
```

下面代码演示了如何搭配参数数量和类型进行调用。

```typescript
import overload from "@jyostudio/overload";

const fn = overload()
  .add([], () => {
    console.log("空参数调用");
  })
  .add([String], (str: string) => {
    console.log("字符串调用");
  })
  .add([Number], (num: number) => {
    console.log("数字调用");
  })
  .add([String, Number], (str: string, num: number) => {
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

```typescript
import overload from "@jyostudio/overload";

const fn = overload()
  .add([], () => {
    console.log("空参数调用");
  })
  .any((...params: ESObject[]) => {
    console.log(params.length);
  });

fn(); // 空参数调用
fn(123, "abc"); // 2
```

如果我们有自定义类型

```typescript
import overload from "@jyostudio/overload";

class A {}
class B {}

const fn = overload()
  .add([A], (a: A) => {
    console.log("用 A 调用");
  })
  .add([B], (b: B) => {
    console.log("用 B 调用");
  })
  .add([A, B], (a: A, b: B) => {
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

```typescript
import overload from "@jyostudio/overload";

const fn = overload(["*", String], (any: ESObject, str: string) => {
  console.log("用任意类型 + 字符串调用");
});

fn(1, "abc"); // 用任意类型 + 字符串调用
fn(true, "abc"); // 用任意类型 + 字符串调用

// Error: Error calling function "(anonymous)"
// Argument 2: Cannot convert from "Number" to "String".
fn(1, 1);
```

多类型、允许参数为 null

```typescript
import overload from "@jyostudio/overload";

const fn = overload(
  [
    [String, Number],
    [Boolean, null],
    ["*", null],
  ],
  (strOrNum: string | number, boolOrNull: boolean | null, anyOrNull: ESObject | null) => {
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

```typescript
import overload from "@jyostudio/overload";

const fn = overload([String, "..."], (str: string, ...params: ESObject[]) => {
  console.log(str, params);
});

fn("abc", 1, 2, 3, 4, 5, 6, 7); // "abc", [ 1, 2, 3, 4, 5, 6, 7 ]
fn("abc", "bcd", 1, 2); // "abc", [ "bcd", 1, 2 ]


// SyntaxError: Rest parameter must be last formal parameter
const errFn = overload([String, "...", "*"], (str: string, ...params: ESObject[]) => {});

// SyntaxError: A "..." parameter must be the last parameter in a formal parameter list.
const errFn1 = overload([String, "...", "*"], (str: string, params: ESObject[], any: ESObject) => {});
```

在类中使用

```typescript
import overload from "@jyostudio/overload";

class A {
  /**
   * 多个重载的签名
   */
  public test();
  public test(str: string);
  // TS 实现重载的函数
  public test(...params: ESObject[]): ESObject { return this._test(...params); }
  // 实际执行的重载函数
  private _test = overload
                 .add([], () => { console.log("空参数调用"); })
                 .add([String], (str: string) => { console.log("用字符串调用"); });

  // 静态重载用法同上
}
```

自动调用类型转换函数

```typescript
import overload from "@jyostudio/overload";

class A {}
class B {}
const fn = overload([A], (a: A) => {});
/**
 * 在正常情况下，应当抛出：
 * Argument 1: Cannot convert from "B" to "A".
 */
fn(new B());
```

```typescript
import overload from "@jyostudio/overload";

class A {
  bbb: number;
  constructor(bbb: number) {
    this.bbb = bbb;
  }

  // 定义一个静态的类型转换函数
  static ["⇄"] = overload([B], (b: B) => {
    /**
     * 返回 A 的实例对象
     * 注意，返回其他类型都将继续触发错误：
     * Argument 1: Cannot convert from "B" to "A".
     */
    return new A(b.aaa);
  });
}

class B {
  aaa = 123;
}

const fn = overload([A], (a: A) => {
  console.dir(a);
  console.dir(a.bbb);
});

/**
 * 输出：
 * 1、类型为 A 的实例对象
 * 2、123
 */
fn(new B());
```

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

# @jyostudio/overload
使 JavaScript 函数拥有一定的重载能力。  
``` bash
npm install @jyostudio/overload
```
## 用法
下列代码演示了只允许空参数调用的函数。
``` javascript
import overload from "@jyostudio/overload";
const fn = overload([], function() {
  console.log("只允许空参数调用。");
});

fn(); // 只允许空参数调用

// throw: Error: The function "(anonymous)" does not have an overload that takes 1 arguments.
fn(123);
```
下面代码演示了如何搭配参数数量和类型进行调用。
``` javascript
import overload from "@jyostudio/overload";
const fn = overload()
  .add([], function() {
    console.log("空参数调用");
  })
  .add([String], function(str) {
    console.log("字符串调用");
  })
  .add([Number], function(num) {
    console.log("数字调用");
  })
  .add([String, Number], function () {
    console.log("字符串 + 数字调用");
  });

fn(); // 空参数调用
fn("abc"); // 字符串调用
fn(123); // 数字调用
fn("abc", 123); // 字符串 + 数字调用

// throw: Error calling function "(anonymous)"
// Argument 1: Cannot convert from "Boolean" to "String".
fn(true);

// throw: Error calling function "(anonymous)"
// Argument 1: Cannot convert from "Number" to "String".
// Argument 2: Cannot convert from "String" to "Number".
fn(123, "abc");

// throw: Error: The function "(anonymous)" does not have an overload that takes 3 arguments.
fn("abc", 123, true);
```
当我们想有一个兜底函数时，可以这样做
``` javascript
import overload from "@jyostudio/overload";
const fn = overload()
  .add([], function() {
    console.log("空参数调用");
  })
  .any(function(...params) {
    console.log(params.length);
  });

fn(); // 空参数调用
fn(123, "abc"); // 2
```
如果我们有自定义类型
``` javascript
import overload from "@jyostudio/overload";
class A {}
class B {}
const fn = overload()
  .add([A], function(a) {
    console.log("用 A 调用");
  })
  .add([B], function(b) {
    console.log("用 B 调用");
  })
  .add([A, B], function(a, b) {
    console.log("用 A + B 调用");
  });

fn(new A()); // 用 A 调用
fn(new B()); // 用 B 调用
fn(new A(), new B()); // 用 A + B 调用

// throw: Error: Error calling function "(anonymous)"
// Argument 1: Cannot convert from "B" to "A".
// Argument 2: Cannot convert from "A" to "B".
fn(new B(), new A());
```
不定类型
``` javascript
import overload from "@jyostudio/overload";
const fn = overload()
  .add(["*", String], function(any, str) {
    console.log("用任意类型 + 字符串调用");
  });

fn(1, "abc"); // 用任意类型 + 字符串调用
fn(true, "abc"); // 用任意类型 + 字符串调用

// Error: Error calling function "(anonymous)"
// Argument 2: Cannot convert from "Number" to "String".
fn(1, 1);
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

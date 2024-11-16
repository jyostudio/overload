import overload from "../dist/index.js";


const fn = overload([], function () {
    console.log("只允许空参数调用。");
  });
  
  fn(); // 只允许空参数调用
  
  // Error: The function "(anonymous)" does not have an overload that takes 1 arguments.
  fn(123);
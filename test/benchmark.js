import overload from "../dist/index.js";

const ITERATIONS = 1_000_000;
const WARMUP_ITERATIONS = 100_000;

function runBenchmark(name, fn, iterations = ITERATIONS) {
    // 预热
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        fn();
    }

    // 强制 GC (如果可能，但在 JS 中很难手动控制，只能尽量减少干扰)
    if (global.gc) {
        global.gc();
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = performance.now();
    
    const totalTime = end - start;
    const opsPerSec = (iterations / totalTime) * 1000;
    const timePerOp = (totalTime / iterations) * 1_000_000; // ns

    console.log(`[${name.padEnd(35)}] Total: ${totalTime.toFixed(2)}ms | Ops/sec: ${Math.floor(opsPerSec).toLocaleString().padEnd(12)} | Time/op: ${timePerOp.toFixed(2)}ns`);
}

console.log(`\nStarting Benchmark (Iterations: ${ITERATIONS.toLocaleString()})...\n`);
console.log("-".repeat(80));

// --- 1. Native Baseline ---
function nativeAdd(a, b) { return a + b; }
runBenchmark("Native Function (a + b)", () => nativeAdd(1, 2));

// --- 2. Simple Overload (Fast Path) ---
const simpleOverload = overload()
    .add([Number, Number], (a, b) => a + b);

runBenchmark("Overload: Simple (Number, Number)", () => simpleOverload(1, 2));

// --- 3. Complex Overload (Last Match) ---
const complexOverload = overload()
    .add([String], s => s)
    .add([Boolean], b => b)
    .add([Array], a => a)
    .add([Function], f => f)
    .add([Number, Number, Number], (a, b, c) => a + b + c);

runBenchmark("Overload: Complex (Last Match 5th)", () => complexOverload(1, 2, 3));

// --- 4. Object Overload (Slow Path) ---
// Object 无法走 typeof === 'number' 这种极速路径，但我们优化了 typeof === 'object'
const objectOverload = overload()
    .add([Object], o => o.val);
const testObj = { val: 1 };

runBenchmark("Overload: Object (Optimized Path)", () => objectOverload(testObj));

// --- 5. Custom Class (Real Slow Path) ---
class User {}
const userOverload = overload()
    .add([User], u => u);
const user = new User();

runBenchmark("Overload: Custom Class (Slow Path)", () => userOverload(user));

// --- 6. Creation Cost ---
// 降低迭代次数，因为创建比较慢
runBenchmark("Creation: overload()", () => {
    overload().add([Number], () => {});
}, 100_000);

console.log("-".repeat(80));
console.log("Benchmark finished.\n");

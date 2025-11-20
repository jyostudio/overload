import overload from "../dist/index.js";

const ITERATIONS = 1_000_000;
const WARMUP_ITERATIONS = 100_000;

function getMemoryUsage() {
    const used = process.memoryUsage();
    return {
        heapUsed: used.heapUsed,
        external: used.external,
        rss: used.rss
    };
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function runMemoryBenchmark(name, fn, iterations = ITERATIONS) {
    // 预热
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        fn();
    }

    // 强制 GC (如果启用)
    if (global.gc) {
        global.gc();
    }

    const startMem = getMemoryUsage();
    const start = performance.now();

    // 记录过程中的最大内存波动
    let maxHeapDiff = 0;
    
    for (let i = 0; i < iterations; i++) {
        fn();
        // 每 10000 次采样一次，避免采样本身影响性能
        if (i % 10000 === 0) {
            const currentMem = process.memoryUsage().heapUsed;
            const diff = currentMem - startMem.heapUsed;
            if (diff > maxHeapDiff) maxHeapDiff = diff;
        }
    }

    const end = performance.now();
    const endMem = getMemoryUsage();

    // 强制 GC 后再次检查，看是否有内存泄漏
    if (global.gc) {
        global.gc();
    }
    const finalMem = getMemoryUsage();

    const heapDiff = endMem.heapUsed - startMem.heapUsed;
    const leakCheck = finalMem.heapUsed - startMem.heapUsed;
    
    console.log(`[${name.padEnd(35)}]`);
    console.log(`  Heap Delta (Start -> End): ${formatBytes(heapDiff).padStart(10)} ${heapDiff > 0 ? '(Growth)' : '(Shrink)'}`);
    console.log(`  Max Heap Surge (Peak):     ${formatBytes(maxHeapDiff).padStart(10)}`);
    console.log(`  Leak Check (After GC):     ${formatBytes(leakCheck).padStart(10)}`);
    console.log(`  Time: ${(end - start).toFixed(2)}ms`);
    console.log("-".repeat(60));
}

console.log(`\nStarting Memory Benchmark (Iterations: ${ITERATIONS.toLocaleString()})...\n`);
console.log("Note: Run with 'node --expose-gc test/memory_benchmark.js' for best results.\n");
console.log("-".repeat(60));

// --- 1. Native Baseline ---
function nativeAdd(a, b) { return a + b; }
runMemoryBenchmark("Native Function (a + b)", () => nativeAdd(1, 2));

// --- 2. Simple Overload (Fast Path) ---
const simpleOverload = overload()
    .add([Number, Number], (a, b) => a + b);

runMemoryBenchmark("Overload: Simple (Number, Number)", () => simpleOverload(1, 2));

// --- 3. Complex Overload (Last Match) ---
const complexOverload = overload()
    .add([String], s => s)
    .add([Boolean], b => b)
    .add([Array], a => a)
    .add([Function], f => f)
    .add([Number, Number, Number], (a, b, c) => a + b + c);

runMemoryBenchmark("Overload: Complex (Last Match 5th)", () => complexOverload(1, 2, 3));

// --- 4. Object Overload (Optimized Path) ---
const objectOverload = overload()
    .add([Object], o => o.val);
const testObj = { val: 1 };

runMemoryBenchmark("Overload: Object (Optimized Path)", () => objectOverload(testObj));

// --- 5. Creation Cost (Memory) ---
// 减少迭代次数，因为创建对象肯定会消耗内存
runMemoryBenchmark("Creation: overload() (100k ops)", () => {
    overload().add([Number], () => {});
}, 100_000);

console.log("Memory Benchmark finished.\n");

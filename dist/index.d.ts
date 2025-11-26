/**
 * 映射构造函数/类型到实际参数类型
 */
type MapRuntimeType<T> =
  T extends NumberConstructor ? number :
  T extends StringConstructor ? string :
  T extends BooleanConstructor ? boolean :
  T extends SymbolConstructor ? symbol :
  T extends BigIntConstructor ? bigint :
  T extends ArrayConstructor ? any[] :
  T extends FunctionConstructor ? Function :
  T extends ObjectConstructor ? object :
  T extends null ? null :
  T extends undefined ? undefined :
  T extends "*" ? any :
  T extends "..." ? any[] :
  T extends readonly (infer U)[] ? MapRuntimeType<U> :
  T extends new (...args: any[]) => infer R ? R :
  T extends object ? any :
  T;

/**
 * 映射参数类型数组到参数元组
 */
type MapArgs<T extends readonly any[]> =
  T extends readonly [infer Head, ...infer Tail]
    ? Head extends "..."
      ? any[]
      : [MapRuntimeType<Head>, ...MapArgs<Tail>]
    : [];

/**
 * 将元组类型转换为交叉类型
 */
type TupleToIntersection<T extends any[]> = 
  T extends [infer Head, ...infer Tail]
    ? Head & TupleToIntersection<Tail>
    : unknown;

/**
 * 重载构建器
 * Sigs 为当前累积的签名数组
 */
type OverloadBuilder<Sigs extends any[] = []> =
  TupleToIntersection<Sigs> & {
    /**
     * 添加一个重载签名
     * @param types 参数类型定义数组
     * @param fn 实现函数
     */
    add<const T extends readonly any[], R>(
      types: readonly [...T],
      fn: (...args: MapArgs<T>) => R
    ): OverloadBuilder<[(...args: MapArgs<T>) => R, ...Sigs]>;

    /**
     * 添加兜底函数
     * @param fn 兜底函数
     */
    any<R>(fn: (...args: any[]) => R): OverloadBuilder<[...Sigs, (...args: any[]) => R]>;
  };

/**
 * 创建一个重载构建器（无默认签名）
 */
export default function overload(): OverloadBuilder<[]>;

/**
 * 创建一个带默认签名的重载构建器
 */
export default function overload<T extends readonly any[], R>(
  defaultTypes: readonly [...T],
  defaultFn: (...args: MapArgs<T>) => R
): OverloadBuilder<[(...args: MapArgs<T>) => R]>;

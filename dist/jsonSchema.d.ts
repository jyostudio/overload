/**
 * JSONSchema 类的基础定义
 */
declare class JSONSchemaBase<T extends Record<string, any> = Record<string, any>> {
    /**
     * 创建一个新的 JSONSchema
     * @param def - JSONSchema 的定义对象
     * @example
     * ```typescript
     * const schema = new JSONSchema({
     *   type: "object",
     *   properties: {
     *     name: { type: "string" },
     *     age: { type: "number" }
     *    },
     *    required: ["name", "age"]
     *  });
     * ```
     * @see {@link https://json-schema.org/|JSON Schema 文档}
     */
    constructor(def: T);
}

/**
 * JSONSchema 类型，通过交叉类型支持动态属性访问
 */
type JSONSchema<T extends Record<string, any> = Record<string, any>> = JSONSchemaBase<T> & {
    readonly [K in keyof T]: T[K];
};

/**
 * JSONSchema 构造函数
 */
declare const JSONSchema: {
    new <T extends Record<string, any>>(def: T): JSONSchema<T>;
};

export default JSONSchema;
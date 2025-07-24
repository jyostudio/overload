/**
 * JSONSchema 类
 */
export default class JSONSchema {
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
    constructor(def: object);
}
import Ajv from "ajv";
import { INNER_TYPE_FN, INNER_THROW_FN } from "./constant.js";
import localize from "ajv-i18n/localize/zh";

/**
 * 全错误校验器：用于生成完整的错误信息。
 */
const ajv = new Ajv({ allErrors: true });

/**
 * 快速校验器：只返回布尔结果，用于类型匹配的热路径。
 */
const ajvFast = new Ajv({ allErrors: false });

export default class JSONSchema {
    #validateFast;
    #validateFull;

    constructor(...params) {
        if (params.length !== 1) {
            throw new Error("只能传入一个对象。");
        }

        if (typeof params[0] !== "object") {
            throw new TypeError("参数必须是对象。");
        }

        this.#validateFast = ajvFast.compile(params[0]);
        this.#validateFull = ajv.compile(params[0]);
    }

    [INNER_TYPE_FN](obj) {
        return !!this.#validateFast(obj);
    }

    [INNER_THROW_FN](obj) {
        if (!this.#validateFull(obj)) {
            localize(this.#validateFull.errors);
            return "JSON Schema 校验错误：\n" + JSON.stringify(this.#validateFull.errors, null, 2);
        }
        return "";
    }
}

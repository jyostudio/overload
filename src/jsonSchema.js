import Ajv from "ajv";
import { INNER_TYPE_FN, INNER_THROW_FN } from "./constant.js";
const localize = require("ajv-i18n/localize/zh");

const ajv = new Ajv({ allErrors: true });

export default class JSONSchema {
    #validate;

    constructor(...params) {
        if (params.length !== 1) {
            throw new Error("只能传入一个对象。");
        }

        if (typeof params[0] !== "object") {
            throw new TypeError("参数必须是对象。");
        }

        this.#validate = ajv.compile(params[0]);
    }

    [INNER_TYPE_FN](obj) {
        return !!this.#validate(obj);
    }

    [INNER_THROW_FN](obj) {
        if (!this.#validate(obj)) {
            localize(this.#validate.errors);
            return "JSON Schema 校验错误：\n" + JSON.stringify(this.#validate.errors, null, 2);
        }
        return "";
    }
}
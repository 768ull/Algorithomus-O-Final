(function(M) {
    "use strict";
    var MAX_TOKENS = 200;
    var state = {
        expr: "",
        entry: "0",
        fresh: true,
        error: false,
        result: false,
        lastExpression: "",
        repeat: null,
        errorCode: null
    };
    function tokenize(source) {
        var tokens = [];
        var index = 0;
        if (source.length > 2e3) throw new Error("conta longa demais");
        while (index < source.length) {
            var char = source[index];
            if (char === " ") {
                index++;
                continue;
            }
            if ("+-*/()".indexOf(char) >= 0) {
                tokens.push({
                    type: char
                });
                index++;
                continue;
            }
            if (char >= "0" && char <= "9" || char === ".") {
                var match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
                if (!match) throw new Error("número inválido");
                index += match[0].length;
                if (source[index] === "." || /[eE]/.test(source[index] || "")) throw new Error("número inválido");
                var number = Number(match[0]);
                if (!isFinite(number)) throw new Error("número inválido");
                tokens.push({
                    type: "number",
                    value: number
                });
                continue;
            }
            throw new Error("símbolo desconhecido");
        }
        if (tokens.length > MAX_TOKENS) throw new Error("conta longa demais");
        return tokens;
    }
    function evaluate(source) {
        var tokens = tokenize(source);
        var position = 0;
        function peek() {
            return tokens[position];
        }
        function factor() {
            if (peek() && peek().type === "-") {
                position++;
                return -factor();
            }
            if (peek() && peek().type === "+") {
                position++;
                return factor();
            }
            return primary();
        }
        function primary() {
            var token = peek();
            if (!token) throw new Error("conta incompleta");
            if (token.type === "number") {
                position++;
                return token.value;
            }
            if (token.type === "(") {
                position++;
                var value = expression();
                if (!peek() || peek().type !== ")") throw new Error("falta o parêntese");
                position++;
                return value;
            }
            throw new Error("conta incompleta");
        }
        function term() {
            var value = factor();
            while (peek() && (peek().type === "*" || peek().type === "/")) {
                var operator = tokens[position++].type;
                var right = factor();
                if (operator === "/") {
                    if (right === 0) {
                        var error = new Error("divisão por zero");
                        error.code = "division-by-zero";
                        throw error;
                    }
                    value = value / right;
                } else {
                    value = value * right;
                }
            }
            return value;
        }
        function expression() {
            var value = term();
            while (peek() && (peek().type === "+" || peek().type === "-")) {
                var operator = tokens[position++].type;
                var right = term();
                value = operator === "+" ? value + right : value - right;
            }
            return value;
        }
        var result = expression();
        if (position < tokens.length) throw new Error("conta inválida");
        if (!isFinite(result)) throw new Error("resultado indefinido");
        return parseFloat(result.toPrecision(12));
    }
    function format(value) {
        var text = String(value);
        if (text.length > 14 && text.indexOf("e") < 0) text = parseFloat(value.toPrecision(12)).toString();
        return text;
    }
    var SYMBOL = {
        "+": "+",
        "-": "−",
        "*": "×",
        "/": "÷"
    };
    function operand(entry) {
        return entry.charAt(0) === "-" ? "(" + entry + ")" : entry;
    }
    M.calc = {
        state,
        evaluate,
        value: function() {
            return state.entry;
        },
        expression: function() {
            return state.expr;
        },
        hasError: function() {
            return state.error;
        },
        digit: function(digit) {
            if (!/^[0-9.]$/.test(digit)) return;
            if (state.error) M.calc.clear();
            if (state.result) M.calc.clear();
            if (/e/i.test(state.entry)) state.fresh = true;
            if (state.fresh) {
                state.entry = digit === "." ? "0." : digit;
                state.fresh = false;
                return;
            }
            if (digit === "." && state.entry.indexOf(".") >= 0) return;
            if (state.entry.replace(".", "").replace("-", "").length >= 12) return;
            if (state.entry === "0") state.entry = digit === "." ? "0." : digit; else if (state.entry === "-0") state.entry = digit === "." ? "-0." : "-" + digit; else state.entry += digit;
        },
        operator: function(operator) {
            if (state.error || !/^[+*/-]$/.test(operator)) return;
            if (state.expr && state.fresh) {
                state.expr = state.expr.slice(0, -1) + operator;
            } else {
                state.expr += state.entry;
                state.expr += operator;
            }
            state.fresh = true;
            state.result = false;
            state.lastExpression = "";
            state.repeat = null;
        },
        equals: function() {
            if (state.error) return null;
            if (state.expr && state.fresh) return null;
            var source = state.expr + state.entry;
            if (state.result && state.repeat) {
                source = operand(state.entry) + state.repeat.operator + operand(state.repeat.entry);
            }
            try {
                var result = evaluate(source);
                if (state.expr) {
                    state.repeat = {
                        operator: state.expr.slice(-1),
                        entry: state.entry
                    };
                }
                state.lastExpression = source;
                state.expr = "";
                state.entry = format(result);
                state.fresh = true;
                state.result = true;
                return result;
            } catch (error) {
                state.error = true;
                state.errorCode = error.code || null;
                state.entry = error.message;
                return null;
            }
        },
        negate: function() {
            if (state.error) return;
            if (state.expr && state.fresh) state.entry = "0";
            if (state.entry.charAt(0) === "-") state.entry = state.entry.slice(1); else state.entry = "-" + state.entry;
            state.fresh = false;
            state.result = false;
            state.lastExpression = "";
            state.repeat = null;
        },
        backspace: function() {
            if (state.error) return M.calc.clear();
            if (state.result) return M.calc.clear();
            if (state.fresh) {
                if (state.expr) {
                    var source = state.expr.slice(0, -1);
                    var grouped = source.match(/\((-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\)$/i);
                    if (grouped) {
                        state.entry = grouped[1];
                        state.expr = source.slice(0, -grouped[0].length);
                        state.fresh = false;
                        return;
                    }
                    var match = source.match(/(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)$/i);
                    if (match) {
                        var start = source.length - match[0].length;
                        if (match[0][0] === "-" && start > 0 && /[\d)]/.test(source[start - 1])) start++;
                        state.entry = source.slice(start);
                        state.expr = source.slice(0, start);
                        state.fresh = false;
                    }
                }
                return;
            }
            if (/e/i.test(state.entry)) {
                state.entry = "0";
                return;
            }
            state.entry = state.entry.slice(0, -1);
            if (state.entry === "" || state.entry === "-") state.entry = "0";
        },
        clear: function() {
            state.expr = "";
            state.entry = "0";
            state.fresh = true;
            state.error = false;
            state.errorCode = null;
            state.result = false;
            state.lastExpression = "";
            state.repeat = null;
        },
        pretty: function() {
            var source = state.lastExpression ? state.lastExpression + "=" : state.expr;
            return source.split("").map(function(char) {
                if (char === ".") return ",";
                return SYMBOL[char] || char;
            }).join("");
        }
    };
})(window.Cal = window.Cal || {});
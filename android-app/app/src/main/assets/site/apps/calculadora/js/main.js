(function(M) {
    "use strict";
    var LAYOUT = [ {
        label: "AC",
        name: "Limpar tudo",
        cls: "key--fn",
        action: "clear"
    }, {
        label: "+/−",
        name: "Trocar sinal",
        cls: "key--fn",
        action: "negate"
    }, {
        label: "⌫",
        name: "Apagar último dígito",
        cls: "key--fn",
        action: "backspace"
    }, {
        label: "÷",
        name: "Dividir",
        cls: "key--op",
        action: "operator",
        value: "/"
    }, {
        label: "7",
        action: "digit",
        value: "7"
    }, {
        label: "8",
        action: "digit",
        value: "8"
    }, {
        label: "9",
        action: "digit",
        value: "9"
    }, {
        label: "×",
        name: "Multiplicar",
        cls: "key--op",
        action: "operator",
        value: "*"
    }, {
        label: "4",
        action: "digit",
        value: "4"
    }, {
        label: "5",
        action: "digit",
        value: "5"
    }, {
        label: "6",
        action: "digit",
        value: "6"
    }, {
        label: "−",
        name: "Subtrair",
        cls: "key--op",
        action: "operator",
        value: "-"
    }, {
        label: "1",
        action: "digit",
        value: "1"
    }, {
        label: "2",
        action: "digit",
        value: "2"
    }, {
        label: "3",
        action: "digit",
        value: "3"
    }, {
        label: "+",
        name: "Somar",
        cls: "key--op",
        action: "operator",
        value: "+"
    }, {
        label: "0",
        cls: "key--zero",
        action: "digit",
        value: "0"
    }, {
        label: ",",
        name: "Separador decimal",
        action: "digit",
        value: "."
    }, {
        label: "=",
        name: "Calcular resultado",
        cls: "key--eq",
        action: "equals"
    } ];
    var valueEl = null;
    var exprEl = null;
    var subEl = null;
    var checkingCode = false;
    var codeEntry = "";
    var secretSequenceStarted = false;
    function press(action, value) {
        if (secretSequenceStarted) return;
        if (action === "digit") {
            var matchedSecret = false;
            if (/^[0-9]$/.test(value)) {
                if (codeEntry.length >= 4) codeEntry = "";
                codeEntry += value;
                if(codeEntry.length===4&&!checkingCode){checkingCode=true;fetch('/api/calculator-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:codeEntry})}).then(r=>r.ok?r.json():{ok:false}).then(result=>{if(result.ok){secretSequenceStarted=true;M.host.emit('secret-code-entered',null);}}).catch(()=>{}).finally(()=>{checkingCode=false;});}
            } else codeEntry = "";
            M.calc.digit(value);
            if (matchedSecret) M.host.emit("secret-code-entered", null);
        } else if (action === "operator") M.calc.operator(value); else if (action === "equals") {
            var hadError = M.calc.hasError();
            M.calc.equals();
            if (!hadError && M.calc.state.errorCode === "division-by-zero") {
                M.host.emit("division-by-zero", null);
            }
        } else if (action === "negate") M.calc.negate(); else if (action === "clear") {
            M.calc.clear();
            codeEntry = "";
        } else if (action === "backspace") {
            M.calc.backspace();
            codeEntry = codeEntry.slice(0, -1);
        }
    }
    function fitValue() {
        valueEl.style.fontSize = "";
        if (M.calc.hasError()) return;
        var availableWidth = valueEl.clientWidth;
        if (availableWidth <= 0) return;
        var contentWidth = valueEl.scrollWidth;
        if (contentWidth <= availableWidth) return;
        var size = parseFloat(window.getComputedStyle(valueEl).fontSize);
        if (!isFinite(size) || size <= 0) return;
        var ratio = Math.max(0.5, Math.min(1, (availableWidth - 2) / contentWidth));
        valueEl.style.fontSize = size * ratio * .98 + "px";
    }
    function draw() {
        var error = M.calc.hasError();
        var value = M.calc.value();
        valueEl.textContent = error ? value : value.replace(".", ",").replace(/^-/, "−");
        valueEl.classList.toggle("is-error", error);
        valueEl.classList.toggle("is-long", !error && value.length > 9);
        valueEl.classList.toggle("is-huge", !error && value.length > 13);
        fitValue();
        exprEl.textContent = M.calc.pretty() || " ";
        exprEl.title = exprEl.textContent;
        M.$$(".key--op").forEach(function(key) {
            var selected = !error && M.calc.state.fresh && M.calc.expression().slice(-1) === key.dataset.value;
            key.classList.toggle("is-selected", selected);
            key.setAttribute("aria-pressed", String(selected));
        });
        if (error) {
            subEl.textContent = value;
            subEl.classList.add("is-error");
        } else {
            subEl.classList.remove("is-error");
            subEl.textContent = M.calc.state.result ? "resultado" : M.calc.expression() ? "calculando" : "pronto";
        }
    }
    function pulse() {
        valueEl.classList.remove("is-fresh");
        void valueEl.offsetWidth;
        valueEl.classList.add("is-fresh");
    }
    function buildKeys(grid, layout) {
        layout.forEach(function(item) {
            var key = M.el("button", {
                className: "key " + (item.cls || ""),
                type: "button",
                text: item.label,
                on: {
                    click: function() {
                        press(item.action, item.value);
                        draw();
                        if (item.action === "equals" || item.action === "clear") pulse();
                    }
                }
            });
            key.setAttribute("aria-label", item.name || item.label);
            key.dataset.value = item.value || "";
            key.dataset.action = item.action;
            grid.appendChild(key);
        });
    }
    M.main = {
        init: function() {
            valueEl = M.$("#value");
            exprEl = M.$("#expr");
            subEl = M.$("#barSub");
            buildKeys(M.$("#keys"), LAYOUT);
            draw();
            window.addEventListener("resize", fitValue);
            if (window.ResizeObserver) {
                new ResizeObserver(fitValue).observe(M.$(".screen"));
            }
            document.addEventListener("keydown", function(event) {
                var key = event.key;
                if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
                if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
                if (key === "Enter" && event.target.tagName === "BUTTON") return;
                if (/^[0-9]$/.test(key) || key === "." || key === ",") press("digit", key === "," ? "." : key); else if (key === "+" || key === "-" || key === "*" || key === "/") press("operator", key); else if (key === "Enter" || key === "=") press("equals"); else if (key === "Backspace") press("backspace"); else if (key === "Escape" || key === "Delete" || key.toLowerCase() === "c") press("clear"); else return;
                event.preventDefault();
                draw();
            });
            M.host.on(function(message) {

                if (message.type === "app:event" && message.name === "reset") {
                    M.calc.clear();
                    codeEntry = "";
                    secretSequenceStarted = false;
                    draw();
                }
                if (message.type === "app:event" && message.name === "back") {
                    M.host.emit("back-result", {
                        handled: false
                    });
                }
            });
            M.host.ready();
        }
    };
    document.addEventListener("DOMContentLoaded", function() {
        M.main.init();
    });
})(window.Cal = window.Cal || {});

(function(M) {
    "use strict";
    function group(label) {
        return M.el("div", {
            className: "group"
        }, [ M.el("span", {
            className: "group__label",
            text: label
        }) ]);
    }
    function note(text) {
        return M.el("span", {
            className: "group__note",
            text
        });
    }
    function chevron() {
        return M.el("span", {
            className: "row__chev",
            html: M.icon("chevron"),
            attrs: {
                "aria-hidden": "true"
            }
        });
    }
    function empty(icon, title, text) {
        return M.el("div", {
            className: "empty"
        }, [ M.el("div", {
            html: M.icon(icon)
        }), M.el("strong", {
            text: title
        }), M.el("span", {
            text
        }) ]);
    }
    function shell(spec, right, opts) {
        var head = [];
        if (spec.icon) {
            head.push(M.el("span", {
                className: "row__icon",
                style: "--row-accent:" + (spec.accent || "var(--gray)"),
                html: M.icon(spec.icon)
            }));
        }
        var text = M.el("div", {
            className: "row__text"
        }, [ M.el("div", {
            className: "row__label",
            text: spec.label
        }) ]);
        if (spec.hintNode) text.appendChild(spec.hintNode); else if (spec.hint) text.appendChild(M.el("div", {
            className: "row__hint",
            text: spec.hint
        }));
        head.push(text);
        var tail = right ? Object.prototype.toString.call(right) === "[object Array]" ? right : [ right ] : [];
        var stacked = !!(opts && opts.stack);
        var children = stacked ? [ M.el("div", {
            className: "row__head"
        }, head) ].concat(tail) : head.concat(tail);
        var attrs = {};
        if (opts && opts.action) {
            attrs["data-action"] = opts.action;
            Object.keys(opts.data || {}).forEach(function(name) {
                attrs["data-" + name] = opts.data[name];
            });
        }
        return M.el("div", {
            className: "row" + (opts && opts.action ? " row--tap" : "") + (stacked ? " row--stack" : "") + (opts && opts.extra ? " " + opts.extra : ""),
            style: opts && opts.style ? opts.style : null,
            attrs
        }, children);
    }
    function switchRow(spec) {
        var knob = M.el("span", {
            className: "switch"
        });
        var hintEl = spec.liveHint ? M.el("div", {
            className: "row__hint"
        }) : null;
        function paint() {
            var on = !!M.store.get(spec.key);
            knob.classList.toggle("is-on", on);
            if (hintEl) hintEl.textContent = spec.liveHint(on);
        }
        paint();
        M.store.onView(paint);
        var row = hintEl ? M.extend({}, spec, {
            hintNode: hintEl,
            hint: null
        }) : spec;
        return shell(row, knob, {
            action: "toggle",
            data: {
                key: spec.key
            }
        });
    }
    function sliderRow(spec) {
        var min = spec.min === undefined ? 0 : spec.min;
        var max = spec.max === undefined ? 1 : spec.max;
        var format = spec.format || M.percent;
        var input = M.el("input", {
            type: "range",
            className: "slider",
            value: String(M.store.get(spec.key)),
            attrs: {
                min: String(min),
                max: String(max),
                step: String(spec.step === undefined ? .05 : spec.step),
                "aria-label": spec.label
            }
        });
        if (spec.accent) input.style.setProperty("--slider-accent", spec.accent);
        var readout = M.el("span", {
            className: "row__value is-strong",
            text: format(M.store.get(spec.key))
        });
        function paint(value) {
            var pct = max === min ? 0 : (value - min) / (max - min);
            input.style.setProperty("--fill", pct * 100 + "%");
            readout.textContent = format(value);
        }
        input.addEventListener("input", function() {
            var value = Number(input.value);
            paint(value);
            M.store.set(spec.key, value);
        });
        M.store.onView(function(name, value) {
            if (name !== spec.key) return;
            input.value = String(value);
            paint(value);
        });
        paint(M.store.get(spec.key));
        return shell(spec, M.el("div", {
            className: "row__slider"
        }, [ input, readout ]), {
            extra: "row--slider"
        });
    }
    function segmentedRow(spec) {
        var buttons = [];
        var box = M.el("div", {
            className: "seg"
        });
        M.store.limitar(spec.key, spec.options);
        spec.options.forEach(function(option) {
            var button = M.el("button", {
                className: "seg__btn",
                text: option,
                attrs: {
                    type: "button",
                    "data-action": "segment",
                    "data-key": spec.key,
                    "data-value": option
                }
            });
            buttons.push(button);
            box.appendChild(button);
        });
        function paint() {
            var current = M.store.get(spec.key);
            buttons.forEach(function(button) {
                button.classList.toggle("is-on", button.dataset.value === current);
            });
        }
        paint();
        M.store.onView(paint);
        var row = shell(spec, box, {
            stack: true
        });
        return row;
    }
    function navRow(spec) {
        var tail = [];
        var valueEl = null;
        if (spec.liveValue) {
            valueEl = M.el("span", {
                className: "row__value",
                text: spec.liveValue()
            });
            tail.push(valueEl);
            M.store.onView(function() {
                valueEl.textContent = spec.liveValue();
            });
        } else if (spec.value !== undefined && spec.value !== null) {
            tail.push(M.el("span", {
                className: "row__value",
                text: spec.value
            }));
        }
        if (spec.chevron !== false) tail.push(chevron());
        return shell(spec, tail, {
            action: "open",
            data: {
                page: spec.page
            }
        });
    }
    function kvGroup(pairs) {
        var box = M.el("div", {
            className: "group"
        });
        pairs.forEach(function(pair) {
            box.appendChild(M.el("div", {
                className: "kv"
            }, [ M.el("span", {
                className: "kv__key",
                text: pair[0]
            }), M.el("span", {
                className: "kv__val" + (pair[2] ? " is-" + pair[2] : ""),
                text: pair[1]
            }) ]));
        });
        return box;
    }
    M.controls = {
        group,
        note,
        shell,
        chevron,
        empty,
        kvGroup,
        switchRow,
        sliderRow,
        segmentedRow,
        navRow
    };
})(window.Cfg = window.Cfg || {});
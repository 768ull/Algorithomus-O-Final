(function(global, document) {
    "use strict";
    if (!global.requestAnimationFrame) {
        global.requestAnimationFrame = function(callback) {
            return global.setTimeout(function() {
                callback((new Date).getTime());
            }, 16);
        };
        global.cancelAnimationFrame = function(id) {
            global.clearTimeout(id);
        };
    }
    if (!global.matchMedia) {
        global.matchMedia = function() {
            return {
                matches: false,
                media: "",
                addListener: function() {},
                removeListener: function() {}
            };
        };
    }
    if (global.NodeList && !global.NodeList.prototype.forEach) {
        global.NodeList.prototype.forEach = Array.prototype.forEach;
    }
    if (global.HTMLCollection && !global.HTMLCollection.prototype.forEach) {
        global.HTMLCollection.prototype.forEach = Array.prototype.forEach;
    }
    if (global.Element && !global.Element.prototype.closest) {
        global.Element.prototype.closest = function(selector) {
            var node = this;
            while (node && node.nodeType === 1) {
                if (node.matches && node.matches(selector) || node.msMatchesSelector && node.msMatchesSelector(selector) || node.webkitMatchesSelector && node.webkitMatchesSelector(selector)) return node;
                node = node.parentElement;
            }
            return null;
        };
    }
    if (global.HTMLElement && global.HTMLElement.prototype && !("dataset" in global.HTMLElement.prototype)) {
        try {
            Object.defineProperty(global.HTMLElement.prototype, "dataset", {
                configurable: true,
                get: function() {
                    var data = {};
                    var attrs = this.attributes || [];
                    for (var i = 0; i < attrs.length; i++) {
                        if (attrs[i].name.indexOf("data-") !== 0) continue;
                        var key = attrs[i].name.slice(5).replace(/-([a-z])/g, function(_, letter) {
                            return letter.toUpperCase();
                        });
                        data[key] = attrs[i].value;
                    }
                    return data;
                }
            });
        } catch (error) {}
    }
    if (global.DOMTokenList && global.DOMTokenList.prototype) {
        var list = document.createElement("i").classList;
        var supportsForce = false;
        if (list) {
            list.add("compat-test");
            list.toggle("compat-test", false);
            supportsForce = !list.contains("compat-test");
        }
        if (!supportsForce) {
            var nativeToggle = global.DOMTokenList.prototype.toggle;
            global.DOMTokenList.prototype.toggle = function(name, force) {
                if (arguments.length > 1) {
                    if (force) this.add(name); else this.remove(name);
                    return !!force;
                }
                return nativeToggle.call(this, name);
            };
        }
    }
})(window, document);
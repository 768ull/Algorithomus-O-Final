(function(M) {
    "use strict";
    var view = null;
    function itemNode(item, index, onOpen) {
        var start = null;
        var dragged = false;
        var node = M.el("button", {
            className: "photo",
            attrs: {
                type: "button",
                "aria-label": "Abrir " + item.name
            },
            style: "animation-delay:" + Math.min(index, 20) * 22 + "ms"
        }, [ M.el("img", {
            src: item.src,
            alt: item.name,
            attrs: {
                draggable: "false",
                loading: "lazy",
                decoding: "async"
            },
            on: {
                error: function() {
                    node.disabled = true;
                    node.classList.add("photo--missing");
                    node.textContent = "Imagem indisponível";
                }
            }
        }) ]);
        node.addEventListener("pointerdown", function(event) {
            start = {
                x: event.clientX,
                y: event.clientY
            };
            dragged = false;
            node.classList.add("photo--pressed");
        });
        node.addEventListener("pointermove", function(event) {
            if (!start) return;
            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
                dragged = true;
                node.classList.remove("photo--pressed");
            }
        });
        [ "pointerup", "pointercancel", "pointerleave" ].forEach(function(type) {
            node.addEventListener(type, function() {
                start = null;
                if (type === "pointercancel") dragged = true;
                node.classList.remove("photo--pressed");
            });
        });
        node.addEventListener("click", function(event) {
            if (!dragged || event.detail === 0) onOpen(item);
        });
        return node;
    }
    M.grid = {
        init: function() {
            view = M.$("#view");
        },
        render: function(folder, onOpen) {
            view.innerHTML = "";
            var items = M.data.photos(folder.id);
            if (!items.length) {
                view.appendChild(M.el("div", {
                    className: "empty"
                }, [ M.el("strong", {
                    text: "Nenhuma foto ainda"
                }) ]));
            } else {
                var grid = M.el("div", {
                    className: "photos"
                });
                items.forEach(function(item, index) {
                    grid.appendChild(itemNode(item, index, onOpen));
                });
                view.appendChild(grid);
            }
            view.scrollTop = 0;
        }
    };
})(window.Gal = window.Gal || {});
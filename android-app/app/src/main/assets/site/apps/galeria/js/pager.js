(function(M) {
    "use strict";
    var strip, position;
    var items = [];
    var index = -1;
    var onSelect;
    function mark() {
        M.$$(".filmstrip__photo", strip).forEach(function(button, number) {
            button.classList.toggle("is-selected", number === index);
            button.setAttribute("aria-current", number === index ? "true" : "false");
        });
        position.textContent = index + 1 + " / " + items.length;
        var selected = strip.children[index];
        if (selected) strip.scrollLeft = Math.max(0, selected.offsetLeft - strip.clientWidth / 2 + selected.offsetWidth / 2);
    }
    function render() {
        strip.innerHTML = "";
        items.forEach(function(item, number) {
            strip.appendChild(M.el("button", {
                className: "filmstrip__photo",
                attrs: {
                    type: "button",
                    "data-action": "viewer-photo",
                    "data-index": number,
                    "aria-label": "Foto " + (number + 1) + ": " + item.name
                }
            }, [ M.el("img", {
                src: item.src,
                alt: "",
                attrs: {
                    loading: "lazy",
                    draggable: "false"
                },
                on: {
                    error: function(event) {
                        event.target.hidden = true;
                    }
                }
            }) ]));
        });
        mark();
    }
    M.pager = {
        init: function() {
            strip = M.$("#viewerThumbnails");
            position = M.$("#viewerPosition");
        },
        open: function(photos, item, select) {
            items = photos.slice();
            index = items.findIndex(function(photo) {
                return photo.src === item.src;
            });
            if (index < 0) {
                items.unshift(item);
                index = 0;
            }
            onSelect = select;
            render();
        },
        select: function(number) {
            if (!Number.isInteger(number) || number < 0 || number >= items.length || number === index) return false;
            index = number;
            onSelect(items[index]);
            mark();
            return true;
        },
        step: function(delta) {
            return M.pager.select(index + delta);
        },
        refresh: function(photos) {
            if (index < 0) return;
            M.pager.open(photos, items[index], onSelect);
        }
    };
})(window.Gal = window.Gal || {});
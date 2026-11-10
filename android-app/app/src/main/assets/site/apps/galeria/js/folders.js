(function(M) {
    "use strict";
    M.folders = {
        render: function(view, onOpen) {
            view.innerHTML = "";
            var grid = M.el("div", {
                className: "folders"
            });
            M.data.folders.forEach(function(folder, index) {
                var photos = M.data.photos(folder.id);
                var cover = photos.length ? M.el("img", {
                    className: "folder__cover",
                    src: photos[0].src,
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
                }) : null;
                var box = M.el("button", {
                    className: "folder" + (folder.locked ? " folder--locked" : ""),
                    style: "animation-delay:" + index * 55 + "ms"
                }, [ M.el("span", {
                    className: "folder__icon"
                }, [ M.el("span", {
                    className: "folder__placeholder",
                    text: folder.locked ? "🔒" : "▧"
                }), cover ]), M.el("span", {
                    className: "folder__name",
                    text: folder.name
                }), M.el("span", {
                    className: "folder__count",
                    text: folder.count + (folder.count === 1 ? " foto" : " fotos")
                }) ]);
                box.addEventListener("click", function() {
                    onOpen(folder);
                });
                grid.appendChild(box);
            });
            view.appendChild(grid);
        }
    };
})(window.Gal = window.Gal || {});
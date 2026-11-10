(function(M) {
    "use strict";
    function kind(entry) {
        if (entry.type === "Recebida") return "in";
        if (entry.type === "Perdida") return "missed";
        return "other";
    }
    M.history = {
        render: function(pane) {
            pane.innerHTML = "";
            var logs = M.data.logs();
            if (!logs.length) {
                pane.appendChild(M.el("div", {
                    className: "pane__empty",
                    text: "Nenhuma ligação ainda."
                }));
                return 0;
            }
            logs.forEach(function(entry, index) {
                var row = M.el("div", {
                    className: "call-row",
                    style: "animation-delay:" + Math.min(index, 8) * 40 + "ms"
                }, [ M.el("span", {
                    className: "call-row__avatar",
                    text: entry.avatar || "📞"
                }), M.el("span", {
                    className: "call-row__info"
                }, [ M.el("div", {
                    className: "call-row__name",
                    text: entry.name
                }), M.el("div", {
                    className: "call-row__sub call-row__sub--" + kind(entry),
                    text: entry.note || entry.type
                }) ]), M.el("span", {
                    className: "call-row__time",
                    text: entry.time
                }) ]);
                pane.appendChild(row);
            });
            return logs.length;
        }
    };
})(window.Tel = window.Tel || {});
(function(M) {
    "use strict";
    var listEl = null;
    var subEl = null;
    var meAvatarEl = null;
    M.list = {
        init: function() {
            listEl = document.getElementById("list");
            subEl = document.getElementById("barSub");
            meAvatarEl = document.getElementById("barMeAvatar");
        },
        render: function() {
            listEl.innerHTML = "";
            if (meAvatarEl && M.data.myself) {
                var myself = M.data.myself();
                if (myself) {
                    meAvatarEl.textContent = "";
                    meAvatarEl.classList.toggle("has-img", M.list.isImage(myself.avatar));
                    if (M.list.isImage(myself.avatar)) {
                        var meImg = document.createElement("img");
                        meImg.className = "bar__me-img";
                        meImg.alt = "";
                        meImg.draggable = false;
                        meImg.src = myself.avatar;
                        meAvatarEl.appendChild(meImg);
                    } else {
                        meAvatarEl.textContent = myself.avatar || "👤";
                    }
                }
            }
            var contacts = M.data.all().filter(function(contact) {
                return !M.data.isContactHidden(contact.id);
            });
            var bethIndex = contacts.findIndex(function(contact) {
                return contact.id === "beth";
            });
            if (bethIndex !== -1) contacts.push(contacts.splice(bethIndex, 1)[0]);
            if (!contacts.length) {
                listEl.appendChild(M.el("div", {
                    className: "list__empty",
                    text: "Sem conversas."
                }));
                subEl.textContent = "—";
                return;
            }
            var unread = M.data.unreadTotal();
            subEl.textContent = unread ? unread + (unread === 1 ? " não lida" : " não lidas") : "nenhuma nova";
            contacts.forEach(function(contact, index) {
                var last = M.data.last(contact.id);
                var preview = M.list.preview(last);
                var row = M.el("div", {
                    className: "row",
                    style: "animation-delay:" + index * 45 + "ms"
                });
                var avatar = M.el("button", {
                    className: "row__avatar",
                    on: {
                        click: function(event) {
                            event.stopPropagation();
                            M.profile.showAvatar(contact.id);
                        }
                    }
                });
                M.list.avatarInto(avatar, contact.avatar);
                if (contact.unread > 0) avatar.appendChild(M.el("span", {
                    className: "row__dot"
                }));
                var name = M.el("span", {
                    className: "row__name"
                });
                name.appendChild(M.el("span", {
                    text: contact.name
                }));
                if (contact.unread > 0) {
                    name.appendChild(M.el("span", {
                        className: "row__unread",
                        text: contact.unread > 9 ? "9+" : String(contact.unread)
                    }));
                }
                var previewClasses = "row__preview" + (last && last.sender === "me" ? " is-mine" : "") + (last && last.creepy ? " is-creepy" : "");
                var opener = M.el("button", {
                    className: "row__open",
                    on: {
                        click: function() {
                            M.chat.open(contact.id);
                        }
                    }
                });
                opener.appendChild(M.el("span", {
                    className: "row__info"
                }, [ name, M.el("span", {
                    className: previewClasses,
                    text: preview || "sem mensagens"
                }) ]));
                opener.appendChild(M.el("span", {
                    className: "row__time",
                    text: last && last.time ? last.time : ""
                }));
                row.appendChild(avatar);
                row.appendChild(opener);
                listEl.appendChild(row);
            });
        },
        preview: function(last) {
            if (!last) return "";
            function compact(text) {
                text = text || "";
                return text.length > 32 ? text.slice(0, 31).trimEnd() + "…" : text;
            }
            if (last.type === "audio") {
                var label = "🎤 Áudio" + (last.duration ? " (" + M.list.fmtTime(last.duration) + ")" : "");
                return (last.sender === "me" ? "Você: " : "") + label;
            }
            if (last.type === "sticker") return (last.sender === "me" ? "Você: " : "") + "🖼️ Figurinha";
            if (last.type === "call") return "☎ Chamada perdida";
            if (last.type === "system" || last.type === "day") return compact(last.text);
            if (last.type === "image") return (last.sender === "me" ? "Você: " : "") + "📷 Foto";
            if (last.type === "file") return (last.sender === "me" ? "Você: " : "") + "📎 " + (last.name || "Arquivo");
            return compact(last.sender === "me" ? "Você: " + last.text : last.text);
        },
        fmtTime: function(seconds) {
            var total = Math.max(0, Math.round(seconds || 0));
            var minutes = Math.floor(total / 60);
            var rest = total % 60;
            return minutes + ":" + (rest < 10 ? "0" + rest : String(rest));
        },
        isImage: function(avatar) {
            return typeof avatar === "string" && (/^(data:|\.|~\/|\/|https?:)/.test(avatar) || /\.(png|jpe?g|svg|gif|webp)(\?.*)?$/i.test(avatar));
        },
        avatarInto: function(holder, avatar) {
            if (M.list.isImage(avatar)) {
                var img = document.createElement("img");
                img.className = "row__avatar-img";
                img.alt = "";
                img.draggable = false;
                img.src = avatar;
                holder.appendChild(img);
            } else {
                holder.appendChild(document.createTextNode(avatar || "👤"));
            }
        }
    };
})(window.Msg = window.Msg || {});
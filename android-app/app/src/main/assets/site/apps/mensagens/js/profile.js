(function(M) {
    "use strict";
    var profileEl = null;
    var avatarEl = null;
    var nameEl = null;
    var statusEl = null;
    var phoneEl = null;
    var aboutEl = null;
    var avatarViewerEl = null;
    var openId = null;
    function paint(contact) {
        avatarEl.textContent = "";
        avatarEl.classList.toggle("has-img", !!(M.list && M.list.isImage(contact.avatar)));
        if (M.list && M.list.isImage(contact.avatar)) {
            var img = document.createElement("img");
            img.className = "profile__avatar-img";
            img.alt = "";
            img.draggable = false;
            img.src = contact.avatar;
            avatarEl.appendChild(img);
        } else {
            avatarEl.textContent = contact.avatar || "👤";
        }
        nameEl.textContent = contact.name || "—";
        statusEl.textContent = contact.status === "online" ? "online" : "offline";
        statusEl.classList.toggle("is-online", contact.status === "online");
        phoneEl.textContent = contact.phone || "sem número";
        aboutEl.textContent = contact.about || "sem recado";
    }
    function showAvatar(id) {
        var contact = M.data.get(id);
        if (!contact || !avatarViewerEl) return;
        avatarViewerEl.textContent = "";
        var hasPhoto = M.list && M.list.isImage(contact.avatar) && !/\/(?:linn-default|default)\.svg(?:$|\?)/i.test(contact.avatar);
        if (hasPhoto) {
            var image = document.createElement("img");
            image.className = "avatar-viewer__image";
            image.src = contact.avatar;
            image.alt = contact.name ? "Foto de perfil de " + contact.name : "Foto de perfil";
            avatarViewerEl.appendChild(image);
        } else {
            var message = document.createElement("span");
            message.className = "avatar-viewer__message";
            message.textContent = id === "linn" ? "Usuário removeu foto de perfil" : "Esse usuário não possui foto de perfil";
            avatarViewerEl.appendChild(message);
        }
        avatarViewerEl.hidden = false;
    }
    M.profile = {
        init: function() {
            profileEl = M.$("#profile");
            avatarEl = M.$("#profileAvatar");
            nameEl = M.$("#profileName");
            statusEl = M.$("#profileStatus");
            phoneEl = M.$("#profilePhone");
            aboutEl = M.$("#profileAbout");
            avatarViewerEl = document.createElement("div");
            avatarViewerEl.className = "avatar-viewer";
            avatarViewerEl.hidden = true;
            avatarViewerEl.setAttribute("role", "dialog");
            avatarViewerEl.setAttribute("aria-modal", "true");
            avatarViewerEl.addEventListener("click", function() {
                avatarViewerEl.hidden = true;
            });
            document.body.appendChild(avatarViewerEl);
            avatarEl.addEventListener("click", function(event) {
                event.stopPropagation();
                if (openId) showAvatar(openId);
            });
            document.addEventListener("click", function(event) {
                var chatAvatar = event.target.closest ? event.target.closest("#chatAvatar") : null;
                if (chatAvatar) {
                    var chatPeer = M.$("#chatPeer");
                    if (chatPeer && chatPeer.getAttribute("data-contact")) showAvatar(chatPeer.getAttribute("data-contact"));
                    event.stopPropagation();
                    return;
                }
                var closer = event.target.closest ? event.target.closest('[data-action="close-profile"]') : null;
                if (closer) {
                    M.profile.close();
                    return;
                }
                var headHit = event.target.closest ? event.target.closest('[data-action="open-profile"]') : null;
                if (headHit && headHit.getAttribute("data-contact")) {
                    M.profile.open(headHit.getAttribute("data-contact"));
                }
            });
        },
        isOpen: function() {
            return !!openId;
        },
        contactId: function() {
            return openId;
        },
        showAvatar,
        open: function(id) {
            var contact = M.data.get(id);
            if (!contact) return;
            openId = id;
            paint(contact);
            var head = M.$("#chatHead");
            if (head) head.setAttribute("data-contact", id);
            profileEl.hidden = false;
            profileEl.classList.remove("is-leaving");
        },
        close: function() {
            if (!openId) return;
            openId = null;
            profileEl.classList.add("is-leaving");
            setTimeout(function() {
                profileEl.hidden = true;
                profileEl.classList.remove("is-leaving");
            }, 240);
        }
    };
})(window.Msg = window.Msg || {});
(function(M) {
    "use strict";
    var overlay = null;
    var textEl = null;
    var postBtn = null;
    var countEl = null;
    var avatarEl = null;
    var replyInput = null;
    var replySend = null;
    var replyTo = null;
    M.composer = {
        init: function() {
            overlay = M.$("#view-compose");
            textEl = M.$("#composeText");
            postBtn = M.$("#composePost");
            countEl = M.$("#composeCount");
            avatarEl = M.$("#composeAvatar");
            replyInput = M.$("#replyInput");
            replySend = M.$("#replybar .replybar__send");
            textEl.addEventListener("input", M.composer.refresh);
            replyInput.addEventListener("input", function() {
                replySend.disabled = replyInput.value.trim().length === 0;
            });
        },
        isOpen: function() {
            return !overlay.hidden;
        },
        open: function() {
            var me = M.data.me();
            if (me) M.paintAvatar(avatarEl, me.avatar);
            textEl.value = "";
            overlay.hidden = false;
            M.composer.refresh();
            setTimeout(function() {
                textEl.focus();
            }, 60);
        },
        close: function() {
            overlay.hidden = true;
            textEl.blur();
        },
        refresh: function() {
            var left = 280 - textEl.value.length;
            countEl.textContent = left;
            countEl.classList.toggle("is-low", left <= 20);
            postBtn.disabled = textEl.value.trim().length === 0;
        },
        publish: function() {
            var text = textEl.value.trim();
            if (!text) return;
            M.data.addPost(text);
            M.composer.close();
            M.feed.render();
            M.main.go("home");
        },
        setReplyTo: function(postId) {
            replyTo = postId;
            replyInput.value = "";
            replySend.disabled = true;
        },
        clearReply: function() {
            replyTo = null;
            replyInput.value = "";
            replySend.disabled = true;
        },
        sendReply: function() {
            var text = replyInput.value.trim();
            if (!replyTo || !text) return;
            M.data.addReply(replyTo, text);
            replyInput.value = "";
            replySend.disabled = true;
            M.feed.repaint(replyTo);
            M.profile.openDetail(replyTo);
        }
    };
})(window.Y = window.Y || {});
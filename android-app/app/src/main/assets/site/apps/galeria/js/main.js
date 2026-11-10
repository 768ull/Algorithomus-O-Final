                             
                                                                          
                                                                         
                                               

(function (M) {

    'use strict';

    var view = null;
    var title = null;
    var sub = null;
    var backButton = null;

    var folder = null;

    function showFolders() {
        folder = null;
        title.textContent = 'Galeria';
        sub.textContent = M.data.folders.length + ' pastas';
        backButton.hidden = true;
        M.folders.render(view, openFolder);
    }

    function openFolder(target) {
        folder = target;
        title.textContent = target.name;
        sub.textContent = target.count + (target.count === 1 ? ' item' : ' itens');
        backButton.hidden = false;
        M.grid.render(target, function (item) { M.viewer.open(item, M.data.photos(target.id)); });
    }

                                                                             
    function back() {
        if (M.crop.isOpen()) { M.crop.close(); return true; }
        if (M.viewer.isOpen()) {
            M.viewer.close();
            return true;
        }
        if (folder) {
            showFolders();
            return true;
        }
        return false;
    }

    M.main = {
        refresh: function () {
            var scroll = view.scrollTop;
            if (folder) openFolder(folder);
            else showFolders();
            if (folder && M.viewer.isOpen()) M.pager.refresh(M.data.photos(folder.id));
            view.scrollTop = scroll;
        },

        init: function () {
            view = M.$('#view');
            title = M.$('#barTitle');
            sub = M.$('#barSub');
            backButton = M.$('#barBack');

            M.grid.init();
            M.viewer.init();
            M.crop.init();

            document.addEventListener('click', function (event) {
                var target = event.target.closest ? event.target.closest('[data-action]') : null;
                if (!target) return;

                var action = target.dataset.action;
                if (action === 'back') back();
                else if (action === 'close-viewer') M.viewer.close();
                else if (action === 'toggle-editor') M.viewer.toggleEditor();
                else if (action === 'reset-filters') M.viewer.reset();
                else if (action === 'set-wallpaper') M.viewer.setWallpaper();
                else if (action === 'cancel-crop') M.crop.close();
                else if (action === 'reset-crop') M.crop.reset();
                else if (action === 'apply-crop') M.crop.apply();
                else if (action === 'viewer-photo' && M.viewer.isOpen() && !M.crop.isOpen()) M.pager.select(Number(target.dataset.index));
            });

            M.host.on(function (message) {
                if (message.type === 'app:event' && message.name === 'wifi-clues') {
                    if (M.data.setWifiClues(message.payload && message.payload.images)) M.main.refresh();
                    return;
                }
                if (message.type === 'app:event' && message.name === 'wallpaper-result') {
                    M.viewer.wallpaperResult(message.payload || {});
                    return;
                }
                if (message.type === 'app:state' && message.name === 'open') M.sync.check();
                if (message.type !== 'app:event' || message.name !== 'back') return;

                var handled = M.viewer.isOpen() || !!folder;
                M.host.emit('back-result', { handled: handled });
                if (handled) back();
            });

            showFolders();
            M.sync.init();
            M.host.ready();
        }

    };

    document.addEventListener('DOMContentLoaded', function () {
        M.main.init();
    });

})(window.Gal = window.Gal || {});

                                                      
(function (M) {
    'use strict';

    var definitions = [
        { id: 'camera', name: 'Câmera' },
        { id: 'downloads', name: 'Downloads' },
        { id: 'wallpapers', name: 'Wallpapers', directory: 'Wallpapers' }
    ];
    var wifiClues = [];
    var cluePlacements = [];

    M.data = {
        setWifiClues: function (characters) {
            if (!Array.isArray(characters) || characters.length !== 7 ||
                
                !characters.every(function (character) { return typeof character === 'string' && /^\/api\/wifi-clue\?index=[0-6]$/.test(character); })) return false;
            if (characters.join('') !== wifiClues.join('')) {
                var adjustments = ['brightness', 'contrast', 'saturate', 'hue'];
                for (var i = adjustments.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var adjustment = adjustments[i];
                    adjustments[i] = adjustments[j];
                    adjustments[j] = adjustment;
                }
                cluePlacements = characters.map(function (character, index) {
                    return {
                        adjustment: adjustments[index % adjustments.length],
                        x: 0.2 + Math.random() * 0.6,
                        y: 0.2 + Math.random() * 0.6,
                        angle: -50 + Math.random() * 100,
                        size: 0.12 + Math.random() * 0.06
                    };
                });
            }
            wifiClues = characters.slice();
            return true;
        },
        refresh: function () {
            definitions.forEach(function (folder) {
                folder.count = (M.catalog && M.catalog[folder.id] || []).length;
            });
        },
        folders: definitions.map(function (folder) {
            folder.count = (M.catalog && M.catalog[folder.id] || []).length;
            return folder;
        }),
        folder: function (id) {
            return M.data.folders.filter(function (folder) { return folder.id === id; })[0] || null;
        },
        photos: function (id) {
            var folder = M.data.folder(id);
            if (!folder) return [];
            var prefix = folder.directory || folder.id;
            return (M.catalog && M.catalog[id] || []).map(function (item, index) {
                var photo = { name: prefix + '_' + (index + 1) + '.webp', src: item.src };
                if (id === 'camera' && wifiClues[index]) {
                    photo.clue = wifiClues[index];
                    photo.clueIndex = index + 1;
                    photo.cluePlacement = cluePlacements[index];
                    photo.clueAdjustment = cluePlacements[index].adjustment;
                }
                return photo;
            });
        }
    };
})(window.Gal = window.Gal || {});

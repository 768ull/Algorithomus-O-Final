                                                                          
                                                                        
(function (M) {
    'use strict';

    var images = {};
    M.clueImage = {
        render: function (canvas, image, item, strength) {
            if (!canvas || !item || !item.clue || !strength || !image.complete || !image.naturalWidth) return false;
            var clue = images[item.clue];
            if (!clue) { clue = images[item.clue] = new Image(); clue.onload = function () { M.clueImage.render(canvas,image,item,strength); canvas.hidden=false; image.hidden=true; }; clue.src = item.clue; }
            if (!clue.complete || !clue.naturalWidth) return false;
            var ctx = canvas.getContext('2d');
            if (!ctx) return false;
            var scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            var position = item.cluePlacement || { x: 0.5, y: 0.5, angle: 0, size: 0.15 };
            var size = Math.min(canvas.width, canvas.height) * position.size;
            ctx.save();
            ctx.translate(canvas.width * position.x, canvas.height * position.y);
            ctx.rotate(position.angle * Math.PI / 180);
            ctx.globalAlpha = Math.min(1, strength * 2);
            ctx.shadowColor = '#000';
            ctx.shadowBlur = Math.max(3, size * 0.06);
            ctx.drawImage(clue, -size * 0.36, -size * 0.5, size * 0.72, size);
            ctx.restore();
            return true;
        }
    };
})(window.Gal = window.Gal || {});

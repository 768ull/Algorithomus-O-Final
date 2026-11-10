(function(S) {
    "use strict";
    var KEY = "agmcelular.etapa3.home-layout.v2";
    var OLD_KEY = "agmcelular.etapa3.home-layout.v1";
    var DOCK = [ "mensagens", "telefone", "y" ];
    var HOLD_TO_DRAG = 500;
    var HOLD_TO_EDIT = 1e3;
    var SLOP = 8;
    var WIDGET_COLS = 4;
    var WIDGET_ROWS = 4;
    var GRID_X = [ 0, 25, 50, 75 ];
    var GRID_Y = [ 0, 25, 50, 75 ];
    var edgeTimer = 0;
    var edgePage = null;
    var state;
    var home, grids, dock, editDone;
    var editing = false;
    var press = null;
    var widgetGesture = null;
    var preview = null;
    var displacedPreview = null;
    var swallowTimer = 0;
    var revealedApps = {};
    function app(id) {
        return S.APP[id];
    }
    function availableInHome(id) {
        var item = app(id);
        return !!item && (!item.hiddenUntilUnlocked || !!revealedApps[id]);
    }
    function entry(id, x, y) {
        return {
            type: "app",
            appId: id,
            x,
            y
        };
    }
    function defaults() {
        return {
            pages: [ [ entry("calculadora", 0, 50), entry("configuracoes", 75, 50), entry("mensagens", 0, 75), entry("y", 25, 75), entry("galeria", 50, 75), entry("telefone", 75, 75) ], [ entry("tetris", 25, 50), entry("cobrinha", 50, 50) ] ],
            dock: DOCK.slice(),
            widgets: [ {
                clock: {
                    col: 1,
                    row: 1,
                    colSpan: 2,
                    rowSpan: 2
                },
                weather: {
                    col: 3,
                    row: 1,
                    colSpan: 2,
                    rowSpan: 1
                }
            }, {} ]
        };
    }
    function validPosition(value, fallback) {
        var number = Number(value);
        return isFinite(number) ? Math.max(0, Math.min(90, number)) : fallback;
    }
    function normalize(raw) {
        var result = {
            pages: [ [], [] ],
            dock: DOCK.slice(),
            widgets: [ {}, {} ]
        };
        var seen = {};
        var pageData = raw && Array.isArray(raw.pages) ? raw.pages : [];
        pageData.slice(0, 2).forEach(function(page, pageIndex) {
            if (!Array.isArray(page)) return;
            page.forEach(function(item, index) {
                if (!item) return;
                var ids = item.type === "folder" && Array.isArray(item.items) ? item.items : [ item.appId ];
                ids.forEach(function(id, childIndex) {
                    if (!availableInHome(id) || seen[id]) return;
                    seen[id] = true;
                    result.pages[pageIndex].push(entry(id, nearest(GRID_X, validPosition(item.x, 3 + index % 4 * 33)), nearest(GRID_Y, validPosition(item.y, 3 + (Math.floor(index / 4) + childIndex) * 29))));
                });
            });
        });
        var defaultPages = defaults().pages;
        S.APPS.forEach(function(item, index) {
            if (!availableInHome(item.id) || seen[item.id]) return;
            var defaultPageIndex = defaultPages.findIndex(function(page) {
                return page.some(function(position) {
                    return position.appId === item.id;
                });
            });
            var defaultPosition = defaultPageIndex >= 0 ? defaultPages[defaultPageIndex].find(function(position) {
                return position.appId === item.id;
            }) : null;
            var pageIndex = defaultPosition ? defaultPageIndex : index < 4 ? 0 : 1;
            var slot = result.pages[pageIndex].length;
            result.pages[pageIndex].push(entry(item.id, defaultPosition ? defaultPosition.x : GRID_X[slot % GRID_X.length], defaultPosition ? defaultPosition.y : GRID_Y[Math.floor(slot / GRID_X.length) % GRID_Y.length]));
        });
        if (raw && Array.isArray(raw.dock)) {
            result.dock = DOCK.filter(function(id) {
                return raw.dock.indexOf(id) >= 0;
            });
            DOCK.forEach(function(id) {
                if (result.dock.indexOf(id) < 0) result.dock.push(id);
            });
        }
        var widgetDefaults = defaults().widgets[0];
        var rawWidgetPages = raw && Array.isArray(raw.widgets) ? raw.widgets : [ raw && raw.widgets ? raw.widgets : {}, {} ];
        [ "clock", "weather" ].forEach(function(id) {
            var pageIndex = rawWidgetPages.findIndex(function(page) {
                return page && page[id];
            });
            if (pageIndex < 0 || pageIndex > 1) pageIndex = 0;
            var source = rawWidgetPages[pageIndex] && rawWidgetPages[pageIndex][id] || widgetDefaults[id];
            var legacyWidgetMap = raw && raw.widgets && !Array.isArray(raw.widgets);
            var savedRowSpan = Number(source.rowSpan) || widgetDefaults[id].rowSpan;
            if (legacyWidgetMap && id === "clock" && savedRowSpan === 3) savedRowSpan = 2;
            if (legacyWidgetMap && id === "weather" && savedRowSpan === 2) savedRowSpan = 1;
            var candidate = {
                col: Math.max(1, Math.min(WIDGET_COLS, Math.floor(Number(source.col) || widgetDefaults[id].col))),
                row: Math.max(1, Math.min(WIDGET_ROWS, Math.floor(Number(source.row) || widgetDefaults[id].row))),
                colSpan: Math.max(1, Math.min(WIDGET_COLS, Math.floor(Number(source.colSpan) || widgetDefaults[id].colSpan))),
                rowSpan: Math.max(1, Math.min(WIDGET_ROWS, Math.floor(savedRowSpan)))
            };
            candidate.col = Math.min(candidate.col, WIDGET_COLS - candidate.colSpan + 1);
            candidate.row = Math.min(candidate.row, WIDGET_ROWS - candidate.rowSpan + 1);
            if (!widgetPositionAvailable(result.widgets[pageIndex], candidate)) {
                candidate = nearestWidgetPosition(result.widgets[pageIndex], candidate);
            }
            result.widgets[pageIndex][id] = candidate;
        });
        result.pages.forEach(function(page, pageIndex) {
            var placed = [];
            page.forEach(function(item) {
                var wanted = snapPosition(item.x, item.y);
                var position = nextFreePosition(pageIndex, placed, wanted, null, result.widgets);
                item.x = position.x;
                item.y = position.y;
                placed.push(item);
            });
        });
        return result;
    }
    function load() {
        var raw = null;
        try {
            raw = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || "null");
        } catch (error) {
            raw = null;
        }
        state = normalize(raw);
        save();
    }
    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
        } catch (error) {}
    }
    function copyWidgetPages(pages) {
        return pages.map(function(widgets) {
            var copy = {};
            Object.keys(widgets).forEach(function(id) {
                copy[id] = {
                    col: widgets[id].col,
                    row: widgets[id].row,
                    colSpan: widgets[id].colSpan,
                    rowSpan: widgets[id].rowSpan
                };
            });
            return copy;
        });
    }
    function copyAppPages(pages) {
        return pages.map(function(page) {
            return page.map(function(item) {
                return entry(item.appId, item.x, item.y);
            });
        });
    }
    function renderAppPositions() {
        grids.forEach(function(grid, pageIndex) {
            state.pages[pageIndex].forEach(function(item) {
                var button = home.querySelector('.home-item--app[data-app="' + item.appId + '"]');
                if (!button) return;
                if (button.parentNode !== grid) grid.appendChild(button);
                button.style.left = item.x + "%";
                button.style.top = item.y + "%";
            });
        });
    }
    function widgetsOverlap(a, b) {
        return a.col < b.col + b.colSpan && a.col + a.colSpan > b.col && a.row < b.row + b.rowSpan && a.row + a.rowSpan > b.row;
    }
    function appCell(item) {
        return {
            col: GRID_X.indexOf(nearest(GRID_X, item.x)) + 1,
            row: GRID_Y.indexOf(nearest(GRID_Y, item.y)) + 1
        };
    }
    function widgetCoversCell(layouts, cell, ignoredId) {
        return Object.keys(layouts).some(function(id) {
            var widget = layouts[id];
            return id !== ignoredId && cell.col >= widget.col && cell.col < widget.col + widget.colSpan && cell.row >= widget.row && cell.row < widget.row + widget.rowSpan;
        });
    }
    function widgetPositionAvailable(layouts, candidate, ignoredId, pageIndex, pages) {
        var clearOfWidgets = Object.keys(layouts).every(function(id) {
            return id === ignoredId || !widgetsOverlap(candidate, layouts[id]);
        });
        if (!clearOfWidgets || pageIndex === undefined || !pages) return clearOfWidgets;
        return pages[pageIndex].every(function(item) {
            var cell = appCell(item);
            return cell.col < candidate.col || cell.col >= candidate.col + candidate.colSpan || cell.row < candidate.row || cell.row >= candidate.row + candidate.rowSpan;
        });
    }
    function nearestWidgetPosition(layouts, wanted, ignoredId, pageIndex, pages) {
        var candidates = [];
        for (var row = 1; row <= WIDGET_ROWS - wanted.rowSpan + 1; row++) {
            for (var col = 1; col <= WIDGET_COLS - wanted.colSpan + 1; col++) {
                var candidate = {
                    col,
                    row,
                    colSpan: wanted.colSpan,
                    rowSpan: wanted.rowSpan
                };
                candidate.distance = Math.pow(col - wanted.col, 2) + Math.pow(row - wanted.row, 2);
                candidates.push(candidate);
            }
        }
        candidates.sort(function(a, b) {
            return a.distance - b.distance;
        });
        for (var i = 0; i < candidates.length; i++) {
            if (widgetPositionAvailable(layouts, candidates[i], ignoredId, pageIndex, pages)) return candidates[i];
        }
        return wanted;
    }
    function renderWidgetLayout() {
        [ "clock", "weather" ].forEach(function(id) {
            var element = home.querySelector('[data-widget="' + id + '"]');
            var layout = null;
            var pageIndex = 0;
            state.widgets.some(function(widgets, index) {
                if (widgets[id]) {
                    layout = widgets[id];
                    pageIndex = index;
                    return true;
                }
                return false;
            });
            if (!element || !layout) return;
            if (widgetGesture && widgetGesture.mode === "move" && widgetGesture.dragging && widgetGesture.id === id) {
                element.classList.toggle("is-compact", widgetGesture.initial.colSpan === 1 || widgetGesture.initial.rowSpan === 1);
                return;
            }
            var stage = S.$("#homeWidgetsPage" + pageIndex);
            if (!stage) return;
            stage.appendChild(element);
            element.dataset.page = String(pageIndex);
            var gap = 8;
            var cellWidth = (stage.clientWidth - gap * (WIDGET_COLS - 1)) / WIDGET_COLS;
            var cellHeight = (stage.clientHeight - gap * (WIDGET_ROWS - 1)) / WIDGET_ROWS;
            var width = layout.colSpan * cellWidth + (layout.colSpan - 1) * gap;
            var height = layout.rowSpan * cellHeight + (layout.rowSpan - 1) * gap;
            element.style.left = (layout.col - 1) * (cellWidth + gap) + "px";
            element.style.top = (layout.row - 1) * (cellHeight + gap) + "px";
            element.style.width = width + "px";
            element.style.height = height + "px";
            element.classList.toggle("is-compact", layout.colSpan === 1 || layout.rowSpan === 1);
            element.classList.toggle("is-single-cell", layout.colSpan === 1 && layout.rowSpan === 1);
            element.classList.toggle("is-short", height <= 100);
            element.classList.toggle("is-narrow", width <= 105);
            element.classList.toggle("is-landscape", width > height);
            element.classList.toggle("is-portrait", height > width);
        });
    }
    function nearest(values, value) {
        return values.reduce(function(best, current) {
            return Math.abs(current - value) < Math.abs(best - value) ? current : best;
        }, values[0]);
    }
    function snapPosition(x, y) {
        return {
            x: nearest(GRID_X, x),
            y: nearest(GRID_Y, y)
        };
    }
    function snapInsideGrid(grid, element, x, y) {
        var rect = grid.getBoundingClientRect();
        var itemRect = element.getBoundingClientRect();
        var maxX = Math.max(0, 100 - itemRect.width / rect.width * 100);
        var maxY = Math.max(0, 100 - itemRect.height / rect.height * 100);
        var xAnchors = GRID_X.filter(function(value) {
            return value <= maxX;
        });
        var yAnchors = GRID_Y.filter(function(value) {
            return value <= maxY;
        });
        if (!xAnchors.length) xAnchors = [ 0 ];
        if (!yAnchors.length) yAnchors = [ 0 ];
        return {
            x: nearest(xAnchors, x),
            y: nearest(yAnchors, y)
        };
    }
    function slotKey(item) {
        return item.x + ":" + item.y;
    }
    function nextFreePosition(pageIndex, page, wanted, ignoredId, widgetPages) {
        widgetPages = widgetPages || state && state.widgets || [ {}, {} ];
        var occupied = {};
        page.forEach(function(item) {
            if (item.appId !== ignoredId) occupied[slotKey(item)] = true;
        });
        var candidates = [];
        GRID_Y.forEach(function(y) {
            GRID_X.forEach(function(x) {
                var candidate = {
                    x,
                    y
                };
                candidate.distance = Math.pow(x - wanted.x, 2) + Math.pow(y - wanted.y, 2);
                candidates.push(candidate);
            });
        });
        candidates.sort(function(a, b) {
            return a.distance - b.distance;
        });
        for (var i = 0; i < candidates.length; i++) {
            var cell = appCell(candidates[i]);
            if (!occupied[slotKey(candidates[i])] && !widgetCoversCell(widgetPages[pageIndex] || {}, cell)) {
                return {
                    x: candidates[i].x,
                    y: candidates[i].y
                };
            }
        }
        return wanted;
    }
    function appPositionAvailable(pageIndex, page, position, ignoredId, widgetPages) {
        var key = slotKey(position);
        return !page.some(function(item) {
            return item.appId !== ignoredId && slotKey(item) === key;
        }) && !widgetCoversCell((widgetPages || state.widgets)[pageIndex] || {}, appCell(position));
    }
    function shiftIntoPosition(pageIndex, page, wanted, movingId) {
        var collision = null;
        page.forEach(function(item) {
            if (item.appId !== movingId && item.x === wanted.x && item.y === wanted.y) collision = item;
        });
        if (!collision) return;
        var replacement = nextFreePosition(pageIndex, page, {
            x: collision.x,
            y: collision.y
        }, collision.appId);
        collision.x = replacement.x;
        collision.y = replacement.y;
    }
    function appBadge(id) {
        return S.notifications && S.notifications.badgeCount ? S.notifications.badgeCount(id) : 0;
    }
    function makeButton(id, index, place) {
        var item = app(id);
        if (!item) return null;
        var box = S.el("span", {
            className: "icon__box" + (item.image ? " icon__box--image" : "")
        });
        var image;
        if (item.image) {
            image = S.el("img", {
                attrs: {
                    src: item.image,
                    alt: "",
                    draggable: "false"
                }
            });
            image.draggable = false;
            image.addEventListener("dragstart", function(event) {
                event.preventDefault();
            });
            image.addEventListener("error", function() {
                if (image.parentNode) image.parentNode.removeChild(image);
                box.classList.remove("icon__box--image");
                box.insertAdjacentHTML("afterbegin", S.icon(item.icon));
            });
            box.appendChild(image);
        } else box.innerHTML = S.icon(item.icon);
        box.appendChild(S.el("span", {
            className: "icon__ripple"
        }));
        var badge = S.el("span", {
            className: "icon__badge"
        });
        var count = appBadge(id);
        if (count) {
            badge.textContent = count > 9 ? "9+" : String(count);
            badge.classList.add("is-on");
        }
        box.appendChild(badge);
        var button = S.el("button", {
            className: "icon home-item home-item--app" + (place === "dock" ? " home__dock-item" : ""),
            dataset: {
                action: "open-app",
                app: id,
                homeType: place === "dock" ? "dock" : "app",
                homeId: id
            },
            attrs: {
                type: "button",
                draggable: "false",
                "aria-label": item.launchable === false ? item.name + ", indisponível" : item.name,
                "aria-disabled": item.launchable === false ? "true" : "false"
            },
            style: "--icon-accent:" + item.accent + ";--i:" + index
        }, [ box, S.el("span", {
            className: "icon__label",
            text: item.name
        }) ]);
        button.disabled = item.launchable === false;
        button.draggable = false;
        button.addEventListener("dragstart", function(event) {
            event.preventDefault();
        });
        return button;
    }
    function locate(id) {
        for (var page = 0; page < 2; page++) {
            for (var index = 0; index < state.pages[page].length; index++) {
                if (state.pages[page][index].appId === id) return {
                    page,
                    index,
                    item: state.pages[page][index]
                };
            }
        }
        return null;
    }
    function render() {
        grids.forEach(function(grid, page) {
            grid.textContent = "";
            state.pages[page].forEach(function(item, index) {
                var button = makeButton(item.appId, index, "page");
                if (!button) return;
                button.style.left = item.x + "%";
                button.style.top = item.y + "%";
                grid.appendChild(button);
            });
        });
        dock.textContent = "";
        state.dock.forEach(function(id, index) {
            var button = makeButton(id, index, "dock");
            if (button) dock.appendChild(button);
        });
        if (S.network && S.network.refreshIcons) S.network.refreshIcons();
        if (S.secretInstall && S.secretInstall.refreshIcon) S.secretInstall.refreshIcon();
    }
    function isEditing() {
        return editing;
    }
    function setEditing(value) {
        editing = !!value;
        if (editing && S.home && S.home.cancelPagerGesture) {
            S.home.cancelPagerGesture(press && press.pointerId);
        }
        home.classList.toggle("is-editing", editing);
        editDone.hidden = !editing;
        if (!editing) save();
    }
    function finishEdit() {
        clearTimeout(press && press.readyTimer);
        clearTimeout(press && press.editTimer);
        if (widgetGesture) {
            clearTimeout(widgetGesture.readyTimer);
            clearTimeout(widgetGesture.editTimer);
            if (widgetGesture.dragging) widgetGesture.widget.classList.remove("is-widget-moving", "is-widget-drag-source");
            if (widgetGesture.preview && widgetGesture.preview.parentNode) widgetGesture.preview.parentNode.removeChild(widgetGesture.preview);
            state.widgets = copyWidgetPages(widgetGesture.baselineWidgets);
            state.pages = copyAppPages(widgetGesture.baselinePages);
            widgetGesture = null;
            renderWidgetLayout();
            renderAppPositions();
        }
        clearTimeout(edgeTimer);
        edgePage = null;
        if (preview && preview.parentNode) preview.parentNode.removeChild(preview);
        restoreDisplacedPreview();
        if (press && press.item) press.item.classList.remove("is-dragging-source");
        preview = null;
        press = null;
        setEditing(false);
    }
    function swallowClick() {
        function capture(event) {
            document.removeEventListener("click", capture, true);
            clearTimeout(swallowTimer);
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        document.addEventListener("click", capture, true);
        clearTimeout(swallowTimer);
        swallowTimer = setTimeout(function() {
            document.removeEventListener("click", capture, true);
        }, 450);
    }
    function startPress(event) {
        if (event.button !== undefined && event.button > 0) return;
        var item = event.target.closest ? event.target.closest(".home-item--app:not(.home__dock-item)") : null;
        if (!item) return;
        clearTimeout(press && press.readyTimer);
        clearTimeout(press && press.editTimer);
        press = {
            item,
            id: item.dataset.app,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            moved: false,
            dragging: false,
            ready: editing
        };
        if (editing) return;
        press.readyTimer = setTimeout(function() {
            if (!press || press.moved) return;
            press.ready = true;
            S.haptic([ 18, 24, 18 ]);
        }, HOLD_TO_DRAG);
        press.editTimer = setTimeout(function() {
            if (!press || press.moved) return;
            press.longEdit = true;
            setEditing(true);
            S.haptic([ 18, 24, 18 ]);
        }, HOLD_TO_EDIT);
    }
    function beginDrag(event) {
        if (!press || press.dragging) return;
        setEditing(true);
        press.dragging = true;
        clearTimeout(press.readyTimer);
        clearTimeout(press.editTimer);
        press.item.classList.add("is-dragging-source");
        preview = press.item.cloneNode(true);
        preview.classList.add("home-drag-preview");
        preview.classList.remove("is-dragging-source");
        preview.removeAttribute("data-action");
        preview.style.width = press.item.getBoundingClientRect().width + "px";
        preview.style.height = press.item.getBoundingClientRect().height + "px";
        S.$("#homeViewport").appendChild(preview);
        movePreview(event);
    }
    function movePreview(event) {
        if (!preview || !press) return;
        press.lastEvent = event;
        var grid = grids[S.home.currentPage()];
        var rect = grid.getBoundingClientRect();
        var itemRect = press.item.getBoundingClientRect();
        var x = (event.clientX - rect.left - itemRect.width / 2) / rect.width * 100;
        var y = (event.clientY - rect.top - itemRect.height / 2) / rect.height * 100;
        var snapped = snapInsideGrid(grid, press.item, x, y);
        var pageIndex = S.home.currentPage();
        if (widgetCoversCell(state.widgets[pageIndex] || {}, appCell(snapped))) {
            snapped = nextFreePosition(pageIndex, state.pages[pageIndex], snapped);
        }
        press.xPercent = snapped.x;
        press.yPercent = snapped.y;
        previewCollision(snapped);
        var viewport = S.$("#homeViewport");
        var viewportRect = viewport.getBoundingClientRect();
        var left = rect.left + rect.width * snapped.x / 100 - viewportRect.left;
        var top = rect.top + rect.height * snapped.y / 100 - viewportRect.top;
        left = Math.max(0, Math.min(viewport.clientWidth - preview.offsetWidth, left));
        top = Math.max(0, Math.min(viewport.clientHeight - preview.offsetHeight, top));
        preview.style.left = left + "px";
        preview.style.top = top + "px";
        var nextPage = null;
        if (event.clientX < viewportRect.left + 24 && S.home.currentPage() > 0) nextPage = S.home.currentPage() - 1;
        if (event.clientX > viewportRect.right - 24 && S.home.currentPage() < 1) nextPage = S.home.currentPage() + 1;
        if (nextPage !== edgePage) {
            clearTimeout(edgeTimer);
            edgeTimer = 0;
            edgePage = nextPage;
            if (nextPage !== null) {
                edgeTimer = setTimeout(function() {
                    if (!press || !press.dragging || edgePage === null) return;
                    S.home.page(edgePage);
                    if (press.lastEvent) movePreview(press.lastEvent);
                }, 500);
            }
        }
    }
    function restoreDisplacedPreview() {
        if (!displacedPreview) return;
        if (displacedPreview.element.isConnected) {
            displacedPreview.element.style.left = displacedPreview.left;
            displacedPreview.element.style.top = displacedPreview.top;
            displacedPreview.element.classList.remove("is-being-displaced");
        }
        displacedPreview = null;
    }
    function previewCollision(wanted) {
        var pageIndex = S.home.currentPage();
        var page = state.pages[pageIndex];
        var collision = page.filter(function(item) {
            return item.appId !== press.id && item.x === wanted.x && item.y === wanted.y;
        })[0];
        if (!collision || displacedPreview && displacedPreview.id !== collision.appId) {
            restoreDisplacedPreview();
        }
        if (!collision) return;
        var element = grids[pageIndex].querySelector('[data-app="' + collision.appId + '"]');
        if (!element) return;
        if (displacedPreview && displacedPreview.id === collision.appId) return;
        var newPosition = nextFreePosition(pageIndex, page, {
            x: collision.x,
            y: collision.y
        }, press.id);
        displacedPreview = {
            id: collision.appId,
            element,
            left: element.style.left,
            top: element.style.top
        };
        element.classList.add("is-being-displaced");
        element.style.left = newPosition.x + "%";
        element.style.top = newPosition.y + "%";
    }
    function startWidgetGesture(event) {
        if (event.button !== undefined && event.button > 0) return;
        var widget = event.target.closest ? event.target.closest(".home-widget[data-widget]") : null;
        if (!widget) return;
        var resizeHandle = event.target.closest(".home-widget__resize");
        if (resizeHandle && !editing) return;
        var id = widget.dataset.widget;
        var pageIndex = Number(widget.dataset.page) || 0;
        var layout = state.widgets[pageIndex][id];
        if (!layout) return;
        event.preventDefault();
        var widgetRect = widget.getBoundingClientRect();
        var stageRect = S.$("#homeWidgetsPage" + pageIndex).getBoundingClientRect();
        widgetGesture = {
            id,
            widget,
            page: pageIndex,
            initialPage: pageIndex,
            targetPage: pageIndex,
            pointerId: event.pointerId,
            mode: resizeHandle ? "resize" : "move",
            moved: false,
            ready: !!resizeHandle || editing,
            dragging: !!resizeHandle,
            startX: event.clientX,
            startY: event.clientY,
            grabColOffset: (event.clientX - widgetRect.left) / (stageRect.width / WIDGET_COLS),
            grabRowOffset: (event.clientY - widgetRect.top) / (stageRect.height / WIDGET_ROWS),
            initial: {
                col: layout.col,
                row: layout.row,
                colSpan: layout.colSpan,
                rowSpan: layout.rowSpan
            },
            baselineWidgets: copyWidgetPages(state.widgets),
            baselinePages: copyAppPages(state.pages)
        };
        var gesture = widgetGesture;
        if (resizeHandle) {
            setEditing(true);
            widget.classList.add("is-widget-moving");
            return;
        }
        if (editing) return;
        gesture.readyTimer = setTimeout(function() {
            if (widgetGesture !== gesture || gesture.moved) return;
            gesture.ready = true;
            S.haptic([ 18, 24, 18 ]);
        }, HOLD_TO_DRAG);
        gesture.editTimer = setTimeout(function() {
            if (widgetGesture !== gesture || gesture.moved) return;
            gesture.longEdit = true;
            setEditing(true);
            S.haptic([ 18, 24, 18 ]);
        }, HOLD_TO_EDIT);
    }
    function moveWidgetGesture(event) {
        if (!widgetGesture || event.pointerId !== widgetGesture.pointerId) return false;
        var gesture = widgetGesture;
        var dx = event.clientX - gesture.startX;
        var dy = event.clientY - gesture.startY;
        if (Math.abs(dx) > SLOP || Math.abs(dy) > SLOP) gesture.moved = true;
        if (gesture.mode === "move" && gesture.moved && !gesture.ready) {
            clearTimeout(gesture.readyTimer);
            clearTimeout(gesture.editTimer);
            event.preventDefault();
            return true;
        }
        if (gesture.mode === "move" && gesture.moved && gesture.ready && !gesture.dragging) {
            beginWidgetDrag(gesture, event);
        }
        if (!gesture.dragging) return true;
        var stage = S.$("#homeWidgetsPage" + gesture.targetPage);
        var rect = stage.getBoundingClientRect();
        var initial = gesture.initial;
        gesture.lastEvent = event;
        var col = initial.col;
        var row = initial.row;
        var colSpan = initial.colSpan;
        var rowSpan = initial.rowSpan;
        if (gesture.mode === "move") {
            var pointerCol = (event.clientX - rect.left) / (rect.width / WIDGET_COLS);
            var pointerRow = (event.clientY - rect.top) / (rect.height / WIDGET_ROWS);
            col = Math.max(1, Math.min(WIDGET_COLS - colSpan + 1, Math.floor(pointerCol - gesture.grabColOffset) + 1));
            row = Math.max(1, Math.min(WIDGET_ROWS - rowSpan + 1, Math.floor(pointerRow - gesture.grabRowOffset) + 1));
        } else {
            var wantedColSpan = Math.max(1, Math.min(WIDGET_COLS - initial.col + 1, initial.colSpan + Math.round(dx / (rect.width / WIDGET_COLS))));
            var wantedRowSpan = Math.max(1, Math.min(WIDGET_ROWS - initial.row + 1, initial.rowSpan + Math.round(dy / (rect.height / WIDGET_ROWS))));
            colSpan = wantedColSpan;
            rowSpan = wantedRowSpan;
        }
        var desired = {
            col,
            row,
            colSpan,
            rowSpan
        };
        var placementApplied = applyWidgetPreview(gesture, desired);
        if (gesture.mode === "move") {
            positionWidgetPreview(gesture.targetPage, placementApplied ? desired : gesture.initial);
        }
        if (gesture.mode === "move") updateWidgetEdge(event);
        event.preventDefault();
        return true;
    }
    function beginWidgetDrag(gesture, event) {
        gesture.dragging = true;
        clearTimeout(gesture.readyTimer);
        clearTimeout(gesture.editTimer);
        setEditing(true);
        gesture.widget.classList.add("is-widget-moving", "is-widget-drag-source");
        gesture.preview = gesture.widget.cloneNode(true);
        gesture.preview.classList.remove("is-widget-moving", "is-widget-drag-source");
        gesture.preview.classList.add("home-widget-drag-preview");
        gesture.preview.removeAttribute("data-widget");
        var handle = gesture.preview.querySelector(".home-widget__resize");
        if (handle) handle.remove();
        var rect = gesture.widget.getBoundingClientRect();
        gesture.preview.style.width = rect.width + "px";
        gesture.preview.style.height = rect.height + "px";
        S.$("#homeViewport").appendChild(gesture.preview);
        gesture.lastEvent = event;
    }
    function positionWidgetPreview(pageIndex, layout) {
        if (!widgetGesture || !widgetGesture.preview) return;
        var stage = S.$("#homeWidgetsPage" + pageIndex);
        var stageRect = stage.getBoundingClientRect();
        var viewport = S.$("#homeViewport");
        var viewportRect = viewport.getBoundingClientRect();
        var columnGap = 8;
        var rowGap = 8;
        var cellWidth = (stage.clientWidth - columnGap * (WIDGET_COLS - 1)) / WIDGET_COLS;
        var cellHeight = (stage.clientHeight - rowGap * (WIDGET_ROWS - 1)) / WIDGET_ROWS;
        var left = stageRect.left + (layout.col - 1) * (cellWidth + columnGap) - viewportRect.left;
        var top = stageRect.top + (layout.row - 1) * (cellHeight + rowGap) - viewportRect.top;
        widgetGesture.preview.style.left = Math.max(0, Math.min(viewport.clientWidth - widgetGesture.preview.offsetWidth, left)) + "px";
        widgetGesture.preview.style.top = Math.max(0, Math.min(viewport.clientHeight - widgetGesture.preview.offsetHeight, top)) + "px";
    }
    function applyWidgetPreview(gesture, desired) {
        state.widgets = copyWidgetPages(gesture.baselineWidgets);
        state.pages = copyAppPages(gesture.baselinePages);
        state.widgets.forEach(function(widgets) {
            delete widgets[gesture.id];
        });
        var pageIndex = gesture.targetPage;
        var pageWidgets = state.widgets[pageIndex];
        pageWidgets[gesture.id] = desired;
        var placementValid = true;
        Object.keys(pageWidgets).forEach(function(id) {
            if (id === gesture.id || !widgetsOverlap(desired, pageWidgets[id])) return;
            var displaced = pageWidgets[id];
            delete pageWidgets[id];
            var next = nearestWidgetPosition(pageWidgets, displaced);
            if (widgetPositionAvailable(pageWidgets, next)) {
                pageWidgets[id] = next;
                return;
            }
            var otherPage = pageIndex === 0 ? 1 : 0;
            var otherLayouts = state.widgets[otherPage];
            var otherPosition = nearestWidgetPosition(otherLayouts, displaced, null, otherPage, state.pages);
            if (widgetPositionAvailable(otherLayouts, otherPosition, null, otherPage, state.pages)) {
                otherLayouts[id] = otherPosition;
            } else placementValid = false;
        });
        if (!placementValid) {
            state.widgets = copyWidgetPages(gesture.baselineWidgets);
            state.pages = copyAppPages(gesture.baselinePages);
            gesture.targetPage = gesture.initialPage;
            S.home.page(gesture.initialPage);
            renderWidgetLayout();
            renderAppPositions();
            return false;
        }
        var currentApps = state.pages[pageIndex];
        for (var appIndex = currentApps.length - 1; appIndex >= 0; appIndex--) {
            var item = currentApps[appIndex];
            if (!widgetCoversCell(pageWidgets, appCell(item))) continue;
            var free = nextFreePosition(pageIndex, currentApps, item, item.appId);
            if (appPositionAvailable(pageIndex, currentApps, free, item.appId)) {
                item.x = free.x;
                item.y = free.y;
                continue;
            }
            var otherAppPage = pageIndex === 0 ? 1 : 0;
            var otherFree = nextFreePosition(otherAppPage, state.pages[otherAppPage], item, item.appId);
            if (!appPositionAvailable(otherAppPage, state.pages[otherAppPage], otherFree, item.appId)) {
                placementValid = false;
                continue;
            }
            currentApps.splice(appIndex, 1);
            item.x = otherFree.x;
            item.y = otherFree.y;
            state.pages[otherAppPage].push(item);
        }
        if (!placementValid) {
            state.widgets = copyWidgetPages(gesture.baselineWidgets);
            state.pages = copyAppPages(gesture.baselinePages);
            gesture.targetPage = gesture.initialPage;
            S.home.page(gesture.initialPage);
            renderWidgetLayout();
            renderAppPositions();
            return false;
        }
        renderWidgetLayout();
        renderAppPositions();
        return true;
    }
    function updateWidgetEdge(event) {
        var viewport = S.$("#homeViewport").getBoundingClientRect();
        var nextPage = null;
        if (event.clientX < viewport.left + 24 && S.home.currentPage() > 0) nextPage = S.home.currentPage() - 1;
        if (event.clientX > viewport.right - 24 && S.home.currentPage() < 1) nextPage = S.home.currentPage() + 1;
        if (nextPage === edgePage) return;
        clearTimeout(edgeTimer);
        edgePage = nextPage;
        if (nextPage === null) return;
        edgeTimer = setTimeout(function() {
            if (!widgetGesture || !widgetGesture.dragging || edgePage === null) return;
            widgetGesture.targetPage = edgePage;
            S.home.page(edgePage);
            if (widgetGesture.lastEvent) moveWidgetGesture(widgetGesture.lastEvent);
        }, 500);
    }
    function finishWidgetGesture(event, canceled) {
        if (!widgetGesture || event.pointerId !== widgetGesture.pointerId) return false;
        var gesture = widgetGesture;
        clearTimeout(gesture.readyTimer);
        clearTimeout(gesture.editTimer);
        if (gesture.dragging) gesture.widget.classList.remove("is-widget-moving", "is-widget-drag-source");
        if (canceled) {
            state.widgets = copyWidgetPages(gesture.baselineWidgets);
            state.pages = copyAppPages(gesture.baselinePages);
        }
        clearTimeout(edgeTimer);
        edgeTimer = 0;
        edgePage = null;
        if (gesture.preview && gesture.preview.parentNode) gesture.preview.parentNode.removeChild(gesture.preview);
        widgetGesture = null;
        renderWidgetLayout();
        renderAppPositions();
        save();
        return true;
    }
    function movePress(event) {
        if (moveWidgetGesture(event)) return;
        if (!press || event.pointerId !== press.pointerId) return;
        var dx = event.clientX - press.x;
        var dy = event.clientY - press.y;
        if (Math.abs(dx) > SLOP || Math.abs(dy) > SLOP) press.moved = true;
        if (press.moved && !press.ready) {
            clearTimeout(press.readyTimer);
            clearTimeout(press.editTimer);
        }
        if (!press.dragging && press.moved && press.ready) beginDrag(event);
        if (press.dragging) {
            movePreview(event);
            event.preventDefault();
        }
    }
    function finishPress(event) {
        if (finishWidgetGesture(event, event.type === "pointercancel")) return;
        if (!press || event.pointerId !== press.pointerId) return;
        clearTimeout(press.readyTimer);
        clearTimeout(press.editTimer);
        if (press.dragging) {
            var page = S.home.currentPage();
            var old = locate(press.id);
            if (old) {
                var moved = old.item;
                var destination = state.pages[page];
                if (old.page !== page) {
                    state.pages[old.page].splice(old.index, 1);
                    destination = state.pages[page];
                } else {
                    destination.splice(old.index, 1);
                }
                var snapped = snapPosition(press.xPercent, press.yPercent);
                moved.x = snapped.x;
                moved.y = snapped.y;
                destination.push(moved);
                shiftIntoPosition(page, destination, snapped, moved.appId);
                save();
                render();
            }
            displacedPreview = null;
            if (preview && preview.parentNode) preview.parentNode.removeChild(preview);
            press.item.classList.remove("is-dragging-source");
            preview = null;
            swallowClick();
        } else if (press.moved || press.ready || press.longEdit) swallowClick();
        clearTimeout(edgeTimer);
        edgeTimer = 0;
        edgePage = null;
        press = null;
    }
    function init() {
        home = S.$("#home");
        grids = [ S.$("#homeGrid"), S.$("#homeGridSecondary") ];
        dock = S.$("#homeDock");
        editDone = S.$("#homeEditDone");
        load();
        render();
        renderWidgetLayout();
        home.addEventListener("pointerdown", startPress);
        home.addEventListener("pointerdown", startWidgetGesture);
        window.addEventListener("resize", renderWidgetLayout);
        document.addEventListener("pointermove", movePress, {
            passive: false
        });
        document.addEventListener("pointerup", finishPress);
        document.addEventListener("pointercancel", finishPress);
        home.addEventListener("dragstart", function(event) {
            event.preventDefault();
        });
        home.addEventListener("contextmenu", function(event) {
            if (event.target.closest && event.target.closest(".home-item")) event.preventDefault();
        });
    }
    S.homeLayout = {
        init,
        isEditing,
        finishEdit,
        revealApp: function(id) {
            if (!app(id) || !app(id).hiddenUntilUnlocked) return false;
            revealedApps[id] = true;
            if (!locate(id)) {
                var position = nextFreePosition(0, state.pages[0], {
                    x: 50,
                    y: 50
                }, null, state.widgets);
                state.pages[0].push(entry(id, position.x, position.y));
            }
            render();
            save();
            return true;
        }
    };
})(window.Celular = window.Celular || {});

(function(M) {
    "use strict";
    var PATHS = {
        wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>' + '<path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/>',
        bluetooth: '<path d="m7 7 10 10-5 5V2l5 5L7 17"/>',
        volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
        vibrate: '<path d="M2 9.5v5M5 7.5v9M19 7.5v9M22 9.5v5"/>' + '<rect x="8" y="4" width="8" height="16" rx="1.5"/>',
        sun: '<circle cx="12" cy="12" r="4.2"/>' + '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
        gear: '<circle cx="12" cy="12" r="3.2"/>' + '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
        lock: '<rect x="3.5" y="10.5" width="17" height="10.5" rx="2.4"/>' + '<path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/>',
        chevron: '<path d="m9 18 6-6-6-6"/>',
        warn: '<circle cx="12" cy="12" r="9.2"/>' + '<path d="M12 7.5v5.2M12 16.4h.01"/>',
        info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 11v5.4M12 7.6h.01"/>'
    };
    var WRAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
    M.icon = function(name) {
        return PATHS[name] ? WRAP + PATHS[name] + "</svg>" : "";
    };
})(window.Cfg = window.Cfg || {});
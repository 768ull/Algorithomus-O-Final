(function(M) {
    "use strict";
    var contacts = {};
    var logs = [];
    M.data = {
        load: function(scenario) {
            contacts = {};
            if (!scenario || !scenario.contacts) return;
            Object.keys(scenario.contacts).forEach(function(id) {
                var contact = scenario.contacts[id];
                contacts[id] = {
                    id,
                    name: contact.name,
                    avatar: contact.avatar,
                    status: contact.status,
                    number: contact.number || ""
                };
            });
        },
        loadEmergencyContacts: function(items) {
            contacts = {};
            (items || []).forEach(function(item) {
                contacts[item.number] = {
                    id: item.number,
                    name: item.name,
                    avatar: "🚨",
                    status: "",
                    number: item.number
                };
            });
        },
        contacts: function() {
            return Object.keys(contacts).map(function(id) {
                return contacts[id];
            });
        },
        get: function(id) {
            return contacts[id] || null;
        },
        number: function(id) {
            return contacts[id] && contacts[id].number || "";
        },
        addLog: function(entry) {
            logs.unshift(entry);
            if (logs.length > 40) logs.pop();
        },
        logs: function() {
            return logs;
        }
    };
})(window.Tel = window.Tel || {});
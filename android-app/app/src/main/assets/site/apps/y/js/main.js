(function(M) {
    "use strict";
    var TABS = [ "home", "explore", "notif", "profile" ];
    var TITLES = {
        home: "Início",
        explore: "Explorar",
        notif: "Notificações",
        profile: "Perfil"
    };
    var views = {};
    var topbarBack = null;
    var topbarLogo = null;
    var topbarTitle = null;
    var topbarMe = null;
    var fab = null;
    var tabbar = null;
    var notifBadge = null;
    var currentTab = "home";
    var profileReturn = null;
    var viewTransitionToken = 0;
    var activeViewAnimations = [];
    M.focused = false;
    var connected=false, scenario=null, loaded=false, loading=null;
    function loadOnline(){
        if(!connected||!scenario||loaded||loading)return;
        loading=M.data.load(scenario).then(function(){loaded=true;M.feed.render();M.main.paintMe();M.main.refreshBadge();setInternet(connected);}).catch(function(){M.$('#offline').hidden=false;M.$('#app').hidden=true;}).finally(function(){loading=null;});
    }
    M.main = {
        init: function() {
            M.feed.init();
            M.composer.init();
            M.profile.init();
            topbarBack = M.$("#topbarBack");
            topbarLogo = M.$("#topbarLogo");
            topbarTitle = M.$("#topbarTitle");
            topbarMe = M.$("#topbarMe");
            fab = M.$("#fab");
            tabbar = M.$("#tabbar");
            notifBadge = M.$("#notifBadge");
            TABS.forEach(function(tab) {
                views[tab] = M.$("#view-" + tab);
            });
            document.addEventListener("click", onClick);
            M.host.on(function(message) {
                if (message.type === "app:state") return M.main.onState(message.name);
                if (message.type !== "app:event") return;
                switch (message.name) {
                  case "wifi-state":
                    setInternet(message.payload && message.payload.connected);
                    break;

                  case "scenario":
                    scenario=message.payload;loadOnline();
                    break;

                  case "puzzle-complete":
                    profileReturn = null;
                    M.profile.open(M.data.meId(), "drafts");
                    showTab("profile");
                    break;

                  case "back":
                    {
                        var handled = M.main.handleBack();
                        M.host.emit("back-result", {
                            handled
                        });
                        break;
                    }
                }
            });
            M.main.paintMe();
            showTab("home");
            M.host.ready();
        },
        onState: function(state) {
            M.focused = state === "open";
            if(M.focused)loadOnline();
        },
        paintMe: function() {
            var me = M.data.me();
            if (me) M.paintAvatar(topbarMe, me.avatar);
        },
        refreshBadge: function() {
            var count = M.data.unreadNotifications();
            notifBadge.hidden = count === 0;
            notifBadge.textContent = count > 9 ? "9+" : String(count);
        },
        handleBack: function() {
            if (M.composer.isOpen()) {
                M.composer.close();
                return true;
            }
            if (M.profile.isDetailOpen()) {
                M.profile.closeDetail();
                return true;
            }
            if (currentTab === "profile") {
                var target = profileReturn || "home";
                profileReturn = null;
                showTab(target);
                return true;
            }
            if (currentTab !== "home") {
                showTab("home");
                return true;
            }
            return false;
        },
        go: function(tab) {
            profileReturn = null;
            showTab(tab);
        }
    };
    function setInternet(on) {
        connected=!!on;
        var offline = M.$("#offline");
        var app = M.$("#app");
        offline.hidden = connected&&loaded;
        app.hidden = !connected||!loaded;
        if(connected)loadOnline();
    }
    function showTab(tab) {
        if (TABS.indexOf(tab) === -1) tab = "home";
        if (M.profile.isDetailOpen()) M.profile.closeDetail();
        var previousTab = currentTab;
        var previousView = views[previousTab];
        var nextView = views[tab];
        var changed = previousTab !== tab;
        if (changed) {
            viewTransitionToken++;
            activeViewAnimations.forEach(function(animation) {
                animation.cancel();
            });
            activeViewAnimations = [];
            TABS.forEach(function(name) {
                views[name].style.transform = "";
                views[name].style.opacity = "";
                views[name].style.zIndex = "";
                views[name].hidden = name !== tab && name !== previousTab;
            });
            nextView.hidden = false;
            if (previousView && previousView !== nextView && typeof nextView.animate === "function") {
                var transitionId = viewTransitionToken;
                var direction = TABS.indexOf(tab) >= TABS.indexOf(previousTab) ? 1 : -1;
                nextView.style.zIndex = "2";
                previousView.style.zIndex = "1";
                var enter = nextView.animate([ {
                    transform: "translate3d(" + direction * 100 + "%, 0, 0)",
                    opacity: .96
                }, {
                    transform: "translate3d(0, 0, 0)",
                    opacity: 1
                } ], {
                    duration: 460,
                    easing: "cubic-bezier(0.2, 0.75, 0.25, 1)"
                });
                var leave = previousView.animate([ {
                    transform: "translate3d(0, 0, 0)",
                    opacity: 1
                }, {
                    transform: "translate3d(" + direction * -22 + "%, 0, 0)",
                    opacity: .72
                } ], {
                    duration: 460,
                    easing: "cubic-bezier(0.2, 0.75, 0.25, 1)"
                });
                activeViewAnimations = [ enter, leave ];
                enter.onfinish = function() {
                    if (transitionId !== viewTransitionToken) return;
                    previousView.hidden = true;
                    TABS.forEach(function(name) {
                        views[name].style.transform = "";
                        views[name].style.opacity = "";
                        views[name].style.zIndex = "";
                    });
                    activeViewAnimations = [];
                };
            } else {
                TABS.forEach(function(name) {
                    views[name].hidden = name !== tab;
                });
            }
        }
        currentTab = tab;
        M.$$(".tab", tabbar).forEach(function(button) {
            button.classList.toggle("is-active", button.dataset.tab === tab);
        });
        fab.hidden = true;
        updateTopbar(tab);
        if (tab === "explore") M.feed.renderExplore();
        if (tab === "notif") {
            M.feed.renderNotifications();
            notifBadge.hidden = true;
        }
    }
    function updateTopbar(tab) {
        if (tab === "profile") {
            var account = M.data.account(M.profile.accountId());
            topbarLogo.hidden = true;
            topbarTitle.textContent = account ? account.name : "Perfil";
            topbarBack.hidden = !profileReturn;
        } else {
            topbarLogo.hidden = false;
            topbarTitle.textContent = TITLES[tab] || "Y";
            topbarBack.hidden = true;
        }
    }
    function openProfile(accountId) {
        if (!accountId) return;
        if (M.profile.isDetailOpen()) M.profile.closeDetail();
        profileReturn = currentTab;
        M.profile.open(accountId);
        showTab("profile");
    }
    function onClick(event) {
        var actionEl = event.target.closest ? event.target.closest("[data-action]") : null;
        if (actionEl) {
            run(actionEl.dataset.action, actionEl);
            return;
        }
        var tabEl = event.target.closest ? event.target.closest(".tab") : null;
        if (tabEl) {
            if (tabEl.dataset.tab === "profile") {
                profileReturn = null;
                M.profile.open(M.data.meId());
            }
            showTab(tabEl.dataset.tab);
            return;
        }
        var tweet = event.target.closest ? event.target.closest(".tweet") : null;
        if (tweet && tweet.dataset.open) M.profile.openDetail(tweet.dataset.post);
    }
    function run(action, el) {
        switch (action) {
          case "back":
            M.main.handleBack();
            break;

          case "open-my-profile":
            openProfile(M.data.meId());
            break;

          case "open-profile":
            openProfile(el.dataset.account);
            break;

          case "open-trend":
            openProfile(el.dataset.account);
            break;

          case "profile-tab":
            M.profile.setTab ? M.profile.setTab(el.dataset.tab) : null;
            break;

          case "open-detail":
            M.profile.openDetail(el.dataset.post);
            break;

          case "close-detail":
            M.profile.closeDetail();
            break;

          case "like":
            M.data.toggleLike(el.dataset.post);
            M.feed.repaint(el.dataset.post);
            M.profile.refreshStats(el.dataset.post);
            break;

          case "repost":
            M.data.toggleRepost(el.dataset.post);
            M.feed.repaint(el.dataset.post);
            M.profile.refreshStats(el.dataset.post);
            break;

          case "follow":
            M.data.toggleFollow(el.dataset.account);
            if (currentTab === "profile") M.profile.render();
            if (currentTab === "explore") M.feed.renderExplore();
            break;

          case "open-compose":
            break;

          case "close-compose":
            M.composer.close();
            break;

          case "publish":
            break;

          case "send-reply":
            M.composer.sendReply();
            break;

          case "edit-profile":
            break;
        }
    }
    document.addEventListener("DOMContentLoaded", function() {
        M.main.init();
    });
})(window.Y = window.Y || {});

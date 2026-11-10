(function(M) {
    "use strict";
    var viewEl = null;
    var profileEl = null;
    var detailView = null;
    var detailEl = null;
    var pullStartY = null;
    var pullMessageTimer = null;
    var detailPostId = null;
    var clueScrollFrame = 0;
    var detailEnterAnimation = null;
    var current = null;
    var currentTab = "posts";
    M.profile = {
        init: function() {
            viewEl = M.$("#view-profile");
            profileEl = M.$("#profile");
            detailView = M.$("#view-detail");
            detailEl = M.$("#detail");
            detailEl.addEventListener("touchstart", function(event) {
                if (event.touches.length === 1) pullStartY = event.touches[0].clientY;
            }, {
                passive: true
            });
            detailEl.addEventListener("touchend", function(event) {
                if (pullStartY === null) return;
                var delta = event.changedTouches[0].clientY - pullStartY;
                pullStartY = null;
                var post = M.data.post(detailPostId);
                if (delta > 65 && detailEl.scrollTop <= 0 && post && post.repliesError) showRepliesError();
            }, {
                passive: true
            });
        },
        accountId: function() {
            return current;
        },
        isOpen: function() {
            return !viewEl.hidden;
        },
        setTab: function(tab) {
            if (!tab || tab === currentTab) return;
            currentTab = tab;
            M.profile.render();
        },
        open: function(accountId, tab) {
            var account = M.data.account(accountId);
            if (!account) return;
            current = accountId;
            currentTab = tab || "posts";
            M.profile.render();
        },
        render: function() {
            if (!current) return;
            var account = M.data.account(current);
            if (!account) return;
            profileEl.innerHTML = "";
            profileEl.classList.toggle("is-creepy", account.mystery);
            var banner = M.el("div", {
                className: "profile__banner" + (account.mystery ? " is-creepy" : "")
            });
            if (Array.isArray(account.banner)) {
                banner.style.background = "linear-gradient(135deg," + account.banner[0] + "," + account.banner[1] + ")";
            }
            profileEl.appendChild(banner);
            var head = M.el("div", {
                className: "profile__head"
            });
            head.appendChild(M.avatar(account.avatar, "avatar--xl"));
            if (account.id === M.data.meId()) {
                head.appendChild(M.el("button", {
                    className: "btn-outline",
                    text: "Editar perfil",
                    dataset: {
                        action: "edit-profile"
                    }
                }));
            } else {
                head.appendChild(followButton(account.id));
            }
            profileEl.appendChild(head);
            var nameRow = M.el("div", {
                className: "profile__name"
            }, [ M.el("span", {
                text: account.name
            }), account.verified ? M.el("span", {
                className: "profile__verified" + (account.government ? " is-government" : ""),
                html: M.svg("verified")
            }) : null ]);
            var meta = M.el("div", {
                className: "profile__meta"
            }, [ M.el("span", {
                className: "profile__meta-item",
                html: M.svg("calendar") + "<span>" + (account.joined || "entrou no Y") + "</span>"
            }), M.el("span", {
                html: "<b>" + fmt(account.followers) + "</b> seguidores"
            }), M.el("span", {
                html: "<b>" + fmt(account.following) + "</b> seguindo"
            }) ]);
            profileEl.appendChild(M.el("div", {
                className: "profile__info"
            }, [ nameRow, M.el("div", {
                className: "profile__handle",
                text: "@" + account.handle
            }), bioElement(account), meta ]));
            var tabs = [ {
                id: "posts",
                label: "Posts"
            }, {
                id: "media",
                label: "Mídia"
            }, {
                id: "likes",
                label: "Curtidas"
            } ];
            if (account.id === M.data.meId()) tabs.push({
                id: "drafts",
                label: "Rascunhos"
            });
            var tabsEl = M.el("div", {
                className: "profile__tabs"
            });
            tabs.forEach(function(tab) {
                tabsEl.appendChild(M.el("button", {
                    className: "profile__tab" + (tab.id === currentTab ? " is-active" : ""),
                    text: tab.label,
                    dataset: {
                        action: "profile-tab",
                        tab: tab.id
                    }
                }));
            });
            profileEl.appendChild(tabsEl);
            var list = M.el("div", {
                className: "profile__list" + (currentTab === "drafts" ? " profile__list--drafts" : "")
            });
            var posts = currentTab === "drafts" ? M.data.drafts() : M.data.byAuthor(account.id);
            if (currentTab === "drafts") {
                list.appendChild(M.el("div", {
                    className: "empty",
                    text: "Rascunhos — só você pode ver."
                }));
            } else if (currentTab === "media") {
                posts = posts.filter(function(post) {
                    return post.image || post.voice;
                });
            } else if (currentTab === "likes") {
                posts = [];
            }
            if (posts.length && currentTab === "drafts") {
                posts.forEach(function(post) {
                    var draftEl = M.feed.tweetEl(post, false);
                    if (post.clueDraft) draftEl.classList.add("tweet--clue-draft");
                    list.appendChild(draftEl);
                });
            } else if (!posts.length && currentTab !== "drafts") {
                list.appendChild(M.el("div", {
                    className: "empty",
                    text: currentTab === "likes" ? "Nada curtido ainda." : "Nada por aqui ainda."
                }));
            } else {
                posts.forEach(function(post) {
                    list.appendChild(M.feed.tweetEl(post, true));
                });
            }
            profileEl.appendChild(list);
        },
        isDetailOpen: function() {
            return !detailView.hidden;
        },
        openDetail: async function(postId) {
            var post = M.data.post(postId);
            if (!post) return;
            detailPostId = postId;
            var isAgathaPost = post.author === "agatha";
            try{await M.data.prepareClue(postId);}catch(e){}
            if(detailPostId!==postId)return;
            var clueDigit = M.data.clueDigit(postId);
            detailEl.scrollTop = 0;
            detailEl.innerHTML = "";
            detailEl.appendChild(M.feed.tweetEl(post, false));
            detailEl.appendChild(M.el("div", {
                className: "detail__meta"
            }, [ M.el("span", {
                text: (post.time || "agora") + " · " + fmtViews(post) + " visualizações"
            }) ]));
            detailEl.appendChild(statsEl(post));
            var detailReplies = post.replies.slice();
            if (clueDigit) detailReplies.push({
                author: M.data.meId(),
                text: "... " + clueDigit,
                time: "agora",
                clue: true
            });
            if (detailReplies.length) {
                detailReplies.forEach(function(reply) {
                    var replyAuthor = M.data.account(reply.author) || {
                        name: reply.author,
                        handle: reply.author,
                        avatar: "pfp/imagem-004.svg"
                    };
                    var replyNode = M.el("div", {
                        className: "reply" + (reply.clue ? " reply--clue" : "") + (reply.clue && clueDigit ? " reply--clue-pending" : "")
                    }, [ M.avatar(replyAuthor.avatar, "avatar--sm"), M.el("div", {
                        className: "reply__body"
                    }, [ M.el("div", {
                        className: "reply__head"
                    }, [ M.el("span", {
                        className: "reply__name",
                        text: replyAuthor.name
                    }), M.el("span", {
                        className: "reply__handle",
                        text: "@" + replyAuthor.handle
                    }), M.el("span", {
                        className: "reply__time",
                        text: "· " + reply.time
                    }) ]), M.feed.mentionTextEl(reply.text, "reply__text") ]) ]);
                    detailEl.appendChild(replyNode);
                    if (reply.clue) observeClueReply(replyNode, postId);
                });
            } else {
                detailEl.appendChild(M.el("div", {
                    className: "empty",
                    text: "Seja o primeiro a responder."
                }));
            }
            if (post.repliesError) detailEl.appendChild(M.el("div", {
                className: "detail__replies-error",
                text: isAgathaPost ? "Não foi possível carregar todas as respostas" : "Não foi possível carregar novos comentários",
                hidden: !isAgathaPost
            }));
            detailView.hidden = false;
            detailView.classList.toggle("is-readonly", isAgathaPost);
            if (detailEnterAnimation) detailEnterAnimation.cancel();
            if (typeof detailView.animate === "function") {
                detailEnterAnimation = detailView.animate([ {
                    transform: "translate3d(100%, 0, 0)",
                    opacity: .94
                }, {
                    transform: "translate3d(0, 0, 0)",
                    opacity: 1
                } ], {
                    duration: 520,
                    easing: "cubic-bezier(.2, .75, .25, 1)"
                });
                detailEnterAnimation.onfinish = function() {
                    if (detailEnterAnimation) detailEnterAnimation.cancel();
                    detailEnterAnimation = null;
                };
            }
            if (isAgathaPost) M.composer.clearReply(); else M.composer.setReplyTo(postId);
            if (clueDigit) {
                window.setTimeout(function() {
                    var clueReply = detailEl.querySelector(".reply--clue");
                    if (!clueReply) return;
                    var targetTop = detailEl.scrollTop + clueReply.getBoundingClientRect().top - detailEl.getBoundingClientRect().top - (detailEl.clientHeight - clueReply.offsetHeight) / 2;
                    smoothScrollDetail(Math.max(0, Math.min(targetTop, detailEl.scrollHeight - detailEl.clientHeight)));
                }, 460);
            }
        },
        closeDetail: function() {
            if (detailEnterAnimation) {
                detailEnterAnimation.cancel();
                detailEnterAnimation = null;
            }
            detailView.hidden = true;
            detailView.classList.remove("is-readonly");
            M.composer.clearReply();
        },
        refreshStats: function(postId) {
            var node = M.$("#detail .detail__stats");
            var post = M.data.post(postId);
            if (node && post) node.replaceWith(statsEl(post));
        }
    };
    function showRepliesError() {
        var message = detailEl.querySelector(".detail__replies-error");
        if (!message) return;
        message.hidden = false;
        message.classList.remove("is-visible");
        void message.offsetWidth;
        message.classList.add("is-visible");
        window.clearTimeout(pullMessageTimer);
        pullMessageTimer = window.setTimeout(function() {
            message.hidden = true;
            message.classList.remove("is-visible");
        }, 2600);
    }
    function smoothScrollDetail(targetTop) {
        if (clueScrollFrame) window.cancelAnimationFrame(clueScrollFrame);
        var startTop = detailEl.scrollTop;
        var distance = targetTop - startTop;
        var duration = Math.min(950, Math.max(620, Math.abs(distance) * .65));
        var startedAt = null;
        function step(now) {
            if (startedAt === null) startedAt = now;
            var progress = Math.min(1, (now - startedAt) / duration);
            var eased = 1 - Math.pow(1 - progress, 3);
            detailEl.scrollTop = startTop + distance * eased;
            if (progress < 1) clueScrollFrame = window.requestAnimationFrame(step); else clueScrollFrame = 0;
        }
        clueScrollFrame = window.requestAnimationFrame(step);
    }
    function observeClueReply(replyNode, postId) {
        var observer;
        var done = false;
        var visibleTimer = 0;
        async function reveal() {
            if (done) return;
            done = true;
            window.clearTimeout(visibleTimer);
            if (observer) observer.disconnect();
            var result;try{result=await M.data.discoverClue(postId);}catch(e){return;}if(!result)return;
            var clueText=replyNode.querySelector('.reply__text');if(clueText)clueText.textContent='... '+result.digit;
            if (M.feed && M.feed.refreshLike) M.feed.refreshLike(postId);
            M.host.emit("clue-glitch", {
                postId
            });
            replyNode.classList.add("tweet--glitch-on-view");
            var isCollapsing = false;
            var remove = function() {
                if (isCollapsing) return;
                isCollapsing = true;
                replyNode.removeEventListener("animationend", remove);
                collapseClueReply(replyNode);
            };
            replyNode.addEventListener("animationend", remove);
            window.setTimeout(remove, 2500);
        }
        if (typeof IntersectionObserver !== "function") {
            visibleTimer = window.setTimeout(reveal, 700);
            return;
        }
        observer = new IntersectionObserver(function(entries) {
            if (entries.some(function(entry) {
                return entry.isIntersecting;
            })) {
                if (!visibleTimer) visibleTimer = window.setTimeout(reveal, 700);
            } else {
                window.clearTimeout(visibleTimer);
                visibleTimer = 0;
            }
        }, {
            root: detailEl,
            threshold: .25
        });
        observer.observe(replyNode);
    }
    function collapseClueReply(replyNode) {
        if (!replyNode.parentNode) return;
        var height = replyNode.getBoundingClientRect().height;
        replyNode.style.overflow = "hidden";
        replyNode.style.transformOrigin = "center top";
        function removeReply() {
            if (replyNode.parentNode) replyNode.parentNode.removeChild(replyNode);
        }
        if (typeof replyNode.animate === "function") {
            var collapse = replyNode.animate([ {
                height: height + "px",
                opacity: 1,
                transform: "scaleY(1)",
                paddingTop: "12px",
                paddingBottom: "12px"
            }, {
                height: "0px",
                opacity: 0,
                transform: "scaleY(.03)",
                paddingTop: "0px",
                paddingBottom: "0px",
                borderBottomColor: "transparent"
            } ], {
                duration: 900,
                easing: "cubic-bezier(.16, 1, .3, 1)",
                fill: "forwards"
            });
            collapse.onfinish = removeReply;
            window.setTimeout(removeReply, 1100);
        } else {
            replyNode.style.setProperty("--reply-collapse-height", height + "px");
            replyNode.addEventListener("animationend", removeReply, {
                once: true
            });
            void replyNode.offsetHeight;
            replyNode.classList.add("is-dismissing");
            window.setTimeout(removeReply, 760);
        }
    }
    function statsEl(post) {
        return M.el("div", {
            className: "detail__stats"
        }, [ M.el("span", {
            html: "<b>" + fmt(M.data.repostCount(post.id)) + "</b> reposts"
        }), M.el("span", {
            html: "<b>" + fmt(M.data.likeCount(post.id)) + "</b> curtidas"
        }) ]);
    }
    function bioElement(account) {
        var bio = M.el("div", {
            className: "profile__bio"
        });
        if (account.id !== "zulmi" || account.bio.indexOf("@agathashowgroup") === -1) {
            bio.textContent = account.bio;
            return bio;
        }
        var parts = account.bio.split("@agathashowgroup");
        bio.appendChild(document.createTextNode(parts[0]));
        bio.appendChild(document.createTextNode("@agathashowgroup"));
        if (parts[1]) bio.appendChild(document.createTextNode(parts[1]));
        return bio;
    }
    function followButton(accountId) {
        var on = M.data.isFollowing(accountId);
        return M.el("button", {
            className: "btn-outline" + (on ? " is-following" : ""),
            text: on ? "Seguindo" : "Seguir",
            dataset: {
                action: "follow",
                account: accountId
            }
        });
    }
    function fmt(value) {
        value = value || 0;
        if (value >= 1e6) return (value / 1e6).toFixed(1).replace(".", ",") + " mi";
        if (value >= 1e3) return (value / 1e3).toFixed(1).replace(".", ",") + " mil";
        return String(value);
    }
    function fmtViews(post) {
        var base = 400 + post.likes * 7 + post.reposts * 13 + post.replies.length * 9;
        if (base >= 1e3) return (base / 1e3).toFixed(1).replace(".", ",") + " mil";
        return String(base);
    }
})(window.Y = window.Y || {});

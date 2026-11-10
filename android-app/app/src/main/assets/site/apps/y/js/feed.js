(function(M) {
    "use strict";
    var feedEl = null;
    var exploreEl = null;
    var notifsEl = null;
    var mouseScroll = null;
    var suppressDragClick = false;
    function fmtCount(value) {
        if (value >= 1e6) return (value / 1e6).toFixed(1).replace(".", ",") + " mi";
        if (value >= 1e3) return (value / 1e3).toFixed(1).replace(".", ",") + " mil";
        return value > 0 ? String(value) : "";
    }
    function tweetEl(post, interactive) {
        var author = M.data.account(post.author) || {
            name: post.author,
            handle: post.author,
            avatar: "pfp/imagem-004.svg"
        };
        var article = M.el("article", {
            className: "tweet" + (post.creepy ? " is-creepy" : "")
        });
        article.dataset.post = post.id;
        if (interactive && !post.commentsDisabled) article.dataset.open = "1";
        var avatarBtn = M.el("button", {
            className: "tweet__avatar",
            dataset: {
                action: "open-profile",
                account: author.id
            },
            "aria-label": "Ver perfil de " + author.name
        });
        avatarBtn.appendChild(M.avatar(author.avatar));
        var body = M.el("div", {
            className: "tweet__body"
        });
        var nameBtn = M.el("button", {
            className: "tweet__name",
            text: author.name,
            dataset: {
                action: "open-profile",
                account: author.id
            }
        });
        var head = M.el("div", {
            className: "tweet__head"
        }, [ nameBtn, author.verified ? M.el("span", {
            className: "tweet__verified" + (author.government ? " is-government" : ""),
            html: M.svg("verified")
        }) : null, M.el("span", {
            className: "tweet__handle",
            text: "@" + author.handle
        }), M.el("span", {
            className: "tweet__dot",
            text: "·"
        }), M.el("span", {
            className: "tweet__time",
            text: post.time
        }) ]);
        body.appendChild(head);
        body.appendChild(mentionTextEl(post.text, "tweet__text"));
        if (post.voice) {
            body.appendChild(M.el("span", {
                className: "tweet__audio"
            }, [ M.el("span", {
                className: "tweet__audio-wave",
                html: "<i></i><i></i><i></i><i></i><i></i>"
            }), M.el("span", {
                text: "🎤 Áudio " + post.voice
            }) ]));
        }
        if (post.image) {
            var postImage = M.el("img", {
                className: "tweet__image",
                src: post.image,
                alt: "",
                attrs: { draggable: "false", loading: "lazy", decoding: "async" },
                on: {
                    error: function() {
                        var unavailable = M.el("div", {
                            className: "tweet__image-error",
                            role: "status",
                            text: "Imagem indisponível"
                        });
                        if (postImage.parentNode) postImage.parentNode.replaceChild(unavailable, postImage);
                    }
                }
            });
            body.appendChild(postImage);
        }
        body.appendChild(actionsEl(post));
        article.appendChild(avatarBtn);
        article.appendChild(body);
        return article;
    }
    function actionsEl(post) {
        var likeOn = M.data.isLiked(post.id);
        var repostOn = M.data.isReposted(post.id);
        var replyCount = post.replyCount || post.replies.length;
        var reply = M.el("button", {
            className: "act act--reply" + (post.commentsDisabled ? " is-disabled" : ""),
            dataset: post.commentsDisabled ? {} : {
                action: "open-detail",
                post: post.id
            },
            "aria-label": post.commentsDisabled ? "Comentários indisponíveis" : "Responder",
            disabled: !!post.commentsDisabled
        });
        reply.innerHTML = M.svg("reply") + (replyCount ? '<span class="act__count">' + replyCount + "</span>" : "");
        var repost = M.el("button", {
            className: "act act--repost" + (repostOn ? " is-on" : ""),
            dataset: {
                action: "repost",
                post: post.id
            },
            "aria-label": "Repostar"
        });
        var repostCount = M.data.repostCount(post.id);
        repost.innerHTML = M.svg("repost") + (repostCount ? '<span class="act__count">' + fmtCount(repostCount) + "</span>" : "");
        var like = M.el("button", {
            className: "act act--like" + (likeOn ? " is-on" : ""),
            disabled: true,
            "aria-label": likeOn ? "Curtido automaticamente ao descobrir a pista" : "Curtidas desativadas"
        });
        var likeCount = M.data.likeCount(post.id);
        like.innerHTML = M.svg("heart") + (likeCount ? '<span class="act__count">' + fmtCount(likeCount) + "</span>" : "");
        var share = M.el("button", {
            className: "act act--share",
            "aria-label": "Compartilhar"
        });
        share.innerHTML = M.svg("share");
        return M.el("div", {
            className: "tweet__actions"
        }, [ reply, repost, like, share ]);
    }
    M.feed = {
        init: function() {
            feedEl = M.$("#feed");
            exploreEl = M.$("#explore");
            notifsEl = M.$("#notifs");
            enableMouseDragScroll();
        },
        tweetEl,
        mentionTextEl,
        render: function() {
            feedEl.innerHTML = "";
            if (!M.data.ready()) {
                feedEl.appendChild(M.el("div", {
                    className: "empty",
                    text: "Carregando..."
                }));
                return;
            }
            M.data.feed().forEach(function(post) {
                feedEl.appendChild(tweetEl(post, true));
            });
        },
        repaint: function(postId) {
            M.$$('[data-post="' + postId + '"]').forEach(function(node) {
                var post = M.data.post(postId);
                if (post && node.classList.contains("tweet")) {
                    node.replaceWith(tweetEl(post, node.dataset.open === "1"));
                }
            });
        },
        refreshLike: function(postId) {
            var post = M.data.post(postId);
            if (!post) return;
            M.$$('.tweet[data-post="' + postId + '"] .act--like').forEach(function(button) {
                button.classList.add("is-on");
                button.setAttribute("aria-label", "Curtido automaticamente ao descobrir a pista");
                var count = fmtCount(M.data.likeCount(postId));
                var countEl = button.querySelector(".act__count");
                if (count) {
                    if (countEl) countEl.textContent = count; else button.appendChild(M.el("span", {
                        className: "act__count",
                        text: count
                    }));
                }
            });
        },
        renderExplore: function() {
            exploreEl.innerHTML = "";
            exploreEl.appendChild(M.el("div", {
                className: "explore__search"
            }, [ M.el("span", {
                html: M.svg("search")
            }), M.el("span", {
                text: "Buscar no Y"
            }) ]));
            var trends = [ {
                cat: "Mundo Torajo",
                tag: "#MeusQueridosAmigos",
                count: "1.204 posts",
                account: "torajo"
            }, {
                cat: "Mistério",
                tag: "#Algorithomus",
                count: "3.870 posts",
                account: "liga_praxis"
            }, {
                cat: "Canal do Morajo",
                tag: "#CanalDoMorajo",
                count: "980 posts",
                account: "morajo"
            }, {
                cat: "Assunto do momento",
                tag: "#TRAGAOROXO",
                count: "2,1 mil posts",
                account: "jay"
            }, {
                cat: "Era dos personagens",
                tag: "#PrincipaisVsSecundarios",
                count: "1.840 posts",
                account: "torajo"
            }, {
                cat: "Personagens principais",
                tag: "#Principais",
                count: "965 posts",
                account: "torajo"
            }, {
                cat: "Personagens secundários",
                tag: "#Secundarios",
                count: "742 posts",
                account: "margo"
            } ];
            var trendsPanel = M.el("section", {
                className: "panel"
            }, [ M.el("h2", {
                className: "panel__title",
                text: "Assuntos do momento"
            }) ]);
            trends.forEach(function(trend) {
                trendsPanel.appendChild(M.el("button", {
                    className: "trend" + (trend.creepy ? " is-creepy" : ""),
                    dataset: {
                        action: "open-trend",
                        tag: trend.tag,
                        account: trend.account
                    }
                }, [ M.el("div", {
                    className: "trend__cat",
                    text: trend.cat
                }), M.el("div", {
                    className: "trend__tag",
                    text: trend.tag
                }), M.el("div", {
                    className: "trend__count",
                    text: trend.count
                }) ]));
            });
            exploreEl.appendChild(trendsPanel);
            var followPanel = M.el("section", {
                className: "panel"
            }, [ M.el("h2", {
                className: "panel__title",
                text: "Quem seguir"
            }) ]);
            M.data.suggested().forEach(function(account) {
                var row = M.el("div", {
                    className: "follow"
                });
                var avatarBtn = M.el("button", {
                    dataset: {
                        action: "open-profile",
                        account: account.id
                    },
                    "aria-label": "Ver perfil de " + account.name
                });
                avatarBtn.appendChild(M.avatar(account.avatar, "avatar--sm"));
                row.appendChild(avatarBtn);
                row.appendChild(M.el("div", {
                    className: "follow__info"
                }, [ M.el("div", {
                    className: "follow__name",
                    text: account.name
                }), M.el("div", {
                    className: "follow__handle",
                    text: "@" + account.handle
                }) ]));
                row.appendChild(followButton(account.id));
                followPanel.appendChild(row);
            });
            exploreEl.appendChild(followPanel);
        },
        renderNotifications: function() {
            notifsEl.innerHTML = "";
            var items = M.data.notifications();
            if (!items.length) {
                notifsEl.appendChild(M.el("div", {
                    className: "empty",
                    text: "Nada por aqui ainda."
                }));
                return;
            }
            var icons = {
                like: "heart",
                repost: "repost",
                follow: "user",
                mention: "reply"
            };
            items.forEach(function(item) {
                var account = M.data.account(item.account);
                var who = account ? account.name : "Alguém";
                var icon = M.el("span", {
                    className: "notif__icon",
                    html: M.svg(icons[item.type] || "bell")
                });
                var body = M.el("div", {
                    className: "notif__text"
                }, [ M.el("span", {
                    className: "notif__who",
                    text: who + " "
                }), M.el("span", {
                    text: item.text
                }), M.el("div", {
                    className: "notif__when",
                    text: item.time
                }) ]);
                var row = M.el("div", {
                    className: "notif notif--" + item.type + (item.creepy ? " is-creepy" : "")
                });
                if (account) {
                    row.dataset.action = "open-profile";
                    row.dataset.account = account.id;
                }
                row.appendChild(icon);
                row.appendChild(body);
                notifsEl.appendChild(row);
            });
        }
    };
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
    function enableMouseDragScroll() {
        document.addEventListener("pointerdown", function(event) {
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            if (event.target.closest("button, input, textarea, select, [data-action]")) return;
            var scroller = event.target.closest(".view, .detail");
            if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
            mouseScroll = {
                scroller,
                startY: event.clientY,
                startTop: scroller.scrollTop,
                moved: false
            };
            scroller.classList.add("is-mouse-dragging");
        });
        document.addEventListener("pointermove", function(event) {
            if (!mouseScroll) return;
            var distance = event.clientY - mouseScroll.startY;
            if (Math.abs(distance) > 3) {
                mouseScroll.moved = true;
                event.preventDefault();
                mouseScroll.scroller.scrollTop = mouseScroll.startTop - distance;
            }
        }, {
            passive: false
        });
        function stopDrag() {
            if (!mouseScroll) return;
            mouseScroll.scroller.classList.remove("is-mouse-dragging");
            if (mouseScroll.moved) {
                suppressDragClick = true;
                window.setTimeout(function() {
                    suppressDragClick = false;
                }, 500);
            }
            mouseScroll = null;
        }
        document.addEventListener("pointerup", stopDrag);
        document.addEventListener("pointercancel", stopDrag);
        document.addEventListener("click", function(event) {
            if (!suppressDragClick) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            suppressDragClick = false;
        }, true);
    }
    function mentionTextEl(text, className) {
        var element = M.el("div", {
            className
        });
        var accounts = M.data.people();
        var pattern = /@[A-Za-z0-9_]+/g;
        var last = 0;
        var match;
        text = String(text || "");
        while (match = pattern.exec(text)) {
            if (match.index > last) element.appendChild(document.createTextNode(text.slice(last, match.index)));
            var handle = match[0].slice(1).toLowerCase();
            var account = accounts.filter(function(item) {
                return item.handle.toLowerCase() === handle;
            })[0];
            if (account) {
                element.appendChild(M.el("button", {
                    className: "mention",
                    text: match[0],
                    dataset: {
                        action: "open-profile",
                        account: account.id
                    },
                    "aria-label": "Abrir perfil de " + account.name
                }));
            } else {
                element.appendChild(document.createTextNode(match[0]));
            }
            last = pattern.lastIndex;
        }
        if (last < text.length) element.appendChild(document.createTextNode(text.slice(last)));
        return element;
    }
})(window.Y = window.Y || {});

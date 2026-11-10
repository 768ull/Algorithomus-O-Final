(function(M) {
    "use strict";
    var accounts = {};
    var order = [];
    var posts = [];
    var drafts = [];
    var notifications = [];
    var meId = "morajo";
    var ready = false;
    var liked = {};
    var reposted = {};
    var following = {};
    var chain=Promise.resolve();
    M.request=function(action,data){var next=chain.then(async function(){var r=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});if(!r.ok)throw Error('Conexão indisponível');return r.json();});chain=next.catch(function(){});return next;};
    var puzzle = null;
    var foundClues = {};
    var puzzleCompletionSent = false;
    function formatPostTime(value) {
        value = String(value || "").trim();
        if (/^(?:agora|hoje|ontem|há \d+ (?:s|seg|segundos|min|minutos|m|h|horas?))$/i.test(value)) return "há 7 dias";
        if (/^\d{1,2}\/\d{1,2}$/.test(value)) return "há 2 meses";
        var shortAge = /^(\d+)\s*(s|seg|m|min|h|d)$/i.exec(value);
        if (shortAge) {
            var count = Number(shortAge[1]);
            var unit = shortAge[2].toLowerCase();
            if (unit === "d") return "há " + Math.max(7, Math.min(60, count)) + " dias";
            return "há 7 dias";
        }
        if (/^há \d+ (?:dias|semanas|meses|mês)$/i.test(value)) return value;
        var match = /^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.\s+(\d{2}|\d{4})\s+·/.exec(value || "");
        if (!match) return value || "";
        var months = {
            jan: 0,
            fev: 1,
            mar: 2,
            abr: 3,
            mai: 4,
            jun: 5,
            jul: 6,
            ago: 7,
            set: 8,
            out: 9,
            nov: 10,
            dez: 11
        };
        var year = match[3].length === 2 ? 2e3 + Number(match[3]) : Number(match[3]);
        var month = months[match[2]];
        var day = Number(match[1]);
        var timestamp = Date.UTC(year, month, day);
        var reference = Date.UTC(2026, 6, 1);
        var actualDaysAgo = Math.max(0, Math.floor((reference - timestamp) / 864e5));
        var daysAgo = Math.min(60, 7 + Math.round(actualDaysAgo / 743 * 53));
        if (daysAgo < 60) return "há " + daysAgo + " dias";
        return "há 2 meses";
    }
    M.data = {
        load: async function(scenario) {
            accounts = {};
            order = [];
            posts = [];
            drafts = [];
            notifications = [];
            liked = {};
            reposted = {};
            following = {};
            foundClues = {};
            puzzleCompletionSent = false;
            var social = await M.request('social-feed',{});
            if (!social) return;
            meId = social.me || "morajo";
            puzzle = {clues:[]};
            (social.initialFollowing || []).forEach(function(id) {
                following[id] = true;
            });
            var source = social.accounts || {};
            Object.keys(source).forEach(function(id) {
                var account = source[id] || {};
                accounts[id] = {
                    id,
                    name: account.name || id,
                    handle: account.handle || id,
                    avatar: account.avatar || "pfp/imagem-004.svg",
                    bio: account.bio || "",
                    banner: account.banner || [ "#1d9bf0", "#6a00ff" ],
                    followers: account.followers || 0,
                    following: account.following || 0,
                    joined: account.joined || "",
                    verified: !!account.verified,
                    government: !!account.government,
                    mystery: !!account.mystery
                };
                order.push(id);
            });
            var sourcePosts = social.posts || [];
            var characterPosts = sourcePosts.filter(function(post) {
                return [ "agatha", "governo_verade", "radar_cratera", "liga_praxis" ].indexOf(post.author) === -1;
            });
            var newProfilePosts = sourcePosts.filter(function(post) {
                return [ "agatha", "governo_verade", "radar_cratera", "liga_praxis" ].indexOf(post.author) !== -1;
            });
            var interleavedPosts = [];
            var profileIndex = 0;
            characterPosts.forEach(function(post, index) {
                interleavedPosts.push(post);
                if ((index + 1) % 4 === 0 && profileIndex < newProfilePosts.length) {
                    interleavedPosts.push(newProfilePosts[profileIndex++]);
                }
            });
            while (profileIndex < newProfilePosts.length) interleavedPosts.push(newProfilePosts[profileIndex++]);
            posts = interleavedPosts.map(function(post) {
                return {
                    id: post.id,
                    author: post.author,
                    time: formatPostTime(post.time || ""),
                    text: post.text || "",
                    image: post.image || "",
                    voice: post.voice || "",
                    likes: post.likes || 0,
                    replyCount: post.replyCount || (post.replies || []).length,
                    reposts: post.reposts || 0,
                    creepy: !!post.creepy,
                    commentsDisabled: !!post.commentsDisabled,
                    repliesError: !!post.repliesError,
                    mine: false,
                    replies: (post.replies || []).map(function(reply) {
                        return {
                            author: reply.author,
                            text: reply.text || "",
                            time: formatPostTime(reply.time || "")
                        };
                    })
                };
            });
            drafts = (social.drafts || []).map(function(draft) {
                return {
                    id: draft.id,
                    author: meId,
                    time: draft.time || "rascunho",
                    text: draft.text || "",
                    image: "",
                    voice: "",
                    likes: 0,
                    reposts: 0,
                    creepy: false,
                    mine: true,
                    replies: [],
                    clueDraft: !!draft.clueDraft
                };
            });
            notifications = (social.notifications || []).map(function(item) {
                return {
                    id: item.id,
                    type: item.type || "follow",
                    account: item.account || "",
                    text: item.text || "",
                    time: item.time || "",
                    creepy: !!item.creepy
                };
            });
            var progress=await M.request('social-state',{});
            (progress.found||[]).forEach(function(clue){foundClues[clue.postId]=clue.digit;liked[clue.postId]=true;drafts.unshift({id:'clue-'+clue.postId,author:meId,time:'rascunho',text:clue.digit,image:'',voice:'',likes:0,reposts:0,creepy:false,mine:true,replies:[],clueDraft:true});});
            if(progress.code){drafts=drafts.filter(function(d){return !d.clueDraft;});drafts.unshift({id:'clue-final',author:meId,time:'rascunho',text:progress.code,image:'',voice:'',likes:0,reposts:0,creepy:false,mine:true,replies:[],clueDraft:true});}
            ready = true;
        },
        ready: function() {
            return ready;
        },
        meId: function() {
            return meId;
        },
        me: function() {
            return accounts[meId] || null;
        },
        account: function(id) {
            return accounts[id] || null;
        },
        people: function() {
            return order.filter(function(id) {
                return !accounts[id].mystery;
            }).map(function(id) {
                return accounts[id];
            });
        },
        suggested: function() {
            return M.data.people().filter(function(account) {
                return account.id !== meId;
            });
        },
        feed: function() {
            return posts.slice();
        },
        byAuthor: function(id) {
            return posts.filter(function(post) {
                return post.author === id;
            }).reverse();
        },
        drafts: function() {
            return drafts.slice();
        },
        prepareClue: async function(postId){
            if(foundClues[postId])return false;
            var result=await M.request('social-post',{postId});
            puzzle.clues=puzzle.clues.filter(function(c){return c.postId!==postId;});
            if(result.clue)puzzle.clues.push({postId,ticket:result.ticket});
            return result.clue;
        },
        isClueTarget:function(postId){return puzzle.clues.some(function(c){return c.postId===postId&&!foundClues[postId];});},
        clueDigit:function(postId){return M.data.isClueTarget(postId)?'?':'';},
        discoverClue:async function(postId){
            var clue=puzzle.clues.find(function(c){return c.postId===postId;});if(!clue||foundClues[postId])return null;
            var result=await M.request('social-discover',{ticket:clue.ticket});foundClues[postId]=result.digit;liked[postId]=true;
            drafts.unshift({id:'clue-'+postId,author:meId,time:'rascunho',text:result.digit,image:'',voice:'',likes:0,reposts:0,creepy:false,mine:true,replies:[],clueDraft:true});
            if(result.code){drafts=drafts.filter(function(d){return !d.clueDraft;});drafts.unshift({id:'clue-final',author:meId,time:'rascunho',text:result.code,image:'',voice:'',likes:0,reposts:0,creepy:false,mine:true,replies:[],clueDraft:true});if(!puzzleCompletionSent){puzzleCompletionSent=true;M.host.emit('puzzle-complete',null);}}
            return result;
        },
        post: function(id) {
            for (var i = 0; i < posts.length; i++) {
                if (posts[i].id === id) return posts[i];
            }
            return null;
        },
        addPost: function(text) {
            var post = {
                id: "me-" + Date.now(),
                author: meId,
                time: "agora",
                text,
                image: "",
                voice: "",
                likes: 0,
                reposts: 0,
                creepy: false,
                mine: true,
                replies: []
            };
            posts.unshift(post);
            return post;
        },
        addReply: function(postId, text) {
            var post = M.data.post(postId);
            if (!post) return null;
            var reply = {
                author: meId,
                text,
                time: "agora"
            };
            post.replies.push(reply);
            return reply;
        },
        isLiked: function(id) {
            return !!liked[id];
        },
        isReposted: function(id) {
            return !!reposted[id];
        },
        toggleLike: function(id) {
            liked[id] = !liked[id];
            return liked[id];
        },
        toggleRepost: function(id) {
            reposted[id] = !reposted[id];
            return reposted[id];
        },
        likeCount: function(id) {
            var post = M.data.post(id);
            if (!post) return 0;
            return post.likes + (liked[id] ? 1 : 0);
        },
        repostCount: function(id) {
            var post = M.data.post(id);
            if (!post) return 0;
            return post.reposts + (reposted[id] ? 1 : 0);
        },
        isFollowing: function(id) {
            return !!following[id];
        },
        toggleFollow: function(id) {
            following[id] = !following[id];
            return following[id];
        },
        notifications: function() {
            return notifications.slice();
        },
        unreadNotifications: function() {
            return notifications.length;
        }
    };
})(window.Y = window.Y || {});

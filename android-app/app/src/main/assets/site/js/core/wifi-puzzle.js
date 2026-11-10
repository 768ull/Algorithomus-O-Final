(function(S){
 var chain=Promise.resolve();
 S.request=function(action,data){var next=chain.then(async function(){var response=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});if(!response.ok)throw Error('Falha de conexão');return response.json();});chain=next.catch(function(){});return next;};
 var remembered=false;
 S.wifiPuzzle={hasSavedPassword:function(){return remembered;},sync:async function(){var state=await S.request('wifi-state');remembered=state.connected;return remembered;},send:async function(app){try{if(app==='galeria'){var data=await S.request('wifi-clues');S.bridge.emit(app,'wifi-clues',{images:data.images});}else if(app==='configuracoes'){await this.sync();S.bridge.emit(app,'wifi-state',{connected:remembered});}}catch(e){}}};
 S.wifiPuzzle.sync().catch(function(){});
})(window.Celular=window.Celular||{});

/* Painel SGQ · CRCO — js/aprendizagem.js (0.18.0: pessoas em aprendizagem de um POP e avaliação mensal da eficácia)
 * ISO 9001 7.2 c/d · NBR 15906 7.2.2.4 e 7.2.4 · PQTA 2026 itens 7, 9 e 27.
 * Cada registro: pessoa, POP, escopo (funções e, se quiser, naturezas), início, nº de ciclos (meses) e mínimo de atos.
 * Todo mês: atos da pessoa no escopo e as inconformidades dela; você marca as relacionadas ao POP e confirma Eficaz / Não eficaz / Sem base. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/aprendizagem.js']='0.20.0';
  var APR_RES={ef:['good','Eficaz'], ne:['warn','Não eficaz'], sb:['mute','Sem base para avaliar']};
  function aprLista(){ return Object.keys(state.apr||{}).map(function(id){ return state.apr[id]; }).filter(function(a){ return a&&!a.arquivado; }); }
  function aprMeses(a){ var out=[], m=a.inicio; for (var i=0;i<(+a.ciclos||1);i++){ out.push(m); var p=m.split('-').map(Number); p[1]++; if (p[1]>12){ p[1]=1; p[0]++; } m=p[0]+'-'+(p[1]<10?'0':'')+p[1]; } return out; }
  function aprAtivoEm(k, m){ return aprLista().some(function(a){ return a.k===k && a.status!=='concluido' && aprMeses(a).indexOf(m)>=0; }); }
  // pessoa em aprendizagem no período escolhido: fica de fora da régua dos colegas (mediana/média) na Equipe e funções
  function eqEmApr(k){ var L=aprLista(); if (!L.length) return false; var ms=state.periodo==='todos'?null:[state.periodo];
    return L.some(function(a){ if (a.k!==k||a.status==='concluido') return false; if (!ms) return true; return aprMeses(a).some(function(m){ return ms.indexOf(m)>=0; }); }); }
  function aprSalvar(a){ state.apr=Object.assign({},state.apr); state.apr[a.id]=a; if (dbPronto&&podeEscrever) return db.doc('aprendiz/'+a.id).set(a).catch(function(){ toast('Não consegui salvar a aprendizagem'); }); return Promise.resolve(); }
  // o que a pessoa fez no escopo do POP num mês, e as inconformidades dela no mês
  function aprMes(a, m){
    var X=eqExecs().filter(function(x){ return x.k===a.k && x.m===m && (a.fns||[]).indexOf(x.fn)>=0 && (!(a.nats||[]).length || a.nats.indexOf(x.nat)>=0); });
    var docs={}; X.forEach(function(x){ docs[x.c]=1; });
    var inc=incTodos().filter(function(r){ return semAc(r.r)===a.k && String(r.d).slice(0,7)===m; }).map(function(r){ return Object.assign({},r,{noEscopo:!!docs[String(r.c)]}); }).sort(function(p,q){ return (q.noEscopo-p.noEscopo) || (p.d<q.d?-1:1); });
    var av=(a.avals||{})[m]||{}, rel=av.rel||{}, nRel=inc.filter(function(r){ return rel[r.id]; }).length, nd=Object.keys(docs).length;
    var sug=nd<(+a.minAtos||0)?'sb':nRel?'ne':'ef';
    return {m:m, X:X, nd:nd, inc:inc, rel:rel, nRel:nRel, sug:sug, av:av}; }
  function aprPill(r){ var x=APR_RES[r]; return x?'<span class="pill '+x[0]+'">'+x[1]+'</span>':'<span class="pill mute">pendente</span>'; }
  function aprPessoas(){ var o={}; eqExecs().forEach(function(x){ o[x.k]=o[x.k]||x.nome; }); return o; }
  function renderApr(){
    var el=$('tabApr'); if (!el) return;
    var L=aprLista().sort(function(a,b){ return (a.status==='concluido')-(b.status==='concluido') || String(a.nome).localeCompare(String(b.nome),'pt-BR'); });
    var h='<div class="sec-h"><span class="note">Pessoas aprendendo um POP: o painel mostra, mês a mês, os atos dela no escopo do POP e as inconformidades; você marca as relacionadas ao POP e registra se a aprendizagem foi eficaz. Evidência da eficácia da capacitação (ISO 9001 7.2 c; NBR 15906 7.2.2.4 e 7.2.4.1; PQTA item 27). Durante o período, a pessoa fica de fora da régua dos colegas na Equipe e funções; os indicadores oficiais não mudam.</span></div>';
    h+='<div class="search"><button class="btn primary sm" type="button" data-aprnovo="1">Novo registro de aprendizagem</button><span class="spacer"></span>'+(L.length?'<button class="btn sm" type="button" data-aprxls="1">Baixar planilha (evidência)</button>':'')+'</div>';
    if (state.aprForm) h+=aprFormHTML(state.aprForm);
    if (!L.length && !state.aprForm){ el.innerHTML=h+'<div class="empty"><b>Nenhum registro ainda</b>Clique em "Novo registro de aprendizagem" para cadastrar a pessoa, o POP e o escopo.</div>'; return; }
    h+=L.map(function(a){ var ms=aprMeses(a), aberto=state.aprAberto===a.id;
      return '<div class="panel apr-c'+(a.status==='concluido'?' fim':'')+'"><div class="apr-h"><div><b>'+esc(a.nome)+'</b> · '+esc(a.pop||'')+(a.popTit?' — '+esc(a.popTit):'')+'<div class="hint" style="margin:2px 0 0">Escopo: '+esc((a.fns||[]).join(', ')||'—')+((a.nats||[]).length?' · naturezas: '+esc(a.nats.join(', ')):'')+' · '+ms.length+' ciclo(s) de '+esc(nomeMes(ms[0]))+' a '+esc(nomeMes(ms[ms.length-1]))+' · mínimo '+(+a.minAtos||0)+' atos por mês</div></div><span class="spacer"></span>'+
        (a.status==='concluido'?'<span class="pill '+(a.conclusao==='ef'?'good':'warn')+'">Concluído: '+esc((APR_RES[a.conclusao]||['','—'])[1])+'</span>':'')+
        '<button class="btn sm" type="button" data-aprabrir="'+esc(a.id)+'" aria-expanded="'+(aberto?'true':'false')+'">'+(aberto?'Fechar':'Avaliar')+'</button>'+(podeEscrever?' <button class="btn sm" type="button" data-apreditar="'+esc(a.id)+'">Editar</button>':'')+'</div>'+
        '<div class="apr-ms">'+ms.map(function(m){ var r=((a.avals||{})[m]||{}).res; return '<button type="button" class="apr-m'+(state.aprMes===m&&aberto?' on':'')+'" data-aprabrir="'+esc(a.id)+'" data-aprmes="'+m+'"><span>'+esc(nomeMes(m))+'</span>'+aprPill(r)+'</button>'; }).join('')+'</div>'+
        (aberto?aprAvalHTML(a):'')+'</div>'; }).join('');
    el.innerHTML=h; }
  function aprFormHTML(f){ var P=aprPessoas(), ks=Object.keys(P).sort(function(a,b){ return String(P[a]).localeCompare(String(P[b]),'pt-BR'); });
    var cnt={}; eqExecs().forEach(function(x){ if (!f.k||x.k===f.k) cnt[x.fn]=(cnt[x.fn]||0)+1; }); var fns=Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a]; });
    var natC={}; eqExecs().forEach(function(x){ if ((!f.k||x.k===f.k) && (f.fns||[]).indexOf(x.fn)>=0) natC[x.nat]=(natC[x.nat]||0)+1; }); var nats=Object.keys(natC).sort(function(a,b){ return natC[b]-natC[a]; }).slice(0,40);
    return '<div class="panel apr-f"><div class="sub-h">'+(f.id?'Editar registro':'Novo registro de aprendizagem')+'</div><div class="apr-g">'+
      '<label>Pessoa<select id="aprK"><option value="">Escolha…</option>'+ks.map(function(k){ return '<option value="'+esc(k)+'"'+(f.k===k?' selected':'')+'>'+esc(P[k])+'</option>'; }).join('')+'</select></label>'+
      '<label>Código do POP<input type="text" id="aprPop" value="'+esc(f.pop||'')+'" placeholder="ex.: POP-RI-REC-001"></label>'+
      '<label>Título do POP<input type="text" id="aprPopTit" value="'+esc(f.popTit||'')+'" placeholder="ex.: Recepção e prenotação"></label>'+
      '<label>Início (1º ciclo)<input type="month" id="aprIni" value="'+esc(f.inicio||mesHoje())+'"></label>'+
      '<label>Ciclos (meses)<input type="number" id="aprCic" min="1" max="24" value="'+(+f.ciclos||3)+'"></label>'+
      '<label>Mínimo de atos no mês para avaliar<input type="number" id="aprMin" min="0" max="999" value="'+(f.minAtos!=null?+f.minAtos:10)+'"></label></div>'+
      '<div class="sub-h" style="margin-top:10px">Escopo do POP · funções'+(f.k?' (as que a pessoa já fez aparecem primeiro com a quantidade)':'')+'</div><div class="apr-chk">'+fns.slice(0,60).map(function(fn){ return '<label><input type="checkbox" data-aprfn="'+esc(fn)+'"'+((f.fns||[]).indexOf(fn)>=0?' checked':'')+'> '+esc(fn)+' <span class="mut">'+cnt[fn]+'</span></label>'; }).join('')+'</div>'+
      (nats.length?'<div class="sub-h" style="margin-top:10px">Naturezas (opcional: deixe tudo desmarcado para valer qualquer natureza)</div><div class="apr-chk">'+nats.map(function(n){ return '<label><input type="checkbox" data-aprnat="'+esc(n)+'"'+((f.nats||[]).indexOf(n)>=0?' checked':'')+'> '+esc(n)+' <span class="mut">'+natC[n]+'</span></label>'; }).join('')+'</div>':'')+
      '<label class="apr-obs">Observação<textarea id="aprObs" rows="2" placeholder="Ex.: treinamento de 10/10 com a responsável pela recepção">'+esc(f.obs||'')+'</textarea></label>'+
      '<div class="ctl" style="margin-top:8px"><button class="btn primary sm" type="button" data-aprsalvarf="1">Salvar</button><button class="btn sm" type="button" data-aprcancelar="1">Cancelar</button>'+(f.id?'<span class="spacer"></span><button class="btn sm" type="button" data-aprarquivar="'+esc(f.id)+'">Arquivar registro</button>':'')+'</div></div>'; }
  function aprAvalHTML(a){ var ms=aprMeses(a), m=ms.indexOf(state.aprMes)>=0?state.aprMes:(ms.filter(function(x){ return x<=mesHoje(); }).pop()||ms[0]); state.aprMes=m;
    var R=aprMes(a,m), res=R.av.res||'', fut=m>mesHoje();
    var h='<div class="apr-av"><div class="sub-h">Ciclo '+(ms.indexOf(m)+1)+' de '+ms.length+' · '+esc(nomeMes(m))+(fut?' · <span class="mut">mês ainda não chegou</span>':m===mesHoje()?' · <span class="mut">mês em andamento</span>':'')+'</div>'+
      '<div class="kpis" style="margin-bottom:10px">'+kpi('Atos no escopo do POP',String(R.nd),'mínimo para avaliar: '+(+a.minAtos||0))+kpi('Inconformidades da pessoa no mês',String(R.inc.length),R.inc.filter(function(r){ return r.noEscopo; }).length+' em atos do escopo')+kpi('Relacionadas ao POP',String(R.nRel),'marcadas por você')+'</div>';
    h+=R.inc.length?'<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Relacionada ao POP?</th><th>Data</th><th>Documento</th><th>Erro</th><th>Observação</th></tr></thead><tbody>'+R.inc.map(function(r){ return '<tr><td><label class="lc-chk"><input type="checkbox" data-aprrel="'+esc(r.id)+'"'+(R.rel[r.id]?' checked':'')+(podeEscrever?'':' disabled')+'> sim</label>'+(r.noEscopo?' <span class="pill mute">no escopo</span>':'')+'</td><td>'+fmtData(r.d)+'</td><td>'+protLink(r.c)+' <span class="mut">'+esc(r.t)+'</span></td><td>'+esc(catDe(r))+'</td><td style="min-width:260px">'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table></div>':'<p class="hint">Nenhuma inconformidade da pessoa registrada neste mês.</p>';
    h+='<div class="apr-res"><span>Sugestão do painel: '+aprPill(R.sug)+'</span><label>Resultado do ciclo <select id="aprRes"'+(podeEscrever?'':' disabled')+'><option value="">pendente</option>'+Object.keys(APR_RES).map(function(k){ return '<option value="'+k+'"'+(res===k?' selected':'')+'>'+APR_RES[k][1]+'</option>'; }).join('')+'</select></label>'+
      '<input type="text" id="aprResObs" value="'+esc(R.av.obs||'')+'" placeholder="Observação / ação tomada (ex.: reforço do POP com a responsável)" style="flex:1;min-width:240px"'+(podeEscrever?'':' disabled')+'>'+(podeEscrever?'<button class="btn primary sm" type="button" data-aprsalvarav="'+esc(a.id)+'">Salvar ciclo</button>':'')+'</div>'+
      (R.av.em?'<p class="hint">Salvo em '+esc(new Date(R.av.em).toLocaleString('pt-BR'))+(R.av.por?' por '+esc(R.av.por):'')+'.</p>':'')+
      '<p class="hint">Regra da sugestão: menos de '+(+a.minAtos||0)+' atos no escopo = Sem base; alguma inconformidade marcada como relacionada = Não eficaz; senão, Eficaz. A decisão é sua: a sugestão só ajuda.</p>';
    if (podeEscrever && a.status!=='concluido') h+='<div class="apr-res"><span>Conclusão do período:</span><select id="aprConc"><option value="">—</option><option value="ef">Eficaz</option><option value="ne">Não eficaz</option></select><input type="text" id="aprConcObs" placeholder="Justificativa (ex.: 3 ciclos eficazes seguidos)" style="flex:1;min-width:240px"><button class="btn sm" type="button" data-aprconcluir="'+esc(a.id)+'">Concluir aprendizagem</button></div>';
    if (a.status==='concluido') h+='<p class="hint">Concluído em '+esc(new Date(a.concluidoEm).toLocaleDateString('pt-BR'))+': <b>'+esc((APR_RES[a.conclusao]||['','—'])[1])+'</b>'+(a.concObs?' — '+esc(a.concObs):'')+(podeEscrever?' <button class="lnk" type="button" data-aprreabrir="'+esc(a.id)+'">reabrir</button>':'')+'</p>';
    return h+'</div>'; }
  function aprLerForm(){ var f=Object.assign({},state.aprForm||{}); f.k=($('aprK')||{}).value||f.k||''; f.pop=String(($('aprPop')||{}).value||'').trim(); f.popTit=String(($('aprPopTit')||{}).value||'').trim(); f.inicio=($('aprIni')||{}).value||mesHoje(); f.ciclos=Math.max(1,Math.min(24,+($('aprCic')||{}).value||3)); f.minAtos=Math.max(0,+($('aprMin')||{}).value||0); f.obs=String(($('aprObs')||{}).value||'').trim();
    f.fns=[].slice.call(document.querySelectorAll('[data-aprfn]:checked')).map(function(x){ return x.dataset.aprfn; }); f.nats=[].slice.call(document.querySelectorAll('[data-aprnat]:checked')).map(function(x){ return x.dataset.aprnat; }); return f; }
  function aprClique(t){
    if (t.dataset.aprnovo){ state.aprForm={ciclos:3,minAtos:10,inicio:mesHoje(),fns:[],nats:[]}; renderApr(); return true; }
    if (t.dataset.aprcancelar){ state.aprForm=null; renderApr(); return true; }
    if (t.dataset.apreditar){ state.aprForm=JSON.parse(JSON.stringify(state.apr[t.dataset.apreditar])); renderApr(); return true; }
    if (t.dataset.aprsalvarf){ var f=aprLerForm(); if (!f.k){ toast('Escolha a pessoa'); return true; } if (!f.pop){ toast('Informe o código do POP'); return true; } if (!f.fns.length){ toast('Marque ao menos uma função do escopo'); return true; }
      var P=aprPessoas(), novo=!f.id; f.id=f.id||('apr-'+Date.now().toString(36)); f.nome=P[f.k]||f.nome||f.k; f.avals=f.avals||{}; f.status=f.status||'ativo'; f.criadoEm=f.criadoEm||new Date().toISOString(); f.por=f.por||nomeUsuario();
      aprSalvar(f).then(function(){ toast(novo?'Registro criado':'Registro atualizado'); }); state.aprForm=null; state.aprAberto=f.id; renderApr(); return true; }
    if (t.dataset.aprarquivar){ if (!confirm('Arquivar este registro? Ele sai da lista (fica guardado no banco).')) return true; var a0=state.apr[t.dataset.aprarquivar]; if (dbPronto&&podeEscrever) db.doc('aprendiz/'+a0.id).delete(); var c=Object.assign({},state.apr); delete c[a0.id]; state.apr=c; state.aprForm=null; renderApr(); return true; }
    if (t.dataset.aprabrir!=null){ var id=t.dataset.aprabrir; if (t.dataset.aprmes){ state.aprAberto=id; state.aprMes=t.dataset.aprmes; } else state.aprAberto=state.aprAberto===id?null:id; renderApr(); return true; }
    if (t.dataset.aprsalvarav){ var a=JSON.parse(JSON.stringify(state.apr[t.dataset.aprsalvarav])), m=state.aprMes, R=aprMes(a,m), v=($('aprRes')||{}).value||''; a.avals=a.avals||{}; a.avals[m]=Object.assign({},a.avals[m]||{},{res:v||null, obs:String(($('aprResObs')||{}).value||'').trim(), sug:R.sug, nd:R.nd, ninc:R.inc.length, nrel:R.nRel, em:new Date().toISOString(), por:nomeUsuario()});
      aprSalvar(a).then(function(){ toast('Ciclo salvo'); }); renderApr(); return true; }
    if (t.dataset.aprconcluir){ var c2=($('aprConc')||{}).value, o2=String(($('aprConcObs')||{}).value||'').trim(); if (!c2){ toast('Escolha Eficaz ou Não eficaz'); return true; } if (!o2){ toast('Escreva a justificativa'); return true; }
      var b=JSON.parse(JSON.stringify(state.apr[t.dataset.aprconcluir])); b.status='concluido'; b.conclusao=c2; b.concObs=o2; b.concluidoEm=new Date().toISOString(); b.concPor=nomeUsuario(); aprSalvar(b).then(function(){ toast('Aprendizagem concluída'); }); renderApr(); return true; }
    if (t.dataset.aprreabrir){ var r2=JSON.parse(JSON.stringify(state.apr[t.dataset.aprreabrir])); r2.status='ativo'; aprSalvar(r2); renderApr(); return true; }
    if (t.dataset.aprxls){ aprXls(); return true; }
    return false; }
  function aprMudou(t){
    if (t.dataset.aprrel!=null){ var a=JSON.parse(JSON.stringify(state.apr[state.aprAberto])), m=state.aprMes; a.avals=a.avals||{}; var av=a.avals[m]=Object.assign({},a.avals[m]||{}); av.rel=Object.assign({},av.rel||{}); if (t.checked) av.rel[t.dataset.aprrel]=true; else delete av.rel[t.dataset.aprrel]; aprSalvar(a); renderApr(); return true; }
    if (t.id==='aprK'||t.dataset.aprfn!=null){ state.aprForm=aprLerForm(); renderApr(); return true; }
    return false; }
  function aprXls(){ precisaXLSX().then(function(X){ var rows=[['Pessoa','POP','Título do POP','Escopo (funções)','Naturezas','Ciclo','Mês','Atos no escopo','Inconformidades no mês','Relacionadas ao POP','Sugestão do painel','Resultado','Observação','Salvo em','Por','Conclusão','Justificativa']];
      aprLista().forEach(function(a){ aprMeses(a).forEach(function(m,i){ var R=aprMes(a,m), av=(a.avals||{})[m]||{}; rows.push([a.nome,a.pop,a.popTit||'',(a.fns||[]).join(', '),(a.nats||[]).join(', '),i+1,nomeMes(m),R.nd,R.inc.length,R.nRel,(APR_RES[R.sug]||['',''])[1],(APR_RES[av.res]||['','pendente'])[1],av.obs||'',av.em?new Date(av.em).toLocaleString('pt-BR'):'',av.por||'',a.status==='concluido'?(APR_RES[a.conclusao]||['',''])[1]:'',a.concObs||'']); }); });
      var ws=X.utils.aoa_to_sheet(rows), wb=X.utils.book_new(); X.utils.book_append_sheet(wb,ws,'Aprendizagem'); var out=X.write(wb,{type:'array',bookType:'xlsx'});
      if (!downloads) return toast('Download indisponível nesta visualização');
      downloads.save({filename:'Aprendizagem - avaliacao de eficacia - '+new Date().toISOString().slice(0,10)+'.xlsx', data:new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}).then(function(){ toast('Planilha baixada'); }); }).catch(function(e){ toast(e.message); }); }
  // relatório por pessoa: seção "Em aprendizagem"
  function aprRelHTML(k){ var L=aprLista().filter(function(a){ return a.k===k; }); if (!L.length) return '';
    return '<h2>Em aprendizagem</h2>'+L.map(function(a){ var ms=aprMeses(a);
      return '<p class="nota"><b>'+esc(a.pop)+(a.popTit?' — '+esc(a.popTit):'')+'</b> · escopo: '+esc((a.fns||[]).join(', '))+' · '+ms.length+' ciclo(s) desde '+esc(nomeMes(ms[0]))+(a.status==='concluido'?' · concluído: '+esc((APR_RES[a.conclusao]||['','—'])[1]):'')+'</p><table><thead><tr><th>Mês</th><th class="n">Atos no escopo</th><th class="n">Inconf. relacionadas</th><th>Resultado</th><th>Observação</th></tr></thead><tbody>'+
        ms.map(function(m){ var R=aprMes(a,m), av=(a.avals||{})[m]||{}; return '<tr><td>'+esc(nomeMes(m))+'</td><td class="n">'+R.nd+'</td><td class="n">'+R.nRel+'</td><td>'+aprPill(av.res)+'</td><td>'+esc(av.obs||'')+'</td></tr>'; }).join('')+'</tbody></table>'; }).join(''); }

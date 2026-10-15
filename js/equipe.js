/* Painel SGQ · CRCO — js/equipe.js (0.15.0: página "Equipe e funções" e o que ela leva para o relatório por pessoa)
 * Quem faz o quê (VHL · Produção por Etapa + Tri7 · andamentos e certidões) e comparação só com quem faz a mesma tarefa
 * na mesma natureza. Não soma funções diferentes, não faz ranking, não usa ausência nem atestado. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/equipe.js']='0.15.0';
  var EQ_CORES=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'], EQ_OUTRAS='var(--ink-3)';
  var EQ_TRI={PN:'Prenotação',PA:'Prenotação',RE:'Revisão de exigência',NE:'Nota de exigência',RA:'Re-análise (entrada)',CI:'Custas informadas',SG:'Selos / registro',RC:'Recebido para entrega',CD:'Cancelamento',CP:'Cancelamento',CC:'Cancelamento'};
  // nome da função a partir da etapa do VHL: tira o prazo do nome ("Análise - 1 D", "4H - Análise" e "Análise - 2 D" viram "Análise")
  function eqFn(et){ var s=String(et||'').replace(/\s+/g,' ').trim();
    s=s.replace(/^\d+\s*[HD]\s*-\s*/i,'').replace(/\s*-\s*\d+\s*[HD]$/i,'').replace(/\s*-\s*\d+[HD]$/i,'').trim();
    return s||String(et||''); }
  function eqOculto(k){ return !!(state.eqOcl&&state.eqOcl[k]); }
  function eqSalvarOcl(){ if (dbPronto&&podeEscrever) db.doc('config/equipe').set({ocultos:state.eqOcl||{}}).catch(function(){ toast('Não consegui salvar a lista de ocultos'); }); }
  function eqMesDia(d){ return new Date(d*864e5).toISOString().slice(0,7); }
  function eqNoPeriodo(m){ return state.periodo==='todos'||state.periodo===m; }
  // natureza de cada protocolo do RI (para dar natureza aos andamentos do Tri7)
  function eqNatRI(){ var o={}; Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ o[String(a.c)]=a.nat; }); }); return o; }
  // todas as execuções, de todos os meses carregados: {k, nome, fn, nat, m (mês da execução), pz (d.u. na etapa; só VHL), c, src}
  function eqExecs(){
    var modo=svModo(), chave=[modo,svAtual(),subAtual(),state.riOrig||'todas',state.grVer,Object.keys(state.docs).length,Object.keys(state.logs).length,Object.keys(state.serv).length,state.andVer||0,Object.keys(state.cert).length,Object.keys(state.usr||{}).length].join('|');
    if (state._eqX&&state._eqX.k===chave) return state._eqX.v;
    var X=[];
    function add(nome,fn,nat,m,pz,c,src){ if (!nome||!fn||!m) return; X.push({k:semAc(nome), nome:nome, fn:fn, nat:nat||'(sem natureza)', m:m, pz:(pz==null||isNaN(pz))?null:pz, c:String(c), src:src}); }
    if (modo==='ri'||modo==='todas'){
      Object.keys(state.docs).forEach(function(m){ if (!state.logs[m]) return; var map=state.logCache[m]||(state.logCache[m]=Motor.decodificarLog(state.logs[m]));
        state.docs[m].atos.filter(origOk).forEach(function(a){ var L=map[a.c]; if (!L) return; L.ev.forEach(function(e){ add(e.rp,eqFn(e.et),a.nat,eqMesDia(e.d),e.pz,a.c,'VHL'); }); }); });
      var nat=eqNatRI();
      Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ if (e.t!=='P'||!EQ_TRI[e.s]||!e.u||/^tri7$/i.test(e.u)) return; add(nomeLogin(e.u),EQ_TRI[e.s]+' (Tri7)',nat[String(e.n)]||'(ainda não finalizado)',Motor.isoMin(e.m).slice(0,7),null,e.n,'Tri7'); }); });
    }
    if (modo==='cert'||modo==='todas') Object.keys(state.cert).forEach(function(m){ state.cert[m].recs.forEach(function(r){ if (!r.u||/^tri7$/i.test(r.u)) return; add(r.u,'Certidão (Tri7)',r.nat||'Certidão',String(r.i||m).slice(0,7),null,r.p,'Tri7'); }); });
    if (modo==='serv'||modo==='todas'||modo==='cert') Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){
      if (modo==='cert'){ if (semAc(d.t)!=='certidao - ri') return; } else if (modo==='serv'&&!docOk(d)) return; else if (modo==='todas'&&svDe(d.t)==='Apoio') return;
      d.ets.forEach(function(e){ add(e.rp,eqFn(e.et),d.nat,e.d?eqMesDia(e.d):m,e.pz,d.c,'VHL'); }); }); });
    state._eqX={k:chave, v:X}; return X;
  }
  function eqPeriodo(){ return eqExecs().filter(function(x){ return eqNoPeriodo(x.m); }); }
  function eqMin(){ return state.eqMin||10; }
  // contagens: pessoa × função e função × natureza × pessoa
  function eqContar(X){ var PF={}, F={}, FN={}, nomes={};
    X.forEach(function(x){ nomes[x.k]=nomes[x.k]||x.nome; var p=PF[x.k]=PF[x.k]||{}; p[x.fn]=(p[x.fn]||0)+1; F[x.fn]=(F[x.fn]||0)+1;
      var f=FN[x.fn]=FN[x.fn]||{}, n=f[x.nat]=f[x.nat]||{}; n[x.k]=(n[x.k]||0)+1; });
    return {PF:PF, F:F, FN:FN, nomes:nomes}; }
  function eqNFuncoes(PF,k){ var mn=eqMin(); return Object.keys(PF[k]||{}).filter(function(f){ return PF[k][f]>=mn; }).length; }
  // funções e naturezas que dependem de uma só pessoa (contando as ocultas, sem mostrar o nome delas)
  function eqDependencias(Q){ var mn=eqMin(), out=[];
    Object.keys(Q.FN).forEach(function(f){ if (Q.F[f]<20) return;
      var porP={}; Object.keys(Q.FN[f]).forEach(function(n){ Object.keys(Q.FN[f][n]).forEach(function(k){ porP[k]=(porP[k]||0)+Q.FN[f][n][k]; }); });
      var fortes=Object.keys(porP).filter(function(k){ return porP[k]>=mn; });
      if (fortes.length===1) out.push({fn:f, nat:null, k:fortes[0], n:Q.F[f]});
      else Object.keys(Q.FN[f]).forEach(function(n){ var L=Q.FN[f][n], tot=0; Object.keys(L).forEach(function(k){ tot+=L[k]; }); if (tot<20||n.charAt(0)==='(') return;
        var fk=Object.keys(L).filter(function(k){ return L[k]>=Math.max(3,tot*0.1); }); if (fk.length===1) out.push({fn:f, nat:n, k:fk[0], n:tot}); }); });
    return out.sort(function(a,b){ return b.n-a.n; }); }
  function eqNomeOuOculto(Q,k){ return eqOculto(k)?'pessoa oculta':Q.nomes[k]; }
  // comparação dentro de uma função e natureza: tempo na etapa (d.u.) de cada pessoa × os colegas
  function eqComparar(X, fn, nat){
    var L=X.filter(function(x){ return x.fn===fn && x.nat===nat && x.pz!=null && !eqOculto(x.k); }), P={}, todos=[];
    L.forEach(function(x){ (P[x.k]=P[x.k]||{k:x.k,nome:x.nome,pz:[],docs:{}}).pz.push(x.pz); P[x.k].docs[x.c]=1; todos.push(x.pz); });
    var ix=eqIncIdx();
    var R=Object.keys(P).map(function(k){ var p=P[k], out=[]; Object.keys(P).forEach(function(j){ if (j!==k) out=out.concat(P[j].pz); });
      var t=zWelch(p.pz,out), l=leitura(t,p.pz.length,'mais lento','mais rápido'), nd=Object.keys(p.docs), ni=nd.filter(function(c){ return (ix[c]||{})[k]; }).length;
      return {k:k, nome:p.nome, n:p.pz.length, med:media(p.pz), l:out.length>=MIN_N?l:{txt:'poucos colegas',cls:'mut'}, nd:nd.length, ni:ni}; }).sort(function(a,b){ return b.n-a.n; });
    return {R:R, q1:quant(todos,.25), med:quant(todos,.5), q3:quant(todos,.75), p90:quant(todos,.9), n:todos.length}; }
  // inconformidades: código do documento -> pessoas responsáveis
  function eqIncIdx(){ var k=Object.keys(state.inconf).length+'|'+Object.keys(state.incCat||{}).length; if (state._eqI&&state._eqI.k===k) return state._eqI.v; var o={};
    incTodos().forEach(function(r){ var c=String(r.c); (o[c]=o[c]||{})[semAc(r.r)]=1; }); state._eqI={k:k,v:o}; return o; }
  // faixa da equipe (metade do meio) com a mediana e o ponto da pessoa
  function eqFaixa(v,q1,med,q3,hi,w){ w=w||300; hi=Math.max(hi||1,v||0)*1.05||1; var x=function(t){ return 8+(w-16)*Math.max(0,Math.min(1,t/hi)); };
    return '<svg class="eq-fx" viewBox="0 0 '+w+' 24" width="100%" height="24" preserveAspectRatio="none" aria-hidden="true"><line x1="8" x2="'+(w-8)+'" y1="12" y2="12" style="stroke:var(--line)"/>'+
      (q1!=null?'<rect x="'+x(q1).toFixed(1)+'" y="6" width="'+Math.max(2,x(q3)-x(q1)).toFixed(1)+'" height="12" rx="3" style="fill:var(--ink-3);opacity:.22"/><line x1="'+x(med).toFixed(1)+'" x2="'+x(med).toFixed(1)+'" y1="3" y2="21" style="stroke:var(--ink-2)" stroke-width="2"/>':'')+
      (v!=null?'<circle cx="'+x(v).toFixed(1)+'" cy="12" r="5.5" style="fill:var(--serie);stroke:var(--surface)" stroke-width="2"/>':'')+'</svg>'; }
  function eqLeitPill(l){ var c=l.cls==='acima'?'warn':l.cls==='bom'?'good':'mute'; return '<span class="pill '+c+'">'+esc(l.txt==='normal'?'dentro do esperado':l.txt)+'</span>'; }
  function eqBarra(partes, tot, rot){ return '<div class="eq-bar">'+partes.map(function(p){ var w=p.v/tot*100; return '<span style="width:'+w.toFixed(2)+'%;background:'+p.cor+'" data-tip="'+esc('<b>'+esc(p.nome)+'</b><br>'+p.v.toLocaleString('pt-BR')+' ('+pct(w)+')')+'"></span>'; }).join('')+'</div>'; }
  function eqTop(partes, tot, n, pc){ return partes.filter(function(p){ return p.nome!=='Outras'&&p.nome!=='Demais pessoas'; }).slice().sort(function(a,b){ return b.v-a.v; }).slice(0,n).map(function(p){ return esc(p.nome)+' <b>'+(pc?Math.round(p.v/tot*100)+'%':p.v)+'</b>'; }).join(' · '); }

  // ——— página
  function renderEqp(){
    var el=$('tabEqp'); if (!el) return;
    var X=eqPeriodo(); if (!X.length){ el.innerHTML='<div class="empty"><b>Sem execuções no período</b>Importe a Produção por Etapa (PAINEL-02), a Prazo e Tempo Médio (PAINEL-01) e o Relatório de andamentos do Tri7.</div>'; return; }
    var Q=eqContar(X), mn=eqMin(), ocl=Object.keys(state.eqOcl||{});
    var vis=Object.keys(Q.PF).filter(function(k){ if (eqOculto(k)) return false; var t=0; Object.keys(Q.PF[k]).forEach(function(f){ t+=Q.PF[k][f]; }); return t>=mn; })
      .sort(function(a,b){ return String(Q.nomes[a]).localeCompare(String(Q.nomes[b]),'pt-BR'); });
    // etapas do VHL primeiro, andamentos do Tri7 depois (cada grupo pelo volume)
    var triF=function(f){ return /\(Tri7\)$/.test(f); }, fns=Object.keys(Q.F).sort(function(a,b){ return (triF(a)-triF(b)) || Q.F[b]-Q.F[a]; });
    var fV=fns.filter(function(f){ return !triF(f); }), fT=fns.filter(triF), fnsV=state.eqTodasFn?fns:fV.slice(0,9).concat(fT.slice(0,4));
    var h='<div class="sec-h"><span class="note">Quem faz o quê e como cada pessoa está em relação aos colegas que fazem a mesma tarefa, no mesmo tipo de ato. Não é ranking. Fontes: VHL (Produção por Etapa) e Tri7 (andamentos e certidões). Mês = mês da execução.</span></div>'+
      '<div class="search eq-f"><label>Mínimo para contar <select id="eqMin" aria-label="Mínimo de execuções">'+[5,10,20,50].map(function(v){ return '<option'+(v===mn?' selected':'')+'>'+v+'</option>'; }).join('')+'</select> execuções</label><span class="spacer"></span>'+
      (ocl.length?'<button class="btn sm" type="button" data-eqocl="1" aria-expanded="'+(state.eqVerOcl?'true':'false')+'">'+ocl.length+' pessoa'+(ocl.length>1?'s':'')+' oculta'+(ocl.length>1?'s':'')+' ↺</button>':'')+'</div>';
    if (state.eqVerOcl && ocl.length) h+='<div class="eq-ocl">'+ocl.sort().map(function(k){ return '<span class="chip">'+esc(state.eqOcl[k])+' <button class="lnk" type="button" data-eqmostrar="'+esc(k)+'" title="Voltar a mostrar" aria-label="Voltar a mostrar '+esc(state.eqOcl[k])+'">↺</button></span>'; }).join('')+'<span class="hint">As pessoas ocultas saem desta página e da comparação dos relatórios. Os dados delas continuam guardados.</span></div>';
    // 1. quem faz o quê
    var mxF={}; fnsV.forEach(function(f){ mxF[f]=0; vis.forEach(function(k){ mxF[f]=Math.max(mxF[f],(Q.PF[k]||{})[f]||0); }); });
    h+='<div class="panel eq-p"><div class="sub-h">Quem faz o quê · execuções no período</div><p class="hint" style="margin:0 0 8px">Cor mais forte = mais execuções naquela função (cada coluna na sua escala). Clique numa função para ver as naturezas.'+(fns.length>fnsV.length||state.eqTodasFn?' <button class="lnk" type="button" data-eqtodasfn="1">'+(state.eqTodasFn?'Mostrar só as maiores':'Mostrar todas as '+fns.length+' funções')+'</button>':'')+'</p>'+
      '<div class="tbl-wrap"><table class="eq-g"><thead><tr><th></th>'+(function(){ var nv=fnsV.filter(function(f){ return !triF(f); }).length, nt=fnsV.length-nv; return (nv?'<th colspan="'+nv+'" class="eq-grp">VHL · etapas</th>':'')+(nt?'<th colspan="'+nt+'" class="eq-grp">Tri7 · andamentos</th>':''); })()+'<th></th></tr><tr><th class="tleft">Pessoa</th>'+fnsV.map(function(f){ return '<th><button class="lnk eq-th'+(state.eqFn===f?' on':'')+'" type="button" data-eqfn="'+esc(f)+'">'+esc(f)+'</button></th>'; }).join('')+'<th>Funções</th></tr></thead><tbody>'+
      vis.map(function(k){ return '<tr><td class="tleft"><span class="eq-nm">'+(podeEscrever?'<button class="eq-x" type="button" data-eqocultar="'+esc(k)+'" title="Ocultar desta página" aria-label="Ocultar '+esc(Q.nomes[k])+'">×</button>':'')+esc(Q.nomes[k])+'</span></td>'+
        fnsV.map(function(f){ var v=(Q.PF[k]||{})[f]||0, t=mxF[f]?Math.sqrt(v/mxF[f]):0; return '<td>'+(v?'<span class="eq-c'+(v<mn?' fraco':'')+'" style="--a:'+(0.08+0.47*t).toFixed(2)+'" data-tip="'+esc('<b>'+esc(Q.nomes[k])+'</b><br>'+esc(f)+': '+v.toLocaleString('pt-BR')+' execuções'+(v<mn?' (abaixo do mínimo para contar)':''))+'">'+v.toLocaleString('pt-BR')+'</span>':'<span class="mut">·</span>')+'</td>'; }).join('')+
        '<td class="mut" style="white-space:nowrap">'+eqNFuncoes(Q.PF,k)+(eqNFuncoes(Q.PF,k)===1?' função':' funções')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    var dep=eqDependencias(Q).slice(0,6);
    if (dep.length) h+='<div class="banner warn" style="margin:10px 0 0"><b>Dependem de uma pessoa só:</b> '+dep.map(function(d){ return esc(d.fn+(d.nat?' · '+d.nat:''))+' ('+esc(eqNomeOuOculto(Q,d.k))+')'; }).join(' · ')+'. Em férias ou ausência dessa pessoa, o serviço para.</div>';
    h+='</div>';
    // 2. dentro de uma função
    var fsel=state.eqFn&&Q.F[state.eqFn]?state.eqFn:(fns.filter(function(f){ var n=0; Object.keys(Q.PF).forEach(function(k){ if (!eqOculto(k)&&(Q.PF[k][f]||0)>=mn) n++; }); return n>=2; })[0]||fns[0]); state.eqFn=fsel;
    var FN=Q.FN[fsel]||{}, nats=Object.keys(FN).map(function(n){ var t=0; Object.keys(FN[n]).forEach(function(k){ t+=FN[n][k]; }); return {n:n,t:t}; }).sort(function(a,b){ return b.t-a.t; });
    var top=nats.slice(0,6).map(function(x){ return x.n; }), totF=Q.F[fsel]||1, cor={}; top.forEach(function(n,i){ cor[n]=EQ_CORES[i]; });
    var pessF=vis.filter(function(k){ return (Q.PF[k][fsel]||0)>0; }).sort(function(a,b){ return Q.PF[b][fsel]-Q.PF[a][fsel]; });
    h+='<div class="panel eq-p"><div class="sub-h">Dentro da função <select id="eqFnSel" aria-label="Função">'+fns.map(function(f){ return '<option'+(f===fsel?' selected':'')+'>'+esc(f)+'</option>'; }).join('')+'</select></div>'+
      '<div class="two"><div><div class="sub-h">O que cada um faz nesta função</div>'+pessF.map(function(k){ var tot=Q.PF[k][fsel], partes=[], outras=0, nn=0, nao=[];
        nats.forEach(function(x){ var v=(FN[x.n]||{})[k]||0; if (v) nn++; if (cor[x.n]) { if (v) partes.push({nome:x.n,v:v,cor:cor[x.n]}); else if (x.t>=totF*0.05 && x.n.charAt(0)!=='(') nao.push(x.n); } else outras+=v; });
        if (outras) partes.push({nome:'Outras',v:outras,cor:EQ_OUTRAS});
        return '<div class="eq-np"><b>'+esc(Q.nomes[k])+'</b>'+eqBarra(partes,tot)+'<span class="mut">'+tot.toLocaleString('pt-BR')+' · '+nn+' natureza'+(nn>1?'s':'')+'</span><small class="eq-det">'+eqTop(partes,tot,3)+'</small>'+(nao.length?'<small class="eq-nao">Não faz: '+esc(nao.join(', '))+'</small>':'')+'</div>'; }).join('')+
      '<div class="leg">'+top.map(function(n){ return '<span><i class="dot" style="background:'+cor[n]+'"></i>'+esc(n)+'</span>'; }).join('')+(nats.length>6?'<span><i class="dot" style="background:'+EQ_OUTRAS+'"></i>Outras</span>':'')+'</div></div>';
    var corP={}; pessF.slice(0,6).forEach(function(k,i){ corP[k]=EQ_CORES[i]; });
    h+='<div><div class="sub-h">Parte de cada um por natureza</div>'+nats.slice(0,8).map(function(x){ var L=FN[x.n], partes=[], out=0, nvis=0;
        Object.keys(L).sort(function(a,b){ return L[b]-L[a]; }).forEach(function(k){ if (corP[k]) partes.push({nome:Q.nomes[k],v:L[k],cor:corP[k]}); else out+=L[k]; if (L[k]>=Math.max(3,x.t*0.1)) nvis++; });
        if (out) partes.push({nome:'Demais pessoas',v:out,cor:EQ_OUTRAS});
        return '<div class="eq-np"><b>'+esc(x.n)+'</b>'+eqBarra(partes,x.t,'%')+'<span class="mut">'+x.t.toLocaleString('pt-BR')+(nvis===1&&x.t>=20?' · <b class="eq-1p">1 pessoa</b>':'')+'</span><small class="eq-det">'+eqTop(partes,x.t,2,true)+'</small></div>'; }).join('')+
      '<div class="leg">'+pessF.slice(0,6).map(function(k){ return '<span><i class="dot" style="background:'+corP[k]+'"></i>'+esc(Q.nomes[k])+'</span>'; }).join('')+(pessF.length>6?'<span><i class="dot" style="background:'+EQ_OUTRAS+'"></i>Demais pessoas</span>':'')+'</div></div></div></div>';
    // 3. comparação dentro da função e natureza
    var natCmp=nats.filter(function(x){ return X.some(function(y){ return y.fn===fsel&&y.nat===x.n&&y.pz!=null; }); }), nsel=state.eqNat&&natCmp.some(function(x){ return x.n===state.eqNat; })?state.eqNat:(natCmp[0]||{}).n; state.eqNat=nsel;
    if (!nsel) h+='<div class="panel eq-p"><div class="sub-h">Comparação com os colegas</div><p class="hint">Esta função vem do Tri7, que não informa o tempo de cada etapa. A comparação de tempo existe só para as etapas do VHL.</p></div>';
    else { var C=eqComparar(X,fsel,nsel), hi=Math.max(C.p90||1,1), PFv=Q.PF;
      h+='<div class="panel eq-p"><div class="sub-h">Comparação com os colegas · '+esc(fsel)+' · <select id="eqNatSel" aria-label="Natureza">'+natCmp.map(function(x){ return '<option'+(x.n===nsel?' selected':'')+'>'+esc(x.n)+'</option>'; }).join('')+'</select></div>'+
        '<p class="hint" style="margin:0 0 8px">Só quem fez esta etapa nesta natureza no período. Tempo = dias úteis que o documento ficou na etapa até a pessoa executar. Barra cinza = metade do meio da equipe; traço = mediana; ponto = a pessoa.</p>'+
        '<div class="tbl-wrap"><table class="eq-cmp"><thead><tr><th class="tleft">Pessoa</th><th>Execuções</th><th>Tempo médio (d.u.)</th><th style="min-width:150px;width:22%">Posição na equipe <span class="mut">· 0 a '+numBR(hi,1)+' d.u.</span></th><th>Docs. com inconf.</th><th>Leitura</th></tr></thead><tbody>'+
        C.R.map(function(r){ var nf=eqNFuncoes(PFv,r.k); return '<tr><td class="tleft"><span class="eq-nm">'+(podeEscrever?'<button class="eq-x" type="button" data-eqocultar="'+esc(r.k)+'" title="Ocultar desta página" aria-label="Ocultar '+esc(r.nome)+'">×</button>':'')+esc(r.nome)+(nf>=2?' <span class="eq-tag">divide o dia com '+nf+' funções</span>':'')+'</span></td><td>'+r.n+'</td><td><b>'+numBR(r.med,1)+'</b></td><td>'+(r.n>=MIN_N?eqFaixa(r.med,C.q1,C.med,C.q3,hi,200):'<span class="mut">—</span>')+'</td><td>'+r.ni+' de '+r.nd+'</td><td>'+(r.n>=MIN_N?eqLeitPill(r.l):'<span class="pill mute">poucos casos</span>')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
        '<p class="hint">A leitura só sai de "dentro do esperado" quando a diferença para os colegas é clara (95% de confiança) e passa de '+numBR(DES_MIN_DIF,1)+' d.u. Quem divide o dia entre várias funções faz menos por dia em cada uma: o volume é só informativo. O painel só enxerga o trabalho registrado em etapas do VHL e andamentos do Tri7; atendimento de balcão aparece em Atendimento, e tarefas fora do sistema não aparecem.</p></div>'; }
    el.innerHTML=h;
  }

  // ——— relatório por pessoa
  function eqUlt6(){ var ms={}; [state.docs,state.serv].forEach(function(o){ Object.keys(o||{}).forEach(function(m){ ms[m]=1; }); }); ms=Object.keys(ms).sort();
    var fim=state.periodo!=='todos'?state.periodo:ms[ms.length-1]; if (!fim) return []; var out=[fim]; while (out.length<6){ var a=mesAnt(out[0]); if (ms.indexOf(a)<0&&a<ms[0]) break; out.unshift(a); } return out; }
  function eqEmpilhadas(ms, series, o){ o=o||{}; var W=520, H=o.H||200, pl=36, pr=8, pt=12, pb=24, tot=ms.map(function(m,i){ var s=0; series.forEach(function(se){ s+=se.v[i]||0; }); return s; }), mx=Math.max.apply(null,tot.concat([1]));
    var bw=(W-pl-pr)/ms.length, y=function(v){ return pt+(H-pt-pb)*(1-v/mx); }, s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+esc(o.titulo||'')+'">';
    [0,mx/2,mx].forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t).toFixed(1)+'" y2="'+y(t).toFixed(1)+'" style="stroke:var(--line)"/><text x="'+(pl-5)+'" y="'+(y(t)+3.5).toFixed(1)+'" text-anchor="end" font-size="11" style="fill:var(--ink-3)">'+Math.round(t)+'</text>'; });
    ms.forEach(function(m,i){ var x=pl+i*bw+bw*0.2, acc=0, tip='<b>'+compLabel(m)+'</b>';
      series.forEach(function(se){ var v=se.v[i]||0; if (!v) return; var y1=y(acc+v), y0=y(acc); s+='<rect x="'+x.toFixed(1)+'" y="'+y1.toFixed(1)+'" width="'+(bw*0.6).toFixed(1)+'" height="'+Math.max(0,y0-y1-1.5).toFixed(1)+'" rx="2" style="fill:'+se.cor+'"/>'; acc+=v; tip+='<br>'+esc(se.nome)+': '+v; });
      s+='<text x="'+(x+bw*0.3).toFixed(1)+'" y="'+(H-7)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)">'+MES_AB[+m.slice(5)-1]+'</text><rect x="'+(pl+i*bw).toFixed(1)+'" y="0" width="'+bw.toFixed(1)+'" height="'+H+'" fill="transparent" data-tip="'+esc(tip)+'"/>'; });
    return s+'</svg><div class="leg">'+series.map(function(se){ return '<span><i class="dot" style="background:'+se.cor+'"></i>'+esc(se.nome)+'</span>'; }).join('')+'</div>'; }
  // dados da pessoa para o relatório: células função × natureza, "só você faz", qualidade por função e sugestões de devolutiva
  function eqPessoa(k){
    var Xall=eqExecs(), X=Xall.filter(function(x){ return eqNoPeriodo(x.m); }), mine=X.filter(function(x){ return x.k===k; }); if (!mine.length) return null;
    var cel={}; mine.forEach(function(x){ var c=cel[x.fn+'|'+x.nat]=cel[x.fn+'|'+x.nat]||{fn:x.fn,nat:x.nat,n:0,pz:[]}; c.n++; if (x.pz!=null) c.pz.push(x.pz); });
    var pos=Object.keys(cel).map(function(id){ return cel[id]; }).filter(function(c){ return c.pz.length>=5; }).sort(function(a,b){ return b.n-a.n; }).slice(0,8).map(function(c){
      var C=eqComparar(X,c.fn,c.nat), r=C.R.filter(function(z){ return z.k===k; })[0]; return {fn:c.fn,nat:c.nat,n:c.n,med:r?r.med:media(c.pz),l:r?r.l:{txt:'poucos dados',cls:'mut'},q1:C.q1,qm:C.med,q3:C.q3,hi:C.p90}; });
    // só você faz: naturezas da função em que a pessoa faz 60%+ (com 10+ execuções no total)
    var tot={}; X.forEach(function(x){ if (eqOculto(x.k)&&x.k!==k) return; var id=x.fn+'|'+x.nat; tot[id]=(tot[id]||0)+1; });
    var so=Object.keys(cel).map(function(id){ return {fn:cel[id].fn,nat:cel[id].nat,n:cel[id].n,t:tot[id]||cel[id].n}; }).filter(function(c){ return c.t>=10&&c.n/c.t>=0.6&&c.nat.charAt(0)!=='('; }).sort(function(a,b){ return b.t-a.t; }).slice(0,6);
    // qualidade por função: documentos da pessoa com inconformidade dela ÷ documentos dela; equipe = mesma conta para os colegas
    var ix=eqIncIdx(), fnP={}, fnE={};
    X.forEach(function(x){ if (x.src!=='VHL') return; if (eqOculto(x.k)&&x.k!==k) return; var tgt=x.k===k?fnP:fnE, f=tgt[x.fn]=tgt[x.fn]||{}; f[x.c+'|'+x.k]=(ix[x.c]||{})[x.k]?1:0; });
    var qual=Object.keys(fnP).map(function(f){ var a=fnP[f], b=fnE[f]||{}, na=Object.keys(a).length, nb=Object.keys(b).length, ia=0, ib=0; Object.keys(a).forEach(function(z){ ia+=a[z]; }); Object.keys(b).forEach(function(z){ ib+=b[z]; });
      return {fn:f, n:na, i:ia, t:na?ia/na*100:null, te:nb?ib/nb*100:null}; }).filter(function(q){ return q.n>=10; }).sort(function(a,b){ return b.n-a.n; }).slice(0,6);
    // mês a mês: execuções por função (as 4 maiores da pessoa + outras), últimos 6 meses
    var ms=eqUlt6(), pf={}; Xall.forEach(function(x){ if (x.k===k&&ms.indexOf(x.m)>=0) pf[x.fn]=(pf[x.fn]||0)+1; }); var fTop=Object.keys(pf).sort(function(a,b){ return pf[b]-pf[a]; }).slice(0,4);
    var ser=fTop.map(function(f,i){ return {nome:f,cor:EQ_CORES[i],v:ms.map(function(m){ return Xall.filter(function(x){ return x.k===k&&x.m===m&&x.fn===f; }).length; })}; });
    var out=ms.map(function(m){ return Xall.filter(function(x){ return x.k===k&&x.m===m&&fTop.indexOf(x.fn)<0; }).length; }); if (out.some(function(v){ return v; })) ser.push({nome:'Outras',cor:EQ_OUTRAS,v:out});
    var nf=Object.keys(mine.reduce(function(o,x){ o[x.fn]=(o[x.fn]||0)+1; return o; },{})).length;
    return {pos:pos, so:so, qual:qual, ms:ms, ser:ser, nFn:nf}; }
  function eqSugestoes(E){ var f=[], a=[]; if (!E) return {fortes:'',atencao:''};
    E.pos.forEach(function(p){ if (p.l.cls==='bom') f.push(p.fn+' · '+p.nat+': mais rápida que os colegas ('+numBR(p.med,1)+' d.u. × mediana '+numBR(p.qm,1)+').'); if (p.l.cls==='acima') a.push(p.fn+' · '+p.nat+': mais lenta que os colegas ('+numBR(p.med,1)+' d.u. × mediana '+numBR(p.qm,1)+').'); });
    E.so.slice(0,3).forEach(function(s){ f.push((s.n===s.t?'Única pessoa':'Principal responsável ('+Math.round(s.n/s.t*100)+'%)')+' em '+s.fn+' · '+s.nat+'.'); });
    if (E.nFn>=3) f.push('Atua em '+E.nFn+' funções no período.');
    E.qual.forEach(function(q){ if (q.te!=null&&q.t!=null&&q.i>=3&&q.t>q.te*1.3) a.push(q.fn+': '+pct(q.t)+' dos documentos com inconformidade (colegas '+pct(q.te)+').'); });
    return {fortes:f.map(function(x){ return '• '+x; }).join('\n'), atencao:a.map(function(x){ return '• '+x; }).join('\n')}; }
  function eqRelHTML(k){
    var E=eqPessoa(k); if (!E) return '';
    var h='<h2>Funções e comparação com os colegas</h2>';
    if (E.pos.length) h+='<p class="nota">Cada linha compara só com quem fez a mesma etapa na mesma natureza no período. Barra cinza = metade do meio da equipe; traço = mediana; ponto = a pessoa. Mais à esquerda = documento ficou menos tempo na etapa.</p><table class="eq-rp"><tbody>'+
      E.pos.map(function(p){ return '<tr><td><b>'+esc(p.fn)+'</b> · '+esc(p.nat)+'</td><td class="n">'+p.n+'</td><td class="n">'+numBR(p.med,1)+' d.u.</td><td style="width:38%">'+eqFaixa(p.med,p.q1,p.qm,p.q3,Math.max(p.hi||1,1),260)+'</td><td>'+eqLeitPill(p.l)+'</td></tr>'; }).join('')+'</tbody></table>';
    h+='<div class="rgraf" style="margin-top:10px">';
    if (E.ser.length&&E.ms.length>1) h+='<div class="rg"><b>O que fez, mês a mês</b><small>execuções por função · últimos 6 meses · pela data da execução</small>'+eqEmpilhadas(E.ms,E.ser,{titulo:'Execuções por função, mês a mês'})+'</div>';
    if (E.qual.length) h+='<div class="rg"><b>Qualidade por função</b><small>% dos documentos com inconformidade da pessoa · colegas na mesma função</small>'+E.qual.map(function(q){ var mx=Math.max(q.t||0,q.te||0,1);
      return '<div class="eq-q"><span>'+esc(q.fn)+'</span><div><i style="width:'+((q.t||0)/mx*100).toFixed(1)+'%;background:'+(q.te!=null&&q.t>q.te*1.3&&q.i>=3?'var(--crit)':'var(--serie)')+'"></i><i style="width:'+((q.te||0)/mx*100).toFixed(1)+'%;background:var(--ink-3);opacity:.35"></i></div><span class="n"><b>'+pct(q.t)+'</b> · '+pct(q.te)+'</span></div>'; }).join('')+'<div class="leg"><span><i class="dot" style="background:var(--serie)"></i>Pessoa</span><span><i class="dot" style="background:var(--ink-3);opacity:.35"></i>Colegas</span></div></div>';
    h+='</div>';
    if (E.so.length) h+='<h2>Só você faz</h2><div class="eq-so">'+E.so.map(function(s){ return '<div><b>'+(s.n===s.t?'única':Math.round(s.n/s.t*100)+'%')+'</b>'+esc(s.fn)+' · '+esc(s.nat)+'<small>'+s.n+' de '+s.t+' no período</small></div>'; }).join('')+'</div>';
    return h; }

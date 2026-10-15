/* Painel SGQ · CRCO — js/equipe.js (0.15.0: página "Equipe e funções" e o que ela leva para o relatório por pessoa)
 * Quem faz o quê (VHL · Produção por Etapa + Tri7 · andamentos e certidões) e comparação só com quem faz a mesma tarefa
 * na mesma natureza. Não soma funções diferentes, não faz ranking, não usa ausência nem atestado. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/equipe.js']='0.19.0';
  var EQ_CORES=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'], EQ_OUTRAS='var(--ink-3)';
  var EQ_TRI={PN:'Prenotação',PA:'Prenotação',RE:'Revisão de exigência',NE:'Nota de exigência',RA:'Re-análise (entrada)',CI:'Custas informadas',SG:'Selos / registro',RC:'Recebido para entrega',CD:'Cancelamento',CP:'Cancelamento',CC:'Cancelamento'};
  // nome da função a partir da etapa do VHL: tira o prazo do nome ("Análise - 1 D", "4H - Análise" e "Análise - 2 D" viram "Análise")
  function eqFn(et){ var s=String(et||'').replace(/\s+/g,' ').trim();
    s=s.replace(/^\d+\s*[HD]\s*-\s*/i,'').replace(/\s*-\s*\d+\s*[HD]$/i,'').replace(/\s*-\s*\d+[HD]$/i,'').trim();
    return s||String(et||''); }
  // prazo que o próprio nome da etapa traz: "1 D" = 1 dia útil, "4H" = meio dia, "2H" = 1/4
  function eqMetaEt(et){ var s=String(et||''), m=s.match(/(\d+)\s*D\b/i)||s.match(/^(\d+)D\s*-/i); if (m) return +m[1]; m=s.match(/(\d+)\s*H\b/i); if (m) return Math.round(+m[1]/8*100)/100; return null; }
  function eqOculto(k){ return !!(state.eqOcl&&state.eqOcl[k]); }
  function eqSalvarOcl(){ if (dbPronto&&podeEscrever) db.doc('config/equipe').set({ocultos:state.eqOcl||{}}).catch(function(){ toast('Não consegui salvar a lista de ocultos'); }); }
  function eqMesDia(d){ return new Date(d*864e5).toISOString().slice(0,7); }
  function eqNoPeriodo(m){ return state.periodo==='todos'||state.periodo===m; }
  // natureza de cada protocolo do RI (para dar natureza aos andamentos do Tri7)
  function eqNatRI(){ var o={}; Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ o[String(a.c)]=a.nat; }); }); return o; }
  // 0.17.0: setores e funções editáveis. A etapa crua (do VHL ou do Tri7) vira função pela tabela da Configuração;
  // sem ajuste, vale a sugestão automática (tira o prazo do nome, junta grafias iguais e o "ONR - " quando a etapa já existe sem ele).
  var EQ_SETORES=['Recepção','Registro (RI)','Intimações','Certidões','RC','RTD/PJ','Apoio'];
  function eqSetorDoc(t){ var n=semAc(t); if (n==='ri') return 'Registro (RI)'; if (n==='intimacoes') return 'Intimações'; if (n==='certidao - ri'||n==='certidao - rtd') return 'Certidões'; if (n==='rc') return 'RC'; if (n==='rtd'||n==='rpj') return 'RTD/PJ'; return 'Apoio'; }
  function eqCanon(raw){ return semAc(eqFn(raw)).replace(/[ºª°]/g,'').replace(/\s*-\s*/g,' ').replace(/\s+/g,' ').trim(); }
  function eqAuto(R){ // R: raw -> {n, sv:{setor:n}}
    var grp={}, out={map:{}, oc:{}, setor:{}};
    Object.keys(R).forEach(function(raw){ if (/\(Tri7\)$/.test(raw)){ out.map[raw]=raw; return; } var c=eqCanon(raw); (grp[c]=grp[c]||[]).push(raw); });
    Object.keys(grp).forEach(function(c){ var alvo=c; if (/^onr /.test(c) && grp[c.slice(4)]) alvo=c.slice(4); grp[c].alvo=alvo; });
    var nome={}; Object.keys(grp).forEach(function(c){ var L=grp[c].slice().sort(function(a,b){ return R[b].n-R[a].n; }); nome[c]=eqFn(L[0]); });
    Object.keys(grp).forEach(function(c){ grp[c].forEach(function(raw){ out.map[raw]=nome[grp[c].alvo]||nome[c]; if (/^aguardando/.test(c)) out.oc[raw]=true; }); });
    var fs={}; Object.keys(R).forEach(function(raw){ var f=out.map[raw], q=fs[f]=fs[f]||{}; Object.keys(R[raw].sv).forEach(function(sv){ q[sv]=(q[sv]||0)+R[raw].sv[sv]; }); });
    Object.keys(fs).forEach(function(f){ out.setor[f]=Object.keys(fs[f]).sort(function(a,b){ return fs[f][b]-fs[f][a]; })[0]; });
    return out; }
  function eqCfg(){ return state.fnCfg||{map:{},setor:{}}; }
  function eqFnDe(raw, A){ var m=eqCfg().map[raw]; return (m&&m.fn)||A.map[raw]||eqFn(raw); }
  function eqOcDe(raw, A){ var m=eqCfg().map[raw]; return m&&m.oc!=null?!!m.oc:!!A.oc[raw]; }
  function eqSetorDe(fn, A){ return eqCfg().setor[fn]||A.setor[fn]||'Apoio'; }
  // todas as execuções de todos os meses e serventias carregados: {k, nome, raw, fn, setor, nat, d, m, pz, c, src, meta}
  function eqExecs(){
    var chave=[state.riOrig||'todas',state.grVer,state.fnVer||0,Object.keys(state.docs).length,Object.keys(state.logs).length,Object.keys(state.serv).length,state.andVer||0,Object.keys(state.cert).length,Object.keys(state.usr||{}).length].join('|');
    if (state._eqX&&state._eqX.k===chave) return state._eqX.v;
    var X=[], R={};
    function dia(n){ return new Date(n*864e5).toISOString().slice(0,10); }
    function add(nome,raw,nat,d,pz,c,src,sv){ if (!nome||!raw||!d) return; d=String(d).slice(0,10); var r=R[raw]=R[raw]||{n:0,sv:{}}; r.n++; r.sv[sv]=(r.sv[sv]||0)+1;
      X.push({k:semAc(nome), nome:nome, raw:raw, nat:nat||'(sem natureza)', d:d, m:d.slice(0,7), pz:(pz==null||isNaN(pz))?null:pz, c:String(c), src:src, sv:sv, meta:src==='VHL'?eqMetaEt(raw):null}); }
    Object.keys(state.docs).forEach(function(m){ if (!state.logs[m]) return; var map=state.logCache[m]||(state.logCache[m]=Motor.decodificarLog(state.logs[m]));
      state.docs[m].atos.filter(origOk).forEach(function(a){ var L=map[a.c]; if (!L) return; L.ev.forEach(function(e){ add(e.rp,e.et,a.nat,dia(e.d),e.pz,a.c,'VHL','Registro (RI)'); }); }); });
    var nat=eqNatRI();
    Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ if (e.t!=='P'||!EQ_TRI[e.s]||!e.u||/^tri7$/i.test(e.u)) return; add(nomeLogin(e.u),EQ_TRI[e.s]+' (Tri7)',nat[String(e.n)]||'(ainda não finalizado)',Motor.isoMin(e.m).slice(0,10),null,e.n,'Tri7',(e.s==='PN'||e.s==='PA')?'Recepção':'Registro (RI)'); }); });
    Object.keys(state.cert).forEach(function(m){ state.cert[m].recs.forEach(function(r){ if (!r.u||/^tri7$/i.test(r.u)) return; add(r.u,'Certidão (Tri7)',r.nat||'Certidão',(typeof r.i==='number'?Motor.isoMin(r.i):String(r.i||(m+'-01'))).slice(0,10),null,r.p,'Tri7','Certidões'); }); });
    Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ var sv=eqSetorDoc(d.t); d.ets.forEach(function(e){ add(e.rp,e.et,d.nat,e.d?dia(e.d):m+'-01',e.pz,d.c,'VHL',sv); }); }); });
    var A=eqAuto(R), Y=[];
    // o setor é o da serventia do documento (prenotação do Tri7 = Recepção); se a função tiver setor escolhido na Configuração, vale o escolhido
    var CS=eqCfg().setor||{}; X.forEach(function(x){ if (eqOcDe(x.raw,A)) return; x.fn=eqFnDe(x.raw,A); x.setor=CS[x.fn]||x.sv; Y.push(x); });
    state._eqA=A; state._eqR=R;
    state._eqX={k:chave, v:Y}; return Y;
  }
  function eqPeriodo(){ var st=state.eqSetor||''; return eqExecs().filter(function(x){ return eqNoPeriodo(x.m) && (!st||x.setor===st); }); }
  function eqMin(){ return state.eqMin||10; }
  // contagens: pessoa × função e função × natureza × pessoa
  function eqContar(X){ var PF={}, F={}, FN={}, nomes={}, U={};
    X.forEach(function(x){ nomes[x.k]=nomes[x.k]||x.nome; var p=PF[x.k]=PF[x.k]||{}; p[x.fn]=(p[x.fn]||0)+1; F[x.fn]=(F[x.fn]||0)+1; var u=U[x.k]=U[x.k]||{}; if (!u[x.fn]||x.d>u[x.fn]) u[x.fn]=x.d;
      var f=FN[x.fn]=FN[x.fn]||{}, n=f[x.nat]=f[x.nat]||{}; n[x.k]=(n[x.k]||0)+1; });
    return {PF:PF, F:F, FN:FN, nomes:nomes, U:U}; }
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
    var R=Object.keys(P).map(function(k){ var p=P[k], out=[]; Object.keys(P).forEach(function(j){ if (j!==k && !eqEmApr(j)) out=out.concat(P[j].pz); }); // 0.18.0: quem está em aprendizagem não entra na régua dos colegas
      var t=zWelch(p.pz,out), l=leitura(t,p.pz.length,'mais tempo na etapa','menos tempo na etapa'), nd=Object.keys(p.docs), ni=nd.filter(function(c){ return (ix[c]||{})[k]; }).length;
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
    var Xs=eqExecs().filter(function(x){ return eqNoPeriodo(x.m); }), cntS={}; Xs.forEach(function(x){ cntS[x.setor]=(cntS[x.setor]||0)+1; });
    if (state.eqSetor&&!cntS[state.eqSetor]) state.eqSetor='';
    var barraSetor='<div class="eq-set" role="tablist" aria-label="Setor"><button type="button" class="chip'+(!state.eqSetor?' on':'')+'" data-eqsetor="">Todos os setores</button>'+EQ_SETORES.filter(function(s){ return cntS[s]; }).map(function(s){ return '<button type="button" class="chip'+(state.eqSetor===s?' on':'')+'" data-eqsetor="'+esc(s)+'">'+esc(s)+' <span class="mut">'+cntS[s].toLocaleString('pt-BR')+'</span></button>'; }).join('')+'<span class="hint">Setores e funções: Configuração › Funções da equipe. O seletor Serventia do topo não muda esta página.</span></div>';
    var X=eqPeriodo(); if (!X.length){ el.innerHTML=barraSetor+'<div class="empty"><b>Sem execuções no período</b>Importe a Produção por Etapa (PAINEL-02), a Prazo e Tempo Médio (PAINEL-01) e o Relatório de andamentos do Tri7.</div>'; return; }
    var Q=eqContar(X), mn=eqMin(), ocl=Object.keys(state.eqOcl||{});
    var vis=Object.keys(Q.PF).filter(function(k){ if (eqOculto(k)) return false; var t=0; Object.keys(Q.PF[k]).forEach(function(f){ t+=Q.PF[k][f]; }); return t>=mn; })
      .sort(function(a,b){ return String(Q.nomes[a]).localeCompare(String(Q.nomes[b]),'pt-BR'); });
    // colunas agrupadas por setor (na ordem do fluxo) e, dentro do setor, pelo volume
    var fSet={}, fsc={}; X.forEach(function(x){ var q=fsc[x.fn]=fsc[x.fn]||{}; q[x.setor]=(q[x.setor]||0)+1; }); Object.keys(fsc).forEach(function(f){ fSet[f]=Object.keys(fsc[f]).sort(function(a,b){ return fsc[f][b]-fsc[f][a]; })[0]; }); var oS=function(f){ var i=EQ_SETORES.indexOf(fSet[f]); return i<0?99:i; };
    var fns=Object.keys(Q.F).sort(function(a,b){ return oS(a)-oS(b) || Q.F[b]-Q.F[a]; }), porS={};
    var fnsV=state.eqTodasFn?fns:fns.filter(function(f){ var s=fSet[f]; porS[s]=(porS[s]||0)+1; return porS[s]<=(state.eqSetor?14:4); });
    var h=barraSetor+'<div class="sec-h"><span class="note">Quem faz o quê e como cada pessoa está em relação aos colegas que fazem a mesma tarefa, no mesmo tipo de ato. Não é ranking. Fontes: VHL (Produção por Etapa) e Tri7 (andamentos e certidões). Mês = mês da execução.</span></div>'+
      '<div class="search eq-f"><label>Mínimo para contar <select id="eqMin" aria-label="Mínimo de execuções">'+[5,10,20,50].map(function(v){ return '<option'+(v===mn?' selected':'')+'>'+v+'</option>'; }).join('')+'</select> execuções</label><button class="btn sm" type="button" data-eqcob="1" aria-expanded="'+(state.eqCob?'true':'false')+'">Quem sabe fazer cada função</button><button class="btn sm" type="button" data-eqcarga="1" aria-expanded="'+(state.eqCarga?'true':'false')+'">Carga das funções</button><span class="spacer"></span>'+
      (ocl.length?'<button class="btn sm" type="button" data-eqocl="1" aria-expanded="'+(state.eqVerOcl?'true':'false')+'">'+ocl.length+' pessoa'+(ocl.length>1?'s':'')+' oculta'+(ocl.length>1?'s':'')+' ↺</button>':'')+'</div>';
    if (state.eqVerOcl && ocl.length) h+='<div class="eq-ocl">'+ocl.sort().map(function(k){ return '<span class="chip">'+esc(state.eqOcl[k])+' <button class="lnk" type="button" data-eqmostrar="'+esc(k)+'" title="Voltar a mostrar" aria-label="Voltar a mostrar '+esc(state.eqOcl[k])+'">↺</button></span>'; }).join('')+'<span class="hint">As pessoas ocultas saem desta página e da comparação dos relatórios. Os dados delas continuam guardados.</span></div>';
    // 1. quem faz o quê
    var mxF={}; fnsV.forEach(function(f){ mxF[f]=0; vis.forEach(function(k){ mxF[f]=Math.max(mxF[f],(Q.PF[k]||{})[f]||0); }); });
    h+='<div class="panel eq-p"><div class="sub-h">Quem faz o quê · execuções no período</div><p class="hint" style="margin:0 0 8px">Cor mais forte = mais execuções naquela função (cada coluna na sua escala). Clique numa função para ver as naturezas.'+(fns.length>fnsV.length||state.eqTodasFn?' <button class="lnk" type="button" data-eqtodasfn="1">'+(state.eqTodasFn?'Mostrar só as maiores de cada setor':'Mostrar todas as '+fns.length+' funções')+'</button>':'')+'</p>'+
      '<div class="tbl-wrap"><table class="eq-g"><thead><tr><th></th>'+(function(){ var out='', cur=null, n=0; fnsV.forEach(function(f){ if (fSet[f]!==cur){ if (cur!=null) out+='<th colspan="'+n+'" class="eq-grp">'+esc(cur)+'</th>'; cur=fSet[f]; n=0; } n++; }); if (cur!=null) out+='<th colspan="'+n+'" class="eq-grp">'+esc(cur)+'</th>'; return out; })()+'<th></th></tr><tr><th class="tleft">Pessoa</th>'+fnsV.map(function(f){ return '<th><button class="lnk eq-th'+(state.eqFn===f?' on':'')+'" type="button" data-eqfn="'+esc(f)+'">'+esc(f)+'</button></th>'; }).join('')+'<th>Funções</th></tr></thead><tbody>'+
      vis.map(function(k){ return '<tr><td class="tleft"><span class="eq-nm">'+(podeEscrever?'<button class="eq-x" type="button" data-eqocultar="'+esc(k)+'" title="Ocultar desta página" aria-label="Ocultar '+esc(Q.nomes[k])+'">×</button>':'')+'<button class="lnk eq-pn" type="button" data-eqaudk="'+esc(k)+'" title="Ver todos os títulos desta pessoa no período">'+esc(Q.nomes[k])+'</button></span></td>'+
        fnsV.map(function(f){ var v=(Q.PF[k]||{})[f]||0, t=mxF[f]?Math.sqrt(v/mxF[f]):0; return '<td>'+(v?'<button type="button" class="eq-c'+(v<mn?' fraco':'')+(state.eqAud&&state.eqAud.k===k&&state.eqAud.fn===f?' on':'')+'" style="--a:'+(0.08+0.47*t).toFixed(2)+'" data-eqaudk="'+esc(k)+'" data-eqaudfn="'+esc(f)+'" data-tip="'+esc('<b>'+esc(Q.nomes[k])+'</b><br>'+esc(f)+': '+v.toLocaleString('pt-BR')+' execuções'+(v<mn?' (abaixo do mínimo para contar)':'')+'<br>Última: '+fmtData((Q.U[k]||{})[f]))+'" data-goh="ver os títulos">'+v.toLocaleString('pt-BR')+'</button>':'<span class="mut">·</span>')+'</td>'; }).join('')+
        '<td class="mut" style="white-space:nowrap">'+eqNFuncoes(Q.PF,k)+(eqNFuncoes(Q.PF,k)===1?' função':' funções')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    var dep=eqDependencias(Q).slice(0,6);
    if (dep.length) h+='<div class="banner warn" style="margin:10px 0 0"><b>Dependem de uma pessoa só:</b> '+dep.map(function(d){ return esc(d.fn+(d.nat?' · '+d.nat:''))+' ('+esc(eqNomeOuOculto(Q,d.k))+')'; }).join(' · ')+'. Em férias ou ausência dessa pessoa, o serviço para.</div>';
    h+='</div>';
    if (state.eqAud) h+=eqAudHTML();
    if (state.eqCob) h+=eqCobHTML();
    if (state.eqCarga) h+=eqCargaHTML();
    // 2. dentro de uma função
    var comTempo={}; X.forEach(function(x){ if (x.pz!=null) comTempo[x.fn]=1; }); var porVol=fns.slice().sort(function(a,b){ return (comTempo[b]?1:0)-(comTempo[a]?1:0) || Q.F[b]-Q.F[a]; });
    var fsel=state.eqFn&&Q.F[state.eqFn]?state.eqFn:(porVol.filter(function(f){ var n=0; Object.keys(Q.PF).forEach(function(k){ if (!eqOculto(k)&&(Q.PF[k][f]||0)>=mn) n++; }); return n>=2; })[0]||porVol[0]); state.eqFn=fsel;
    var FN=Q.FN[fsel]||{}, nats=Object.keys(FN).map(function(n){ var t=0; Object.keys(FN[n]).forEach(function(k){ t+=FN[n][k]; }); return {n:n,t:t}; }).sort(function(a,b){ return b.t-a.t; });
    var top=nats.slice(0,6).map(function(x){ return x.n; }), totF=Q.F[fsel]||1, cor={}; top.forEach(function(n,i){ cor[n]=EQ_CORES[i]; });
    var pessF=vis.filter(function(k){ return (Q.PF[k][fsel]||0)>0; }).sort(function(a,b){ return Q.PF[b][fsel]-Q.PF[a][fsel]; });
    h+='<div class="panel eq-p"><div class="sub-h">Dentro da função <select id="eqFnSel" aria-label="Função">'+fns.map(function(f){ return '<option'+(f===fsel?' selected':'')+'>'+esc(f)+'</option>'; }).join('')+'</select></div>'+
      '<div class="two"><div><div class="sub-h">O que cada um faz nesta função</div>'+pessF.map(function(k){ var tot=Q.PF[k][fsel], partes=[], outras=0, nn=0, nao=[];
        nats.forEach(function(x){ var v=(FN[x.n]||{})[k]||0; if (v) nn++; if (cor[x.n]) { if (v) partes.push({nome:x.n,v:v,cor:cor[x.n]}); else if (x.t>=totF*0.05 && x.n.charAt(0)!=='(') nao.push(x.n); } else outras+=v; });
        if (outras) partes.push({nome:'Outras',v:outras,cor:EQ_OUTRAS});
        var ab=state.eqExp&&state.eqExp[k], det='';
        if (ab){ var Lk=X.filter(function(x){ return x.k===k&&x.fn===fsel; }), nk={}; Lk.forEach(function(x){ var q=nk[x.nat]=nk[x.nat]||{n:0,u:''}; q.n++; if (x.d>q.u) q.u=x.d; });
          det='<div class="eq-todas"><table class="tleft"><thead><tr><th>Natureza</th><th>Execuções</th><th>Última</th></tr></thead><tbody>'+Object.keys(nk).sort(function(a,b){ return nk[b].n-nk[a].n; }).map(function(n){ return '<tr><td>'+esc(n)+'</td><td>'+nk[n].n+'</td><td>'+fmtData(nk[n].u)+'</td></tr>'; }).join('')+'</tbody></table><button class="lnk" type="button" data-eqaudk="'+esc(k)+'" data-eqaudfn="'+esc(fsel)+'">Ver os títulos</button></div>'; }
        return '<div class="eq-np"><button class="lnk eq-pn" type="button" data-eqexp="'+esc(k)+'" aria-expanded="'+(ab?'true':'false')+'" title="Ver todas as naturezas">'+(ab?'▾ ':'▸ ')+esc(Q.nomes[k])+'</button>'+eqBarra(partes,tot)+'<span class="mut">'+tot.toLocaleString('pt-BR')+' · '+nn+' natureza'+(nn>1?'s':'')+'</span><small class="eq-det">'+eqTop(partes,tot,3)+'</small>'+(nao.length?'<small class="eq-nao">Não faz: '+esc(nao.join(', '))+'</small>':'')+det+'</div>'; }).join('')+
      '<div class="leg">'+top.map(function(n){ return '<span><i class="dot" style="background:'+cor[n]+'"></i>'+esc(n)+'</span>'; }).join('')+(nats.length>6?'<span><i class="dot" style="background:'+EQ_OUTRAS+'"></i>Outras</span>':'')+'</div></div>';
    var corP={}; pessF.slice(0,6).forEach(function(k,i){ corP[k]=EQ_CORES[i]; });
    h+='<div><div class="sub-h">Parte de cada um por natureza</div>'+nats.slice(0,8).map(function(x){ var L=FN[x.n], partes=[], out=0, nvis=0;
        Object.keys(L).sort(function(a,b){ return L[b]-L[a]; }).forEach(function(k){ if (corP[k]) partes.push({nome:Q.nomes[k],v:L[k],cor:corP[k]}); else out+=L[k]; if (L[k]>=Math.max(3,x.t*0.1)) nvis++; });
        if (out) partes.push({nome:'Demais pessoas',v:out,cor:EQ_OUTRAS});
        return '<div class="eq-np"><b>'+esc(x.n)+'</b>'+eqBarra(partes,x.t,'%')+'<span class="mut">'+x.t.toLocaleString('pt-BR')+(nvis===1&&x.t>=20?' · <b class="eq-1p">1 pessoa</b>':'')+'</span><small class="eq-det">'+eqTop(partes,x.t,2,true)+'</small></div>'; }).join('')+
      '<div class="leg">'+pessF.slice(0,6).map(function(k){ return '<span><i class="dot" style="background:'+corP[k]+'"></i>'+esc(Q.nomes[k])+'</span>'; }).join('')+(pessF.length>6?'<span><i class="dot" style="background:'+EQ_OUTRAS+'"></i>Demais pessoas</span>':'')+'</div></div></div></div>';
    // 2b. visão geral da função, ajustada pelo tipo de documento de cada um
    var G=eqGeral(X,fsel).filter(function(g){ return g.n>=mn; });
    if (G.length) h+='<div class="panel eq-p"><div class="sub-h">Visão geral · '+esc(fsel)+' · ajustada pelo tipo de documento</div><p class="hint" style="margin:0 0 8px">Cada execução é comparada com a média dos colegas <b>na mesma natureza</b>; assim quem pega tipos de documento mais demorados não sai prejudicado. Tempo = dias úteis que o documento ficou na etapa até a pessoa executar: inclui fila e distribuição, não é a velocidade da pessoa.</p>'+
      '<div class="tbl-wrap"><table class="eq-cmp"><thead><tr><th class="tleft">Pessoa</th><th>Execuções</th><th>Naturezas</th><th>Tempo real (d.u.)</th><th>Esperado para os tipos dela</th><th>Diferença</th><th title="Documentos que tiveram exigência ou voltaram (reingresso)">Com exigência ou retorno</th><th>Docs. com inconf. da pessoa</th><th>Funções no período</th><th>Leitura</th></tr></thead><tbody>'+
      G.map(function(g){ var nf=eqNFuncoes(Q.PF,g.k), d=g.razao!=null?(g.razao-1)*100:null; return '<tr><td class="tleft">'+esc(g.nome)+(eqEmApr(g.k)?' <span class="eq-tag apr">em aprendizagem</span>':'')+'</td><td>'+g.n+'</td><td>'+g.nNat+'</td><td><b>'+numBR(g.real,1)+'</b></td><td>'+(g.esp==null?'—':numBR(g.esp,1))+'</td><td>'+(d==null?'—':(d>0?'+':'')+numBR(d,0)+'%')+'</td><td>'+(g.pEx==null?'—':pct(g.pEx))+'</td><td>'+(g.pIn==null?'—':pct(g.pIn))+'</td><td>'+nf+'</td><td>'+eqLeitPill(g.l)+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="hint">Leia junto com o contexto: exigências e retornos aumentam o tempo do documento; quem divide o dia entre várias funções atende cada fila em parte do dia. A leitura só sai de "dentro do esperado" com 95% de confiança e diferença de pelo menos '+numBR(DES_MIN_DIF,1)+' d.u. por execução.</p></div>';
    // 3. comparação dentro da função e natureza
    var natCmp=nats.filter(function(x){ return X.some(function(y){ return y.fn===fsel&&y.nat===x.n&&y.pz!=null; }); }), nsel=state.eqNat&&natCmp.some(function(x){ return x.n===state.eqNat; })?state.eqNat:(natCmp[0]||{}).n; state.eqNat=nsel;
    if (!nsel) h+='<div class="panel eq-p"><div class="sub-h">Comparação com os colegas</div><p class="hint">Esta função vem do Tri7, que não informa o tempo de cada etapa. A comparação de tempo existe só para as etapas do VHL.</p></div>';
    else { var C=eqComparar(X,fsel,nsel), hi=Math.max(C.p90||1,1), PFv=Q.PF;
      h+='<div class="panel eq-p"><div class="sub-h">Comparação com os colegas · '+esc(fsel)+' · <select id="eqNatSel" aria-label="Natureza">'+natCmp.map(function(x){ return '<option'+(x.n===nsel?' selected':'')+'>'+esc(x.n)+'</option>'; }).join('')+'</select></div>'+
        '<p class="hint" style="margin:0 0 8px">Só quem fez esta etapa nesta natureza no período. Tempo = dias úteis que o documento ficou na etapa até a pessoa executar. Barra cinza = metade do meio da equipe; traço = mediana; ponto = a pessoa.</p>'+
        '<div class="tbl-wrap"><table class="eq-cmp"><thead><tr><th class="tleft">Pessoa</th><th>Execuções</th><th>Tempo médio (d.u.)</th><th style="min-width:150px;width:22%">Posição na equipe <span class="mut">· 0 a '+numBR(hi,1)+' d.u.</span></th><th>Docs. com inconf.</th><th>Leitura</th></tr></thead><tbody>'+
        C.R.map(function(r){ var nf=eqNFuncoes(PFv,r.k); return '<tr><td class="tleft"><span class="eq-nm">'+(podeEscrever?'<button class="eq-x" type="button" data-eqocultar="'+esc(r.k)+'" title="Ocultar desta página" aria-label="Ocultar '+esc(r.nome)+'">×</button>':'')+esc(r.nome)+(nf>=2?' <span class="eq-tag">divide o dia com '+nf+' funções</span>':'')+(eqEmApr(r.k)?' <span class="eq-tag apr">em aprendizagem</span>':'')+'</span></td><td>'+r.n+'</td><td><b>'+numBR(r.med,1)+'</b></td><td>'+(r.n>=MIN_N?eqFaixa(r.med,C.q1,C.med,C.q3,hi,200):'<span class="mut">—</span>')+'</td><td>'+r.ni+' de '+r.nd+'</td><td>'+(r.n>=MIN_N?eqLeitPill(r.l):'<span class="pill mute">poucos casos</span>')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
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
    E.pos.forEach(function(p){ if (p.l.cls==='bom') f.push(p.fn+' · '+p.nat+': documento fica menos tempo na etapa que com os colegas ('+numBR(p.med,1)+' d.u. × mediana '+numBR(p.qm,1)+').'); if (p.l.cls==='acima') a.push(p.fn+' · '+p.nat+': documento fica mais tempo na etapa que com os colegas ('+numBR(p.med,1)+' d.u. × mediana '+numBR(p.qm,1)+'). Ver o contexto antes de concluir (fila, exigências, distribuição).'); });
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
  // ——— 0.16.0: visão geral da função ajustada pelo tipo de documento, auditoria, naturezas completas e cobertura
  function eqExIdx(){ var k=Object.keys(state.docs).length+'|'+(state.andVer||0); if (state._eqE&&state._eqE.k===k) return state._eqE.v; var o={};
    Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ o[String(a.c)]={ex:a.nex>0, re:!!a.reing}; }); }); state._eqE={k:k,v:o}; return o; }
  // cada execução comparada com a média dos colegas (sem a própria pessoa) na mesma função e natureza; a pessoa é lida pela média desses desvios
  function eqGeral(X, fn){
    var L=X.filter(function(x){ return x.fn===fn && x.pz!=null && !eqOculto(x.k); }), C={};
    L.forEach(function(x){ var c=C[x.nat]=C[x.nat]||{n:0,s:0,p:{}}; var q=c.p[x.k]=c.p[x.k]||{n:0,s:0}; if (eqEmApr(x.k)) return; c.n++; c.s+=x.pz; q.n++; q.s+=x.pz; });
    var P={}, ex=eqExIdx(), ix=eqIncIdx();
    L.forEach(function(x){ var c=C[x.nat], q=c.p[x.k], no=c.n-q.n; var p=P[x.k]=P[x.k]||{k:x.k,nome:x.nome,n:0,pz:0,esp:0,ne:0,dv:[],docs:{},nats:{}};
      p.n++; p.pz+=x.pz; p.nats[x.nat]=1; p.docs[x.c]=1; if (no>=5){ var e=(c.s-q.s)/no; p.esp+=e; p.ne++; p.dv.push(x.pz-e); } });
    return Object.keys(P).map(function(k){ var p=P[k], docs=Object.keys(p.docs), nEx=docs.filter(function(c){ return ex[c]&&(ex[c].ex||ex[c].re); }).length, nIn=docs.filter(function(c){ return (ix[c]||{})[k]; }).length, t=zMedia(p.dv);
      var l=p.dv.length<MIN_N?{txt:'poucos casos',cls:'mut'}:leitura(t?{dif:t.m,z:t.z}:null,p.dv.length,'mais tempo na etapa','menos tempo na etapa');
      return {k:k, nome:p.nome, n:p.n, real:p.pz/p.n, esp:p.ne?p.esp/p.ne:null, razao:p.ne?(p.pz/p.n)/(p.esp/p.ne):null, nNat:Object.keys(p.nats).length, docs:docs.length, pEx:docs.length?nEx/docs.length*100:null, pIn:docs.length?nIn/docs.length*100:null, l:l}; })
      .sort(function(a,b){ return b.n-a.n; }); }
  function eqUltima(L){ var u=''; L.forEach(function(x){ if (x.d>u) u=x.d; }); return u; }
  function eqHa(d){ if (!d) return ''; var dias=Math.round((Date.now()-Date.parse(d+'T12:00:00'))/864e5); return dias>183?' <span class="pill warn" title="Última vez há mais de 6 meses">há '+Math.round(dias/30)+' meses</span>':''; }
  // auditoria: os títulos de uma pessoa (numa função ou em todas), no período
  function eqAudLista(){ var a=state.eqAud; if (!a) return []; var ix=eqIncIdx();
    return eqPeriodo().filter(function(x){ return x.k===a.k && (!a.fn||x.fn===a.fn) && (!a.nat||x.nat===a.nat); }).map(function(x){ return Object.assign({},x,{inc:!!(ix[x.c]||{})[x.k]}); })
      .sort(function(p,q){ return p.d<q.d?1:p.d>q.d?-1:0; }); }
  function eqAudHTML(){ var a=state.eqAud; if (!a) return ''; var L0=eqPeriodo().filter(function(x){ return x.k===a.k && (!a.fn||x.fn===a.fn); }), L=eqAudLista(), lim=state.eqAudLim||100;
    var nats={}; L0.forEach(function(x){ nats[x.nat]=(nats[x.nat]||0)+1; }); var por={}; if (!a.fn) L.forEach(function(x){ por[x.fn]=(por[x.fn]||0)+1; });
    return '<div class="panel eq-p eq-aud" id="eqAud"><div class="sec-h"><h2>Auditoria · '+esc(a.nome)+(a.fn?' · '+esc(a.fn):' · todas as funções')+'</h2><span class="spacer"></span><button class="btn sm" type="button" data-eqaudxls="1">Baixar planilha</button> <button class="btn sm" type="button" data-eqaudfechar="1">Fechar</button></div>'+
      '<div class="search"><select id="eqAudNat" aria-label="Natureza"><option value="">Todas as naturezas ('+L0.length+')</option>'+Object.keys(nats).sort(function(p,q){ return nats[q]-nats[p]; }).map(function(n){ return '<option'+(a.nat===n?' selected':'')+' value="'+esc(n)+'">'+esc(n)+' ('+nats[n]+')</option>'; }).join('')+'</select>'+
      (a.fn?'':'<span class="hint">'+Object.keys(por).sort(function(p,q){ return por[q]-por[p]; }).slice(0,6).map(function(f){ return esc(f)+' <b>'+por[f]+'</b>'; }).join(' · ')+'</span>')+'</div>'+
      '<div class="tbl-wrap" style="max-height:460px"><table class="tleft"><thead><tr><th>Protocolo</th>'+(a.fn?'':'<th>Função</th>')+'<th>Natureza</th><th>Data da execução</th><th>Tempo na etapa</th><th>Inconformidade da pessoa</th><th>Fonte</th></tr></thead><tbody>'+
      L.slice(0,lim).map(function(x){ return '<tr><td>'+protLink(x.c)+'</td>'+(a.fn?'':'<td>'+esc(x.fn)+'</td>')+'<td>'+esc(x.nat)+'</td><td>'+fmtData(x.d)+'</td><td>'+(x.pz==null?'—':numBR(x.pz,0)+' d.u.')+'</td><td>'+(x.inc?'<span class="pill warn">sim</span>':'—')+'</td><td class="mut">'+x.src+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (L.length>lim?'<div class="inc-mais"><span class="hint">Mostrando '+lim+' de '+L.length+'.</span> <button class="btn sm" type="button" data-eqaudmais="1">Mostrar mais 100</button></div>':'<p class="hint">'+L.length+' execução(ões). Clique no protocolo para abrir a ficha com a linha do tempo completa.</p>')+'</div>'; }
  function eqAudXls(){ var L=eqAudLista(), a=state.eqAud; if (!L.length) return toast('Nada para baixar');
    precisaXLSX().then(function(X){ var rows=[['Pessoa','Função','Natureza','Protocolo','Data da execução','Tempo na etapa (d.u.)','Inconformidade da pessoa','Fonte']].concat(L.map(function(x){ return [x.nome,x.fn,x.nat,x.c,fmtData(x.d),x.pz==null?'':x.pz,x.inc?'sim':'',x.src]; }));
      var ws=X.utils.aoa_to_sheet(rows), wb=X.utils.book_new(); ws['!cols']=[{wch:32},{wch:28},{wch:36},{wch:12},{wch:14},{wch:12},{wch:12},{wch:8}]; X.utils.book_append_sheet(wb,ws,'Auditoria');
      var out=X.write(wb,{type:'array',bookType:'xlsx'}), nome='Auditoria - '+a.nome+(a.fn?' - '+a.fn:'')+' - '+nomePeriodo().replace(/\//g,'-')+'.xlsx';
      if (!downloads) return toast('Download indisponível nesta visualização');
      downloads.save({filename:nome, data:new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}).then(function(){ toast('Planilha baixada'); }); }).catch(function(e){ toast(e.message); }); }
  // quem sabe fazer: últimos 12 meses, independente do período escolhido
  function eqCobHTML(){ var X=eqExecs(), ms=eqUlt6(), fim=ms[ms.length-1]||mesHoje(), ini=fim; for (var i=0;i<11;i++) ini=mesAnt(ini); var mn=eqMin();
    var L=X.filter(function(x){ return x.m>=ini && x.m<=fim && (!state.eqSetor||x.setor===state.eqSetor); }), F={};
    L.forEach(function(x){ var f=F[x.fn]=F[x.fn]||{n:0,p:{}}; f.n++; var q=f.p[x.k]=f.p[x.k]||{nome:x.nome,n:0,u:''}; q.n++; if (x.d>q.u) q.u=x.d; });
    var fns=Object.keys(F).filter(function(f){ return F[f].n>=20; }).sort(function(a,b){ return Object.keys(F[a].p).length-Object.keys(F[b].p).length || F[b].n-F[a].n; });
    return '<div class="panel eq-p" id="eqCob"><div class="sec-h"><h2>Quem sabe fazer cada função</h2><span class="spacer"></span><button class="btn sm" type="button" data-eqcob="1">Fechar</button></div><p class="hint" style="margin:0 0 8px">Últimos 12 meses ('+esc(nomeMes(ini))+' a '+esc(nomeMes(fim))+'), não só o período escolhido: quem fez em março e não fez em setembro continua sabendo fazer. Conta quem tem '+mn+'+ execuções; a última execução mostra se faz tempo.</p>'+
      '<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Função</th><th>Pessoas</th><th>Quem (execuções · última vez)</th></tr></thead><tbody>'+
      fns.map(function(f){ var P=F[f].p, ks=Object.keys(P).filter(function(k){ return P[k].n>=mn; }).sort(function(a,b){ return P[b].n-P[a].n; }), vis=ks.filter(function(k){ return !eqOculto(k); }), oc=ks.length-vis.length;
        return '<tr><td><b>'+esc(f)+'</b></td><td>'+(ks.length<=1?'<span class="pill warn">'+ks.length+'</span>':ks.length)+'</td><td>'+vis.map(function(k){ return esc(P[k].nome)+' <span class="mut">'+P[k].n+' · '+fmtData(P[k].u)+'</span>'+eqHa(P[k].u); }).join('<br>')+(oc?'<br><span class="mut">+ '+oc+' pessoa(s) oculta(s)</span>':'')+'</td></tr>'; }).join('')+'</tbody></table></div></div>'; }
  // ——— 0.16.0: carga das funções (demanda × capacidade observada) e simulação "e se"
  function eqCarga(semK){
    var X=eqExecs(), ms=eqUlt6().slice(-3); if (!ms.length) return null;
    var fer=Motor.feriadoSet(state.extras||[]), util=function(d){ var w=((d%7)+7+4)%7; return w!==0&&w!==6&&!fer[d]; };
    var dias=[]; ms.forEach(function(m){ sdUteis(m).forEach(function(d){ dias.push(d); }); }); if (!dias.length) return null;
    var d0=dias[0], d1=dias[dias.length-1], F={};
    function antes(d,n){ var k=0; while (k<n){ d--; if (util(d)) k++; } return d; }
    X.forEach(function(x){ if (x.src!=='VHL'||eqOculto(x.k)&&x.k!==semK||(state.eqSetor&&x.setor!==state.eqSetor)) return; var dn=sdDia(x.d); if (dn<d0||dn>d1) return;
      var f=F[x.fn]=F[x.fn]||{ex:{},exSem:{},ent:0,pz:[],pzM:{},p:{},metas:{}}; f.ex[dn]=(f.ex[dn]||0)+1; if (x.k!==semK) f.exSem[dn]=(f.exSem[dn]||0)+1; f.p[x.k]=(f.p[x.k]||0)+1;
      if (x.pz!=null){ f.pz.push(x.pz); (f.pzM[x.m]=f.pzM[x.m]||[]).push(x.pz); if (antes(dn,Math.round(x.pz))>=d0) f.ent++; }
      if (x.meta!=null) f.metas[x.meta]=(f.metas[x.meta]||0)+1; });
    var mn=eqMin();
    return {ms:ms, dias:dias.length, F:Object.keys(F).map(function(fn){ var f=F[fn], v=dias.map(function(d){ return f.ex[d]||0; }), vs=dias.map(function(d){ return f.exSem[d]||0; }), tot=v.reduce(function(s,x){ return s+x; },0);
      var dem=tot/dias.length, cap=quant(v,.9), capS=quant(vs,.9), pes=Object.keys(f.p).filter(function(k){ return f.p[k]>=mn; }).length;
      var meta=Object.keys(f.metas).sort(function(a,b){ return f.metas[b]-f.metas[a]; })[0];
      var tm=ms.map(function(m){ return f.pzM[m]?media(f.pzM[m]):null; }), tend=tm[0]!=null&&tm[tm.length-1]!=null?tm[tm.length-1]-tm[0]:null;
      return {fn:fn, tot:tot, dem:dem, med:media(v), cap:cap, capS:capS, folga:cap?(cap-dem)/cap*100:null, folgaS:capS?(capS-dem)/capS*100:null, pes:pes, semFaz:semK?(f.p[semK]||0):0, tempo:media(f.pz), meta:meta!=null?+meta:null, tend:tend}; })
      .filter(function(f){ return f.tot>=20; }).sort(function(a,b){ return b.tot-a.tot; }) }; }
  function eqCargaHTML(){
    var semK=state.eqSem||'', C=eqCarga(semK||null); if (!C) return '';
    var Q=eqContar(eqPeriodo()), pess=Object.keys(Q.nomes).filter(function(k){ return !eqOculto(k); }).sort(function(a,b){ return String(Q.nomes[a]).localeCompare(String(Q.nomes[b]),'pt-BR'); });
    var fmtF=function(v){ return v==null?'—':'<span class="'+(v<10?'eq-ft':'')+'">'+numBR(v,0)+'%</span>'; };
    var h='<div class="panel eq-p" id="eqCarga"><div class="sec-h"><h2>Carga das funções</h2><span class="spacer"></span><button class="btn sm" type="button" data-eqcarga="1">Fechar</button></div>'+
      '<p class="hint" style="margin:0 0 8px">Últimos 3 meses ('+esc(nomeMes(C.ms[0]))+' a '+esc(nomeMes(C.ms[C.ms.length-1]))+', '+C.dias+' dias úteis), só etapas do VHL. <b>Feito por dia</b> = execuções por dia útil. <b>Pico</b> = o dia mais cheio que a equipe costuma dar conta (9 em cada 10 dias ficam abaixo). <b>Folga</b> = quanto o pico passa da média: perto de zero, a equipe já trabalha no máximo todo dia. É estimativa pela capacidade observada: o painel não vê a fila, só o que chegou e o que foi feito.</p>'+
      '<div class="search"><label>E se <select id="eqSem" aria-label="Simular sem uma pessoa"><option value="">— ninguém sai —</option>'+pess.map(function(k){ return '<option value="'+esc(k)+'"'+(k===semK?' selected':'')+'>'+esc(Q.nomes[k])+'</option>'; }).join('')+'</select> não estiver (férias, afastamento ou saída)?</label></div>'+
      '<div class="tbl-wrap"><table class="eq-cmp"><thead><tr><th class="tleft">Função</th><th>Feito por dia (média)</th><th>Pico que a equipe dá conta</th><th>Pessoas que fazem</th><th>Folga</th>'+(semK?'<th>Folga sem '+esc(String(Q.nomes[semK]||'').split(' ')[0])+'</th>':'')+'<th>Tempo na etapa × prazo do nome</th><th>Tendência do tempo</th></tr></thead><tbody>'+
      C.F.filter(function(f){ return !semK||f.semFaz; }).concat(semK?[]:[]).map(function(f){ var tt=f.tend==null?'—':Math.abs(f.tend)<0.1?'estável':(f.tend>0?'↗ subindo ':'↘ caindo ')+numBR(Math.abs(f.tend),1)+' d.u.';
        return '<tr><td class="tleft"><b>'+esc(f.fn)+'</b></td><td>'+numBR(f.med,1)+'</td><td>'+numBR(f.cap,0)+'</td><td>'+f.pes+'</td><td>'+fmtF(f.folga)+'</td>'+(semK?'<td>'+(f.capS?fmtF(f.folgaS):'<span class="pill warn" title="Os outros fazem tão pouco que, sem esta pessoa, a fila não anda">sem cobertura</span>')+'</td>':'')+'<td>'+(f.tempo==null?'—':numBR(f.tempo,1)+' d.u.')+(f.meta!=null?' <span class="mut">× '+numBR(f.meta,f.meta%1?2:0)+' d.u.</span>'+(f.tempo>f.meta?' <span class="pill warn">acima</span>':''):'')+'</td><td>'+tt+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (semK?'<p class="hint">Mostrando só as funções que '+esc(Q.nomes[semK])+' faz. "Folga sem" refaz o pico de cada dia tirando as execuções dela; se ficar perto de zero ou negativa, o resto da equipe precisaria absorver mais do que costuma dar conta.</p>':'<p class="hint">Folga perto de zero com o tempo na etapa subindo é o sinal de função no limite. Escolha uma pessoa em "E se" para ver o efeito da ausência dela.</p>')+'</div>';
    return h; }

  // ——— 0.17.0: Configuração › Funções da equipe (mesclar, renomear, ocultar e setor de cada função)
  function fnBase(){ return state.fnDraft||eqCfg(); }
  function fnCfgHTML(){
    eqExecs(); var R=state._eqR||{}, A=state._eqA||{map:{},oc:{},setor:{}}, C=fnBase(), b=semAc(state.fnBusca||'');
    var fnDe=function(raw){ var m=C.map[raw]; return (m&&m.fn)||A.map[raw]||eqFn(raw); }, ocDe=function(raw){ var m=C.map[raw]; return m&&m.oc!=null?!!m.oc:!!A.oc[raw]; };
    var G={}; Object.keys(R).forEach(function(raw){ var f=fnDe(raw), g=G[f]=G[f]||{fn:f,n:0,raws:[]}; g.raws.push(raw); if (!ocDe(raw)) g.n+=R[raw].n; });
    var setorDe=function(f){ return C.setor[f]||A.setor[f]||'Apoio'; };
    var fns=Object.keys(G).sort(function(a,b){ return EQ_SETORES.indexOf(setorDe(a))-EQ_SETORES.indexOf(setorDe(b)) || G[b].n-G[a].n; });
    if (b) fns=fns.filter(function(f){ return semAc(f).indexOf(b)>=0 || G[f].raws.some(function(r){ return semAc(r).indexOf(b)>=0; }); });
    var mud=state.fnDraft?JSON.stringify(state.fnDraft)!==JSON.stringify(eqCfg()):false, todas=Object.keys(G).sort();
    var h='<div class="sub-h" style="margin-top:16px">Funções da equipe</div><details class="cfg-det"'+(state.fnAberto||mud?' open':'')+' id="fnDet"><summary>'+Object.keys(G).length+' funções a partir de '+Object.keys(R).length+' etapas do VHL e andamentos do Tri7'+(mud?' · <b>alterações não salvas</b>':'')+'</summary>'+
      '<p class="hint">Cada etapa do VHL (e cada tipo de andamento do Tri7) vira uma <b>função</b>. A sugestão automática tira o prazo do nome, junta grafias iguais e junta "ONR - X" com "X" quando a etapa já existe sem o prefixo. Para <b>mesclar</b>, escreva o mesmo nome de função em duas etapas. <b>Ocultar</b> tira a etapa da Equipe e funções (as que começam com "Aguardando" já vêm ocultas). O <b>setor</b> de cada execução é o da serventia do documento (a prenotação do Tri7 fica em Recepção); escolher um setor para a função coloca todas as execuções dela nesse setor. Vale para todos os meses; os indicadores oficiais não mudam. Cuidado ao juntar uma etapa do VHL com um andamento do Tri7: o mesmo trabalho seria contado duas vezes.</p>'+
      '<div class="search"><input type="search" id="fnBusca" placeholder="Buscar etapa ou função" value="'+esc(state.fnBusca||'')+'" aria-label="Buscar etapa ou função"><span class="spacer"></span>'+(mud?'<input type="text" id="fnMotivo" placeholder="Motivo da mudança" style="min-width:220px" aria-label="Motivo da mudança"><button class="btn primary sm" type="button" data-fnsalvar="1">Salvar funções</button><button class="btn sm" type="button" data-fndescartar="1">Descartar</button>':'')+'</div>'+
      '<datalist id="fnLista">'+todas.map(function(f){ return '<option value="'+esc(f)+'">'; }).join('')+'</datalist>'+
      '<div class="tbl-wrap" style="max-height:620px"><table class="tleft fn-t"><thead><tr><th>Etapa (como vem do sistema)</th><th>Execuções</th><th>Função</th><th>Ocultar</th></tr></thead><tbody>'+
      fns.map(function(f){ var g=G[f];
        return '<tr class="fn-g"><td colspan="2"><b>'+esc(f)+'</b> <span class="mut">· '+g.n.toLocaleString('pt-BR')+' execuções · '+g.raws.length+' etapa'+(g.raws.length>1?'s':'')+'</span></td><td colspan="2">Setor <select data-fnsetor="'+esc(f)+'" aria-label="Setor de '+esc(f)+'">'+'<option value=""'+(C.setor[f]?'':' selected')+'>pela serventia ('+esc(A.setor[f]||'—')+')</option>'+EQ_SETORES.map(function(s){ return '<option'+(C.setor[f]===s?' selected':'')+'>'+esc(s)+'</option>'; }).join('')+'</select>'+(C.setor[f]?' <span class="pill mute">ajustado</span>':'')+'</td></tr>'+
          g.raws.sort(function(a,b){ return R[b].n-R[a].n; }).map(function(raw){ var m=C.map[raw]||{}, sv=Object.keys(R[raw].sv).join(', ');
            return '<tr><td>'+esc(raw)+' <span class="mut">· '+esc(sv)+'</span></td><td>'+R[raw].n.toLocaleString('pt-BR')+'</td><td><input type="text" list="fnLista" data-fnraw="'+esc(raw)+'" value="'+esc(m.fn||'')+'" placeholder="'+esc(A.map[raw]||eqFn(raw))+'" aria-label="Função da etapa '+esc(raw)+'">'+(m.fn?' <span class="pill mute">ajustado</span>':'')+'</td><td><input type="checkbox" data-fnoc="'+esc(raw)+'"'+(ocDe(raw)?' checked':'')+' aria-label="Ocultar '+esc(raw)+'"></td></tr>'; }).join(''); }).join('')+
      '</tbody></table></div><p class="hint">Campo de função vazio = vale a sugestão automática (o texto cinza). Apague o nome para voltar à sugestão.</p></details>';
    return h; }
  function fnEditar(){ if (!state.fnDraft) state.fnDraft=JSON.parse(JSON.stringify(eqCfg())); state.fnDraft.map=state.fnDraft.map||{}; state.fnDraft.setor=state.fnDraft.setor||{}; state.fnAberto=true; return state.fnDraft; }
  function fnMudou(t){
    if (t.dataset.fnraw!=null){ var D=fnEditar(), raw=t.dataset.fnraw, v=String(t.value||'').trim(), m=D.map[raw]=Object.assign({},D.map[raw]||{}); if (v) m.fn=v; else delete m.fn; if (!Object.keys(m).length) delete D.map[raw]; renderCfg(); return true; }
    if (t.dataset.fnoc!=null){ var D2=fnEditar(), r2=t.dataset.fnoc, A=state._eqA||{oc:{}}, m2=D2.map[r2]=Object.assign({},D2.map[r2]||{}); if (!!t.checked===!!A.oc[r2]) delete m2.oc; else m2.oc=!!t.checked; if (!Object.keys(m2).length) delete D2.map[r2]; renderCfg(); return true; }
    if (t.dataset.fnsetor!=null){ var D3=fnEditar(), f=t.dataset.fnsetor; if (!t.value) delete D3.setor[f]; else D3.setor[f]=t.value; renderCfg(); return true; }
    if (t.id==='fnBusca'){ state.fnBusca=t.value; state.fnAberto=true; renderCfg(); var fb=$('fnBusca'); if (fb){ fb.focus(); fb.setSelectionRange(fb.value.length,fb.value.length); } return true; }
    return false; }
  function fnClique(t){
    if (t.dataset.fndescartar){ state.fnDraft=null; renderCfg(); return true; }
    if (t.dataset.fnsalvar){ var mot=String(($('fnMotivo')||{}).value||'').trim(); if (!mot){ toast('Escreva o motivo da mudança'); var mm=$('fnMotivo'); if (mm) mm.focus(); return true; }
      var antes=eqCfg(), D=state.fnDraft, n=0; Object.keys(Object.assign({},antes.map,D.map)).forEach(function(r){ if (JSON.stringify(antes.map[r]||{})!==JSON.stringify(D.map[r]||{})) n++; }); Object.keys(Object.assign({},antes.setor,D.setor)).forEach(function(f){ if ((antes.setor||{})[f]!==D.setor[f]) n++; });
      state.fnCfg=D; state.fnDraft=null; state.fnVer=(state.fnVer||0)+1; state._eqX=null;
      if (dbPronto&&podeEscrever) db.doc('config/funcoes').set({map:D.map, setor:D.setor, em:new Date().toISOString(), por:nomeUsuario()}).catch(function(){ toast('Não consegui salvar as funções'); });
      apurLog('Funções da equipe','—',n+' alteração(ões)','imediato',mot); apurSalvar(); toast('Funções salvas'); return true; }
    return false; }

/* Painel SGQ · CRCO — js/tri7.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/tri7.js']='0.17.0';
  function ehCanc(st){ return st==='CD'||st==='CP'||st==='CC'; } // 0.10.5: a partir desta competência, reingresso só com retorno comprovado (Re-análise depois de Nota de Exigência)
  function exAjuste(a, ix){
    if (a.nexV===undefined){ a.nexV=a.nex||0; a.npgV=a.npg||0; a.nriV=a.nri||0; a.catV=a.cat; a.motivoV=a.motivo; }
    a.nex=a.nexV; a.npg=a.npgV; a.nri=a.nriV; a.cat=a.catV; a.motivo=a.motivoV; a.exT=null; a.exDiv=false;
    var L=ix[a.c];
    // cancelamento: com o protocolo no Tri7, o andamento "Cancelado por Desistência ou Impossibilidade" decide
    // (Abertura de matrícula + Outros atos continua pelo VHL: a abertura é registrada e só o outro ato cai)
    if (L && a.catV!=='E' && a.catV!=='N' && cfgVal('ri.cancelTri7',compAto(a)) && L.some(function(e){ return ehCanc(e.s); })){ a.cat='N'; a.motivo='T'; } // 0.10.5: Desistência, Decurso de Prazo ou Cancelado
    // 1.10.2: registro = Selos Gerados do Tri7 quando sai antes da última Revisão Oficial do VHL (a Revisão posterior é só o fechamento do fluxo)
    if (a.regV===undefined){ a.regV=a.reg; a.brutoV=a.bruto; a.liqV=a.liq; }
    a.reg=a.regV; a.bruto=a.brutoV; a.liq=a.liqV; a.regSG=null;
    if (L && a.cat==='R' && a.regV && a.ing && a.brutoV!=null && cfgVal('ri.registroSelo',compAto(a))){ var sg=null;
      L.forEach(function(e){ if (e.s!=='SG') return; var d=Motor.isoMin(e.m).slice(0,10); if (d>=a.ing && d<a.regV && (!sg||d>sg)) sg=d; });
      if (sg){ a.regSG=a.regV; a.reg=sg; a.bruto=duCal()(Motor.diaDeIso(a.ing),Motor.diaDeIso(sg)); if (a.liq!=null && a.liq>a.bruto) a.liq=a.bruto; } }
    // 1.10.3: limite = dia útil do retorno + 5 (art. 188, §1º, III), mínimo 20. Retorno = Re-análise do Tri7; sem ela, a Re-Análise do VHL
    // 0.10.5: Re-análise só é retorno quando houve Nota de Exigência antes (no ONR é comum Prenotado → Re-análise sem nota) — vale a partir de MARCO_RET
    var novoRet=!!cfgVal('ri.retornoComprovado',compAto(a)); // 0.10.6: regra com vigência na Configuração (padrão: a partir de out/2026)
    var retT=null; if (L && a.reg) L.forEach(function(e){ if (e.s!=='RA') return; var d=Motor.isoMin(e.m).slice(0,10); if (!(d>a.ing && d<=a.reg)) return; if (novoRet && !L.some(function(x){ return x.s==='NE' && x.m<e.m; })) return; if (!retT||d>retT) retT=d; });
    if (!a.reg) retT=null; // sem Revisão Oficial (CNIB, intimações, Prazo do VHL): limite segue 20/25
    if (novoRet){ // reingresso só com retorno comprovado: Re-análise do Tri7 (após Nota) ou etapa Re-Análise do VHL; Revisão de Exigência e Demanda não contam
      var retV=null; if (a.reg) nxEventos(a).forEach(function(e){ if (!/re-?analise/.test(semAc(e.et))) return; var d=Motor.isoDeDia(e.d); if (d>a.ing && d<=a.reg && (!retV||d>retV)) retV=d; });
      a.retUsado=a.reg?(retT||retV||''):''; a.retFonte=retT?'Tri7':retV?'VHL':'';
      a.lim=Motor.limitePrazo(a.retUsado?1:0, a.ing, a.retUsado, state.extras, prazoBaseRI(a), cfgVal('ri.retornoMais',compAto(a)));
    } else {
      a.retUsado=a.reg?(retT||(a.ret&&a.ret<=a.reg?a.ret:'')):''; a.retFonte=retT?'Tri7':a.retUsado?'VHL':'';
      a.lim=Motor.limitePrazo(a.reing||(retT?1:0), a.ing, a.retUsado, state.extras, prazoBaseRI(a), cfgVal('ri.retornoMais',compAto(a)));
    }
    var pNat=cfgVal('ri.prazoNat|'+a.nat,compAto(a)); a.limCorr=null; a.limVenc=null;
    if (pNat&&typeof pNat==='object'&&pNat.un==='c'&&a.ing){ var di=Motor.diaDeIso(a.ing), fv=vencCorridos(duCal(),di,pNat.n); a.limCorr=pNat.n; a.limVenc=Motor.isoDeDia(fv); a.lim=duCal()(di,fv); } // prazo próprio em dias corridos
    a.retDu=a.retUsado?duCal()(Motor.diaDeIso(a.ing),Motor.diaDeIso(a.retUsado)):null;
    a.dentro=a.bruto!=null && a.bruto<=a.lim; a.espera=(a.bruto!=null&&a.liq!=null)?Math.max(0,a.bruto-a.liq):null;
    if (!L || !L.some(function(e){ return e.s==='PN'||e.s==='PA'; })) return;
    // notas seguidas sem o título voltar (Re-análise) = mesma exigência reemitida/corrigida: conta 1 por ciclo
    var ne=0, ci=0, nNotas=0, aberta=false; L.forEach(function(e){ if (e.s==='NE'){ nNotas++; if (!aberta){ ne++; aberta=true; } } else if (e.s==='RA'||e.s==='SG'){ aberta=false; } else if (e.s==='CI'||e.s==='AP'){ ci++; aberta=false; } });
    var extra=Math.max(0,a.nexV-ne), conv=Math.min(extra,ci); extra-=conv;
    // parada que o VHL leu como exigência, sem Nota de Exigência nem Custas no Tri7 = espera de pagamento (decisão de 08/10/2026)
    a.nex=ne; a.npg=Math.max(a.npgV,ci)+extra;
    a.exT={ne:ne, nNotas:nNotas, ci:ci, vhl:a.nexV, pgV:a.npgV, extra:extra, conv:conv, rapidas:Math.max(0,ne-a.nexV)};
    a.nri=Math.max(0,a.nriV-a.exT.rapidas); // o 'retorno interno' do VHL era a exigência cumprida rápido
    a.exDiv=a.nex!==a.nexV;
  }
  function cancSoTri7(){ var ver=[state.andVer||0,Object.keys(state.docs).length,Object.keys(state.serv).length].join('|'); if (state._cst&&state._cst.k===ver) return state._cst.v;
    var conhecidos={}; Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ conhecidos[a.c]=1; }); }); Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ conhecidos[d.c]=1; }); });
    var ix=andIndice(), out={};
    Object.keys(ix).forEach(function(c){ if (conhecidos[c]) return; var L=ix[c], cd=null; L.forEach(function(e){ if (ehCanc(e.s)&&!cd) cd=e; }); if (!cd) return;
      var m=Motor.isoMin(cd.m).slice(0,7), pn=L.filter(function(e){ return e.s==='PN'||e.s==='PA'; })[0];
      (out[m]=out[m]||[]).push({c:c, cat:'N', motivo:'T', soTri7:true, nat:'(sem finalização no VHL)', ing:cd.i!=null?Motor.isoMin(cd.i).slice(0,10):pn?Motor.isoMin(pn.m).slice(0,10):'', fin:Motor.isoMin(cd.m).slice(0,10), reg:'', bruto:null, mes:m, u:cd.u}); });
    state._cst={k:ver,v:out}; return out; }
  // só entram quando o período tem dados do RI e o filtro de origem é "todas" (a origem desses não é conhecida)
  function cancSoTri7Mes(m, semFiltro){ if ((!semFiltro && (state.riOrig||'todas')!=='todas') || !state.docs[m]) return []; return cancSoTri7()[m]||[]; }
  function cancSoTri7Periodo(){ var o=[]; Object.keys(state.docs).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) o=o.concat(cancSoTri7Mes(m)); }); return o; }
  function aplicarTri7(){
    var ix=andIndice(); // roda mesmo sem Tri7: o limite do prazo depende dos feriados locais
    Object.keys(state.docs).forEach(function(m){ var d=state.docs[m], k=state.andVer+'|'+(state.extras||[]).join(',')+'|'+Object.keys(state.logs).length+'|'+state.apurVer; /* refaz quando as etapas (logs) chegam ou a Configuração muda */ if (d._andVer===k) return; d.atos.forEach(function(a){ exAjuste(a,ix); }); d._andVer=k; });
  }
  function exExplica(a){ var t=a.exT; if (!t) return '';
    var p=[]; p.push(t.ne+' exigência(s) pelo Tri7'+(t.nNotas>t.ne?' ('+t.nNotas+' notas; '+(t.nNotas-t.ne)+' reemitida(s) sem o título voltar, contada(s) uma vez)':''));
    if (t.rapidas) p.push(t.rapidas+' cumprida(s) tão rápido que o VHL não viu parada');
    if (t.conv) p.push(t.conv+' parada(s) que o VHL leu como exigência eram custas (pagamento)');
    if (t.extra) p.push(t.extra+' parada(s) sem Nota de Exigência nem Custas no Tri7: contada(s) como pagamento');
    return p.join(' · ')+(a.exDiv?' · <span class="pill warn">VHL sozinho leria '+t.vhl+'</span>':''); }

  // ——— nomes: login do Tri7 -> nome completo do VHL
  function nomesConhecidos(){
    var tri={}, todos={};
    function add(o,n){ n=String(n||'').trim(); if (!n||/^tri7$/i.test(n)) return; var k=semAc(n); if (!o[k]) o[k]=n; }
    Object.keys(state.cert).forEach(function(m){ var r=state.cert[m].raw||{}; (r.usuarios||[]).forEach(function(n){ add(tri,n); add(todos,n); }); });
    Object.keys(state.logs).forEach(function(m){ (state.logs[m].rps||[]).forEach(function(n){ add(todos,n); }); });
    Object.keys(state.inconf).forEach(function(m){ state.inconf[m].forEach(function(r){ add(todos,r.r); }); });
    return {tri:tri, todos:todos};
  }
  function tituloLogin(l){ return String(l||'').toLowerCase().split(/[.\s]+/).filter(Boolean).map(function(p){ return p.charAt(0).toUpperCase()+p.slice(1); }).join(' '); }
  function mapaSugerido(logins, certNovos){
    var sug={}, votos={};
    if (certNovos){ var velho={}; Object.keys(state.cert).forEach(function(m){ state.cert[m].recs.forEach(function(r){ velho[r.p]=r.u; }); });
      certNovos.forEach(function(r){ var n=velho[r.p]; if (!n||/^tri7$/i.test(n)) return; var v=votos[r.u]=votos[r.u]||{}; v[n]=(v[n]||0)+1; });
      Object.keys(votos).forEach(function(l){ var v=votos[l], best=null; Object.keys(v).forEach(function(n){ if (!best||v[n]>v[best]) best=n; }); var tot=Object.keys(v).reduce(function(s,n){return s+v[n];},0); if (best && v[best]>=Math.max(3,tot*0.8)) sug[l]=best; }); }
    var K=nomesConhecidos(), usados={}; Object.keys(sug).forEach(function(l){ usados[semAc(sug[l])]=1; }); Object.keys(state.usr).forEach(function(l){ usados[semAc(state.usr[l])]=1; });
    function cand(base, tk){ return Object.keys(base).filter(function(k){ var p=k.split(/\s+/); return p[0]===tk[0] && tk.slice(1).every(function(t){ return p.indexOf(t)>=0; }); }).map(function(k){ return base[k]; }); }
    logins.slice().sort(function(a,b){ return b.split('.').length-a.split('.').length; }).forEach(function(l){
      if (sug[l]||state.usr[l]||!l) return; if (l==='TRI7'){ sug[l]='Tri7'; return; }
      var tk=semAc(l).split(/[.\s]+/).filter(Boolean), c=cand(K.tri,tk); if (c.length!==1) c=cand(K.todos,tk);
      if (c.length>1){ var livres=c.filter(function(n){ return !usados[semAc(n)]; }); if (livres.length===1) c=livres; }
      if (c.length===1){ sug[l]=c[0]; usados[semAc(c[0])]=1; } });
    return sug;
  }
  function nomeLogin(l){ if (!l) return '(sem usuário)'; return state.usr[l]||state.usrAuto[l]||tituloLogin(l); }
  function salvarUsr(){ if (dbPronto&&podeEscrever) return db.doc('config/usuarios').set({map:state.usr, em:new Date().toISOString()}).catch(function(){ toast('Não consegui salvar os nomes'); }); return Promise.resolve(); }
  function atualizarAuto(){ var ls={}; Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ ls[e.u]=1; }); }); state.usrAuto=mapaSugerido(Object.keys(ls)); }

  // resumo de quem fez o quê num protocolo
  function andResumo(evs){
    var r={ent:null, ex:{}, rv:{}, ra:{}, ci:{}, sg:null, nRE:0, nNE:0};
    evs.forEach(function(e,i){
      if ((e.s==='PN'||e.s==='PA') && !r.ent) r.ent=e;
      if (e.s==='RE' && reVirouNota(evs,i)){ r.nRE++; r.ex[e.u]=(r.ex[e.u]||0)+1; }
      if (e.s==='NE'){ r.nNE++; r.rv[e.u]=(r.rv[e.u]||0)+1; }
      if (e.s==='CI'||e.s==='AP') r.ci[e.u]=(r.ci[e.u]||0)+1;
      if (e.s==='RA') r.ra[e.u]=(r.ra[e.u]||0)+1;
      if (e.s==='SG') r.sg=e; });
    return r;
  }
  function listaPessoas(o){ return Object.keys(o).map(function(u){ return nomeLogin(u)+(o[u]>1?' ('+o[u]+')':''); }).join(', '); }
  function andResumoHTML(evs){
    var r=andResumo(evs), it=[];
    it.push(['Deu entrada (prenotou)', r.ent?'<b>'+esc(nomeLogin(r.ent.u))+'</b> · '+minFmt(r.ent.m)+(r.ent.s==='PA'?' (automática · ONR)':''):'—']);
    if (r.nRE) it.push(['Exigência redigida por', esc(listaPessoas(r.ex))]);
    if (r.nNE) it.push(['Nota de exigência emitida por', esc(listaPessoas(r.rv))+' <span class="mut">(revisão)</span>']);
    if (Object.keys(r.ci).length) it.push(['Custas informadas por', esc(listaPessoas(r.ci))]);
    if (Object.keys(r.ra).length) it.push(['Re-análise recebida por', esc(listaPessoas(r.ra))]);
    it.push(['Selos gerados (registro) por', r.sg?'<b>'+esc(nomeLogin(r.sg.u))+'</b> · '+minFmt(r.sg.m):'—']);
    return {it:it, h:'<div class="sub-h" style="margin-top:14px">Quem fez (Tri7)</div><div class="prot-grid">'+it.map(function(x){ return '<div class="pk">'+x[0]+'</div><div class="pv">'+x[1]+'</div>'; }).join('')+'</div>'+
      '<p class="hint">É quem registrou o andamento no Tri7. Serve para consulta e treinamento; não indica, sozinho, responsável por erro.</p>',
      txt:'\n\nQuem fez (Tri7):\n'+it.map(function(x){ return x[0]+': '+x[1].replace(/<[^>]+>/g,''); }).join('\n')};
  }
  // ficha sem ato no VHL: só o Tri7
  function andFichaHTML(c){
    var evs=andIndice()[c]; if (!evs||!evs.length) return {h:Object.keys(state.andam).length?'<p class="hint" style="margin-top:12px">Sem andamentos deste protocolo no Relatório de andamentos do Tri7 importado.</p>':'', txt:''};
    var R=andResumoHTML(evs);
    var h=R.h+'<div class="tbl-wrap" style="margin-top:8px"><table class="tleft"><thead><tr><th>Data e hora</th><th>Andamento</th><th>Quem fez</th></tr></thead><tbody>'+
      evs.map(function(e){ return '<tr><td>'+minFmt(e.m)+'</td><td><span class="pill '+(AND_COR[e.s]||'mute')+'">'+esc(andNome(e.s))+'</span></td><td>'+esc(nomeLogin(e.u))+'</td></tr>'; }).join('')+'</tbody></table></div>';
    return {h:h, txt:R.txt+'\n'+evs.map(function(e){ return minFmt(e.m)+' · '+andNome(e.s)+' · '+nomeLogin(e.u); }).join('\n')};
  }

  // ——— produção e tempos por pessoa no Tri7 (período do seletor)
  function andPeriodo(){ var out=[]; Object.keys(state.andam).sort().forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) out=out.concat(state.andam[m]); }); return out; }
  function tri7PorPessoa(){
    var E=andPeriodo(), P={}, ix=andIndice(), fer=Motor.feriadoSet(state.extras), h0=state.cfg.expIni, h1=state.cfg.expFim;
    function p(u){ return P[u]=P[u]||{u:u,PN:0,PA:0,RA:0,RE:0,REx:0,NE:0,CI:0,AP:0,SG:0,RC:0,tEx:[],tRv:[]}; }
    E.forEach(function(e){ if (e.t!=='P') return; var x=p(e.u), L=ix[e.n]||[], i=L.indexOf(e), j;
      if (x[e.s]!=null) x[e.s]++;
      if (e.s==='RE'){ if (reVirouNota(L,i)){ x.REx++; for (j=i-1;j>=0;j--){ if (L[j].s==='PN'||L[j].s==='PA'||L[j].s==='RA'){ x.tEx.push(Motor.horasUteis(L[j].m,e.m,fer,h0,h1)); break; } if (L[j].s==='RE'||L[j].s==='NE'||L[j].s==='CI') break; } } }
      if (e.s==='NE'){ for (j=i-1;j>=0;j--){ if (L[j].s==='RE'){ x.tRv.push(Motor.horasUteis(L[j].m,e.m,fer,h0,h1)); break; } if (L[j].s==='NE'||L[j].s==='RA'||L[j].s==='CI') break; } } });
    return P;
  }

  // ——— página "Quem fez · Tri7"
  function renderTri(){
    var el=$('tabTri'); if (!el) return;
    if (!Object.keys(state.andam).length){ el.innerHTML='<div class="empty"><b>Nenhum Relatório de andamentos importado</b>No Tri7, gere o <i>Relatório de andamentos</i> com 0011 Prenotado, 0504 Prenotado Automaticamente, 0357 Re-análise, 0334 Revisão de Exigência, 0326 Nota de Exigência, Custas Informadas (SAEC/ONR), 0019 Selos Gerados e Cancelado por Desistência ou Impossibilidade, e solte o .xls em <b>Importar dados</b>. Ele substitui a planilha Andamentos antiga (certidões saem dele também).</div>'; return; }
    aplicarTri7();
    var P=tri7PorPessoa(), ix=andIndice(), cer=certRecs();
    Object.keys(P).forEach(function(k){ P[k].CE=0; });
    var porNome={}; Object.keys(P).forEach(function(k){ porNome[semAc(nomeLogin(k))]=k; });
    cer.forEach(function(c){ var k=porNome[semAc(c.u)]; if (!k){ k='nome:'+c.u; P[k]=P[k]||{u:k,nome:c.u,PN:0,PA:0,RA:0,RE:0,REx:0,NE:0,CI:0,AP:0,SG:0,RC:0,CE:0,tEx:[],tRv:[]}; } P[k].CE=(P[k].CE||0)+1; });
    var tot={PN:0,PA:0,RA:0,REx:0,NE:0,CI:0,AP:0,SG:0}; Object.keys(P).forEach(function(k){ Object.keys(tot).forEach(function(s){ tot[s]+=P[k][s]||0; }); });
    // divergências VHL × Tri7 nas exigências dos atos do período
    var R=todosAtos().filter(function(a){ return a.cat==='R'; }), cob=R.filter(function(a){ return a.exT; }), div=cob.filter(function(a){ return a.exDiv; });
    var h='<p class="hint" style="margin:0 0 10px">O Tri7 completa o VHL: o VHL diz quem analisou, as etapas e os prazos; o Tri7 diz quem deu entrada, quando a exigência foi de fato enviada ao cliente, quando as custas foram informadas e quem gerou os selos. As exigências de todo o painel já usam os dois juntos (veja <b>Como é calculado</b>).</p><div class="kpis">'+
      kpi('Entradas (prenotações)',String(tot.PN+tot.PA),tot.PA?tot.PA+' automáticas (ONR)':'balcão e e-protocolo')+
      kpi('Exigências enviadas',String(tot.NE),'notas de exigência')+
      kpi('Custas informadas',String(tot.CI+tot.AP),'esperas de pagamento')+
      kpi('Re-análises',String(tot.RA),'título voltou')+
      kpi('Registros (selos gerados)',String(tot.SG),'protocolos de RI')+
      kpi('Exigências VHL × Tri7',cob.length?pct((cob.length-div.length)/cob.length*100):'—',cob.length?div.length+' de '+cob.length+' atos registrados com contagem corrigida pelo Tri7':'sem atos cobertos no período')+'</div>';
    var ks=Object.keys(P).map(function(k){ var x=P[k]; x.total=x.PN+x.PA+x.RA+x.REx+x.NE+x.CI+x.AP+x.SG+(x.CE||0); return x; }).filter(function(x){ return x.total && x.u!=='TRI7' && !/^tri7$/i.test(x.nome||''); }).sort(function(a,b){ return b.total-a.total; });
    function cel(v,mx){ return '<td class="num">'+(v?'<span class="barra" style="--w:'+Math.round(v/mx*100)+'%">'+v.toLocaleString('pt-BR')+'</span>':'<span class="mut">·</span>')+'</td>'; }
    var cols=[['PN','Entradas','Prenotado + Prenotado automaticamente',function(x){return x.PN+x.PA;}],['RA','Re-análise','Recebeu o título de volta',function(x){return x.RA;}],['REx','Exigência redigida','Revisão de Exigência que virou Nota de Exigência',function(x){return x.REx;}],['NE','Nota emitida','Nota de Exigência: emitida por quem revisou',function(x){return x.NE;}],['CI','Custas informadas','Custas Informadas (SAEC/ONR)',function(x){return x.CI+x.AP;}],['SG','Registro (selos)','Selos Gerados em protocolo de RI',function(x){return x.SG;}],['CE','Certidões','Certidões emitidas (selos)',function(x){return x.CE||0;}]];
    var mx={}; cols.forEach(function(c){ mx[c[0]]=Math.max(1,Math.max.apply(null,ks.map(c[3]))); });
    h+='<div class="sub-h" style="margin-top:16px">Produção por pessoa · '+(state.periodo==='todos'?'todo o período':nomeMes(state.periodo))+'</div><div class="tbl-wrap"><table><thead><tr><th class="tleft">Pessoa</th>'+cols.map(function(c){ return '<th title="'+esc(c[2])+'">'+c[1]+'</th>'; }).join('')+'</tr></thead><tbody>'+
      ks.map(function(x){ return '<tr><td class="tleft">'+esc(x.nome||nomeLogin(x.u))+'</td>'+cols.map(function(c){ return cel(c[3](x),mx[c[0]]); }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
    var fx=function(x,k){ var e=est(x[k]); return e.n>=MIN_N?'<td class="num">'+e.n+'</td><td class="num">'+fmtH(e.mediana)+'</td><td class="num">'+fmtH(e.p90)+'</td>':'<td class="num">'+(e.n||'·')+'</td><td class="num mut" colspan="2">'+(e.n?'poucos casos':'')+'</td>'; };
    var ae=ks.filter(function(x){return x.tEx.length;}), ar=ks.filter(function(x){return x.tRv.length;});
    if (ae.length||ar.length){
      var tAll=est([].concat.apply([],ae.map(function(x){return x.tEx;}))), rAll=est([].concat.apply([],ar.map(function(x){return x.tRv;})));
      h+='<div class="sub-h" style="margin-top:16px">Tempo no sistema (horas úteis, expediente '+state.cfg.expIni+'h–'+state.cfg.expFim+'h)</div><p class="hint" style="margin:0 0 6px">Da entrada (Prenotado ou Re-análise) até a exigência ser redigida, e da exigência até a nota ser emitida. É o tempo entre dois registros no Tri7 — a pessoa pode ter recebido o título depois. Mediana e P90 (90% dos casos em até) só com '+MIN_N+' casos ou mais.</p>'+
        '<div class="grid2"><div class="tbl-wrap"><table><thead><tr><th class="tleft">Redigiu a exigência</th><th>Casos</th><th>Mediana</th><th>P90</th></tr></thead><tbody>'+ae.map(function(x){ return '<tr><td class="tleft">'+esc(nomeLogin(x.u))+'</td>'+fx(x,'tEx')+'</tr>'; }).join('')+'<tr class="tot"><td class="tleft">Equipe</td><td class="num">'+tAll.n+'</td><td class="num">'+fmtH(tAll.mediana)+'</td><td class="num">'+fmtH(tAll.p90)+'</td></tr></tbody></table></div>'+
        '<div class="tbl-wrap"><table><thead><tr><th class="tleft">Revisou (emitiu a nota)</th><th>Casos</th><th>Mediana</th><th>P90</th></tr></thead><tbody>'+ar.map(function(x){ return '<tr><td class="tleft">'+esc(nomeLogin(x.u))+'</td>'+fx(x,'tRv')+'</tr>'; }).join('')+'<tr class="tot"><td class="tleft">Equipe</td><td class="num">'+rAll.n+'</td><td class="num">'+fmtH(rAll.mediana)+'</td><td class="num">'+fmtH(rAll.p90)+'</td></tr></tbody></table></div></div>';
    }
    // nomes
    var ls={}; Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ ls[e.u]=(ls[e.u]||0)+1; }); });
    var K=nomesConhecidos().todos, dl='<datalist id="dlNomes">'+Object.keys(K).sort().map(function(k){ return '<option value="'+esc(K[k])+'">'; }).join('')+'</datalist>';
    h+='<details class="panel" style="margin-top:16px;padding:10px 12px"><summary><b>Nomes dos usuários do Tri7</b> <span class="hint">(login → nome completo usado no painel)</span></summary><p class="hint">Sugerido automaticamente pelos pedidos de certidão já salvos e pelo primeiro nome. Corrija se precisar: o nome precisa ser igual ao do VHL para casar com os relatórios por pessoa e com o fluxo de intimação.</p>'+dl+
      '<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Login no Tri7</th><th>Andamentos</th><th>Nome no painel</th></tr></thead><tbody>'+
      Object.keys(ls).filter(Boolean).sort().map(function(l){ return '<tr><td>'+esc(l)+'</td><td class="num">'+ls[l]+'</td><td><input type="text" list="dlNomes" data-usr="'+esc(l)+'" value="'+esc(nomeLogin(l))+'" '+(podeEscrever?'':'disabled ')+'style="min-width:240px" aria-label="Nome de '+esc(l)+'">'+(state.usr[l]?' <span class="pill good">ajustado</span>':state.usrAuto[l]?' <span class="pill mute">sugerido</span>':' <span class="pill warn">sem par</span>')+'</td></tr>'; }).join('')+'</tbody></table></div></details>';
    el.innerHTML=h;
  }

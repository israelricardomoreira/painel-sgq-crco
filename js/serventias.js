/* Painel SGQ · CRCO — js/serventias.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/serventias.js']='0.25.0';
  function servDocs(tipo){ var out=[]; Object.keys(state.serv).sort().forEach(function(m){ if (state.periodo!=='todos'&&state.periodo!==m) return; state.serv[m].forEach(function(d){ if (!tipo||tipo==='__todas'||d.t===tipo) out.push(d); }); }); return out; }
  function servTipos(){ var c={}; Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ c[d.t]=(c[d.t]||0)+1; }); });
    return Object.keys(c).sort(function(a,b){ var ia=SERV_ORD.indexOf(a), ib=SERV_ORD.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib) || c[b]-c[a]; }); }
  function servDu(d){ var kx=(state.extras||[]).join(','); if (d._du!=null && d._duV===kx) return d._du; var du=duServ(); d._du=du(d.ing,d.fin); d._duV=kx; return d._du; }
  function servPrazo(d){ var v=cfgVal('serv.prazo|'+d.t+'|'+d.nat, d.mes||'9999-99'); if (v&&typeof v==='object'){ if (v.un!=='c') return v.n; var du=duServ(); return du(d.ing, vencCorridos(du,d.ing,v.n)); } return v==null||v<0?null:v; } function duServ(){ var k=(state.extras||[]).join(','); if (k!==duServK){ duServK=k; duServF=Motor.criarCalendario(state.extras||[]); } return duServF; } // 0.10.6: com vigência (Configuração)
  function servOk(d){ var p=servPrazo(d); return p==null?null:servDu(d)<=p; }
  function salvarPrazosServ(){ if (dbPronto&&podeEscrever) db.doc('config/prazos').set({map:state.prazosServ, em:new Date().toISOString()}).catch(function(){ toast('Não consegui salvar os prazos'); }); }
  // monta as outras atribuições a partir dos dados brutos guardados (Prazo + Produção por Etapa)

  function servLista(docs){ return docs.slice().sort(function(a,b){ return servDu(b)-servDu(a); }).slice(0,200).map(function(d){ var ok=servOk(d);
    return '<tr><td>'+protLink(d.c)+'</td><td class="tl">'+esc(d.nat)+'</td><td>'+fmtData(Motor.isoDeDia(d.ing))+'</td><td>'+fmtData(Motor.isoDeDia(d.fin))+'</td><td class="num"><b>'+servDu(d)+'</b></td><td class="num">'+(servPrazo(d)==null?'—':servPrazo(d))+'</td><td>'+(ok==null?'':ok?'<span class="pill good">no prazo</span>':'<span class="pill crit">acima</span>')+'</td><td class="num">'+(d.tempo!=null?fmtMS(d.tempo):'—')+'</td></tr>'; }).join(''); }
  // tipo de documento do VHL (+ natureza) -> serventia e classe (atos, certidões, intimações)
  function svDe(t){ var n=semAc(t); if (n==='ri'||n==='certidao - ri'||n==='intimacoes') return 'RI'; if (n==='rc') return 'RC'; if (n==='rtd'||n==='rpj'||n==='certidao - rtd') return 'RTD/PJ'; if (n==='malote digital'||n==='arquivo'||n==='fichas') return 'Apoio'; return null; }
  function clsDe(t, nat){ var n=semAc(t); if (n==='intimacoes') return 'intim'; if (svDe(t)==='Apoio') return 'atos'; if (n.indexOf('certidao')===0 || /certid/.test(semAc(nat))) return 'cert'; return 'atos'; }
  function svAtual(){ if (SV_LISTA.indexOf(state.sv)<0) state.sv='RI'; return state.sv; }
  function subAtual(){ var s=svAtual(); state.svSub=state.svSub||{}; var op=SV_SUB[s]; if (!op) return null; if (!state.svSub[s] || !op.some(function(o){ return o[0]===state.svSub[s]; })) state.svSub[s]=op[0][0]; return state.svSub[s]; }
  function svModo(){ var s=svAtual(), b=subAtual(); if (s==='__todas') return 'todas'; if (s==='RI') return b==='reg'?'ri':b==='cert'?'cert':'serv'; return 'serv'; }
  function atrAtual(){ var m=svModo(); return (m==='ri'||m==='cert')?'RI':'X'; } // 'RI' = telas do RI; 'X' = telas por documento (RC, RTD/PJ, Apoio, intimações, todas)
  function docOk(d){ var s=svAtual(), b=subAtual(); if (svDe(d.t)!==s) return false; if (s==='RI') return b==='intim'&&d.t==='Intimações';
    if (s==='Apoio') return b==='tudo'||d.t===b; if (b==='tudo') return true; return clsDe(d.t,d.nat)===b; }
  function selDocs(){ return servDocs('__todas').filter(docOk); }
  function selDocsMes(m){ return (state.serv[m]||[]).filter(docOk); }
  function incOk(r){ var s=svAtual(); if (s==='__todas') return true; if (svDe(r.t)!==s) return false; var b=subAtual();
    if (s==='RI') return b==='reg'?r.t==='RI':b==='intim'?r.t==='Intimações':semAc(r.t)==='certidao - ri';
    if (s==='Apoio') return b==='tudo'||r.t===b; if (b==='tudo') return true; return clsDe(r.t,r.n)===b; }
  function k13Of(){ var s=svAtual(); return s==='__todas'||s==='Apoio'; }
  function senhaOk(x){ var s=svAtual(); if (s==='__todas'||s==='Apoio') return true; return FILA_SV[semAc(x.fila)]===s; }
  function selNome(){ var s=svAtual(), b=subAtual(), op=(SV_SUB[s]||[]).filter(function(o){ return o[0]===b; })[0]; return (s==='__todas'?'Todas as serventias':s)+(op&&b!=='tudo'&&!(s==='RI'&&b==='reg')?' · '+op[1]:''); }
  function renderAtrSelect(){
    var sel=$('selAtr'); if (!sel) return;
    var CURTO={'__todas':'Todas','RI':'RI','RC':'RC','RTD/PJ':'RTD/PJ'};
    var html=SV_LISTA.map(function(t){ return '<option value="'+esc(t)+'">'+esc(CURTO[t])+'</option>'; }).join('');
    if (sel.innerHTML!==html) sel.innerHTML=html; sel.value=svAtual(); sel.parentNode.hidden=false;
    var org=$('selOrig'); if (org){ org.hidden=svModo()!=='ri'; org.value=state.riOrig||'todas'; }
    var sub=$('selSub'), op=SV_SUB[svAtual()];
    if (sub){ sub.hidden=!op; if (op){ var hs=op.map(function(o){ return '<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>'; }).join(''); if (sub.innerHTML!==hs) sub.innerHTML=hs; sub.value=subAtual(); } }
    var modo=svModo();
    document.querySelectorAll('.tab').forEach(function(b){ var k=b.dataset.tab;
      if (SO_RI.indexOf(k)>=0) b.hidden=!(modo==='ri'||(modo==='cert'&&k==='cer'));
      else if (SO_SERV.indexOf(k)>=0) b.hidden=modo==='todas'||modo==='cert'; });
    var grp=null, alg=false; Array.prototype.forEach.call($('menu').children,function(el){ if (el.classList.contains('menu-grp')){ if (grp) grp.hidden=!alg; grp=el; alg=false; } else if (el.classList.contains('tab') && !el.hidden) alg=true; }); if (grp) grp.hidden=!alg;
    var sm=$('brandSub'); if (sm) sm.textContent='Sistema de Gestão da Qualidade · '+(modo==='ri'?'Registro de Imóveis':selNome()); // 0.11.0: subtítulo diz a serventia, sem citação técnica
    // 0.11.0: a marca fica SGQ; a serventia aparece no subtítulo
  }
  function servPorMesSel(){ var o={}; Object.keys(state.serv).sort().forEach(function(m){ o[m]=selDocsMes(m); }); return o; }
  function servTiles(D){
    var e=est(D.map(servDu)), tAt=est(D.map(function(d){ return d.tempo; }).filter(function(x){ return x>0; }));
    var comP=D.filter(function(d){ return servPrazo(d)!=null; }), okN=comP.filter(servOk).length;
    var incC={}; incTodos().filter(incOk).forEach(function(r){ incC[String(r.c).toUpperCase()]=1; }); var comInc=D.filter(function(d){ return incC[String(d.c).toUpperCase()]; }).length;
    var poucos=comP.length>0&&comP.length<cfgS('amostra.min'); // 1.10.4: amostra pequena não vira alarme
    return kpi('No prazo',comP.length?pct(okN/comP.length*100):'—',comP.length?(poucos?'⚠ amostra pequena · ':'')+okN+' de '+comP.length+' com prazo cadastrado (Configuração)'+(comP.length<D.length?' · '+(D.length-comP.length)+' sem prazo cadastrado':''):'sem prazo cadastrado (<b>Configuração</b>)'+(e.n?' · referência: 90% em até '+f1(e.p90)+' d.u.':''),poucos?'':'hero',{go:goLista('No prazo · documentos com prazo cadastrado','docs',comP), f:kConta('documentos finalizados no prazo ÷ documentos com prazo cadastrado',okN+' ÷ '+comP.length,comP.length?pct(okN/comP.length*100):null,'Relatório de documentos da serventia (VHL)'+' + prazos da Configuração','Documentos sem prazo cadastrado ficam fora.')})+
      kpi('Finalizados',String(D.length),state.periodo==='todos'?'no período importado':nomeMes(state.periodo),'',{go:goLista('Finalizados · '+selNome(),'docs',D)})+
      kpi('Mediana até finalizar',e.n?f1(e.mediana)+' <small style="font-size:14px">d.u.</small>':'—',e.n?'média '+f1(e.media)+(e.moda!=null?' · mais comum '+e.moda:'')+' · 90% em até '+f1(e.p90):'','',{go:goLista('Documentos finalizados · '+selNome(),'docs',D), f:kConta('mediana dos dias úteis do ingresso à finalização',e.n+' documentos',e.n?f1(e.mediana)+' d.u.':null,'Relatório de documentos da serventia (VHL)')})+
      kpi('Tempo de atuação',tAt.n?fmtMS(tAt.mediana):'—',tAt.n?'mediana por documento (cronômetro do VHL)':'sem cronômetro registrado','',{go:goLista('Documentos com cronômetro','docs',D.filter(function(d){ return d.tempo>0; })), f:kConta('mediana do tempo cronometrado por documento',tAt.n+' documentos com cronômetro',null,'Relatório de documentos da serventia (VHL)')})+
      kpi('Com inconformidade',D.length?pct(comInc/D.length*100):'—',comInc+' de '+D.length+' documentos finalizados','',{go:goLista('Documentos com inconformidade','docs',D.filter(function(d){ return incC[String(d.c).toUpperCase()]; })), f:kConta('documentos finalizados com ao menos 1 inconformidade (ligada pelo código) ÷ documentos finalizados',comInc+' ÷ '+D.length,D.length?pct(comInc/D.length*100):null,'PAINEL-04 × '+'Relatório de documentos da serventia (VHL)')});
  }
  function servGraficosHTML(){
    var PM=servPorMesSel(), ks=Object.keys(PM).sort(), i0=-1; ks.forEach(function(m,i){ if (i0<0&&PM[m].length) i0=i; }); if (i0<0) return '<div class="empty">Sem documentos nesta seleção.</div>'; var ms=ks.slice(i0).slice(-12); // 1.10.4: mês sem documento aparece com 0
    var incM={}; incTodos().filter(incOk).forEach(function(r){ var m=String(r.d||'').slice(0,7); incM[m]=(incM[m]||0)+1; });
    var cards=[
      {t:'Finalizados', un:'', v:ms.map(function(m){ return PM[m].length; }), zero:true},
      {t:'Mediana até finalizar', un:'d.u.', v:ms.map(function(m){ var x=est(PM[m].map(servDu)); return x.n?x.mediana:null; }), zero:true, menor:true},
      {t:'90% finalizados em até', un:'d.u.', v:ms.map(function(m){ var x=est(PM[m].map(servDu)); return x.n?x.p90:null; }), zero:true, menor:true},
      {t:'No prazo', un:'%', ir:'fp', v:ms.map(function(m){ var c=PM[m].filter(function(d){ return servPrazo(d)!=null; }); return c.length?c.filter(servOk).length/c.length*100:null; })},
      {t:'Tempo de atuação (mediana)', un:'min', v:ms.map(function(m){ var x=est(PM[m].map(function(d){ return d.tempo; }).filter(function(v){ return v>0; })); return x.n?x.mediana/60:null; }), zero:true},
      {t:'Inconformidades registradas', un:'', ir:'k1', v:ms.map(function(m){ return incM[m]||0; }), zero:true, menor:true}
    ];
    return cards.filter(function(c){ return c.v.some(function(v){ return v!=null; }); }).map(function(c){
      var idx=-1; c.v.forEach(function(v,i){ if (v!=null) idx=i; });
      return '<div class="gm-card"><div class="gm-h"><span class="gm-t">'+esc(c.t)+'</span><span class="gm-v">'+fmtG(c.v[idx],c.un)+'</span></div><div class="gm-s">'+compLabel(ms[idx]).slice(4)+'</div>'+graficoLinha(ms,c.v,{titulo:c.t,un:c.un,zero:c.zero,menor:c.menor,ir:c.ir||'nat'})+'</div>'; }).join('');
  }
  function servNatHTML(D){
    var N={}; D.forEach(function(d){ var k=d.t+'|'+d.nat, x=N[k]=N[k]||{t:d.t,nat:d.nat,docs:[]}; x.docs.push(d); });
    var nk=Object.keys(N).sort(function(a,b){ return N[b].docs.length-N[a].docs.length; }), varios=Object.keys(N).map(function(k){ return N[k].t; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).length>1;
    if (!nk.length) return '<div class="empty">Sem documentos nesta seleção no período.</div>';
    var h='<p class="hint" style="margin:0 0 6px">Dias úteis do ingresso à finalização (sábado, domingo e feriado fora; o dia do ingresso não conta). O <b>prazo legal em dias úteis</b> de cada natureza (0 = no mesmo dia) define o % no prazo; os já preenchidos vêm da pesquisa da Lei 6.015/73 e do Prov. CNJ 149/2023 (passe o mouse no prazo para ver a base). Clique na natureza para ver os documentos.</p>'+
      '<div class="tbl-wrap"><table><thead><tr><th class="tleft">Natureza</th>'+(varios?'<th class="tleft">Tipo</th>':'')+'<th>Qtd.</th><th>Mediana</th><th>P90</th><th>Máx.</th><th>Atuação</th><th>Prazo (d.u.)</th><th>No prazo</th></tr></thead><tbody>'+
      nk.map(function(k){ var x=N[k], s=est(x.docs.map(servDu)), a=est(x.docs.map(function(d){return d.tempo;}).filter(function(v){return v>0;})), pz=state.prazosServ[k], cp=x.docs.filter(function(d){ return servPrazo(d)!=null; }), ok=cp.filter(servOk).length, base=PRAZOS_BASE[k];
        return '<tr class="click'+(state.srvNat===k?' sel':'')+'" data-srvnat="'+esc(k)+'"><td class="tleft">'+esc(x.nat)+'</td>'+(varios?'<td class="tleft mut">'+esc(x.t)+'</td>':'')+'<td class="num">'+x.docs.length+'</td><td class="num" data-tip="'+esc(estTip(s,' d.u.'))+'">'+f1(s.mediana)+'</td><td class="num">'+f1(s.p90)+'</td><td class="num">'+s.max+'</td><td class="num">'+(a.n?fmtMS(a.mediana):'—')+'</td>'+
          '<td'+(base?' data-tip="'+esc(base)+'"':'')+'>'+(function(){ var v=cfgVal('serv.prazo|'+k,mesHoje()); return v==null||(typeof v==='number'&&v<0)?'<span class="mut">—</span>':typeof v==='object'?v.n+(v.un==='c'?' corridos':''):String(v); })()+(podeEscrever?' <button type="button" class="lnk" data-cfgir="serv.prazo|'+esc(k)+'">alterar</button>':'')+'</td><td>'+(cp.length?'<span class="pill '+(ok===cp.length?'good':ok/cp.length>=.9?'warn':'crit')+'">'+pct(ok/cp.length*100)+'</span>':'<span class="mut">—</span>')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    if (state.srvNat && N[state.srvNat]) h+='<div class="sub-h" style="margin-top:12px">'+esc(N[state.srvNat].nat)+' · documentos (mais demorados primeiro)</div><div class="tbl-wrap" style="max-height:420px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Finalização</th><th>d.u.</th><th>Prazo</th><th></th><th>Atuação</th></tr></thead><tbody>'+servLista(N[state.srvNat].docs)+'</tbody></table></div>';
    return h;
  }
  function servEtapaHTML(D){
    var ET={}, PE={}; D.forEach(function(d){ d.ets.forEach(function(x){ var a=ET[x.et]=ET[x.et]||{n:0,pz:[]}; a.n++; a.pz.push(x.pz); var b=PE[x.rp]=PE[x.rp]||{n:0,docs:{},et:{}}; b.n++; b.docs[d.c]=1; b.et[x.et]=(b.et[x.et]||0)+1; }); });
    var ek=Object.keys(ET).sort(function(a,b){ return ET[b].n-ET[a].n; }), pk=Object.keys(PE).filter(Boolean).sort(function(a,b){ return PE[b].n-PE[a].n; });
    if (!ek.length) return '<div class="empty">Sem etapas do VHL para esses documentos no período.</div>';
    return '<div class="grid2"><div><div class="sub-h">Por etapa</div><div class="tbl-wrap"><table><thead><tr><th class="tleft">Etapa</th><th>Execuções</th><th>Mediana na etapa</th><th>P90</th></tr></thead><tbody>'+
      ek.map(function(k){ var s=est(ET[k].pz); return '<tr><td class="tleft">'+esc(k)+'</td><td class="num">'+ET[k].n+'</td><td class="num" data-tip="'+esc(estTip(s,' d.u.'))+'">'+f1(s.mediana)+' d.u.</td><td class="num">'+f1(s.p90)+'</td></tr>'; }).join('')+'</tbody></table></div></div>'+
      '<div><div class="sub-h">Por pessoa</div><div class="tbl-wrap"><table><thead><tr><th class="tleft">Pessoa</th><th>Documentos</th><th>Execuções</th><th class="tleft">Etapa mais feita</th></tr></thead><tbody>'+
      pk.map(function(k){ var b=PE[k], top=Object.keys(b.et).sort(function(x,y){ return b.et[y]-b.et[x]; })[0]; return '<tr><td class="tleft">'+esc(k)+'</td><td class="num">'+Object.keys(b.docs).length+'</td><td class="num">'+b.n+'</td><td class="tleft mut">'+esc(top||'')+'</td></tr>'; }).join('')+'</tbody></table></div></div></div>';
  }
  function servFpHTML(D){
    var comP=D.filter(function(d){ return servPrazo(d)!=null; }), fora=comP.filter(function(d){ return !servOk(d); });
    if (!comP.length) return '<div class="empty"><b>Nenhum prazo legal definido para '+esc(selNome())+'</b>Preencha a coluna Prazo (d.u.) na página <b>Por natureza</b>.</div>';
    return '<div class="kpis" style="margin-bottom:12px">'+kpi('Fora do prazo',String(fora.length),'de '+comP.length+' com prazo definido',fora.length?'canc':'',{go:goLista('Fora do prazo','docs',fora)})+kpi('No prazo',pct((comP.length-fora.length)/comP.length*100),'','',{go:goLista('No prazo','docs',comP.filter(servOk)), f:kConta('no prazo ÷ com prazo definido',(comP.length-fora.length)+' ÷ '+comP.length,pct((comP.length-fora.length)/comP.length*100),'Relatório de documentos da serventia (VHL)')})+'</div>'+
      (fora.length?'<div class="tbl-wrap" style="max-height:520px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Finalização</th><th>d.u.</th><th>Prazo</th><th></th><th>Atuação</th></tr></thead><tbody>'+servLista(fora)+'</tbody></table></div>':'<div class="empty">Todos dentro do prazo no período.</div>');
  }

  // ——— Comparativo (Todas as serventias)
  function mesNoPeriodo(m){ return state.periodo==='todos'||state.periodo===m; }
  function compDados(){
    var linhas={}; function L(s){ return linhas[s]=linhas[s]||{sv:s, fin:0, du:[], comP:0, ok:0, inc:0, docsInc:0, senhas:0, esp:[], cert:0, certOk:0, certCalc:0, certBal:0}; }
    // RI: protocolos registrados/finalizados + intimações (serv)
    Object.keys(state.docs).forEach(function(m){ if (!mesNoPeriodo(m)) return; state.docs[m].atos.forEach(function(a){ if (a.cat!=='R'&&a.cat!=='N') return; [L('RI'),L(origemAto(a)==='central'?'RI-cen':'RI-bal')].forEach(function(x){ x.fin++; if (a.cat==='R'){ if (a.bruto!=null) x.du.push(a.bruto); x.comP++; if (ok(a)) x.ok++; } }); }); });
    var oCod={}; Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ oCod[String(a.c).toUpperCase()]=origemAto(a)==='central'?'RI-cen':'RI-bal'; }); });
    var incC={}; incTodos().forEach(function(r){ var s=svDe(r.t); if (!s) return; var cu=String(r.c).toUpperCase(); incC[s+'|'+cu]=1; if (mesNoPeriodo(String(r.d).slice(0,7))){ L(semAc(r.t)==='intimacoes'?'RI-intim':s).inc++; if (r.t==='RI'&&oCod[cu]) L(oCod[cu]).inc++; } });
    Object.keys(state.docs).forEach(function(m){ if (!mesNoPeriodo(m)) return; state.docs[m].atos.forEach(function(a){ if (a.cat==='R'&&incC['RI|'+String(a.c).toUpperCase()]){ L('RI').docsInc++; L(origemAto(a)==='central'?'RI-cen':'RI-bal').docsInc++; } }); });
    Object.keys(state.serv).forEach(function(m){ if (!mesNoPeriodo(m)) return; state.serv[m].forEach(function(d){ var s=svDe(d.t); if (!s) return; var x=L(s), c=clsDe(d.t,d.nat);
      if (c==='cert'){ x.cert++; var p=servPrazo(d); if (p!=null){ x.certCalc++; if (servOk(d)) x.certOk++; } return; }
      if (c==='intim'){ x=L('RI-intim'); }
      x.fin++; x.du.push(servDu(d)); var p2=servPrazo(d); if (p2!=null){ x.comP++; if (servOk(d)) x.ok++; } if (incC[s+'|'+String(d.c).toUpperCase()]) x.docsInc++; }); });
    var cr=certCalc(certRecs()); cr.forEach(function(c){ var x=L('RI'); x.cert++; if (c.origem==='Balcão') x.certBal++; if (!c.intim){ x.certCalc++; if (c.ok) x.certOk++; } });
    senhasLista(state.periodo).forEach(function(s){ var sv=FILA_SV[semAc(s.fila)]; if (!sv) return; var x=L(sv); x.senhas++; if (s.c!=null&&s.e!=null) x.esp.push(s.e); });
    return ['RI','RI-bal','RI-cen','RI-intim','RC','RTD/PJ'].filter(function(s){ return linhas[s]; }).map(function(s){ return linhas[s]; });
  }
  function graficoBarras(ms, series, o){ // barras empilhadas por mês · o.goMes(m,i) clique na coluna · o.goSeg(m,i,serie) clique no segmento
    var W=640, H=220, pl=36, pr=10, pt=20, pb=26, n=ms.length; if (!n) return '';
    var tot=ms.map(function(m,i){ return series.reduce(function(s,x){ return s+(x.v[i]||0); },0); }), mx=Math.max(1,Math.max.apply(null,tot)), bw=(W-pl-pr)/n*0.68;
    var y=function(v){ return pt+(H-pt-pb)*(1-v/mx); }, s='<svg viewBox="0 0 '+W+' '+H+'" class="gm-svg" role="img" aria-label="'+esc(o.titulo)+'">';
    [0,mx/2,mx].forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(y(t)+3.5)+'" text-anchor="end" font-size="11" style="fill:var(--ink-3)">'+Math.round(t)+(o.pct?'%':'')+'</text>'; });
    ms.forEach(function(m,i){ var x=pl+(W-pl-pr)*(i+0.5)/n-bw/2, acc=0, tip='<b>'+compLabel(m)+'</b>', acM=o.goMes?o.goMes(m,i):null;
      series.forEach(function(se){ var v=se.v[i]||0; if (v) tip+='<br>'+esc(se.nome)+': '+v+' ('+numBR(tot[i]?v/tot[i]*100:0,1)+'%)'; });
      tip+='<br>Total: '+tot[i];
      s+=hitRect(x-bw*0.2,pt,bw*1.4,H-pt-pb,tip,acM); // coluna inteira (atrás dos segmentos)
      series.forEach(function(se){ var v=se.v[i]||0; if (!v) return; var pc=tot[i]?v/tot[i]*100:0, hgt=y(acc)-y(acc+v);
        s+='<rect class="seg-b" x="'+x.toFixed(1)+'" y="'+y(acc+v).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,hgt-1).toFixed(1)+'" style="fill:'+se.cor+'" data-tip="'+esc('<b>'+compLabel(m)+' · '+esc(se.nome)+'</b><br>'+v+' de '+tot[i]+' ('+numBR(pc,1)+'%)')+'"'+goAttr(o.goSeg?o.goSeg(m,i,se):acM)+'/>';
        if (hgt>=13 && bw>=26) s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y(acc+v)+hgt/2+3.5).toFixed(1)+'" text-anchor="middle" font-size="11" font-weight="700" style="fill:#fff" pointer-events="none">'+Math.round(pc)+'%</text>';
        acc+=v; });
      s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y(tot[i])-4).toFixed(1)+'" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--ink-2)" pointer-events="none">'+tot[i]+'</text>';
      s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)" pointer-events="none">'+MES_AB[+m.slice(5)-1]+'</text>'; });
    return s+'</svg><div class="leg">'+series.map(function(se){ return '<span><i style="background:'+se.cor+'"></i>'+esc(se.nome)+'</span>'; }).join('')+'</div>';
  }
  function renderComparativo(){
    var C=compDados(), h='';
    $('secTendencia').hidden=true;
    $('kpis').innerHTML=C.length?C.filter(function(x){ return x.sv!=='RI-bal'&&x.sv!=='RI-cen'; }).map(function(x){ var e=est(x.du); return kpi(esc(x.sv==='RI-intim'?'RI · Intimações':x.sv==='RI'?'RI · Protocolos':x.sv),String(x.fin),'finalizados · mediana '+(e.n?f1(e.mediana)+' d.u.':'—')+(x.comP?' · '+pct(x.ok/x.comP*100)+' no prazo'+(x.comP<x.fin?' (de '+x.comP+' com prazo)':''):'')); }).join(''):'<div class="panel empty" style="grid-column:1/-1"><b>Sem dados ainda</b>Abra <b>Importar dados</b> no menu.</div>';
    // barras mês a mês por serventia
    var ms={}; Object.keys(state.docs).concat(Object.keys(state.serv)).forEach(function(m){ ms[m]=1; }); ms=Object.keys(ms).sort().slice(-12);
    var ser=['RI','RI-intim','RC','RTD/PJ'].map(function(s){ return {nome:s==='RI-intim'?'RI · Intimações':s==='RI'?'RI · Protocolos':s, cor:SV_COR[s], v:ms.map(function(m){ var n=0; if (s==='RI'&&state.docs[m]) n+=state.docs[m].atos.filter(function(a){ return a.cat==='R'||a.cat==='N'; }).length; (state.serv[m]||[]).forEach(function(d){ var c=clsDe(d.t,d.nat); if (c==='cert') return; if (s==='RI-intim'?c==='intim':(svDe(d.t)===s&&c!=='intim')) n++; }); return n; })}; }).filter(function(x){ return x.v.some(Boolean); });
    var cer=['RI','RC','RTD/PJ'].map(function(s){ return {nome:s, cor:SV_COR[s], v:ms.map(function(m){ var n=0; if (s==='RI'&&state.cert[m]) n+=state.cert[m].recs.length; (state.serv[m]||[]).forEach(function(d){ if (svDe(d.t)===s && clsDe(d.t,d.nat)==='cert') n++; }); return n; })}; }).filter(function(x){ return x.v.some(Boolean); });
    function tabPct(series){ var T=series.map(function(x){ return x.v.reduce(function(a,b){ return a+(b||0); },0); }), tt=T.reduce(function(a,b){ return a+b; },0);
      return '<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th class="tleft">Mês</th>'+series.map(function(x){ return '<th><span class="dot" style="background:'+x.cor+'"></span>'+esc(x.nome)+'</th>'; }).join('')+'<th>Total</th></tr></thead><tbody>'+
        ms.map(function(m,i){ var t=series.reduce(function(a,x){ return a+(x.v[i]||0); },0); return '<tr><td class="tleft">'+nomeMes(m)+'</td>'+series.map(function(x){ var v=x.v[i]||0; return '<td class="num" data-tip="'+esc(x.nome+': '+v+' de '+t)+'">'+(t?pct(v/t*100):'—')+' <span class="mut">'+v+'</span></td>'; }).join('')+'<td class="num"><b>'+t+'</b></td></tr>'; }).join('')+
        '<tr class="tot"><td class="tleft">Período</td>'+T.map(function(v){ return '<td class="num">'+(tt?pct(v/tt*100):'—')+' <span class="mut">'+v+'</span></td>'; }).join('')+'<td class="num">'+tt+'</td></tr></tbody></table></div>'; }
    h+='<div class="gm-card" style="grid-column:1/-1"><div class="gm-h"><span class="gm-t">Produção por serventia · documentos finalizados por mês (sem certidões) · % = participação no mês</span></div>'+graficoBarras(ms,ser,{titulo:'Produção por serventia',goMes:function(m){ return goMes(m,'geral'); },goSeg:function(m,i,se){ return {t:'sv',sv:/^RI/.test(se.nome)?'RI':se.nome,sub:se.nome==='RI · Intimações'?'intim':se.nome==='RI · Protocolos'?'reg':undefined,m:m}; }})+tabPct(ser)+'</div>';
    if (cer.length) h+='<div class="gm-card" style="grid-column:1/-1"><div class="gm-h"><span class="gm-t">Certidões emitidas por mês · % = participação no mês</span></div>'+graficoBarras(ms,cer,{titulo:'Certidões por serventia',goMes:function(m){ return goMes(m,'geral'); },goSeg:function(m,i,se){ return {t:'sv',sv:se.nome,sub:'cert',m:m}; }})+tabPct(cer)+'</div>';
    // Malote: só controle de quantos foram cadastrados no mês (não é produção de serventia)
    var mal={}; Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ if (d.t!=='Malote Digital') return; var mi=Motor.isoDeDia(d.ing).slice(0,7); mal[mi]=(mal[mi]||0)+1; }); });
    var malV=ms.map(function(m){ return mal[m]||0; });
    if (malV.some(Boolean)) h+='<div class="gm-card"><div class="gm-h"><span class="gm-t">Malotes cadastrados no mês</span><span class="gm-v">'+malV[malV.length-1]+'</span></div><div class="gm-s">controle · não entra na produção das serventias</div>'+graficoLinha(ms,malV,{titulo:'Malotes cadastrados',un:'',zero:true})+'</div>';
    h+='<div class="gm-card" style="grid-column:1/-1"><div class="gm-h"><span class="gm-t">Comparativo · '+(state.periodo==='todos'?'todo o período':nomeMes(state.periodo))+'</span></div><div class="tbl-wrap"><table class="tbl-fixa"><thead><tr><th class="tleft">Serventia</th><th>Finalizados</th><th>Média</th><th>Mediana</th><th>Moda</th><th>P90</th><th>No prazo</th><th>Inconformidades</th><th>Docs c/ inconformidade</th><th>Certidões</th><th>Certidões no prazo</th><th>Senhas</th><th>Espera média</th></tr></thead><tbody>'+
      C.map(function(x){ var e=est(x.du), es=est(x.esp); return '<tr'+(/^RI-/.test(x.sv)?' class="mut"':'')+'><td class="tleft"><span class="dot" style="background:'+SV_COR[x.sv]+'"></span>'+esc(SV_NOME[x.sv])+'</td><td class="num">'+x.fin+'</td><td class="num">'+(e.n?f1(e.media):'—')+'</td><td class="num"><b>'+(e.n?f1(e.mediana):'—')+'</b></td><td class="num">'+(e.moda!=null?e.moda+' <span class="mut">('+Math.round(e.modaPct)+'%)</span>':'—')+'</td><td class="num">'+(e.n?f1(e.p90):'—')+'</td><td class="num">'+(x.comP?pct(x.ok/x.comP*100)+(x.comP<x.fin?' <span class="mut">de '+x.comP+'</span>':''):'<span class="mut">sem prazo cadastrado</span>')+'</td><td class="num">'+x.inc+'</td><td class="num">'+(x.fin?pct(x.docsInc/x.fin*100):'—')+'</td><td class="num">'+(x.cert?x.cert+(x.sv==='RI'?' <span class="mut">('+x.certBal+' balcão · '+(x.cert-x.certBal)+' central)</span>':''):'—')+'</td><td class="num">'+(x.certCalc?pct(x.certOk/x.certCalc*100)+(x.certCalc<x.cert?' <span class="mut">de '+x.certCalc+'</span>':''):'—')+'</td><td class="num">'+(x.senhas||'—')+'</td><td class="num">'+(es.n?fmtMS(es.media):'—')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="hint">RI · balcão = protocolos feitos no balcão; RI · central = naturezas "ONR - …" (vieram pela central / e-protocolo). Certidões do RI: balcão = pedido cadastrado no VHL; central = só no Tri7 (SAEC). Tempos em dias úteis do ingresso à finalização. Média = soma ÷ quantidade (puxada pelos casos muito demorados); mediana = o caso do meio (metade termina antes); moda = o tempo mais comum, com o % de documentos que tiveram exatamente esse tempo; P90 = 90% terminam em até. RI: protocolos registrados e cancelados (prazo pela regra do KPI-02); "Abertura de matrícula + outros atos" e os atos sem histórico ficam fora; as intimações aparecem na linha de baixo. Demais: documentos finalizados no VHL, prazo pela tabela de cada natureza. Certidões contam à parte; no RI, as do fluxo de intimação (regra automática da aba Certidões) ficam fora do % — o "de N" mostra a base. Malote e Arquivo não entram na produção (Malote aparece só como contagem de cadastros). Senhas pela fila (Registro de Imóveis, Nascimento/Casamento/Óbito, Títulos e Documentos/PJ).</p></div>';
    $('graficos').innerHTML=h;
  }
  function renderAtr(){
    var modo=svModo();
    if (modo==='todas') return renderComparativo();
    var D=selDocs();
    $('secTendencia').hidden=true;
    $('kpis').innerHTML=D.length?servTiles(D):'<div class="panel empty" style="grid-column:1/-1"><b>Sem documentos de '+esc(selNome())+' no período</b>Escolha outro mês ou importe o Prazo e Tempo Médio em <b>Importar dados</b>.</div>';
    $('graficos').innerHTML=servGraficosHTML();
    $('tabNat').innerHTML=state.pgVis.nat?visNat():servNatHTML(D); $('tabEta').innerHTML=servEtapaHTML(D); $('tabFp').innerHTML=servFpHTML(D);
  }

  // ficha de documento das outras atribuições
  function servFicha(c){
    var achados=[]; Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ if (String(d.c).toUpperCase()===c.toUpperCase()) achados.push(d); }); });
    if (!achados.length) return '';
    var F=function(n){ return fmtData(Motor.isoDeDia(n)); };
    return achados.map(function(d){ var ok=servOk(d), pz=servPrazo(d);
      var h='<div class="prot-grid">'+[['Serventia',esc(d.t)],['Natureza',esc(d.nat)],['Ingresso',F(d.ing)],['Finalização',F(d.fin)],['Tempo até finalizar','<b>'+servDu(d)+' dias úteis</b> (o dia do ingresso não conta; sábados, domingos e feriados fora)'+(pz!=null?' · prazo '+pz+' d.u. '+(ok?'<span class="pill good">no prazo</span>':'<span class="pill crit">acima</span>'):' · <span class="mut">prazo legal não definido para esta natureza</span>')],['Tempo de atuação',d.tempo?fmtMS(d.tempo)+' (cronômetro do VHL)':'— (sem cronômetro)']].map(function(x){ return '<div class="pk">'+x[0]+'</div><div class="pv">'+x[1]+'</div>'; }).join('')+'</div>';
      if (d.ets.length) h+='<div class="sub-h" style="margin-top:12px">Linha do tempo · Produção por Etapa (VHL)</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Data</th><th>Etapa</th><th>Responsável</th><th>Prazo na etapa</th></tr></thead><tbody>'+d.ets.map(function(x){ return '<tr><td>'+F(x.d)+'</td><td>'+esc(x.et)+'</td><td>'+esc(x.rp||'—')+'</td><td>'+x.pz+' d.u.</td></tr>'; }).join('')+'</tbody></table></div>';
      return h; }).join('<hr style="border:0;border-top:1px solid var(--line);margin:14px 0">');
  }
  function kpiDoCatalogo(o){ // KPI novo, criado na tela
    var K={id:o.id, nome:o.nome||o.id, meta:o.meta||'', custom:true, freq:o.freq||'', dica:o.dica||''};
    if (o.tipo==='contagem'){ K.cont=o.dica||'registro manual'; }
    else if (o.tipo==='nota'){ K.den=100; K.um=o.lab0||'Nota (0–100)'; K.taxa=true; }
    else if (o.tipo==='minutos'){ K.den=100; K.um=o.lab0||'Minutos'; K.minutos=true; }
    else { K.lab=[o.lab0||'Numerador',o.lab1||'Denominador']; K.taxa=true; }
    K.tipo=o.tipo||'taxa'; return K;
  }
  function catAplicar(cat){
    if (!KPIS_PADRAO) KPIS_PADRAO=KPIS.map(function(K){ return Object.assign({},K); });
    cat=cat||{}; var it=cat.itens||{}, lista=KPIS_PADRAO.map(function(K){ return Object.assign({},K); }).concat((cat.novos||[]).map(kpiDoCatalogo));
    lista.forEach(function(K){ var o=it[K.id]; if (!o) return;
      if (o.nome) K.nome=o.nome; if (o.meta!=null) K.meta=o.meta; if (o.freq!=null) K.freq=o.freq||undefined; if (o.dica!=null) K.dica=o.dica;
      if (o.oculto!=null) K.fora=!!o.oculto;
      if (o.lab0&&K.lab) K.lab=[o.lab0,K.lab[1]]; if (o.lab1&&K.lab) K.lab=[K.lab[0],o.lab1];
      if (o.sentido==='baseline'){ K.baseline=true; } else if (o.sentido&&o.metaV!=null&&!K.cont){ K.baseline=false; K.metaV=+o.metaV; K.bom=o.sentido==='menor'?menor(+o.metaV):maior(+o.metaV); K.sentido=o.sentido; } });
    lista.forEach(function(K){ if (K.custom){ var o=it[K.id]||{}; if (!K.cont && !K.bom){ var v=o.metaV, sd=o.sentido||'maior'; if (sd==='baseline'||v==null||v==='') K.baseline=true; else { K.metaV=+v; K.sentido=sd; K.bom=sd==='menor'?menor(+v):maior(+v); } } } });
    var ordem=cat.ordem||[]; lista.sort(function(a,b){ var ia=ordem.indexOf(a.id), ib=ordem.indexOf(b.id); return (ia<0?999:ia)-(ib<0?999:ib); });
    KPIS.length=0; lista.forEach(function(K){ KPIS.push(K); });
  }
  function metaDe(id, def){ var K=kpiDef(id); return K&&K.metaV!=null?K.metaV:def; }
  function catSalvar(){ catAplicar(state.kpiCat); if (dbPronto&&podeEscrever) db.doc('config/kpis').set(state.kpiCat).then(function(){ toast('Indicadores salvos'); }).catch(function(){ toast('Não consegui salvar os indicadores'); }); }
  function renderKpiEditor(){
    var cat=state.kpiCat=state.kpiCat||{itens:{},novos:[],ordem:[]}; cat.itens=cat.itens||{}; cat.novos=cat.novos||[];
    function sentidoDe(K){ var o=cat.itens[K.id]||{}; return o.sentido||(K.baseline?'baseline':K.sentido||(K.bom&&K.bom(0)&&!K.bom(1e9)?'menor':'maior')); }
    function metaVDe(K){ var o=cat.itens[K.id]||{}; if (o.metaV!=null) return o.metaV; if (K.metaV!=null) return K.metaV; var m=String(K.meta||'').replace(',','.').match(/[\d.]+/); return m?m[0]:''; }
    var h='<div class="sec-h"><h2>Editar indicadores</h2><span class="note">Mude nome, meta, sentido, frequência e quais aparecem. KPIs calculados pelo painel mantêm a fórmula; os novos são de lançamento manual.</span></div>'+
      '<div class="ctl" style="margin:8px 0"><button class="btn primary sm" type="button" id="kpiEdSalvar">Salvar</button><button class="btn sm" type="button" id="kpiEdNovo">+ Novo indicador</button><button class="btn sm" type="button" id="kpiEdFechar">Fechar</button><span class="spacer"></span><button class="btn sm" type="button" id="kpiEdPadrao">Restaurar padrão</button></div>'+
      '<div class="tbl-wrap"><table class="tleft kpied"><thead><tr><th></th><th>KPI</th><th>Nome</th><th>Meta (texto)</th><th>Valor</th><th>Sentido</th><th>Tipo</th><th>Rótulos (numerador / denominador)</th><th>Frequência</th><th>Mostrar</th><th></th></tr></thead><tbody>'+
      KPIS.map(function(K,i){ var o=cat.itens[K.id]||{}, sd=sentidoDe(K), auto=!!K.auto, fixo=K.cont&&!K.custom;
        var tipo=K.custom?K.tipo:(K.cont?'contagem':K.minutos?'minutos':K.den===100?'nota':'taxa');
        return '<tr data-kped="'+esc(K.id)+'"><td class="nowrap"><button type="button" class="btn sm" data-kpmov="-1" aria-label="Subir"'+(i?'':' disabled')+'>↑</button><button type="button" class="btn sm" data-kpmov="1" aria-label="Descer"'+(i<KPIS.length-1?'':' disabled')+'>↓</button></td>'+
          '<td><b>'+esc(K.id)+'</b>'+(auto?'<div class="mut" style="font-size:12px">calculado</div>':K.custom?'<div class="mut" style="font-size:12px">novo</div>':'')+'</td>'+
          '<td><input type="text" class="mini" data-kpf="nome" value="'+esc(K.nome)+'" style="min-width:220px"></td>'+
          '<td><input type="text" class="mini" data-kpf="meta" value="'+esc(K.meta)+'" style="width:9em"></td>'+
          '<td><input type="text" inputmode="decimal" class="mini" data-kpf="metaV" value="'+esc(fixo?'0':metaVDe(K))+'" style="width:5em"'+(fixo||sd==='baseline'?' disabled':'')+'></td>'+
          '<td>'+(fixo||tipo==='contagem'?'<span class="mut">zero ocorrências</span>':'<select class="mini" data-kpf="sentido"><option value="maior"'+(sd==='maior'?' selected':'')+'>≥ maior ou igual</option><option value="menor"'+(sd==='menor'?' selected':'')+'>≤ menor ou igual</option><option value="baseline"'+(sd==='baseline'?' selected':'')+'>sem meta (baseline)</option></select>')+'</td>'+
          '<td>'+(K.custom?'<select class="mini" data-kpf="tipo"><option value="taxa"'+(tipo==='taxa'?' selected':'')+'>% (numerador ÷ denominador)</option><option value="nota"'+(tipo==='nota'?' selected':'')+'>nota 0–100</option><option value="minutos"'+(tipo==='minutos'?' selected':'')+'>minutos</option><option value="contagem"'+(tipo==='contagem'?' selected':'')+'>contagem (meta zero)</option></select>':'<span class="mut">'+({taxa:'%',nota:'nota 0–100',minutos:'minutos',contagem:'contagem'}[tipo])+'</span>')+'</td>'+
          '<td>'+(K.lab||(K.custom&&tipo!=='contagem')?'<input type="text" class="mini" data-kpf="lab0" value="'+esc((K.lab||[K.um||''])[0]||'')+'" style="width:11em"'+(auto?' disabled':'')+'>'+(K.lab||tipo==='taxa'?' / <input type="text" class="mini" data-kpf="lab1" value="'+esc((K.lab||['',''])[1]||'')+'" style="width:9em"'+(auto?' disabled':'')+'>':''):'<span class="mut">—</span>')+'</td>'+
          '<td><input type="text" class="mini" data-kpf="freq" value="'+esc(K.freq||'Mensal')+'" style="width:7em"></td>'+
          '<td><input type="checkbox" data-kpf="mostrar"'+(K.fora?'':' checked')+' aria-label="Mostrar '+esc(K.id)+'"></td>'+
          '<td>'+(K.custom?'<button type="button" class="btn sm" data-kprm="1">Remover</button>':'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="hint">Valor = número da meta usado para dizer "Atende / Não atende" e para a linha de meta nos gráficos. O texto da meta é o que vai copiado para o ANOREG+. Um KPI oculto some da lista de lançamento (dá para ver marcando "mostrar ocultos").</p>';
    return h;
  }
  function kpiEdLer(){ // lê a tabela para o catálogo
    var cat=state.kpiCat;
    document.querySelectorAll('#tabLanc tr[data-kped]').forEach(function(tr){ var id=tr.dataset.kped, K=kpiDef(id); if (!K) return;
      function v(f){ var e=tr.querySelector('[data-kpf="'+f+'"]'); return e?(e.type==='checkbox'?e.checked:e.value.trim()):null; }
      var o={nome:v('nome'), meta:v('meta'), freq:v('freq'), oculto:!v('mostrar')}, mv=v('metaV'), sd=v('sentido');
      if (sd) o.sentido=sd; if (mv!=null && mv!=='' && !isNaN(numIn(mv))) o.metaV=numIn(mv);
      if (v('lab0')!=null) o.lab0=v('lab0'); if (v('lab1')!=null) o.lab1=v('lab1');
      if (K.custom){ var n=cat.novos.filter(function(x){ return x.id===id; })[0]; if (n){ n.nome=o.nome; n.meta=o.meta; n.freq=o.freq; if (v('tipo')) n.tipo=v('tipo'); if (o.lab0!=null) n.lab0=o.lab0; if (o.lab1!=null) n.lab1=o.lab1; } }
      cat.itens[id]=o; });
    cat.ordem=Array.prototype.map.call(document.querySelectorAll('#tabLanc tr[data-kped]'),function(tr){ return tr.dataset.kped; });
  }

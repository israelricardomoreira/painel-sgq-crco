/* Painel SGQ · CRCO — js/inconformidades.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/inconformidades.js']='0.20.0';
  var INC_PASSO=50;
  function incRecs(){ var out=[]; Object.keys(state.inconf).sort().forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) out=out.concat(state.inconf[m]); }); return out; }
  function incTodos(){ var out=[]; Object.keys(state.inconf).forEach(function(m){ out=out.concat(state.inconf[m]); }); return out; }
  function ovDe(r){ var o=state.incCat[r.id]; return typeof o==='string'?{cat:o}:(o||{}); }
  function catDe(r){ return ovDe(r).cat || Motor.nomearErro(r.o, r.j); }
  function grupoDe(r){ return ovDe(r).g || r.g; }
  function kpi1Mes(atos, todos){
    var nc={}, ext={}; todos.forEach(function(r){ if (r.t==='RI'){ nc[r.c]=1; if (grupoDe(r)==='E') ext[r.c]=1; } });
    var R=atos.filter(function(a){return a.cat==='R';});
    var c=R.filter(function(a){return nc[a.c];}).length, e=R.filter(function(a){return ext[a.c];}).length;
    return {n:R.length, c:c, e:e, k:R.length?c/R.length*100:null, ke:R.length?e/R.length*100:null};
  }
  function producaoPeriodo(det){ var p={}, e={}; Object.keys(state.docs).forEach(function(m){ if (state.periodo!=='todos'&&state.periodo!==m) return; var pr=(state.docs[m].raw||{}).producao||{}; Object.keys(pr).forEach(function(k){ var v=pr[k], n=typeof v==='number'?v:v.d; p[k]=(p[k]||0)+n; if (v&&v.e){ var E=e[k]=e[k]||{}; Object.keys(v.e).forEach(function(x){ E[x]=(E[x]||0)+v.e[x]; }); } }); }); return det?{docs:p,etapas:e}:p; }
  function renderK1(atos){
    var todos=incTodos();
    if (!todos.length){ $('tabK1').innerHTML='<div class="empty"><b>Nenhuma inconformidade importada</b>Solte o PAINEL-04 Consulta de inconformidades do VHL em Importar dados.</div>'; return; }
    if (state.pgVis.k1){ $('tabK1').innerHTML=visK1(atos); return; }
    var k=kpi1Mes(atos, todos), A=atrAtual();
    var recs=incRecs().filter(function(r){ return A!=='RI'?incOk(r):(state.incSetor==='todos' || r.t==='RI'); });
    var ext=recs.filter(function(r){return grupoDe(r)==='E';}).length;
    if (A!=='RI' && svModo()==='todas'){ var porSv={}; recs.forEach(function(r){ var sv=svDe(r.t)||r.t; porSv[sv]=(porSv[sv]||0)+1; });
      var h='<div class="sec-h"><h2>Inconformidades · todas as serventias</h2><span class="note">Escolha uma serventia no topo para ver o % de documentos com inconformidade dela.</span></div><div class="kpis" style="margin-bottom:14px">'+kpi('Inconformidades registradas',String(recs.length),(recs.length-ext)+' internas · '+ext+' externas','hero')+Object.keys(porSv).sort(function(a,b){ return porSv[b]-porSv[a]; }).map(function(k){ return kpi(esc(k),String(porSv[k]),pct(porSv[k]/recs.length*100)+' do total'); }).join('')+'</div>'; }
    else if (A!=='RI'){ var DS=selDocs(), IC={}; todos.filter(incOk).forEach(function(r){ IC[String(r.c).toUpperCase()]=1; });
      var com=DS.filter(function(d){ return IC[String(d.c).toUpperCase()]; }).length, h='<div class="sec-h"><h2>Inconformidades · '+esc(selNome())+'</h2><span class="note">% dos documentos finalizados no período com ao menos 1 inconformidade, ligada pelo código.</span></div>'+
        '<div class="kpis" style="margin-bottom:14px">'+kpi('Documentos com inconformidade',DS.length?pct(com/DS.length*100):'—',com+' de '+DS.length+' finalizados','hero')+kpi('Inconformidades registradas',String(recs.length),(recs.length-ext)+' internas · '+ext+' externas')+'</div>';
      var msA=Object.keys(state.serv).sort(); if (msA.length) h+='<div class="sub-h">Mês a mês</div><div class="tbl-wrap"><table style="max-width:620px"><thead><tr><th>Mês</th><th>Finalizados</th><th>Com inconformidade</th><th>%</th><th>Registros no mês</th></tr></thead><tbody>'+
        msA.map(function(m){ var dm=selDocsMes(m), c=dm.filter(function(d){ return IC[String(d.c).toUpperCase()]; }).length, rg=(state.inconf[m]||[]).filter(incOk).length; return '<tr><td>'+nomeMes(m)+'</td><td>'+dm.length+'</td><td>'+c+'</td><td><b>'+(dm.length?pct(c/dm.length*100):'—')+'</b></td><td class="mut">'+rg+'</td></tr>'; }).join('')+'</tbody></table></div>'; }
    else { var h='<div class="sec-h"><span class="note">KPI-01 = % dos atos RI registrados no período que tiveram ao menos 1 inconformidade, ligada ao ato pelo código (independe da data do registro da inconformidade).</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+
      kpi('KPI-01 · atos com inconformidade',pct(k.k),k.c+' de '+k.n+' registrados','hero')+
      kpi('KPI-01 complementar · erro externo',pct(k.ke),k.e+' atos · erro que saiu do cartório')+
      kpi('Inconformidades registradas',String(recs.length),(recs.length-ext)+' internas · '+ext+' externas')+'</div>';
    // tabela mensal (RI)
    var meses=Object.keys(state.docs).sort();
    if (meses.length){
      h+='<div class="sub-h">Mês a mês</div><div class="tbl-wrap"><table style="max-width:760px"><thead><tr><th>Mês</th><th>Registrados</th><th>Com inconformidade</th><th>KPI-01</th><th>Erro externo</th></tr></thead><tbody>'+
      meses.map(function(m){ var d=state.docs[m], q=kpi1Mes(d.atos,todos);
        return '<tr><td>'+nomeMes(m)+'</td><td>'+q.n+'</td><td>'+q.c+'</td><td><b>'+pct(q.k)+'</b></td><td>'+pct(q.ke)+'</td></tr>'; }).join('')+'</tbody></table></div>';
    } }
    // filtros
    h+='<div class="search" style="margin-top:16px">'+''+
      '<span class="spacer"></span>'+(state.incFiltroPessoa?'<button class="btn primary sm" type="button" data-verrel="1">Ver relatório de '+esc(state.incFiltroPessoa.split(' ')[0])+'</button>':'<button class="btn sm" type="button" data-verrel="1">Relatórios</button>')+(state.incFiltroCat||state.incFiltroPessoa?'<span class="chip ok">'+esc(state.incFiltroCat||state.incFiltroPessoa)+'</span><button class="btn sm" type="button" data-inclimpar="1">Limpar filtro</button>':'')+'</div>';
    // pareto
    var pc={}; recs.forEach(function(r){ var c=catDe(r); pc[c]=(pc[c]||0)+1; });
    var cats=Object.keys(pc).sort(function(a,b){return pc[b]-pc[a];}), mx=cats.length?pc[cats[0]]:1, acum=0;
    h+='<div class="two" style="margin-top:10px"><div><div class="sub-h">Erros mais frequentes (o que deu errado)</div>'+
      cats.map(function(c){ acum+=pc[c]; return '<div class="etapa-row click" data-inccat="'+esc(c)+'" style="cursor:pointer'+(state.incFiltroCat===c?';background:var(--brand-soft)':'')+'" data-tip="'+esc('<b>'+c+'</b><br>'+pc[c]+' registros ('+pct(pc[c]/recs.length*100)+')<br>Acumulado: '+pct(acum/recs.length*100))+'"><div class="nm">'+esc(c)+'</div><div class="track"><div class="fill" style="width:'+(pc[c]/mx*100).toFixed(1)+'%"></div></div><div class="vv">'+pc[c]+' <span class="mut">'+pct(pc[c]/recs.length*100)+'</span></div></div>'; }).join('')+'</div>';
    // por pessoa
    var prod=producaoPeriodo(), pp={}, comProd=recs.filter(function(r){ return !!state.docs[r.d.slice(0,7)]; });
    comProd.forEach(function(r){ var x=pp[r.r]=pp[r.r]||{n:0,e:0,cats:{}}; x.n++; if (grupoDe(r)==='E') x.e++; var c=catDe(r); x.cats[c]=(x.cats[c]||0)+1; });
    var pessoas=Object.keys(pp).map(function(p){ var pr=prod[p]||0, top=Object.keys(pp[p].cats).sort(function(a,b){return pp[p].cats[b]-pp[p].cats[a];})[0];
      return {p:p,n:pp[p].n,e:pp[p].e,prod:pr,taxa:pr>=MIN_PROD?pp[p].n/pr*100:null,top:top}; })
      .sort(function(a,b){ return (b.taxa==null?-1:b.taxa)-(a.taxa==null?-1:a.taxa) || b.n-a.n; });
    var tN=0, tD=0; pessoas.forEach(function(x){ if (x.taxa!=null){ tN+=x.n; tD+=x.prod; } }); var tEq=tD?tN/tD:null;
    var itensF=pessoas.filter(function(x){return x.taxa!=null;}).map(function(x){ return {k:x.n,n:x.prod,ref:x}; }); funilTaxa(itensF); itensF.forEach(function(it){ it.ref.lt=it.lt; });
    h+='<div><div class="sub-h">Por pessoa · inconformidades ÷ documentos trabalhados no VHL</div><div class="scroll"><table class="tleft"><thead><tr><th>Pessoa</th><th>Documentos</th><th>Inconf.</th><th>Taxa</th><th title="Faixa de inconformidades que seria normal para esse volume de documentos, pela taxa da equipe (90% de probabilidade)">Esperado pelo volume</th><th>Leitura</th><th>Externas</th><th>Erro mais frequente</th></tr></thead><tbody>'+
      pessoas.map(function(x){ return '<tr class="click'+(state.incFiltroPessoa===x.p?' sel':'')+'" tabindex="0" data-incpessoa="'+esc(x.p)+'"><td class="tl">'+esc(x.p)+'</td><td>'+(x.prod||'—')+'</td><td>'+x.n+'</td><td>'+(x.taxa==null?'<span class="mut" title="Pouca produção registrada no VHL para calcular taxa">—</span>':'<b>'+pct(x.taxa)+'</b>')+'</td><td>'+(x.lt?'≈ '+Math.round(x.lt.esp)+' <span class="mut">(normal até '+x.lt.hi+')</span>':'—')+'</td><td>'+(x.lt?'<span class="pill '+(x.lt.sig==='acima'?'crit':x.lt.sig==='abaixo'?'good':'mute')+'">'+x.lt.txt+'</span>':'')+'</td><td>'+(x.e||'')+'</td><td class="tl">'+esc(x.top||'')+'</td></tr>'; }).join('')+
      '</tbody></table></div><p class="hint">Considera só meses com produção carregada ('+comProd.length+' de '+recs.length+' registros). Taxa só aparece com '+MIN_PROD+'+ documentos no período; quem trabalha fora do fluxo do VHL (recepção, caixa) fica sem taxa. <b>Esperado pelo volume</b> = faixa normal de inconformidades para a quantidade de documentos da pessoa, já contando a variação natural entre funções diferentes. <b>Leitura</b> só sai de "dentro do esperado" quando a pessoa foge dessa faixa com 95% de confiança.</p></div></div>';
    // lista
    var lista=recs.filter(function(r){ return (!state.incFiltroCat||catDe(r)===state.incFiltroCat) && (!state.incFiltroPessoa||r.r===state.incFiltroPessoa); })
      .sort(function(a,b){ return a.d<b.d?1:-1; });
    var opts=Motor.CATS_ERRO;
    // 0.14.0: a lista mostra 50 por vez; volta para 50 quando muda o mês, a serventia ou o filtro
    var sig=[state.periodo,atrAtual(),svModo(),state.incFiltroCat||'',state.incFiltroPessoa||''].join('|');
    if (state.incLimSig!==sig){ state.incLimSig=sig; state.incLim=INC_PASSO; }
    var lim=Math.min(state.incLim||INC_PASSO, lista.length);
    h+='<div class="sub-h" style="margin-top:16px">Registros ('+lista.length+')</div><div class="scroll" style="max-height:480px"><table class="tleft"><thead><tr><th>Data</th><th>Documento</th><th>Pessoa</th><th title="Quem prenotou no Tri7 — só consulta, não aponta responsável">Deu entrada (Tri7)</th><th>Tipo</th><th>Erro (nome)</th><th>Observação</th></tr></thead><tbody>'+
      lista.slice(0,lim).map(function(r){ var c=catDe(r), man=!!ovDe(r).cat;
        return '<tr data-incid="'+esc(r.id)+'"><td>'+fmtData(r.d)+'</td><td>'+protLink(r.c)+' <span class="mut">'+esc(r.t)+'</span></td><td class="tl">'+esc(r.r)+'</td><td class="tl mut">'+(function(){ var L=r.t==='RI'?andIndice()[String(r.c)]:null, e=L&&L.filter(function(x){return x.s==='PN'||x.s==='PA';})[0]; return e?esc(nomeLogin(e.u)):'—'; })()+'</td><td><select class="mini" data-incgsel="1" aria-label="Interno ou externo"'+(ovDe(r).g?' style="border-color:var(--brand)"':'')+'><option value="I"'+(grupoDe(r)==='I'?' selected':'')+'>Interno</option><option value="E"'+(grupoDe(r)==='E'?' selected':'')+'>Externo</option></select></td>'+
        '<td><select class="mini" data-inccatsel="1" aria-label="Erro"'+(man?' style="border-color:var(--brand)"':'')+'>'+opts.map(function(o){ return '<option'+(o===c?' selected':'')+'>'+esc(o)+'</option>'; }).join('')+'</select></td>'+
        '<td class="tl" style="min-width:280px">'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table></div>'+(lista.length>lim?'<div class="inc-mais"><span class="hint">Mostrando '+lim+' de '+lista.length+'.</span> <button class="btn sm" type="button" data-incmais="1">Mostrar mais '+Math.min(INC_PASSO,lista.length-lim)+'</button>'+(lista.length-lim>INC_PASSO?' <button class="btn sm" type="button" data-incmais="todos">Mostrar todos</button>':'')+'</div>':(lista.length>INC_PASSO?'<p class="hint">Mostrando todos os '+lista.length+'.</p>':''));
    $('tabK1').innerHTML=h;
  }

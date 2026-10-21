/* Painel SGQ · CRCO — js/certidoes.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/certidoes.js']='0.21.1';
  function certTipoMap(){ var m={}; Object.keys(state.docs).forEach(function(k){ var r=state.docs[k].raw||{}, ct=r.certTipos, cn=r.certNats||[]; if (ct) ct.split(';').forEach(function(x){ if(!x) return; var q=x.split(':'); m[q[0]]=cn[+q[1]]; }); }); return m; }
  function intimAuto(){ var tot={}, it={}; Object.keys(state.docs).forEach(function(k){ var pr=(state.docs[k].raw||{}).producao||{}; Object.keys(pr).forEach(function(p){ var v=pr[p]; if (!v||!v.e) return; Object.keys(v.e).forEach(function(et){ tot[p]=(tot[p]||0)+v.e[et]; if (INTIM_RX.test(semAc(et))) it[p]=(it[p]||0)+v.e[et]; }); }); });
    return Object.keys(tot).filter(function(p){ return tot[p]>=50 && (it[p]||0)/tot[p]>0.5 && !/^tri7$/i.test(p); }); } // 0.10.5: certidão do fluxo de intimação = natureza "Certidão de Intimação" no Tri7 (vale certidão por certidão)
  function intimLista(){ return intimAuto(); } // só para certidões importadas antes da 0.10.5 (sem natureza salva) // 1.10.4: só a regra automática (a lista não é mais editada à mão)
  function certRecs(){ var out=[]; Object.keys(state.cert).sort().forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) out=out.concat(state.cert[m].recs); }); return out; }
  function certCalc(recs){
    var fer=Motor.feriadoSet(state.extras), h0=state.cfg.expIni, h1=state.cfg.expFim, tm=certTipoMap(), intim={};
    intimLista().forEach(function(p){ intim[chavePessoa(p)]=1; });
    return recs.map(function(r){ var tipo=tm[r.p]||'', hu=Motor.horasUteis(r.i,r.f,fer,h0,h1), lim=Motor.limiteCert(tipo,h0,h1);
      return {p:r.p,i:r.i,f:r.f,u:r.u,mes:r.mes,tipo:tipo||'Central/online (sem tipo)',origem:Motor.certBalcao(tipo)?'Balcão':'Central/online',hu:hu,lim:lim,ok:hu<=lim,intim:r.nat?INTIM_NAT.test(semAc(r.nat)):!!intim[chavePessoa(r.u)], semNat:!r.nat}; });
  }
  function fmtMin(n){ var d=new Date(n*60000).toISOString(); return d.slice(8,10)+'/'+d.slice(5,7)+' '+d.slice(11,16); }
  function fmtLim(l){ var d=state.cfg.expFim-state.cfg.expIni; if (l===d) return '1 dia útil'; if (l===5*d) return '5 dias úteis'; return fmtH(l)+' úteis'; }
  function fmtH(h){ if (h==null) return '—'; if (h<1) return Math.round(h*60)+' min'; return f1(h)+' h'; }
  // certidões automáticas (selo gerado pelo usuário TRI7) × feitas por escreventes (quem gerou o selo)
  // de onde vêm os pedidos de certidão: balcão × central (escrevente) × central automática (selo do usuário TRI7)
  function certAutoPeriodo(){ var auto=[], tem=false; Object.keys(state.cert).sort().forEach(function(m){ if (state.periodo!=='todos'&&state.periodo!==m) return; var r=state.cert[m].raw||{}; if (r.auto){ tem=true; auto=auto.concat(r.auto); } }); return {L:auto, tem:tem}; }
  function certOrigemRosca(all){
    var B=all.filter(function(x){ return x.origem==='Balcão'; }), O=all.filter(function(x){ return x.origem!=='Balcão'; }), A=certAutoPeriodo(), tot=B.length+O.length+A.L.length;
    var partes=[{nome:'Balcão',v:B.length,cor:'var(--c1)',go:goLista('Certidões pedidas no balcão','cert',B)},{nome:'Central · escrevente',v:O.length,cor:'var(--c2)',go:goLista('Certidões da central feitas por escrevente','cert',O)}];
    if (A.tem) partes.push({nome:'Central · automática',v:A.L.length,cor:'var(--c4)',go:goLista('Certidões da central emitidas automaticamente (Tri7)','cods',A.L)});
    return gRosca(partes,{titulo:'Origem das certidões',centro:pct(tot?(O.length+A.L.length)/tot*100:null),sub:'pela central'})+(A.tem?'':'<p class="hint" style="margin:6px 0 0">Sem a contagem das automáticas: reimporte o Relatório de andamentos do Tri7. A central aparece só com as feitas por escrevente.</p>');
  }
  function certOrigemMensal(){
    var ms=Object.keys(state.cert).sort().slice(-12); if (ms.length<2) return '';
    var temA=ms.some(function(m){ return certAutoMes(m)!=null; }), C=ms.map(function(m){ return certCalc(state.cert[m].recs); });
    var ser=[{nome:'Balcão',cor:'var(--c1)',v:C.map(function(L){ return L.filter(function(x){ return x.origem==='Balcão'; }).length; })},{nome:'Central · escrevente',cor:'var(--c2)',v:C.map(function(L){ return L.filter(function(x){ return x.origem!=='Balcão'; }).length; })}];
    if (temA) ser.push({nome:'Central · automática',cor:'var(--c4)',v:ms.map(function(m){ return certAutoMes(m)||0; })});
    return graficoBarras(ms,ser,{titulo:'Certidões por origem e mês',goMes:function(m){ return goMes(m,'cer'); },goSeg:function(m,i,se){ var L=C[i]; return se.nome==='Balcão'?goLista('Balcão · '+nomeMes(m),'cert',L.filter(function(x){ return x.origem==='Balcão'; })):se.nome==='Central · escrevente'?goLista('Central · escrevente · '+nomeMes(m),'cert',L.filter(function(x){ return x.origem!=='Balcão'; })):goLista('Central · automática · '+nomeMes(m),'cods',(state.cert[m].raw||{}).auto||[]); }});
  }
  function certAutoMes(m){ var r=state.cert[m]&&state.cert[m].raw; return r&&r.auto?r.auto.length:null; }
  function certAutoresHTML(all){
    var ms=Object.keys(state.cert).sort().filter(function(m){ return state.periodo==='todos'||state.periodo===m; });
    var semInfo=ms.filter(function(m){ return certAutoMes(m)==null; }), auto=0; ms.forEach(function(m){ auto+=certAutoMes(m)||0; });
    var hum=all.filter(function(x){ return x.u && !/^tri7$/i.test(x.u); }), tot=hum.length+auto;
    var P={}; hum.forEach(function(x){ var k=semAc(x.u), o=P[k]=P[k]||{nome:x.u,n:0,ok:0,nc:0,hs:[],bal:0,cen:0}; o.n++; if (!x.intim){ o.nc++; if (x.ok) o.ok++; o.hs.push(x.hu); } if (x.origem==='Balcão') o.bal++; else o.cen++; });
    var L=Object.keys(P).map(function(k){ return P[k]; }).sort(function(a,b){ return b.n-a.n; }), mx=L.length?L[0].n:1;
    var h='<div class="sub-h">Quem faz as certidões</div><div class="kpis" style="margin-bottom:12px">'+
      kpi('Automáticas (Tri7)',semInfo.length===ms.length?'—':auto.toLocaleString('pt-BR'),semInfo.length===ms.length?'reimporte o Relatório de andamentos para contar':pct(tot?auto/tot*100:null)+' das certidões · selo gerado pelo sistema')+
      kpi('Feitas por escreventes',hum.length.toLocaleString('pt-BR'),(semInfo.length===ms.length?'':pct(tot?hum.length/tot*100:null)+' · ')+L.length+' pessoas geraram selo')+
      (L.length?kpi('Quem mais fez',esc(L[0].nome.split(' ')[0]),L[0].n+' certidões · '+pct(hum.length?L[0].n/hum.length*100:null)+' das manuais'):'')+'</div>';
    if (semInfo.length && semInfo.length<ms.length) h+='<p class="hint" style="margin:0 0 8px">Sem contagem de automáticas em: '+semInfo.map(nomeMes).join(', ')+'. Reimporte o Relatório de andamentos desses meses.</p>';
    if (ms.length>1 && semInfo.length<ms.length) h+='<div class="panel" style="margin-bottom:12px">'+graficoBarras(ms,[{nome:'Escreventes',cor:'var(--brand)',v:ms.map(function(m){ return state.cert[m].recs.filter(function(x){ return x.u&&!/^tri7$/i.test(x.u); }).length; })},{nome:'Automáticas (Tri7)',cor:'#868e96',v:ms.map(function(m){ return certAutoMes(m)||0; })}],{titulo:'Certidões automáticas × escreventes por mês',goMes:function(m){ return goMes(m,'cer'); }})+'<div class="leg"><span><i class="dot" style="background:var(--brand)"></i>Escreventes</span><span><i class="dot" style="background:#868e96"></i>Automáticas (Tri7)</span></div></div>';
    if (L.length) h+='<div class="tbl-wrap" style="margin-bottom:14px"><table class="tleft" style="max-width:900px"><thead><tr><th>Escrevente (gerou o selo)</th><th class="num">Certidões</th><th class="num">% das manuais</th><th class="num">Balcão</th><th class="num">Central</th><th class="num">No prazo</th><th class="num">Mediana</th></tr></thead><tbody>'+
      L.map(function(o){ return '<tr><td>'+esc(o.nome)+'</td><td class="num"><span class="barra" style="--w:'+Math.round(o.n/mx*100)+'%">'+o.n+'</span></td><td class="num">'+pct(hum.length?o.n/hum.length*100:null)+'</td><td class="num">'+(o.bal||'·')+'</td><td class="num">'+(o.cen||'·')+'</td><td class="num">'+(o.nc?pillKpi(o.ok/o.nc*100):'<span class="mut">intimação</span>')+'</td><td class="num">'+(o.hs.length?fmtH(mediana(o.hs)):'—')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    return h;
  }
  function renderCer(){
    var ms=Object.keys(state.cert);
    if (!ms.length){ $('tabCer').innerHTML='<div class="empty"><b>Nenhuma certidão importada</b>Solte o Relatório de andamentos do Tri7 em Importar dados (a Prazo e Tempo Médio do mesmo período que diz quais pedidos foram de balcão e o tipo).</div>'; return; }
    if (state.pgVis.cer){ $('tabCer').innerHTML=visCer(); return; }
    var all=certCalc(certRecs()), C=all.filter(function(x){return !x.intim;}), I=all.length-C.length;
    var ok=C.filter(function(x){return x.ok;}).length;
    var B=C.filter(function(x){return x.origem==='Balcão';}), O=C.filter(function(x){return x.origem!=='Balcão';});
    var Bit=B.filter(function(x){return /inteiro teor/i.test(x.tipo);});
    var erros=0; Object.keys(state.cert).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) erros+=state.cert[m].raw.erros||0; });
    var pc=function(a){ return a.length?a.filter(function(x){return x.ok;}).length/a.length*100:null; };
    var h='<div class="sec-h"><span class="note">Horas úteis do pedido até a conclusão (Selos Gerados), no expediente de '+state.cfg.expIni+'h às '+state.cfg.expFim+'h. Prazos do art. 19 §10 da Lei 6.015/73.</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+
      kpi('Certidões no prazo',pctK(pc(C)),ok+' de '+C.length+' concluídas','hero')+
      kpi('Central / online',pct(pc(O)),O.length+' pedidos · mediana '+fmtH(mediana(O.map(function(x){return x.hu;}))))+
      kpi('Balcão',pct(pc(B)),B.length+' pedidos · mediana '+fmtH(mediana(B.map(function(x){return x.hu;}))))+
      kpi('Inteiro teor no balcão',pct(pc(Bit)),'prazo de 1 dia útil · '+Bit.length+' pedidos',pc(Bit)!=null&&pc(Bit)<95?'canc':'')+
      kpi('Fora do cálculo',String(I),'certidões do fluxo de intimação (prazo corre do pagamento) · regra automática, ver abaixo')+
      kpi('Erros de validação',String(erros),'geração automática que falhou')+'</div>';
    var omT=certOrigemMensal(); h+='<div class="sub-h">De onde vêm os pedidos</div><div class="two" style="margin-bottom:14px"><div>'+certOrigemRosca(all)+'</div><div>'+(omT||'<p class="hint">Importe mais de um mês para ver o fluxo mensal.</p>')+'</div></div>';
    h+=certAutoresHTML(all);
    // por origem e tipo
    var g={}; C.forEach(function(x){ var k=x.origem+'|'+x.tipo; (g[k]=g[k]||[]).push(x); });
    h+='<div class="sub-h">Por origem e tipo</div><div class="tbl-wrap"><table class="tleft" style="max-width:900px"><thead><tr><th>Origem</th><th>Tipo</th><th>Prazo legal</th><th>Pedidos</th><th>No prazo</th><th>Mediana</th><th>90% saem em até</th></tr></thead><tbody>'+
      Object.keys(g).sort(function(a,b){return g[b].length-g[a].length;}).map(function(k){ var a=g[k], p=k.split('|'), hs=a.map(function(x){return x.hu;}).sort(function(x,y){return x-y;}), p90=hs[Math.floor(hs.length*0.9)];
        return '<tr><td>'+esc(p[0])+'</td><td class="tl">'+esc(p[1])+'</td><td>'+fmtLim(a[0].lim)+'</td><td>'+a.length+'</td><td>'+pillKpi(pc(a))+'</td><td>'+fmtH(mediana(hs))+'</td><td>'+fmtH(p90)+'</td></tr>'; }).join('')+'</tbody></table></div>';
    // mês a mês
    var meses=Object.keys(state.cert).sort();
    if (meses.length>1){ var tod=certCalc([].concat.apply([],meses.map(function(m){return state.cert[m].recs;}))).filter(function(x){return !x.intim;});
      h+='<div class="sub-h" style="margin-top:14px">Mês a mês</div><div class="tbl-wrap"><table style="max-width:640px"><thead><tr><th>Mês</th><th>Concluídas</th><th>No prazo</th><th>Central</th><th>Balcão</th><th>Inteiro teor balcão</th></tr></thead><tbody>'+
      meses.map(function(m){ var a=tod.filter(function(x){return x.mes===m;}), b=a.filter(function(x){return x.origem==='Balcão';});
        return '<tr><td>'+nomeMes(m)+'</td><td>'+a.length+'</td><td><b>'+pct(pc(a))+'</b></td><td>'+pct(pc(a.filter(function(x){return x.origem!=='Balcão';})))+'</td><td>'+pct(pc(b))+'</td><td>'+pct(pc(b.filter(function(x){return /inteiro teor/i.test(x.tipo);})))+'</td></tr>'; }).join('')+'</tbody></table></div>'; }
    // fora do prazo
    var fora=C.filter(function(x){return !x.ok;}).sort(function(a,b){return b.hu-a.hu;});
    h+='<div class="sub-h" style="margin-top:14px">Fora do prazo ('+fora.length+')</div>'+(fora.length?'<div class="scroll"><table class="tleft"><thead><tr><th>Pedido</th><th>Origem</th><th>Tipo</th><th>Entrada</th><th>Conclusão</th><th>Horas úteis</th><th>Prazo</th></tr></thead><tbody>'+
      fora.slice(0,400).map(function(x){ return '<tr><td>'+esc(x.p)+'</td><td>'+esc(x.origem)+'</td><td class="tl">'+esc(x.tipo)+'</td><td>'+fmtMin(x.i)+'</td><td>'+fmtMin(x.f)+'</td><td>'+fmtH(x.hu)+'</td><td>'+fmtLim(x.lim)+'</td></tr>'; }).join('')+'</tbody></table></div>':'<div class="empty">Nenhuma certidão fora do prazo no período.</div>');
    // configuração: setor de intimação e expediente
    var usuarios={}, emL={}, semN=all.filter(function(x){ return x.semNat; }), comN=all.length-semN.length, natI=all.filter(function(x){ return !x.semNat && x.intim; }).length; intimLista().forEach(function(p){ emL[chavePessoa(p)]=1; }); semN.forEach(function(x){ if (x.u&&!/^tri7$/i.test(x.u)&&emL[chavePessoa(x.u)]) usuarios[x.u]=(usuarios[x.u]||0)+1; });
    var nomesF=Object.keys(usuarios).sort(function(a,b){return usuarios[b]-usuarios[a];});
    h+='<div class="sub-h" style="margin-top:16px">Fluxo de intimação (fora do cálculo)</div><p class="hint" style="margin:0 0 6px">Certidões do fluxo de intimação não entram no prazo: o cliente paga depois e o prazo corre do pagamento. <b>Regra:</b> natureza <b>"Certidão de Intimação"</b> no Tri7, certidão por certidão. '+(comN?natI+' de '+comN+' certidões com natureza salva são de intimação. ':'')+(semN.length?'<b>'+semN.length+' certidões foram importadas antes da 0.10.5, sem a natureza</b>: para elas vale a regra antiga (quem tem 50+ execuções e mais da metade em etapas de intimação). Reimporte o Relatório de andamentos desses meses para usar a natureza.':'')+'</p>'+
      (semN.length?'<div class="chips">'+(nomesF.length?nomesF.map(function(u){ return '<span class="chip ok">✓ '+esc(u)+' · '+usuarios[u]+'</span>'; }).join(''):'<span class="hint">Ninguém atende à regra antiga no período.</span>')+'</div>':'')+
      '<p class="hint" style="margin-top:12px">Expediente usado na contagem: <b>'+state.cfg.expIni+'h às '+state.cfg.expFim+'h</b> (seg a sex, sem feriados) · altere em <button type="button" class="lnk" data-cfgir="cal">Configuração</button>.</p>';
    $('tabCer').innerHTML=h;
  }

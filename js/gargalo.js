/* Painel SGQ · CRCO — js/gargalo.js (0.27.0: Processo › Capacidade e gargalo — onde o tempo do documento vai, etapa por etapa)
 * Do log do VHL: cada execução de etapa tem a data em que saiu da etapa e quantos dias úteis ficou nela.
 * Tempo na etapa = espera na fila + trabalho. O trabalho vem do cronômetro (tempo-padrão do Desempenho Usuário).
 * Fila média = saídas por dia útil × tempo médio na etapa (lei de Little). Fila dia a dia = documentos que estavam na etapa em cada dia útil.
 * Pessoas-equivalentes = horas de trabalho que a etapa pediu por dia útil ÷ jornada. Base do Six Sigma dos contratos (meta: 2 dias úteis). */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/gargalo.js']='0.27.0';
  var GA_META=2, GA_MIN=30, GA_POS=/imprimir ficha|arquivamento|envio de registro|digitalizar selo/; // mesmas etapas de pós-registro do cálculo do prazo
  var GA_CONTRATO=/contrato|compra e venda|pmcmv|aliena[cç][aã]o fiduci|financiamento|c[eé]dula de cr[eé]dito|escritura p[uú]blica/i;
  function gaUtil(d, fer){ var w=((d%7)+7+4)%7; return w!==0&&w!==6&&!fer[d]; }
  function gaJanela(){ var ms=Object.keys(state.docs).sort(); if (state.periodo&&state.periodo!=='todos') return [state.periodo];
    return ms.filter(function(m){ return m<mesHoje()&&!mesParcial(m); }).slice(-6); }
  function gaNatOk(nat){ var f=state.gaNat||'__contratos'; if (f==='__todas') return true; if (f==='__contratos') return GA_CONTRATO.test(nat||''); return nat===f; }
  function gaNatNome(){ var f=state.gaNat||'__contratos'; return f==='__todas'?'todas as naturezas':f==='__contratos'?'contratos':f; }
  function gaBase(){
    var MS=gaJanela(), k0=[MS.join(','), state.gaNat||'', state._eqX&&state._eqX.k, state._trB&&state._trB.k, (state.extras||[]).length, JSON.stringify(state.gaAm||{})].join('|');
    if (state._gaB&&state._gaB.k===k0) return state._gaB.v;
    var fer=Motor.feriadoSet(state.extras), X=eqExecs(), B=trBase(), jor=trJornada();
    var du=0, d0=null, d1=null; MS.forEach(function(m){ var p=m.split('-').map(Number), n=new Date(Date.UTC(p[0],p[1],0)).getUTCDate(); for (var i=1;i<=n;i++){ var d=Motor.diaDeIso(m+'-'+(i<10?'0':'')+i); if (gaUtil(d,fer)){ du++; if (d0==null||d<d0) d0=d; if (d1==null||d>d1) d1=d; } } });
    // tempo-padrão de trabalho por função (cronômetro, minutos por ato)
    var PADF={}, PADT={}; Object.keys(B.C||{}).forEach(function(id){ var c=B.C[id]; (PADT[c.fn]=PADT[c.fn]||[]).push.apply(PADT[c.fn],c.E); if (gaNatOk(c.nat)) (PADF[c.fn]=PADF[c.fn]||[]).push.apply(PADF[c.fn],c.E); });
    function qq(E){ return (E||[]).reduce(function(s,e){ return s+e.w; },0); }
    function padMin(f){ var E=qq(PADF[f])>=10?PADF[f]:PADT[f]; return qq(E)>=10?trWq(E,.5)/60:null; } // minutos por ato: naturezas do filtro; com pouco dado, todas
    var F={}, docs={}, tri={}, pos={};
    X.forEach(function(x){ if (MS.indexOf(x.m)<0||!gaNatOk(x.nat)) return;
      if (x.src==='VHL'&&GA_POS.test(semAc(x.raw||x.fn))){ var pq=pos[x.fn]=pos[x.fn]||{fn:x.fn, n:0, pz:[]}; pq.n++; if (x.pz!=null) pq.pz.push(x.pz); return; } // depois do registro: não conta no prazo
      if (x.src!=='VHL'){ var t=tri[x.fn]=tri[x.fn]||{fn:x.fn, n:0, L:[]}; t.n++; t.L.push(x); return; }
      docs[x.c]=1; var f=F[x.fn]=F[x.fn]||{fn:x.fn, n:0, pz:[], soma:0, docs:{}, L:[], ks:{}}; f.n++; f.L.push(x); f.docs[x.c]=1; f.ks[x.k]=(f.ks[x.k]||0)+1; if (x.pz!=null){ f.pz.push(x.pz); f.soma+=x.pz; } });
    var nDocs=Object.keys(docs).length;
    var L=Object.keys(F).map(function(k){ return F[k]; }).filter(function(f){ return f.n>=GA_MIN; }).map(function(f){
      var med=mediana(f.pz), mPz=f.pz.length?f.soma/f.pz.length:null, pm=padMin(f.fn), sai=du?f.n/du:0;
      f.med=med; f.p90=quant(f.pz,.9); f.mPz=mPz; f.pad=pm; f.sai=sai; f.fila=mPz!=null?sai*mPz:null;
      f.hDia=pm!=null?sai*pm/60:null; f.peq=f.hDia!=null?f.hDia/jor:null; f.nPes=Object.keys(f.ks).filter(function(k){ return f.ks[k]>=eqMin(); }).length;
      f.trab=(pm!=null&&mPz!=null&&mPz>0)?Math.min(1,(pm/60)/(mPz*jor)):null; f.porDoc=nDocs?f.soma/nDocs:0; f.passa=nDocs?Object.keys(f.docs).length/nDocs:0; return f; })
      .sort(function(a,b){ return b.porDoc-a.porDoc; });
    // Tri7: andamentos (contados); horas só com a amostra cronometrada
    var AM=(state.gaAm&&state.gaAm.min)||{}, LT=Object.keys(tri).map(function(k){ var t=tri[k]; t.sai=du?t.n/du:0; t.min=AM[t.fn]!=null&&AM[t.fn]!==''?+AM[t.fn]:null; t.hDia=t.min!=null?t.sai*t.min/60:null; t.peq=t.hDia!=null?t.hDia/jor:null; return t; }).filter(function(t){ return t.n>=GA_MIN; }).sort(function(a,b){ return b.n-a.n; });
    // tempo total do documento (registrados na janela): bruto, líquido e meta
    var R=[]; MS.forEach(function(m){ R=R.concat(atosDoMes(m).filter(function(a){ return a.cat==='R'&&a.bruto!=null&&gaNatOk(a.nat); })); });
    var LP=Object.keys(pos).map(function(k){ var p=pos[k]; p.med=mediana(p.pz); return p; }).filter(function(p){ return p.n>=GA_MIN; });
    var v={LP:LP, MS:MS, du:du, d0:d0, d1:d1, fer:fer, L:L, LT:LT, nDocs:nDocs, R:R, jor:jor};
    state._gaB={k:k0, v:v}; return v; }
  // fila dia a dia de uma função: documentos na etapa em cada dia útil (entrou = saída − dias na etapa)
  function gaFilaDia(G, f){ var dias=[], ix={}; for (var d=G.d0; d<=G.d1; d++){ if (gaUtil(d,G.fer)){ ix[d]=dias.length; dias.push(d); } }
    var fila=dias.map(function(){ return 0; }), sai=dias.map(function(){ return 0; });
    f.L.forEach(function(x){ var fim=Motor.diaDeIso(x.d), ini=fim, k=x.pz||0; while (k>0){ ini--; if (gaUtil(ini,G.fer)) k--; }
      if (ix[fim]!=null) sai[ix[fim]]++; for (var d=Math.max(ini,G.d0); d<fim; d++){ if (ix[d]!=null) fila[ix[d]]++; } });
    return {dias:dias.map(function(d){ return Motor.isoDeDia(d); }), fila:fila, sai:sai}; }
  function renderGargalo(){
    var el=$('tabGar'); if (!el) return;
    if (atrAtual()!=='RI'){ el.innerHTML='<div class="empty"><b>Por enquanto só no Registro de Imóveis</b>Escolha RI na Serventia do topo.</div>'; return; }
    var G=gaBase(); if (!G.MS.length||!G.L.length){ el.innerHTML='<div class="empty"><b>Sem execuções de etapa no período</b>Importe a Produção por Etapa e escolha um mês fechado ou "Todos os meses" (usa os 6 últimos fechados).</div>'; return; }
    var per=G.MS.length>1?nomeMes(G.MS[0])+' a '+nomeMes(G.MS[G.MS.length-1]):nomeMes(G.MS[0]);
    // naturezas para o filtro
    var nv={}; G.MS.forEach(function(m){ atosDoMes(m).forEach(function(a){ nv[a.nat]=(nv[a.nat]||0)+1; }); }); var nats=Object.keys(nv).sort(function(a,b){ return nv[b]-nv[a]; }).slice(0,40);
    var f0=state.gaNat||'__contratos';
    var h='<div class="search pa-top"><label class="pa-sel"><span>Naturezas</span><select id="gaNatIn"><option value="__contratos"'+(f0==='__contratos'?' selected':'')+'>Contratos (meta 2 d.u.)</option><option value="__todas"'+(f0==='__todas'?' selected':'')+'>Todas</option>'+nats.map(function(n){ return '<option value="'+esc(n)+'"'+(f0===n?' selected':'')+'>'+esc(n)+' ('+nv[n]+')</option>'; }).join('')+'</select></label></div>';
    h+='<div class="sec-h"><h2>Onde o tempo vai · '+esc(gaNatNome())+' · '+esc(per)+'</h2><span class="note">Cada execução de etapa do VHL traz o dia em que o documento saiu da etapa e quantos dias úteis ficou nela. <b>Tempo na etapa = espera na fila + trabalho</b>; o trabalho vem do cronômetro (tempo-padrão do Desempenho Usuário). Fila média = saídas por dia útil × tempo médio na etapa (lei de Little). Pessoas-equivalentes = horas de trabalho que a etapa pediu por dia útil ÷ '+G.jor+' h. "Todos os meses" usa os 6 últimos meses fechados. Contratos = naturezas com contrato, compra e venda, PMCMV, alienação fiduciária, financiamento, cédula de crédito ou escritura pública.</span></div>';
    // tempo total contra a meta
    var b=G.R.map(function(a){ return a.bruto; }), l=G.R.filter(function(a){ return a.liq!=null; }).map(function(a){ return a.liq; }), ate=b.filter(function(v){ return v<=GA_META; }).length;
    var top=G.L[0], soma=G.L.reduce(function(s,f){ return s+f.porDoc; },0);
    h+='<div class="kpis" style="margin-bottom:12px">'+
      kpi('Até o registro · mediana',b.length?numBR(mediana(b),1)+' <small style="font-size:14px">d.u.</small>':'—',b.length+' registrados · meta '+GA_META+' d.u.','hero',{go:goLista('Registrados · '+gaNatNome()+' · '+per,'atos',G.R), f:kConta('mediana dos dias úteis do ingresso ao registro',b.length+' atos',b.length?numBR(mediana(b),1)+' d.u.':null,'Produção por Etapa do VHL')})+
      kpi('Em até '+GA_META+' d.u.',b.length?pct(ate/b.length*100):'—',ate+' de '+b.length,b.length&&ate/b.length<0.5?'canc':'',{go:goLista('Registrados em até '+GA_META+' d.u.','atos',G.R.filter(function(a){ return a.bruto<=GA_META; }))})+
      kpi('Só com o cartório · mediana',l.length?numBR(mediana(l),1)+' <small style="font-size:14px">d.u.</small>':'—','sem exigência e pagamento (líquido)')+
      kpi('Etapa que mais segura',top?esc(top.fn):'—',top?numBR(top.porDoc,1)+' d.u. por documento · '+pct(soma?top.porDoc/soma*100:null)+' do tempo nas etapas':'','',{go:top?goGa(top):null})+'</div>';
    // gráfico: dias úteis por documento em cada etapa
    var itens=G.L.slice(0,14).map(function(f){ return {nome:f.fn, v:Math.round(f.porDoc*100)/100, cor:f===top?'var(--c2)':'var(--c1)', extra:'mediana na etapa '+numBR(f.med,1)+' d.u. · '+(f.trab!=null?pct(f.trab*100)+' é trabalho, o resto é espera':'sem cronômetro')+' · passa por aqui: '+pct(f.passa*100)+' dos documentos', go:goGa(f)}; });
    h+='<div class="vz-grid">'+vzCard('Dias úteis por documento, em cada etapa','soma do tempo na etapa ÷ documentos do período · clique para a fila dia a dia',gBarrasH(itens),'vz-wide')+'</div>';
    // tabela de capacidade
    h+='<div class="sub-h">Capacidade por etapa</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Etapa</th><th class="num" title="Execuções por dia útil">Saídas/dia</th><th class="num">Na etapa · mediana</th><th class="num">P90</th><th class="num" title="Tempo-padrão do cronômetro">Trabalho por ato</th><th class="num" title="Parte do tempo na etapa que é trabalho; o resto é espera">Trabalho ÷ tempo na etapa</th><th class="num" title="Saídas por dia × tempo médio na etapa">Na fila (média)</th><th class="num" title="Horas de trabalho por dia útil ÷ jornada">Pessoas-equivalentes</th><th class="num" title="Pessoas com '+eqMin()+'+ execuções no período">Pessoas que fazem</th></tr></thead><tbody>'+
      G.L.map(function(f){ return '<tr class="click'+(state.gaSel===f.fn?' sel':'')+'" data-gasel="'+esc(f.fn)+'"><td>'+esc(f.fn)+'</td><td class="num">'+numBR(f.sai,1)+'</td><td class="num">'+numBR(f.med,1)+' d.u.</td><td class="num">'+numBR(f.p90,1)+'</td><td class="num">'+(f.pad!=null?numBR(f.pad,f.pad<10?1:0)+' min':'—')+'</td><td class="num">'+(f.trab!=null?pct(f.trab*100):'—')+'</td><td class="num">'+(f.fila!=null?numBR(f.fila,0):'—')+'</td><td class="num">'+(f.peq!=null?numBR(f.peq,1):'—')+'</td><td class="num">'+f.nPes+'</td></tr>'; }).join('')+'</tbody></table></div>';
    // leitura
    var esp=G.L.filter(function(f){ return f.trab!=null&&f.trab<0.1&&f.med>=1; }), capa=G.L.filter(function(f){ return f.peq!=null&&f.nPes&&f.peq/f.nPes>0.6; });
    h+='<p class="hint"><b>Leitura:</b> '+(esp.length?'em '+esp.slice(0,4).map(function(f){ return '<b>'+esc(f.fn)+'</b>'; }).join(', ')+' o documento fica 1 dia útil ou mais, mas o trabalho é menos de 10% desse tempo: o atraso é <b>fila</b> (o documento espera alguém pegar), não falta de gente. ':'')+
      (capa.length?'Em '+capa.slice(0,4).map(function(f){ return '<b>'+esc(f.fn)+'</b>'; }).join(', ')+' o trabalho pedido já ocupa mais de 60% de quem faz a etapa: aí falta capacidade. ':'Nenhuma etapa usa mais de 60% de quem a faz: a capacidade existe; o ganho está em diminuir a espera (puxar o documento antes, menos lote, prioridade). ')+'</p>';
    if (G.LP.length) h+='<p class="hint">Depois do registro (não contam no prazo): '+G.LP.map(function(p){ return esc(p.fn)+' · mediana '+numBR(p.med,1)+' d.u.'; }).join(' · ')+'.</p>';
    // fila dia a dia da etapa escolhida
    var sel=G.L.filter(function(f){ return f.fn===state.gaSel; })[0]||top;
    if (sel){ var FD=gaFilaDia(G,sel); h+='<div class="vz-grid" id="gaFila">'+vzCard('Fila dia a dia · '+sel.fn,'documentos na etapa em cada dia útil (linha) e saídas do dia (tracejada) · reconstruído do log do VHL',gLinhas(FD.dias,[{nome:'Na etapa',cor:'var(--c1)',v:FD.fila},{nome:'Saídas',cor:'var(--c2)',tracejado:true,v:FD.sai}],{titulo:'Fila',un:'',zero:true,rotulos:false}),'vz-wide')+'</div>'; }
    // demanda completa: andamentos do Tri7
    var AM=(state.gaAm&&state.gaAm.min)||{};
    h+='<div class="sub-h">Andamentos do Tri7 · demanda que o VHL não mede</div><p class="hint" style="margin:0 0 6px">O Tri7 não marca tempo. Com a semana de amostra cronometrada, escreva os minutos médios de cada andamento: as horas entram aqui. '+(state.gaAm&&state.gaAm.em?'Amostra gravada em '+fmtData(String(state.gaAm.em).slice(0,10))+' por '+esc(state.gaAm.por||'')+'.':'Ainda sem amostra.')+'</p>'+
      '<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Andamento</th><th class="num">No período</th><th class="num">Por dia útil</th><th class="num">Minutos por andamento (amostra)</th><th class="num">Pessoas-equivalentes</th></tr></thead><tbody>'+
      G.LT.map(function(t){ return '<tr><td>'+esc(t.fn)+'</td><td class="num click"'+goAttr((pnListasReg(),goLista(t.fn+' · '+per,'pnExec',t.L)))+'>'+t.n.toLocaleString('pt-BR')+'</td><td class="num">'+numBR(t.sai,1)+'</td><td class="num">'+(podeEscrever?'<input class="mini" type="number" min="0" step="0.5" style="width:80px" data-gaam="'+esc(t.fn)+'" value="'+(AM[t.fn]!=null?esc(String(AM[t.fn])):'')+'" aria-label="Minutos por andamento: '+esc(t.fn)+'">':(AM[t.fn]!=null?esc(String(AM[t.fn])):'—'))+'</td><td class="num">'+(t.peq!=null?numBR(t.peq,1):'—')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (podeEscrever?'<div class="ctl" style="margin-top:6px"><button type="button" class="btn sm" id="gaAmSalvar">Gravar a amostra</button></div>':'');
    h+=(typeof paFotoBtn==='function'?paFotoBtn('Capacidade e gargalo · '+gaNatNome()+' · '+per):'');
    el.innerHTML=h; }
  function goGa(f){ return {t:'ga', fn:f.fn}; }
  function gaClique(t){ var r=t.closest&&t.closest('tr[data-gasel]'); if (r){ state.gaSel=r.dataset.gasel; renderGargalo(); var g=$('gaFila'); if (g&&g.scrollIntoView) g.scrollIntoView({behavior:'smooth',block:'center'}); return true; }
    if (t.id==='gaAmSalvar'){ var min={}; document.querySelectorAll('#tabGar [data-gaam]').forEach(function(i){ if (i.value!=='') min[i.dataset.gaam]=+i.value; });
      var antes=state.gaAm; state.gaAm={min:min, em:new Date().toISOString(), por:nomeUsuario()}; state._gaB=null;
      if (typeof apurLog==='function'){ apurLog('Amostra cronometrada do Tri7', antes&&antes.min?JSON.stringify(antes.min):'—', JSON.stringify(min), 'a partir de agora', 'Capacidade e gargalo'); if (dbPronto&&podeEscrever&&state.apur) db.doc('config/apuracao').set(state.apur).catch(function(){}); }
      if (dbPronto&&podeEscrever) db.doc('config/amostraTri7').set(state.gaAm).catch(function(){ toast('Não consegui gravar a amostra'); });
      renderGargalo(); toast('Amostra gravada'); return true; }
    return false; }

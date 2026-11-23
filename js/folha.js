/* Painel SGQ · CRCO — js/folha.js (0.35.0: Folha de Feedback Bimestral em A4, para imprimir)
 * Monta, com os mesmos números da Ficha da pessoa, a folha de 1 página do POP-SGQ-FDB-001 (proposta de 9 blocos):
 * fatos do período, comparados só com a faixa da própria função; sem ranking, sem saúde, sem remuneração.
 * Nada é gravado: abre uma janela de impressão. O gestor completa à mão os blocos 8 e 9. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/folha.js']='0.35.0';

  // A nota entra como contexto no bloco "Tempo de trabalho" (decisão da gestão pendente: pôr false tira a nota da folha)
  var FOLHA_NOTA=true;
  // abaixo disto, a natureza mostra o número de documentos e "base pequena", sem taxa nem leitura
  var FOLHA_MIN_NAT=5;
  // limites para a folha caber em 1 página A4 (medido com os dados reais de out/26: 6 naturezas estouravam até 11 mm)
  var FOLHA_MAX_NAT=4, FOLHA_MAX_APR=4;

  // ═════════ dados (mesma conta da Ficha) ═════════
  function paFolhaDados(k){
    var A=paBase(); if (!A) return null;
    var R=paPorK(A.R), p=R[k]; if (!p) return null;
    var g=p.grupo||null, fx=g&&g.fx&&g.fx.base, r=p.R||null, nome=p.nome;
    var d={nome:nome, fn:p.fn||'—', periodo:paPer(A.MS), da:p.da, du:p.du, docs:p.docs||0, inc:p.inc||0, taxa:p.taxa, taxaFn:(g&&g.taxa!=null)?g.taxa:null,
      nGrupo:g?g.length:0, catTxt:vgCatTxt(p), fx:fx?{p25:fx.p25, p75:fx.p75}:null, nota:r?r.nota:null, margem:false,
      horasEnt:r?(r.ent+r.cert+r.bal-r.ret):null, horasDisp:r?r.disp:null, horasBal:r?r.bal:0, ritmo:null, nats:[], apr:[], evol:[], gerada:new Date().toLocaleString('pt-BR')};
    if (r&&fx&&p.cat==='normal'&&r.nota<fx.p25) d.margem=true;
    // tempo por ato × equipe (1,00 = igual à equipe)
    var tp=0, tq=0; p.L.forEach(function(x){ if (x.ok&&x.p.ritmo!=null){ tp+=x.p.num; tq+=x.p.den; } }); if (tq) d.ritmo=tp/tq;
    // qualidade por natureza × função (mesma conta da Ficha; equipe = todos os não ocultos)
    var EQ={}, eqD={}; A.R.L.forEach(function(x){ if (x.oculto) return; x.L.forEach(function(y){ Object.keys(y.docsNat).forEach(function(n){ eqD[n]=(eqD[n]||0)+Object.keys(y.docsNat[n]).length; }); Object.keys(y.incNat).forEach(function(n){ EQ[n]=(EQ[n]||0)+y.incNat[n]; }); }); });
    var mD={}, mI={}; p.L.forEach(function(y){ Object.keys(y.docsNat).forEach(function(n){ mD[n]=(mD[n]||0)+Object.keys(y.docsNat[n]).length; }); Object.keys(y.incNat).forEach(function(n){ mI[n]=(mI[n]||0)+y.incNat[n]; }); });
    d.nats=Object.keys(mD).filter(function(n){ return mD[n]>=FOLHA_MIN_NAT||mI[n]; }).sort(function(a,b){ return (mI[b]||0)-(mI[a]||0)||mD[b]-mD[a]; }).slice(0,FOLHA_MAX_NAT).map(function(n){
      var grande=mD[n]>=FOLHA_MIN_NAT, t=grande?(mI[n]||0)/mD[n]:null, te=eqD[n]?(EQ[n]||0)/eqD[n]:null;
      return {nat:n, docs:mD[n], inc:mI[n]||0, taxa:t, taxaEq:grande?te:null, acima:grande&&t!=null&&te!=null&&(mI[n]||0)>=2&&t>te*1.5}; });
    // aprendizagem (contexto, não pontua)
    var ap=(typeof aprLista==='function'?aprLista():[]).filter(function(a){ return a.k===k||semAc(a.nome||'')===semAc(nome); });
    d.apr=ap.map(function(a){ return {pop:a.pop||'', res:a.status==='concluido'?(a.res==='apto'?'apto':a.res==='nao'?'não apto':'concluído'):'em acompanhamento', treino:a.treino||''}; });
    // evolução: últimos meses fechados (mesmos números da Ficha)
    d.evol=paEvolLinhas(A.V,k,A.fech);
    return d; }

  // ═════════ desenho ═════════
  function folhaCss(){ return [
    '@page{size:A4 portrait;margin:0}',
    '*{box-sizing:border-box}html,body{margin:0;background:#cfd4da;color:#1b1f24;font-family:"Segoe UI",Arial,sans-serif}',
    '.folha{width:210mm;height:297mm;margin:8mm auto;padding:9mm 10mm 8mm;background:#fff;display:flex;flex-direction:column;gap:2.2mm;font-size:8.6pt;line-height:1.3;overflow:hidden}',
    'header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0f7f82;padding-bottom:2mm}',
    'header h1{font-size:14pt;margin:0}.cod{font-size:7.4pt;color:#5b6470}',
    'h2{font-size:8.4pt;margin:0 0 1.4mm;text-transform:uppercase;letter-spacing:.06em;color:#0f7f82;display:flex;gap:2mm;align-items:baseline}',
    'h2 .n{font-family:Consolas,monospace;color:#5b6470}h2 .fonte{margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;color:#5b6470;font-size:7pt}',
    '.bloco{border:1px solid #d5dae0;border-radius:2mm;padding:2.2mm 2.8mm}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:2.2mm}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}',
    '.id{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1.3fr;gap:2mm}.id span{display:block;font-size:6.8pt;color:#5b6470;text-transform:uppercase;letter-spacing:.05em}.id b{font-size:9pt}',
    '.blank{display:block;border-bottom:1px solid #1b1f24;height:4.6mm}',
    '.v{font-size:15pt;font-weight:700;letter-spacing:-.02em}.v small{font-size:8pt;font-weight:400}.l{font-size:7pt;color:#5b6470}',
    '.faixa{position:relative;height:3.2mm;background:#f4f6f8;border-radius:2mm;margin:1mm 0 .4mm}.faixa .normal{position:absolute;top:0;bottom:0;background:#e6f4f4;border-left:1px solid #0f7f82;border-right:1px solid #0f7f82}.faixa .ponto{position:absolute;top:-.6mm;width:2mm;height:4.4mm;background:#1b1f24;border-radius:1mm;transform:translateX(-50%)}',
    '.leg{font-size:6.6pt;color:#5b6470;margin-top:1mm}',
    'table{width:100%;border-collapse:collapse;font-size:7.8pt}th{text-align:left;font-weight:600;color:#5b6470;font-size:6.8pt;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #d5dae0;padding:.6mm 1mm}td{padding:.7mm 1mm;border-bottom:1px solid #edf0f3}.num{text-align:right;font-variant-numeric:tabular-nums}',
    '.aviso{color:#9a6200;font-size:6.8pt}.tag{display:inline-block;font-size:6.6pt;padding:.2mm 1.4mm;border-radius:3mm;border:1px solid #d5dae0;color:#5b6470}.tag.ok{color:#1b6b3a;border-color:#a8d5b6;background:#eaf6ee}.tag.ac{color:#9a6200;border-color:#e8c77a;background:#fff4dd}',
    '.ghost{color:#5b6470;background:repeating-linear-gradient(135deg,#fafbfc,#fafbfc 2mm,#f2f4f6 2mm,#f2f4f6 4mm);border-style:dashed}',
    '.escrita{display:flex;flex-direction:column;gap:1.6mm}.escrita .linha{border-bottom:1px solid #d5dae0;height:4.6mm}.escrita label{font-size:6.8pt;color:#5b6470;text-transform:uppercase;letter-spacing:.05em}',
    '.ass{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:3mm;margin-top:3mm}.ass div{border-top:1px solid #1b1f24;padding-top:.6mm;font-size:6.8pt;color:#5b6470}',
    'footer{margin-top:auto;border-top:1px solid #d5dae0;padding-top:1.6mm;font-size:6.6pt;color:#5b6470;line-height:1.25}',
    '@media print{html,body{background:#fff}.folha{margin:0}}'
  ].join(''); }

  function folhaPct(x){ return x==null||isNaN(x)?'—':pct(x*100); }
  // barra com faixa normal (lo..hi) e o ponto da pessoa, numa escala 0..max
  function folhaBarra(v, lo, hi, max){ function P(x){ return Math.max(0,Math.min(100,x/max*100)).toFixed(1); }
    return '<div class="faixa">'+(lo!=null&&hi!=null?'<div class="normal" style="left:'+P(lo)+'%;width:'+Math.max(0.8,P(hi)-P(lo)).toFixed(1)+'%"></div>':'')+(v!=null?'<div class="ponto" style="left:'+P(v)+'%"></div>':'')+'</div>'; }

  function folhaHTML(d){
    var h=[], semNota=!FOLHA_NOTA;
    h.push('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Folha de Feedback</title><style>'+folhaCss()+'</style></head><body><div class="folha">');
    h.push('<header><div><h1>Folha de Feedback Bimestral</h1><div class="cod">POP-SGQ-FDB-001 · registro PFDB-SGQ-001</div></div><div class="cod" style="text-align:right">Gerada em '+esc(d.gerada)+'<br>Painel SGQ · CRCO</div></header>');
    // 1 identificação
    h.push('<section class="bloco"><h2><span class="n">01</span> Identificação <span class="fonte">Cadastro do Painel</span></h2><div class="id"><div><span>Colaborador</span><b>'+esc(d.nome)+'</b></div><div><span>Função principal</span><b>'+esc(d.fn)+'</b></div><div><span>Período</span><b>'+esc(d.periodo)+'</b></div><div><span>Dias ativos</span><b>'+(d.da!=null?d.da+' de '+d.du:'—')+'</b></div><div><span>Gestor</span><i class="blank"></i></div></div></section>');
    // 2 produção e 3 qualidade
    var maxT=Math.max(0.2, 2*Math.max(d.taxa||0, d.taxaFn||0));
    h.push('<div class="grid2"><section class="bloco"><h2><span class="n">02</span> Produção <span class="fonte">VHL · Tri7</span></h2><div class="v">'+d.docs.toLocaleString('pt-BR')+' <small>documentos</small></div><div class="l">'+(d.horasEnt!=null?'Horas entregues: '+trFmtH(d.horasEnt)+' de '+trFmtH(d.horasDisp)+' disponíveis (dias ativos × jornada)':'Sem tempo de trabalho no período')+'</div><div class="leg">Contexto do período. Fila de espera não entra na conta.</div></section>');
    h.push('<section class="bloco"><h2><span class="n">03</span> Qualidade <span class="fonte">VHL · inconformidades internas</span></h2><div class="v">'+(d.taxa!=null?folhaPct(d.taxa):'—')+' <small>'+d.inc+' em '+d.docs.toLocaleString('pt-BR')+'</small></div><div class="l">'+(d.taxaFn!=null?'Taxa da função: '+folhaPct(d.taxaFn):'Sem taxa da função')+(d.nGrupo>1?' · '+d.nGrupo+' pessoas na função':'')+'</div>'+folhaBarra(d.taxa, d.taxaFn, d.taxaFn, maxT)+'<div class="leg">'+(d.taxaFn==null?'Sem comparação com a função: 0% pode significar área sem registro de inconformidades, não ausência de erro.':'Ponto = você · traço = taxa da função')+'</div></section></div>');
    // natureza
    h.push('<section class="bloco"><h2><span class="n">03</span> Onde os erros se concentram <span class="fonte">só atos com '+FOLHA_MIN_NAT+'+ documentos recebem taxa</span></h2>');
    if (d.nats.length) h.push('<table><thead><tr><th>Natureza do ato</th><th class="num">Documentos</th><th class="num">Inconf.</th><th class="num">Sua taxa</th><th class="num">Taxa da equipe</th><th>Leitura</th></tr></thead><tbody>'+d.nats.map(function(n){
      var leitura=n.taxa==null?'<span class="aviso">base pequena ('+n.docs+' doc'+(n.docs===1?'':'s')+'): sem classificação</span>':(n.acima?'<span class="tag ac">acima da equipe</span>':'<span class="tag ok">sem destaque</span>');
      return '<tr><td>'+esc(n.nat)+'</td><td class="num">'+n.docs+'</td><td class="num">'+n.inc+'</td><td class="num">'+(n.taxa==null?'—':folhaPct(n.taxa))+'</td><td class="num">'+(n.taxaEq==null?'—':folhaPct(n.taxaEq))+'</td><td>'+leitura+'</td></tr>'; }).join('')+'</tbody></table>');
    else h.push('<div class="l">Nenhuma natureza com inconformidade ou com documentos suficientes no período.</div>');
    h.push('</section>');
    // 4 tempo e 5 atendimento
    h.push('<div class="grid2"><section class="bloco"><h2><span class="n">04</span> Tempo de trabalho <span class="fonte">VHL · Desempenho Usuário</span></h2><div class="v">'+(d.ritmo!=null?folhaRi(d.ritmo):'—')+' <small>tempo por ato × equipe (1,00 = igual)</small></div>'+
      (semNota||d.nota==null?'<div class="l">Só o tempo cronometrado conta.</div>':'<div class="l">Nota de ocupação (contexto): '+vgPct(d.nota)+' · '+esc(d.catTxt)+'</div>'+folhaBarra(d.nota, d.fx&&d.fx.p25, d.fx&&d.fx.p75, 1)+'<div class="leg">Faixa normal da função: '+(d.fx?vgPct(d.fx.p25)+' a '+vgPct(d.fx.p75):'sem faixa')+'</div>')+'</section>');
    h.push('<section class="bloco ghost"><h2><span class="n">05</span> Atendimento <span class="fonte">Senhas · Pesquisa de Satisfação</span></h2><div style="font-size:7.8pt">'+(d.horasBal>0?'Balcão no período: <b>'+trFmtH(d.horasBal)+'</b> de atendimento de senhas. ':'')+'Espera média e avaliações só se aplicam à <b>recepção</b>.</div><div class="leg">Enquanto a pesquisa não identificar quem atendeu, mostra só a espera das senhas.</div></section></div>');
    // 6 capacitação e 7 evolução
    h.push('<div class="grid2"><section class="bloco"><h2><span class="n">06</span> Capacitação <span class="fonte">Módulo Aprendizagem</span></h2>'+(d.apr.length?'<table><thead><tr><th>POP / IT</th><th>Treino</th><th>Resultado</th></tr></thead><tbody>'+d.apr.slice(0,FOLHA_MAX_APR).map(function(a){ return '<tr><td>'+esc(a.pop)+'</td><td>'+(a.treino?fmtData(a.treino):'—')+'</td><td><span class="tag'+(a.res==='apto'?' ok':'')+'">'+esc(a.res)+'</span></td></tr>'; }).join('')+(d.apr.length>FOLHA_MAX_APR?'<tr><td colspan="3" class="aviso">+ '+(d.apr.length-FOLHA_MAX_APR)+' treinamento(s) no Módulo Aprendizagem</td></tr>':'')+'</tbody></table>':'<div class="l">Nenhum treinamento registrado no período.</div>')+'<div class="leg">Resultados: apto · não apto · amostra pequena.</div></section>');
    var ev=(d.evol||[]).filter(function(l){ return !l.sem; });
    h.push('<section class="bloco"><h2><span class="n">07</span> Evolução <span class="fonte">últimos meses fechados</span></h2>'+(ev.length?'<table><thead><tr><th>Mês</th><th class="num">Docs</th><th class="num">Taxa</th><th class="num">Dias</th>'+(semNota?'':'<th class="num">Nota</th>')+'</tr></thead><tbody>'+ev.map(function(l){ return '<tr><td>'+esc(nomeMes(l.m))+'</td><td class="num">'+l.docs+'</td><td class="num">'+(l.taxa!=null?folhaPct(l.taxa):'<span class="aviso">base pequena</span>')+'</td><td class="num">'+(l.da!=null?l.da:'—')+'</td>'+(semNota?'':'<td class="num">'+(l.nota!=null?vgPct(l.nota):'—')+'</td>')+'</tr>'; }).join('')+'</tbody></table>':'<div class="l">Sem meses fechados com produção.</div>')+'<div class="leg">A tendência pesa mais que um mês isolado. Taxa só com 30+ documentos no mês.</div></section></div>');
    // 8 e 9 (a mão)
    function linhas(n){ var s=''; for (var i=0;i<n;i++) s+='<div class="linha"></div>'; return s; }
    h.push('<section class="bloco"><h2><span class="n">08</span> Avaliação da gestão <span class="fonte">preenchido pelo gestor da área · inclui legislação aplicável e valores do CRCO</span></h2><div class="grid3"><div class="escrita"><label>Pontos fortes</label>'+linhas(3)+'</div><div class="escrita"><label>Pontos a desenvolver</label>'+linhas(3)+'</div><div class="escrita"><label>Combinado para o próximo bimestre</label>'+linhas(3)+'</div></div></section>');
    h.push('<section class="bloco"><h2><span class="n">09</span> Ciência e revisão <span class="fonte">preenchido pelo colaborador</span></h2><div class="escrita"><label>Discordo de algum dado e peço revisão (cite o item, a competência e o protocolo, se souber)</label>'+linhas(2)+'</div><div class="ass"><div>Assinatura do colaborador (ciência)</div><div>Assinatura do gestor</div><div>Data da conversa</div></div></section>');
    h.push('<footer>Fatos apurados pelo Painel SGQ a partir do VHL, Tri7 e Senhas, comparados somente com a faixa normal de quem exerce a mesma função (metade central, dados reais da equipe). A taxa de erro conta só a etapa em que o erro ocorreu. Tempo de espera em fila não entra. Esta folha não traz ranking, dados de saúde nem remuneração. Qualquer número pode ser rastreado até o protocolo de origem e corrigido pelo Gestor da Qualidade.</footer>');
    h.push('</div></body></html>');
    return h.join(''); }
  function folhaRi(x){ return typeof trFmtRi==='function'?trFmtRi(x):String(x); }

  // ═════════ abrir e imprimir ═════════
  function paFolhaImprimir(k){
    var d=paFolhaDados(k); if (!d){ avisar('Sem dados desta pessoa no período para montar a folha.'); return; }
    var w=window.open('','_blank'); if (!w){ avisar('O navegador bloqueou a janela da folha. Libere pop-ups deste site e tente de novo.'); return; }
    w.document.open(); w.document.write(folhaHTML(d)); w.document.close(); w.focus();
    setTimeout(function(){ try{ w.print(); }catch(e){} }, 500); }

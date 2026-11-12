/* Painel SGQ · CRCO — js/ficha.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/ficha.js']='0.29.0';
  // ——— ficha do protocolo (log completo de como o painel calculou)
  function protLink(c){ return '<button type="button" class="lnk" data-prot="'+esc(c)+'" title="Ver ficha do protocolo">'+esc(c)+'</button>'; }
  function logDe(c, mesPref){
    var ms=Object.keys(state.logs).sort().reverse(); if (mesPref) ms.unshift(mesPref);
    for (var i=0;i<ms.length;i++){ var m=ms[i]; if (!state.logs[m]) continue; if (!state.logCache[m]) state.logCache[m]=Motor.decodificarLog(state.logs[m]); var L=state.logCache[m][c]; if (L) return L; }
    return null;
  }
  function atoDe(c){ var ms=Object.keys(state.docs).sort().reverse(); for (var i=0;i<ms.length;i++){ var A=state.docs[ms[i]].atos; for (var j=0;j<A.length;j++) if (A[j].c===c){ A[j].mes=ms[i]; return A[j]; } } return null; }
  function fichaProtocolo(c){
    c=String(c||'').trim().replace(/[^A-Za-z0-9\-]/g,'').toUpperCase(); var box=$('protBox'); state.protSel=c;
    if (!c){ box.hidden=true; return; }
    aplicarTri7(); var a=atoDe(c), L=logDe(c, a&&a.mes), inc=incTodos().filter(function(r){ return String(r.c)===c; });
    var h='<div class="sec-h"><h2>Protocolo<span class="prot-cod">'+esc(c)+'</span>'+(a?'<span class="prot-nat">'+esc(a.nat)+'</span>':'')+'</h2><span><button class="btn sm" type="button" id="protCopiar">Copiar resumo</button> <button class="btn sm" type="button" id="protFechar">Fechar</button></span></div>';
    var SF=!a?servFicha(c):''; if (!a && SF){ h=h.replace('<h2>Protocolo<','<h2>Documento<'); h+=SF; var incS=incTodos().filter(function(r){ return String(r.c).toUpperCase()===c; }); if (incS.length) h+=protInc(incS); box.innerHTML=h; box.hidden=false; box.scrollTop=0; state.protTxt='Documento '+c+': '+box.innerText.slice(0,600); return; }
    if (!a){
      h+='<div class="empty"><b>Não encontrei esse protocolo nos meses importados.</b>O painel guarda os atos <i>finalizados</i> (arquivados) nos meses carregados — '+(Object.keys(state.docs).sort().map(nomeMes).join(', ')||'nenhum')+'. Protocolo ainda em andamento, pesquisa qualificada ou de outro mês não aparece.</div>';
      var AF0=andFichaHTML(c); h+=AF0.h;
      if (inc.length) h+=protInc(inc);
      box.innerHTML=h; box.hidden=false; box.scrollTop=0; state.protTxt='Protocolo '+c+': não encontrado nos meses importados.'+AF0.txt; return;
    }
    var du=Motor.criarCalendario(state.extras||[]), fer=Motor.feriadoSet(state.extras||[]), D=function(d){ return Motor.isoDeDia(d); }, F=function(d){ return fmtData(D(d)); };
    var sit=a.cat==='R'?(ok(a)?(a.dentro?'Registrado dentro do prazo':'Fora do prazo, com justificativa'):'Registrado FORA do prazo'):a.cat==='N'?'Não registrado — '+(MOTIVOS_N[a.motivo]||'cancelado'):a.cat==='E'?'Abertura de matrícula + outros atos (fluxo especial, fora do KPI-02)':'Sem histórico suficiente (entrou antes do início da Produção por Etapa importada)';
    var ev=L?L.ev.slice().sort(function(x,y){ return x.d-y.d; }):[], rev=null; ev.forEach(function(e){ var n=semAc(e.et); if (n.indexOf('revisao oficial')>=0 && n.indexOf('previa')<0) rev=e.d; });
    var ing=a.ing?Motor.diaDeIso(a.ing):null;
    // explicação do bruto
    var exp=[], linhasTxt=[];
    exp.push(['Situação',sit]);
    exp.push(['Natureza',esc(a.nat)]);
    exp.push(['Ingresso',a.ing?fmtData(a.ing):'—']);
    if (a.cat==='R'||a.cat==='E'){
      if (a.medida==='R'){ var feriados=[]; if (ing!=null&&rev!=null) for (var d=ing+1; d<=rev; d++){ var w=((d%7)+7+4)%7; if (w!==0&&w!==6&&fer[d]) feriados.push(F(d)); }
        exp.push(['Registro',a.regSG?'<b>'+fmtData(a.reg)+'</b> — data do <b>Selos Gerados</b> no Tri7 (o registro saiu aí). A última Revisão Oficial no VHL foi em '+fmtData(a.regSG)+', depois do selo: é só o fechamento do fluxo.':'<b>'+fmtData(a.reg)+'</b> — data da última <b>Revisão Oficial</b> (quando o registro foi para o cliente). Imprimir Ficha e Arquivamento vêm depois e não contam.']);
        exp.push(['Bruto','<b>'+a.bruto+' dias úteis</b> entre o ingresso e o registro (o dia do ingresso não conta; sábados, domingos'+(feriados.length?' e feriados — '+feriados.join(', '):' e feriados')+' ficam fora).']); }
      else exp.push(['Bruto','<b>'+a.bruto+' dias úteis</b> — sem Revisão Oficial no histórico; usado o campo Prazo do VHL ('+a.pv+').']);
      var bLim=prazoBaseRI(a), mLim=cfgVal('ri.retornoMais',compAto(a)); exp.push(['Limite',(a.limCorr?'<b>'+a.limCorr+' dias corridos</b> — prazo próprio da natureza (Configuração): vence em '+fmtData(a.limVenc)+' (dia não útil passa para o próximo dia útil), o que equivale a '+a.lim+' dias úteis.':'<b>'+a.lim+' dias úteis</b> — '+(a.retUsado?'o título voltou em '+fmtData(a.retUsado)+' ('+a.retDu+'º dia útil, '+(a.retFonte==='Tri7'?'Re-análise no Tri7':'Re-Análise no VHL')+'): retorno + '+mLim+' dias úteis para registrar (art. 188, §1º, III), nunca menos que '+bLim+(a.retDu>bLim?'. O retorno aparece depois do '+bLim+'º dia útil — o cartório não registra título com prenotação vencida, então é erro de contagem/lançamento: vale '+(bLim+mLim):'')+'.':a.reing&&a.lim>bLim?(bLim+mLim)+' dias úteis: o título teve retorno'+(L&&L.st?' (constava nos Suspensos: '+esc(L.st)+')':'')+', mas sem data conhecida.':bLim+' dias úteis ('+(bLim===20?'art. 205 c/c art. 9º, §1º, da Lei 6.015/73':'prazo da Configuração')+').'))+' '+(a.dentro?'<span class="pill good">dentro</span>':'<span class="pill crit">acima</span>')+(justDe(a)?' <span class="pill good">justificado: '+esc(MOT_JUST[justDe(a).motivo]||'')+'</span>':'')]);
      if (a.liq!=null) exp.push(['Líquido','<b>'+a.liq+(a.liq===1?' dia útil':' dias úteis')+'</b> com o cartório = soma do Prazo de cada etapa até o registro: '+a.etapas.map(function(p){ return esc(p[0])+' '+p[1]; }).join(' + ')+(a.etapas.length?' = '+a.etapas.reduce(function(s,p){return s+p[1];},0):'')+(a.etapas.reduce(function(s,p){return s+p[1];},0)>a.bruto?' (limitado ao bruto)':'')+'.']);
      if (a.espera!=null) exp.push(['Espera','<b>'+a.espera+(a.espera===1?' dia útil':' dias úteis')+'</b> parado com o cliente (bruto − líquido).']);
      exp.push(['Retornos',(a.nex?a.nex+' exigência(s) cumprida(s)':'nenhuma exigência')+(a.npg?' · '+a.npg+' espera(s) de pagamento':'')+(a.nri?' · '+a.nri+' devolução(ões) interna(s)':'')+(a.nex>=2?' <span class="pill crit">2+ exigências</span>':'')+(a.exT?'<div class="mut" style="margin-top:3px">'+exExplica(a)+'</div>':'')]);
    } else if (a.cat==='N') exp.push(['Saída',a.fin?fmtData(a.fin):'—']);
    if (a.cat==='R' && a.bruto!=null && a.lim) h+=reguaPrazo(a, sit); // 0.28.0: régua do prazo
    h+='<div class="prot-grid">'+exp.map(function(x){ return '<div class="pk">'+x[0]+'</div><div class="pv">'+x[1]+'</div>'; }).join('')+'</div>';
    // linha do tempo única: etapas do VHL (dia) + andamentos do Tri7 (dia e hora)
    var TE=(andIndice()[c]||[]), AR=TE.length?andResumoHTML(TE):null, AF={h:'',txt:''};
    if (AR){ h+=AR.h; AF.txt=AR.txt; }
    if (ev.length||TE.length){
      var prev=null, susp=!!(L&&L.st)||a.nexV+a.npgV>0, linhasT=[];
      ev.forEach(function(e,i){ var n=semAc(e.et), nota=[], pos=POS_REG.test(n)||(rev!=null&&e.d>rev), re=/re-analise|revisao de exigencia/.test(n);
          if (prev!=null && e.d!==prev && !pos){ var gap=du(prev,e.d)-e.pz; if (gap>=1) nota.push(a.exT?'voltou após '+gap+' d.u. parado com o cliente <span class="mut">(motivo pelo Tri7)</span>':susp?(re?'<b>voltou após '+gap+' d.u. parado → exigência cumprida</b>':'<b>voltou após '+gap+' d.u. parado → retorno por pagamento</b>'):'intervalo de '+gap+' d.u. sem suspensão registrada'); else if (re && !a.exT) nota.push('devolução interna (sem tempo parado)'); }
          if (e.d===rev && n.indexOf('revisao oficial')>=0) nota.push('<span class="pill good">registro</span> última Revisão Oficial');
          if (pos) nota.push('<span class="mut">pós-registro — não conta no prazo</span>');
          if (!pos) prev=e.d;
          linhasTxt.push(F(e.d)+' · VHL · '+e.et+' · '+(e.rp||'—')+' · '+e.pz+' d.u.');
          linhasT.push({d:e.d, o:i, h:'<tr'+(pos?' style="opacity:.6"':'')+'><td>'+F(e.d)+'</td><td class="mut">—</td><td><span class="pill mute">VHL</span></td><td>'+esc(e.et)+'</td><td>'+esc(e.rp||'—')+'</td><td>'+e.pz+' d.u.</td><td>'+nota.join(' · ')+'</td></tr>'}); });
      TE.forEach(function(e){ var d=Math.floor(e.m/1440);
          linhasTxt.push(F(d)+' '+horaFmt(e.m)+' · Tri7 · '+andNome(e.s)+' · '+nomeLogin(e.u));
          linhasT.push({d:d, o:100000+e.m, h:'<tr class="tri"><td>'+F(d)+'</td><td>'+horaFmt(e.m)+'</td><td><span class="pill '+(AND_COR[e.s]||'mute')+'">Tri7</span></td><td>'+esc(andNome(e.s))+'</td><td>'+esc(nomeLogin(e.u))+'</td><td></td><td>'+(AND_LEITURA[e.s]||'')+'</td></tr>'}); });
      linhasT.sort(function(x,y){ return x.d-y.d || x.o-y.o; });
      h+='<div class="sub-h" style="margin-top:14px">Linha do tempo · VHL (etapas) + Tri7 (andamentos)</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Data</th><th>Hora</th><th>Fonte</th><th>Etapa / andamento</th><th>Quem</th><th>Prazo na etapa</th><th>Como o painel leu</th></tr></thead><tbody>'+linhasT.map(function(x){ return x.h; }).join('')+'</tbody></table></div>'+
        (TE.length?'':'<p class="hint">Sem andamentos deste protocolo no Relatório de andamentos do Tri7 importado.</p>');
    } else h+='<p class="hint" style="margin-top:12px">'+(Object.keys(state.logs).length?'Sem etapas deste protocolo na Produção por Etapa importada.':'Linha do tempo indisponível: reimporte os meses (Prazo + Produção por Etapa) para o painel guardar o histórico detalhado.')+'</p>';
    if (inc.length) h+=protInc(inc);
    var av=state.aval[idDoc(c)]; if (av) h+='<p class="hint">Avaliação das exigências: <b>'+esc(AV[av.resultado]||av.resultado)+'</b>'+(av.obs?' — '+esc(av.obs):'')+'</p>';
    box.innerHTML=h; box.hidden=false; box.scrollTop=0;
    state.protTxt='Protocolo '+c+' — '+a.nat+'\n'+sit+'\nIngresso: '+(a.ing?fmtData(a.ing):'—')+(a.reg?' · Registro (última Revisão Oficial): '+fmtData(a.reg):'')+(a.bruto!=null?'\nBruto: '+a.bruto+' d.u. · Limite: '+a.lim+' d.u.'+(a.liq!=null?' · Líquido: '+a.liq+' d.u. · Espera: '+a.espera+' d.u.':''):'')+(a.cat==='R'?'\nExigências: '+a.nex+(a.npg?' · Retornos por pagamento: '+a.npg:''):'')+(linhasTxt.length?'\n\nLinha do tempo:\n'+linhasTxt.join('\n'):'')+AF.txt;
  }
  // 0.28.0: régua do prazo — com o cartório, parado com o cliente, registro, limite e folga (ou atraso), em dias úteis
  function reguaPrazo(a, sit){
    var b=+a.bruto, lim=+a.lim, liq=a.liq!=null?Math.min(+a.liq,b):null, esp=liq!=null?Math.max(0,b-liq):null;
    var max=Math.ceil((Math.max(b,lim)+3)/5)*5, W=560, x0=2, px=(W-x0-8)/max, X=function(d){ return x0+d*px; };
    var dentro=!!a.dentro, fora=!dentro, cls=dentro?'good':(sit&&/justificativa/.test(sit)?'warn':'crit');
    var ico=cls==='good'?'<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>':cls==='crit'?'<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" stroke-width="2"/></svg>':'';
    var perto=Math.abs(b-lim)*px<70, aR=perto&&b<lim?'end':perto?'start':'middle', aL=perto&&b<lim?'start':perto?'end':'middle', dR=aR==='end'?-4:aR==='start'?4:0, dL=aL==='start'?4:aL==='end'?-4:0;
    var t='<svg viewBox="0 0 '+W+' 74" role="img" aria-label="'+esc('Registro no '+b+'º dia útil, limite de '+lim+' dias úteis'+(liq!=null?', '+liq+' com o cartório e '+esp+' parado com o cliente':''))+'">'+
      '<defs><pattern id="rgHach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--surface-2)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink-3)" stroke-width="2"/></pattern></defs>'+
      '<rect class="rg-fundo" x="'+X(0)+'" y="26" width="'+(X(max)-X(0))+'" height="16"/>'+
      (liq!=null?'<rect class="rg-liq" x="'+X(0)+'" y="26" width="'+(liq*px).toFixed(1)+'" height="16"/><rect class="rg-esp" x="'+X(liq).toFixed(1)+'" y="26" width="'+(esp*px).toFixed(1)+'" height="16"/>':'<rect class="rg-liq" x="'+X(0)+'" y="26" width="'+(b*px).toFixed(1)+'" height="16" opacity=".55"/>')+
      (dentro&&lim>b?'<line class="rg-folga" x1="'+(X(b)+5).toFixed(1)+'" x2="'+(X(lim)-5).toFixed(1)+'" y1="34" y2="34"/>'+((lim-b)*px>90?'<text class="rg-g" x="'+X((b+lim)/2).toFixed(1)+'" y="22" text-anchor="middle">folga de '+(lim-b)+' d.u.</text>':''):'')+
      (fora&&b>lim?'<line class="rg-atraso" x1="'+(X(lim)+3).toFixed(1)+'" x2="'+(X(b)-3).toFixed(1)+'" y1="34" y2="34"/>':'')+
      '<line class="rg-lim" x1="'+X(lim).toFixed(1)+'" x2="'+X(lim).toFixed(1)+'" y1="18" y2="50"/><text class="rg-b" x="'+(X(lim)+dL).toFixed(1)+'" y="12" text-anchor="'+aL+'">limite</text>'+
      '<line class="rg-mark" x1="'+X(b).toFixed(1)+'" x2="'+X(b).toFixed(1)+'" y1="18" y2="50"/><text class="rg-b" x="'+(X(b)+dR).toFixed(1)+'" y="'+(perto?62:12)+'" text-anchor="'+aR+'">registro</text>';
    for (var d=0; d<=max; d+=5) t+='<text x="'+X(d).toFixed(1)+'" y="'+(perto?74:64)+'" text-anchor="'+(d===0?'start':d===max?'end':'middle')+'">'+d+(d===max?' d.u.':'')+'</text>';
    t+='</svg>';
    return '<div class="prot-regua"><div class="prot-regua-h"><span class="selo '+cls+'">'+ico+esc(dentro?'Registrado no prazo':sit)+'</span><span><b>'+b+'</b> de <b>'+lim+'</b> dias úteis'+(fora&&b>lim?' · <b style="color:var(--crit)">'+(b-lim)+'</b> além do limite':'')+'</span></div>'+t+
      (liq!=null?'<div class="rg-leg"><span><i class="l"></i>com o cartório '+numBR(liq,1)+'</span><span><i class="e"></i>parado com o cliente '+numBR(esp,1)+'</span></div>':'<div class="rg-leg"><span>Sem o histórico de etapas, não dá para separar o tempo com o cartório do tempo parado.</span></div>')+'</div>'; }
  function protInc(inc){ return '<div class="sub-h" style="margin-top:14px">Inconformidades deste protocolo ('+inc.length+')</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Data</th><th>Responsável</th><th>Tipo</th><th>Erro</th><th>Observação</th></tr></thead><tbody>'+
    inc.map(function(r){ return '<tr><td>'+fmtData(r.d)+'</td><td>'+esc(r.r)+'</td><td>'+(grupoDe(r)==='E'?'Externo':'Interno')+'</td><td>'+esc(catDe(r))+'</td><td style="min-width:240px">'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table></div>'; }
  function andNome(s){ return Motor.AND_NOME[s]||s; }
  function minFmt(m){ var s=Motor.isoMin(m); return s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(2,4)+' '+s.slice(11,16); }
  function horaFmt(m){ return Motor.isoMin(m).slice(11,16); }
  function andIndice(){ // protocolo -> eventos (todos os meses carregados)
    if (state.andIdx) return state.andIdx; var ix={};
    Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ if (e.t!=='P') return; (ix[e.n]=ix[e.n]||[]).push(e); }); });
    Object.keys(ix).forEach(function(k){ ix[k].sort(function(a,b){ return a.m-b.m; }); });
    state.andVer=(state.andVer||0)+1;
    return state.andIdx=ix;
  }
  // exigência redigida = Revisão de Exigência que virou Nota de Exigência (pode virar cobrança de custas, aí não conta)
  function reVirouNota(L, i){ for (var j=i+1;j<L.length;j++){ var s=L[j].s; if (s==='NE') return true; if (s==='CI'||s==='AP'||s==='RA'||s==='SG'||s==='RE') return false; } return false; }
  function duCal(){ var k=(state.extras||[]).join(','); if (k!==duCalK){ duCalK=k; duCalF=Motor.criarCalendario(state.extras||[]); } return duCalF; }

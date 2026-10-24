/* Painel SGQ · CRCO — js/pendencias.js (0.25.0: Minhas pendências — o que falta fazer, de todos os meses, numa tela só; a ação fica na própria linha) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/pendencias.js']='0.25.0';
  // todos os atos de todos os meses (sem o filtro de período; respeita a origem escolhida no topo)
  function pendAtos(){ if (typeof aplicarTri7==='function') aplicarTri7(); var o=[]; Object.keys(state.docs).sort().forEach(function(m){ o=o.concat(atosDoMes(m)); }); return o; }
  function pendDados(){
    var A=pendAtos(), P={};
    // 1. fora do prazo sem motivo, a partir do marco
    P.fp=A.filter(function(a){ return a.cat==='R' && !a.dentro && !justDe(a) && obrig(a); }).sort(function(a,b){ return (b.bruto||0)-(a.bruto||0); });
    // 2. títulos com 2+ exigências e indício de dupla, sem avaliação, a partir do marco
    P.ex=A.filter(function(a){ if ((a.nex||0)<2 || !obrig(a) || state.aval[idDoc(a.c)]) return false; return exIndicio(a).sim; }).sort(function(a,b){ return b.nex-a.nex || (a.c<b.c?-1:1); });
    // 3. cancelados no Tri7 ainda abertos no VHL (tarefa da equipe)
    var CT=cancSoTri7(); P.ct=[]; Object.keys(CT).sort().forEach(function(m){ P.ct=P.ct.concat(CT[m]); });
    // 4. aprendizagens com a janela encerrada e sem avaliação
    P.apr=(typeof aprLista==='function'?aprLista():[]).filter(function(a){ if (a.status==='concluido') return false; try{ var R=aprAval(a); return !R.mede||R.acabou; }catch(e){ return false; } });
    // 5. fontes incompletas no último mês fechado · 6. KPIs do último mês fechado ainda não lançados
    var ult=mesAnt(mesHoje()); P.ult=ult; P.sau=[]; P.kp=[];
    if (typeof saudeMes==='function' && (state.docs[ult]||state.senhas[ult]||state.cert[ult])){ var o=saudeMes(ult); P.sau=Object.keys(o).filter(function(k){ return o[k].nivel==='at'||o[k].nivel==='falta'; }).map(function(k){ return o[k]; }); }
    var L=(state.kp[ult]&&state.kp[ult].lanc)||{}; P.kp=KPIS.filter(function(K){ return !K.fora && !L[K.id]; });
    P.n=P.fp.length+P.ex.length+P.apr.length+P.sau.length+P.kp.length;
    return P; }
  function pendBadge(){ var b=$('pendN'); if (!b) return; var n=0; try{ n=pendDados().n; }catch(e){ n=0; } b.hidden=!n; b.textContent=n>99?'99+':String(n); }
  function pendBloco(id, tit, n, sub, corpo, acao){
    return '<section class="pend-b" id="pend-'+id+'"><div class="pend-h"><h3>'+tit+' <span class="pill '+(n?'warn':'good')+'">'+(n?n.toLocaleString('pt-BR'):'em dia')+'</span></h3>'+(acao||'')+'</div>'+(sub?'<p class="hint" style="margin:2px 0 8px">'+sub+'</p>':'')+(n?corpo:'')+'</section>'; }
  function renderPendencias(){
    var el=$('tabPend'); if (!el) return; var P=pendDados(), MAX=25;
    var opts=Object.keys(MOT_JUST).map(function(k){ return '<option value="'+k+'">'+MOT_JUST[k]+'</option>'; }).join('');
    var h='<div class="sec-h"><span class="note">Tudo o que pede ação sua, de todos os meses. Resolva na própria linha; cada ação mostra "Desfazer" por 10 segundos.</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+[['fp','Fora do prazo sem motivo',P.fp.length],['ex','Exigências a avaliar',P.ex.length],['apr','Aprendizagens a avaliar',P.apr.length],['kp','KPIs a lançar · '+nomeMes(P.ult),P.kp.length+P.sau.length]].map(function(x){
      return '<a class="kpi pend-k'+(x[2]?' canc':'')+'" href="#pend-'+x[0]+'"><span class="l">'+x[1]+'</span><span class="v">'+x[2]+'</span><span class="s">'+(x[2]?'ver abaixo':'nada pendente')+'</span></a>'; }).join('')+'</div>';
    // 1. fora do prazo
    h+=pendBloco('fp','Justificar fora do prazo',P.fp.length,'Registrados acima do limite a partir de '+nomeMes(marco())+'. Com motivo, contam como no prazo no KPI-02.',
      '<div class="tbl-wrap" style="max-height:420px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Mês</th><th>Bruto</th><th>Limite</th><th>Motivo</th><th>Observação</th><th></th></tr></thead><tbody>'+
      P.fp.slice(0,MAX).map(function(a){ return '<tr data-cod="'+esc(a.c)+'"><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+esc(nomeMes(a.mes||String(a.fin).slice(0,7)))+'</td><td>'+a.bruto+'</td><td>'+a.lim+'</td><td><select class="mini" aria-label="Motivo">'+opts+'</select></td><td><input class="mini" type="text" placeholder="Ex.: confrontante notificado em 10/06" aria-label="Observação"></td><td><button class="btn primary sm" type="button" data-just-salvar="1">Justificar</button></td></tr>'; }).join('')+'</tbody></table></div>'+
      (P.fp.length>MAX?'<p class="hint">Mostrando '+MAX+' de '+P.fp.length+'. Os outros estão em <button type="button" class="lnk" data-pendir="fp">Justificar fora do prazo</button>.</p>':''),
      '<button type="button" class="btn sm" data-pendir="fp">Abrir a lista completa</button>');
    // 2. exigências
    h+=pendBloco('ex','Avaliar títulos com 2+ exigências',P.ex.length,'Só os que têm indício de dupla exigência (inconformidade ligada à exigência), a partir de '+nomeMes(marco())+'.',
      '<div class="tbl-wrap" style="max-height:420px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Mês</th><th>Exigências</th><th>Por que pede avaliação</th><th>Avaliação</th><th>Observação</th><th></th></tr></thead><tbody>'+
      P.ex.slice(0,MAX).map(function(a){ var x=exIndicio(a), mot=x.I.filter(function(m){ return m.sim; }).map(function(m){ return m.r.r+' · '+catDe(m.r); })[0]||'';
        return '<tr data-cod="'+esc(a.c)+'"><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+esc(nomeMes(a.mes||String(a.fin).slice(0,7)))+'</td><td><b>'+a.nex+'</b></td><td class="tl" data-tip="'+esc(esc(x.txt).replace(/\n/g,'<br>'))+'">'+esc(mot)+'</td>'+
          '<td><select class="mini" aria-label="Avaliação">'+Object.keys(AV).map(function(k){ return '<option value="'+k+'">'+AV[k]+'</option>'; }).join('')+'</select></td><td><input class="mini" type="text" placeholder="Ex.: cliente trouxe certidão vencida" aria-label="Observação"></td><td><button class="btn sm" type="button" data-av-salvar="1">Salvar</button></td></tr>'; }).join('')+'</tbody></table></div>'+
      (P.ex.length>MAX?'<p class="hint">Mostrando '+MAX+' de '+P.ex.length+'.</p>':''),
      '<button type="button" class="btn sm" data-pendir="ex">Abrir em Exigências</button>');
    // 4. aprendizagens
    h+=pendBloco('apr','Avaliar aprendizagens',P.apr.length,'Janela de acompanhamento encerrada, falta a sua decisão (Apto / Não apto) e o feedback.',
      '<ul class="pend-l">'+P.apr.map(function(a){ return '<li><b>'+esc(a.nome||'')+'</b> · '+esc(a.pop||'')+(a.treino?' · treinado em '+fmtData(a.treino):'')+' <button type="button" class="lnk" data-pendapr="'+esc(a.id)+'">Avaliar →</button></li>'; }).join('')+'</ul>',
      '<button type="button" class="btn sm" data-pendir="apr">Abrir Aprendizagem</button>');
    // 5 e 6. fechamento do mês
    var corpoKp=(P.sau.length?'<p style="margin:0 0 4px"><b>Antes de lançar, falta importar ou completar:</b></p><ul class="pend-l">'+P.sau.map(function(o){ return '<li>'+esc(o.fonte)+': '+esc(o.txt)+(o.dica?' <span class="mut">'+esc(o.dica)+'</span>':'')+'</li>'; }).join('')+'</ul>':'')+
      (P.kp.length?'<p style="margin:8px 0 4px"><b>Indicadores ainda não marcados como lançados no ANOREG+:</b></p><div class="pend-chips">'+P.kp.map(function(K){ return '<button type="button" class="chip" data-pendkpi="'+esc(K.id)+'">'+esc(K.id)+' · '+esc(K.nome)+'</button>'; }).join('')+'</div>':'');
    h+=pendBloco('kp','Fechar '+nomeMes(P.ult)+' (último mês fechado)',P.kp.length+P.sau.length,'',corpoKp,
      '<span class="ctl"><button type="button" class="btn sm" data-pendir="sau">Saúde dos dados</button><button type="button" class="btn sm" data-pendir="lanc">Lançar KPIs</button></span>');
    // 3. tarefa da equipe
    h+=pendBloco('ct','Para a equipe · finalizar no VHL o que já foi cancelado no Tri7',P.ct.length,'Não conta no seu contador. Enquanto não forem finalizados no VHL, contam pelo Tri7.',
      '<p style="margin:0"><button type="button" class="btn sm cp" data-cp="'+esc(P.ct.map(function(a){ return a.c; }).join('\n'))+'">Copiar os '+P.ct.length+' protocolos</button></p><div class="tbl-wrap" style="max-height:260px;margin-top:8px"><table class="tleft"><thead><tr><th>Protocolo</th><th>Cancelado no Tri7</th><th>Quem cancelou</th></tr></thead><tbody>'+
      P.ct.map(function(a){ return '<tr><td>'+protLink(a.c)+'</td><td>'+fmtData(a.fin)+'</td><td class="tl">'+esc(nomeLogin(a.u))+'</td></tr>'; }).join('')+'</tbody></table></div>');
    el.innerHTML=h; pendBadge();
  }
  function pendClique(t){
    if (t.dataset.pendir){ var k=t.dataset.pendir; if (k==='ex'){ state.filtroEx='pend'; if (state.periodo!=='todos'){ state.periodo='todos'; render(); } } if (k==='fp'&&state.periodo!=='todos'){ state.periodo='todos'; render(); } if (k==='lanc') state.lancMes=mesAnt(mesHoje()); irAba(k); return true; }
    if (t.dataset.pendapr){ state.aprAberto=t.dataset.pendapr; irAba('apr'); setTimeout(function(){ var c=document.querySelector('[data-aprabrir="'+t.dataset.pendapr+'"]'); if (c&&c.scrollIntoView) c.scrollIntoView({block:'center'}); },80); return true; }
    if (t.dataset.pendkpi){ state.lancMes=mesAnt(mesHoje()); state.lancSel=t.dataset.pendkpi; irAba('lanc'); return true; }
    return false; }

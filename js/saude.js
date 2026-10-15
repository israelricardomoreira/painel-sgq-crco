/* Painel SGQ · CRCO — js/saude.js (0.14.0: página Saúde dos dados — cobertura de cada fonte mês a mês e aviso de mês incompleto antes de lançar) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/saude.js']='0.17.0';
  // Antes deste mês, Tri7 parcial, certidões sem natureza e atos sem histórico são limitação conhecida (decisão de não reimportar jan–set/2026)
  var SAUDE_MARCO='2026-10';
  var SD_NIVEL={ok:['good','ok'], at:['warn','atenção'], falta:['crit','falta'], lim:['mute','limitação conhecida'], na:['mute','—']};
  function sdDia(iso){ var p=String(iso).slice(0,10).split('-').map(Number); return Math.floor(Date.UTC(p[0],p[1]-1,p[2])/864e5); }
  function sdIso(n){ return new Date(n*864e5).toISOString().slice(0,10); }
  function sdUteis(m){ // dias úteis do mês (até hoje, se for o mês corrente)
    var du=duCal(), p=m.split('-').map(Number), ini=Math.floor(Date.UTC(p[0],p[1]-1,1)/864e5), fim=Math.floor(Date.UTC(p[0],p[1],1)/864e5), hoje=sdDia(new Date().toISOString()), out=[];
    for (var d=ini; d<fim; d++){ if (m===mesHoje() && d>hoje) break; if (du(d,d+1)===1) out.push(d); }
    return out; }
  function sdItem(fonte, nivel, txt, dica){ return {fonte:fonte, nivel:nivel, txt:txt, dica:dica||''}; }
  // Confere um mês e devolve um item por fonte
  function saudeMes(m){
    var fech=m<mesHoje(), U=sdUteis(m), ultU=U.length?U[U.length-1]:null, antes=m<SAUDE_MARCO, out={};
    var limOu=function(n){ return antes?'lim':n; };
    var d=state.docs[m];
    // VHL · Prazo e Tempo Médio (PAINEL-01)
    if (!d) out.vhl=sdItem('VHL · Prazo (PAINEL-01)','falta','não importado','Sem o PAINEL-01 o mês não tem atos do RI.');
    else { var fins=d.atos.map(function(a){ return a.fin; }).filter(Boolean).sort(), ate=fins.length?fins[fins.length-1]:null;
      if (!fech) out.vhl=sdItem('VHL · Prazo (PAINEL-01)','at','mês em andamento'+(ate?' · até '+fmtData(ate):''),'O mês ainda não fechou.');
      else if (ate && ultU!=null && U.filter(function(x){ return x>sdDia(ate); }).length>1) out.vhl=sdItem('VHL · Prazo (PAINEL-01)','at','até '+fmtData(ate),'O último dia útil do mês é '+fmtData(sdIso(ultU))+'. Reimporte o PAINEL-01 com o mês inteiro.');
      else out.vhl=sdItem('VHL · Prazo (PAINEL-01)','ok',d.atos.length+' atos'); }
    // VHL · Produção por Etapa (PAINEL-02)
    if (d){ var og=(d.raw&&d.raw.origem)||{}, inc=(d.raw&&d.raw.incompletos)||0, efim=og.etapaFim||null;
      if (efim && ultU!=null && sdDia(efim)<Math.min(ultU, sdDia(new Date().toISOString())-1) && fech) out.eta=sdItem('VHL · Produção por Etapa (PAINEL-02)','at','até '+fmtData(efim),'A Produção por Etapa importada termina antes do fim do mês: o registro e o retorno dos últimos dias podem faltar.');
      else if (inc) out.eta=sdItem('VHL · Produção por Etapa (PAINEL-02)',limOu('at'),inc+' sem histórico','Atos prenotados antes do início da Produção por Etapa importada ('+(og.etapaIni?fmtData(og.etapaIni):'?')+'). Ficam fora do KPI-02.'+(antes?' Limitação conhecida: decidimos não reimportar.':' Importe a Produção por Etapa dos meses anteriores.'));
      else out.eta=sdItem('VHL · Produção por Etapa (PAINEL-02)','ok','mês inteiro',efim?'Produção por Etapa importada de '+(og.etapaIni?fmtData(og.etapaIni):'?')+' a '+fmtData(efim)+'.':''); }
    else out.eta=sdItem('VHL · Produção por Etapa (PAINEL-02)','na','—');
    // Tri7 · Relatório de andamentos
    if (!state.andam[m]) out.tri=sdItem('Tri7 · andamentos',limOu('falta'),'não importado','Sem o Tri7, a data do registro, o retorno e o cancelamento saem só pela regra do VHL.');
    else if (d){ var ix=andIndice(), R=d.atos.filter(function(a){ return a.cat==='R'; }), com=R.filter(function(a){ return ix[String(a.c)]; }).length, pc=R.length?com/R.length*100:100;
      out.tri=pc<95?sdItem('Tri7 · andamentos',limOu('at'),pct(pc)+' dos registros','Só '+com+' de '+R.length+' atos registrados têm andamento do Tri7.'+(antes?' Limitação conhecida: decidimos não reimportar.':' Importe o Relatório de andamentos do mês inteiro.')):sdItem('Tri7 · andamentos','ok',pct(pc)+' dos registros'); }
    else out.tri=sdItem('Tri7 · andamentos','ok',state.andam[m].length+' andamentos');
    // Inconformidades (PAINEL-04)
    var ic=state.inconf[m];
    if (!ic || !ic.length) out.inc=sdItem('Inconformidades (PAINEL-04)',fech?'falta':'at','não importadas','O KPI-01 do mês fica sem as inconformidades.');
    else { var ds=ic.map(function(r){ return r.d; }).filter(Boolean).sort(), ateI=ds[ds.length-1], gap=ultU!=null?U.filter(function(x){ return x>sdDia(ateI); }).length:0;
      out.inc=(fech&&gap>1)?sdItem('Inconformidades (PAINEL-04)','at','até '+fmtData(ateI)+' · '+ic.length,'Faltam '+gap+' dias úteis no fim do mês. Confira se as inconformidades já foram todas moderadas e reimporte.'):sdItem('Inconformidades (PAINEL-04)','ok',ic.length+' · até '+fmtData(ateI)); }
    // Outras serventias
    out.srv=state.serv[m]?sdItem('Outras serventias','ok',state.serv[m].length+' documentos'):sdItem('Outras serventias',fech?'falta':'at','não importado','Os documentos de RC, RTD/PJ e Intimações saem do mesmo PAINEL-01 + PAINEL-02.');
    // Certidões (Tri7)
    var ce=state.cert[m];
    if (!ce) out.cer=sdItem('Certidões (Tri7)',fech?'falta':'at','não importadas','');
    else { var nNat=ce.recs.filter(function(r){ return r.nat; }).length;
      out.cer=(ce.recs.length && !nNat)?sdItem('Certidões (Tri7)',limOu('at'),ce.recs.length+' · sem natureza','O fluxo de intimação usa a regra antiga por pessoa.'+(antes?' Limitação conhecida: a natureza passou a ser gravada a partir de out/2026.':' Reimporte o Relatório de andamentos do mês.')):sdItem('Certidões (Tri7)','ok',ce.recs.length+(nNat<ce.recs.length?' · '+nNat+' c/ natureza':'')); }
    // Senhas (PAINEL-05)
    var se=state.senhas[m];
    if (!se) out.sen=sdItem('Senhas (PAINEL-05)',fech?'falta':'at','não importadas','Sem as senhas o KPI-13 não sai.');
    else { var dias={}; se.L.forEach(function(x){ dias[x.dia]=1; }); var nd=Object.keys(dias).length, falt=U.filter(function(x){ return !dias[sdIso(x)]; });
      out.sen=falt.length>1?sdItem('Senhas (PAINEL-05)','at',nd+' de '+U.length+' dias','Dias úteis sem senha: '+falt.slice(0,6).map(function(x){ return fmtData(sdIso(x)).slice(0,5); }).join(', ')+(falt.length>6?'…':'')+'. Confira se a exportação pegou o mês inteiro.'):sdItem('Senhas (PAINEL-05)','ok',nd+' de '+U.length+' dias'); }
    // Folha (KPI-09)
    var k9=Object.keys(state.k9||{}).sort()[0];
    out.fol=state.k9[m]?sdItem('Folha · eventos (KPI-09)','ok','importada',state.k9[m].periodo?'Período da folha: '+state.k9[m].periodo+'.':''):(k9&&m>k9?sdItem('Folha · eventos (KPI-09)',fech?'falta':'at','não importada','Sem a folha, o KPI-09 e a quantidade de colaboradores do KPI-08 não saem.'):sdItem('Folha · eventos (KPI-09)','na','lançado à mão','Antes da importação da folha, o KPI-09 foi lançado direto no ANOREG+.'));
    return out;
  }
  var SD_COLS=[['vhl','PAINEL-01'],['eta','PAINEL-02'],['tri','Tri7'],['inc','Inconf.'],['srv','Outras serv.'],['cer','Certidões'],['sen','Senhas'],['fol','Folha']];
  function sdPior(o){ var ord={falta:3,at:2,lim:1,ok:0,na:0}, p='ok'; Object.keys(o).forEach(function(k){ if (ord[o[k].nivel]>ord[p]) p=o[k].nivel; }); return p; }
  function sdPill(it){ var n=SD_NIVEL[it.nivel]; return '<span class="pill '+n[0]+'">'+n[1]+'</span>'; }
  function saudeMeses(){ var o={}; [state.docs,state.serv,state.inconf,state.cert,state.senhas,state.andam].forEach(function(x){ Object.keys(x||{}).forEach(function(m){ if (/^\d{4}-\d{2}$/.test(m)) o[m]=1; }); }); return Object.keys(o).sort().reverse(); }
  // Aviso no topo do Lançar KPIs: o que está incompleto no mês escolhido
  function saudeAvisoLanc(m){ if (!m) return ''; if (m>=mesHoje()) return '<div class="banner warn sd-aviso"><b>'+esc(nomeMes(m))+' ainda está em andamento:</b> os dados do mês não estão completos. Lance depois do fechamento, com tudo importado. <button class="btn sm" type="button" data-go-sau="1">Ver Saúde dos dados</button></div>';
    var o=saudeMes(m), L=Object.keys(o).filter(function(k){ return o[k].nivel==='at'||o[k].nivel==='falta'; });
    if (!L.length) return '';
    return '<div class="banner warn sd-aviso"><b>Antes de lançar '+esc(nomeMes(m))+':</b> '+L.map(function(k){ return esc(o[k].fonte)+' — '+esc(o[k].txt); }).join(' · ')+'. <button class="btn sm" type="button" data-go-sau="1">Ver Saúde dos dados</button></div>'; }
  function renderSau(){
    var el=$('tabSau'); if (!el) return; var ms=saudeMeses();
    var j=(window.nuvem&&window.nuvem.janela)?window.nuvem.janela():null;
    var h='<div class="sec-h"><span class="note">O que foi importado de cada fonte, mês a mês. Confira o mês aqui antes de lançar: "atenção" e "falta" mudam o número do indicador; "limitação conhecida" é um ponto já analisado e aceito.</span></div>';
    if (j && j.corte) h+='<div class="sd-jan"><span>Carregados os meses a partir de <b>'+esc(nomeMes(j.corte))+'</b> (12 meses).'+(j.completo?' Os meses anteriores também foram carregados.':'')+'</span>'+(!j.completo&&j.temAnteriores?' <button class="btn sm" type="button" data-carregar-ant="1">Carregar meses anteriores</button>':(!j.completo&&j.temAnteriores===false?' <span class="mut">Não há meses anteriores no banco.</span>':''))+'</div>';
    if (!ms.length){ el.innerHTML=h+'<div class="empty"><b>Nenhum dado importado</b>Abra Importar dados para começar.</div>'; return; }
    var ult=ms.filter(function(m){ return m<mesHoje(); })[0];
    if (ult){ var o=saudeMes(ult), p=sdPior(o), L=Object.keys(o).filter(function(k){ return o[k].nivel==='at'||o[k].nivel==='falta'; });
      h+='<div class="sd-res '+(L.length?'at':'ok')+'"><b>'+esc(nomeMes(ult))+' (último mês fechado): '+(L.length?'confira antes de lançar':'pronto para lançar')+'</b>'+(L.length?'<ul>'+L.map(function(k){ return '<li>'+esc(o[k].fonte)+': '+esc(o[k].txt)+(o[k].dica?' <span class="mut">'+esc(o[k].dica)+'</span>':'')+'</li>'; }).join('')+'</ul>':'<span class="mut"> Todas as fontes cobrem o mês inteiro'+(p==='lim'?' (com limitações conhecidas)':'')+'.</span>')+'</div>'; }
    h+='<div class="tbl-wrap sd-tab"><table><thead><tr><th class="tleft">Mês</th>'+SD_COLS.map(function(c){ return '<th>'+c[1]+'</th>'; }).join('')+'</tr></thead><tbody>'+
      ms.map(function(m){ var o=saudeMes(m);
        return '<tr><td class="tleft"><b>'+esc(nomeMes(m))+'</b></td>'+SD_COLS.map(function(c){ var it=o[c[0]]; return '<td data-tip="'+esc('<b>'+it.fonte+' · '+nomeMes(m)+'</b><br>'+SD_NIVEL[it.nivel][1]+': '+esc(it.txt)+(it.dica?'<br>'+esc(it.dica):''))+'">'+sdPill(it)+'<small>'+esc(it.txt)+'</small></td>'; }).join('')+'</tr>'; }).join('')+
      '</tbody></table></div>'+
      '<p class="hint"><span class="pill good">ok</span> cobre o mês inteiro · <span class="pill warn">atenção</span> importado pela metade ou mês em andamento · <span class="pill crit">falta</span> não importado · <span class="pill mute">limitação conhecida</span> analisado e aceito (meses antes de out/2026: Tri7 parcial de janeiro, certidões sem natureza e atos sem histórico). Passe o mouse em cada célula para ver o detalhe.</p>';
    el.innerHTML=h;
  }

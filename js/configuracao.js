/* Painel SGQ · CRCO — js/configuracao.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/configuracao.js']='0.12.0';
  function compAto(a){ return a.mes||(a.fin||'').slice(0,7)||'9999-99'; }
  function cfgDef(key, comp){ var d=CFG_DEF[key]; if (d){ var v=null; d.def.forEach(function(e){ if (e[0]<=comp) v=e[1]; }); return v; }
    if (key.indexOf('serv.prazo|')===0){ var x=state.prazosServ[key.slice(11)]; return x==null||x===''?null:+x; }
    return null; } // ri.prazoNat|… sem valor = herda o prazo da prenotação
  function cfgVal(key, comp){ comp=comp||'9999-99'; var L=state.apur.itens[key]||[], v=null, achou=false; L.forEach(function(e){ if (e.de<=comp){ v=e.v; achou=true; } }); return (!achou||v===null)?cfgDef(key,comp):v; }
  function cfgS(key){ var v=state.apur.simples[key]; return v==null?CFG_SIMPLES[key].def:v; }
  function marco(){ return cfgS('pend.marco'); }
  function prazoBaseRI(a){ var c=compAto(a), n=cfgVal('ri.prazoNat|'+a.nat,c); if (n&&typeof n==='object') n=n.un==='c'?null:n.n; return n!=null&&n>=0?n:cfgVal('ri.prazoBase',c); }
  // 0.10.7: prazo em dias corridos → vencimento = ingresso + N dias; caindo em dia não útil, vence no próximo dia útil (CC, art. 132, §1º); o limite vira o nº de dias úteis até o vencimento
  function utilDia(du,d){ return du(d,d+1)===1; }
  function vencCorridos(du, ing, n){ var f=ing+n; for (var i=0;i<30 && !utilDia(du,f);i++) f++; return f; }
  function nomeUsuario(){ try{ return (window.nuvem&&window.nuvem.nome&&window.nuvem.nome())||''; }catch(e){ return ''; } }
  function cfgFmt(key, v){ var d=CFG_DEF[key]||CFG_SIMPLES[key]||{tipo:'num',un:'d.u.'}; if (v==null||(typeof v==='number'&&v<0)) return key.indexOf('ri.prazoNat|')===0?'herda':'sem prazo'; if (typeof v==='object') return v.n+(v.un==='c'?' dias corridos':' d.u.'); if (d.tipo==='bool') return v?'Sim':'Não'; if (d.tipo==='mes') return compLabel(v); return String(v)+(d.un?' '+d.un:''); }
  function mesHoje(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2); }
  function apurLog(item, de, para, vale, motivo){ state.apur.hist.unshift({item:item, de:de, para:para, vale:vale, em:new Date().toISOString(), por:nomeUsuario(), motivo:motivo||''}); }
  function apurSalvar(){ state.apurVer++; if (dbPronto&&podeEscrever) db.doc('config/apuracao').set(state.apur).catch(function(){ toast('Não consegui salvar a configuração'); }); render(); renderCfg(); }
  function cfgRotulo(key){ if (CFG_DEF[key]) return CFG_DEF[key].nome; if (CFG_SIMPLES[key]) return CFG_SIMPLES[key].nome; if (key.indexOf('ri.prazoNat|')===0) return 'Prazo da natureza (RI): '+key.slice(12); if (key.indexOf('serv.prazo|')===0) return 'Prazo da natureza: '+key.slice(11).replace('|',' · '); return key; }
  function cfgMudar(key, v, de, motivo){
    var rot=cfgRotulo(key);
    if (CFG_SIMPLES[key]){ var a=cfgS(key); state.apur.simples[key]=v; apurLog(rot, cfgFmt(key,a), cfgFmt(key,v==null?CFG_SIMPLES[key].def:v), 'imediato', motivo); return apurSalvar(); }
    var ant=cfgVal(key,de), e={de:de, v:v, em:new Date().toISOString(), por:nomeUsuario(), motivo:motivo};
    var L=state.apur.itens[key]=(state.apur.itens[key]||[]).filter(function(x){ return x.de!==de; }); L.push(e); L.sort(function(x,y){ return x.de<y.de?-1:x.de>y.de?1:0; });
    apurLog(rot, cfgFmt(key,ant), v==null?'padrão ('+cfgFmt(key,cfgDef(key,de))+')':cfgFmt(key,v), compLabel(de), motivo); apurSalvar();
  }
  function cfgVigencias(key){ // texto curto: como o valor varia no tempo
    var marcos={}; (CFG_DEF[key]?CFG_DEF[key].def.map(function(e){ return e[0]; }):['0000-00']).concat((state.apur.itens[key]||[]).map(function(e){ return e.de; })).forEach(function(m){ marcos[m]=1; });
    var ms=Object.keys(marcos).sort(), out=[], ult=null; ms.forEach(function(m){ var v=cfgFmt(key,cfgVal(key,m)); if (v!==ult){ out.push((m==='0000-00'?'desde o início':'desde '+compLabel(m))+': <b>'+esc(v)+'</b>'); ult=v; } });
    return out.join(' · '); }
  function cfgMesesOpc(sel){ var s={}; Object.keys(state.docs).concat(Object.keys(state.serv)).forEach(function(m){ s[m]=1; }); var h=mesHoje(), y=+h.slice(0,4), mm=+h.slice(5); for (var i=0;i<4;i++){ s[y+'-'+('0'+mm).slice(-2)]=1; mm++; if (mm>12){ mm=1; y++; } }
    return Object.keys(s).sort().map(function(m){ return '<option value="'+m+'"'+(m===sel?' selected':'')+'>'+compLabel(m)+'</option>'; }).join(''); }
  function cfgForm(key){
    var d=CFG_DEF[key]||CFG_SIMPLES[key]||{tipo:'num'}, simples=!!CFG_SIMPLES[key], atual=simples?cfgS(key):cfgVal(key,mesHoje()), campo;
    if (d.tipo==='bool') campo='<select id="cfgV" class="mini"><option value="1"'+(atual?' selected':'')+'>Sim</option><option value="0"'+(atual?'':' selected')+'>Não</option></select>';
    else if (d.tipo==='mes') campo='<select id="cfgV" class="mini">'+cfgMesesOpc(atual)+'</select>';
    else { var natK=key.indexOf('serv.prazo|')===0||key.indexOf('ri.prazoNat|')===0, nA=atual&&typeof atual==='object'?atual.n:(atual!=null&&atual>=0?atual:''), uA=atual&&typeof atual==='object'&&atual.un==='c'?'c':'u';
      campo='<input id="cfgV" type="number" min="0" max="999" class="mini" style="width:6em" value="'+esc(nA)+'"'+(key.indexOf('serv.prazo|')===0||key.indexOf('ri.prazoNat|')===0?' placeholder="vazio = '+(key.indexOf('ri.')===0?'herda':'sem prazo')+'"':'')+'>'+(natK?' <select id="cfgUn" class="mini"><option value="u"'+(uA==='u'?' selected':'')+'>dias úteis</option><option value="c"'+(uA==='c'?' selected':'')+'>dias corridos</option></select>':''); }
    return '<div class="cfg-form"><label>Novo valor '+campo+'</label>'+(simples?'':'<label>Vale a partir de <select id="cfgDe" class="mini">'+cfgMesesOpc(mesHoje())+'</select></label>')+
      '<label class="cfg-mot">Motivo (obrigatório) <input id="cfgMot" type="text" class="mini" maxlength="300" placeholder="ex.: Lei, decisão da análise crítica, erro de cadastro"></label>'+
      '<span class="cfg-bt"><button type="button" class="btn sm" data-cfgsalvar="'+esc(key)+'">Salvar</button>'+(simples?'':'<button type="button" class="btn sm" data-cfgpadrao="'+esc(key)+'">Voltar ao padrão</button>')+'<button type="button" class="btn sm" data-cfgcancel="1">Cancelar</button></span>'+
      (simples?'':'<p class="hint" style="margin:6px 0 0">Meses já lançados no ANOREG+ não mudam: o valor lançado fica travado.</p>')+'</div>'; }
  function cfgLinha(key, extra){
    var d=CFG_DEF[key]||CFG_SIMPLES[key]||{}, simples=!!CFG_SIMPLES[key], ed=state.cfgEd===key;
    return '<tr><td class="tleft"><b>'+esc(cfgRotulo(key))+'</b>'+(d.ajuda?'<div class="hint" style="margin:2px 0 0">'+esc(d.ajuda)+'</div>':'')+(extra||'')+'</td><td class="tleft">'+(simples?'<b>'+esc(cfgFmt(key,cfgS(key)))+'</b>':cfgVigencias(key))+'</td><td>'+(podeEscrever?'<button type="button" class="btn sm" data-cfged="'+esc(key)+'">Alterar</button>':'')+'</td></tr>'+(ed?'<tr class="cfg-ed"><td colspan="3">'+cfgForm(key)+'</td></tr>':''); }
  function renderCfg(){
    var el=$('cfgCorpo'); if (!el) return; var hoje=mesHoje();
    var h='<p class="hint" style="margin:0 0 10px">Regras macro do painel. Cada mudança <b>vale a partir da competência escolhida</b>, pede <b>motivo</b> e fica no <b>histórico</b> (evidência de mudança controlada · ISO 9001, 6.3 e 7.5). Ajustes de caso a caso (justificativas, avaliações) continuam nas páginas de cada assunto.</p>';
    h+='<div class="sub-h">Prazos do Registro de Imóveis (KPI-02)</div><div class="tbl-wrap"><table class="cfg-t"><thead><tr><th class="tleft">Item</th><th class="tleft">Valor e vigência</th><th></th></tr></thead><tbody>'+cfgLinha('ri.prazoBase')+cfgLinha('ri.retornoMais')+'</tbody></table></div>';
    var nat={}; Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ if (a.cat==='R'||a.cat==='N') nat[a.nat]=(nat[a.nat]||0)+1; }); });
    var nks=Object.keys(nat).sort(function(a,b){ return nat[b]-nat[a]; }), espec=nks.filter(function(k){ return (state.apur.itens['ri.prazoNat|'+k]||[]).length; });
    h+='<details class="cfg-det"'+(state.cfgEd&&state.cfgEd.indexOf('ri.prazoNat|')===0?' open':'')+'><summary>Prazo próprio por natureza do RI'+(espec.length?' · '+espec.length+' com prazo próprio':' · todas herdam o prazo da prenotação')+'</summary><p class="hint" style="margin:6px 0">Use para títulos com prazo diferente (ex.: incorporação, prazos especiais do art. 188). Vazio = herda o prazo da prenotação.</p><div class="tbl-wrap"><table class="cfg-t"><thead><tr><th class="tleft">Natureza</th><th class="tleft">Valor e vigência</th><th></th></tr></thead><tbody>'+
      nks.map(function(k){ return cfgLinha('ri.prazoNat|'+k,'<div class="hint" style="margin:2px 0 0">'+nat[k]+' protocolos registrados ou cancelados</div>'); }).join('')+'</tbody></table></div></details>';
    var sk={}; Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ var s=svDe(d.t); if (!s||s==='Apoio') return; var k=d.t+'|'+d.nat; sk[k]=(sk[k]||0)+1; }); });
    var sks=Object.keys(sk).sort(function(a,b){ return sk[b]-sk[a]; }), comP=sks.filter(function(k){ var v=cfgVal('serv.prazo|'+k,hoje); return v!=null&&!(v<0); }).length;
    h+='<div class="sub-h" style="margin-top:16px">Prazos das outras serventias e das intimações</div><details class="cfg-det"'+(state.cfgEd&&state.cfgEd.indexOf('serv.prazo|')===0?' open':'')+'><summary>'+comP+' de '+sks.length+' naturezas com prazo cadastrado</summary><p class="hint" style="margin:6px 0">Prazo em dias úteis do ingresso à finalização (0 = no mesmo dia). Vazio = sem prazo cadastrado (o painel mostra a referência P90).</p><div class="tbl-wrap"><table class="cfg-t"><thead><tr><th class="tleft">Natureza</th><th class="tleft">Valor e vigência</th><th></th></tr></thead><tbody>'+
      sks.map(function(k){ var p=k.split('|'), b=PRAZOS_BASE[k]; return cfgLinha('serv.prazo|'+k,'<div class="hint" style="margin:2px 0 0">'+esc(p[0])+' · '+sk[k]+' documentos'+(b?' · base: '+esc(b):'')+'</div>'); }).join('')+'</tbody></table></div></details>';
    h+='<div class="sub-h" style="margin-top:16px">Regras de apuração</div><div class="tbl-wrap"><table class="cfg-t"><thead><tr><th class="tleft">Regra</th><th class="tleft">Valor e vigência</th><th></th></tr></thead><tbody>'+
      cfgLinha('ri.retornoComprovado')+cfgLinha('ri.registroSelo')+cfgLinha('ri.cancelTri7')+cfgLinha('pend.marco')+cfgLinha('amostra.min')+'</tbody></table></div>';
    el.innerHTML=h;
    var eI=$('expIni'), eF=$('expFim'); if (eI&&document.activeElement!==eI) eI.value=state.cfg.expIni; if (eF&&document.activeElement!==eF) eF.value=state.cfg.expFim; renderFeriados();
    var H=state.apur.hist||[];
    $('cfgHist').innerHTML='<div class="sub-h" style="margin-top:18px">Histórico de alterações</div>'+(H.length?'<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Quando</th><th>Quem</th><th>Item</th><th>De</th><th>Para</th><th>Vale a partir de</th><th>Motivo</th></tr></thead><tbody>'+
      H.slice(0,300).map(function(x){ return '<tr><td>'+esc(new Date(x.em).toLocaleString('pt-BR'))+'</td><td>'+esc(x.por||'—')+'</td><td>'+esc(x.item)+'</td><td>'+esc(x.de==null?'—':x.de)+'</td><td>'+esc(x.para==null?'—':x.para)+'</td><td>'+esc(x.vale||'')+'</td><td>'+esc(x.motivo||'')+'</td></tr>'; }).join('')+'</tbody></table></div>':'<p class="hint">Nenhuma alteração registrada. O painel está no padrão combinado até a 0.10.5.</p>');
  }
  function cfgClique(t){
    if (t.dataset.cfged){ state.cfgEd=state.cfgEd===t.dataset.cfged?null:t.dataset.cfged; renderCfg(); var f=$('cfgV'); if (f) f.focus(); return true; }
    if (t.dataset.cfgcancel){ state.cfgEd=null; renderCfg(); return true; }
    var key=t.dataset.cfgsalvar||t.dataset.cfgpadrao; if (!key) return false;
    var mot=($('cfgMot')||{}).value; mot=String(mot||'').trim(); if (!mot){ toast('Escreva o motivo da mudança'); var m=$('cfgMot'); if (m) m.focus(); return true; }
    var d=CFG_DEF[key]||CFG_SIMPLES[key]||{tipo:'num'}, de=($('cfgDe')||{}).value||mesHoje(), v=null;
    if (t.dataset.cfgsalvar){ var raw=String(($('cfgV')||{}).value||'').trim().replace(',','.');
      if (d.tipo==='bool') v=raw==='1'; else if (d.tipo==='mes') v=raw; else if (raw===''){ v=CFG_SIMPLES[key]?CFG_SIMPLES[key].def:null; } else { if (isNaN(+raw)||+raw<0){ toast('Valor inválido'); return true; } v=Math.round(+raw); }
      if (key.indexOf('serv.prazo|')===0 && raw==='') v=-1;
      var un=($('cfgUn')||{}).value; if (un==='c' && typeof v==='number' && v>=0) v={n:v, un:'c'}; } // dias úteis seguem como número (compatível) // -1 = sem prazo a partir da competência
    state.cfgEd=null; cfgMudar(key, v, de, mot); return true;
  }

/* Painel SGQ · CRCO — js/graficos.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/graficos.js']='0.21.3';
  function mesesGraficos(){
    var s={}; [state.docs,state.cert,state.senhas,state.k9,state.inconf,state.serv].forEach(function(o){ Object.keys(o||{}).forEach(function(m){ if (/^\d{4}-\d{2}$/.test(m)) s[m]=1; }); });
    Object.keys(HIST_SEMENTE).forEach(function(m){ s[m]=1; }); Object.keys(state.kp).forEach(function(m){ if (state.kp[m]&&state.kp[m].hist) s[m]=1; });
    return Object.keys(s).sort().slice(-12);
  }
  function fmtG(v,un){ if (v==null||isNaN(v)) return '—'; return un==='%'?numBR(v,1)+'%':un==='min'?numBR(v,2)+' min':un==='d.u.'?numBR(v,1)+' d.u.':un==='pp'?numBR(v,1)+' p.p.':numBR(v,v%1?1:0); }
  // gráfico de linha simples (1 série) com linha de meta opcional; dica ao tocar/passar o mouse em cada mês
  function graficoLinha(ms, vals, o){
    var W=320, H=156, pl=34, pr=14, pt=22, pb=24, n=ms.length, val=vals.filter(function(v){return v!=null&&!isNaN(v);});
    if (!val.length) return '<div class="gm-vazio">Sem dados no período</div>';
    var lo=Math.min.apply(null,val), hi=Math.max.apply(null,val); if (o.meta!=null){ lo=Math.min(lo,o.meta); hi=Math.max(hi,o.meta); }
    if (o.zero) lo=Math.min(0,lo); var pad=(hi-lo)*0.15||Math.max(1,Math.abs(hi)*0.05); lo=o.zero?lo:lo-pad; hi=hi+pad; if (o.un==='%'){ lo=Math.max(0,lo); hi=Math.min(100,hi); if (hi<=lo) hi=lo+1; }
    var x=function(i){ return n<2?(pl+W-pr)/2:pl+(W-pl-pr)*i/(n-1); }, y=function(v){ return pt+(H-pt-pb)*(1-(v-lo)/(hi-lo)); };
    var s='<svg viewBox="0 0 '+W+' '+H+'" class="gm-svg" role="img" aria-label="'+esc(o.titulo)+' por mês">';
    [lo,(lo+hi)/2,hi].forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(pl-5)+'" y="'+(y(t)+3.5)+'" text-anchor="end" font-size="11" style="fill:var(--ink-3)">'+numBR(t,(hi-lo)<6?1:0)+'</text>'; });
    if (o.meta!=null) s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(o.meta)+'" y2="'+y(o.meta)+'" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 3"/><text x="'+(W-pr)+'" y="'+(y(o.meta)-4)+'" text-anchor="end" font-size="11" style="fill:var(--ink-2)">meta '+fmtG(o.meta,o.un)+'</text>';
    var d='', ult=-1; vals.forEach(function(v,i){ if (v==null||isNaN(v)) return; d+=(d?' L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1); ult=i; });
    s+='<path d="'+d+'" fill="none" stroke="var(--serie)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'; // 0.12.0: um estilo só para todos os gráficos de linha
    vals.forEach(function(v,i){ if (v==null||isNaN(v)) return; var fora=o.meta!=null&&(o.menor?v>o.meta:v<o.meta);
      s+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="'+(i===ult?4.5:3.5)+'" fill="'+(fora?'var(--crit)':'var(--serie)')+'" stroke="var(--surface)" stroke-width="2"/>'; });
    var passo=n>8?2:1;
    ms.forEach(function(m,i){ var lbl=MES_AB[+m.slice(5)-1]; if ((n-1-i)%passo===0) s+='<text x="'+x(i)+'" y="'+(H-7)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)">'+lbl+'</text>';
      var v=vals[i], w=n<2?W:(W-pl-pr)/(n-1); s+=hitRect(x(i)-w/2,0,w,H,'<b>'+compLabel(m)+'</b><br>'+o.titulo+': '+fmtG(v,o.un)+(o.extra&&o.extra[i]?'<br>'+o.extra[i]:'')+(o.meta!=null&&v!=null?'<br>'+((o.menor?v<=o.meta:v>=o.meta)?'dentro da meta':'fora da meta'):''),o.ir&&v!=null?goMes(m,o.ir):null); });
    if (ult>=0) s+='<text x="'+Math.min(x(ult),W-pr)+'" y="'+(y(vals[ult])-9)+'" text-anchor="'+(ult===n-1?'end':'middle')+'" font-size="11" font-weight="700" style="fill:var(--ink)">'+fmtG(vals[ult],o.un)+'</text>';
    return s+'</svg>';
  }
  function serieKPI(id, ms){ return ms.map(function(m){ var o=kpiValor(id,m); return o?(o.r!=null?o.r:o.n):null; }); }
  function renderGraficos(){
    var el=$('graficos'); if (!el) return; if (atrAtual()!=='RI'){ if (svModo()==='todas') renderComparativo(); else el.innerHTML=servGraficosHTML(); return; } aplicarTri7(); var ms=mesesGraficos();
    if (!ms.length){ el.innerHTML='<div class="empty">Importe planilhas para ver a comparação mês a mês.</div>'; return; }
    function rs(m){ return state.docs[m]?resumo(atosDoMes(m)):null; }
    var cards=[
      {t:'KPI-02 · finalizados no prazo', un:'%', v:ms.map(function(m){ var r=rs(m); return r&&r.n?r.kpi:null; }), meta:null, ir:'fp', ex:ms.map(function(m){ var r=rs(m); return r?r.dentro+' de '+r.n+' registrados':''; })},
      {t:'KPI-02 comp. · cancelamento', un:'%', v:ms.map(function(m){ var r=rs(m), x=cancSoTri7Mes(m).length; return r&&r.total?(r.N+x)/(r.total+x)*100:null; }), ir:'nao', menor:true, ex:ms.map(function(m){ var r=rs(m), x=cancSoTri7Mes(m).length; return r?(r.N+x)+' de '+(r.total+x)+' protocolos'+(x?' ('+x+' só no Tri7)':''):''; })},
      {t:'KPI-01 · inconformidades', un:'%', v:serieKPI('KPI-01',ms), meta:metaDe('KPI-01',16.5), menor:true, ir:'k1'},
      {t:'Mediana bruta até o registro', un:'d.u.', v:ms.map(function(m){ var r=rs(m); return r?r.medB:null; }), meta:20, menor:true, ir:'nat', zero:true},
      {t:'Aprovados na 1ª qualificação', un:'%', v:ms.map(function(m){ var r=rs(m); return r&&r.n?r.prim/r.n*100:null; }), ir:'ex'},
      {t:'Certidões no prazo', un:'%', v:ms.map(function(m){ if (!state.cert[m]) return null; var c=certCalc(state.cert[m].recs).filter(function(x){return !x.intim;}); return c.length?c.filter(function(x){return x.ok;}).length/c.length*100:null; }), ir:'cer', ex:ms.map(function(m){ if (!state.cert[m]) return ''; var a=certCalc(state.cert[m].recs), x=a.filter(function(c){ return c.intim; }).length; return x?'sem '+x+' do fluxo de intimação (fora do cálculo)':''; })},
      {t:'KPI-13 · espera média', un:'min', v:ms.map(function(m){ if (!state.senhas[m]) { var o=kpiValor('KPI-13',m); return o?o.n:null; } var s=senhasResumo(state.senhas[m].L); return s.med!=null?s.med/60:null; }), meta:metaDe('KPI-13',15), menor:true, ir:'at', zero:true},
      {t:'Senhas com espera ≥ 10 min', un:'%', v:ms.map(function(m){ if (!state.senhas[m]) return null; var s=senhasResumo(state.senhas[m].L); return s.na?s.a10/s.na*100:null; }), ir:'at', menor:true, zero:true},
      {t:'KPI-09 · absenteísmo', un:'%', v:serieKPI('KPI-09',ms), meta:metaDe('KPI-09',4), menor:true, ir:'lanc', zero:true},
      {t:'KPI-03 · satisfação', un:'', v:serieKPI('KPI-03',ms), meta:metaDe('KPI-03',80), ir:'lanc'},
      {t:'KPI-03 comp. · Google', un:'', v:serieKPI('KPI-03 (Comp.)',ms), meta:metaDe('KPI-03 (Comp.)',80), ir:'lanc'},
      {t:'Volume RI (atos, sem pesquisas qualificadas)', un:'', v:ms.map(function(m){ var d=state.docs[m]; return d?d.atos.length:null; }), ir:'nat', zero:true}
    ];
    el.innerHTML=cards.filter(function(c){ return c.v.some(function(v){return v!=null&&!isNaN(v);}); }).map(function(c){
      var idx=-1; c.v.forEach(function(v,i){ if (v!=null&&!isNaN(v)) idx=i; }); var ant=-1; for (var i=idx-1;i>=0;i--){ if (c.v[i]!=null&&!isNaN(c.v[i])){ ant=i; break; } }
      var v=c.v[idx], dl=ant>=0?v-c.v[ant]:null, bom=dl==null||dl===0?null:(c.menor?dl<0:dl>0);
      var fora=c.meta!=null?c.v.filter(function(x){ return x!=null&&(c.menor?x>c.meta:x<c.meta); }).length:0;
      return '<div class="gm-card"><div class="gm-h"><span class="gm-t">'+esc(c.t)+'</span><span class="gm-v">'+fmtG(v,c.un)+'</span></div>'+
        '<div class="gm-s">'+compLabel(ms[idx]).slice(4)+(dl!=null?' · <span class="'+(bom==null?'':bom?'gm-bom':'gm-mau')+'">'+(dl>0?'▲ ':dl<0?'▼ ':'')+fmtG(Math.abs(dl),c.un==='%'?'pp':c.un)+'</span> vs '+MES_AB[+ms[ant].slice(5)-1]:'')+(c.meta!=null?' · '+(fora?fora+' mês(es) fora da meta':'sempre na meta'):'')+'</div>'+
        graficoLinha(ms,c.v,{titulo:c.t,un:c.un,meta:c.meta,menor:c.menor,zero:c.zero,extra:c.ex,ir:c.ir})+'<button type="button" class="lnk gm-ir" data-ir="'+c.ir+'">Ver detalhes →</button></div>';
    }).join('');
  }
  function goAttr(a){ if (!a) return ''; var id=++goN; GO[id]=a;
    if (goN%5000===0) Object.keys(GO).forEach(function(k){ if (+k<goN-60000) delete GO[k]; });
    return ' data-go="'+id+'" data-goh="'+esc(goDica(a))+'"'; }
  function goDica(a){ var n=a.itens?a.itens.length:0;
    return a.t==='nat'?'abrir a natureza em Por natureza':a.t==='mes'?'ver '+nomeMes(a.m)+(a.aba&&TITULOS[a.aba]?' em '+TITULOS[a.aba]:''):a.t==='lista'?'listar '+(n===1?'o item':'os '+n.toLocaleString('pt-BR')+' itens'):
      a.t==='pessoa'?'abrir o relatório de '+String(a.nome).split(' ')[0]:a.t==='prot'?'abrir a ficha':a.t==='des'?'ver o desempenho da pessoa':a.t==='sv'?'ver só '+a.sv:'abrir'; }
  function goMes(m,aba){ return {t:'mes',m:m,aba:aba}; }
  function goLista(titulo,tipo,itens){ return itens&&itens.length?{t:'lista',titulo:titulo,tipo:tipo,itens:itens}:null; }
  function goPessoa(nome){ return nome?{t:'pessoa',nome:nome}:null; }
  // natureza: no RI abre o detalhe; nas outras atribuições abre a linha "tipo|natureza" mais comum
  function goNatRI(nat){ return {t:'nat',nat:nat}; }
  function goNatServ(nat, docs){ var c={}; (docs||[]).forEach(function(d){ if (d.nat===nat) c[d.t]=(c[d.t]||0)+1; }); var t=Object.keys(c).sort(function(a,b){ return c[b]-c[a]; })[0]; return t?{t:'nat',nat:nat,key:t+'|'+nat}:null; }
  // ponto de um protocolo (box plot, lista): dica com código, natureza e dias, clique abre a ficha
  function ptAto(a, v){ return {v:v, item:a, lab:a.c+' · '+v+' d.u.', go:{t:'prot',c:a.c},
    tip:'<b>Protocolo '+esc(a.c)+'</b><br>'+esc(a.nat)+'<br>'+v+' dias úteis'+(a.cat==='R'?' · limite '+a.lim+(a.reing?' (reingresso)':''):'')}; }
  function ptDoc(d, v){ return {v:v, item:d, lab:d.c+' · '+v+' d.u.', go:{t:'prot',c:d.c}, tip:'<b>'+esc(d.t)+' '+esc(d.c)+'</b><br>'+esc(d.nat)+'<br>'+v+' dias úteis'}; }
  function hitRect(x,y,w,h,tip,acao){ return '<rect class="hit" x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,+w).toFixed(1)+'" height="'+Math.max(0,+h).toFixed(1)+'" fill="transparent"'+(tip?' data-tip="'+esc(tip)+'"':'')+goAttr(acao)+'/>'; }

  // "voltar ao gráfico": guarda onde a pessoa estava antes de o clique levar para outra página
  function goGuardar(){ state.voltar={aba:state.aba, periodo:state.periodo, sv:state.sv, svSub:Object.assign({},state.svSub||{}), riOrig:state.riOrig, natSel:state.natSel, srvNat:state.srvNat, relSel:state.relSel, desSel:state.desSel, y:window.scrollY}; var b=$('btnVoltar'); if (b) b.hidden=false; }
  function goVoltar(){ var v=state.voltar; if (!v) return; state.voltar=null; var b=$('btnVoltar'); if (b) b.hidden=true;
    ['periodo','sv','svSub','riOrig','natSel','srvNat','relSel','desSel'].forEach(function(k){ state[k]=v[k]; });
    state.protSel=null; $('protBox').hidden=true; render(); irAba(v.aba, true); setTimeout(function(){ window.scrollTo(0,v.y); },40); }
  function goExec(el){
    var a=GO[el.dataset.go]; if (!a){ toast('Gráfico desatualizado: toque de novo'); return; }
    $('tip').hidden=true;
    if (a.t==='lista') return goListaAbrir(a, el);
    goGuardar();
    if (a.t==='prot'){ $('protIn').value=a.c; return fichaProtocolo(a.c); }
    if (a.t==='mes'){ state.periodo=a.m; state.lancMes=a.m; render(); return irAba(a.aba||state.aba, true); }
    if (a.t==='nat'){
      if (state.pgVis.nat){ state.nx.sel=natsDe(a.nat); state.nx.modo='juntar'; }
      if (a.key) state.srvNat=a.key; else { state.natSel=a.nat; state.busca=''; state.filtroFora=false; }
      render(); irAba('nat', true);
      setTimeout(function(){ var d=a.key?document.querySelector('#tabNat tr.sel'):$('detalhe'); if (d&&d.scrollIntoView) d.scrollIntoView({behavior:'smooth',block:a.key?'center':'start'}); },60); return; }
    if (a.t==='pessoa'){ var k=semAc(a.nome); state.relSel=k; irAba('rel', true); if (state.relSel!==k) toast(a.nome+' não aparece nos relatórios deste período e serventia'); return; }
    if (a.t==='des'){ state.desSel=a.k; return irAba('des', true); }
    if (a.t==='sv'){ state.sv=a.sv; if (a.sub){ state.svSub=state.svSub||{}; state.svSub[a.sv]=a.sub; } if (a.m) state.periodo=a.m; state.srvNat=null; render(); return irAba('geral', true); }
  }
  // lista de itens abaixo do gráfico clicado
  function sitAto(a){ if (a.cat==='R') return a.dentro?'<span class="pill good">no prazo</span>':justDe(a)?'<span class="pill good">justificado</span>':'<span class="pill crit">acima do prazo</span>';
    if (a.cat==='N') return '<span class="pill mute">'+esc(MOTIVOS[a.motivo]||'cancelado')+'</span>'; return '<span class="pill mute">'+esc(SIT[a.cat]||a.cat)+'</span>'; }
  function goCodigo(tipo,x){ return tipo==='cods'||tipo==='prots'?x:tipo==='cert'?x.p:tipo==='senhas'?null:x.c; }
  function goListaHTML(a){
    var C=LISTA_COLS[a.tipo]||LISTA_COLS.atos, n=a.itens.length, cod=goCodigo(a.tipo,a.itens[0])!=null, f=LISTA_ORD[a.tipo];
    var L=a.itens.slice(); if (f) L.sort(function(x,y){ return f(y)-f(x); }); else if (a.tipo==='inc') L.sort(function(x,y){ return x.d<y.d?1:x.d>y.d?-1:0; });
    return '<div class="go-h"><div><div class="sub-h" style="margin:0">Lista do gráfico</div><b>'+esc(a.titulo)+'</b> <span class="mut">· '+n.toLocaleString('pt-BR')+(n===1?' item':' itens')+'</span></div>'+
      '<div class="ctl"><button class="btn sm primary" type="button" data-golvoltar="1">← Voltar ao gráfico</button>'+(cod?'<button class="btn sm" type="button" data-golcopiar="1">Copiar códigos</button>':'')+'<button class="btn sm" type="button" data-golfechar="1" aria-label="Fechar a lista">✕</button></div></div>'+
      '<div class="tbl-wrap" style="max-height:460px;overflow:auto"><table class="tleft"><thead><tr>'+C.map(function(c){ return '<th>'+c[0]+'</th>'; }).join('')+'</tr></thead><tbody>'+
      L.slice(0,500).map(function(x){ return '<tr>'+C.map(function(c){ return '<td'+(c[2]?' class="'+c[2]+'"':'')+'>'+c[1](x)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>'+
      (n>500?'<p class="hint">Mostrando 500 de '+n.toLocaleString('pt-BR')+'. "Copiar códigos" copia todos.</p>':'');
  }
  function goListaAbrir(a, el){
    var velho=$('goLista'); if (velho) velho.remove();
    var anc=el.closest('.vz-card,.gm-card,.two,.tbl-wrap,.chart,.lc-card');
    var box=document.createElement('div'); box.id='goLista'; box.className='go-lista'; box.innerHTML=goListaHTML(a);
    if (anc){ var p=anc.parentNode; if (p&&p.classList&&(p.classList.contains('vz-grid')||p.classList.contains('gm')||p.classList.contains('grid2'))) box.style.gridColumn='1/-1'; anc.insertAdjacentElement('afterend',box); }
    else { var sec=el.closest('section,.panel')||$('pgConteudo'); sec.appendChild(box); }
    state.goAnc=anc||el; state.goListaAtual=a;
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
  } // ordem fixa, nunca cíclica
  function larg(W){ var w=typeof window!=='undefined'?window.innerWidth:1200; return w<700?Math.max(300,Math.min(W||640,w-44)):(W||640); }
  function dSvg(W,H,tit){ return '<svg viewBox="0 0 '+W+' '+H+'" class="gm-svg vz-svg" role="img" aria-label="'+esc(tit||'gráfico')+'">'; }
  function eixoY(lo,hi,y,pl,W,pr,fmt){ var s=''; [lo,(lo+hi)/2,hi].forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t).toFixed(1)+'" y2="'+y(t).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(y(t)+3.5).toFixed(1)+'" text-anchor="end" font-size="11" style="fill:var(--ink-3)">'+fmt(t)+'</text>'; }); return s; }
  function legenda(series){ if (series.length<2) return ''; return '<div class="leg">'+series.map(function(x){ return '<span><i class="dot" style="background:'+x.cor+(x.tracejado?';opacity:.6':'')+'"></i>'+esc(x.nome)+'</span>'; }).join('')+'</div>'; }
  function fmtN(un){ return function(v){ return un==='%'?numBR(v,Math.abs(v-Math.round(v))>0.05?1:0)+'%':un==='d.u.'?numBR(v,1):numBR(v,Math.abs(v)<10&&v%1?1:0); }; }

  // linhas (várias séries no mesmo eixo) · o.area preenche a 1ª série · o.banda {lo:[],hi:[]} faixa de controle · o.ref [{v,nome}] linhas de referência
  function gLinhas(ms, series, o){
    o=o||{}; var W=larg(o.W), H=o.H||230, pl=40, pr=14, pt=18, pb=26, n=ms.length, un=o.un||'', all=[];
    series.forEach(function(se){ se.v.forEach(function(v){ if (v!=null&&!isNaN(v)) all.push(v); }); });
    if (o.banda) o.banda.lo.concat(o.banda.hi).forEach(function(v){ if (v!=null&&!isNaN(v)) all.push(v); });
    (o.ref||[]).forEach(function(r){ all.push(r.v); });
    if (!all.length||!n) return '<div class="gm-vazio">Sem dados no período</div>';
    var lo=Math.min.apply(null,all), hi=Math.max.apply(null,all); if (o.zero||o.area) lo=Math.min(0,lo); var pad=(hi-lo)*0.12||1; if (!(o.zero||o.area)) lo-=pad; hi+=pad; if (un==='%'){ lo=Math.max(0,lo); hi=Math.min(100,hi); }
    var x=function(i){ return n<2?(pl+W-pr)/2:pl+(W-pl-pr)*i/(n-1); }, y=function(v){ return pt+(H-pt-pb)*(1-(v-lo)/(hi-lo||1)); };
    var s=dSvg(W,H,o.titulo)+eixoY(lo,hi,y,pl,W,pr,fmtN(un));
    if (o.banda){ var up='', dn=''; o.banda.hi.forEach(function(v,i){ if (v==null) return; up+=(up?' L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1); });
      for (var j=n-1;j>=0;j--){ var v2=o.banda.lo[j]; if (v2==null) continue; dn+=' L'+x(j).toFixed(1)+','+y(v2).toFixed(1); }
      if (up) s+='<path d="'+up+dn+' Z" style="fill:var(--ink-3);opacity:.14"/>'; }
    (o.ref||[]).forEach(function(r,k){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(r.v).toFixed(1)+'" y2="'+y(r.v).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="4 3"/><text x="'+(pl+4)+'" y="'+(y(r.v)+(k%2?13:-4)).toFixed(1)+'" font-size="11" style="fill:var(--ink-2)">'+esc(r.nome)+'</text>'; });
    // 0.19.0: marcos (linha vertical num mês: "ação da NC-010") · o.marcos=[{i, txt}]
    (o.marcos||[]).forEach(function(mk,k){ if (mk.i==null||mk.i<0||mk.i>=n) return; var xm=x(mk.i), t=String(mk.txt||''), dir=xm>W*0.6; if (t.length>28) t=t.slice(0,27)+'…';
      s+='<line x1="'+xm.toFixed(1)+'" x2="'+xm.toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/><text x="'+(dir?xm-4:xm+4).toFixed(1)+'" y="'+(pt+10+(k%3)*13)+'" font-size="11"'+(dir?' text-anchor="end"':'')+' style="fill:var(--ink-2)" pointer-events="none">▼ '+esc(t)+'</text>'; });
    var umaSo=series.length===1; // 0.12.0: série única usa a cor padrão dos gráficos
    series.forEach(function(se,k){ var corS=umaSo&&!se.fixa?'var(--serie)':se.cor; var d='', first=-1, last=-1; se.v.forEach(function(v,i){ if (v==null||isNaN(v)) return; d+=(d?' L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1); if (first<0) first=i; last=i; });
      if (!d) return;
      if (o.area&&k===0) s+='<path d="'+d+' L'+x(last).toFixed(1)+','+y(lo).toFixed(1)+' L'+x(first).toFixed(1)+','+y(lo).toFixed(1)+' Z" style="fill:'+corS+';opacity:.10"/>';
      s+='<path d="'+d+'" fill="none" style="stroke:'+corS+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"'+(se.tracejado?' stroke-dasharray="5 4"':'')+'/>';
      se.v.forEach(function(v,i){ if (v==null||isNaN(v)) return; var al=se.alerta&&se.alerta[i], vz=se.vazio&&se.vazio[i]; s+=vz?'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="4.5" style="fill:var(--surface);stroke:'+corS+'" stroke-width="2"/>':'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="'+(al?5:3.5)+'" style="fill:'+(al?'var(--crit)':corS)+'" stroke="var(--surface)" stroke-width="2"/>'; });
      if (series.length<=4 && last>=0 && o.rotulos!==false) s+='<text x="'+Math.min(x(last)+2,W-pr)+'" y="'+(y(se.v[last])-8).toFixed(1)+'" text-anchor="end" font-size="11" font-weight="700" style="fill:var(--ink)">'+fmtG(se.v[last],un)+'</text>'; });
    var passo=n>8?2:1;
    ms.forEach(function(m,i){ if ((n-1-i)%passo===0) s+='<text x="'+x(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)">'+MES_AB[+m.slice(5)-1]+'</text>';
      var w=n<2?W:(W-pl-pr)/(n-1), tip='<b>'+compLabel(m)+'</b>'; series.forEach(function(se){ var v=se.v[i]; tip+='<br>'+esc(se.nome)+': '+fmtG(v,un)+(se.extra&&se.extra[i]?' <span class=mut>('+se.extra[i]+')</span>':''); });
      if (o.banda&&o.banda.lo[i]!=null) tip+='<br>Faixa normal: '+fmtG(o.banda.lo[i],un)+' a '+fmtG(o.banda.hi[i],un);
      s+=hitRect(x(i)-w/2,0,w,H,tip,o.goMes?o.goMes(m,i):o.irMes?goMes(m,o.irMes):null); });
    return s+'</svg>'+legenda(series);
  }
  // barras horizontais (comparar categorias)
  // 1.10.4: nome longo com prefixo ("Averbações/Anotações - Casamento") abrevia o prefixo para a parte que diferencia aparecer; a dica mostra o nome inteiro
  function nomeBarra(n){ n=String(n||''); var i=n.indexOf(' - '); if (n.length<=22||i<0) return n; return n.slice(0,i).replace(/[A-Za-zÀ-ÿ]{6,}/g,function(w){ return w.slice(0,5)+'.'; })+n.slice(i); }
  function gBarrasH(itens, o){
    o=o||{}; if (!itens.length) return '<div class="gm-vazio">Sem dados</div>';
    var mx=Math.max.apply(null,itens.map(function(x){ return Math.abs(x.v)||0; }))||1;
    return '<div class="hb">'+itens.map(function(x){ var w=Math.max(1,Math.abs(x.v)/mx*100);
      return '<div class="hb-row" data-tip="'+esc('<b>'+esc(x.nome)+'</b><br>'+fmtG(x.v,o.un||'')+(x.extra?'<br>'+x.extra:''))+'"'+goAttr(x.go)+'><span class="hb-n">'+esc(nomeBarra(x.nome))+'</span><span class="hb-t"><i style="width:'+w.toFixed(1)+'%;background:'+(x.cor||'var(--c1)')+'"></i></span><span class="hb-v">'+fmtG(x.v,o.un||'')+'</span></div>'; }).join('')+'</div>';
  }
  // rosca (partes de um todo; poucas categorias)
  function gRosca(partes, o){
    o=o||{}; partes=partes.filter(function(p){ return p.v>0; }); var tot=partes.reduce(function(s,p){ return s+p.v; },0); if (!tot) return '<div class="gm-vazio">Sem dados</div>';
    var R=70, r=44, cx=90, cy=90, a=-Math.PI/2, s='<div class="rosca">'+dSvg(180,180,o.titulo);
    partes.forEach(function(p,i){ var f=p.v/tot, a2=a+f*Math.PI*2-(partes.length>1?0.02:0), lg=f>0.5?1:0;
      if (partes.length===1){ s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+((R+r)/2)+'" fill="none" style="stroke:'+p.cor+'" stroke-width="'+(R-r)+'" data-tip="'+esc('<b>'+esc(p.nome)+'</b><br>'+p.v.toLocaleString('pt-BR')+' (100%)')+'"'+goAttr(p.go)+'/>'; }
      else { var P=function(rr,ang){ return (cx+rr*Math.cos(ang)).toFixed(2)+','+(cy+rr*Math.sin(ang)).toFixed(2); };
        s+='<path class="fatia" d="M'+P(R,a)+' A'+R+','+R+' 0 '+lg+' 1 '+P(R,a2)+' L'+P(r,a2)+' A'+r+','+r+' 0 '+lg+' 0 '+P(r,a)+' Z" style="fill:'+p.cor+'" data-tip="'+esc('<b>'+esc(p.nome)+'</b><br>'+p.v.toLocaleString('pt-BR')+' ('+numBR(f*100,1)+'%)')+'"'+goAttr(p.go)+'/>'; }
      a+=f*Math.PI*2; });
    s+='<text x="'+cx+'" y="'+(cy-2)+'" text-anchor="middle" font-size="20" font-weight="700" style="fill:var(--ink)" pointer-events="none">'+(o.centro!=null?o.centro:tot.toLocaleString('pt-BR'))+'</text><text x="'+cx+'" y="'+(cy+15)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)" pointer-events="none">'+esc(o.sub||'total')+'</text></svg>';
    return s+'<div class="rosca-leg">'+partes.map(function(p){ return '<div'+goAttr(p.go)+'><i class="dot" style="background:'+p.cor+'"></i><span>'+esc(p.nome)+'</span><b>'+numBR(p.v/tot*100,1)+'%</b><span class="mut">'+p.v.toLocaleString('pt-BR')+'</span></div>'; }).join('')+'</div></div>';
  }
  // dispersão (relação entre duas variáveis) · pontos {x,y,nome,r?,cor?}
  function gDispersao(pts, o){
    o=o||{}; pts=pts.filter(function(p){ return p.x!=null&&p.y!=null&&!isNaN(p.x)&&!isNaN(p.y); }); if (pts.length<2) return '<div class="gm-vazio">Poucos dados para relacionar</div>';
    var W=larg(o.W), H=o.H||260, pl=46, pr=16, pt=14, pb=38;
    var xs=pts.map(function(p){ return p.x; }), ys=pts.map(function(p){ return p.y; });
    var x0=Math.min(0,Math.min.apply(null,xs)), x1=Math.max.apply(null,xs)*1.06||1, y0=Math.min(0,Math.min.apply(null,ys)), y1=Math.max.apply(null,ys)*1.1||1;
    if (o.logX){ x0=Math.log10(Math.max(1,Math.min.apply(null,xs))*0.8); x1=Math.log10(Math.max.apply(null,xs)*1.2); }
    var X=function(v){ var t=o.logX?Math.log10(Math.max(1,v)):v; return pl+(W-pl-pr)*(t-x0)/((x1-x0)||1); }, Y=function(v){ return pt+(H-pt-pb)*(1-(v-y0)/((y1-y0)||1)); };
    var s=dSvg(W,H,o.titulo)+eixoY(y0,y1,Y,pl,W,pr,fmtN(o.unY||''));
    if (o.refY!=null) s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(o.refY).toFixed(1)+'" y2="'+Y(o.refY).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="4 3"/><text x="'+(W-pr)+'" y="'+(Y(o.refY)-4).toFixed(1)+'" text-anchor="end" font-size="11" style="fill:var(--ink-2)">'+esc(o.refYNome||'')+'</text>';
    var tx=o.logX?[Math.pow(10,x0),Math.pow(10,(x0+x1)/2),Math.pow(10,x1)]:[x0,(x0+x1)/2,x1];
    tx.forEach(function(t){ s+='<text x="'+X(t).toFixed(1)+'" y="'+(H-pb+14)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)">'+numBR(t,t<10?1:0)+'</text>'; });
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-2)">'+esc(o.xl||'')+'</text><text x="12" y="'+((pt+H-pb)/2)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-2)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+esc(o.yl||'')+'</text>';
    var rot=pts.slice().sort(function(a,b){ return (b.rot||0)-(a.rot||0); }).slice(0,o.nRot==null?5:o.nRot);
    pts.forEach(function(p){ s+='<circle class="pt" cx="'+X(p.x).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="'+(p.r||6)+'" style="fill:'+(p.cor||'var(--c1)')+';fill-opacity:.75" stroke="var(--surface)" stroke-width="2" data-tip="'+esc('<b>'+esc(p.nome)+'</b>'+(o.quem?' <span class=mut>('+esc(o.quem)+')</span>':'')+'<br>'+esc(o.xl||'x')+': '+numBR(p.x,1)+'<br>'+esc(o.yl||'y')+': '+numBR(p.y,1)+(p.extra?'<br>'+p.extra:''))+'"'+goAttr(p.go)+'/>'; });
    var usados=[]; rot.forEach(function(p){ if (!p.rot) return; var px=X(p.x), py=Y(p.y), dir=px>W*0.7, tx=dir?px-8:px+8, nm=String(p.nome).length>22?String(p.nome).slice(0,21)+'…':String(p.nome), w=nm.length*5.6, x0=dir?tx-w:tx;
      if (usados.some(function(u){ return Math.abs(u.y-py)<12 && x0<u.x1 && x0+w>u.x0; })) return; usados.push({x0:x0,x1:x0+w,y:py});
      s+='<text x="'+tx.toFixed(1)+'" y="'+(py+3.5).toFixed(1)+'" font-size="11"'+(dir?' text-anchor="end"':'')+' style="fill:var(--ink-2)" pointer-events="none">'+esc(nm)+'</text>'; });
    return s+'</svg>';
  }
  // histograma (distribuição de valores em faixas) · o.itens (paralelo a vals) + o.tipoLista: cada coluna lista os itens daquela faixa
  function gHisto(vals, o){
    o=o||{}; var idx=[]; (vals||[]).forEach(function(x,i){ if (x!=null&&!isNaN(x)) idx.push(i); }); if (!idx.length) return '<div class="gm-vazio">Sem dados</div>';
    var v=idx.map(function(i){ return vals[i]; }), e=est(v), lim=o.max!=null?o.max:Math.ceil(e.p90*1.5)||1, passo=o.passo||Math.max(1,Math.ceil(lim/24)), nb=Math.ceil((lim+1)/passo), cnt=new Array(nb+1).fill(0), its=[];
    for (var q=0;q<=nb;q++) its.push([]);
    idx.forEach(function(i){ var b=Math.min(Math.floor(Math.max(0,vals[i])/passo),nb); cnt[b]++; if (o.itens) its[b].push(o.itens[i]); });
    var W=larg(o.W), H=o.H||210, pl=36, pr=10, pt=14, pb=28, mx=Math.max.apply(null,cnt)||1, bw=(W-pl-pr)/(nb+1), un=o.un||'';
    var y=function(c){ return pt+(H-pt-pb)*(1-c/mx); }, s=dSvg(W,H,o.titulo)+eixoY(0,mx,y,pl,W,pr,function(t){ return Math.round(t); });
    cnt.forEach(function(c,i){ var x=pl+i*bw, lab=i===nb?'≥ '+numBR(i*passo):passo===1?numBR(i*passo):numBR(i*passo)+'–'+numBR((i+1)*passo-(Number.isInteger(passo)?1:0)), hh=y(0)-y(c);
      if (c) s+='<rect x="'+(x+1).toFixed(1)+'" y="'+y(c).toFixed(1)+'" width="'+Math.max(1,bw-2).toFixed(1)+'" height="'+Math.max(1,hh).toFixed(1)+'" rx="2" pointer-events="none" style="fill:'+(o.lim!=null&&(o.limEsq?i*passo>=o.lim:i*passo>o.lim)?'var(--crit)':'var(--c1)')+'"/>';
      s+=hitRect(x,pt,bw,H-pt-pb,'<b>'+lab+' '+un+'</b><br>'+c+' casos ('+numBR(c/v.length*100,1)+'%)', c&&o.itens?goLista(lab+' '+un+(o.nomeLista?' · '+o.nomeLista:''),o.tipoLista,its[i]):null);
      if (i%Math.ceil((nb+1)/12)===0) s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-12)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)" pointer-events="none">'+(i===nb?'≥'+numBR(i*passo):numBR(i*passo))+'</text>'; });
    var xm=pl+(e.mediana/passo+0.5)*bw; s+='<line x1="'+xm.toFixed(1)+'" x2="'+xm.toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-dasharray="3 3" pointer-events="none"/><text x="'+(xm+4).toFixed(1)+'" y="'+(pt+10)+'" font-size="11" style="fill:var(--ink)" pointer-events="none">mediana '+numBR(e.mediana,1)+'</text>';
    if (o.lim!=null){ var xl=pl+(o.lim/passo+(o.limEsq?0:1))*bw; s+='<line x1="'+xl.toFixed(1)+'" x2="'+xl.toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--crit)" stroke-dasharray="4 3" pointer-events="none"/>'; }
    return s+'<text x="'+((pl+W-pr)/2)+'" y="'+(H-1)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-2)">'+esc(o.xl||'')+'</text></svg>';
  }
  function passoBonito(v){ if (!(v>0)) return 1; var p=Math.pow(10,Math.floor(Math.log10(v))), f=v/p; return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p; }
  // box plot horizontal · grupos {nome, v:[...] ou pts:[{v, tip, go, item, lab}], cor?, sub?, go?}
  // caixa = metade central, traço = mediana, bigodes até 1,5×IQR, pontos = casos fora do padrão (cada um com a própria dica e clique).
  // O eixo cobre todos os casos quando o maior não passa muito do bigode; senão corta e marca à direita "n > fim do eixo".
  function gBox(grupos, o){
    o=o||{}; var un=o.un||'';
    grupos=grupos.map(function(g){ var pts=(g.pts||(g.v||[]).map(function(v){ return {v:v}; })).filter(function(p){ return p.v!=null&&!isNaN(p.v); });
      return {nome:g.nome, cor:g.cor||'var(--c1)', pts:pts, e:est(pts.map(function(p){ return p.v; })), sub:g.sub, go:g.go}; }).filter(function(g){ return g.e.n; });
    if (!grupos.length) return '<div class="gm-vazio">Sem dados</div>';
    grupos.forEach(function(g){ var e=g.e, iq=e.q3-e.q1; g.wl=Math.max(e.min,e.q1-1.5*iq); g.wh=Math.min(e.max,e.q3+1.5*iq); });
    var alvo=Math.max.apply(null,grupos.map(function(g){ return g.wh; })), maxAll=Math.max.apply(null,grupos.map(function(g){ return g.e.max; }));
    if (o.ref!=null) alvo=Math.max(alvo,o.ref);
    var lim=o.max!=null?o.max:(maxAll<=alvo*1.6?maxAll:alvo*1.15), passo=passoBonito((lim||1)/5), xmax=Math.max(passo,Math.ceil(lim/passo-1e-9)*passo);
    var cortou=grupos.some(function(g){ return g.e.max>xmax; });
    var lh=28, W=larg(o.W), pl=Math.min(o.pl||170,Math.round(W*0.36)), pr=cortou?70:16, pt=8, pb=24, H=pt+pb+grupos.length*lh, nch=Math.max(10,Math.floor(pl/6.4));
    var X=function(v){ return pl+(W-pl-pr)*Math.max(0,Math.min(v,xmax))/xmax; }, s=dSvg(W,H,o.titulo), dec=passo<1?1:0;
    for (var t=0;t<=xmax+1e-9;t+=passo) s+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)" pointer-events="none"/><text x="'+X(t).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)" pointer-events="none">'+numBR(t,dec)+'</text>';
    if (o.ref!=null) s+='<line x1="'+X(o.ref).toFixed(1)+'" x2="'+X(o.ref).toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--crit)" stroke-dasharray="4 3" pointer-events="none"/>';
    grupos.forEach(function(g,i){ var e=g.e, cy=pt+i*lh+lh/2;
      // fundo da linha (por trás de tudo): dica e clique da natureza/grupo inteiro
      s+=hitRect(0,cy-lh/2,W-pr+2,lh,'<b>'+esc(g.nome)+'</b>'+(g.sub?'<br>'+g.sub:'')+'<br>'+estTip(e,' '+un),g.go);
      s+='<text x="'+(pl-8)+'" y="'+(cy+3.5)+'" text-anchor="end" font-size="11" style="fill:var(--ink-2)" pointer-events="none">'+esc(String(g.nome).length>nch?String(g.nome).slice(0,nch-1)+'…':g.nome)+'</text>';
      s+='<line x1="'+X(g.wl).toFixed(1)+'" x2="'+X(g.wh).toFixed(1)+'" y1="'+cy+'" y2="'+cy+'" style="stroke:var(--ink-3)" pointer-events="none"/>';
      s+='<rect x="'+X(e.q1).toFixed(1)+'" y="'+(cy-8)+'" width="'+Math.max(2,X(e.q3)-X(e.q1)).toFixed(1)+'" height="16" rx="3" style="fill:'+g.cor+';fill-opacity:.3;stroke:'+g.cor+'" pointer-events="none"/>';
      s+='<line x1="'+X(e.mediana).toFixed(1)+'" x2="'+X(e.mediana).toFixed(1)+'" y1="'+(cy-8)+'" y2="'+(cy+8)+'" style="stroke:'+g.cor+'" stroke-width="3" pointer-events="none"/>';
      var fora=g.pts.filter(function(p){ return p.v>g.wh||p.v<g.wl; }), cort=fora.filter(function(p){ return p.v>xmax; }), vis=fora.filter(function(p){ return p.v<=xmax; }).sort(function(a,b){ return a.v-b.v; }), bal={};
      // um ponto por valor (casos a menos de 5 px juntam): maior quando junta mais casos; 1 caso abre a ficha, vários abrem a lista
      var inteiro=g.pts.every(function(p){ return p.v%1===0; }), step=inteiro?1:passo/5, pxS=X(step)-X(0), rMax=Math.max(3.6,Math.min(9,pxS/2-0.5));
      vis.forEach(function(p){ var kx=Math.round(p.v/step); (bal[kx]=bal[kx]||[]).push(p); });
      Object.keys(bal).forEach(function(kx){ var L=bal[kx], n=L.length, v0=L[0].v, v1=L[n-1].v, fx=function(v){ return numBR(v,v%1?1:0); }, faixa=v0===v1?fx(v0):fx(v0)+' a '+fx(v1);
        var r=n===1?Math.min(3.6,rMax):Math.min(rMax,3.6+Math.sqrt(n)*1.2), xm=X(media(L.map(function(p){ return p.v; })));
        var tipB=n===1?(L[0].tip||(esc(g.nome)+'<br>'+fx(v0)+' '+un)):'<b>'+n+' casos com '+faixa+' '+un+'</b><br>'+esc(g.nome)+'<br>'+L.slice(0,6).map(function(p){ return esc(p.lab||fx(p.v)); }).join('<br>')+(n>6?'<br>… e mais '+(n-6):'');
        var acB=n===1?L[0].go:((g.tipoLista||o.tipoLista)&&L[0].item?goLista(g.nome+' · '+faixa+' '+un,(g.tipoLista||o.tipoLista),L.map(function(p){ return p.item; })):null);
        s+='<circle class="pt" cx="'+xm.toFixed(1)+'" cy="'+cy+'" r="'+r.toFixed(1)+'" style="fill:var(--ink-3)" stroke="var(--surface)" stroke-width="1.5" data-tip="'+esc(tipB)+'"'+goAttr(acB)+'/>';
        if (n>1&&pxS>=15) s+='<text x="'+xm.toFixed(1)+'" y="'+(cy-r-2).toFixed(1)+'" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--ink-2)" pointer-events="none">'+n+'</text>'; });
      if (cort.length){ var xe=W-pr+8, tipC='<b>'+cort.length+(cort.length===1?' caso':' casos')+' acima de '+numBR(xmax,dec)+' '+un+'</b> (fora do eixo)<br>'+cort.slice().sort(function(a,b){ return b.v-a.v; }).slice(0,10).map(function(p){ return p.lab||numBR(p.v,1)+' '+un; }).join('<br>')+(cort.length>10?'<br>…':'');
        var acC=cort.length===1?cort[0].go:((g.tipoLista||o.tipoLista)&&cort[0].item?goLista(g.nome+' · acima de '+numBR(xmax,dec)+' '+un,(g.tipoLista||o.tipoLista),cort.map(function(p){ return p.item; })):null);
        s+='<path d="M'+xe+','+(cy-5)+' l7,5 l-7,5 z" style="fill:var(--ink-2)" pointer-events="none"/><text x="'+(xe+10)+'" y="'+(cy+3.5)+'" font-size="11" font-weight="700" style="fill:var(--ink-2)" pointer-events="none">'+cort.length+' &gt; '+numBR(xmax,dec)+'</text>';
        s+=hitRect(xe-4,cy-lh/2,pr-6,lh,tipC,acC); } });
    return s+'</svg>';
  }
  function vzCard(tit, sub, corpo, cls){ return '<div class="vz-card'+(cls?' '+cls:'')+'"><div class="vz-h"><span class="vz-t">'+esc(tit)+'</span>'+(sub?'<span class="vz-s">'+sub+'</span>':'')+'</div>'+corpo+'</div>'; }

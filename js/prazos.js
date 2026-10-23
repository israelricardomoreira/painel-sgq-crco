/* Painel SGQ · CRCO — js/prazos.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/prazos.js']='0.22.0';
  function pintarGeral(atos){
    var r=resumo(atos);
    // 0.13.0: indicadores oficiais em destaque (valor, meta, situação, linha do ano e selo de lançado); o apoio fica numa faixa
    var mesSel=state.periodo!=='todos'?state.periodo:null, msG=mesesGraficos(), filtroOrig=(state.riOrig||'todas')!=='todas';
    var eb=est(r.R.map(function(a){return a.bruto;}));
    var fo=r.R.filter(function(a){return a.dentro&&a.bruto!=null;}).map(function(a){return a.lim-a.bruto;}), ef=est(fo), apert=fo.filter(function(x){return x<=3;}).length, pa=ef.n?pct(apert/ef.n*100):'', alto=apert/Math.max(1,ef.n)>0.05;
    var X=cancSoTri7Periodo(), Nc=r.N+X.length, Tc=r.total+X.length;
    var tudo=[]; Object.keys(state.docs).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) tudo=tudo.concat(state.docs[m].atos.filter(function(a){ return a.cat==='R'||a.cat==='N'; })); });
    var cO=tudo.filter(function(a){ return origemAto(a)==='central'; }).length;
    var todosInc=incTodos(), k1=todosInc.length?kpi1Mes(atos,todosInc):null, meta1=metaDe('KPI-01',16.5);
    var S13=mesSel&&state.senhas[mesSel]?senhasResumo(state.senhas[mesSel].L):null, v13=S13?Math.round(S13.med/60*100)/100:null, meta13=metaDe('KPI-13',15);
    $('kpis').innerHTML='<div class="of">'+
      oficialHTML('KPI-02','Finalizados no prazo',r.n?pctK(r.kpi).replace('%',''):'—',r.n?'%':'',r.dentro+' de '+r.n+' registrados'+(r.J?' · '+r.J+' justificado'+(r.J>1?'s':''):''),null,r.n?{c:'mute',t:'Baseline'}:null,'sem meta fixada (baseline)',serieKPI('KPI-02',msG),null,mesSel,filtroOrig)+
      oficialHTML('KPI-01','Atos com inconformidade',k1&&k1.k!=null?pct(k1.k).replace('%',''):'—',k1&&k1.k!=null?'%':'',k1?k1.c+' de '+k1.n+' registrados':'importe as inconformidades',meta1,k1&&k1.k!=null?(k1.k<=meta1?{c:'good',t:'Atende'}:{c:'crit',t:'Fora da meta'}):null,'meta ≤ '+numBR(meta1,1)+'%',serieKPI('KPI-01',msG),meta1,mesSel,filtroOrig)+
      oficialHTML('KPI-13','Espera para atendimento',v13!=null?numBR(v13,2):'—',v13!=null?'min':'',S13?'média de todas as filas · '+S13.na+' senhas':(mesSel?'importe a consulta de senhas':'escolha um mês no Período'),meta13,v13!=null?(v13<=meta13?{c:'good',t:'Atende'}:{c:'crit',t:'Fora da meta'}):null,'meta ≤ '+numBR(meta13,0)+' min',serieKPI('KPI-13',msG),meta13,mesSel,false)+
      '</div><dl class="apoio">'+
      apoioHTML('Mediana bruta',f1(r.medB),'d.u.','média '+f1(r.mB)+' · 90% em até '+f1(eb.p90))+
      apoioHTML('Folga até o limite',ef.n?f1(ef.mediana):'—','d.u.',ef.n?(alto?'<span class="at">'+pa+'</span>':pa)+' com 3 d.u. ou menos':'')+
      apoioHTML('Mediana líquida',f1(r.medL),'d.u.','tempo com o cartório')+
      apoioHTML('Espera do cliente',f1(r.mEsp),'d.u.','exigência e suspensão')+
      apoioHTML('1ª qualificação',pct(r.n?r.prim/r.n*100:null).replace('%',''),'%',r.prim+' sem exigência')+
      apoioHTML('Cancelamentos',pct(Tc?Nc/Tc*100:null).replace('%',''),'%',Nc+' de '+Tc+' · KPI-02 comp.'+(X.length?' · '+X.length+' só no Tri7':''))+
      apoioHTML('Volume',String(r.total),'atos',pesquisaTotal()?'fora '+pesquisaTotal()+' pesquisa'+(pesquisaTotal()>1?'s':'')+' qualificada'+(pesquisaTotal()>1?'s':''):'atos RI do período')+
      apoioHTML('Pela central',tudo.length?pct(cO/tudo.length*100).replace('%',''):'—','%',cO+' de '+tudo.length+' registrados e cancelados'+(filtroOrig?' · filtro ativo':''))+
      '</dl>' + (r.aberto? '<div class="banner warn" style="grid-column:1/-1;margin:0">'+r.aberto+' ato(s) fora do prazo em aberto. Registre o motivo na aba <b>Fora do prazo</b> para levá-lo à curva normal.</div>':'') + (r.I? '<div class="banner warn" style="grid-column:1/-1;margin:0">'+r.I+' ato(s) sem histórico suficiente ficaram fora do cálculo. Reimporte o mês com a Produção por Etapa começando 2 meses antes.</div>':'');
    renderTendencia(); renderGraficos();
  }

  // 0.13.0: cartão de indicador oficial e item da faixa de apoio
  function sparkHTML(vals, meta){ var v=vals.filter(function(x){ return x!=null&&!isNaN(x); }); if (v.length<2) return '';
    var W=300, H=40, lo=Math.min.apply(null,v.concat(meta!=null?[meta]:[])), hi=Math.max.apply(null,v.concat(meta!=null?[meta]:[])); if (hi===lo){ hi+=1; lo-=1; }
    var n=vals.length, x=function(i){ return 4+(W-12)*i/(n-1); }, y=function(t){ return 4+(H-10)*(1-(t-lo)/(hi-lo)); }, d='', ult=-1;
    vals.forEach(function(t,i){ if (t==null||isNaN(t)) return; d+=(d?' L':'M')+x(i).toFixed(1)+','+y(t).toFixed(1); ult=i; });
    return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+(meta!=null?'<line x1="0" x2="'+W+'" y1="'+y(meta).toFixed(1)+'" y2="'+y(meta).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="4 3" stroke-width="1"/>':'')+
      '<path d="'+d+'" fill="none" stroke="var(--serie)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'+(ult>=0?'<circle cx="'+x(ult).toFixed(1)+'" cy="'+y(vals[ult]).toFixed(1)+'" r="3.5" fill="var(--serie)" stroke="var(--surface)" stroke-width="2"/>':'')+'</svg>'; }
  var SELO_OK='<svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 9.2l2.3 2.3 4.7-4.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SELO_PEND='<svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.5 2"/></svg>';
  function seloHTML(id, mes, filtro){ if (!mes) return '<span class="selo neutro" title="Escolha um mês no Período para ver o lançamento">acumulado</span>';
    var T=kpiTravado(mes,id); if (T) return '<span class="selo ok" title="Valor travado: '+esc(String(T.n))+' / '+esc(String(T.d))+(filtro?' · o cartão mostra o filtro de origem, o lançado é o total':'')+'">'+SELO_OK+'Lançado em '+fmtData(String(T.em||'').slice(0,10)).slice(0,5)+'</span>';
    return '<span class="selo pend" title="Ainda não marcado como lançado em Lançar KPIs">'+SELO_PEND+'Ainda não lançado</span>'; }
  function oficialHTML(id, nome, valor, un, base, meta, sit, metaTxt, serie, metaSerie, mes, filtro){
    return '<div class="kpi ofk"><div class="ofk-h"><span class="ofk-id">'+id+'</span>'+seloHTML(id,mes,filtro)+'</div><div class="ofk-nm">'+esc(nome)+'</div>'+
      '<div class="ofk-v num">'+valor+(un?'<small>'+un+'</small>':'')+'</div><div class="ofk-b num">'+base+'</div>'+
      '<div class="ofk-m">'+(sit?'<span class="pill '+sit.c+'">'+(sit.c==='good'?'✓ ':sit.c==='crit'?'✕ ':'')+sit.t+'</span>':'')+'<span>'+metaTxt+'</span></div>'+sparkHTML(serie,metaSerie)+'</div>'; }
  function apoioHTML(t,v,un,s){ return '<div><dt>'+t+'</dt><dd class="num">'+v+(un&&v!=='—'?'<small>'+un+'</small>':'')+'</dd><p>'+s+'</p></div>'; }
  function kpi(l,v,s,cls){ return '<div class="kpi '+(cls||'')+'"><span class="l">'+l+'</span><span class="v">'+v+'</span><span class="s">'+s+'</span></div>'; }

  function renderSelect(){
    var sel=$('selMes'), mm={}; (atrAtual()==='RI'?[state.docs]:svModo()==='todas'?[state.docs,state.serv]:[state.serv]).forEach(function(o){ Object.keys(o).forEach(function(m){ mm[m]=1; }); }); var meses=Object.keys(mm).sort().reverse();
    var jn=(window.nuvem&&window.nuvem.janela)?window.nuvem.janela():null, ant=jn&&jn.temAnteriores&&!jn.completo; // 0.14.0: abre com 12 meses; os anteriores entram por pedido
    var html='<option value="todos">'+(ant?'Últimos 12 meses':'Todos os meses')+' ('+meses.length+')</option>'+meses.map(function(m){ return '<option value="'+m+'">'+nomeMes(m)+'</option>'; }).join('')+(ant?'<option value="__ant">Carregar meses anteriores…</option>':'');
    if (sel.innerHTML!==html) sel.innerHTML=html;
    if (!state.periodoEscolhido){ var fech=meses.filter(function(m){ return m<mesHoje(); })[0]; if (fech){ if (state.periodo!==fech){ state.periodo=fech; state.lancMes=fech; } } } // 0.11.0: abre no último mês fechado até você escolher outro período
    if (state.periodo!=='todos' && meses.indexOf(state.periodo)<0) state.periodo='todos';
    sel.value=state.periodo;
  }

  function renderTendencia(){
    var meses=Object.keys(state.docs).sort(); if (meses.length<2){ $('chartMeses').innerHTML=''; return; }
    var dados=meses.map(function(m){ var r=resumo(atosDoMes(m)), x=cancSoTri7Mes(m).length, N=r.N+x, T=r.total+x; return {m:m,b:r.medB,l:r.medL,k:r.kpi,n:r.n,c:T?N/T*100:null,N:N}; });
    var max=Math.max(5,Math.max.apply(null,dados.map(function(d){return Math.max(d.b||0,d.l||0);})));
    max=Math.ceil(max/5)*5;
    var W=Math.max(560,meses.length*92), H=244, pl=34, pr=10, pt=48, pb=30, cw=(W-pl-pr)/meses.length, bw=Math.min(26,cw/3.2);
    var y=function(v){ return pt+(H-pt-pb)*(1-v/max); };
    var s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Mediana bruta e líquida por mês">';
    for (var t=0;t<=max;t+=5){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(pl-6)+'" y="'+(y(t)+4)+'" text-anchor="end" font-size="11">'+t+'</text>'; }
    dados.forEach(function(d,i){
      var cx=pl+cw*i+cw/2;
      [['b','var(--s-bruto)',-1],['l','var(--s-liq)',1]].forEach(function(q){
        var v=d[q[0]]; if (v==null) return; var x=cx+(q[2]<0?-bw-1:1), yy=y(v), h=Math.max(1,y(0)-yy);
        s+='<path d="M'+x+','+y(0)+' V'+(yy+3)+' q0,-3 3,-3 h'+(bw-6)+' q3,0 3,3 V'+y(0)+' Z" fill="'+q[1]+'"/>';
      });
      s+=hitRect(cx-cw/2,pt,cw,H-pt-pb,'<b>'+nomeMes(d.m)+'</b><br>KPI-02: '+pctK(d.k)+' ('+d.n+' registrados)<br>Cancelados: '+pct(d.c)+' ('+d.N+')<br>Mediana bruta: '+f1(d.b)+' d.u.<br>Mediana líquida: '+f1(d.l)+' d.u.',goMes(d.m,'nat'));
      s+='<text x="'+cx+'" y="'+(H-10)+'" text-anchor="middle" font-size="12">'+nomeMes(d.m)+'</text>';
      s+='<text x="'+cx+'" y="16" text-anchor="middle" font-size="12" font-weight="700" style="fill:var(--ink)">'+pctK(d.k)+'</text><text x="'+cx+'" y="32" text-anchor="middle" font-size="11" style="fill:var(--crit)">canc. '+pct(d.c)+'</text>';
    });
    s+='</svg>'; $('chartMeses').innerHTML=s;
  }

  function porNatureza(atos){
    var g={};
    atos.forEach(function(a){ (g[a.nat]=g[a.nat]||[]).push(a); });
    return Object.keys(g).map(function(k){ var r=resumo(g[k]); var eb=est(r.R.map(function(a){return a.bruto;})); return {nat:k,eb:eb,iqr:eb.n>=MIN_N?eb.q3-eb.q1:null,n:r.n,kpi:r.kpi,mB:r.mB,medB:r.medB,mL:r.mL,medL:r.medL,mEsp:r.mEsp,N:r.N,E:r.E,total:r.total,canc:r.total?r.N/r.total*100:null}; });
  }
  function renderNat(atos){
    if (state.pgVis.nat){ $('tabNat').innerHTML=visNat(); return; }
    var todas=porNatureza(atos), menores=todas.filter(function(x){return x.total<MIN_ATOS;}).length;
    $('tabNat').innerHTML='<div class="sec-h"><h2>Por natureza do ato</h2><span class="note">Clique numa linha para abrir o detalhe · dias úteis</span></div>'+
      '<div class="search"><input type="search" id="natBusca" placeholder="Buscar natureza (ex.: contrato, escritura, reurb)" value="'+esc(state.natBusca)+'" aria-label="Buscar natureza">'+
      '<div class="seg" role="group" aria-label="Quais naturezas mostrar"><button type="button" class="segb" data-todas="0" aria-pressed="'+(!state.natTodas)+'">Principais ('+MIN_ATOS+'+ atos)</button><button type="button" class="segb" data-todas="1" aria-pressed="'+state.natTodas+'">Todas ('+todas.length+')</button></div></div>'+
      '<div id="natTabela"></div><div id="detalhe"></div>';
    renderNatTabela(atos);
    if (state.natSel) renderDetalhe(atos.filter(function(a){ return a.nat===state.natSel; }));
  }
  function renderNatTabela(atos){
    var linhas=porNatureza(atos), s=state.sortNat, q=semAc(state.natBusca);
    var ocultas=0;
    linhas=linhas.filter(function(l){
      if (q) return semAc(l.nat).indexOf(q)>=0;
      if (!state.natTodas && l.total<MIN_ATOS && l.nat!==state.natSel){ ocultas++; return false; }
      return true;
    });
    linhas.sort(function(a,b){ var x=a[s.k],y=b[s.k]; if (s.k==='nat') return s.d*String(x).localeCompare(String(y)); return s.d*((x==null?-1:x)-(y==null?-1:y)); });
    var h='<div class="tbl-wrap"><table><thead><tr>'+
      COLS.map(function(c){ return '<th data-k="'+c[0]+'" class="'+(s.k===c[0]?'sorted':'')+'">'+c[1]+(s.k===c[0]?(s.d<0?' ↓':' ↑'):'')+'</th>'; }).join('')+'</tr></thead><tbody>';
    linhas.forEach(function(l){
      var gr=grAtivoPorNome(l.nat); h+='<tr class="click'+(state.natSel===l.nat?' sel':'')+'" tabindex="0" data-nat="'+esc(l.nat)+'"><td class="nat">'+esc(l.nat)+(gr?' <span class="pill mute" title="'+esc('Grupo: '+gr.nats.join(' + '))+'">grupo · '+gr.nats.length+' nomes</span>':'')+'</td><td>'+l.total+'</td><td>'+(l.n?pillKpi(l.kpi):'<span class="pill mute">—</span>')+'</td>'+
        '<td data-tip="'+esc('<b>Bruto · '+esc(l.nat)+'</b><br>'+estTip(l.eb,' d.u.'))+'">'+f1(l.medB)+' <span class="mut">/ '+f1(l.mB)+'</span></td><td>'+f1(l.medL)+' <span class="mut">/ '+f1(l.mL)+'</span></td><td>'+(l.iqr==null?'<span class="mut" title="Menos de '+MIN_N+' atos">poucos atos</span>':Math.round(l.eb.q1)+' a '+Math.round(l.eb.q3)+' <span class="mut">d.u.</span>')+'</td><td>'+f1(l.mEsp)+'</td>'+
        '<td>'+(l.N?'<span class="cbar"><span style="width:'+Math.min(100,l.canc).toFixed(0)+'%"></span></span>'+pct(l.canc)+' <span class="mut">('+l.N+')</span>':'<span class="mut">0%</span>')+'</td></tr>';
    });
    if (!linhas.length) h+='<tr><td colspan="8" class="empty" style="text-align:center">Nenhuma natureza com esse nome no período.</td></tr>';
    h+='</tbody></table></div>';
    h+='<p class="hint" style="margin:8px 0 0">Faixa típica = onde está a metade central dos atos (do 1º ao 3º quartil). Faixa larga = prazo imprevisível naquela natureza, candidata a POP/checklist. Passe o mouse no bruto para ver média, mediana, moda e P90.</p>';
    if (ocultas) h+='<p class="hint" style="margin:8px 0 0">+ '+ocultas+' naturezas com menos de '+MIN_ATOS+' atos no período. Busque pelo nome ou clique em <b>Todas</b>.</p>';
    $('natTabela').innerHTML=h;
  }
  function semAc(x){ return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  // 1.10.4: mesma pessoa com grafias diferentes no VHL e no Tri7 (ex.: Loureço × Lourenço) → primeiro + último nome
  function chavePessoa(n){ var t=semAc(n).split(/\s+/).filter(Boolean); return t.length?t[0]+' '+t[t.length-1]:''; }

  function etapaMeta(nome){ var n=nome.toLowerCase(), m; if ((m=n.match(/(\d+)\s*d\b/))) return +m[1]; if ((m=n.match(/(\d+)\s*h\b/))) return +m[1]/8; return null; }
  function etapasAgg(R){
    var g={};
    R.forEach(function(a){ a.etapas.forEach(function(p){ var x=g[p[0]]=g[p[0]]||{s:0,n:0,v:[]}; x.s+=p[1]; x.n++; x.v.push(p[1]); }); });
    var base=R.filter(function(a){return a.liq!=null;}).length;
    return Object.keys(g).map(function(k){ return {et:k,es:est(g[k].v),media:g[k].s/g[k].n,n:g[k].n,tot:g[k].s,pctAtos:base?g[k].n/base*100:0,meta:etapaMeta(k)}; })
      .sort(function(a,b){ return b.tot-a.tot; });
  }
  function htmlEtapas(lista, limite){
    if (!lista.length) return '<div class="empty">Sem histórico de etapas para esses atos.</div>';
    var mx=Math.max(1.5,Math.max.apply(null,lista.map(function(e){return Math.max(e.media,e.meta||0);})));
    return lista.slice(0,limite||99).map(function(e){
      var w=e.media/mx*100, over=e.meta!=null && e.media>e.meta;
      return '<div class="etapa-row" data-tip="'+esc('<b>'+e.et+'</b><br>'+estTip(e.es,' d.u.')+(e.meta!=null?'<br>Meta: '+f1(e.meta)+' d.u.':'')+'<br>Passou por aqui: '+e.n+' atos ('+pct(e.pctAtos)+')<br>Total: '+e.tot+' d.u.')+'">'+
        '<div class="nm">'+esc(e.et)+' <small>· '+e.n+'</small></div>'+
        '<div class="track"><div class="fill'+(over?' over':'')+'" style="width:'+w.toFixed(1)+'%"></div>'+(e.meta!=null?'<div class="meta" style="left:'+(e.meta/mx*100).toFixed(1)+'%" title="meta"></div>':'')+'</div>'+
        '<div class="vv">'+f1(e.media)+' d.u.'+(e.es.n>=MIN_N?' <span class="mut">· 90% ≤ '+f1(e.es.p90)+'</span>':'')+'</div></div>';
    }).join('');
  }

  function histograma(R){
    var vals=R.map(function(a){return a.bruto;}).filter(function(x){return x!=null;});
    if (!vals.length) return '';
    var mx=Math.max(26,Math.max.apply(null,vals)), cont=new Array(mx+1).fill(0), its=cont.map(function(){ return []; });
    R.forEach(function(a){ if (a.bruto!=null){ cont[a.bruto]++; its[a.bruto].push(a); } });
    var top=Math.max.apply(null,cont), W=560, H=170, pl=28, pr=8, pt=12, pb=26, bw=(W-pl-pr)/(mx+1);
    var y=function(v){ return pt+(H-pt-pb)*(1-v/top); };
    var s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:'+W+'px" role="img" aria-label="Distribuição de dias úteis brutos">';
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="var(--line)"/>';
    cont.forEach(function(c,i){ if(!c) return; var x=pl+i*bw+1, yy=y(c);
      s+='<rect x="'+x+'" y="'+yy+'" width="'+Math.max(1,bw-2)+'" height="'+Math.max(1,y(0)-yy)+'" rx="2" fill="'+(i>25?'var(--crit)':i>20?'var(--warn)':'var(--s-bruto)')+'" pointer-events="none"/>'+
        hitRect(x-1,pt,bw,y(0)-pt,i+' dias úteis: '+c+' ato(s)',goLista(i+' dias úteis'+(state.natSel?' · '+state.natSel:''),'atos',its[i])); });
    [20,25].forEach(function(l){ var x=pl+(l+1)*bw; s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+y(0)+'" stroke="var(--ink)" stroke-dasharray="3 3"/><text x="'+(x+3)+'" y="'+(pt+10)+'" font-size="11">'+l+' d.u.</text>'; });
    for (var t=0;t<=mx;t+=5){ s+='<text x="'+(pl+t*bw+bw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11">'+t+'</text>'; }
    return s+'</svg>';
  }

  function renderDetalhe(atos){
    var r=resumo(atos), nat=state.natSel;
    var lista=r.Rall.slice().sort(function(a,b){ return (b.bruto||0)-(a.bruto||0); });
    var q=state.busca.trim().toLowerCase();
    if (q) lista=lista.filter(function(a){ return a.c.toLowerCase().indexOf(q)>=0; });
    if (state.filtroFora) lista=lista.filter(function(a){ return a.bruto!=null && a.bruto>=a.lim-3; });
    var h='<div class="detail"><div class="detail-h"><div><div class="sub-h" style="margin:0">Detalhe</div><h3>'+esc(nat)+'</h3>'+(grAtivoPorNome(nat)?'<div class="hint">Grupo formado por: '+grAtivoPorNome(nat).nats.map(esc).join(' + ')+' · desfaça em Por natureza → Visual</div>':'')+'</div><button class="btn" type="button" id="fecharDet">Fechar</button></div>'+
      '<div class="kpis" style="margin-bottom:16px">'+
      kpi('KPI-02',pctK(r.kpi),r.dentro+' de '+r.n+(r.J?' · '+r.J+' justif.':''),'hero')+
      (function(){ var eb=est(r.R.map(function(a){return a.bruto;})); return kpi('Bruto',f1(r.medB)+' <small style="font-size:14px">mediana</small>','média '+f1(r.mB)+(eb.moda!=null?' · mais comum '+eb.moda:'')+' · 90% em até '+f1(eb.p90)+' d.u.'+(eb.n<MIN_N?' · poucos atos':'')); })()+
      kpi('Líquido',f1(r.medL)+' <small style="font-size:14px">mediana</small>','média '+f1(r.mL)+' d.u.')+
      kpi('Espera do cliente',f1(r.mEsp),'média d.u. por ato')+
      kpi('Cancelamento',pct(r.total?r.N/r.total*100:null),r.N+' de '+r.total+' atos')+'</div>'+
      '<div class="two"><div><div class="sub-h">Onde o tempo vai · média por etapa</div><div class="legend" style="margin-bottom:2px"><span><span class="dot" style="background:var(--s-liq)"></span>dentro da meta da etapa</span><span><span class="dot" style="background:var(--s-bruto)"></span>acima da meta</span><span>▏ meta</span></div>'+htmlEtapas(etapasAgg(r.R),12)+'</div>'+
      '<div><div class="sub-h">Distribuição · dias úteis brutos até o registro</div>'+histograma(r.R)+'</div></div>'+
      '<div class="sub-h" style="margin-top:16px">Atos ('+lista.length+')</div>'+
      '<div class="search"><input type="search" id="busca" placeholder="Buscar código" value="'+esc(state.busca)+'"><label><input type="checkbox" id="soFora"'+(state.filtroFora?' checked':'')+'> só perto ou acima do limite</label></div>'+
      '<div class="scroll"><table><thead><tr><th>Código</th><th>Ingresso</th><th>Registro</th><th>Bruto</th><th>Líquido</th><th>Espera</th><th>Limite</th><th>Situação</th></tr></thead><tbody>'+
      lista.slice(0,400).map(function(a){
        var jj=justDe(a); var sit=a.dentro?(a.bruto>=a.lim-3?'<span class="pill warn">no limite</span>':'<span class="pill good">no prazo</span>'):(jj?'<span class="pill good" title="'+esc(MOT_JUST[jj.motivo]||'')+'">justificado</span>':'<span class="pill crit">em aberto</span>');
        return '<tr><td>'+protLink(a.c)+'</td><td>'+fmtData(a.ing)+'</td><td>'+(a.reg?fmtData(a.reg):(a.medida==='V'?'<span title="sem Revisão Oficial; usado o Prazo do VHL">VHL</span>':'—'))+'</td><td>'+a.bruto+'</td><td>'+(a.liq==null?'—':a.liq)+'</td><td>'+(a.espera==null?'—':a.espera)+'</td><td>'+a.lim+(a.reing?' <small title="teve reingresso">↺</small>':'')+'</td><td>'+sit+'</td></tr>';
      }).join('')+'</tbody></table></div></div>';
    $('detalhe').innerHTML=h;
  }

  function renderEta(atos){
    var R=atos.filter(function(a){return a.cat==='R';}), lista=etapasAgg(R);
    $('tabEta').innerHTML='<div class="sec-h"><span class="note">Média de dias úteis que o ato fica em cada etapa, até o registro · traço = meta pelo nome da etapa · “90% ≤” = em 90% das passagens o ato saiu da etapa nesse tempo</span></div>'+
      '<div class="legend"><span><span class="dot" style="background:var(--s-liq)"></span>dentro da meta</span><span><span class="dot" style="background:var(--s-bruto)"></span>acima da meta</span></div>'+htmlEtapas(lista)+
      '<p class="hint" style="margin-top:12px">Imprimir Ficha e Arquivamento acontecem depois do registro e não entram aqui nem no prazo.</p>';
  }

  function renderNao(atos){
    if (state.pgVis.nao){ $('tabNao').innerHTML=visNao(atos); return; }
    var XT=cancSoTri7Periodo(); atos=atos.concat(XT);
    var N=atos.filter(function(a){return a.cat==='N';}), E=atos.filter(function(a){return a.cat==='E';}), I=atos.filter(function(a){return a.cat==='I';});
    var porMot={}; N.forEach(function(a){ porMot[a.motivo]=(porMot[a.motivo]||0)+1; });
    var porNat={}, totNat={}; N.forEach(function(a){ porNat[a.nat]=(porNat[a.nat]||0)+1; }); atos.forEach(function(a){ totNat[a.nat]=(totNat[a.nat]||0)+1; });
    function tab(arr,cols){ return '<div class="scroll"><table><thead><tr>'+cols.map(function(c){return '<th>'+c[0]+'</th>';}).join('')+'</tr></thead><tbody>'+arr.slice(0,400).map(function(a){ return '<tr>'+cols.map(function(c){ return '<td>'+c[1](a)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>'; }
    $('tabNao').innerHTML='<div class="sec-h"><h2>Cancelados</h2><span class="note">'+pct(atos.length?N.length/atos.length*100:null)+' dos atos do período ('+N.length+' de '+atos.length+') · saem do KPI-02: a prenotação caducou ou o título foi cancelado/devolvido (Art. 205)</span></div>'+
      '<div class="kpis" style="margin-bottom:12px">'+Object.keys(porMot).sort(function(a,b){return porMot[b]-porMot[a];}).map(function(k){ return kpi(MOTIVOS[k]||k,String(porMot[k]),pct(porMot[k]/N.length*100)+' dos cancelados'); }).join('')+'</div>'+
      '<div class="two"><div><div class="sub-h">Por natureza</div>'+tab(Object.keys(porNat).sort(function(a,b){return porNat[b]-porNat[a];}).map(function(k){return {k:k,v:porNat[k]};}),[['Natureza',function(x){return esc(x.k);}],['Cancelados',function(x){return x.v;}],['% da natureza',function(x){return pct(x.v/totNat[x.k]*100)+' <span class="mut">de '+totNat[x.k]+'</span>';}]])+'</div>'+
      '<div><div class="sub-h">Lista</div>'+tab(N,[['Código',function(a){return protLink(a.c);}],['Natureza',function(a){return esc(a.nat);}],['Ingresso',function(a){return fmtData(a.ing);}],['Saída',function(a){return fmtData(a.fin);}],['Motivo',function(a){return esc(MOTIVOS[a.motivo]||'');}]])+'</div></div>'+
      (XT.length?'<div class="sec-h" style="margin-top:20px"><h2>Cancelados no Tri7, ainda abertos no VHL ('+XT.length+')</h2><span class="note">Contam no cancelamento do mês em que foram cancelados no Tri7. Tarefa da equipe: finalizar no VHL. Quando forem finalizados, passam a contar pelo VHL.</span></div>'+tab(XT,[['Protocolo',function(a){return protLink(a.c);}],['Prenotado',function(a){return fmtData(a.ing);}],['Cancelado no Tri7',function(a){return fmtData(a.fin);}],['Quem cancelou',function(a){return esc(nomeLogin(a.u));}]]):'')+
      '<div class="sec-h" style="margin-top:20px"><h2>Abertura de matrícula + Outros atos</h2><span class="note">Fluxo especial (abertura registrada e suspensa enquanto o outro ato aguarda exigência) — acompanhado à parte</span></div>'+
      (E.length?tab(E,[['Código',function(a){return protLink(a.c);}],['Ingresso',function(a){return fmtData(a.ing);}],['Registro',function(a){return fmtData(a.reg);}],['Saída',function(a){return fmtData(a.fin);}],['Prazo VHL',function(a){return a.pv;}]]):'<div class="empty">Nenhum no período.</div>')+
      (I.length?'<div class="sec-h" style="margin-top:20px"><h2>Sem histórico suficiente</h2><span class="note">Entraram antes do início da Produção por Etapa importada</span></div>'+tab(I,[['Código',function(a){return protLink(a.c);}],['Natureza',function(a){return esc(a.nat);}],['Ingresso',function(a){return fmtData(a.ing);}],['Saída',function(a){return fmtData(a.fin);}],['Prazo VHL',function(a){return a.pv;}]]):'');
  }


  function renderFp(atos){
    var R=atos.filter(function(a){return a.cat==='R' && !a.dentro;}).sort(function(a,b){ return (b.bruto||0)-(a.bruto||0); });
    var abertosT=R.filter(function(a){return !justDe(a);}), just=R.filter(function(a){return !!justDe(a);});
    var abertos=abertosT.filter(obrig), antigos=abertosT.filter(function(a){ return !obrig(a); });
    var opts=Object.keys(MOT_JUST).map(function(k){ return '<option value="'+k+'">'+MOT_JUST[k]+'</option>'; }).join('');
    var h='<div class="sec-h"><span class="note">Atos registrados acima do limite: 20 d.u.; com retorno, 5 d.u. após o retorno (mínimo 20, máximo 25). Com motivo registrado, contam como dentro do prazo e saem das médias.</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+kpi('Em aberto',String(abertos.length),'aguardando motivo · desde '+compLabel(marco()),abertos.length?'canc':'')+kpi('Justificados',String(just.length),'levados à curva normal')+(antigos.length?kpi('Anteriores ao marco',String(antigos.length),'sem justificativa · opcional'):'')+'</div>';
    function linhasFp(lista){ return '<div class="scroll"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Registro</th><th>Bruto</th><th>Limite</th><th>Motivo</th><th>Observação</th><th></th></tr></thead><tbody>'+
      lista.map(function(a){ return '<tr data-cod="'+esc(a.c)+'"><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+fmtData(a.ing)+'</td><td>'+fmtData(a.reg)+(a.regSG?' <span class="pill" title="Data do Selos Gerados no Tri7; a última Revisão Oficial no VHL foi em '+fmtData(a.regSG)+'">selo</span>':'')+'</td><td>'+a.bruto+'</td><td>'+a.lim+'</td>'+
        '<td><select class="mini" aria-label="Motivo">'+opts+'</select></td><td><input class="mini" type="text" placeholder="Ex.: confrontante notificado em 10/06" aria-label="Observação"></td><td><button class="btn primary sm" type="button" data-just-salvar="1">Justificar</button></td></tr>'; }).join('')+'</tbody></table></div>'; }
    h+='<div class="sub-h">Em aberto · a partir de '+compLabel(marco())+'</div>';
    if (!abertos.length) h+='<div class="empty">Nenhum ato fora do prazo sem justificativa a partir de '+compLabel(marco())+'.</div>';
    else h+=linhasFp(abertos);
    if (antigos.length) h+='<div class="sub-h" style="margin-top:16px">Anteriores ao marco · opcional</div><p class="hint" style="margin:0 0 6px">Atos finalizados antes de '+compLabel(marco())+'. Não ficam como pendência; justifique só se quiser.</p>'+linhasFp(antigos);
    if (just.length){
      h+='<div class="sub-h" style="margin-top:16px">Justificados</div><div class="scroll"><table><thead><tr><th>Código</th><th>Natureza</th><th>Bruto</th><th>Motivo</th><th>Observação</th><th></th></tr></thead><tbody>'+
        just.map(function(a){ var j=justDe(a); return '<tr data-cod="'+esc(a.c)+'"><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+a.bruto+'</td><td class="tl">'+esc(MOT_JUST[j.motivo]||j.motivo)+'</td><td class="tl">'+esc(j.obs||'')+'</td><td><button class="btn sm" type="button" data-just-rm="1">Reabrir</button></td></tr>'; }).join('')+'</tbody></table></div>';
    }
    $('tabFp').innerHTML=h;
  }
  // 0.20.0: indício de dupla exigência = 2+ exigências E inconformidade no mesmo protocolo ligada à exigência (decisão de 19/10/2026):
  // (a) erro de tipo exigência/qualificação, ou (b) de quem redigiu a exigência ou fez a análise, desde que o erro não seja de minuta, cadastro, cobrança, selo, GED ou certidão.
  // A mesma pessoa fazer a minuta e a exigência é normal: aí quem decide é o tipo do erro.
  var EX_LIGADO=/^qualificacao|^exigencia/, EX_FORA=/^minuta|^cadastro|^cobranca|^selo|^ged|^certidao|^registro civil/;
  function exIdx(){ var k=[Object.keys(state.inconf).join(','),Object.keys(state.andam).length,state.andVer||0,Object.keys(state.docs).length,Object.keys(state.incCat||{}).length].join('|');
    if (state._exIdx&&state._exIdx.k===k) return state._exIdx;
    var inc={}, vq={}; incTodos().forEach(function(r){ (inc[String(r.c)]=inc[String(r.c)]||[]).push(r); });
    eqExecs().forEach(function(x){ if (/analise|exigencia/.test(semAc(x.raw))) (vq[x.c]=vq[x.c]||{})[chavePessoa(x.nome)]=x.nome; });
    state._exIdx={k:k, inc:inc, vq:vq}; return state._exIdx; }
  function exIndicio(a){ var X=exIdx(), I=X.inc[String(a.c)]||[], ex={}; if (!I.length) return {sim:false, I:[], txt:'sem inconformidade no protocolo'};
    exAutores(a).forEach(function(l){ ex[chavePessoa(nomeLogin(l))]=nomeLogin(l); }); Object.keys(X.vq[String(a.c)]||{}).forEach(function(k){ ex[k]=X.vq[String(a.c)][k]; });
    var vistos={}, mot=[];
    I.forEach(function(r){ var cat=catDe(r), c=semAc(cat), quem=!!ex[chavePessoa(r.r)], ch=r.r+'|'+cat; if (vistos[ch]) return; vistos[ch]=1;
      if (EX_LIGADO.test(c)) mot.push({r:r, sim:true, por:'erro de exigência'}); else if (quem && !EX_FORA.test(c)) mot.push({r:r, sim:true, por:'de quem fez a exigência ou análise'});
      else mot.push({r:r, sim:false, por:EX_FORA.test(c)?'erro de '+cat.split(/[:(/]/)[0].trim().toLowerCase():'de outra pessoa'}); });
    var sim=mot.some(function(m){ return m.sim; });
    return {sim:sim, I:mot, txt:mot.map(function(m){ return (m.sim?'✔ ':'— ')+m.r.r+' · '+catDe(m.r)+' ('+m.por+')'; }).join('\n')}; }
  function renderEx(atos){
    var L=atos.filter(function(a){return state.filtroEx==='div'?(a.cat==='R'&&a.exDiv):(a.nex||0)>=2;}).sort(function(a,b){ return b.nex-a.nex || (a.c<b.c?-1:1); });
    var Rr=atos.filter(function(a){return a.cat==='R';}), comEx=Rr.filter(function(a){return a.nex>0;}).length, comPg=Rr.filter(function(a){return a.npg>0;}).length, comRi=Rr.filter(function(a){return a.nri>0;}).length;
    var av=function(a){ return state.aval[idDoc(a.c)]||null; };
    var avd=function(a){ var d=state.avDraft[a.c]; if (d) return {resultado:d.res,obs:d.obs}; return av(a); }; // o que a linha mostra (rascunho ou salvo)
    var isNa=function(a){ var v=av(a); return !!(v&&v.resultado==='na'); };
    var Ldesc=L.filter(isNa); L=L.filter(function(a){ return !isNa(a); });
    var ind={}; if (state.filtroEx!=='div') L.forEach(function(a){ ind[a.c]=exIndicio(a); });
    var temInd=function(a){ return state.filtroEx==='div'||(ind[a.c]&&ind[a.c].sim); }, Lsem=L.filter(function(a){ return !temInd(a); }), L2=L.length; 
    var nDraft=Object.keys(state.avDraft).length;
    var aval=L.filter(av), nc=aval.filter(function(a){return av(a).resultado==='nc';}), pend=L.filter(function(a){ return !av(a)&&obrig(a)&&temInd(a); }), opc=L.filter(function(a){ return !av(a)&&!obrig(a)&&temInd(a); });
    var q=state.buscaEx.trim().toLowerCase();
    var vis=L.filter(function(a){
      if (q && a.c.toLowerCase().indexOf(q)<0 && a.nat.toLowerCase().indexOf(q)<0) return false;
      if (state.filtroEx==='pend') return !av(a)&&obrig(a)&&temInd(a);
      if (state.filtroEx==='ind') return temInd(a);
      if (state.filtroEx==='sem') return !temInd(a);
      if (state.filtroEx==='div') return true;
      if (state.filtroEx==='nc') return av(a)&&av(a).resultado==='nc';
      return true;
    });
    if (state.filtroEx==='desc') vis=Ldesc.filter(function(a){ return !q || a.c.toLowerCase().indexOf(q)>=0 || a.nat.toLowerCase().indexOf(q)>=0; });
    var h='<div class="sec-h"><h2>Exigências na qualificação</h2><span class="note">Exigência = Nota de Exigência no Tri7 (reemitida sem o título voltar conta uma vez). Parada que o Tri7 explica como custas = pagamento. Parada que o VHL leu como exigência, sem nota nem custas no Tri7 = pagamento. Sem Tri7, vale só o VHL.</span></div>';
    h+='<div class="kpis" style="margin-bottom:10px">'+
      kpi('Com exigência',pct(Rr.length?comEx/Rr.length*100:null),comEx+' de '+Rr.length+' registrados')+
      kpi('Aguardaram pagamento',pct(Rr.length?comPg/Rr.length*100:null),comPg+' atos · custas ou retorno para Minuta')+
      (function(){ var cob=Rr.filter(function(a){return a.exT;}), dv=cob.filter(function(a){return a.exDiv;}); return kpi('Conferido no Tri7',cob.length?pct(cob.length/Rr.length*100):'—',cob.length?dv.length+' com contagem corrigida · filtro "Divergências"':'importe o Relatório de andamentos'); })()+
      '</div><div class="sub-h">'+(state.filtroEx==='div'?'Atos com contagem diferente entre VHL e Tri7':'Títulos com 2 ou mais exigências')+'</div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+
      kpi(state.filtroEx==='div'?'Divergentes':'Com 2+ exigências',String(L2),state.filtroEx==='div'?'contagem corrigida pelo Tri7':pct(atos.length?L2/atos.length*100:null)+' dos '+atos.length+' atos do período')+
      (state.filtroEx==='div'?'':kpi('Com indício de dupla',String(L2-Lsem.length),'2+ exigências + inconformidade ligada à exigência · são estes que pedem avaliação'))+
      kpi('Avaliados',String(aval.length),pend.length+' pendentes desde '+compLabel(marco())+(opc.length?' · '+opc.length+' anteriores (opcional)':''))+
      kpi('Não conformes',String(nc.length),aval.length?pct(nc.length/aval.length*100)+' dos avaliados':'nenhum avaliado ainda',nc.length?'canc':'')+
      kpi('Conformes',String(aval.length-nc.length),'causa do cliente')+
      (Ldesc.length?kpi('Descartadas',String(Ldesc.length),'não eram exigência dupla'):'')+'</div>';
    h+='<div class="search"><input type="search" id="buscaEx" placeholder="Buscar código ou natureza" value="'+esc(state.buscaEx)+'"><div class="seg" role="group" aria-label="Filtro">'+
      [['pend','Pendentes'],['ind','Com indício'],['sem','Sem indício ('+Lsem.length+')'],['nc','Não conformes'],['todos','Todos'],['desc','Descartadas'+(Ldesc.length?' ('+Ldesc.length+')':'')],['div','Divergências VHL × Tri7']].map(function(x){ return '<button type="button" class="segb" data-fex="'+x[0]+'" aria-pressed="'+(state.filtroEx===x[0])+'">'+x[1]+'</button>'; }).join('')+'</div></div>';
    h+='<div class="ctl" style="margin:8px 0"><button class="btn primary sm" type="button" data-av-tudo="1" id="avTudo"'+(nDraft?'':' disabled')+'>'+(nDraft?'Salvar tudo ('+nDraft+' alterada'+(nDraft>1?'s':'')+')':'Salvar tudo')+'</button><span class="hint" style="margin:0">O que você escolhe ou escreve fica guardado na tela até salvar, mesmo trocando de filtro ou salvando outra linha.</span></div>';
    if (!vis.length) h+='<div class="empty">Nada para mostrar com esse filtro.</div>';
    else h+='<div class="scroll" style="max-height:520px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Saída</th><th>Exigências</th><th title="Contagem só pelo VHL">VHL</th><th title="Notas de Exigência no Tri7">Tri7</th><th>Pagto.</th><th>Situação</th><th title="Inconformidade ligada à exigência no mesmo protocolo">Indício</th><th>Avaliação</th><th>Observação</th><th></th></tr></thead><tbody>'+
      vis.slice(0,400).map(function(a){ var v=avd(a)||{}, sujo=!!state.avDraft[a.c];
        return '<tr data-cod="'+esc(a.c)+'"'+(sujo?' class="rasc"':'')+'><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+fmtData(a.ing)+'</td><td>'+fmtData(a.fin)+'</td><td><b>'+a.nex+'</b>'+(!av(a)&&!obrig(a)?' <span class="pill" title="Finalizado antes de '+compLabel(marco())+': avaliação opcional">opcional</span>':'')+'</td><td class="mut">'+(a.nexV!=null?a.nexV:a.nex)+'</td><td class="mut">'+(a.exT?a.exT.ne:'—')+'</td><td>'+(a.npg||'')+'</td><td>'+(SIT[a.cat]||a.cat)+'</td><td>'+(function(){ var x=ind[a.c]; if (!x) return '—'; return x.sim?'<span class="pill warn" data-tip="'+esc(esc(x.txt).replace(/\n/g,'<br>'))+'">possível dupla</span>':'<span class="mut" data-tip="'+esc(esc(x.txt).replace(/\n/g,'<br>'))+'">'+(x.I.length?'inconf. não ligada':'sem inconf.')+'</span>'; })()+'</td>'+
        '<td><select class="mini" aria-label="Avaliação">'+Object.keys(AV).map(function(k){ return '<option value="'+k+'"'+((v.resultado||'')===k?' selected':'')+'>'+AV[k]+'</option>'; }).join('')+'</select></td>'+
        '<td><input class="mini" type="text" value="'+esc(v.obs||'')+'" placeholder="Ex.: cliente trouxe certidão vencida" aria-label="Observação"></td><td class="nw"><button class="btn sm" type="button" data-av-salvar="1">Salvar</button>'+(v.resultado==='nc'?' <button class="btn sm" type="button" data-av-fb="1" title="Abrir o feedback da pessoa que redigiu a exigência">→ Feedback</button>':'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (vis.length>400?'<p class="hint">Mostrando 400 de '+vis.length+'. Use a busca ou escolha um mês.</p>':'');
    $('tabEx').innerHTML=h;
  }

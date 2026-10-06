(function(){
  if (typeof document==='undefined') return;
  var $=function(id){ return document.getElementById(id); };
  var state={ docs:{}, extras:[], arquivos:{prazo:[],etapa:[],demanda:[],inconf:[],tri7:[]}, nomes:{prazo:[],etapa:[],demanda:[],inconf:[],tri7:[]},
    resultado:null, periodo:'todos', aba:'geral', natSel:null, sortNat:{k:'total',d:-1}, filtroFora:false, busca:'', natBusca:'', natTodas:false, just:{}, aval:{}, filtroEx:'pend', buscaEx:'', inconf:{}, incCat:{}, incSetor:'todos', incFiltroCat:null, incFiltroPessoa:null, cert:{}, cfg:{expIni:8, expFim:17, intim:null}, relSel:'__geral', feedback:{}, kp:{}, k9:{}, lancMes:null, lancTodos:false, atPessoa:null, logs:{}, logCache:{}, protSel:null, protTxt:'', senhas:{}, atMes:'todos', atMet:'esp', atTodosDias:false };
  var db=null, dbPronto=false, podeEscrever=true;

  var MOTIVOS={C:'Cancelado (status)',P:'Cancelamento de Protocolo',O:'ONR – recibo de cancelamento',D:'ONR – nota de devolução, sem registro',A:'Re-análise sem registro (caducou)'};
  var MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function nomeMes(m){ var p=m.split('-'); return MESES[+p[1]-1]+'/'+p[0].slice(2); }
  function fmtData(s){ if(!s) return '—'; var p=s.split('-'); return p[2]+'/'+p[1]+'/'+p[0].slice(2); }
  function f1(x){ return x==null||isNaN(x)?'—':(Math.round(x*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}); }
  function pct(x){ return x==null||isNaN(x)?'—':(Math.round(x*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'; }
  function mediana(arr){ var a=arr.filter(function(x){return x!=null;}).sort(function(x,y){return x-y;}); if(!a.length) return null; var m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
  function media(arr){ var a=arr.filter(function(x){return x!=null;}); if(!a.length) return null; return a.reduce(function(s,x){return s+x;},0)/a.length; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function toast(t){ var d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(function(){ d.remove(); },2600); }
  function pctK(x){ if(x==null||isNaN(x)) return '—'; var t=Math.floor(x*100+1e-9)/100; return t.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'; }
  function pillKpi(v){ if(v==null) return '<span class="pill mute">—</span>'; var c=v>=100?'good':v>=95?'warn':'crit'; return '<span class="pill '+c+'">'+pctK(v)+'</span>'; }

  // ——— dados carregados
  function todosAtos(){
    var meses=Object.keys(state.docs).sort(), out=[];
    meses.forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) out=out.concat(state.docs[m].atos); });
    return out;
  }
  function pesquisaTotal(){ var s=0; Object.keys(state.docs).forEach(function(m){ if(state.periodo==='todos'||state.periodo===m) s+=(state.docs[m].raw&&state.docs[m].raw.pesquisa)||0; }); return s; }
  function idDoc(c){ return String(c).replace(/[^A-Za-z0-9_\-.~:@+]/g,'_').slice(0,190) || '_'; }
  function justDe(a){ return a.dentro?null:(state.just[idDoc(a.c)]||null); }
  function ok(a){ return a.dentro || !!justDe(a); }
  var MOT_JUST={geo:'Georreferenciamento – notificação de confrontantes',sobrestado:'Sobrestado a pedido do interessado',duvida:'Suscitação de dúvida (Art. 198)',judicial:'Aguardando ordem judicial ou administrativa',outro:'Outro motivo'};
  function resumo(atos){
    var Rall=atos.filter(function(a){return a.cat==='R';});
    var dentro=Rall.filter(ok).length, J=Rall.filter(function(a){return !!justDe(a);}).length;
    var R=Rall.filter(function(a){return !justDe(a);}); // estatísticas de tempo sem os justificados
    var comLiq=R.filter(function(a){return a.liq!=null;});
    return { R:R, Rall:Rall, J:J, aberto:Rall.length-dentro, prim:Rall.filter(function(a){return !a.nex;}).length, comEx:Rall.filter(function(a){return a.nex>0;}).length,
      n:Rall.length, dentro:dentro, kpi:Rall.length?dentro/Rall.length*100:null,
      N:atos.filter(function(a){return a.cat==='N';}).length, E:atos.filter(function(a){return a.cat==='E';}).length,
      I:atos.filter(function(a){return a.cat==='I';}).length, total:atos.length,
      medB:mediana(R.map(function(a){return a.bruto;})), mB:media(R.map(function(a){return a.bruto;})),
      medL:mediana(comLiq.map(function(a){return a.liq;})), mL:media(comLiq.map(function(a){return a.liq;})),
      mEsp:media(comLiq.map(function(a){return a.espera;})), reing:Rall.filter(function(a){return a.reing;}).length };
  }

  // ——— estatística honesta: distribuição (média, mediana, moda, quartis, P90) e testes de probabilidade
  var MIN_N=10;
  function est(v){ var a=(v||[]).filter(function(x){return x!=null&&!isNaN(x);}).sort(function(x,y){return x-y;}), n=a.length; if (!n) return {n:0};
    function q(p){ var i=(n-1)*p, lo=Math.floor(i); return a[lo]+(a[Math.min(lo+1,n-1)]-a[lo])*(i-lo); }
    var s=0; a.forEach(function(x){ s+=x; }); var o={n:n, media:s/n, mediana:q(.5), q1:q(.25), q3:q(.75), p90:q(.9), min:a[0], max:a[n-1]};
    if (a.every(function(x){ return x%1===0; })){ var c={}, bm=null; a.forEach(function(x){ c[x]=(c[x]||0)+1; if (bm==null||c[x]>c[bm]) bm=x; }); o.moda=+bm; o.modaPct=c[bm]/n*100; }
    return o; }
  function estTip(o, un, fmt){ fmt=fmt||f1; if (!o||!o.n) return 'sem dados';
    return 'Casos: '+o.n+(o.n<MIN_N?' (poucos — leia com cuidado)':'')+'<br>Média: '+fmt(o.media)+un+'<br>Mediana: '+fmt(o.mediana)+un+(o.moda!=null?'<br>Mais comum (moda): '+o.moda+un+' ('+pct(o.modaPct)+')':'')+'<br>Metade dos casos entre '+fmt(o.q1)+' e '+fmt(o.q3)+un+'<br>90% em até '+fmt(o.p90)+un; }
  var LF=[0,0]; function lnF(k){ for (var i=LF.length;i<=k;i++) LF[i]=LF[i-1]+Math.log(i); return LF[k]; }
  function binPmf(k,n,p){ if (p<=0) return k===0?1:0; if (p>=1) return k===n?1:0; return Math.exp(lnF(n)-lnF(k)-lnF(n-k)+k*Math.log(p)+(n-k)*Math.log(1-p)); }
  function binInf(k,n,p){ var s=0; for (var i=0;i<=k;i++) s+=binPmf(i,n,p); return Math.min(1,s); }
  function binSup(k,n,p){ return k<=0?1:Math.max(0,1-binInf(k-1,n,p)); }
  // contagem de ocorrências (k) num volume (n) comparada com a taxa da equipe (p): o que é acaso e o que não é
  function leituraTaxa(k,n,p){ if (!n||p==null) return null; var cum=0, lo=null, hi=null;
    for (var i=0;i<=n;i++){ cum+=binPmf(i,n,p); if (lo==null&&cum>=0.05) lo=i; if (cum>=0.95){ hi=i; break; } }
    var up=binSup(k,n,p), dn=binInf(k,n,p), sig=up<0.05?'acima':dn<0.05?'abaixo':'normal';
    return {lo:lo, hi:hi, esp:n*p, sig:sig, txt:sig==='acima'?'acima do esperado':sig==='abaixo'?'abaixo do esperado':'dentro do esperado'}; }
  // funil com sobredispersão (Spiegelhalter): compara cada pessoa com a equipe considerando o volume dela
  // E a variação natural entre funções diferentes — só aponta quem foge do que seria normal mesmo assim.
  function funilTaxa(itens){ var K=0, N=0; itens.forEach(function(x){ K+=x.k; N+=x.n; }); if (!N) return; var p=K/N;
    var z=itens.map(function(x){ var sd=Math.sqrt(x.n*p*(1-p)); return sd?(x.k-x.n*p)/sd:0; });
    var zs=z.slice().sort(function(a,b){return a-b;}), lo=zs[Math.floor(zs.length*0.1)], hi=zs[Math.ceil(zs.length*0.9)-1];
    var w=z.map(function(v){ return Math.max(lo,Math.min(hi,v)); }), phi=Math.max(1, w.reduce(function(s,v){return s+v*v;},0)/Math.max(1,itens.length));
    itens.forEach(function(x,i){ var zz=z[i]/Math.sqrt(phi), sd=Math.sqrt(phi*x.n*p*(1-p)), sig=zz>1.96?'acima':zz<-1.96?'abaixo':'normal';
      x.lt={lo:Math.max(0,Math.floor(x.n*p-1.645*sd)), hi:Math.ceil(x.n*p+1.645*sd), esp:x.n*p, sig:sig, phi:phi, txt:sig==='acima'?'acima do esperado':sig==='abaixo'?'abaixo do esperado':'dentro do esperado'}; }); }
  // teste do sinal: quantos casos acima/abaixo da mediana de referência — p bilateral
  function testeSinal(acima, abaixo){ var m=acima+abaixo; if (!m) return 1; var k=Math.min(acima,abaixo); return Math.min(1,2*binInf(k,m,.5)); }
  function faixasHTML(vals, cortes, un, rot){
    var n=vals.length; if (!n) return '<div class="empty">Sem dados.</div>';
    var c=new Array(cortes.length+1).fill(0); vals.forEach(function(v){ var i=0; while (i<cortes.length && v>cortes[i]) i++; c[i]++; });
    var mx=Math.max.apply(null,c), im=c.indexOf(mx);
    return c.map(function(x,i){ var lab=i===0?'até '+rot(cortes[0]):i===cortes.length?'acima de '+rot(cortes[i-1]):rot(cortes[i-1])+' a '+rot(cortes[i]);
      return '<div class="etapa-row" data-tip="'+esc('<b>'+lab+'</b><br>'+x+' casos ('+pct(x/n*100)+')')+'"><div class="nm">'+lab+(i===im?' <small>· mais comum</small>':'')+'</div><div class="track"><div class="fill" style="width:'+(x/mx*100).toFixed(1)+'%'+(i===im?'':';opacity:.55')+'"></div></div><div class="vv">'+pct(x/n*100)+'</div></div>'; }).join(''); }

  // ——— render
  function render(){
    renderSelect(); var atos=todosAtos();
    var vazio=!atos.length && !Object.keys(state.inconf).length && !Object.keys(state.cert).length && !Object.keys(state.senhas).length;
    $('secTendencia').hidden = Object.keys(state.docs).length<2;
    if (vazio){
      $('kpis').innerHTML='<div class="panel empty" style="grid-column:1/-1"><b>Nenhum mês carregado ainda</b>Clique em <b>Importar planilhas</b> e solte os 3 exports do VHL. Os resultados ficam salvos aqui e cada mês novo vai se somando.</div>';
      ['tabNat','tabK1','tabCer','tabEta','tabNao','tabFp','tabEx','tabRel'].forEach(function(id){ $(id).innerHTML='<div class="empty">Sem dados para o período.</div>'; });
      if (!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#tabLanc input[type=text],#tabLanc textarea'))) renderLanc(); renderAtend(); renderGraficos(); renderMetodo(); return;
    }
    var r=resumo(atos);
    $('kpis').innerHTML=[
      kpi('KPI-02 · dentro do prazo',pctK(r.kpi),r.dentro+' de '+r.n+' registrados'+(r.J?' · '+r.J+' justificado'+(r.J>1?'s':''):''),'hero'),
      (function(){ var eb=est(r.R.map(function(a){return a.bruto;})); return kpi('Mediana bruta',f1(r.medB)+' <small style="font-size:.9rem">d.u.</small>','média '+f1(r.mB)+(eb.moda!=null?' · mais comum '+eb.moda:'')+' · 90% em até '+f1(eb.p90)); })(),
      (function(){ var fo=r.R.filter(function(a){return a.dentro&&a.bruto!=null;}).map(function(a){return a.lim-a.bruto;}), ef=est(fo), apert=fo.filter(function(x){return x<=3;}).length;
        return kpi('Folga até o limite',(ef.n?f1(ef.mediana):'—')+' <small style="font-size:.9rem">d.u.</small>','mediana · '+(ef.n?pct(apert/ef.n*100)+' registrados com 3 d.u. ou menos de folga':''),apert/Math.max(1,ef.n)>0.05?'canc':''); })(),
      kpi('Mediana líquida',f1(r.medL)+' <small style="font-size:.9rem">d.u.</small>','média '+f1(r.mL)+' · tempo com o cartório'),
      kpi('Espera do cliente',f1(r.mEsp)+' <small style="font-size:.9rem">d.u.</small>','média por ato · exigência/suspensão'),
      kpi('Aprovados na 1ª qualificação',pct(r.n?r.prim/r.n*100:null),r.prim+' sem exigência · '+r.comEx+' com exigência'),
      kpi('KPI-02 complementar · cancelamento',pct(r.total?r.N/r.total*100:null),r.N+' de '+r.total+' atos · cancelado, devolvido ou caducou','canc'),
      kpi('Volume RI',String(r.total+pesquisaTotal()),'inclui '+pesquisaTotal()+' pesquisas qualificadas')
    ].join('') + (r.aberto? '<div class="banner warn" style="grid-column:1/-1;margin:0">'+r.aberto+' ato(s) fora do prazo em aberto. Registre o motivo na aba <b>Fora do prazo</b> para levá-lo à curva normal.</div>':'') + (r.I? '<div class="banner warn" style="grid-column:1/-1;margin:0">'+r.I+' ato(s) sem histórico suficiente ficaram fora do cálculo. Reimporte o mês com a Produção por Etapa começando 2 meses antes.</div>':'');
    renderTendencia(); renderNat(atos); renderEta(atos); renderNao(atos); renderFp(atos); renderEx(atos); renderK1(atos); renderCer(); if (!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#tabRel textarea'))) renderRel(); if (!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#tabLanc input[type=text],#tabLanc textarea'))) renderLanc(); renderAtend(); renderGraficos(); renderMetodo();
  }
  function kpi(l,v,s,cls){ return '<div class="kpi '+(cls||'')+'"><span class="l">'+l+'</span><span class="v">'+v+'</span><span class="s">'+s+'</span></div>'; }

  function renderSelect(){
    var sel=$('selMes'), meses=Object.keys(state.docs).sort().reverse();
    var html='<option value="todos">Todos os meses ('+meses.length+')</option>'+meses.map(function(m){ return '<option value="'+m+'">'+nomeMes(m)+'</option>'; }).join('');
    if (sel.innerHTML!==html) sel.innerHTML=html;
    if (state.periodo!=='todos' && !state.docs[state.periodo]) state.periodo='todos';
    sel.value=state.periodo;
  }

  function renderTendencia(){
    var meses=Object.keys(state.docs).sort(); if (meses.length<2){ $('chartMeses').innerHTML=''; return; }
    var dados=meses.map(function(m){ var r=resumo(state.docs[m].atos); return {m:m,b:r.medB,l:r.medL,k:r.kpi,n:r.n,c:r.total?r.N/r.total*100:null,N:r.N}; });
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
      s+='<rect x="'+(cx-cw/2)+'" y="'+pt+'" width="'+cw+'" height="'+(H-pt-pb)+'" fill="transparent" data-tip="'+esc('<b>'+nomeMes(d.m)+'</b><br>KPI-02: '+pctK(d.k)+' ('+d.n+' registrados)<br>Cancelados: '+pct(d.c)+' ('+d.N+')<br>Mediana bruta: '+f1(d.b)+' d.u.<br>Mediana líquida: '+f1(d.l)+' d.u.')+'"/>';
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
  var COLS=[['nat','Natureza'],['total','Atos'],['kpi','KPI-02'],['medB','Bruto · mediana / média'],['medL','Líquido · mediana / média'],['iqr','Faixa típica · bruto'],['mEsp','Espera média'],['canc','Cancelados']];
  var MIN_ATOS=10;
  function renderNat(atos){
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
      h+='<tr class="click'+(state.natSel===l.nat?' sel':'')+'" tabindex="0" data-nat="'+esc(l.nat)+'"><td class="nat">'+esc(l.nat)+'</td><td>'+l.total+'</td><td>'+(l.n?pillKpi(l.kpi):'<span class="pill mute">—</span>')+'</td>'+
        '<td data-tip="'+esc('<b>Bruto · '+l.nat+'</b><br>'+estTip(l.eb,' d.u.'))+'">'+f1(l.medB)+' <span class="mut">/ '+f1(l.mB)+'</span></td><td>'+f1(l.medL)+' <span class="mut">/ '+f1(l.mL)+'</span></td><td>'+(l.iqr==null?'<span class="mut" title="Menos de '+MIN_N+' atos">poucos atos</span>':Math.round(l.eb.q1)+' a '+Math.round(l.eb.q3)+' <span class="mut">d.u.</span>')+'</td><td>'+f1(l.mEsp)+'</td>'+
        '<td>'+(l.N?'<span class="cbar"><span style="width:'+Math.min(100,l.canc).toFixed(0)+'%"></span></span>'+pct(l.canc)+' <span class="mut">('+l.N+')</span>':'<span class="mut">0%</span>')+'</td></tr>';
    });
    if (!linhas.length) h+='<tr><td colspan="8" class="empty" style="text-align:center">Nenhuma natureza com esse nome no período.</td></tr>';
    h+='</tbody></table></div>';
    h+='<p class="hint" style="margin:8px 0 0">Faixa típica = onde está a metade central dos atos (do 1º ao 3º quartil). Faixa larga = prazo imprevisível naquela natureza, candidata a POP/checklist. Passe o mouse no bruto para ver média, mediana, moda e P90.</p>';
    if (ocultas) h+='<p class="hint" style="margin:8px 0 0">+ '+ocultas+' naturezas com menos de '+MIN_ATOS+' atos no período. Busque pelo nome ou clique em <b>Todas</b>.</p>';
    $('natTabela').innerHTML=h;
  }
  function semAc(x){ return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }

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
    var mx=Math.max(26,Math.max.apply(null,vals)), cont=new Array(mx+1).fill(0);
    vals.forEach(function(v){ cont[v]++; });
    var top=Math.max.apply(null,cont), W=560, H=170, pl=28, pr=8, pt=12, pb=26, bw=(W-pl-pr)/(mx+1);
    var y=function(v){ return pt+(H-pt-pb)*(1-v/top); };
    var s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:'+W+'px" role="img" aria-label="Distribuição de dias úteis brutos">';
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="var(--line)"/>';
    cont.forEach(function(c,i){ if(!c) return; var x=pl+i*bw+1, yy=y(c);
      s+='<rect x="'+x+'" y="'+yy+'" width="'+Math.max(1,bw-2)+'" height="'+Math.max(1,y(0)-yy)+'" rx="2" fill="'+(i>25?'var(--crit)':i>20?'var(--warn)':'var(--s-bruto)')+'" data-tip="'+esc(i+' dias úteis: '+c+' ato(s)')+'"/>'; });
    [20,25].forEach(function(l){ var x=pl+(l+1)*bw; s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+y(0)+'" stroke="var(--ink)" stroke-dasharray="3 3"/><text x="'+(x+3)+'" y="'+(pt+10)+'" font-size="10">'+l+' d.u.</text>'; });
    for (var t=0;t<=mx;t+=5){ s+='<text x="'+(pl+t*bw+bw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10">'+t+'</text>'; }
    return s+'</svg>';
  }

  function renderDetalhe(atos){
    var r=resumo(atos), nat=state.natSel;
    var lista=r.Rall.slice().sort(function(a,b){ return (b.bruto||0)-(a.bruto||0); });
    var q=state.busca.trim().toLowerCase();
    if (q) lista=lista.filter(function(a){ return a.c.toLowerCase().indexOf(q)>=0; });
    if (state.filtroFora) lista=lista.filter(function(a){ return a.bruto!=null && a.bruto>=a.lim-3; });
    var h='<div class="detail"><div class="detail-h"><div><div class="sub-h" style="margin:0">Detalhe</div><h3>'+esc(nat)+'</h3></div><button class="btn" type="button" id="fecharDet">Fechar</button></div>'+
      '<div class="kpis" style="margin-bottom:16px">'+
      kpi('KPI-02',pctK(r.kpi),r.dentro+' de '+r.n+(r.J?' · '+r.J+' justif.':''),'hero')+
      (function(){ var eb=est(r.R.map(function(a){return a.bruto;})); return kpi('Bruto',f1(r.medB)+' <small style="font-size:.9rem">mediana</small>','média '+f1(r.mB)+(eb.moda!=null?' · mais comum '+eb.moda:'')+' · 90% em até '+f1(eb.p90)+' d.u.'+(eb.n<MIN_N?' · poucos atos':'')); })()+
      kpi('Líquido',f1(r.medL)+' <small style="font-size:.9rem">mediana</small>','média '+f1(r.mL)+' d.u.')+
      kpi('Espera do cliente',f1(r.mEsp),'média d.u. por ato')+
      kpi('Cancelamento',pct(r.total?r.N/r.total*100:null),r.N+' de '+r.total+' atos','canc')+'</div>'+
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
    $('tabEta').innerHTML='<div class="sec-h"><h2>Por etapa</h2><span class="note">Média de dias úteis que o ato fica em cada etapa, até o registro · traço = meta pelo nome da etapa · “90% ≤” = em 90% das passagens o ato saiu da etapa nesse tempo</span></div>'+
      '<div class="legend"><span><span class="dot" style="background:var(--s-liq)"></span>dentro da meta</span><span><span class="dot" style="background:var(--s-bruto)"></span>acima da meta</span></div>'+htmlEtapas(lista)+
      '<p class="hint" style="margin-top:12px">Imprimir Ficha e Arquivamento acontecem depois do registro e não entram aqui nem no prazo.</p>';
  }

  function renderNao(atos){
    var N=atos.filter(function(a){return a.cat==='N';}), E=atos.filter(function(a){return a.cat==='E';}), I=atos.filter(function(a){return a.cat==='I';});
    var porMot={}; N.forEach(function(a){ porMot[a.motivo]=(porMot[a.motivo]||0)+1; });
    var porNat={}, totNat={}; N.forEach(function(a){ porNat[a.nat]=(porNat[a.nat]||0)+1; }); atos.forEach(function(a){ totNat[a.nat]=(totNat[a.nat]||0)+1; });
    function tab(arr,cols){ return '<div class="scroll"><table><thead><tr>'+cols.map(function(c){return '<th>'+c[0]+'</th>';}).join('')+'</tr></thead><tbody>'+arr.slice(0,400).map(function(a){ return '<tr>'+cols.map(function(c){ return '<td>'+c[1](a)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>'; }
    $('tabNao').innerHTML='<div class="sec-h"><h2>Cancelados</h2><span class="note">'+pct(atos.length?N.length/atos.length*100:null)+' dos atos do período ('+N.length+' de '+atos.length+') · saem do KPI-02: a prenotação caducou ou o título foi cancelado/devolvido (Art. 205)</span></div>'+
      '<div class="kpis" style="margin-bottom:12px">'+Object.keys(porMot).sort(function(a,b){return porMot[b]-porMot[a];}).map(function(k){ return kpi(MOTIVOS[k]||k,String(porMot[k]),pct(porMot[k]/N.length*100)+' dos cancelados'); }).join('')+'</div>'+
      '<div class="two"><div><div class="sub-h">Por natureza</div>'+tab(Object.keys(porNat).sort(function(a,b){return porNat[b]-porNat[a];}).map(function(k){return {k:k,v:porNat[k]};}),[['Natureza',function(x){return esc(x.k);}],['Cancelados',function(x){return x.v;}],['% da natureza',function(x){return pct(x.v/totNat[x.k]*100)+' <span class="mut">de '+totNat[x.k]+'</span>';}]])+'</div>'+
      '<div><div class="sub-h">Lista</div>'+tab(N,[['Código',function(a){return protLink(a.c);}],['Natureza',function(a){return esc(a.nat);}],['Ingresso',function(a){return fmtData(a.ing);}],['Saída',function(a){return fmtData(a.fin);}],['Motivo',function(a){return esc(MOTIVOS[a.motivo]||'');}]])+'</div></div>'+
      '<div class="sec-h" style="margin-top:20px"><h2>Abertura de matrícula + Outros atos</h2><span class="note">Fluxo especial (abertura registrada e suspensa enquanto o outro ato aguarda exigência) — acompanhado à parte</span></div>'+
      (E.length?tab(E,[['Código',function(a){return protLink(a.c);}],['Ingresso',function(a){return fmtData(a.ing);}],['Registro',function(a){return fmtData(a.reg);}],['Saída',function(a){return fmtData(a.fin);}],['Prazo VHL',function(a){return a.pv;}]]):'<div class="empty">Nenhum no período.</div>')+
      (I.length?'<div class="sec-h" style="margin-top:20px"><h2>Sem histórico suficiente</h2><span class="note">Entraram antes do início da Produção por Etapa importada</span></div>'+tab(I,[['Código',function(a){return protLink(a.c);}],['Natureza',function(a){return esc(a.nat);}],['Ingresso',function(a){return fmtData(a.ing);}],['Saída',function(a){return fmtData(a.fin);}],['Prazo VHL',function(a){return a.pv;}]]):'');
  }


  function renderFp(atos){
    var R=atos.filter(function(a){return a.cat==='R' && !a.dentro;}).sort(function(a,b){ return (b.bruto||0)-(a.bruto||0); });
    var abertos=R.filter(function(a){return !justDe(a);}), just=R.filter(function(a){return !!justDe(a);});
    var opts=Object.keys(MOT_JUST).map(function(k){ return '<option value="'+k+'">'+MOT_JUST[k]+'</option>'; }).join('');
    var h='<div class="sec-h"><h2>Fora do prazo</h2><span class="note">Atos registrados acima de 20 d.u. (ou 25 com reingresso). Com motivo registrado, contam como dentro do prazo e saem das médias.</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+kpi('Em aberto',String(abertos.length),'aguardando motivo',abertos.length?'canc':'')+kpi('Justificados',String(just.length),'levados à curva normal')+'</div>';
    h+='<div class="sub-h">Em aberto</div>';
    if (!abertos.length) h+='<div class="empty">Nenhum ato fora do prazo sem justificativa no período.</div>';
    else h+='<div class="scroll"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Registro</th><th>Bruto</th><th>Limite</th><th>Motivo</th><th>Observação</th><th></th></tr></thead><tbody>'+
      abertos.map(function(a){ return '<tr data-cod="'+esc(a.c)+'"><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+fmtData(a.ing)+'</td><td>'+fmtData(a.reg)+'</td><td>'+a.bruto+'</td><td>'+a.lim+'</td>'+
        '<td><select class="mini" aria-label="Motivo">'+opts+'</select></td><td><input class="mini" type="text" placeholder="Ex.: confrontante notificado em 10/06" aria-label="Observação"></td><td><button class="btn primary sm" type="button" data-just-salvar="1">Justificar</button></td></tr>'; }).join('')+'</tbody></table></div>';
    if (just.length){
      h+='<div class="sub-h" style="margin-top:16px">Justificados</div><div class="scroll"><table><thead><tr><th>Código</th><th>Natureza</th><th>Bruto</th><th>Motivo</th><th>Observação</th><th></th></tr></thead><tbody>'+
        just.map(function(a){ var j=justDe(a); return '<tr data-cod="'+esc(a.c)+'"><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+a.bruto+'</td><td class="tl">'+esc(MOT_JUST[j.motivo]||j.motivo)+'</td><td class="tl">'+esc(j.obs||'')+'</td><td><button class="btn sm" type="button" data-just-rm="1">Reabrir</button></td></tr>'; }).join('')+'</tbody></table></div>';
    }
    $('tabFp').innerHTML=h;
  }
  var AV={'':'Pendente',conforme:'Conforme – causa do cliente',nc:'Não conforme – falha na qualificação'};
  var SIT={R:'Registrado',N:'Cancelado',E:'Abertura + outros',I:'Sem histórico'};
  function renderEx(atos){
    var L=atos.filter(function(a){return (a.nex||0)>=2;}).sort(function(a,b){ return b.nex-a.nex || (a.c<b.c?-1:1); });
    var Rr=atos.filter(function(a){return a.cat==='R';}), comEx=Rr.filter(function(a){return a.nex>0;}).length, comPg=Rr.filter(function(a){return a.npg>0;}).length, comRi=Rr.filter(function(a){return a.nri>0;}).length;
    var av=function(a){ return state.aval[idDoc(a.c)]||null; };
    var aval=L.filter(av), nc=aval.filter(function(a){return av(a).resultado==='nc';});
    var q=state.buscaEx.trim().toLowerCase();
    var vis=L.filter(function(a){
      if (q && a.c.toLowerCase().indexOf(q)<0 && a.nat.toLowerCase().indexOf(q)<0) return false;
      if (state.filtroEx==='pend') return !av(a);
      if (state.filtroEx==='nc') return av(a)&&av(a).resultado==='nc';
      return true;
    });
    var h='<div class="sec-h"><h2>Exigências na qualificação</h2><span class="note">Exigência = título suspenso com o cliente que volta por Re-Análise. Volta direto para Minuta = pagamento (ONR), que não conta como exigência.</span></div>';
    h+='<div class="kpis" style="margin-bottom:10px">'+
      kpi('Com exigência',pct(Rr.length?comEx/Rr.length*100:null),comEx+' de '+Rr.length+' registrados')+
      kpi('Aguardaram pagamento',pct(Rr.length?comPg/Rr.length*100:null),comPg+' atos · retorno para Minuta')+'</div><div class="sub-h">Títulos com 2 ou mais exigências</div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+
      kpi('Com 2+ exigências',String(L.length),pct(atos.length?L.length/atos.length*100:null)+' dos '+atos.length+' atos do período')+
      kpi('Avaliados',String(aval.length),(L.length-aval.length)+' pendentes')+
      kpi('Não conformes',String(nc.length),aval.length?pct(nc.length/aval.length*100)+' dos avaliados':'nenhum avaliado ainda',nc.length?'canc':'')+
      kpi('Conformes',String(aval.length-nc.length),'causa do cliente')+'</div>';
    h+='<div class="search"><input type="search" id="buscaEx" placeholder="Buscar código ou natureza" value="'+esc(state.buscaEx)+'"><div class="seg" role="group" aria-label="Filtro">'+
      [['pend','Pendentes'],['nc','Não conformes'],['todos','Todos']].map(function(x){ return '<button type="button" class="segb" data-fex="'+x[0]+'" aria-pressed="'+(state.filtroEx===x[0])+'">'+x[1]+'</button>'; }).join('')+'</div></div>';
    if (!vis.length) h+='<div class="empty">Nada para mostrar com esse filtro.</div>';
    else h+='<div class="scroll" style="max-height:520px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Saída</th><th>Exigências</th><th>Pagto.</th><th>Situação</th><th>Avaliação</th><th>Observação</th><th></th></tr></thead><tbody>'+
      vis.slice(0,400).map(function(a){ var v=av(a)||{};
        return '<tr data-cod="'+esc(a.c)+'"><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+fmtData(a.ing)+'</td><td>'+fmtData(a.fin)+'</td><td>'+a.nex+'</td><td>'+(a.npg||'')+'</td><td>'+(SIT[a.cat]||a.cat)+'</td>'+
        '<td><select class="mini" aria-label="Avaliação">'+Object.keys(AV).map(function(k){ return '<option value="'+k+'"'+((v.resultado||'')===k?' selected':'')+'>'+AV[k]+'</option>'; }).join('')+'</select></td>'+
        '<td><input class="mini" type="text" value="'+esc(v.obs||'')+'" placeholder="Ex.: cliente trouxe certidão vencida" aria-label="Observação"></td><td><button class="btn sm" type="button" data-av-salvar="1">Salvar</button></td></tr>'; }).join('')+'</tbody></table></div>'+
      (vis.length>400?'<p class="hint">Mostrando 400 de '+vis.length+'. Use a busca ou escolha um mês.</p>':'');
    $('tabEx').innerHTML=h;
  }

  // ——— KPI-01 · inconformidades
  var MIN_PROD=30;
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
    if (!todos.length){ $('tabK1').innerHTML='<div class="empty"><b>Nenhuma inconformidade importada</b>Suba a planilha "Consulta de inconformidades" do VHL em Importar planilhas.</div>'; return; }
    var k=kpi1Mes(atos, todos);
    var recs=incRecs().filter(function(r){ return state.incSetor==='todos' || r.t==='RI'; });
    var ext=recs.filter(function(r){return grupoDe(r)==='E';}).length;
    var h='<div class="sec-h"><h2>KPI-01 · Inconformidades</h2><span class="note">KPI-01 = % dos atos RI registrados no período que tiveram ao menos 1 inconformidade, ligada ao ato pelo código (independe da data do registro da inconformidade).</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+
      kpi('KPI-01 · atos com inconformidade',pct(k.k),k.c+' de '+k.n+' registrados','hero')+
      kpi('KPI-01 complementar · erro externo',pct(k.ke),k.e+' atos · erro que saiu do cartório',k.e?'canc':'')+
      kpi('Inconformidades registradas',String(recs.length),(recs.length-ext)+' internas · '+ext+' externas')+'</div>';
    // tabela mensal
    var meses=Object.keys(state.docs).sort();
    if (meses.length){
      h+='<div class="sub-h">Mês a mês</div><div class="tbl-wrap"><table style="max-width:760px"><thead><tr><th>Mês</th><th>Registrados</th><th>Com inconformidade</th><th>KPI-01</th><th>Erro externo</th><th title="registros de inconformidade RI no mês ÷ atos RI finalizados no mês">Fórmula antiga</th></tr></thead><tbody>'+
      meses.map(function(m){ var d=state.docs[m], q=kpi1Mes(d.atos,todos), regMes=(state.inconf[m]||[]).filter(function(r){return r.t==='RI';}).length, den=d.atos.length+((d.raw&&d.raw.pesquisa)||0);
        return '<tr><td>'+nomeMes(m)+'</td><td>'+q.n+'</td><td>'+q.c+'</td><td><b>'+pct(q.k)+'</b></td><td>'+pct(q.ke)+'</td><td class="mut">'+(state.inconf[m]?pct(regMes/den*100):'—')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    }
    // filtros
    h+='<div class="search" style="margin-top:16px"><div class="seg" role="group" aria-label="Setor"><button type="button" class="segb" data-incsetor="todos" aria-pressed="'+(state.incSetor==='todos')+'">Todos os setores</button><button type="button" class="segb" data-incsetor="ri" aria-pressed="'+(state.incSetor==='ri')+'">Só RI</button></div>'+
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
    h+='<div class="sub-h" style="margin-top:16px">Registros ('+lista.length+')</div><div class="scroll" style="max-height:480px"><table class="tleft"><thead><tr><th>Data</th><th>Documento</th><th>Pessoa</th><th>Tipo</th><th>Erro (nome)</th><th>Observação</th></tr></thead><tbody>'+
      lista.slice(0,400).map(function(r){ var c=catDe(r), man=!!ovDe(r).cat;
        return '<tr data-incid="'+esc(r.id)+'"><td>'+fmtData(r.d)+'</td><td>'+(r.t==='RI'?protLink(r.c):esc(r.c))+' <span class="mut">'+esc(r.t)+'</span></td><td class="tl">'+esc(r.r)+'</td><td><select class="mini" data-incgsel="1" aria-label="Interno ou externo"'+(ovDe(r).g?' style="border-color:var(--brand)"':'')+'><option value="I"'+(grupoDe(r)==='I'?' selected':'')+'>Interno</option><option value="E"'+(grupoDe(r)==='E'?' selected':'')+'>Externo</option></select></td>'+
        '<td><select class="mini" data-inccatsel="1" aria-label="Erro"'+(man?' style="border-color:var(--brand)"':'')+'>'+opts.map(function(o){ return '<option'+(o===c?' selected':'')+'>'+esc(o)+'</option>'; }).join('')+'</select></td>'+
        '<td class="tl" style="min-width:280px">'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table></div>'+(lista.length>400?'<p class="hint">Mostrando 400 de '+lista.length+'. Escolha um mês ou filtre.</p>':'');
    $('tabK1').innerHTML=h;
  }


  // ——— aba Relatórios (o que aparece na tela é o que sai impresso)
  var downloads=null;
  var REL_CSS='@page{size:A4;margin:14mm 12mm}'+
    '.relsheet{font-family:"Segoe UI",Arial,sans-serif;color:#2b2926;font-size:11.5px;background:#fff;max-width:860px;margin:0 auto;padding:26px 28px;line-height:1.45}'+
    '.relsheet header{border-bottom:3px solid #FC6506;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;gap:16px;align-items:flex-end;flex-wrap:wrap}'+
    '.relsheet h1{font-size:19px;margin:0 0 3px;color:#2b2926}.relsheet h2{font-size:12px;margin:20px 0 8px;color:#343434;text-transform:uppercase;letter-spacing:.05em;border-left:4px solid #FC6506;padding-left:8px}'+
    '.relsheet .rmeta{color:#716a60;font-size:11px}.relsheet .org{font-weight:700;color:#FC6506;font-size:12px}'+
    '.relsheet .tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.relsheet .tile{border:1px solid #e3dfd8;border-radius:8px;padding:8px 10px;break-inside:avoid}'+
    '.relsheet .tile b{display:block;font-size:18px;color:#2b2926}.relsheet .tile span{color:#716a60;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em}.relsheet .tile .rmeta{font-size:10px}'+
    '.relsheet table{width:100%;border-collapse:collapse;margin-top:4px}.relsheet th,.relsheet td{border-bottom:1px solid #e3dfd8;padding:5px 6px;text-align:left;vertical-align:top;color:#2b2926;white-space:normal;background:transparent;position:static}'+
    '.relsheet th{font-size:9.5px;text-transform:uppercase;color:#716a60;background:#faf8f5;letter-spacing:.03em}.relsheet td.n,.relsheet th.n{text-align:right;font-variant-numeric:tabular-nums}'+
    '.relsheet .ext{color:#b3362f;font-weight:700}.relsheet .acima{color:#b3362f;font-weight:700}.relsheet .bom{color:#1f7a4d;font-weight:700}'+
    '.relsheet .bar{height:8px;background:#FC6506;border-radius:2px}.relsheet .nota{color:#716a60;font-size:10.5px;margin-top:6px}'+
    '.relsheet .devol{border:1px solid #e3dfd8;border-radius:6px;padding:8px 10px;min-height:44px;white-space:pre-wrap;margin-bottom:8px}.relsheet .devol.vazio{min-height:58px}'+
    '.relsheet .dlab{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#716a60;margin:8px 0 3px}'+
    '.relsheet textarea{width:100%;min-height:58px;border:1px solid #e3dfd8;border-radius:6px;padding:8px 10px;font:inherit;color:#2b2926;background:#fffdf9;resize:vertical;box-sizing:border-box}'+
    '.relsheet .ass{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:34px}.relsheet .ass div{border-top:1px solid #333;padding-top:4px;text-align:center;font-size:10.5px}'+
    '.relsheet tr{break-inside:avoid}@media (max-width:640px){.relsheet{padding:16px}.relsheet .tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}';
  function nomePeriodo(){ if (state.periodo!=='todos') return nomeMes(state.periodo); var m=Object.keys(state.docs).sort(); return m.length?nomeMes(m[0])+' a '+nomeMes(m[m.length-1]):'todos os meses'; }
  function mesesPeriodo(){ return Object.keys(state.docs).sort().filter(function(m){ return state.periodo==='todos'||state.periodo===m; }); }
  // produção detalhada por pessoa (chave = nome sem acento, para casar VHL e Tri7)
  function prodPessoas(){
    var P={};
    mesesPeriodo().forEach(function(m){ var pr=(state.docs[m].raw||{}).producao||{};
      Object.keys(pr).forEach(function(nome){ var v=pr[nome], k=semAc(nome), x=P[k]=P[k]||{nome:nome,docs:0,et:{},pz:{},mes:{}};
        var d=typeof v==='number'?v:v.d; x.docs+=d; x.mes[m]=(x.mes[m]||0)+d;
        if (v&&v.e) Object.keys(v.e).forEach(function(e){ x.et[e]=(x.et[e]||0)+v.e[e]; });
        if (v&&v.z) Object.keys(v.z).forEach(function(e){ x.pz[e]=(x.pz[e]||0)+v.z[e]; }); }); });
    return P;
  }
  function relDados(){
    var P=prodPessoas(), meses=mesesPeriodo(), recs=incRecs().filter(function(r){ return state.incSetor==='todos'||r.t==='RI'; });
    var I={}; recs.forEach(function(r){ var k=semAc(r.r), x=I[k]=I[k]||{nome:r.r,recs:[]}; x.recs.push(r); });
    var cr=certCalc(certRecs()), C={}; cr.forEach(function(c){ if (!c.u || c.u==='Tri7') return; var k=semAc(c.u), x=C[k]=C[k]||{nome:c.u,recs:[]}; x.recs.push(c); });
    var S={}, LS=senhasLista(state.periodo); if (LS.length){ var ANs=atendAnalise(LS); Object.keys(ANs.P).forEach(function(n){ S[semAc(n)]=ANs.P[n]; }); }
    var pessoas={}; [P,I,C,S].forEach(function(o){ Object.keys(o).forEach(function(k){ if (!pessoas[k]) pessoas[k]=(P[k]||o[k]).nome; }); });
    // médias da equipe: taxa e dias por etapa
    var tn=0, td=0; Object.keys(P).forEach(function(k){ if (P[k].docs>=MIN_PROD){ td+=P[k].docs; tn+=((I[k]||{}).recs||[]).filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }).length; } });
    var eqE={}, eqZ={}; Object.keys(P).forEach(function(k){ Object.keys(P[k].et).forEach(function(e){ eqE[e]=(eqE[e]||0)+P[k].et[e]; eqZ[e]=(eqZ[e]||0)+(P[k].pz[e]||0); }); });
    var itR=Object.keys(P).filter(function(k){ return P[k].docs>=MIN_PROD; }).map(function(k){ return {key:k, n:P[k].docs, k:((I[k]||{}).recs||[]).filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }).length}; });
    funilTaxa(itR); var LT={}; itR.forEach(function(x){ LT[x.key]=x.lt; });
    return {LT:LT,P:P,I:I,C:C,S:S,pessoas:pessoas,meses:meses,taxaEq:td?tn/td*100:null,eqE:eqE,eqZ:eqZ};
  }
  function chaveFeedback(k){ return idDoc(k.replace(/\s+/g,'-')+'_'+state.periodo); }
  function cabecalhoRel(titulo, sub){
    return '<header><div><div class="org">CRCO · Sistema de Gestão da Qualidade</div><h1>'+esc(titulo)+'</h1><div class="rmeta">'+sub+'</div></div>'+
      '<div class="rmeta" style="text-align:right">Emitido em '+new Date().toLocaleDateString('pt-BR')+'<br>Fontes: VHL (Produção, Inconformidades, Senhas) e Tri7</div></header>';
  }
  function tilesRel(arr){ return '<div class="tiles">'+arr.map(function(t){ return '<div class="tile"><span>'+t[0]+'</span><b>'+t[1]+'</b>'+(t[2]?'<div class="rmeta">'+t[2]+'</div>':'')+'</div>'; }).join('')+'</div>'; }
  function tabErros(recs){
    var c={}; recs.forEach(function(r){ var k=catDe(r); c[k]=(c[k]||0)+1; }); var ks=Object.keys(c).sort(function(a,b){return c[b]-c[a];}), mx=ks.length?c[ks[0]]:1;
    return '<table><thead><tr><th>Erro</th><th class="n">Qtd.</th><th class="n">%</th><th style="width:28%"></th></tr></thead><tbody>'+ks.map(function(k){ return '<tr><td>'+esc(k)+'</td><td class="n">'+c[k]+'</td><td class="n">'+pct(c[k]/recs.length*100)+'</td><td><div class="bar" style="width:'+(c[k]/mx*100).toFixed(0)+'%"></div></td></tr>'; }).join('')+'</tbody></table>';
  }
  function corpoPessoa(k, D, paraImprimir){
    var p=D.P[k]||{nome:D.pessoas[k],docs:0,et:{},pz:{},mes:{}}, nome=D.pessoas[k];
    var inc=((D.I[k]||{}).recs)||[], incProd=inc.filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }), ext=inc.filter(function(r){return grupoDe(r)==='E';}).length;
    var taxa=p.docs>=MIN_PROD?incProd.length/p.docs*100:null, cer=((D.C[k]||{}).recs)||[];
    var cerCalc=cer.filter(function(c){return !c.intim;}), cerOk=cerCalc.filter(function(c){return c.ok;}).length;
    var totEt=Object.keys(p.et).reduce(function(s,e){return s+p.et[e];},0);
    var h=cabecalhoRel('Relatório de desempenho — qualidade e produção','<b>'+esc(nome)+'</b> · Período: '+nomePeriodo()+(state.incSetor==='ri'?' · inconformidades só RI':''));
    h+='<h2>Resumo</h2>'+tilesRel([
      ['Documentos trabalhados',p.docs||'—','no VHL'],['Execuções de etapa',totEt||'—',Object.keys(p.et).length+' tipos de etapa'],
      ['Taxa de inconformidade',taxa==null?'—':pct(taxa),'média da equipe '+pct(D.taxaEq)+(function(){ var lt=taxa!=null?D.LT[k]:null; return lt?' · '+lt.txt+' (esperado ≈ '+Math.round(lt.esp)+', normal até '+lt.hi+')':''; })()],['Inconformidades',inc.length,(inc.length-ext)+' internas · '+ext+' externas']])+
      (cer.length?'<div style="height:8px"></div>'+tilesRel([['Certidões emitidas',cer.length,'Tri7'],['No prazo',cerCalc.length?pct(cerOk/cerCalc.length*100):'—',cerCalc.length?cerOk+' de '+cerCalc.length:'fluxo de intimação'],['Mediana',fmtH(mediana(cer.map(function(c){return c.hu;}))),'horas úteis'],['Fora do prazo',cerCalc.length-cerOk,'']]):'')+
      (taxa==null&&inc.length?'<p class="nota">Taxa não calculada: menos de '+MIN_PROD+' documentos da pessoa no VHL no período.</p>':'');
    // mês a mês
    if (D.meses.length>1){ h+='<h2>Mês a mês</h2><table><thead><tr><th>Mês</th><th class="n">Documentos</th><th class="n">Inconformidades</th><th class="n">Taxa</th>'+(cer.length?'<th class="n">Certidões</th>':'')+'</tr></thead><tbody>'+
      D.meses.map(function(m){ var d=p.mes[m]||0, n=inc.filter(function(r){return r.d.slice(0,7)===m;}).length, c=cer.filter(function(x){return x.mes===m;}).length;
        return '<tr><td>'+nomeMes(m)+'</td><td class="n">'+(d||'—')+'</td><td class="n">'+n+'</td><td class="n">'+(d>=10?pct(n/d*100):'—')+'</td>'+(cer.length?'<td class="n">'+c+'</td>':'')+'</tr>'; }).join('')+'</tbody></table>'; }
    // produção por etapa com tempo
    var ets=Object.keys(p.et).sort(function(a,b){return p.et[b]-p.et[a];});
    h+='<h2>Produção por etapa</h2>'+(ets.length?'<table><thead><tr><th>Etapa</th><th class="n">Execuções</th><th class="n">%</th><th class="n">Dias úteis na etapa (média)</th><th class="n">Média da equipe</th><th class="n">Meta</th></tr></thead><tbody>'+
      ets.map(function(e){ var med=p.pz[e]!=null?p.pz[e]/p.et[e]:null, eq=D.eqE[e]?D.eqZ[e]/D.eqE[e]:null, meta=etapaMeta(e), cls=meta!=null&&med!=null&&p.et[e]>=MIN_N?(med>meta?' class="n acima"':' class="n bom"'):' class="n"';
        return '<tr><td>'+esc(e)+'</td><td class="n">'+p.et[e]+'</td><td class="n">'+pct(p.et[e]/totEt*100)+'</td><td'+cls+'>'+(med==null?'—':f1(med))+'</td><td class="n">'+(eq==null?'—':f1(eq))+'</td><td class="n">'+(meta==null?'—':f1(meta))+'</td></tr>'; }).join('')+
      '<tr><td><b>Total</b></td><td class="n"><b>'+totEt+'</b></td><td></td><td></td><td></td><td></td></tr></tbody></table><p class="nota">Dias úteis na etapa = tempo que o documento ficou na etapa até a pessoa executar. Verde dentro da meta pelo nome da etapa, vermelho acima.</p>':'<p class="nota">Sem etapas registradas no VHL no período.</p>');
    if (D.S&&D.S[k]) h+='<h2>Atendimento no balcão (senhas)</h2>'+atendPessoaHTML(D.S[k],null,true);
    // erros
    h+='<h2>Inconformidades por tipo de erro</h2>'+(inc.length?tabErros(inc):'<p class="nota">Nenhuma inconformidade registrada no período.</p>');
    if (inc.length) h+='<h2>Registros de inconformidade</h2><table><thead><tr><th>Data</th><th>Documento</th><th>Tipo</th><th>Erro</th><th>Observação</th></tr></thead><tbody>'+
      inc.slice().sort(function(a,b){return a.d<b.d?-1:1;}).map(function(r){ return '<tr><td>'+fmtData(r.d)+'</td><td>'+esc(r.c)+' '+esc(r.t)+'</td>'+(grupoDe(r)==='E'?'<td class="ext">Externo</td>':'<td>Interno</td>')+'<td>'+esc(catDe(r))+'</td><td>'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table>';
    // devolutiva
    var fb=state.feedback[chaveFeedback(k)]||{}, campos=[['fortes','Pontos fortes'],['atencao','Pontos de atenção'],['acoes','Ações combinadas e prazo']];
    h+='<h2>Devolutiva</h2>'+campos.map(function(c){ var v=fb[c[0]]||'';
      return '<div class="dlab">'+c[1]+'</div>'+(paraImprimir?'<div class="devol'+(v?'':' vazio')+'">'+esc(v)+'</div>':'<textarea data-fb="'+c[0]+'" aria-label="'+c[1]+'" placeholder="Escreva aqui — sai no relatório impresso">'+esc(v)+'</textarea>'); }).join('')+
      '<div class="ass"><div>Gestor(a) responsável</div><div>'+esc(nome)+' — ciência em ___/___/______</div></div>';
    return h;
  }
  function corpoGeral(D){
    var k1=kpi1Mes(todosAtos(), incTodos()), recs=[]; Object.keys(D.I).forEach(function(k){ recs=recs.concat(D.I[k].recs); });
    var cr=certCalc(certRecs()).filter(function(c){return !c.intim;}), cok=cr.filter(function(c){return c.ok;}).length;
    var linhas=Object.keys(D.pessoas).map(function(k){ var p=D.P[k]||{docs:0,et:{}}, inc=((D.I[k]||{}).recs)||[], ip=inc.filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }).length, ext=inc.filter(function(r){return grupoDe(r)==='E';}).length, c=((D.C[k]||{}).recs)||[];
      return {lt:D.LT[k],nome:D.pessoas[k],docs:p.docs,ex:Object.keys(p.et).reduce(function(s,e){return s+p.et[e];},0),inc:inc.length,ext:ext,taxa:p.docs>=MIN_PROD?ip/p.docs*100:null,cert:c.length}; })
      .sort(function(a,b){ return b.docs-a.docs; });
    var h=cabecalhoRel('Relatório geral — qualidade e produção da equipe','Período: '+nomePeriodo()+(state.incSetor==='ri'?' · inconformidades só RI':''));
    h+='<h2>Indicadores</h2>'+tilesRel([['KPI-01',pct(k1.k),k1.c+' de '+k1.n+' atos RI'],['KPI-01 complementar',pct(k1.ke),'erro externo'],['Taxa da equipe',pct(D.taxaEq),'inconformidades ÷ documentos'],['Certidões no prazo',cr.length?pctK(cok/cr.length*100):'—',cr.length?cok+' de '+cr.length:'']]);
    h+='<h2>Por pessoa</h2><table><thead><tr><th>Pessoa</th><th class="n">Documentos</th><th class="n">Execuções</th><th class="n">Inconf.</th><th class="n">Taxa</th><th>Leitura</th><th class="n">Externas</th><th class="n">Certidões</th></tr></thead><tbody>'+
      linhas.map(function(x){ var lt=x.taxa!=null?x.lt:null; return '<tr><td>'+esc(x.nome)+'</td><td class="n">'+(x.docs||'—')+'</td><td class="n">'+(x.ex||'—')+'</td><td class="n">'+x.inc+'</td><td class="n">'+(x.taxa==null?'—':pct(x.taxa))+'</td><td class="'+(lt&&lt.sig==='acima'?'acima':lt&&lt.sig==='abaixo'?'bom':'')+'">'+(lt?lt.txt:'—')+'</td><td class="n">'+(x.ext||'')+'</td><td class="n">'+(x.cert||'')+'</td></tr>'; }).join('')+'</tbody></table>'+
      '<p class="nota">Taxa = inconformidades ÷ documentos trabalhados no VHL, só com '+MIN_PROD+'+ documentos no período. Leitura: "acima" ou "abaixo do esperado" só quando a pessoa foge, com 95% de confiança, da faixa normal para o volume dela (já contando a variação natural entre funções).</p>';
    h+='<h2>Erros mais frequentes</h2>'+(recs.length?tabErros(recs):'<p class="nota">Nenhuma inconformidade no período.</p>');
    // etapas da equipe
    var ets=Object.keys(D.eqE).sort(function(a,b){return D.eqE[b]-D.eqE[a];}).slice(0,15);
    h+='<h2>Tempo médio por etapa (equipe)</h2><table><thead><tr><th>Etapa</th><th class="n">Execuções</th><th class="n">Dias úteis (média)</th><th class="n">Meta</th></tr></thead><tbody>'+
      ets.map(function(e){ var med=D.eqZ[e]/D.eqE[e], meta=etapaMeta(e); return '<tr><td>'+esc(e)+'</td><td class="n">'+D.eqE[e]+'</td><td class="n'+(meta!=null?(med>meta?' acima':' bom'):'')+'">'+f1(med)+'</td><td class="n">'+(meta==null?'—':f1(meta))+'</td></tr>'; }).join('')+'</tbody></table>';
    return h;
  }
  function renderRel(){
    var D=relDados(), ks=Object.keys(D.pessoas).sort(function(a,b){ return D.pessoas[a].localeCompare(D.pessoas[b]); });
    if (!ks.length){ $('tabRel').innerHTML='<div class="empty"><b>Sem dados de pessoas ainda</b>Importe a Produção por Etapa (e, se quiser, Inconformidades e Andamentos do Tri7).</div>'; return; }
    if (state.relSel!=='__geral' && !D.pessoas[state.relSel]) state.relSel='__geral';
    var h='<style>'+REL_CSS+'.relwrap{background:var(--surface-2);border-radius:12px;padding:16px;overflow-x:auto}.relsheet{box-shadow:0 2px 14px rgba(0,0,0,.12);border-radius:4px}</style>'+
      '<div class="search"><select id="relSel" aria-label="Relatório de"><option value="__geral"'+(state.relSel==='__geral'?' selected':'')+'>Equipe (relatório geral)</option>'+
      ks.map(function(k){ return '<option value="'+esc(k)+'"'+(state.relSel===k?' selected':'')+'>'+esc(D.pessoas[k])+'</option>'; }).join('')+'</select>'+
      '<div class="seg" role="group" aria-label="Setor"><button type="button" class="segb" data-incsetor="todos" aria-pressed="'+(state.incSetor==='todos')+'">Todos os setores</button><button type="button" class="segb" data-incsetor="ri" aria-pressed="'+(state.incSetor==='ri')+'">Só RI</button></div>'+
      '<span class="spacer"></span>'+(state.relSel!=='__geral'&&dbPronto?'<button class="btn sm" type="button" id="fbSalvar">Salvar devolutiva</button>':'')+'<button class="btn primary sm" type="button" id="relBaixar">Baixar para imprimir</button></div>'+
      '<p class="hint" style="margin:0 0 10px">O período segue o seletor do topo ('+nomePeriodo()+'). O arquivo baixado abre no navegador: Ctrl+P para imprimir ou salvar em PDF.</p>'+
      '<div class="relwrap"><div class="relsheet">'+(state.relSel==='__geral'?corpoGeral(D):corpoPessoa(state.relSel,D,false))+'</div></div>';
    $('tabRel').innerHTML=h;
  }
  function lerDevolutiva(){ var o={}; document.querySelectorAll('#tabRel textarea[data-fb]').forEach(function(t){ o[t.dataset.fb]=t.value.trim(); }); return o; }
  function baixarRelatorio(){
    var D=relDados(), geral=state.relSel==='__geral';
    if (!geral){ var fb=lerDevolutiva(); state.feedback[chaveFeedback(state.relSel)]=Object.assign({},state.feedback[chaveFeedback(state.relSel)]||{},fb); }
    var corpo=geral?corpoGeral(D):corpoPessoa(state.relSel,D,true), nome=geral?'Relatório geral':D.pessoas[state.relSel];
    var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(nome)+' — '+esc(nomePeriodo())+'</title><style>body{margin:0;background:#fff}'+REL_CSS+'@media print{.noprint{display:none}.relsheet{padding:0}}</style></head><body>'+
      '<div class="noprint" style="font-family:Segoe UI,Arial,sans-serif;background:#fde8da;padding:8px 12px;margin:12px auto;max-width:860px;border-radius:6px;font-size:12px">Para imprimir ou salvar em PDF: Ctrl+P (Cmd+P no Mac).</div><div class="relsheet">'+corpo+'</div></body></html>';
    var arq=(geral?'Relatorio geral':'Relatorio - '+nome)+' - '+nomePeriodo().replace(/\//g,'-')+'.html';
    if (!downloads){ toast('Download indisponível nesta visualização'); return; }
    downloads.save({filename:arq, data:html}).then(function(){ toast('Relatório baixado — abra e use Ctrl+P'); }).catch(function(e){ if (e&&e.code!=='declined') toast('Não consegui gerar o arquivo'); });
  }
  function salvarDevolutiva(){
    var k=state.relSel, fb=lerDevolutiva(), id=chaveFeedback(k), dados=Object.assign({pessoa:(relDados().pessoas[k]||k),periodo:state.periodo,em:new Date().toISOString()},fb);
    state.feedback[id]=dados;
    if (!dbPronto){ toast('Guardado só nesta sessão'); return; }
    db.doc('feedback/'+id).set(dados).then(function(){ toast('Devolutiva salva'); }).catch(function(){ toast('Não consegui salvar'); });
  }

  // ——— aba Lançar KPIs (cópia campo a campo para o IND-SGQ-001 no ANOREG+)
  var MES_C=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function compLabel(m){ var p=m.split('-'); return p[1]+'. '+MES_C[+p[1]-1]+'/'+p[0]; }
  function evidLabel(m){ var p=m.split('-'); return MES_C[+p[1]-1]+' '+p[0]; }
  function mesAnt(m){ var p=m.split('-').map(Number); p[1]--; if(!p[1]){ p[1]=12; p[0]--; } return p[0]+'-'+(p[1]<10?'0':'')+p[1]; }
  function mesHoje(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()<9?'0':'')+(d.getMonth()+1); }
  function numBR(x,dec){ if (x==null||isNaN(x)) return ''; var d=dec==null?2:dec, f=Math.pow(10,d); return (Math.round(x*f)/f).toLocaleString('pt-BR',{maximumFractionDigits:d,useGrouping:false}); }
  function numIn(s){ if (s==null) return null; s=String(s).trim(); if (!s) return null; var m=s.match(/^(\d+):(\d{1,2})$/); if (m) return +m[1]+(+m[2])/60; var v=parseFloat(s.replace(/\./g,'').replace(',','.')); if (/^\d+\.\d+$/.test(s)) v=parseFloat(s); return isNaN(v)?null:v; }
  function mmss(min){ var t=Math.round(min*60); return Math.floor(t/60)+'m'+String(t%60).padStart(2,'0')+'s'; }
  // valores já lançados no ANOREG+ (IND-SGQ-001, export de 01/10/2026) — base para a tendência
  var HIST={
    '2026-01':{'KPI-03 (Comp.)':[99.4,100],'KPI-08':[0,27],'KPI-09':[210.27,4725]},
    '2026-02':{'KPI-03 (Comp.)':[92.4,100],'KPI-08':[0,27],'KPI-09':[24,4185]},
    '2026-03':{'KPI-03 (Comp.)':[92.2,100],'KPI-08':[0,28],'KPI-09':[16,4752]},
    '2026-04':{'KPI-03 (Comp.)':[92.2,100],'KPI-08':[0.5,28],'KPI-09':[42.07,4725]},
    '2026-05':{'KPI-01':[129,559],'KPI-02':[523,559],'KPI-03':[95.53,100],'KPI-03 (Comp.)':[94.2,100],'KPI-04':[0,0],'KPI-08':[0,28],'KPI-09':[55,4617]},
    '2026-06':{'KPI-01':[143,875],'KPI-02':[838,875],'KPI-03':[97.36,100],'KPI-03 (Comp.)':[98.8,100],'KPI-04':[0,0],'KPI-06':[56,56],'KPI-08':[1,28],'KPI-09':[88.55,4788]},
    '2026-07':{'KPI-01':[92,693],'KPI-02':[660,693],'KPI-03':[95.27,100],'KPI-03 (Comp.)':[98.8,100],'KPI-04':[0,0],'KPI-06':[100,100],'KPI-07':[14,25],'KPI-08':[0,28],'KPI-09':[0,4613.4],'KPI-10':[0,0],'KPI-11':[0,0],'KPI-12':[0,0],'KPI-13':[2.98,100]},
    '2026-08':{'KPI-01':[102,836],'KPI-02':[763,836],'KPI-03':[99.32,100],'KPI-03 (Comp.)':[97.6,100],'KPI-04':[0,0],'KPI-08':[0,28],'KPI-09':[0,4700],'KPI-10':[0,0],'KPI-11':[0,0],'KPI-12':[0,0],'KPI-13':[1.61,100],'KPI-14':[1,1]},
    '2026-09':{'KPI-03':[96.11,100],'KPI-03 (Comp.)':[93.75,100],'KPI-05':[2,2],'KPI-07':[25,25]}
  };
  function maior(x){ return function(r){ return r>=x; }; } function menor(x){ return function(r){ return r<=x; }; }
  var KPIS=[
    {id:'KPI-01', nome:'Taxa de não conformidade interna (RI)', meta:'≤ 16,5%', bom:menor(16.5), auto:'k1', taxa:true},
    {id:'KPI-02', nome:'Finalizados na vigência da prenotação', meta:'A fixar (baseline)', baseline:true, auto:'k2', taxa:true},
    {id:'KPI-02 (Comp.)', nome:'Protocolos cancelados (decurso do prazo, desistência ou devolução)', meta:'A fixar (baseline)', baseline:true, auto:'k2c', novo:true},
    {id:'KPI-03', nome:'Satisfação do usuário', meta:'≥ 80', bom:maior(80), um:'Nota média (0–100)', den:100, taxa:true, dica:'Pesquisa RPS-SGQ-001 (Forms)'},
    {id:'KPI-03 (Comp.)', nome:'Satisfação do usuário — Google', meta:'≥ 80%', bom:maior(80), um:'Nota Google (0–100)', den:100, dica:'Avaliações do Google no mês'},
    {id:'KPI-04', nome:'Manifestações respondidas no prazo', meta:'100%', bom:maior(100), zeroOk:true, lab:['Respondidas no prazo','Recebidas'], taxa:true, vazio:'Sem manifestações recebidas no período.'},
    {id:'KPI-05', nome:'Eficácia das Ações Corretivas', meta:'90%', bom:maior(90), lab:['NCs com eficácia comprovada','NCs verificadas'], taxa:true, freq:'Trimestral', vazio:'Nenhuma NC atingiu a data de verificação no período.'},
    {id:'KPI-06', nome:'POPs/checklists críticos publicados', meta:'Concluída', bom:maior(100), lab:['Publicados','Previstos'], implant:true, fora:true},
    {id:'KPI-07', nome:'Colaboradores treinados', meta:'Concluído', bom:maior(100), lab:['Treinados','Elegíveis'], implant:true, fora:true},
    {id:'KPI-08', nome:'Rotatividade de pessoal (turnover)', meta:'≤5% ao mês', bom:menor(5), auto:'k8'},
    {id:'KPI-09', nome:'Absenteísmo', meta:'4%', bom:menor(4), auto:'k9', taxa:true},
    {id:'KPI-10', nome:'Acidentes de trabalho', meta:'0 (tolerância zero)', cont:'SST (CAT/eSocial)'},
    {id:'KPI-11', nome:'Doenças ocupacionais', meta:'0 (tolerância zero)', cont:'SST (nexo ocupacional)'},
    {id:'KPI-12', nome:'Desvios de comportamento ético', meta:'0 (tolerância zero)', cont:'disciplinar (GEP)'},
    {id:'KPI-13', nome:'Tempo de espera médio para início do atendimento', meta:'≤ 15 min', bom:menor(15), um:'Minutos (ex.: 1,61 ou 1:37)', den:100, minutos:true, auto:'k13'},
    {id:'KPI-14', nome:'% atualizações normativas registradas e comunicadas', meta:'100%', bom:maior(100), zeroOk:true, lab:['Comunicadas no prazo','Identificadas'], vazio:'Nenhuma atualização normativa identificada no período.'},
    {id:'KPI-15', nome:'Quantidade de ações socioambientais realizadas no ciclo', meta:'100%', bom:maior(100), lab:['Ações realizadas','Ações previstas'], fora:true, freq:'Ciclo anual'}
  ];
  function kpiDef(id){ for (var i=0;i<KPIS.length;i++) if (KPIS[i].id===id) return KPIS[i]; return null; }
  function kpEntrada(m,id){ var d=state.kp[m]; return (d&&d.v&&d.v[id])||{}; }

  // KPI-09: leitura do Rel. Eventos de Apuração por Período (mesma regra da Calculadora KPI-09)
  var K9_AUS=['Atestado médico','Outros Atestados','Faltas abonadas'], K9_LEG=['Licença maternidade','Licença paternidade','Auxílio-doença (INSS)','Auxilio-doenca (INSS)'],
      K9_JOR=['Horas normais','Home office','Férias','Atestado médico','Outros Atestados','Faltas abonadas','Licença maternidade','Feriado pago'];
  function k9Ler(rows, nomeArq){
    var funcs={}, cur=null, per=null;
    rows.forEach(function(r){
      r.forEach(function(c){ if (!per && typeof c==='string'){ var mm=c.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(?:à|a|até|-)\s*(\d{2})\/(\d{2})\/(\d{4})/); if (mm) per=mm; } });
      var mat=r[1], c7=r[6], val=r[10];
      if (typeof mat==='number' && mat%1===0 && typeof c7==='string' && c7.trim().length>5){ cur=String(mat); funcs[cur]={nome:c7.trim(),ev:{}}; }
      else if (cur && typeof c7==='string' && typeof val==='number' && c7.indexOf('Total')!==0) funcs[cur].ev[c7.trim()]=(funcs[cur].ev[c7.trim()]||0)+val;
    });
    var ks=Object.keys(funcs); if (!ks.length) return null;
    var mes=per?per[6]+'-'+per[5]:null;
    var jorn=ks.map(function(k){ return K9_JOR.reduce(function(s,e){ return s+(funcs[k].ev[e]||0); },0); }).filter(function(x){return x>0;}).sort(function(a,b){return a-b;});
    var md=jorn.length?(jorn.length%2?jorn[(jorn.length-1)/2]:(jorn[jorn.length/2-1]+jorn[jorn.length/2])/2):0, jornada=Math.round(md);
    var hAus=0, hLeg=0, pessoas=[];
    ks.forEach(function(k){ var ev=funcs[k].ev, h=0, hl=0, comp=[];
      K9_AUS.forEach(function(e){ if (ev[e]){ h+=ev[e]; comp.push(e+': '+numBR(ev[e])+'h'); } });
      K9_LEG.forEach(function(e){ if (ev[e]){ hl+=ev[e]; comp.push(e+': '+numBR(ev[e])+'h'); } });
      hAus+=h; hLeg+=hl; if (h>0||hl>0) pessoas.push({mat:k, nome:funcs[k].nome, h:Math.round(h*100)/100, hl:Math.round(hl*100)/100, comp:comp.join(' · ')}); });
    return {mes:mes, periodo:per?per[1]+'/'+per[2]+'/'+per[3]+' a '+per[4]+'/'+per[5]+'/'+per[6]:'', arquivo:nomeArq, headcount:ks.length, jornada:jornada,
      hAus:Math.round(hAus*100)/100, hLeg:Math.round(hLeg*100)/100, prev:ks.length*jornada, pessoas:pessoas, em:new Date().toISOString()};
  }
  function k9Importar(files){
    Array.prototype.slice.call(files).forEach(function(f){
      f.arrayBuffer().then(function(buf){
        var wb=XLSX.read(buf,{type:'array'}), rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:null}), r=k9Ler(rows,f.name);
        if (!r){ toast('Não achei colaboradores em '+f.name+' — é o Rel. Eventos de Apuração por Período?'); return; }
        if (!r.mes){ var v=prompt('Não achei o período no arquivo '+f.name+'. Competência (AAAA-MM):', state.lancMes); if (!v||!/^\d{4}-\d{2}$/.test(v)) return; r.mes=v; }
        state.k9[r.mes]=r; state.lancMes=r.mes; renderLanc();
        toast('KPI-09 de '+compLabel(r.mes)+' apurado ('+r.headcount+' colaboradores)');
        if (dbPronto&&podeEscrever) db.doc('kpi09/'+r.mes).set(r).catch(function(){ toast('Apurado, mas não consegui salvar'); });
      }).catch(function(e){ toast('Erro ao ler '+f.name+': '+e.message); });
    });
  }

  // valores de cada KPI no mês: {n,d,r,fonte,txt,aviso}
  function kpiValor(id, m, semTexto){
    var K=kpiDef(id), e=kpEntrada(m,id), h=HIST[m]&&HIST[m][id], o=null;
    if (K.auto==='k1' && state.docs[m]){
      var todos=incTodos(), d=state.docs[m], temInc=(state.inconf[m]||[]).length>0;
      if (todos.length){
        if ((state.cfg.k1met||'novo')==='ficha'){ var reg=(state.inconf[m]||[]).filter(function(r){return r.t==='RI';}).length, den=d.atos.length+((d.raw&&d.raw.pesquisa)||0);
          o={n:reg, d:den, fonte:'Painel · fórmula da ficha (fluxo)', txt:reg+' inconformidades RI registradas no mês sobre '+den+' documentos RI finalizados (fórmula de fluxo da FTI-SGQ-001).'}; }
        else { var q=kpi1Mes(d.atos,todos), R={}; d.atos.forEach(function(a){ if (a.cat==='R') R[a.c]=1; });
          var cc={}; todos.forEach(function(r){ if (r.t==='RI' && R[r.c]){ var c=catDe(r); cc[c]=(cc[c]||0)+1; } });
          var top=Object.keys(cc).sort(function(a,b){return cc[b]-cc[a];}).slice(0,3).map(function(c){ return c+' ('+cc[c]+')'; });
          o={n:q.c, d:q.n, fonte:'Painel · atos com inconformidade', txt:q.c+' dos '+q.n+' atos RI registrados no mês tiveram ao menos 1 inconformidade'+(q.e?' ('+q.e+' com erro externo)':'')+'.'+(top.length?' Principais erros: '+top.join('; ')+'.':'')}; }
        var maxD=todos.reduce(function(s,r){ return r.d>s?r.d:s; },''), pm=m.split('-').map(Number), ult=m+'-'+new Date(pm[0],pm[1],0).getDate();
        if (!temInc) o.aviso='Não há inconformidades importadas com data neste mês — confira se a planilha cobre o mês inteiro.';
        else if (maxD<ult) o.aviso='Inconformidades importadas só até '+maxD.split('-').reverse().join('/')+' — importe a planilha do mês inteiro antes de lançar.';
      }
    } else if ((K.auto==='k2'||K.auto==='k2c') && state.docs[m]){
      var s=resumo(state.docs[m].atos);
      if (K.auto==='k2') o={n:s.dentro, d:s.n, fonte:'Painel · 20 d.u. (25 com reingresso)', txt:s.dentro+' de '+s.n+' atos RI registrados no mês concluídos dentro do prazo legal (20 dias úteis, 25 com reingresso — art. 205 c/c art. 9º, §1º, da Lei 6.015/73)'+(s.J?', incluindo '+s.J+' com prazo especial justificado':'')+'. Mediana de '+numBR(s.medB,1)+' dias úteis do ingresso ao registro. Pesquisas qualificadas e protocolos cancelados ficam fora da base.'};
      else o={n:s.N, d:s.total, fonte:'Painel · cancelados', txt:s.N+' de '+s.total+' protocolos do mês não chegaram ao registro (cancelamento por decurso do prazo após exigência não cumprida, desistência ou devolução).'};
    } else if (K.auto==='k9' && state.k9[m]){
      var k=state.k9[m], pic=k.pessoas.filter(function(p){return p.h>=28;}).length;
      o={n:k.hAus, d:k.prev, fonte:'Rel. Eventos '+(k.periodo||''), txt:'Ausência gerenciável de '+numBR(k.hAus)+' h (atestados e faltas abonadas) sobre jornada prevista de '+numBR(k.prev,0)+' h ('+k.headcount+' colaboradores × '+k.jornada+' h).'+(k.hLeg?' Afastamento legal (licença) de '+numBR(k.hLeg)+' h rastreado à parte, fora da meta.':'')+(pic?' '+pic+' colaborador(es) com pico ≥ 28 h no mês.':' Sem pico individual ≥ 28 h no mês.')};
    } else if (K.auto==='k8'){
      var hc=state.k9[m]?state.k9[m].headcount:(h?h[1]:null), at=numIn(e.ativos)!=null?numIn(e.ativos):hc, ad=numIn(e.adm), de=numIn(e.desl);
      if (ad!=null||de!=null){ ad=ad||0; de=de||0; o={n:(ad+de)/2, d:at, fonte:'Manual', txt:(ad||de?ad+' admissão(ões) e '+de+' desligamento(s) no mês, sobre '+at+' colaboradores ativos.':'Sem admissões ou desligamentos no mês.')}; }
    } else if (K.auto==='k13' && state.senhas[m]){
      var S=senhasResumo(state.senhas[m].L), mn=Math.round(S.med/60*100)/100;
      o={n:mn, d:100, fonte:'Consulta de senhas (VHL)', txt:'Tempo médio de espera de '+fmtMS(S.med)+' ('+numBR(mn)+' min) em '+S.na+' senhas atendidas. Mediana de '+fmtMS(S.mediana)+'; '+numBR(S.na?S.a10/S.na*100:0,1)+'% esperaram 10 min ou mais (gatilho do PCA) e a espera máxima foi de '+fmtMS(S.mx)+'.'+(S.des?' '+S.des+' senhas finalizadas sem chamada (desistência).':'')};
    } else if (!K.auto || (K.auto==='k13' && !state.senhas[m])){
      var n=numIn(e.n), dd=K.cont?0:(K.den!=null?K.den:numIn(e.d));
      if (n!=null && dd!=null){ o={n:n, d:dd, fonte:'Manual'};
        if (K.cont) o.txt=n?n+' ocorrência(s) no mês — tratamento caso a caso ('+K.cont+').':'Sem ocorrência reportada no período.';
        else if (K.minutos) o.txt='Tempo médio de espera de '+mmss(n)+' (VHL). '+numBR(n)+' equivale a '+mmss(n)+'.';
        else if (!dd && K.vazio) o.txt=K.vazio; }
    }
    if (!o && h) o={n:h[0], d:h[1], fonte:'Já lançado no ANOREG+', hist:true};
    if (!o) return null;
    o.r=o.d?o.n/o.d*100:null;
    if (K.cont) o.r=null;
    if (h && !o.hist) o.lancado=h;
    return o;
  }
  function kpiSituacao(K,o){
    if (!o) return '';
    if (K.baseline) return 'Baseline';
    if (K.cont) return o.n?'Não atende':'Atende';
    if (o.r==null) return K.zeroOk?'Atende':'Sem apuração';
    if (K.implant && o.r<100) return 'Em andamento';
    return K.bom(o.r)?'Atende':'Não atende';
  }
  function kpiComp(o){ return o==null?null:(o.r!=null?o.r:o.n); }
  function kpiTendencia(K,o,m){
    if (!o) return '';
    if (K.implant && o.r>=100) return '✓ meta atingida';
    var p=null, mm=m; for (var i=0;i<3&&p==null;i++){ mm=mesAnt(mm); p=kpiComp(kpiValor(K.id,mm)); }
    var a=kpiComp(o); if (p==null||a==null) return '● primeira medição';
    var df=Math.round((a-p)*100)/100; return df>0?'↗':df<0?'↓':'→';
  }
  function lancMeses(){
    var s={}; [state.docs,state.k9,state.kp,HIST,state.senhas].forEach(function(o){ Object.keys(o||{}).forEach(function(m){ if (/^\d{4}-\d{2}$/.test(m)) s[m]=1; }); });
    var h=mesHoje(); s[h]=1; s[mesAnt(h)]=1; return Object.keys(s).sort().reverse();
  }
  function cp(lab, val, cls){ var v=val==null?'':String(val); return '<button type="button" class="cp'+(cls?' '+cls:'')+'" data-cp="'+esc(v)+'" title="Clique para copiar"><span class="cpl">'+lab+'</span><span class="cpv">'+(v?esc(v):'<i>vazio</i>')+'</span></button>'; }
  function cardSaida(K, m){
    var o=kpiValor(K.id,m), sit=kpiSituacao(K,o), tend=kpiTendencia(K,o,m), e=kpEntrada(m,K.id);
    var txt=e.a!=null?e.a:((o&&o.txt)||'');
    var nTxt=o?numBR(o.n):'', dTxt=o?numBR(o.d):'';
    var h='<div class="lc-grid">'+cp('Competência',compLabel(m))+cp('KPI',K.id)+cp('indicador',K.nome,'w2')+cp('Numerador',nTxt)+cp('Denominador',dTxt)+cp('Meta',K.meta)+cp('Situação',sit,sit==='Não atende'?'bad':sit==='Atende'?'good':'')+cp('Tendência',tend)+cp('Evidência (Link)',e.ev!=null?e.ev:evidLabel(m))+'</div>';
    var res=o&&o.r!=null?numBR(o.r):(o&&K.cont?'—':'');
    var nota=[];
    if (o) nota.push('Resultado (o ANOREG+ calcula): <b>'+(res||'—')+(o.r!=null&&!K.minutos&&K.den!==100?'%':'')+'</b>'+(K.minutos&&o?' · '+mmss(o.n):''));
    if (o&&o.fonte) nota.push('Fonte: '+esc(o.fonte));
    if (o&&o.lancado) nota.push('Lançado antes no ANOREG+: '+numBR(o.lancado[0])+' / '+numBR(o.lancado[1]));
    if (o&&o.aviso) nota.push('<span class="lc-warn">'+esc(o.aviso)+'</span>');
    if (sit==='Não atende' && K.taxa){ var p=kpiValor(K.id,mesAnt(m)), ps=kpiSituacao(K,p); nota.push('<span class="lc-bad">'+(ps==='Não atende'?'2º mês seguido fora da meta → abrir NC (CRT-SGQ-001).':'1º mês fora da meta → registrar a análise da causa.')+'</span>'); }
    if (!o) nota.push(K.auto==='k9'?'Importe o Rel. Eventos de Apuração por Período deste mês.':K.auto&&K.auto!=='k8'?'Sem dados do painel para este mês.':'Preencha os números acima.');
    return {html:h+'<div class="lc-nota">'+nota.join(' · ')+'</div>', txt:txt, sit:sit};
  }
  function cardEntrada(K,m){
    var e=kpEntrada(m,K.id), h=HIST[m]&&HIST[m][K.id];
    function inp(campo,lab,ph,val){ return '<label class="lc-in"><span>'+lab+'</span><input type="text" inputmode="decimal" data-kpin="'+campo+'" value="'+esc(val!=null?val:'')+'" placeholder="'+esc(ph||'')+'"></label>'; }
    if (K.auto==='k8'){ var hc=state.k9[m]?state.k9[m].headcount:''; return inp('adm','Admissões','0',e.adm)+inp('desl','Desligamentos','0',e.desl)+inp('ativos','Colaboradores ativos',hc?String(hc)+' (do KPI-09)':'',e.ativos); }
    if (K.auto && !(K.auto==='k13' && !state.senhas[m])) return '';
    if (K.cont) return inp('n','Ocorrências no mês','0',e.n!=null?e.n:(h?numBR(h[0]):''));
    if (K.den!=null) return inp('n',K.um,'',e.n!=null?e.n:(h?numBR(h[0]):''))+(K.dica?'<span class="lc-dica">'+esc(K.dica)+'</span>':'');
    return inp('n',K.lab[0],'',e.n!=null?e.n:(h?numBR(h[0]):''))+inp('d',K.lab[1],'',e.d!=null?e.d:(h?numBR(h[1]):''));
  }
  function renderLanc(){
    var el=$('tabLanc'); if (!el) return;
    var ms=lancMeses(); if (!state.lancMes || ms.indexOf(state.lancMes)<0) state.lancMes=mesAnt(mesHoje());
    var m=state.lancMes, L=(state.kp[m]&&state.kp[m].lanc)||{};
    var vis=KPIS.filter(function(K){ return state.lancTodos || !K.fora; });
    var feitos=vis.filter(function(K){ return L[K.id]; }).length;
    var h='<div class="sec-h"><h2>Lançar KPIs no ANOREG+</h2><span class="note">Clique em qualquer campo para copiar e cole na linha do IND-SGQ-001. O Resultado o ANOREG+ calcula sozinho.</span></div>'+
      '<div class="search"><select id="lancMes" aria-label="Competência">'+ms.map(function(x){ return '<option value="'+x+'"'+(x===m?' selected':'')+'>'+compLabel(x)+'</option>'; }).join('')+'</select>'+
      '<span class="chip'+(feitos===vis.length?' ok':'')+'">'+feitos+' de '+vis.length+' lançados</span>'+
      '<label class="lc-chk"><input type="checkbox" id="lancTodos"'+(state.lancTodos?' checked':'')+'> mostrar concluídos e de ciclo (06, 07, 15)</label>'+
      '<span class="spacer"></span><button class="btn sm" type="button" id="memBtn" title="Planilha com o cálculo de cada KPI deste mês, ato por ato, com fórmulas do Excel — para anexar no ANOREG+">Baixar memória de cálculo (.xlsx)</button>'+(podeEscrever?'<button class="btn sm" type="button" id="k9Btn">Importar Rel. Eventos (KPI-09)</button><input type="file" id="k9File" accept=".xls,.xlsx" multiple hidden>':'')+'</div>'+
      '<div class="lc-met">KPI-01 calculado por: <div class="seg" role="group" aria-label="Fórmula do KPI-01"><button type="button" class="segb" data-k1met="novo" aria-pressed="'+((state.cfg.k1met||'novo')==='novo')+'">Atos com inconformidade (nova)</button><button type="button" class="segb" data-k1met="ficha" aria-pressed="'+(state.cfg.k1met==='ficha')+'">Fluxo (ficha atual)</button></div></div>';
    h+=vis.map(function(K){
      var s=cardSaida(K,m), done=!!L[K.id];
      return '<div class="lc-card'+(done?' done':'')+'" data-kpi="'+esc(K.id)+'">'+
        '<div class="lc-top"><b>'+esc(K.id)+'</b><span class="lc-nome">'+esc(K.nome)+'</span>'+(K.freq?'<span class="chip">'+K.freq+'</span>':'')+(K.novo?'<span class="chip">ainda não existe no ANOREG+</span>':'')+
        '<span class="spacer"></span><label class="lc-chk"><input type="checkbox" data-lanc="1"'+(done?' checked':'')+(podeEscrever?'':' disabled')+'> lançado</label></div>'+
        '<div class="lc-ins">'+cardEntrada(K,m)+'</div>'+
        '<div class="lc-out">'+s.html+'</div>'+
        '<div class="lc-an"><div class="lc-anh"><span class="cpl">Análise / Ação</span><button type="button" class="btn sm" data-cpan="1">Copiar análise</button>'+(kpEntrada(m,K.id).a!=null?'<button type="button" class="btn sm" data-anreset="1">Voltar ao texto sugerido</button>':'')+'</div>'+
        '<textarea data-kpin="a" rows="2" placeholder="Sem texto sugerido — escreva a análise se houver">'+esc(s.txt)+'</textarea></div></div>';
    }).join('');
    // destaques do KPI-09 (só na tela)
    var k9=state.k9[m];
    if (k9){
      var hist={}; Object.keys(state.k9).sort().forEach(function(x){ state.k9[x].pessoas.forEach(function(p){ if (p.h>0){ var q=hist[p.mat]=hist[p.mat]||{nome:p.nome,meses:[],h:0}; q.meses.push(compLabel(x).slice(4)); q.h+=p.h; } }); });
      var rec=Object.keys(hist).filter(function(k){ return hist[k].meses.length>=3; }).map(function(k){ return hist[k]; });
      var pic=k9.pessoas.filter(function(p){ return p.h>=28; }), lic=k9.pessoas.filter(function(p){ return p.hl>0; });
      h+='<details class="lc-det"><summary>KPI-09 · destaques para o gestor (não vão para o ANOREG+)</summary><div class="hint" style="margin:8px 0">Período '+esc(k9.periodo)+' · arquivo '+esc(k9.arquivo)+' · jornada pela mediana do relatório.</div>'+
        '<div class="tbl-wrap"><table><thead><tr><th>Colaborador</th><th>Ausência gerenciável</th><th>Licença</th><th>Composição</th></tr></thead><tbody>'+
        k9.pessoas.slice().sort(function(a,b){return (b.h+b.hl)-(a.h+a.hl);}).map(function(p){ return '<tr><td>'+esc(p.nome)+(p.h>=28?' <span class="chip">pico</span>':'')+(hist[p.mat]&&hist[p.mat].meses.length>=3?' <span class="chip">recorrente</span>':'')+'</td><td>'+(p.h?numBR(p.h)+' h':'—')+'</td><td>'+(p.hl?numBR(p.hl)+' h':'—')+'</td><td class="mut">'+esc(p.comp)+'</td></tr>'; }).join('')+'</tbody></table></div>'+
        '<p class="hint">Pico = ≥ 28 h no mês ('+pic.length+'). Recorrente = atestado em 3+ meses importados ('+rec.length+(rec.length?': '+rec.map(function(r){return esc(r.nome)+' ('+r.meses.join(', ')+')';}).join('; '):'')+'). Licença legal fica fora da meta e não é questão de desempenho.</p></details>';
    }
    el.innerHTML=h;
  }
  var lancTimer=null;
  function lancSalvar(m){ clearTimeout(lancTimer); lancTimer=setTimeout(function(){ if (dbPronto&&podeEscrever&&state.kp[m]) db.doc('kpis/'+m).set(state.kp[m]).catch(function(){ toast('Não consegui salvar'); }); },700); }
  function lancDoc(m){ return state.kp[m]=state.kp[m]||{mes:m,v:{},lanc:{}}; }
  function lancAtualizarCard(card){
    var K=kpiDef(card.dataset.kpi), m=state.lancMes, s=cardSaida(K,m);
    card.querySelector('.lc-out').innerHTML=s.html;
    var ta=card.querySelector('textarea[data-kpin="a"]'); if (kpEntrada(m,K.id).a==null && document.activeElement!==ta) ta.value=s.txt;
  }
  function copiarTexto(txt, el){
    function ok(){ if (el){ el.classList.add('copiado'); setTimeout(function(){ el.classList.remove('copiado'); },900); } toast('Copiado'); }
    function alt(){ var t=document.createElement('textarea'); t.value=txt; t.setAttribute('readonly',''); t.style.position='fixed'; t.style.top='0'; t.style.opacity='0'; document.body.appendChild(t); t.select(); var r=false; try{ r=document.execCommand('copy'); }catch(e){} t.remove(); if (r) ok(); else toast('Não consegui copiar — selecione o texto e use Ctrl+C'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, alt); else alt();
  }

  // ——— aba Atendimento (VHL · Consulta de senhas) — base do KPI-13 e análise do fluxo
  var DSEM=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  function hms(s){ if (s==null||s==='') return null; if (typeof s==='number') return Math.round(s*86400); var p=String(s).trim().split(':').map(Number); if (p.length<2||p.some(isNaN)) return null; return p[0]*3600+p[1]*60+(p[2]||0); }
  function fmtMS(seg){ if (seg==null||isNaN(seg)) return '—'; seg=Math.round(seg); var h=Math.floor(seg/3600), m=Math.floor(seg%3600/60), s=seg%60; return (h?h+'h':'')+(h||m?(h?String(m).padStart(2,'0'):m)+'min':'')+(h?'':String(s).padStart(m?2:1,'0')+'s'); }
  function hhmm(seg){ return seg==null?'—':String(Math.floor(seg/3600)).padStart(2,'0')+':'+String(Math.floor(seg%3600/60)).padStart(2,'0'); }
  function senhasEhArquivo(cab){ return cab.indexOf('H.Gerada')>=0 && cab.indexOf('T.Espera')>=0 && cab.indexOf('Fila')>=0; }
  function senhasImportar(rows, nome){
    var porMes={}, filas=[], ats=[], ign=0;
    function idx(arr,v){ var i=arr.indexOf(v); if (i<0){ arr.push(v); i=arr.length-1; } return i; }
    rows.forEach(function(r){
      var dt=r['Data Registro'], y, mo, d;
      if (typeof dt==='number'){ var pc=XLSX.SSF.parse_date_code(dt); y=pc.y; mo=pc.m; d=pc.d; }
      else { var mm=String(dt||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (mm){ d=+mm[1]; mo=+mm[2]; y=+mm[3]; } else { var m2=String(dt||'').match(/(\d{4})-(\d{2})-(\d{2})/); if (m2){ y=+m2[1]; mo=+m2[2]; d=+m2[3]; } } }
      var g=hms(r['H.Gerada']); if (!y||g==null){ ign++; return; }
      var mes=y+'-'+(mo<10?'0':'')+mo, cod=String(r['Código']||''), pri=/^[A-Z]+P\d/.test(cod)?1:0, pre=(cod.match(/^[A-Z]+?(?=P?\d)/)||[''])[0];
      var c=hms(r['H.Chamada']), z=hms(r['H.Finalizada']), e=hms(r['T.Espera']), t=hms(r['T.Atendimento']);
      if (c!=null && e==null) e=c-g;
      var lin=[d, idx(filas,String(r['Fila']||'—')), pri, g, c==null?'':c, z==null?'':z, e==null?'':e, t==null?'':t, r['Atendente']?idx(ats,String(r['Atendente']).trim()):'', pre].join(',');
      (porMes[mes]=porMes[mes]||[]).push(lin);
    });
    var ms=Object.keys(porMes).sort(); if (!ms.length){ toast('Não encontrei senhas em '+nome); return; }
    ms.forEach(function(m){ var doc={mes:m, arquivo:nome, filas:filas, atend:ats, rows:porMes[m].join(';'), em:new Date().toISOString()};
      state.senhas[m]=senhasDecod(doc); if (dbPronto&&podeEscrever) db.doc('senhas/'+m).set(doc).catch(function(){ toast('Não consegui salvar as senhas de '+m); }); });
    toast('Senhas importadas: '+ms.map(compLabel).join(', ')+(ign?' · '+ign+' linhas ignoradas':''));
    state.atMes='todos'; render();
  }
  function senhasDecod(doc){
    var p=doc.mes.split('-').map(Number);
    var L=String(doc.rows||'').split(';').filter(Boolean).map(function(s){ var x=s.split(','); function n(v){ return v===''||v==null?null:+v; }
      var dia=+x[0], dt=new Date(p[0],p[1]-1,dia);
      return {dia:doc.mes+'-'+(dia<10?'0':'')+dia, dw:dt.getDay(), fila:doc.filas[+x[1]], pri:x[2]==='1', g:n(x[3]), c:n(x[4]), z:n(x[5]), e:n(x[6]), t:n(x[7]), at:x[8]===''?null:doc.atend[+x[8]], pre:x[9]||''}; });
    return {mes:doc.mes, arquivo:doc.arquivo, L:L};
  }
  function senhasLista(m){ var out=[]; Object.keys(state.senhas).sort().forEach(function(k){ if (!m||m==='todos'||m===k) out=out.concat(state.senhas[k].L); }); return out; }
  function quant(a,q){ if (!a.length) return null; var s=a.slice().sort(function(x,y){return x-y;}), i=(s.length-1)*q, lo=Math.floor(i); return s[lo]+(s[Math.min(lo+1,s.length-1)]-s[lo])*(i-lo); }
  function senhasResumo(L){
    var at=L.filter(function(s){ return s.c!=null && s.e!=null; }), es=at.map(function(s){return s.e;}), des=L.filter(function(s){ return s.c==null; });
    var tAt=at.filter(function(s){ return s.t!=null && s.t<=3600; }).map(function(s){return s.t;});
    return {n:L.length, na:at.length, med:es.length?es.reduce(function(a,b){return a+b;},0)/es.length:null, mediana:quant(es,.5), p90:quant(es,.9), mx:es.length?Math.max.apply(null,es):null,
      a10:at.filter(function(s){return s.e>=600;}).length, a15:at.filter(function(s){return s.e>900;}).length, des:des.length, tMed:quant(tAt,.5), tMedia:tAt.length?tAt.reduce(function(a,b){return a+b;},0)/tAt.length:null};
  }
  function senhasDias(L){
    var por={}; L.forEach(function(s){ (por[s.dia]=por[s.dia]||[]).push(s); });
    return Object.keys(por).sort().map(function(d){ var arr=por[d], ev=[];
      arr.forEach(function(s){ var fim=s.c!=null?s.c:s.z; if (fim==null) return; ev.push([s.g,1]); ev.push([fim,-1]); });
      ev.sort(function(a,b){ return a[0]-b[0]||a[1]-b[1]; }); var cur=0, pico=0, hp=null; ev.forEach(function(x){ cur+=x[1]; if (cur>pico){ pico=cur; hp=x[0]; } });
      var R=senhasResumo(arr); return {dia:d, dw:arr[0].dw, n:arr.length, med:R.med, mx:R.mx, a10:R.a10, des:R.des, pico:pico, hp:hp, gat:R.a10>0||pico>=5}; });
  }
  // análise por atendente — tempo comparado com a equipe NA MESMA FILA (serviços diferentes têm tempos diferentes)
  function atendAnalise(L){
    var E={}, P={};
    L.forEach(function(s){ if (!s.at || s.c==null) return; var ok=s.t!=null && s.t<=3600;
      var e=E[s.fila]=E[s.fila]||{t:[]}; if (ok) e.t.push(s.t);
      var p=P[s.at]=P[s.at]||{nome:s.at,n:0,t:[],dias:{},F:{},H:{},M:{},abertos:0,longos:0,curtos:0,pri:0};
      p.n++; p.dias[s.dia]=1; if (s.pri) p.pri++;
      var f=p.F[s.fila]=p.F[s.fila]||{n:0,t:[]}; f.n++;
      var hr=Math.floor((s.c!=null?s.c:s.g)/3600); p.H[hr]=(p.H[hr]||0)+1;
      var mm=s.dia.slice(0,7), M=p.M[mm]=p.M[mm]||{n:0,t:[]}; M.n++;
      if (s.t!=null && s.t>3600) p.abertos++;
      if (ok){ p.t.push(s.t); f.t.push(s.t); M.t.push(s.t); if (s.t>1800) p.longos++; if (s.t<60) p.curtos++; } });
    Object.keys(E).forEach(function(f){ E[f].med=quant(E[f].t,.5); E[f].p90=quant(E[f].t,.9); E[f].n=E[f].t.length; });
    Object.keys(P).forEach(function(k){ var p=P[k], sp=0, se=0;
      var ac=0, ab=0;
      Object.keys(p.F).forEach(function(f){ var x=p.F[f]; x.med=quant(x.t,.5); x.q1=quant(x.t,.25); x.q3=quant(x.t,.75); x.eq=E[f].med; x.idx=x.t.length>=5&&x.eq?x.med/x.eq:null;
        x.ac=x.t.filter(function(t){return t>x.eq;}).length; x.ab=x.t.filter(function(t){return t<x.eq;}).length; x.p=testeSinal(x.ac,x.ab); ac+=x.ac; ab+=x.ab;
        x.sig=x.idx!=null&&x.t.length>=MIN_N&&x.p<0.05; if (x.idx!=null){ sp+=x.t.length*x.med; se+=x.t.length*x.eq; } });
      p.idx=se?sp/se:null; p.p=testeSinal(ac,ab); p.sig=p.idx!=null&&p.p<0.05; p.med=quant(p.t,.5); p.nd=Object.keys(p.dias).length; p.nv=p.t.length; });
    return {E:E,P:P};
  }
  function atendLeitura(p){
    var fortes=[], aten=[];
    Object.keys(p.F).sort(function(a,b){return p.F[b].n-p.F[a].n;}).forEach(function(f){ var x=p.F[f]; if (!x.sig) return;
      if (x.idx>=1.2) aten.push(f+': atendimento mediano de '+fmtMS(x.med)+' contra '+fmtMS(x.eq)+' da equipe (+'+Math.round((x.idx-1)*100)+'%) em '+x.t.length+' atendimentos; '+pct(x.ac/(x.ac+x.ab)*100)+' deles acima da mediana da equipe — diferença consistente, não acaso. Vale entender se é complexidade dos casos ou ponto de treinamento nesse serviço.');
      else if (x.idx<=0.85) fortes.push(f+': atendimento mediano de '+fmtMS(x.med)+', mais ágil que a equipe ('+fmtMS(x.eq)+').'); });
    if (p.abertos>=3) aten.push(p.abertos+' senhas ficaram abertas mais de 1 hora — reforçar a finalização da senha no sistema ao encerrar o atendimento.');
    if (p.nv>=30 && p.curtos/p.nv>0.1) aten.push(numBR(p.curtos/p.nv*100,0)+'% dos atendimentos duraram menos de 1 minuto — conferir se são senhas chamadas e redirecionadas, ou chamadas por engano.');
    if (p.nv>=30 && p.longos/p.nv>0.15) aten.push(numBR(p.longos/p.nv*100,0)+'% dos atendimentos passaram de 30 minutos.');
    if (Object.keys(p.F).length>=4) fortes.push('Atende '+Object.keys(p.F).length+' filas diferentes (polivalência no balcão).');
    return {fortes:fortes, aten:aten};
  }
  function atendPessoaHTML(p, A, impresso){
    var fk=Object.keys(p.F).sort(function(a,b){return p.F[b].n-p.F[a].n;}), Lr=atendLeitura(p), hrs=Object.keys(p.H).map(Number).sort(function(a,b){return a-b;}), hmx=Math.max.apply(null,hrs.map(function(x){return p.H[x];}));
    var h=(impresso?tilesRel:function(arr){ return '<div class="kpis" style="margin:8px 0 12px">'+arr.map(function(t,i){ return kpi(t[0],String(t[1]),t[2]||'',i===3&&p.idx!=null?(p.idx>=1.3?'canc':''):''); }).join('')+'</div>'; })([
      ['Senhas atendidas',p.n,pct(p.pri/p.n*100)+' prioritárias'],['Dias no guichê',p.nd,numBR(p.n/p.nd,1)+' senhas por dia'],
      ['Atendimento (mediana)',fmtMS(p.med),'equipe por fila ao lado'],['Tempo vs equipe',p.idx==null?'—':(p.idx>=1?'+':'')+Math.round((p.idx-1)*100)+'%','ajustado pela fila (0% = igual à equipe)']]);
    var th=impresso?'':' class="n"';
    h+=(impresso?'<h2>Atendimento por fila</h2>':'<div class="sub-h">Por fila · comparado com a equipe na mesma fila</div>')+'<'+(impresso?'':'div class="tbl-wrap"><')+'table><thead><tr><th>Fila</th><th class="n">Senhas</th><th class="n">Mediana da pessoa</th><th class="n">Mediana da equipe</th><th class="n">Diferença</th></tr></thead><tbody>'+
      fk.map(function(f){ var x=p.F[f], cls=!x.sig?'':x.idx>=1.2?(impresso?' acima':' lc-bad'):x.idx<=0.85?(impresso?' bom':''):''; return '<tr><td>'+esc(f)+'</td><td class="n">'+x.n+'</td><td class="n'+cls+'">'+fmtMS(x.med)+'</td><td class="n">'+fmtMS(x.eq)+'</td><td class="n'+cls+'">'+(x.idx==null?'—':(x.idx>=1?'+':'')+Math.round((x.idx-1)*100)+'%'+(x.sig?'':' <span style="font-weight:400;opacity:.7">(pode ser acaso)</span>'))+'</td></tr>'; }).join('')+'</tbody></table>'+(impresso?'':'</div>');
    var mk=Object.keys(p.M).sort();
    if (mk.length>1) h+=(impresso?'<h2>Atendimento mês a mês</h2>':'<div class="sub-h">Mês a mês</div>')+'<'+(impresso?'':'div class="tbl-wrap"><')+'table><thead><tr><th>Mês</th><th class="n">Senhas</th><th class="n">Atendimento (mediana)</th></tr></thead><tbody>'+mk.map(function(m){ return '<tr><td>'+compLabel(m)+'</td><td class="n">'+p.M[m].n+'</td><td class="n">'+fmtMS(quant(p.M[m].t,.5))+'</td></tr>'; }).join('')+'</tbody></table>'+(impresso?'':'</div>');
    if (!impresso) h+='<div class="sub-h">Em que horário atende</div>'+hrs.map(function(x){ return '<div class="etapa-row"><div class="nm">'+x+'h</div><div class="track"><div class="fill" style="width:'+(p.H[x]/hmx*100).toFixed(0)+'%"></div></div><div class="vv">'+p.H[x]+'</div></div>'; }).join('');
    h+=(impresso?'<h2>Leitura do atendimento</h2>':'<div class="sub-h">Leitura para o feedback</div>')+
      (Lr.fortes.length?'<p><b>Pontos fortes</b></p><ul>'+Lr.fortes.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'')+
      (Lr.aten.length?'<p><b>Pontos de atenção / treinamento</b></p><ul>'+Lr.aten.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'<p>Nenhum ponto de atenção no tempo de atendimento: em linha com a equipe nas filas que atende.</p>')+
      '<p class="'+(impresso?'nota':'hint')+'">Tempo de atendimento = da chamada à finalização da senha. Comparado com a mediana da equipe na mesma fila, porque cada serviço tem duração própria. Só vira ponto de atenção quando a diferença é consistente (menos de 5% de chance de ser acaso, pelo teste do sinal) e com 10+ atendimentos na fila. Tempo maior não é, sozinho, problema: pode ser caso mais complexo ou atendimento mais cuidadoso. É ponto de conversa, não nota. Atendimentos acima de 1 h (senha não finalizada) ficam fora.</p>';
    return h;
  }
  function renderAtend(){
    var el=$('tabAt'); if (!el) return;
    var ms=Object.keys(state.senhas).sort();
    if (!ms.length){ el.innerHTML='<div class="empty"><b>Nenhuma senha importada</b>Exporte a <b>Consulta de senhas</b> do VHL e solte em Importar planilhas (pode ser vários meses de uma vez). Ela alimenta o KPI-13 e esta análise.</div>'; return; }
    if (state.atMes!=='todos' && ms.indexOf(state.atMes)<0) state.atMes='todos';
    var L=senhasLista(state.atMes), R=senhasResumo(L), D=senhasDias(L), nd=D.length;
    var h='<div class="sec-h"><h2>Atendimento · tempo de espera</h2><span class="note">Fonte: VHL · Consulta de senhas. Espera = da emissão da senha à chamada no guichê. KPI-13 = média da espera das senhas chamadas.</span></div>'+
      '<div class="search"><select id="atMes" aria-label="Período do atendimento"><option value="todos">Todos os meses ('+ms.length+')</option>'+ms.slice().reverse().map(function(m){ return '<option value="'+m+'"'+(state.atMes===m?' selected':'')+'>'+compLabel(m)+'</option>'; }).join('')+'</select>'+
      '<span class="hint" style="margin:0">'+R.n.toLocaleString('pt-BR')+' senhas · '+nd+' dias com atendimento</span></div>';
    h+='<div class="kpis" style="margin:4px 0 16px">'+
      kpi('KPI-13 · espera média',fmtMS(R.med),'meta ≤ 15 min · '+numBR(R.med/60)+' min','hero')+
      kpi('Mediana',fmtMS(R.mediana),'metade espera menos que isso')+
      kpi('90% esperam até',fmtMS(R.p90),'percentil 90')+
      kpi('Acima de 10 min',pctK(R.na?R.a10/R.na*100:null),R.a10+' senhas · gatilho do PCA',R.a10?'canc':'')+
      kpi('Acima de 15 min',pctK(R.na?R.a15/R.na*100:null),R.a15+' senhas · além da meta',R.a15?'canc':'')+
      kpi('Espera máxima',fmtMS(R.mx),'pior caso do período')+
      kpi('Desistências',pctK(R.n?R.des/R.n*100:null),R.des+' senhas finalizadas sem chamada')+'</div>';
    // mês a mês
    if (ms.length>1){
      h+='<div class="sub-h">Mês a mês</div><div class="tbl-wrap"><table><thead><tr><th>Mês</th><th class="n">Senhas</th><th class="n">KPI-13 (média)</th><th class="n">Mediana</th><th class="n">P90</th><th class="n">≥ 10 min</th><th class="n">Máxima</th><th class="n">Desistências</th><th class="n">Dias com gatilho</th></tr></thead><tbody>'+
        ms.map(function(m){ var Lm=state.senhas[m].L, r=senhasResumo(Lm), dd=senhasDias(Lm); return '<tr><td>'+compLabel(m)+'</td><td class="n">'+r.n+'</td><td class="n"><b>'+numBR(r.med/60)+' min</b></td><td class="n">'+fmtMS(r.mediana)+'</td><td class="n">'+fmtMS(r.p90)+'</td><td class="n">'+pct(r.a10/r.na*100)+'</td><td class="n">'+fmtMS(r.mx)+'</td><td class="n">'+pct(r.des/r.n*100)+'</td><td class="n">'+dd.filter(function(x){return x.gat;}).length+' de '+dd.length+'</td></tr>'; }).join('')+'</tbody></table></div>';
    }
    var tAll=L.filter(function(s){return s.c!=null&&s.t!=null&&s.t<=3600;}).map(function(s){return s.t/60;}), eAll=L.filter(function(s){return s.c!=null&&s.e!=null;}).map(function(s){return s.e/60;});
    var rotM=function(x){ return x<1?Math.round(x*60)+' s':x+' min'; };
    h+='<div class="two" style="margin-top:18px"><div><div class="sub-h">Espera · como se distribui</div>'+faixasHTML(eAll,[0.5,1,2,5,10,15],'',rotM)+'</div><div><div class="sub-h">Atendimento · como se distribui</div>'+faixasHTML(tAll,[2,5,10,15,20,30],'',rotM)+'<p class="hint">Mediana '+fmtMS(R.tMed)+' · média '+fmtMS(R.tMedia)+'. Atendimentos acima de 1 h (senha não finalizada) ficam fora.</p></div></div>';
    // mapa de calor
    var met=state.atMet||'esp', horas=[], cel={}, cntDw={};
    D.forEach(function(x){ cntDw[x.dw]=(cntDw[x.dw]||0)+1; });
    L.forEach(function(s){ var hr=Math.floor(s.g/3600), k=s.dw+'_'+hr; var c=cel[k]=cel[k]||{n:0,es:[],a10:0}; c.n++; if (s.c!=null&&s.e!=null){ c.es.push(s.e); if (s.e>=600) c.a10++; } if (horas.indexOf(hr)<0) horas.push(hr); });
    horas.sort(function(a,b){return a-b;}); horas=horas.filter(function(hr){ var t=0; [1,2,3,4,5].forEach(function(dw){ t+=(cel[dw+'_'+hr]||{n:0}).n; }); return t>=Math.max(5,nd*0.2); });
    function valor(c,dw){ if (!c||!c.n) return null; if (met==='vol') return c.n/(cntDw[dw]||1); if (met==='a10') return c.es.length?c.a10/c.es.length*100:null; return c.es.length?c.es.reduce(function(a,b){return a+b;},0)/c.es.length/60:null; }
    var vals=[]; [1,2,3,4,5].forEach(function(dw){ horas.forEach(function(hr){ var v=valor(cel[dw+'_'+hr],dw); if (v!=null) vals.push(v); }); });
    var vmax=vals.length?Math.max.apply(null,vals):1, MIX=[6,20,38,60,85];
    function bin(v){ return v==null?-1:Math.min(4,Math.floor(v/(vmax||1)*5-1e-9)); }
    function rot(v){ return v==null?'':met==='vol'?numBR(v,1):met==='a10'?numBR(v,0)+'%':numBR(v,1); }
    h+='<div class="sub-h" style="margin-top:18px">Quando aperta · dia da semana × hora da emissão</div>'+
      '<div class="search"><div class="seg" role="group" aria-label="Métrica do mapa"><button type="button" class="segb" data-atmet="esp" aria-pressed="'+(met==='esp')+'">Espera média (min)</button><button type="button" class="segb" data-atmet="a10" aria-pressed="'+(met==='a10')+'">% acima de 10 min</button><button type="button" class="segb" data-atmet="vol" aria-pressed="'+(met==='vol')+'">Senhas por dia</button></div></div>'+
      '<div class="tbl-wrap"><table class="hm"><thead><tr><th></th>'+horas.map(function(hr){ return '<th>'+hr+'h</th>'; }).join('')+'</tr></thead><tbody>'+
      [1,2,3,4,5].map(function(dw){ return '<tr><th>'+DSEM[dw]+'</th>'+horas.map(function(hr){ var c=cel[dw+'_'+hr], v=valor(c,dw), b=bin(v);
        var tip='<b>'+DSEM[dw]+' · '+hr+'h–'+(hr+1)+'h</b><br>'+(c?c.n+' senhas no período ('+numBR(c.n/(cntDw[dw]||1),1)+' por dia)<br>Espera média: '+(c.es.length?fmtMS(c.es.reduce(function(a,x){return a+x;},0)/c.es.length):'—')+'<br>≥ 10 min: '+c.a10:'sem senhas');
        return '<td class="hmc b'+b+'" style="'+(b>=0?'background:color-mix(in srgb, var(--brand) '+MIX[b]+'%, var(--surface))':'')+'" data-tip="'+esc(tip)+'">'+rot(v)+'</td>'; }).join('')+'</tr>'; }).join('')+
      '</tbody></table></div><p class="hint">Quanto mais escuro, pior. Use para escala de guichê e horário de almoço: as células escuras com muitas senhas por dia são onde um guichê a mais rende mais.</p>';
    // dias com gatilho
    var G=D.filter(function(x){return x.gat;}).sort(function(a,b){ return b.a10-a.a10 || b.pico-a.pico || (b.mx||0)-(a.mx||0); });
    h+='<div class="sub-h" style="margin-top:18px">Dias em que o gatilho do PCA disparou · '+G.length+' de '+nd+'</div>'+
      '<p class="hint" style="margin-top:0">Gatilho (PCA-SGQ-001): senha esperando 10 min ou mais, ou 5+ senhas em espera ao mesmo tempo. Confira se o plano foi acionado nesses dias.</p>'+
      (G.length?'<div class="tbl-wrap"><table><thead><tr><th>Dia</th><th class="n">Senhas</th><th class="n">≥ 10 min</th><th class="n">Pico em espera</th><th>Horário do pico</th><th class="n">Espera média</th><th class="n">Máxima</th><th class="n">Desist.</th></tr></thead><tbody>'+
      G.slice(0,state.atTodosDias?999:15).map(function(x){ return '<tr><td>'+DSEM[x.dw]+' '+x.dia.split('-').reverse().join('/')+'</td><td class="n">'+x.n+'</td><td class="n'+(x.a10>=5?' lc-bad':'')+'">'+x.a10+'</td><td class="n'+(x.pico>=5?' lc-bad':'')+'">'+x.pico+'</td><td>'+hhmm(x.hp)+'</td><td class="n">'+fmtMS(x.med)+'</td><td class="n">'+fmtMS(x.mx)+'</td><td class="n">'+(x.des||'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (G.length>15?'<button class="btn sm" type="button" data-attodos="1" style="margin-top:8px">'+(state.atTodosDias?'Mostrar só os 15 piores':'Mostrar todos os '+G.length)+'</button>':''):'<div class="empty">Nenhum dia com gatilho no período.</div>');
    // por fila + prioridade
    var F={}; L.forEach(function(s){ var f=F[s.fila]=F[s.fila]||{L:[],N:[],P:[]}; f.L.push(s); if (s.c!=null&&s.e!=null) (s.pri?f.P:f.N).push(s.e); });
    var fk=Object.keys(F).sort(function(a,b){ return F[b].L.length-F[a].L.length; });
    function mean(a){ return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:null; }
    var alerta=0;
    h+='<div class="sub-h" style="margin-top:18px">Por fila · prioritária × normal</div><div class="tbl-wrap"><table><thead><tr><th>Fila</th><th class="n">Senhas</th><th class="n">Espera média</th><th class="n">≥ 10 min</th><th class="n">Normal</th><th class="n">Prioritária</th><th class="n">Atendimento (mediana)</th><th class="n">Desist.</th></tr></thead><tbody>'+
      fk.map(function(k){ var f=F[k], r=senhasResumo(f.L), mn=mean(f.N), mp=mean(f.P), ruim=mp!=null&&mn!=null&&mp-mn>=30; if (ruim) alerta++;
        return '<tr><td>'+esc(k)+'</td><td class="n">'+r.n+'</td><td class="n">'+fmtMS(r.med)+'</td><td class="n">'+pct(r.na?r.a10/r.na*100:null)+'</td><td class="n">'+fmtMS(mn)+'</td><td class="n'+(ruim?' lc-bad':'')+'">'+fmtMS(mp)+(ruim?' ⚠':'')+'</td><td class="n">'+fmtMS(r.tMed)+'</td><td class="n">'+pct(r.n?r.des/r.n*100:null)+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (alerta?'<p class="hint"><span class="lc-bad">⚠ Prioritária esperando mais que a normal em '+alerta+' fila(s)</span> (diferença de 30 s ou mais na média). A prioridade de atendimento é obrigatória (Lei 10.048/2000) — vale revisar a regra de chamada do painel de senhas nessas filas.</p>':'<p class="hint">Prioritárias com espera igual ou menor que a normal em todas as filas.</p>');
    // por atendente
    var AN=atendAnalise(L), ak=Object.keys(AN.P).sort(function(a,b){ return AN.P[b].n-AN.P[a].n; }), tot=ak.reduce(function(s,k){return s+AN.P[k].n;},0);
    if (state.atPessoa && !AN.P[state.atPessoa]) state.atPessoa=null;
    h+='<div class="sub-h" style="margin-top:18px">Por atendente · clique na pessoa para ver a análise individual</div><p class="hint" style="margin-top:0">"Tempo vs equipe" compara o atendimento da pessoa com a mediana da equipe <b>na mesma fila</b> (0% = igual; só filas com 5+ atendimentos). “≈” = diferença que pode ser acaso. Serve para direcionar treinamento, não para ranking.</p>'+
      '<div class="tbl-wrap"><table><thead><tr><th>Atendente</th><th class="n">Senhas</th><th class="n">% do volume</th><th class="n">Dias no guichê</th><th class="n">Por dia</th><th class="n">Atendimento (mediana)</th><th class="n">Tempo vs equipe</th><th class="n">&gt; 30 min</th><th class="n">Abertas &gt; 1 h</th><th>Filas</th></tr></thead><tbody>'+
      ak.map(function(k){ var a=AN.P[k], sel=state.atPessoa===k; return '<tr class="click" tabindex="0" data-atpessoa="'+esc(k)+'"'+(sel?' style="background:var(--brand-soft)"':'')+'><td>'+esc(k)+'</td><td class="n">'+a.n+'</td><td class="n">'+pct(a.n/tot*100)+'</td><td class="n">'+a.nd+'</td><td class="n">'+numBR(a.n/a.nd,1)+'</td><td class="n">'+fmtMS(a.med)+'</td><td class="n'+(a.sig&&a.idx>=1.2?' lc-bad':'')+'" title="'+(a.sig?'Diferença consistente (menos de 5% de chance de ser acaso)':'Diferença pequena ou inconsistente — pode ser acaso')+'">'+(a.idx==null?'—':(a.idx>=1?'+':'')+Math.round((a.idx-1)*100)+'%'+(a.sig?'':' <span class="mut">≈</span>'))+'</td><td class="n">'+(a.longos||'')+'</td><td class="n'+(a.abertos>=3?' lc-bad':'')+'">'+(a.abertos||'')+'</td><td class="mut" style="white-space:normal;min-width:200px">'+Object.keys(a.F).map(esc).join(', ')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    if (state.atPessoa){ var ap=AN.P[state.atPessoa];
      h+='<div class="panel" id="atDet" style="margin-top:12px"><div class="sec-h"><h2>'+esc(ap.nome)+'</h2><span><button class="btn sm" type="button" data-atrel="1">Abrir no relatório individual</button> <button class="btn sm" type="button" data-atfechar="1">Fechar</button></span></div>'+atendPessoaHTML(ap,AN,false)+'</div>'; }
    // qualidade dos dados
    var abertos=L.filter(function(s){ return s.t!=null && s.t>3600; }).length, prefFila={};
    L.forEach(function(s){ var k=s.fila; (prefFila[k]=prefFila[k]||{})[s.pre]=(prefFila[k][s.pre]||0)+1; });
    var mist=fk.filter(function(k){ return Object.keys(prefFila[k]).length>1; }).map(function(k){ return esc(k)+' ('+Object.keys(prefFila[k]).map(function(p){ return p+': '+prefFila[k][p]; }).join(', ')+')'; });
    h+='<div class="sub-h" style="margin-top:18px">Qualidade do registro</div><ul class="hint">'+
      '<li><b>'+R.des+'</b> senhas finalizadas sem chamada (desistência ou senha descartada). Não entram na média do KPI-13 — se a pessoa desistiu por demora, a espera real foi maior que a apurada.</li>'+
      '<li><b>'+abertos+'</b> atendimentos com mais de 1 hora aberta — provável senha não finalizada no guichê. Ficam fora da mediana de atendimento.</li>'+
      (mist.length?'<li>Filas recebendo senhas de prefixos diferentes: '+mist.join('; ')+'. Confira se a senha de Óbito (OB) deveria cair na fila de Nascimento.</li>':'')+'</ul>';
    el.innerHTML=h;
  }

  // ——— ficha do protocolo (log completo de como o painel calculou)
  function protLink(c){ return '<button type="button" class="lnk" data-prot="'+esc(c)+'" title="Ver ficha do protocolo">'+esc(c)+'</button>'; }
  var POS_REG=/imprimir ficha|arquivamento|envio de registro|digitalizar selo/;
  function logDe(c, mesPref){
    var ms=Object.keys(state.logs).sort().reverse(); if (mesPref) ms.unshift(mesPref);
    for (var i=0;i<ms.length;i++){ var m=ms[i]; if (!state.logs[m]) continue; if (!state.logCache[m]) state.logCache[m]=Motor.decodificarLog(state.logs[m]); var L=state.logCache[m][c]; if (L) return L; }
    return null;
  }
  function atoDe(c){ var ms=Object.keys(state.docs).sort().reverse(); for (var i=0;i<ms.length;i++){ var A=state.docs[ms[i]].atos; for (var j=0;j<A.length;j++) if (A[j].c===c){ A[j].mes=ms[i]; return A[j]; } } return null; }
  var MOTIVOS_N={C:'status CANCELADO no relatório de Suspensos',P:'última etapa: Cancelamento de Protocolo',O:'última etapa: ONR - Envio do Recibo do Protocolo (cancelamento)',D:'última etapa: ONR - Nota de Devolução, sem registro',A:'parou em Re-Análise, sem Revisão Oficial'};
  function fichaProtocolo(c){
    c=String(c||'').replace(/\D/g,''); var box=$('protBox'); state.protSel=c;
    if (!c){ box.hidden=true; return; }
    var a=atoDe(c), L=logDe(c, a&&a.mes), inc=incTodos().filter(function(r){ return String(r.c)===c; });
    var h='<div class="sec-h"><h2>Protocolo '+esc(c)+'</h2><span><button class="btn sm" type="button" id="protCopiar">Copiar resumo</button> <button class="btn sm" type="button" id="protFechar">Fechar</button></span></div>';
    if (!a){
      h+='<div class="empty"><b>Não encontrei esse protocolo nos meses importados.</b>O painel guarda os atos <i>finalizados</i> (arquivados) nos meses carregados — '+(Object.keys(state.docs).sort().map(nomeMes).join(', ')||'nenhum')+'. Protocolo ainda em andamento, pesquisa qualificada ou de outro mês não aparece.</div>';
      if (inc.length) h+=protInc(inc);
      box.innerHTML=h; box.hidden=false; box.scrollIntoView({behavior:'smooth',block:'start'}); state.protTxt='Protocolo '+c+': não encontrado nos meses importados.'; return;
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
        exp.push(['Registro','<b>'+fmtData(a.reg)+'</b> — data da última <b>Revisão Oficial</b> (quando o registro foi para o cliente). Imprimir Ficha e Arquivamento vêm depois e não contam.']);
        exp.push(['Bruto','<b>'+a.bruto+' dias úteis</b> entre o ingresso e o registro (o dia do ingresso não conta; sábados, domingos'+(feriados.length?' e feriados — '+feriados.join(', '):' e feriados')+' ficam fora).']); }
      else exp.push(['Bruto','<b>'+a.bruto+' dias úteis</b> — sem Revisão Oficial no histórico; usado o campo Prazo do VHL ('+a.pv+').']);
      exp.push(['Limite','<b>'+a.lim+' dias úteis</b> — '+(a.reing?'20 + 5 porque o título teve retorno (Re-Análise / Revisão de Exigência'+(L&&L.st?' ou constava nos Suspensos: '+esc(L.st):'')+'), Art. 188.':'20 dias úteis (Art. 205 c/c Art. 9º §1º da Lei 6.015/73).')+' '+(a.dentro?'<span class="pill good">dentro</span>':'<span class="pill crit">acima</span>')+(justDe(a)?' <span class="pill good">justificado: '+esc(MOT_JUST[justDe(a).motivo]||'')+'</span>':'')]);
      if (a.liq!=null) exp.push(['Líquido','<b>'+a.liq+(a.liq===1?' dia útil':' dias úteis')+'</b> com o cartório = soma do Prazo de cada etapa até o registro: '+a.etapas.map(function(p){ return esc(p[0])+' '+p[1]; }).join(' + ')+(a.etapas.length?' = '+a.etapas.reduce(function(s,p){return s+p[1];},0):'')+(a.etapas.reduce(function(s,p){return s+p[1];},0)>a.bruto?' (limitado ao bruto)':'')+'.']);
      if (a.espera!=null) exp.push(['Espera','<b>'+a.espera+(a.espera===1?' dia útil':' dias úteis')+'</b> parado com o cliente (bruto − líquido).']);
      exp.push(['Retornos',(a.nex?a.nex+' exigência(s) cumprida(s)':'nenhuma exigência')+(a.npg?' · '+a.npg+' retorno(s) por pagamento (ONR)':'')+(a.nri?' · '+a.nri+' devolução(ões) interna(s)':'')+(a.nex>=2?' <span class="pill crit">2+ exigências</span>':'')]);
    } else if (a.cat==='N') exp.push(['Saída',a.fin?fmtData(a.fin):'—']);
    h+='<div class="prot-grid">'+exp.map(function(x){ return '<div class="pk">'+x[0]+'</div><div class="pv">'+x[1]+'</div>'; }).join('')+'</div>';
    // linha do tempo
    if (ev.length){
      var prev=null, susp=!!(L&&L.st)||a.nex+a.npg>0;
      h+='<div class="sub-h" style="margin-top:14px">Linha do tempo · Produção por Etapa (VHL)</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Data</th><th>Etapa</th><th>Responsável</th><th>Prazo na etapa</th><th>Como o painel leu</th></tr></thead><tbody>'+
        ev.map(function(e){ var n=semAc(e.et), nota=[], pos=POS_REG.test(n)||(rev!=null&&e.d>rev), re=/re-analise|revisao de exigencia/.test(n);
          if (prev!=null && e.d!==prev && !pos){ var gap=du(prev,e.d)-e.pz; if (gap>=1) nota.push(susp?(re?'<b>voltou após '+gap+' d.u. parado → exigência cumprida</b>':'<b>voltou após '+gap+' d.u. parado → retorno por pagamento</b>'):'intervalo de '+gap+' d.u. sem suspensão registrada'); else if (re) nota.push('devolução interna (sem tempo parado)'); }
          if (e.d===rev && n.indexOf('revisao oficial')>=0) nota.push('<span class="pill good">registro</span> última Revisão Oficial');
          if (pos) nota.push('<span class="mut">pós-registro — não conta no prazo</span>');
          if (!pos) prev=e.d;
          linhasTxt.push(F(e.d)+' · '+e.et+' · '+(e.rp||'—')+' · '+e.pz+' d.u.');
          return '<tr'+(pos?' style="opacity:.6"':'')+'><td>'+F(e.d)+'</td><td>'+esc(e.et)+'</td><td>'+esc(e.rp||'—')+'</td><td>'+e.pz+' d.u.</td><td>'+nota.join(' · ')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    } else h+='<p class="hint" style="margin-top:12px">'+(Object.keys(state.logs).length?'Sem etapas deste protocolo na Produção por Etapa importada.':'Linha do tempo indisponível: reimporte os meses (Prazo + Produção por Etapa) para o painel guardar o histórico detalhado.')+'</p>';
    if (inc.length) h+=protInc(inc);
    var av=state.aval[idDoc(c)]; if (av) h+='<p class="hint">Avaliação das exigências: <b>'+esc(AV[av.resultado]||av.resultado)+'</b>'+(av.obs?' — '+esc(av.obs):'')+'</p>';
    box.innerHTML=h; box.hidden=false; box.scrollIntoView({behavior:'smooth',block:'start'});
    state.protTxt='Protocolo '+c+' — '+a.nat+'\n'+sit+'\nIngresso: '+(a.ing?fmtData(a.ing):'—')+(a.reg?' · Registro (última Revisão Oficial): '+fmtData(a.reg):'')+(a.bruto!=null?'\nBruto: '+a.bruto+' d.u. · Limite: '+a.lim+' d.u.'+(a.liq!=null?' · Líquido: '+a.liq+' d.u. · Espera: '+a.espera+' d.u.':''):'')+(a.cat==='R'?'\nExigências: '+a.nex+(a.npg?' · Retornos por pagamento: '+a.npg:''):'')+(linhasTxt.length?'\n\nLinha do tempo:\n'+linhasTxt.join('\n'):'');
  }
  function protInc(inc){ return '<div class="sub-h" style="margin-top:14px">Inconformidades deste protocolo ('+inc.length+')</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Data</th><th>Responsável</th><th>Tipo</th><th>Erro</th><th>Observação</th></tr></thead><tbody>'+
    inc.map(function(r){ return '<tr><td>'+fmtData(r.d)+'</td><td>'+esc(r.r)+'</td><td>'+(grupoDe(r)==='E'?'Externo':'Interno')+'</td><td>'+esc(catDe(r))+'</td><td style="min-width:240px">'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table></div>'; }

  // ——— versão, dados brutos, recálculo, backup e memória de cálculo (site no GitHub + Supabase)
  var APP_VERSAO='1.1.0';
  // Dados brutos: só as colunas que o cálculo usa (sem título, solicitante ou nome de parte)
  function brutosMontar(){
    var S=XLSX.SSF, out={};
    function mesDe(v){ var d=Motor.paraDia(v,S); return d==null?null:Motor.isoDeDia(d).slice(0,7); }
    function bloco(k,tipo,mes){ return out[k]=out[k]||{tipo:tipo,mes:mes,rows:new Map()}; }  // Map preserva a ordem original (importa para etapas do mesmo dia)
    Motor.linhas(state.arquivos.prazo||[]).forEach(function(r){ var t=Motor.semAcento(r['tipo de documento']); if (t!=='ri'&&t!=='certidao - ri') return;
      var m=mesDe(r['finalizacao']); if (!m) return; bloco('prazo-'+m,'prazo',m).rows.set(String(r['codigo']),[r['tipo de documento'],r['codigo'],r['natureza'],r['ingresso'],r['finalizacao'],r['prazo']]); });
    Motor.linhas(state.arquivos.etapa||[]).forEach(function(r){ var m=mesDe(r['data execucao']); if (!m) return;
      var row=[r['codigo'],r['data execucao'],r['etapa'],r['responsavel'],r['prazo']]; bloco('etapa-'+m,'etapa',m).rows.set(row.join('|'),row); });
    var D=Motor.linhas(state.arquivos.demanda||[]); if (D.length){ var b=bloco('demanda','demanda',null);
      D.forEach(function(r){ if (Motor.semAcento(r['tipo de documento'])!=='ri') return; b.rows.set(String(r['codigo']),[r['codigo'],r['status']]); }); }
    return out;
  }
  var BRUTO_COLS={prazo:['tipo de documento','codigo','natureza','ingresso','finalizacao','prazo'], etapa:['codigo','data execucao','etapa','responsavel','prazo'], demanda:['codigo','status']};
  function brutoCod(b){ // dicionário de textos repetidos para ocupar menos espaço
    var dic=[], di={}, rows=Array.from(b.rows.values()).map(function(r){ return r.map(function(v){ if (typeof v!=='string') return v; if (!(v in di)){ di[v]=dic.length; dic.push(v); } return '~'+di[v]; }); });
    return {v:1, tipo:b.tipo, mes:b.mes, cols:BRUTO_COLS[b.tipo], dic:dic, rows:rows, em:new Date().toISOString(), versao:APP_VERSAO}; }
  function brutoDecod(doc){ return (doc.rows||[]).map(function(r){ var o={}; doc.cols.forEach(function(c,i){ var v=r[i]; o[c]=(typeof v==='string'&&v.charAt(0)==='~')?doc.dic[+v.slice(1)]:v; }); return o; }); }
  function brutoChave(tipo,o){ return tipo==='etapa'?[o['codigo'],o['data execucao'],o['etapa'],o['responsavel'],o['prazo']].join('|'):String(o['codigo']); }
  function brutosSalvar(){
    if (!window.nuvem || !dbPronto || !podeEscrever) return Promise.resolve(0);
    var novos=brutosMontar(), ks=Object.keys(novos), p=Promise.resolve();
    ks.forEach(function(k){ p=p.then(function(){ return window.nuvem.ler('brutos',k).then(function(ex){
      var b=novos[k], merged=new Map(); if (ex) brutoDecod(ex).forEach(function(o){ merged.set(brutoChave(b.tipo,o),BRUTO_COLS[b.tipo].map(function(c){ return o[c]; })); });
      b.rows.forEach(function(v,x){ merged.set(x,v); }); b.rows=merged; return window.nuvem.gravar('brutos',k,brutoCod(b)); }); }); });
    return p.then(function(){ return ks.length; });
  }
  function recalcularTudo(){
    if (!window.nuvem) return;
    if (!confirm('Recalcular todos os meses com a regra atual do painel, a partir dos dados brutos guardados?\n\nOs resultados salvos serão substituídos pelos recalculados. Justificativas, avaliações e lançamentos continuam como estão.')) return;
    var b=$('btnRecalc'); b.disabled=true; b.textContent='Recalculando…';
    window.nuvem.lerColecao('brutos').then(function(rows){
      var P=[], E=[], D=[]; rows.forEach(function(x){ var d=brutoDecod(x.dados); if (x.id.indexOf('prazo-')===0) P=P.concat(d); else if (x.id.indexOf('etapa-')===0) E=E.concat(d); else if (x.id==='demanda') D=D.concat(d); });
      if (!P.length || !E.length) throw new Error('Não há dados brutos guardados ainda. Importe as planilhas (ou restaure o backup inicial).');
      var res=Motor.processar(P,E,D,XLSX.SSF,state.extras), ms=Object.keys(res.meses).sort(), origem={recalculado:new Date().toISOString(), versao:APP_VERSAO, etapaIni:res.etapaIni, etapaFim:res.etapaFim}, p=Promise.resolve();
      ms.forEach(function(m){ p=p.then(function(){ return db.doc('meses/'+m).set(Motor.codificar(res.meses[m],origem,(res.producao||{})[m])); }).then(function(){ return db.doc('logs/'+m).set(Motor.codificarLog(res.meses[m])); }); });
      return p.then(function(){ return ms.length; });
    }).then(function(n){ toast(n+' mês(es) recalculado(s) com a versão '+APP_VERSAO); }).catch(function(e){ toast(e.message||'Não consegui recalcular'); })
      .then(function(){ b.disabled=false; b.textContent='Recalcular tudo com a regra atual'; });
  }
  function exportarBackup(){
    if (!window.nuvem) return; var b=$('btnBackup'); b.disabled=true; b.textContent='Gerando…';
    window.nuvem.lerTudo().then(function(rows){
      var hoje=new Date().toISOString().slice(0,10), dados={app:'painel-sgq-crco', versao:APP_VERSAO, geradoEm:new Date().toISOString(), docs:rows};
      return downloads.save({filename:'backup-painel-sgq-'+hoje+'.json', data:JSON.stringify(dados)}).then(function(){ return db.doc('config/backup').set({em:new Date().toISOString(), registros:rows.length}); }).then(function(){ toast('Backup baixado ('+rows.length+' registros). Guarde fora do Supabase.'); renderBackupInfo(); });
    }).catch(function(e){ toast('Não consegui gerar o backup: '+(e.message||'')); }).then(function(){ b.disabled=false; b.textContent='Baixar backup (.json)'; });
  }
  function restaurarBackup(file){
    file.text().then(function(txt){ var o=JSON.parse(txt);
      if (!o || o.app!=='painel-sgq-crco' || !Array.isArray(o.docs)) throw new Error('Este arquivo não é um backup do painel.');
      var cont={}; o.docs.forEach(function(d){ cont[d.colecao]=(cont[d.colecao]||0)+1; });
      if (!confirm('Restaurar backup de '+(o.geradoEm||'').slice(0,10)+' com '+o.docs.length+' registros?\n\n'+Object.keys(cont).map(function(k){return k+': '+cont[k];}).join(', ')+'\n\nRegistros com o mesmo nome serão substituídos pelos do backup; os demais continuam.')) return;
      var b=$('btnRestaurar'); b.disabled=true; var i=0, p=Promise.resolve();
      o.docs.forEach(function(d){ p=p.then(function(){ i++; b.textContent='Restaurando '+i+'/'+o.docs.length+'…'; return window.nuvem.gravar(d.colecao,d.id,d.dados); }); });
      return p.then(function(){ toast('Backup restaurado. Recarregando…'); setTimeout(function(){ location.reload(); },1200); });
    }).catch(function(e){ toast(e.message||'Não consegui restaurar'); var b=$('btnRestaurar'); b.disabled=false; b.textContent='Restaurar backup'; });
  }
  function renderBackupInfo(){
    var el=$('backupInfo'); if (!el||!db) return;
    db.doc('config/backup').get().then(function(s){ var d=s.exists?s.data():null, dias=d?Math.floor((Date.now()-new Date(d.em).getTime())/864e5):null;
      el.innerHTML=d?'Último backup baixado em '+fmtData(d.em.slice(0,10))+' ('+dias+' dia'+(dias===1?'':'s')+' atrás).':'Nenhum backup baixado ainda.';
      var av=$('avisoBackup'); if (av){ av.hidden=!(podeEscrever && (dias==null||dias>30)); av.innerHTML='<b>Backup:</b> '+(d?'o último foi há '+dias+' dias':'você ainda não baixou nenhum')+'. O plano gratuito do Supabase não faz backup automático — abra <b>Importar planilhas</b> e clique em <b>Baixar backup</b>.'; } });
  }

  // ——— memória de cálculo auditável (.xlsx com fórmulas do próprio Excel)
  function xSerial(iso){ if (!iso) return null; var p=String(iso).slice(0,10).split('-'); return Date.UTC(+p[0],+p[1]-1,+p[2])/864e5+25569; }
  function xFolha(cab, linhas, larguras){ var ws=XLSX.utils.aoa_to_sheet([cab].concat(linhas.map(function(l){ return l.map(function(v){ return v&&typeof v==='object'?null:v; }); })));
    linhas.forEach(function(l,i){ l.forEach(function(v,j){ if (v&&typeof v==='object'){ var a=XLSX.utils.encode_cell({r:i+1,c:j}); ws[a]=v; } }); });
    ws['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(1,linhas.length),c:cab.length-1}}); ws['!cols']=(larguras||[]).map(function(w){ return {wch:w}; }); ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(1,linhas.length),c:cab.length-1}})}; return ws; }
  function xData(iso){ var s=xSerial(iso); return s==null?'':{t:'n',v:s,z:'dd/mm/yyyy'}; }
  function xF(f){ return {t:'n',f:f}; }
  function baixarMemoria(m){
    var d=state.docs[m]; if (!d){ toast('Sem dados do painel para '+compLabel(m)); return; }
    var wb=XLSX.utils.book_new(), resumo=[], atos=d.atos, R=atos.filter(function(a){return a.cat==='R';}), nR=R.length;
    // feriados usados (nacionais + locais)
    var fer=Motor.feriadoSet(state.extras), fl=Object.keys(fer).map(Number).filter(function(n){ var y=+Motor.isoDeDia(n).slice(0,4); return y>=2025&&y<=2027; }).sort(function(a,b){return a-b;});
    var nF=fl.length+1;
    // KPI-02
    var l2=R.map(function(a,i){ var r=i+2, j=justDe(a);
      return [a.c, a.nat, xData(a.ing), xData(a.reg), a.bruto, xF('IF(D'+r+'="","",NETWORKDAYS(C'+r+',D'+r+',Feriados!$A$2:$A$'+nF+')-1)'), xF('IF(F'+r+'="","sem Revisão Oficial (Prazo do VHL)",IF(E'+r+'=F'+r+',"OK","DIFERENTE"))'), a.lim, j?(MOT_JUST[j.motivo]||j.motivo):'', xF('IF(OR(E'+r+'<=H'+r+',I'+r+'<>""),1,0)')]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Ingresso','Registro (última Revisão Oficial)','Dias úteis (painel)','Dias úteis (Excel)','Confere?','Limite (d.u.)','Justificativa','Dentro do prazo'], l2, [11,40,11,14,10,10,14,8,30,10]), 'KPI-02');
    resumo.push(['KPI-02','Finalizados na vigência da prenotação', xF("SUM('KPI-02'!J2:J"+(nR+1)+')'), xF("COUNTA('KPI-02'!A2:A"+(nR+1)+')'), 'Aba KPI-02: um ato registrado por linha. "Dias úteis (Excel)" refaz a conta com NETWORKDAYS e a aba Feriados.']);
    // KPI-02 complementar
    var SITX={R:'Registrado',N:'Não registrado (cancelado/devolvido)',E:'Abertura + outros (especial)',I:'Sem histórico'};
    var lc=atos.map(function(a){ return [a.c, a.nat, SITX[a.cat]||a.cat, a.cat==='N'?(MOTIVOS[a.motivo]||''):'', a.cat==='N'?1:0]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Situação','Motivo','Não registrado'], lc, [11,40,30,40,12]), 'KPI-02 Comp');
    resumo.push(['KPI-02 (Comp.)','Protocolos cancelados', xF("SUM('KPI-02 Comp'!E2:E"+(atos.length+1)+')'), xF("COUNTA('KPI-02 Comp'!A2:A"+(atos.length+1)+')'), 'Aba KPI-02 Comp: todos os protocolos arquivados no mês.']);
    // KPI-01
    var todos=incTodos(), porCod={}; todos.forEach(function(r){ if (r.t==='RI') porCod[r.c]=(porCod[r.c]||0)+1; });
    var l1=R.map(function(a,i){ return [a.c, a.nat, porCod[a.c]||0, xF('IF(C'+(i+2)+'>0,1,0)')]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Inconformidades RI ligadas ao protocolo','Teve inconformidade'], l1, [11,40,18,14]), 'KPI-01');
    var incMes=(state.inconf[m]||[]).filter(function(r){return r.t==='RI';});
    var lf=incMes.map(function(r){ return [xData(r.d), r.c, grupoDe(r)==='E'?'Externo':'Interno', catDe(r), r.o]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Data','Documento','Tipo','Erro','Observação'], lf, [11,11,9,30,80]), 'Inconformidades do mês');
    var den1=d.atos.length+((d.raw&&d.raw.pesquisa)||0);
    if ((state.cfg.k1met||'novo')==='ficha') resumo.push(['KPI-01','Taxa de não conformidade interna (RI) — fórmula de fluxo', xF("COUNTA('Inconformidades do mês'!A2:A"+(incMes.length+1)+')'), den1, 'Inconformidades RI registradas no mês ÷ documentos RI finalizados no mês ('+d.atos.length+' arquivados + '+((d.raw&&d.raw.pesquisa)||0)+' pesquisas).']);
    else resumo.push(['KPI-01','Taxa de não conformidade interna (RI) — atos com inconformidade', xF("SUM('KPI-01'!D2:D"+(nR+1)+')'), xF("COUNTA('KPI-01'!A2:A"+(nR+1)+')'), 'Aba KPI-01: atos registrados no mês com ao menos 1 inconformidade (de qualquer data) ÷ atos registrados.']);
    // KPI-09 (sem nomes: só matrícula)
    var k9=state.k9[m];
    if (k9){ var l9=k9.pessoas.map(function(p){ return [p.mat, p.h, p.hl]; });
      var ws9=xFolha(['Matrícula','Horas de ausência gerenciável','Horas de licença (fora da meta)'], l9, [12,24,26]);
      XLSX.utils.sheet_add_aoa(ws9,[['Headcount',k9.headcount],['Jornada mensal (h)',k9.jornada],['Período da folha',k9.periodo]],{origin:'E1'}); ws9['!cols'].push({wch:2},{wch:20},{wch:24});
      XLSX.utils.book_append_sheet(wb, ws9, 'KPI-09');
      resumo.push(['KPI-09','Absenteísmo', xF("SUM('KPI-09'!B2:B"+(l9.length+1)+')'), xF("'KPI-09'!F1*'KPI-09'!F2"), 'Horas de atestado + faltas abonadas ÷ (headcount × jornada). Só colaboradores com ausência aparecem na lista.']); }
    // KPI-13
    var sm=state.senhas[m];
    if (sm){ var at=sm.L.filter(function(s){ return s.c!=null&&s.e!=null; });
      var l13=at.map(function(s){ return [xData(s.dia), s.fila, s.pri?'Sim':'Não', Math.round(s.e/60*10000)/10000]; });
      XLSX.utils.book_append_sheet(wb, xFolha(['Data','Fila','Prioritária','Espera (min)'], l13, [11,36,11,12]), 'KPI-13');
      resumo.push(['KPI-13','Tempo de espera médio para início do atendimento', xF("ROUND(AVERAGE('KPI-13'!D2:D"+(l13.length+1)+'),2)'), 100, 'Média da espera (minutos) das senhas chamadas, lançada como numerador ÷ 100.']); }
    // demais KPIs (lançamento manual no painel)
    KPIS.forEach(function(K){ if (['k1','k2','k2c','k9','k13'].indexOf(K.auto)>=0 && (K.auto!=='k9'||k9) && (K.auto!=='k13'||sm)) return; var o=kpiValor(K.id,m); if (!o) return;
      resumo.push([K.id, K.nome, o.n, o.d, (o.fonte||'Manual')+' — valor informado no painel.']); });
    var lr=resumo.map(function(x,i){ var r=i+2; return [x[0],x[1],x[2],x[3], xF('IF(D'+r+'=0,"—",C'+r+'/D'+r+'*100)'), x[4]]; });
    var wsR=xFolha(['KPI','Indicador','Numerador','Denominador','Resultado','Como conferir'], lr, [14,48,12,12,11,90]);
    XLSX.utils.book_append_sheet(wb, wsR, 'Resumo'); wb.SheetNames.unshift(wb.SheetNames.pop());
    var wsF=xFolha(['Feriado (dias sem expediente considerados)'], fl.map(function(n){ return [{t:'n',v:n+25569,z:'dd/mm/yyyy'}]; }), [34]);
    XLSX.utils.book_append_sheet(wb, wsF, 'Feriados');
    var leia=[['Memória de cálculo — Painel SGQ · CRCO'],['Competência',compLabel(m)],['Gerado em',new Date().toLocaleString('pt-BR')],['Versão do painel',APP_VERSAO],['Fontes','VHL: Prazo e Tempo Médio, Produção por Etapa, Demanda (Suspensos), Consulta de inconformidades, Consulta de senhas. Folha: Rel. Eventos de Apuração.'],
      ['Como auditar','1) Confira na aba Resumo que Numerador e Denominador são fórmulas sobre as abas de cada KPI. 2) Na aba KPI-02, a coluna "Dias úteis (Excel)" recalcula com NETWORKDAYS: "Confere?" deve dar OK. 3) Sorteie protocolos e compare datas com o VHL. 4) Quem quiser refazer do zero sobe as mesmas planilhas do VHL no painel e compara.'],
      ['Regras','KPI-02: 20 dias úteis do ingresso à última Revisão Oficial (Art. 205 c/c Art. 9º §1º da Lei 6.015/73); 25 com reingresso (Art. 188). Dia do ingresso não conta. Cancelados e pesquisas qualificadas fora da base.'],
      ['Privacidade','Sem nomes de partes ou colaboradores; absenteísmo só por matrícula.']];
    var wsL=XLSX.utils.aoa_to_sheet(leia); wsL['!cols']=[{wch:18},{wch:120}]; XLSX.utils.book_append_sheet(wb, wsL, 'Leia-me');
    XLSX.writeFile(wb, 'Memoria de calculo KPIs - '+compLabel(m).replace(/[\/. ]+/g,'-')+'.xlsx');
    toast('Memória de cálculo baixada');
  }

  // ——— Painel geral: comparação mês a mês de todos os indicadores (pequenos gráficos lado a lado)
  var MES_AB=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function mesesGraficos(){
    var s={}; [state.docs,state.cert,state.senhas,state.k9,state.inconf].forEach(function(o){ Object.keys(o||{}).forEach(function(m){ if (/^\d{4}-\d{2}$/.test(m)) s[m]=1; }); });
    Object.keys(HIST).forEach(function(m){ s[m]=1; });
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
    [lo,(lo+hi)/2,hi].forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(pl-5)+'" y="'+(y(t)+3.5)+'" text-anchor="end" font-size="9" style="fill:var(--ink-3)">'+numBR(t,(hi-lo)<6?1:0)+'</text>'; });
    if (o.meta!=null) s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(o.meta)+'" y2="'+y(o.meta)+'" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 3"/><text x="'+(W-pr)+'" y="'+(y(o.meta)-4)+'" text-anchor="end" font-size="9" style="fill:var(--ink-2)">meta '+fmtG(o.meta,o.un)+'</text>';
    var d='', ult=-1; vals.forEach(function(v,i){ if (v==null||isNaN(v)) return; d+=(d?' L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1); ult=i; });
    s+='<path d="'+d+'" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    vals.forEach(function(v,i){ if (v==null||isNaN(v)) return; var fora=o.meta!=null&&(o.menor?v>o.meta:v<o.meta);
      s+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="'+(i===ult?4.5:3.5)+'" fill="'+(fora?'var(--crit)':'var(--brand)')+'" stroke="var(--surface)" stroke-width="2"/>'; });
    var passo=n>8?2:1;
    ms.forEach(function(m,i){ var lbl=MES_AB[+m.slice(5)-1]; if ((n-1-i)%passo===0) s+='<text x="'+x(i)+'" y="'+(H-7)+'" text-anchor="middle" font-size="9" style="fill:var(--ink-3)">'+lbl+'</text>';
      var v=vals[i], w=n<2?W:(W-pl-pr)/(n-1); s+='<rect x="'+(x(i)-w/2)+'" y="0" width="'+w+'" height="'+H+'" fill="transparent" data-tip="'+esc('<b>'+compLabel(m)+'</b><br>'+o.titulo+': '+fmtG(v,o.un)+(o.extra&&o.extra[i]?'<br>'+o.extra[i]:'')+(o.meta!=null&&v!=null?'<br>'+((o.menor?v<=o.meta:v>=o.meta)?'dentro da meta':'fora da meta'):''))+'"/>'; });
    if (ult>=0) s+='<text x="'+Math.min(x(ult),W-pr)+'" y="'+(y(vals[ult])-9)+'" text-anchor="'+(ult===n-1?'end':'middle')+'" font-size="10" font-weight="700" style="fill:var(--ink)">'+fmtG(vals[ult],o.un)+'</text>';
    return s+'</svg>';
  }
  function serieKPI(id, ms){ return ms.map(function(m){ var o=kpiValor(id,m); return o?(o.r!=null?o.r:o.n):null; }); }
  function renderGraficos(){
    var el=$('graficos'); if (!el) return; var ms=mesesGraficos();
    if (!ms.length){ el.innerHTML='<div class="empty">Importe planilhas para ver a comparação mês a mês.</div>'; return; }
    function rs(m){ return state.docs[m]?resumo(state.docs[m].atos):null; }
    var cards=[
      {t:'KPI-02 · finalizados no prazo', un:'%', v:ms.map(function(m){ var r=rs(m); return r&&r.n?r.kpi:null; }), meta:null, ir:'fp', ex:ms.map(function(m){ var r=rs(m); return r?r.dentro+' de '+r.n+' registrados':''; })},
      {t:'KPI-02 comp. · cancelamento', un:'%', v:ms.map(function(m){ var r=rs(m); return r&&r.total?r.N/r.total*100:null; }), ir:'nao', menor:true, ex:ms.map(function(m){ var r=rs(m); return r?r.N+' de '+r.total+' protocolos':''; })},
      {t:'KPI-01 · inconformidades', un:'%', v:serieKPI('KPI-01',ms), meta:16.5, menor:true, ir:'k1'},
      {t:'Mediana bruta até o registro', un:'d.u.', v:ms.map(function(m){ var r=rs(m); return r?r.medB:null; }), meta:20, menor:true, ir:'nat', zero:true},
      {t:'Aprovados na 1ª qualificação', un:'%', v:ms.map(function(m){ var r=rs(m); return r&&r.n?r.prim/r.n*100:null; }), ir:'ex'},
      {t:'Certidões no prazo', un:'%', v:ms.map(function(m){ if (!state.cert[m]) return null; var c=certCalc(state.cert[m].recs).filter(function(x){return !x.intim;}); return c.length?c.filter(function(x){return x.ok;}).length/c.length*100:null; }), ir:'cer'},
      {t:'KPI-13 · espera média', un:'min', v:ms.map(function(m){ if (!state.senhas[m]) { var o=kpiValor('KPI-13',m); return o?o.n:null; } var s=senhasResumo(state.senhas[m].L); return s.med!=null?s.med/60:null; }), meta:15, menor:true, ir:'at', zero:true},
      {t:'Senhas com espera ≥ 10 min', un:'%', v:ms.map(function(m){ if (!state.senhas[m]) return null; var s=senhasResumo(state.senhas[m].L); return s.na?s.a10/s.na*100:null; }), ir:'at', menor:true, zero:true},
      {t:'KPI-09 · absenteísmo', un:'%', v:serieKPI('KPI-09',ms), meta:4, menor:true, ir:'lanc', zero:true},
      {t:'KPI-03 · satisfação', un:'', v:serieKPI('KPI-03',ms), meta:80, ir:'lanc'},
      {t:'KPI-03 comp. · Google', un:'', v:serieKPI('KPI-03 (Comp.)',ms), meta:80, ir:'lanc'},
      {t:'Volume RI (atos + pesquisas)', un:'', v:ms.map(function(m){ var d=state.docs[m]; return d?d.atos.length+((d.raw&&d.raw.pesquisa)||0):null; }), ir:'nat', zero:true}
    ];
    el.innerHTML=cards.filter(function(c){ return c.v.some(function(v){return v!=null&&!isNaN(v);}); }).map(function(c){
      var idx=-1; c.v.forEach(function(v,i){ if (v!=null&&!isNaN(v)) idx=i; }); var ant=-1; for (var i=idx-1;i>=0;i--){ if (c.v[i]!=null&&!isNaN(c.v[i])){ ant=i; break; } }
      var v=c.v[idx], dl=ant>=0?v-c.v[ant]:null, bom=dl==null||dl===0?null:(c.menor?dl<0:dl>0);
      var fora=c.meta!=null?c.v.filter(function(x){ return x!=null&&(c.menor?x>c.meta:x<c.meta); }).length:0;
      return '<div class="gm-card"><div class="gm-h"><span class="gm-t">'+esc(c.t)+'</span><span class="gm-v">'+fmtG(v,c.un)+'</span></div>'+
        '<div class="gm-s">'+compLabel(ms[idx]).slice(4)+(dl!=null?' · <span class="'+(bom==null?'':bom?'gm-bom':'gm-mau')+'">'+(dl>0?'▲ ':dl<0?'▼ ':'')+fmtG(Math.abs(dl),c.un==='%'?'pp':c.un)+'</span> vs '+MES_AB[+ms[ant].slice(5)-1]:'')+(c.meta!=null?' · '+(fora?fora+' mês(es) fora da meta':'sempre na meta'):'')+'</div>'+
        graficoLinha(ms,c.v,{titulo:c.t,un:c.un,meta:c.meta,menor:c.menor,zero:c.zero,extra:c.ex})+'<button type="button" class="lnk gm-ir" data-ir="'+c.ir+'">Ver detalhes →</button></div>';
    }).join('');
  }

  // ——— aba Certidões
  var INTIM_RX=/diligencia|decurso|intimac|edital|publicac|notificac/;
  function certTipoMap(){ var m={}; Object.keys(state.docs).forEach(function(k){ var r=state.docs[k].raw||{}, ct=r.certTipos, cn=r.certNats||[]; if (ct) ct.split(';').forEach(function(x){ if(!x) return; var q=x.split(':'); m[q[0]]=cn[+q[1]]; }); }); return m; }
  function intimAuto(){ var tot={}, it={}; Object.keys(state.docs).forEach(function(k){ var pr=(state.docs[k].raw||{}).producao||{}; Object.keys(pr).forEach(function(p){ var v=pr[p]; if (!v||!v.e) return; Object.keys(v.e).forEach(function(et){ tot[p]=(tot[p]||0)+v.e[et]; if (INTIM_RX.test(semAc(et))) it[p]=(it[p]||0)+v.e[et]; }); }); });
    return Object.keys(tot).filter(function(p){ return tot[p]>=50 && (it[p]||0)/tot[p]>0.5; }); }
  function intimLista(){ return state.cfg.intim ? state.cfg.intim : intimAuto(); }
  function certRecs(){ var out=[]; Object.keys(state.cert).sort().forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) out=out.concat(state.cert[m].recs); }); return out; }
  function certCalc(recs){
    var fer=Motor.feriadoSet(state.extras), h0=state.cfg.expIni, h1=state.cfg.expFim, tm=certTipoMap(), intim={};
    intimLista().forEach(function(p){ intim[p]=1; });
    return recs.map(function(r){ var tipo=tm[r.p]||'', hu=Motor.horasUteis(r.i,r.f,fer,h0,h1), lim=Motor.limiteCert(tipo,h0,h1);
      return {p:r.p,i:r.i,f:r.f,u:r.u,mes:r.mes,tipo:tipo||'Central/online (sem tipo)',origem:tipo?'Balcão':'Central/online',hu:hu,lim:lim,ok:hu<=lim,intim:!!intim[r.u]}; });
  }
  function fmtMin(n){ var d=new Date(n*60000).toISOString(); return d.slice(8,10)+'/'+d.slice(5,7)+' '+d.slice(11,16); }
  function fmtLim(l){ var d=state.cfg.expFim-state.cfg.expIni; if (l===d) return '1 dia útil'; if (l===5*d) return '5 dias úteis'; return fmtH(l)+' úteis'; }
  function fmtH(h){ if (h==null) return '—'; if (h<1) return Math.round(h*60)+' min'; return f1(h)+' h'; }
  function renderCer(){
    var ms=Object.keys(state.cert);
    if (!ms.length){ $('tabCer').innerHTML='<div class="empty"><b>Nenhuma certidão importada</b>Suba a planilha Andamentos do Tri7 em Importar planilhas, junto com a Prazo e Tempo Médio do mesmo período (é ela que diz quais pedidos foram de balcão e o tipo).</div>'; return; }
    var all=certCalc(certRecs()), C=all.filter(function(x){return !x.intim;}), I=all.length-C.length;
    var ok=C.filter(function(x){return x.ok;}).length;
    var B=C.filter(function(x){return x.origem==='Balcão';}), O=C.filter(function(x){return x.origem!=='Balcão';});
    var Bit=B.filter(function(x){return /inteiro teor/i.test(x.tipo);});
    var erros=0; Object.keys(state.cert).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) erros+=state.cert[m].raw.erros||0; });
    var pc=function(a){ return a.length?a.filter(function(x){return x.ok;}).length/a.length*100:null; };
    var h='<div class="sec-h"><h2>Certidões</h2><span class="note">Horas úteis do pedido até a conclusão (Selos Gerados), no expediente de '+state.cfg.expIni+'h às '+state.cfg.expFim+'h. Prazos do art. 19 §10 da Lei 6.015/73.</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+
      kpi('Certidões no prazo',pctK(pc(C)),ok+' de '+C.length+' concluídas','hero')+
      kpi('Central / online',pct(pc(O)),O.length+' pedidos · mediana '+fmtH(mediana(O.map(function(x){return x.hu;}))))+
      kpi('Balcão',pct(pc(B)),B.length+' pedidos · mediana '+fmtH(mediana(B.map(function(x){return x.hu;}))))+
      kpi('Inteiro teor no balcão',pct(pc(Bit)),'prazo de 4 h úteis · '+Bit.length+' pedidos',pc(Bit)!=null&&pc(Bit)<95?'canc':'')+
      kpi('Fora do cálculo',String(I),'certidões do fluxo de intimação (prazo corre do pagamento)')+
      kpi('Erros de validação',String(erros),'geração automática que falhou')+'</div>';
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
    var usuarios={}, lst=intimLista(); all.forEach(function(x){ usuarios[x.u]=(usuarios[x.u]||0)+1; });
    h+='<div class="sub-h" style="margin-top:16px">Fluxo de intimação (fora do cálculo)</div><p class="hint" style="margin:0 0 6px">Certidões concluídas por quem trabalha no fluxo de intimação não entram no prazo: o cliente paga depois e o prazo corre do pagamento. '+(state.cfg.intim?'Lista ajustada por você.':'Detectado pela produção no VHL.')+' Clique para incluir ou tirar.</p><div class="chips">'+
      Object.keys(usuarios).sort(function(a,b){return usuarios[b]-usuarios[a];}).map(function(u){ var on=lst.indexOf(u)>=0; return '<button type="button" class="chip'+(on?' ok':'')+'" data-intim="'+esc(u)+'" aria-pressed="'+on+'">'+(on?'✓ ':'')+esc(u)+' · '+usuarios[u]+'</button>'; }).join('')+'</div>'+
      '<div class="ctl" style="margin-top:12px"><span class="hint" style="margin:0">Expediente</span><input type="number" id="expIni" min="0" max="23" value="'+state.cfg.expIni+'" style="width:64px" class="mini" aria-label="Início do expediente"><span class="hint" style="margin:0">às</span><input type="number" id="expFim" min="1" max="24" value="'+state.cfg.expFim+'" style="width:64px" class="mini" aria-label="Fim do expediente"><span class="hint" style="margin:0">h · seg a sex, sem feriados</span></div>';
    $('tabCer').innerHTML=h;
  }
  function salvarCfg(){ if (dbPronto&&podeEscrever) db.doc('config/geral').set({feriadosExtras:state.extras, expIni:state.cfg.expIni, expFim:state.cfg.expFim, intim:state.cfg.intim||null, k1met:state.cfg.k1met||'novo'}).catch(function(){ toast('Não consegui salvar a configuração'); }); }

  function gravar(col, a, dados){
    var id=idDoc(a.c), alvo=col==='justificativas'?state.just:state.aval;
    if (dados==null){ delete alvo[id]; } else { alvo[id]=dados; }
    render();
    if (!dbPronto){ toast('Registrado no painel (não salvo)'); return; }
    var ref=db.doc(col+'/'+id);
    (dados==null?ref.delete():ref.set(dados)).then(function(){ toast(dados==null?'Reaberto':'Salvo'); })
      .catch(function(e){ toast(e&&e.code==='invalid_argument'?'Sem permissão para salvar':'Não consegui salvar, tente de novo'); });
  }
  function atoPorCod(c){ var A=todosAtos(); for (var i=0;i<A.length;i++) if (A[i].c===c) return A[i]; return null; }

  function renderMetodo(){
    var meses=Object.keys(state.docs).sort().reverse();
    $('tabMet').innerHTML='<div class="metodo">'+
      '<h3>Como lemos os números</h3><b>Média</b> é o número do KPI (é o que a ficha técnica define). <b>Mediana</b> é o caso típico — metade fica abaixo, metade acima — e não é puxada por poucos casos extremos. <b>Moda</b> (“mais comum”) só aparece em contagens inteiras, como dias úteis; em tempo de relógio usamos a <b>faixa mais comum</b>. <b>90% em até</b> (P90) mostra o risco: o que acontece com os piores 10%. <b>Faixa típica</b> é onde está a metade central dos casos — larga quer dizer processo imprevisível. Com menos de '+MIN_N+' casos o painel avisa “poucos” e não tira conclusão.'+
      '<h3>Comparação justa entre pessoas</h3><b>Inconformidades:</b> cada pessoa é comparada com a faixa normal para o volume de documentos dela, já contando que funções diferentes erram em ritmos diferentes (funil com sobredispersão). Só aparece “acima” ou “abaixo do esperado” com 95% de confiança — o resto é variação normal. <b>Atendimento:</b> o tempo é comparado com a mediana da equipe <i>na mesma fila</i>, e só vira ponto de atenção quando a diferença é consistente (teste do sinal, menos de 5% de chance de ser acaso, 10+ atendimentos). “≈” marca diferença que pode ser acaso.'+
      '<h3>Prazo</h3>20 dias úteis contados do ingresso (Art. 205, com dias úteis pelo Art. 9º §1º da Lei 6.015/73). Se o título teve retorno — passou por <code>Re-Análise</code>, <code>Revisão de Exigência</code> ou aparece no relatório de Suspensos —, o limite vai a <b>25 dias úteis</b>. O dia do ingresso não conta.'+
      '<h3>Até quando conta</h3>Até a última <b>Revisão Oficial</b>, que é quando o registro sai para o cliente. Imprimir Ficha e Arquivamento vêm depois e ficam de fora. Atos que não passam por Revisão Oficial (ex.: CNIB) usam o campo Prazo do VHL.'+
      '<h3>Bruto, líquido e espera</h3><b>Bruto</b>: dias úteis do ingresso até o registro. <b>Líquido</b>: soma dos dias em cada etapa até o registro — o tempo em que o documento estava com o cartório. <b>Espera</b>: bruto − líquido, o tempo suspenso aguardando o cliente. Nos atos sem reingresso, líquido e bruto coincidem.'+
      '<h3>Quem sai do KPI-02</h3><b>Pesquisa Qualificada</b> (só conta no volume). <b>Não registrados</b>: status Cancelado, ou última etapa Cancelamento de Protocolo, ONR – Envio do Recibo do Protocolo, ONR – Nota de Devolução ou Re-Análise sem Revisão Oficial depois. <b>Abertura de matrícula + Outros atos</b>: fluxo especial, acompanhado à parte. <b>Sem histórico</b>: atos que entraram antes do início da Produção por Etapa importada.'+
      '<h3>Fora do prazo justificado</h3>Atos com prazo especial (Georreferenciamento, sobrestado a pedido do interessado, suscitação de dúvida, ordem judicial) ficam em aberto até você registrar o motivo. Com motivo, contam como dentro do prazo no KPI-02 e saem das médias e medianas, para não distorcer a curva normal.'+'<h3>KPI-02 complementar · cancelamento</h3>Atos cancelados, devolvidos ou com prenotação caducada, sobre o total de atos RI do período (sem Pesquisa Qualificada).'+'<h3>Exigências e pagamento</h3>Quando o título fica parado fora do fluxo (dias úteis que nenhuma etapa explica) e consta como Suspenso no relatório de Demanda, houve uma suspensão. Se ele volta por <code>Re-Análise</code> ou <code>Revisão de Exigência</code>, foi <b>exigência</b> cumprida; se volta direto para Minuta, foi <b>pagamento</b> (ONR). Re-Análise sem suspensão (Revisão devolvendo ao analista) não conta como exigência. Aprovado na 1ª qualificação = registrado sem nenhuma exigência. Títulos com 2 ou mais exigências vão para avaliação: conforme (causa do cliente) ou não conforme (falha na qualificação).'+'<h3>KPI-01 · inconformidades</h3>KPI-01 = atos RI registrados no período com ao menos 1 inconformidade ÷ atos RI registrados. A inconformidade é ligada ao ato pelo código, então não importa o mês em que foi registrada. Complementar = mesma conta só com erro externo. O nome do erro sai da Observação (regras por palavras-chave) e pode ser corrigido na lista. A taxa por pessoa divide as inconformidades pelos documentos que a pessoa trabalhou no VHL no período.'+'<h3>Certidões</h3>Base: planilha Andamentos do Tri7 (pedidos de certidão concluídos). O horário do export vem 3 horas adiantado e é corrigido. Conta horas úteis do pedido até a conclusão (Selos Gerados), só dentro do expediente. Prazos (art. 19 §10 da Lei 6.015/73): inteiro teor 4 horas; ônus e ações / situação jurídica 1 dia útil; demais 5 dias úteis. Pedido de balcão = aparece como Certidão - RI no VHL, que também dá o tipo; os demais vêm da central e seguem o prazo de 4 horas. Certidões do fluxo de intimação ficam fora porque o prazo corre do pagamento.'+'<h3>Feriados</h3>Nacionais automáticos, inclusive Carnaval, Sexta-feira Santa e Corpus Christi. Locais: em Importar planilhas.'+
      '<h3>Meses salvos</h3>'+(meses.length?'<table style="max-width:560px"><thead><tr><th>Mês</th><th>Atos</th><th>Sem histórico</th><th>Atualizado</th><th></th></tr></thead><tbody>'+meses.map(function(m){ var d=state.docs[m]; return '<tr><td>'+nomeMes(m)+'</td><td>'+d.raw.total+'</td><td>'+d.raw.incompletos+'</td><td>'+new Date(d.raw.atualizadoEm).toLocaleDateString('pt-BR')+'</td><td>'+(dbPronto&&podeEscrever?'<button class="btn" type="button" data-del="'+m+'" style="padding:3px 9px;font-size:.78rem">Excluir</button>':'')+'</td></tr>'; }).join('')+'</tbody></table>':'Nenhum ainda.')+
      '</div>';
  }

  // ——— importar
  function lerArquivo(f){
    return f.arrayBuffer().then(function(buf){
      var wb=XLSX.read(buf,{type:'array'}), ws=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(ws,{raw:true,defval:null});
      var cab=rows.length?Object.keys(rows[0]):[];
      return {tipo:senhasEhArquivo(cab)?'senhas':Motor.detectar(cab), rows:rows, nome:f.name};
    });
  }
  function receber(files){
    var lista=Array.prototype.slice.call(files);
    Promise.all(lista.map(lerArquivo)).then(function(res){
      var ign=[];
      res.forEach(function(r){ if(!r.tipo){ ign.push(r.nome); return; } if (r.tipo==='senhas'){ senhasImportar(r.rows, r.nome); return; } state.arquivos[r.tipo]=state.arquivos[r.tipo].concat(r.rows); state.nomes[r.tipo].push(r.nome); });
      if (ign.length) toast('Não reconheci: '+ign.join(', '));
      atualizarChips(); processarSePronto();
    }).catch(function(e){ toast('Não consegui ler o arquivo: '+e.message); });
  }
  function atualizarChips(){
    [['prazo','chipPrazo','Prazo e Tempo Médio'],['etapa','chipEtapa','Produção por Etapa'],['demanda','chipDemanda','Demanda & Produção (Suspensos)'],['inconf','chipInconf','Consulta de inconformidades'],['tri7','chipTri7','Andamentos (Tri7)']].forEach(function(x){
      var n=state.arquivos[x[0]].length, el=$(x[1]);
      el.className='chip'+(n?' ok':''); el.textContent=(n?'✓ ':'')+x[2]+(n?' · '+n.toLocaleString('pt-BR')+' linhas':'');
    });
  }
  function processarSePronto(){
    var a=state.arquivos;
    state.resInc = a.inconf.length ? Motor.processarInconf(a.inconf, XLSX.SSF) : null;
    state.resCert = a.tri7.length ? Motor.processarCert(a.tri7) : null;
    var hInc='';
    if (state.resCert){ var mcx=Object.keys(state.resCert).sort();
      hInc+='<div class="sub-h" style="margin-top:14px">Certidões (Tri7)</div><div class="tbl-wrap"><table><thead><tr><th>Mês</th><th>Concluídas</th><th>Já salvo</th><th>Salvar</th></tr></thead><tbody>'+
        mcx.map(function(m){ var ex=state.cert[m]; return '<tr><td>'+nomeMes(m)+'</td><td>'+state.resCert[m].recs.length+'</td><td>'+(ex?'<span class="pill mute">substitui ('+ex.recs.length+')</span>':'—')+'</td><td><input type="checkbox" data-cert-mes="'+m+'"'+(state.resCert[m].recs.length?' checked':'')+' aria-label="Salvar certidões de '+nomeMes(m)+'"></td></tr>'; }).join('')+'</tbody></table></div>'; }
    if (state.resInc){ var mi=Object.keys(state.resInc).sort();
      hInc+='<div class="sub-h" style="margin-top:14px">Inconformidades</div><div class="tbl-wrap"><table><thead><tr><th>Mês</th><th>Registros</th><th>Já salvo</th><th>Salvar</th></tr></thead><tbody>'+
        mi.map(function(m){ var ex=state.inconf[m]; return '<tr><td>'+nomeMes(m)+'</td><td>'+state.resInc[m].length+'</td><td>'+(ex?'<span class="pill mute">substitui ('+ex.length+')</span>':'—')+'</td><td><input type="checkbox" data-inc-mes="'+m+'" checked aria-label="Salvar inconformidades de '+nomeMes(m)+'"></td></tr>'; }).join('')+'</tbody></table></div>'; }
    if ((!a.prazo.length || !a.etapa.length) && (state.resInc||state.resCert)){ state.resultado=null;
      $('previa').innerHTML=hInc+'<div class="ctl" style="margin-top:10px"><button class="btn primary" type="button" id="btnSalvar">'+(dbPronto?'Salvar':'Mostrar no painel')+'</button><button class="btn" type="button" id="btnLimpar">Limpar arquivos</button></div>'+
        (a.prazo.length||a.etapa.length?'<p class="hint">Para os prazos, faltam: '+[!a.prazo.length&&'Prazo e Tempo Médio',!a.etapa.length&&'Produção por Etapa'].filter(Boolean).join(' e ')+'.</p>':'');
      return; }
    if (!a.prazo.length || !a.etapa.length){ $('previa').innerHTML='<p class="hint">Faltam: '+[!a.prazo.length&&'Prazo e Tempo Médio',!a.etapa.length&&'Produção por Etapa'].filter(Boolean).join(' e ')+(a.demanda.length?'':' · Demanda & Produção é opcional, mas sem ela os cancelados podem escapar')+'.</p>'; return; }
    var res=Motor.processar(a.prazo,a.etapa,a.demanda,XLSX.SSF,state.extras);
    state.resultado=res;
    var meses=Object.keys(res.meses).sort();
    var h='<div class="sub-h">Prévia · etapas de '+fmtData(res.etapaIni)+' a '+fmtData(res.etapaFim)+'</div><div class="tbl-wrap"><table><thead><tr><th>Mês</th><th>Atos</th><th>KPI-02</th><th>Sem histórico</th><th>Já salvo</th><th>Salvar</th></tr></thead><tbody>';
    meses.forEach(function(m){
      var M=res.meses[m], dec=Motor.decodificar(Motor.codificar(M,{},{})), r=resumo(dec), inc=r.I, ex=state.docs[m], marcar=!ex||ex.raw.incompletos>=inc;
      var exTxt=ex?(ex.raw.incompletos<inc?'<span class="pill warn">salvo é mais completo</span>':'<span class="pill mute">substitui</span>'):'—';
      h+='<tr><td>'+nomeMes(m)+'</td><td>'+M.atos.length+'</td><td>'+pillKpi(r.kpi)+'</td><td>'+(inc?'<span class="pill warn">'+inc+'</span>':'0')+'</td><td>'+exTxt+'</td><td><input type="checkbox" data-mes="'+m+'"'+(marcar?' checked':'')+' aria-label="Salvar '+nomeMes(m)+'"></td></tr>';
    });
    h+='</tbody></table></div>'+hInc+'<div class="ctl" style="margin-top:10px"><button class="btn primary" type="button" id="btnSalvar">'+(dbPronto?'Salvar meses marcados':'Mostrar no painel')+'</button><button class="btn" type="button" id="btnLimpar">Limpar arquivos</button></div>'+
      (dbPronto?'':'<p class="hint">O banco de dados não está disponível nesta visualização — os resultados aparecem no painel, mas não ficam salvos.</p>');
    $('previa').innerHTML=h;
  }
  function salvar(){
    var res=state.resultado, rinc=state.resInc;
    var marcados=Array.prototype.slice.call(document.querySelectorAll('#previa input[data-mes]:checked')).map(function(i){return i.dataset.mes;});
    var mInc=Array.prototype.slice.call(document.querySelectorAll('#previa input[data-inc-mes]:checked')).map(function(i){return i.dataset.incMes;});
    var mCert=Array.prototype.slice.call(document.querySelectorAll('#previa input[data-cert-mes]:checked')).map(function(i){return i.dataset.certMes;});
    if (!marcados.length && !mInc.length && !mCert.length){ toast('Marque pelo menos um mês'); return; }
    var docs=[];
    if (res){ var origem={prazo:state.nomes.prazo.join(', '),etapa:state.nomes.etapa.join(', '),demanda:state.nomes.demanda.join(', '),etapaIni:res.etapaIni,etapaFim:res.etapaFim};
      marcados.forEach(function(m){ docs.push({col:'meses',id:m,data:Motor.codificar(res.meses[m],origem,(res.producao||{})[m])}); docs.push({col:'logs',id:m,data:Motor.codificarLog(res.meses[m])}); }); }
    if (state.resCert) mCert.forEach(function(m){ docs.push({col:'cert',id:m,data:Motor.codificarCert(state.resCert[m],state.nomes.tri7.join(', '))}); });
    if (rinc) mInc.forEach(function(m){ docs.push({col:'inconf',id:m,data:{mes:m,v:1,origem:state.nomes.inconf.join(', '),atualizadoEm:new Date().toISOString(),recs:rinc[m]}}); });
    var grande=docs.filter(function(d){ return JSON.stringify(d.data).length>(d.col==='logs'?900000:250000); });
    if (grande.length){ toast('Mês grande demais para salvar: '+grande.map(function(d){return nomeMes(d.id);}).join(', ')); return; }
    function aplicar(){ docs.forEach(function(d){ if (d.col==='meses') state.docs[d.id]={raw:d.data,atos:Motor.decodificar(d.data)}; else if (d.col==='logs'){ state.logs[d.id]=d.data; delete state.logCache[d.id]; } else if (d.col==='cert') state.cert[d.id]={raw:d.data,recs:Motor.decodificarCert(d.data)}; else state.inconf[d.id]=d.data.recs; }); }
    if (!dbPronto){ aplicar(); fecharImport(); limparArquivos(); render(); toast('Resultados no painel (não salvos)'); return; }
    var btn=$('btnSalvar'); btn.disabled=true; btn.textContent='Salvando…';
    var p=Promise.resolve();
    docs.forEach(function(d){ p=p.then(function(){ return db.doc(d.col+'/'+d.id).set(d.data); }); });
    p.then(function(){ return brutosSalvar().catch(function(){ toast('Resultados salvos, mas os dados brutos não foram guardados'); }); }).then(function(){ aplicar(); limparArquivos(); fecharImport(); render(); toast(docs.length===1?'Salvo':'Salvo ('+docs.filter(function(d){return d.col!=='logs';}).length+' documentos)'); })
     .catch(function(e){ btn.disabled=false; btn.textContent='Salvar meses marcados';
       toast(e&&e.code==='quota_exceeded'?'Banco cheio — exclua meses antigos':e&&e.code==='invalid_argument'?'Sem permissão para salvar':'Não consegui salvar, tente de novo'); });
  }
  function limparArquivos(){ state.arquivos={prazo:[],etapa:[],demanda:[],inconf:[],tri7:[]}; state.nomes={prazo:[],etapa:[],demanda:[],inconf:[],tri7:[]}; state.resInc=null; state.resCert=null; state.resultado=null; atualizarChips(); $('previa').innerHTML=''; }
  function abrirImport(){ $('importar').hidden=false; $('btnImportar').textContent='Fechar importação'; $('importar').scrollIntoView({behavior:'smooth',block:'start'}); }
  function fecharImport(){ $('importar').hidden=true; $('btnImportar').textContent='Importar planilhas'; }
  function renderFeriados(){
    $('ferLista').innerHTML=state.extras.length?state.extras.slice().sort().map(function(d){ return '<span class="fer">'+fmtData(d)+'<button type="button" data-fer="'+d+'" aria-label="Remover '+fmtData(d)+'">×</button></span>'; }).join(''):'<span class="hint">Nenhum.</span>';
  }
  function salvarFeriados(){ renderFeriados(); salvarCfg(); if (state.resultado) processarSePronto(); render(); }

  // ——— eventos
  $('btnImportar').addEventListener('click',function(){ $('importar').hidden?abrirImport():fecharImport(); });
  $('selMes').addEventListener('change',function(e){ state.periodo=e.target.value; render(); });
  var drop=$('drop'), fin=$('fileIn');
  drop.addEventListener('click',function(){ fin.click(); });
  drop.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fin.click(); } });
  fin.addEventListener('change',function(){ if(fin.files.length) receber(fin.files); fin.value=''; });
  ['dragenter','dragover'].forEach(function(t){ drop.addEventListener(t,function(e){ e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave','drop'].forEach(function(t){ drop.addEventListener(t,function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop',function(e){ if(e.dataTransfer.files.length) receber(e.dataTransfer.files); });
  $('ferAdd').addEventListener('click',function(){ var v=$('ferData').value; if(!v) return; if(state.extras.indexOf(v)<0) state.extras.push(v); $('ferData').value=''; salvarFeriados(); });
  document.addEventListener('click',function(e){
    var t=e.target;
    if (t.id==='btnSalvar') return salvar();
    if (t.dataset && (t.dataset.justSalvar||t.dataset.justRm||t.dataset.avSalvar)){
      var row=t.closest('tr'), a=atoPorCod(row.dataset.cod); if(!a) return;
      if (t.dataset.justSalvar){ var mot=row.querySelector('select').value, obs=row.querySelector('input').value.trim();
        if (mot==='outro' && !obs){ toast('Descreva o motivo na observação'); row.querySelector('input').focus(); return; }
        return gravar('justificativas',a,{codigo:a.c,mes:a.mes,natureza:a.nat,motivo:mot,obs:obs,em:new Date().toISOString()}); }
      if (t.dataset.justRm) return gravar('justificativas',a,null);
      var res=row.querySelector('select').value, ob=row.querySelector('input').value.trim();
      return gravar('avaliacoes',a,res?{codigo:a.c,mes:a.mes,natureza:a.nat,exigencias:a.nex,resultado:res,obs:ob,em:new Date().toISOString()}:null);
    }
    if (t.dataset && t.dataset.verrel){ state.relSel=state.incFiltroPessoa?semAc(state.incFiltroPessoa):'__geral'; return irAba('rel'); }
    if (t.id==='relBaixar') return baixarRelatorio();
    var cpb=t.closest&&t.closest('.cp'); if (cpb) return copiarTexto(cpb.dataset.cp, cpb);
    var pl=t.closest&&t.closest('[data-prot]'); if (pl){ $('protIn').value=pl.dataset.prot; return fichaProtocolo(pl.dataset.prot); }
    if (t.id==='protFechar'){ state.protSel=null; $('protBox').hidden=true; return; }
    if (t.id==='protCopiar') return copiarTexto(state.protTxt, t);
    if (t.id==='k9Btn') return $('k9File').click();
    if (t.id==='memBtn') return baixarMemoria(state.lancMes);
    if (t.id==='btnBackup') return exportarBackup();
    if (t.id==='btnRestaurar') return $('restIn').click();
    if (t.id==='btnRecalc') return recalcularTudo();
    if (t.dataset && t.dataset.atmet){ state.atMet=t.dataset.atmet; return renderAtend(); }
    var atp=t.closest&&t.closest('tr[data-atpessoa]'); if (atp){ state.atPessoa=state.atPessoa===atp.dataset.atpessoa?null:atp.dataset.atpessoa; renderAtend(); var dt=$('atDet'); if (dt) dt.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (t.dataset && t.dataset.atfechar){ state.atPessoa=null; return renderAtend(); }
    if (t.dataset && t.dataset.atrel){ state.relSel=semAc(state.atPessoa); return irAba('rel'); }
    if (t.dataset && t.dataset.attodos){ state.atTodosDias=!state.atTodosDias; return renderAtend(); }
    if (t.dataset && t.dataset.k1met){ state.cfg.k1met=t.dataset.k1met; salvarCfg(); return renderLanc(); }
    if (t.dataset && t.dataset.cpan){ var ta0=t.closest('.lc-card').querySelector('textarea'); return copiarTexto(ta0.value, ta0); }
    if (t.dataset && t.dataset.anreset){ var ck=t.closest('.lc-card').dataset.kpi, dr=lancDoc(state.lancMes); if (dr.v[ck]) delete dr.v[ck].a; lancSalvar(state.lancMes); return renderLanc(); }
    if (t.id==='fbSalvar') return salvarDevolutiva();
    if (t.dataset && t.dataset.intim){ var l=intimLista().slice(), u=t.dataset.intim, ix=l.indexOf(u); if (ix>=0) l.splice(ix,1); else l.push(u); state.cfg.intim=l; salvarCfg(); return renderCer(); }
    if (t.dataset && t.dataset.incsetor){ state.incSetor=t.dataset.incsetor; renderK1(todosAtos()); return renderRel(); }
    if (t.dataset && t.dataset.inclimpar){ state.incFiltroCat=null; state.incFiltroPessoa=null; return renderK1(todosAtos()); }
    var ic=t.closest&&t.closest('[data-inccat]'); if (ic){ state.incFiltroCat = state.incFiltroCat===ic.dataset.inccat?null:ic.dataset.inccat; return renderK1(todosAtos()); }
    var ip=t.closest&&t.closest('tr[data-incpessoa]'); if (ip){ state.incFiltroPessoa = state.incFiltroPessoa===ip.dataset.incpessoa?null:ip.dataset.incpessoa; return renderK1(todosAtos()); }
    if (t.dataset && t.dataset.fex){ state.filtroEx=t.dataset.fex; return renderEx(todosAtos()); }
    if (t.id==='btnLimpar') return limparArquivos();
    if (t.id==='fecharDet'){ state.natSel=null; return render(); }
    if (t.dataset && t.dataset.fer){ state.extras=state.extras.filter(function(d){return d!==t.dataset.fer;}); return salvarFeriados(); }
    if (t.dataset && t.dataset.del){
      if (t.dataset.confirm!=='1'){ t.dataset.confirm='1'; t.textContent='Confirmar'; t.classList.add('primary'); return; }
      var m=t.dataset.del; t.disabled=true;
      db.doc('meses/'+m).delete().then(function(){ delete state.docs[m]; render(); toast('Mês excluído'); }).catch(function(){ t.disabled=false; toast('Não consegui excluir'); });
      return;
    }
    var seg=t.closest&&t.closest('.segb');
    if (seg){ state.natTodas=seg.dataset.todas==='1'; return renderNat(todosAtos()); }
    var th=t.closest&&t.closest('#tabNat th');
    if (th){ var k=th.dataset.k; state.sortNat = state.sortNat.k===k?{k:k,d:-state.sortNat.d}:{k:k,d:k==='nat'?1:-1}; return renderNatTabela(todosAtos()); }
    var tr=t.closest&&t.closest('#tabNat tr.click');
    if (tr){ var n=tr.dataset.nat; state.natSel = state.natSel===n?null:n; state.busca=''; state.filtroFora=false; var A=todosAtos(); renderNatTabela(A); if(state.natSel) renderDetalhe(A.filter(function(a){return a.nat===state.natSel;})); else $('detalhe').innerHTML=''; if(state.natSel){ var d=$('detalhe'); d&&d.scrollIntoView({behavior:'smooth',block:'nearest'}); } return; }
    var gir=t.closest&&t.closest('[data-ir]'); if (gir) return irAba(gir.dataset.ir);
    if (t.id==='btnMenu') return menuAbrir(!document.body.classList.contains('menu-aberto'));
    if (t.id==='menuFundo') return menuAbrir(false);
    var tab=t.closest&&t.closest('.tab');
    if (tab) return irAba(tab.dataset.tab);
  });
  var TITULOS={geral:'Painel geral',nat:'Prazos · por natureza',eta:'Prazos · por etapa',fp:'Prazos · fora do prazo',ex:'Prazos · exigências',nao:'Prazos · cancelados e especiais',k1:'KPI-01 · inconformidades',cer:'Certidões',at:'Atendimento',rel:'Relatórios por pessoa',lanc:'Lançar KPIs no ANOREG+',met:'Como é calculado'};
  function menuAbrir(sim){ document.body.classList.toggle('menu-aberto',!!sim); $('menuFundo').hidden=!sim; }
  function irAba(k){ state.aba=k; $('pgGeral').hidden=k!=='geral'; $('pgConteudo').hidden=k==='geral'; $('pgTitulo').textContent=TITULOS[k]||''; menuAbrir(false); window.scrollTo(0,0); if (k==='geral') renderGraficos(); document.querySelectorAll('.tab').forEach(function(b){ b.setAttribute('aria-selected',b.dataset.tab===k?'true':'false'); });
    var MAP={nat:'tabNat',k1:'tabK1',cer:'tabCer',eta:'tabEta',fp:'tabFp',ex:'tabEx',nao:'tabNao',at:'tabAt',lanc:'tabLanc',rel:'tabRel',met:'tabMet'}; Object.keys(MAP).forEach(function(x){ $(MAP[x]).hidden=state.aba!==x; });
    if (k==='rel') renderRel(); if (k==='lanc') renderLanc(); if (k==='at') renderAtend(); }
  document.addEventListener('change',function(e){
    var t=e.target;
    if (t.id==='relSel'){ state.relSel=t.value; return renderRel(); }
    if (t.id==='lancMes'){ state.lancMes=t.value; return renderLanc(); }
    if (t.id==='atMes'){ state.atMes=t.value; return renderAtend(); }
    if (t.id==='lancTodos'){ state.lancTodos=t.checked; return renderLanc(); }
    if (t.id==='restIn'){ if (t.files.length) restaurarBackup(t.files[0]); t.value=''; return; }
    if (t.id==='k9File'){ if (t.files.length) k9Importar(t.files); t.value=''; return; }
    if (t.dataset && t.dataset.lanc){ var cdl=t.closest('.lc-card'), dl=lancDoc(state.lancMes); dl.lanc[cdl.dataset.kpi]=t.checked; lancSalvar(state.lancMes); return renderLanc(); }
    if (t.id==='expIni'||t.id==='expFim'){ var a=Math.max(0,Math.min(23,parseInt($('expIni').value,10)||8)), b=Math.max(a+1,Math.min(24,parseInt($('expFim').value,10)||17)); state.cfg.expIni=a; state.cfg.expFim=b; salvarCfg(); return renderCer(); } if (!(t.dataset && (t.dataset.inccatsel||t.dataset.incgsel))) return;
    var id=t.closest('tr').dataset.incid, rec=null;
    Object.keys(state.inconf).some(function(m){ return state.inconf[m].some(function(r){ if (r.id===id){ rec=r; return true; } }); });
    if (!rec) return;
    var ov=Object.assign({},ovDe(rec));
    if (t.dataset.inccatsel){ if (t.value===Motor.nomearErro(rec.o,rec.j)) delete ov.cat; else ov.cat=t.value; }
    else { if (t.value===rec.g) delete ov.g; else ov.g=t.value; }
    delete ov.em; var vazio=!ov.cat && !ov.g;
    if (vazio) delete state.incCat[id]; else state.incCat[id]=ov;
    renderK1(todosAtos());
    if (!dbPronto) return;
    var ref=db.doc('inc_cat/'+idDoc(id)); (vazio?ref.delete():ref.set(Object.assign({em:new Date().toISOString()},ov))).then(function(){ toast('Alteração salva'); }).catch(function(){ toast('Não consegui salvar'); });
  });
  document.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ') && e.target.matches && e.target.matches('#tabNat tr.click')){ e.preventDefault(); e.target.click(); } });
  $('protForm').addEventListener('submit',function(e){ e.preventDefault(); fichaProtocolo($('protIn').value); });
  document.addEventListener('input',function(e){
    if (e.target.dataset && e.target.dataset.kpin){ var card=e.target.closest('.lc-card'), dk=lancDoc(state.lancMes), id=card.dataset.kpi, v=dk.v[id]=dk.v[id]||{}; v[e.target.dataset.kpin]=e.target.value; if (e.target.dataset.kpin!=='a') lancAtualizarCard(card); lancSalvar(state.lancMes); return; }
    if (e.target.dataset && e.target.dataset.fb && state.relSel!=='__geral'){ var kf=chaveFeedback(state.relSel), o=state.feedback[kf]=Object.assign({},state.feedback[kf]||{}); o[e.target.dataset.fb]=e.target.value; return; }
    if (e.target.id==='buscaEx'){ state.buscaEx=e.target.value; var p2=e.target.selectionStart; renderEx(todosAtos()); var bx=$('buscaEx'); bx.focus(); bx.setSelectionRange(p2,p2); return; }
    if (e.target.id==='natBusca'){ state.natBusca=e.target.value; renderNatTabela(todosAtos()); return; }
    if (e.target.id==='busca'){ state.busca=e.target.value; var pos=e.target.selectionStart; renderDetalhe(todosAtos().filter(function(a){return a.nat===state.natSel;})); var b=$('busca'); b.focus(); b.setSelectionRange(pos,pos); }
    if (e.target.id==='soFora'){ state.filtroFora=e.target.checked; renderDetalhe(todosAtos().filter(function(a){return a.nat===state.natSel;})); }
  });
  var tip=$('tip'), tipTimer=null;
  document.addEventListener('touchstart',function(e){ var el=e.target.closest&&e.target.closest('[data-tip]'); if (!el){ tip.hidden=true; return; }
    var to=e.touches[0]; tip.innerHTML=el.getAttribute('data-tip'); tip.hidden=false; var w=tip.offsetWidth, h=tip.offsetHeight, x=Math.min(Math.max(8,to.clientX-w/2),innerWidth-w-8), y=to.clientY-h-18; if (y<8) y=to.clientY+18;
    tip.style.left=x+'px'; tip.style.top=y+'px'; clearTimeout(tipTimer); tipTimer=setTimeout(function(){ tip.hidden=true; },3500); },{passive:true});
  document.addEventListener('mousemove',function(e){
    var el=e.target.closest&&e.target.closest('[data-tip]');
    if(!el){ tip.hidden=true; return; }
    tip.innerHTML=el.getAttribute('data-tip'); tip.hidden=false;
    var x=e.clientX+14, y=e.clientY+14, w=tip.offsetWidth, h=tip.offsetHeight;
    if (x+w>innerWidth-8) x=e.clientX-w-14; if (y+h>innerHeight-8) y=e.clientY-h-14;
    tip.style.left=x+'px'; tip.style.top=y+'px';
  });

  // ——— banco
  render(); renderFeriados(); atualizarChips();
  function avisar(t){ var a=$('avisoDb'); a.textContent=t; a.hidden=false; }
  if (!window.claude || !window.claude.use){ avisar('Não consegui conectar ao banco de dados.'); return; }
  Promise.resolve(window.claude.use('downloads')).then(function(d){ downloads=d; }).catch(function(){});
  Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(r){
    db=r[0]; var user=r[1];
    if (!db){ avisar('Banco de dados indisponível nesta visualização — os resultados não ficam salvos.'); return; }
    dbPronto=true; renderBackupInfo(); if ($('appVersao')) $('appVersao').textContent=APP_VERSAO;
    if (user && user.can){ Promise.resolve(user.can('data.write')).then(function(v){ if(v===false){ podeEscrever=false; $('btnImportar').hidden=true; avisar('Você está vendo em modo leitura.'); render(); } }); }
    db.collection('meses').onSnapshot(function(snap){
      var docs={}; snap.docs.forEach(function(d){ var raw=d.data(); if(raw&&raw.atos) docs[raw.mes||d.id]={raw:raw,atos:Motor.decodificar(raw)}; });
      state.docs=docs; render();
    }, function(e){ avisar('Perdi a conexão com o banco ('+e.code+'). Recarregue a página.'); });
    db.collection('justificativas').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ m[d.id]=d.data(); }); state.just=m; render(); }, function(){});
    db.collection('avaliacoes').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ m[d.id]=d.data(); }); state.aval=m; render(); }, function(){});
    db.collection('inconf').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.recs) m[x.mes||d.id]=x.recs; }); state.inconf=m; render(); }, function(){});
    db.collection('inc_cat').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ var x=d.data()||{}; m[d.id]={cat:x.cat,g:x.g}; }); state.incCat=m; render(); }, function(){});
    db.doc('config/geral').get().then(function(s){ if(s.exists){ var c=s.data(); state.extras=(c.feriadosExtras||[]).slice(); if (c.expIni!=null) state.cfg.expIni=c.expIni; if (c.expFim!=null) state.cfg.expFim=c.expFim; if (c.intim) state.cfg.intim=c.intim.slice(); if (c.k1met) state.cfg.k1met=c.k1met; renderFeriados(); render(); } }).catch(function(){});
    db.collection('logs').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows!=null){ state.logs[d.id]=x; delete state.logCache[d.id]; } }); if (state.protSel) fichaProtocolo(state.protSel); }, function(){});
    db.collection('senhas').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows) state.senhas[d.id]=senhasDecod(x); }); render(); }, function(){});
    db.collection('kpis').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x) state.kp[d.id]={mes:d.id,v:x.v||{},lanc:x.lanc||{}}; }); if (state.aba==='lanc') render(); }, function(){});
    db.collection('kpi09').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.pessoas) state.k9[d.id]=x; }); if (state.aba==='lanc') render(); }, function(){});
    db.collection('feedback').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ m[d.id]=d.data(); }); Object.assign(state.feedback,m); if (state.aba==='rel' && !document.activeElement.matches('#tabRel textarea')) renderRel(); }, function(){});
    db.collection('cert').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.recs) m[x.mes||d.id]={raw:x,recs:Motor.decodificarCert(x)}; }); state.cert=m; render(); }, function(){});
  });
})();

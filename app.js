(function(){
  if (typeof document==='undefined') return;
  var $=function(id){ return document.getElementById(id); };
  // ——— tema (automático / claro / escuro) e barra lateral recolhida: preferências deste navegador
  function prefLer(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function prefGravar(k,v){ try{ if (v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} }
  var TEMAS={auto:['◐ Auto','Tema: automático (segue o computador)'],claro:['☀ Claro','Tema: claro'],escuro:['☾ Escuro','Tema: escuro']};
  function temaAplicar(t){ if (!TEMAS[t]) t='auto'; var r=document.documentElement; if (t==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',t==='escuro'?'dark':'light');
    var b=document.getElementById('btnTema'); if (b){ b.textContent=TEMAS[t][0]; b.title=TEMAS[t][1]+' · clique para trocar'; } return t; }
  var temaAtual=temaAplicar(prefLer('crco-tema')||'auto');
  function temaTrocar(){ temaAtual=temaAplicar(temaAtual==='auto'?'escuro':temaAtual==='escuro'?'claro':'auto'); prefGravar('crco-tema',temaAtual==='auto'?null:temaAtual); if (typeof toast==='function') toast(TEMAS[temaAtual][1]); }
  function menuRecolher(sim){ document.body.classList.toggle('menu-recolhido',!!sim); prefGravar('crco-menu',sim?'recolhido':null); var b=document.getElementById('btnMenu'); if (b) b.setAttribute('aria-label',sim?'Mostrar a barra lateral':'Abrir menu de seções'); }
  if (prefLer('crco-menu')==='recolhido') menuRecolher(true);
  temaAplicar(temaAtual);
  var state={ docs:{}, extras:[], arquivos:{prazo:[],etapa:[],demanda:[],inconf:[],tri7:[],andam:[]}, nomes:{prazo:[],etapa:[],demanda:[],inconf:[],tri7:[],andam:[]}, andam:{}, andIdx:null, usr:{}, usrAuto:{}, resAnd:null, serv:{}, impFeito:{}, prazosServ:{}, sv:'RI', svSub:{}, srvNat:null, kpiCat:null, lancEdit:false,
    resultado:null, periodo:'todos', aba:'geral', natSel:null, sortNat:{k:'total',d:-1}, filtroFora:false, busca:'', natBusca:'', natTodas:false, just:{}, aval:{}, filtroEx:'pend', avDraft:{}, buscaEx:'', inconf:{}, incCat:{}, incSetor:'todos', incFiltroCat:null, incFiltroPessoa:null, cert:{}, cfg:{expIni:8, expFim:17, intim:null}, relSel:'__geral', feedback:{}, kp:{}, k9:{}, lancMes:null, lancTodos:false, atPessoa:null, logs:{}, logCache:{}, protSel:null, protTxt:'', senhas:{}, atMes:'todos', atMet:'esp', atTodosDias:false };
  var db=null, dbPronto=false, podeEscrever=true;

  var MOTIVOS={C:'Cancelado (status)',P:'Cancelamento de Protocolo',O:'ONR – recibo de cancelamento',D:'ONR – nota de devolução, sem registro',A:'Re-análise sem registro (caducou)',F:'Ofício de Cancelamento',X:'Devolução do depósito prévio',T:'Cancelado no Tri7 (desistência ou impossibilidade)'};
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
  // origem do protocolo de RI: natureza "ONR - …" = veio da central (e-protocolo); o resto = balcão
  function origemAto(a){ return /^onr\b/i.test(String(a.natOrig||a.nat||'').trim())?'central':'balcao'; }
  function origOk(a){ var o=state.riOrig||'todas'; return o==='todas'||origemAto(a)===o; }
  function atosDoMes(m){ return state.docs[m]?state.docs[m].atos.filter(origOk):[]; }
  function todosAtos(){
    if (typeof aplicarTri7==='function') aplicarTri7();
    var meses=Object.keys(state.docs).sort(), out=[];
    meses.forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) out=out.concat(atosDoMes(m)); });
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
  // 1.10.1: só a página visível é desenhada; as outras ficam marcadas e são desenhadas quando abertas
  var renderPend=null;
  function render(){ if (renderPend){ clearTimeout(renderPend); renderPend=null; } aplicarGrupos(); state.sujo={}; render0(); if (state.aba==='des') renderDes(); if (state.aba==='vis') renderVis(); }
  // vários snapshots chegam juntos na carga: junta tudo num desenho só
  function agendarRender(){ if (renderPend) return; renderPend=setTimeout(function(){ renderPend=null; render(); }, 40); }
  function pag(aba, fn){ if (state.aba===aba) fn(); else state.sujo[aba]=fn; }
  function pagPendente(k){ var f=state.sujo&&state.sujo[k]; if (!f) return; delete state.sujo[k]; f(); }
  var FOCO=function(sel){ return !!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest(sel)); };
  function render0(){
    renderAtrSelect(); renderSelect(); var atos=todosAtos();
    if (atrAtual()!=='RI'){ if (SO_RI.indexOf(state.aba)>=0 || (svModo()==='todas'&&SO_SERV.indexOf(state.aba)>=0)) irAba('geral'); renderAtr(); pag('k1',function(){ renderK1([]); }); pag('at',renderAtend); pag('rel',function(){ if (!FOCO('#tabRel textarea')) renderRel(); }); pag('lanc',function(){ if (!FOCO('#tabLanc input[type=text],#tabLanc textarea')) renderLanc(); }); pag('met',renderMetodo); return; }
    var vazio=!atos.length && !Object.keys(state.inconf).length && !Object.keys(state.cert).length && !Object.keys(state.senhas).length;
    $('secTendencia').hidden = Object.keys(state.docs).length<2;
    if (vazio){
      $('kpis').innerHTML='<div class="panel empty" style="grid-column:1/-1"><b>Nenhum mês carregado ainda</b>Abra <b>Importar dados</b> no menu e solte as planilhas do VHL. Os resultados ficam salvos aqui e cada mês novo vai se somando.</div>';
      ['tabNat','tabK1','tabCer','tabEta','tabNao','tabFp','tabEx','tabRel'].forEach(function(id){ $(id).innerHTML='<div class="empty">Sem dados para o período.</div>'; });
      pag('lanc',function(){ if (!FOCO('#tabLanc input[type=text],#tabLanc textarea')) renderLanc(); }); pag('tri',function(){ if (!FOCO('#tabTri input')) renderTri(); }); pag('at',renderAtend); pag('geral',renderGraficos); pag('met',renderMetodo); return;
    }
    pag('geral',function(){ pintarGeral(atos); });
    pag('nat',function(){ renderNat(atos); }); pag('eta',function(){ renderEta(atos); }); pag('nao',function(){ renderNao(atos); }); pag('fp',function(){ renderFp(atos); }); pag('ex',function(){ renderEx(atos); }); pag('k1',function(){ renderK1(atos); }); pag('cer',renderCer);
    pag('rel',function(){ if (!FOCO('#tabRel textarea')) renderRel(); }); pag('lanc',function(){ if (!FOCO('#tabLanc input[type=text],#tabLanc textarea')) renderLanc(); }); pag('tri',function(){ if (!FOCO('#tabTri input')) renderTri(); }); pag('at',renderAtend); pag('met',renderMetodo);
  }
  function pintarGeral(atos){
    var r=resumo(atos);
    $('kpis').innerHTML=[
      kpi('KPI-02 · dentro do prazo',pctK(r.kpi),r.dentro+' de '+r.n+' registrados'+(r.J?' · '+r.J+' justificado'+(r.J>1?'s':''):''),'hero'),
      (function(){ var eb=est(r.R.map(function(a){return a.bruto;})); return kpi('Mediana bruta',f1(r.medB)+' <small style="font-size:.9rem">d.u.</small>','média '+f1(r.mB)+(eb.moda!=null?' · mais comum '+eb.moda:'')+' · 90% em até '+f1(eb.p90)); })(),
      (function(){ var fo=r.R.filter(function(a){return a.dentro&&a.bruto!=null;}).map(function(a){return a.lim-a.bruto;}), ef=est(fo), apert=fo.filter(function(x){return x<=3;}).length;
        return kpi('Folga até o limite',(ef.n?f1(ef.mediana):'—')+' <small style="font-size:.9rem">d.u.</small>','mediana · '+(ef.n?pct(apert/ef.n*100)+' registrados com 3 d.u. ou menos de folga':''),apert/Math.max(1,ef.n)>0.05?'canc':''); })(),
      kpi('Mediana líquida',f1(r.medL)+' <small style="font-size:.9rem">d.u.</small>','média '+f1(r.mL)+' · tempo com o cartório'),
      kpi('Espera do cliente',f1(r.mEsp)+' <small style="font-size:.9rem">d.u.</small>','média por ato · exigência/suspensão'),
      kpi('Aprovados na 1ª qualificação',pct(r.n?r.prim/r.n*100:null),r.prim+' sem exigência · '+r.comEx+' com exigência'),
      (function(){ var X=cancSoTri7Periodo(), N=r.N+X.length, T=r.total+X.length; return kpi('KPI-02 complementar · cancelamento',pct(T?N/T*100:null),N+' de '+T+' atos · cancelado, devolvido ou caducou'+(X.length?' · inclui '+X.length+' cancelado'+(X.length>1?'s':'')+' só no Tri7':''),'canc'); })(),
      kpi('Volume RI',String(r.total+pesquisaTotal()),'inclui '+pesquisaTotal()+' pesquisas e consultas'),
      (function(){ var tudo=[]; Object.keys(state.docs).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) tudo=tudo.concat(state.docs[m].atos.filter(function(a){ return a.cat==='R'||a.cat==='N'; })); });
        var c=tudo.filter(function(a){ return origemAto(a)==='central'; }).length; return kpi('Origem dos protocolos',tudo.length?pct(c/tudo.length*100)+' <small style="font-size:.9rem">central</small>':'—',c+' pela central (ONR) · '+(tudo.length-c)+' balcão'+((state.riOrig||'todas')!=='todas'?' · <b>filtro: '+(state.riOrig==='central'?'só central':'só balcão')+'</b>':'')); })()
    ].join('') + (r.aberto? '<div class="banner warn" style="grid-column:1/-1;margin:0">'+r.aberto+' ato(s) fora do prazo em aberto. Registre o motivo na aba <b>Fora do prazo</b> para levá-lo à curva normal.</div>':'') + (r.I? '<div class="banner warn" style="grid-column:1/-1;margin:0">'+r.I+' ato(s) sem histórico suficiente ficaram fora do cálculo. Reimporte o mês com a Produção por Etapa começando 2 meses antes.</div>':'');
    renderTendencia(); renderGraficos();
  }
  function kpi(l,v,s,cls){ return '<div class="kpi '+(cls||'')+'"><span class="l">'+l+'</span><span class="v">'+v+'</span><span class="s">'+s+'</span></div>'; }

  function renderSelect(){
    var sel=$('selMes'), mm={}; (atrAtual()==='RI'?[state.docs]:svModo()==='todas'?[state.docs,state.serv]:[state.serv]).forEach(function(o){ Object.keys(o).forEach(function(m){ mm[m]=1; }); }); var meses=Object.keys(mm).sort().reverse();
    var html='<option value="todos">Todos os meses ('+meses.length+')</option>'+meses.map(function(m){ return '<option value="'+m+'">'+nomeMes(m)+'</option>'; }).join('');
    if (sel.innerHTML!==html) sel.innerHTML=html;
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
  var COLS=[['nat','Natureza'],['total','Atos'],['kpi','KPI-02'],['medB','Bruto · mediana / média'],['medL','Líquido · mediana / média'],['iqr','Faixa típica · bruto'],['mEsp','Espera média'],['canc','Cancelados']];
  var MIN_ATOS=10;
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
    var h='<div class="detail"><div class="detail-h"><div><div class="sub-h" style="margin:0">Detalhe</div><h3>'+esc(nat)+'</h3>'+(grAtivoPorNome(nat)?'<div class="hint">Grupo formado por: '+grAtivoPorNome(nat).nats.map(esc).join(' + ')+' · desfaça em Por natureza → Visual</div>':'')+'</div><button class="btn" type="button" id="fecharDet">Fechar</button></div>'+
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
  var AV={'':'Pendente',conforme:'Conforme – causa do cliente',nc:'Não conforme – falha na qualificação',na:'Não é exigência dupla – lançamento errado'};
  var SIT={R:'Registrado',N:'Cancelado',E:'Abertura + outros',I:'Sem histórico'};
  function renderEx(atos){
    var L=atos.filter(function(a){return state.filtroEx==='div'?(a.cat==='R'&&a.exDiv):(a.nex||0)>=2;}).sort(function(a,b){ return b.nex-a.nex || (a.c<b.c?-1:1); });
    var Rr=atos.filter(function(a){return a.cat==='R';}), comEx=Rr.filter(function(a){return a.nex>0;}).length, comPg=Rr.filter(function(a){return a.npg>0;}).length, comRi=Rr.filter(function(a){return a.nri>0;}).length;
    var av=function(a){ return state.aval[idDoc(a.c)]||null; };
    var avd=function(a){ var d=state.avDraft[a.c]; if (d) return {resultado:d.res,obs:d.obs}; return av(a); }; // o que a linha mostra (rascunho ou salvo)
    var isNa=function(a){ var v=av(a); return !!(v&&v.resultado==='na'); };
    var Ldesc=L.filter(isNa); L=L.filter(function(a){ return !isNa(a); });
    var nDraft=Object.keys(state.avDraft).length;
    var aval=L.filter(av), nc=aval.filter(function(a){return av(a).resultado==='nc';});
    var q=state.buscaEx.trim().toLowerCase();
    var vis=L.filter(function(a){
      if (q && a.c.toLowerCase().indexOf(q)<0 && a.nat.toLowerCase().indexOf(q)<0) return false;
      if (state.filtroEx==='pend') return !av(a);
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
      kpi(state.filtroEx==='div'?'Divergentes':'Com 2+ exigências',String(L.length),state.filtroEx==='div'?'contagem corrigida pelo Tri7':pct(atos.length?L.length/atos.length*100:null)+' dos '+atos.length+' atos do período')+
      kpi('Avaliados',String(aval.length),(L.length-aval.length)+' pendentes')+
      kpi('Não conformes',String(nc.length),aval.length?pct(nc.length/aval.length*100)+' dos avaliados':'nenhum avaliado ainda',nc.length?'canc':'')+
      kpi('Conformes',String(aval.length-nc.length),'causa do cliente')+
      (Ldesc.length?kpi('Descartadas',String(Ldesc.length),'não eram exigência dupla'):'')+'</div>';
    h+='<div class="search"><input type="search" id="buscaEx" placeholder="Buscar código ou natureza" value="'+esc(state.buscaEx)+'"><div class="seg" role="group" aria-label="Filtro">'+
      [['pend','Pendentes'],['nc','Não conformes'],['todos','Todos'],['desc','Descartadas'+(Ldesc.length?' ('+Ldesc.length+')':'')],['div','Divergências VHL × Tri7']].map(function(x){ return '<button type="button" class="segb" data-fex="'+x[0]+'" aria-pressed="'+(state.filtroEx===x[0])+'">'+x[1]+'</button>'; }).join('')+'</div></div>';
    h+='<div class="ctl" style="margin:8px 0"><button class="btn primary sm" type="button" data-av-tudo="1" id="avTudo"'+(nDraft?'':' disabled')+'>'+(nDraft?'Salvar tudo ('+nDraft+' alterada'+(nDraft>1?'s':'')+')':'Salvar tudo')+'</button><span class="hint" style="margin:0">O que você escolhe ou escreve fica guardado na tela até salvar, mesmo trocando de filtro ou salvando outra linha.</span></div>';
    if (!vis.length) h+='<div class="empty">Nada para mostrar com esse filtro.</div>';
    else h+='<div class="scroll" style="max-height:520px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Saída</th><th>Exigências</th><th title="Contagem só pelo VHL">VHL</th><th title="Notas de Exigência no Tri7">Tri7</th><th>Pagto.</th><th>Situação</th><th>Avaliação</th><th>Observação</th><th></th></tr></thead><tbody>'+
      vis.slice(0,400).map(function(a){ var v=avd(a)||{}, sujo=!!state.avDraft[a.c];
        return '<tr data-cod="'+esc(a.c)+'"'+(sujo?' class="rasc"':'')+'><td>'+protLink(a.c)+'</td><td class="tl">'+esc(a.nat)+'</td><td>'+fmtData(a.ing)+'</td><td>'+fmtData(a.fin)+'</td><td><b>'+a.nex+'</b></td><td class="mut">'+(a.nexV!=null?a.nexV:a.nex)+'</td><td class="mut">'+(a.exT?a.exT.ne:'—')+'</td><td>'+(a.npg||'')+'</td><td>'+(SIT[a.cat]||a.cat)+'</td>'+
        '<td><select class="mini" aria-label="Avaliação">'+Object.keys(AV).map(function(k){ return '<option value="'+k+'"'+((v.resultado||'')===k?' selected':'')+'>'+AV[k]+'</option>'; }).join('')+'</select></td>'+
        '<td><input class="mini" type="text" value="'+esc(v.obs||'')+'" placeholder="Ex.: cliente trouxe certidão vencida" aria-label="Observação"></td><td class="nw"><button class="btn sm" type="button" data-av-salvar="1">Salvar</button>'+(v.resultado==='nc'?' <button class="btn sm" type="button" data-av-fb="1" title="Abrir o feedback da pessoa que redigiu a exigência">→ Feedback</button>':'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
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
    if (!todos.length){ $('tabK1').innerHTML='<div class="empty"><b>Nenhuma inconformidade importada</b>Solte o PAINEL-04 Consulta de inconformidades do VHL em Importar dados.</div>'; return; }
    if (state.pgVis.k1){ $('tabK1').innerHTML=visK1(atos); return; }
    var k=kpi1Mes(atos, todos), A=atrAtual();
    var recs=incRecs().filter(function(r){ return A!=='RI'?incOk(r):(state.incSetor==='todos' || r.t==='RI'); });
    var ext=recs.filter(function(r){return grupoDe(r)==='E';}).length;
    if (A!=='RI' && svModo()==='todas'){ var porSv={}; recs.forEach(function(r){ var sv=svDe(r.t)||r.t; porSv[sv]=(porSv[sv]||0)+1; });
      var h='<div class="sec-h"><h2>Inconformidades · todas as serventias</h2><span class="note">Escolha uma serventia no topo para ver o % de documentos com inconformidade dela.</span></div><div class="kpis" style="margin-bottom:14px">'+kpi('Inconformidades registradas',String(recs.length),(recs.length-ext)+' internas · '+ext+' externas','hero')+Object.keys(porSv).sort(function(a,b){ return porSv[b]-porSv[a]; }).map(function(k){ return kpi(esc(k),String(porSv[k]),pct(porSv[k]/recs.length*100)+' do total'); }).join('')+'</div>'; }
    else if (A!=='RI'){ var DS=selDocs(), IC={}; todos.filter(incOk).forEach(function(r){ IC[String(r.c).toUpperCase()]=1; });
      var com=DS.filter(function(d){ return IC[String(d.c).toUpperCase()]; }).length, h='<div class="sec-h"><h2>Inconformidades · '+esc(selNome())+'</h2><span class="note">% dos documentos finalizados no período com ao menos 1 inconformidade, ligada pelo código.</span></div>'+
        '<div class="kpis" style="margin-bottom:14px">'+kpi('Documentos com inconformidade',DS.length?pct(com/DS.length*100):'—',com+' de '+DS.length+' finalizados','hero')+kpi('Inconformidades registradas',String(recs.length),(recs.length-ext)+' internas · '+ext+' externas')+'</div>';
      var msA=Object.keys(state.serv).sort(); if (msA.length) h+='<div class="sub-h">Mês a mês</div><div class="tbl-wrap"><table style="max-width:620px"><thead><tr><th>Mês</th><th>Finalizados</th><th>Com inconformidade</th><th>%</th><th>Registros no mês</th></tr></thead><tbody>'+
        msA.map(function(m){ var dm=selDocsMes(m), c=dm.filter(function(d){ return IC[String(d.c).toUpperCase()]; }).length, rg=(state.inconf[m]||[]).filter(incOk).length; return '<tr><td>'+nomeMes(m)+'</td><td>'+dm.length+'</td><td>'+c+'</td><td><b>'+(dm.length?pct(c/dm.length*100):'—')+'</b></td><td class="mut">'+rg+'</td></tr>'; }).join('')+'</tbody></table></div>'; }
    else { var h='<div class="sec-h"><h2>KPI-01 · Inconformidades</h2><span class="note">KPI-01 = % dos atos RI registrados no período que tiveram ao menos 1 inconformidade, ligada ao ato pelo código (independe da data do registro da inconformidade).</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+
      kpi('KPI-01 · atos com inconformidade',pct(k.k),k.c+' de '+k.n+' registrados','hero')+
      kpi('KPI-01 complementar · erro externo',pct(k.ke),k.e+' atos · erro que saiu do cartório',k.e?'canc':'')+
      kpi('Inconformidades registradas',String(recs.length),(recs.length-ext)+' internas · '+ext+' externas')+'</div>';
    // tabela mensal (RI)
    var meses=Object.keys(state.docs).sort();
    if (meses.length){
      h+='<div class="sub-h">Mês a mês</div><div class="tbl-wrap"><table style="max-width:760px"><thead><tr><th>Mês</th><th>Registrados</th><th>Com inconformidade</th><th>KPI-01</th><th>Erro externo</th></tr></thead><tbody>'+
      meses.map(function(m){ var d=state.docs[m], q=kpi1Mes(d.atos,todos);
        return '<tr><td>'+nomeMes(m)+'</td><td>'+q.n+'</td><td>'+q.c+'</td><td><b>'+pct(q.k)+'</b></td><td>'+pct(q.ke)+'</td></tr>'; }).join('')+'</tbody></table></div>';
    } }
    // filtros
    h+='<div class="search" style="margin-top:16px">'+(A==='RI'?'<div class="seg" role="group" aria-label="Setor"><button type="button" class="segb" data-incsetor="todos" aria-pressed="'+(state.incSetor==='todos')+'">Todos os setores</button><button type="button" class="segb" data-incsetor="ri" aria-pressed="'+(state.incSetor==='ri')+'">Só RI</button></div>':'')+
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
    h+='<div class="sub-h" style="margin-top:16px">Registros ('+lista.length+')</div><div class="scroll" style="max-height:480px"><table class="tleft"><thead><tr><th>Data</th><th>Documento</th><th>Pessoa</th><th title="Quem prenotou no Tri7 — só consulta, não aponta responsável">Deu entrada (Tri7)</th><th>Tipo</th><th>Erro (nome)</th><th>Observação</th></tr></thead><tbody>'+
      lista.slice(0,400).map(function(r){ var c=catDe(r), man=!!ovDe(r).cat;
        return '<tr data-incid="'+esc(r.id)+'"><td>'+fmtData(r.d)+'</td><td>'+protLink(r.c)+' <span class="mut">'+esc(r.t)+'</span></td><td class="tl">'+esc(r.r)+'</td><td class="tl mut">'+(function(){ var L=r.t==='RI'?andIndice()[String(r.c)]:null, e=L&&L.filter(function(x){return x.s==='PN'||x.s==='PA';})[0]; return e?esc(nomeLogin(e.u)):'—'; })()+'</td><td><select class="mini" data-incgsel="1" aria-label="Interno ou externo"'+(ovDe(r).g?' style="border-color:var(--brand)"':'')+'><option value="I"'+(grupoDe(r)==='I'?' selected':'')+'>Interno</option><option value="E"'+(grupoDe(r)==='E'?' selected':'')+'>Externo</option></select></td>'+
        '<td><select class="mini" data-inccatsel="1" aria-label="Erro"'+(man?' style="border-color:var(--brand)"':'')+'>'+opts.map(function(o){ return '<option'+(o===c?' selected':'')+'>'+esc(o)+'</option>'; }).join('')+'</select></td>'+
        '<td class="tl" style="min-width:280px">'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table></div>'+(lista.length>400?'<p class="hint">Mostrando 400 de '+lista.length+'. Escolha um mês ou filtre.</p>':'');
    $('tabK1').innerHTML=h;
  }


  // ——— aba Relatórios (o que aparece na tela é o que sai impresso)
  var downloads=null;
  var REL_CSS='@page{size:A4;margin:14mm 12mm}'+
    '.relsheet{--bg:#fff;--surface:#fff;--surface-2:#f1efeb;--line:#e3dfd8;--ink:#2b2926;--ink-2:#5d5952;--ink-3:#8f897f;--brand:#e8590c;--brand-soft:#fde8da;--crit:#b3362f;--good:#1f7a4d;--c1:#2a78d6;--c2:#eb6834;--c3:#1baf7a;--c4:#eda100;--c5:#e87ba4;--c6:#008300;color-scheme:light;-webkit-print-color-adjust:exact;print-color-adjust:exact}.relsheet *{-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
    '.relsheet svg{width:100%;height:auto;display:block}.relsheet svg text{font-family:"Segoe UI",Arial,sans-serif;fill:#5d5952}'+
    '.relsheet .diaria{background:#fde8da;border-radius:8px;padding:10px 12px;font-size:13px;margin:0 0 10px;break-inside:avoid}'+
    '.relsheet .rgraf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.relsheet .rg{border:1px solid #e3dfd8;border-radius:8px;padding:8px 10px;break-inside:avoid;min-width:0}.relsheet .rg.w{grid-column:1/-1}.relsheet .rg b{display:block;font-size:11.5px}.relsheet .rg small{display:block;color:#716a60;font-size:9.5px;margin-bottom:4px}'+
    '.relsheet .hb{display:flex;flex-direction:column;gap:4px}.relsheet .hb-row{display:grid;grid-template-columns:minmax(80px,40%) 1fr auto;gap:6px;align-items:center;font-size:10.5px}.relsheet .hb-n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#5d5952}.relsheet .hb-t{height:9px;background:#f1efeb;border-radius:3px;overflow:hidden}.relsheet .hb-t i{display:block;height:100%}.relsheet .hb-v{text-align:right;font-variant-numeric:tabular-nums}'+
    '.relsheet .leg{display:flex;flex-wrap:wrap;gap:10px;font-size:10px;color:#5d5952;margin-top:3px}.relsheet .leg i,.relsheet .dot{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px}.relsheet .gm-vazio{font-size:10.5px;color:#8f897f;padding:16px 0;text-align:center}'+
    '@media (max-width:640px){.relsheet .rgraf{grid-template-columns:1fr}}'+
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
  // ═════════ v1.9.1: produção média diária (dias ativos) ═════════
  // Dia ativo = dia útil em que a pessoa teve ao menos 1 execução na Produção por Etapa (dados brutos etapa-AAAA-MM, todas as execuções).
  // Documentos = códigos distintos que a pessoa trabalhou no mês (mesma regra do total do VHL). Segue o filtro Serventia.
  function etapasBrutas(){
    if (state.etB) return state.etB;
    if (!state.etBCarr && window.nuvem && dbPronto){ state.etBCarr=true;
      window.nuvem.lerColecao('brutos').then(function(rows){ var E=[], info={};
        rows.forEach(function(x){ if (x.id.indexOf('prazo-')===0) brutoDecod(x.dados).forEach(function(o){ info[String(o['codigo'])]={t:String(o['tipo de documento']||'').trim(), nat:String(o['natureza']||'').trim()}; }); });
        rows.forEach(function(x){ if (x.id.indexOf('etapa-')!==0) return; brutoDecod(x.dados).forEach(function(o){ var c=String(o['codigo']==null?'':o['codigo']).trim(), d=Motor.paraDia(o['data execucao'],XLSX.SSF), rp=String(o['responsavel']||'').trim(); if (!c||d==null||!rp) return; var i=info[c]||{}; E.push({c:c,d:d,rp:rp,t:i.t||null,nat:i.nat||''}); }); });
        state.etB=E; state._pd=null; render(); if (state.aba==='rel') renderRel(); })
      .catch(function(){ state.etBCarr=false; toast('Não consegui ler as execuções para a média diária'); }); }
    return null;
  }
  function execOk(x){ var modo=svModo(); if (modo==='todas') return true; var t=x.t?semAc(x.t):'';
    if (!t) return modo==='ri' && /^\d+$/.test(x.c); // protocolo ainda não finalizado: código só de números = RI
    if (modo==='ri') return t==='ri'; if (modo==='cert') return t==='certidao - ri'; return docOk({t:x.t, nat:x.nat}); }
  function prodDiaria(){
    var E=etapasBrutas(); if (!E) return null;
    var chave=[svModo(),svAtual(),subAtual(),E.length,(state.extras||[]).length].join('|'); if (state._pd&&state._pd.k===chave) return state._pd.v;
    var fer=Motor.feriadoSet(state.extras), P={};
    E.forEach(function(x){ if (!execOk(x)) return; var m=Motor.isoDeDia(x.d).slice(0,7), k=semAc(x.rp), p=P[k]=P[k]||{nome:x.rp,m:{}}, q=p.m[m]=p.m[m]||{docs:{},dias:{}};
      q.docs[x.c]=1; var w=((x.d%7)+7+4)%7; if (w!==0&&w!==6&&!fer[x.d]) q.dias[x.d]=1; });
    Object.keys(P).forEach(function(k){ Object.keys(P[k].m).forEach(function(m){ var q=P[k].m[m]; q.nd=Object.keys(q.docs).length; q.na=Object.keys(q.dias).length; delete q.docs; delete q.dias; }); });
    state._pd={k:chave,v:P}; return P;
  }
  function mesesProd(){ var o={}; [state.docs,state.serv].forEach(function(x){ Object.keys(x||{}).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) o[m]=1; }); }); return Object.keys(o).sort(); }
  function mediaDiaria(k, meses){ var P=prodDiaria(); if (!P) return null; var p=P[k], X=0, Y=0, Z=0;
    (meses||mesesProd()).forEach(function(m){ Z+=duMes(m); var q=p&&p.m[m]; if (q){ X+=q.nd; Y+=q.na; } });
    return {X:X, Y:Y, Z:Z, W:Y?X/Y:null}; }
  function fraseDiaria(r, nMeses){ if (!r) return '<span class="mut">calculando a média diária (lendo as execuções do VHL)…</span>';
    if (!r.X) return '<span class="mut">Sem execuções na Produção por Etapa nesta serventia e período.</span>';
    return '<b>'+r.X.toLocaleString('pt-BR')+'</b> documentos em <b>'+r.Y+'</b> dias ativos (de '+r.Z+' dias úteis '+(nMeses>1?'no período':'do mês')+') → média de <b>'+numBR(r.W,1)+'</b> documentos por dia ativo'; }
  // mediana da equipe por dia ativo no mês (pessoas com 5+ dias ativos)
  function equipeDiaria(m){ var P=prodDiaria(); if (!P) return null; var v=[]; Object.keys(P).forEach(function(k){ var q=P[k].m[m]; if (q&&q.na>=5) v.push(q.nd/q.na); }); return v.length?mediana(v):null; }

  function relDados(){
    var P=prodPessoas(), meses=mesesPeriodo(), recs=incRecs().filter(function(r){ return atrAtual()!=='RI'?incOk(r):(state.incSetor==='todos'||r.t==='RI'); });
    if (atrAtual()!=='RI' && svModo()!=='todas'){ P={}; selDocs().forEach(function(d){ var vist={}; d.ets.forEach(function(x){ if (!x.rp) return; var k=semAc(x.rp), q=P[k]=P[k]||{nome:x.rp,docs:0,et:{},pz:{},mes:{}}; if (!vist[k]){ vist[k]=1; q.docs++; q.mes[d.mes]=(q.mes[d.mes]||0)+1; } q.et[x.et]=(q.et[x.et]||0)+1; q.pz[x.et]=(q.pz[x.et]||0)+x.pz; }); }); }
    var I={}; recs.forEach(function(r){ var k=semAc(r.r), x=I[k]=I[k]||{nome:r.r,recs:[]}; x.recs.push(r); });
    var cr=certCalc(certRecs()), C={}; cr.forEach(function(c){ if (!c.u || c.u==='Tri7') return; var k=semAc(c.u), x=C[k]=C[k]||{nome:c.u,recs:[]}; x.recs.push(c); });
    var S={}, LS=senhasLista(state.periodo).filter(senhaOk); if (LS.length){ var ANs=atendAnalise(LS); Object.keys(ANs.P).forEach(function(n){ S[semAc(n)]=ANs.P[n]; }); }
    var T={}; if (Object.keys(state.andam).length){ var TP=tri7PorPessoa(); Object.keys(TP).forEach(function(l){ if (!l||l==='TRI7') return; var n=nomeLogin(l), k=semAc(n), x=TP[l]; if (T[k]){ ['PN','PA','RA','REx','NE','CI','AP','SG'].forEach(function(c){ T[k][c]+=x[c]; }); T[k].tEx=T[k].tEx.concat(x.tEx); T[k].tRv=T[k].tRv.concat(x.tRv); } else { T[k]=Object.assign({},x,{nome:n}); } }); }
    var pessoas={}; [P,I,C,S,T].forEach(function(o){ Object.keys(o).forEach(function(k){ if (!pessoas[k]) pessoas[k]=(P[k]||o[k]).nome; }); });
    // médias da equipe: taxa e dias por etapa
    var tn=0, td=0; Object.keys(P).forEach(function(k){ if (P[k].docs>=MIN_PROD){ td+=P[k].docs; tn+=((I[k]||{}).recs||[]).filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }).length; } });
    var eqE={}, eqZ={}; Object.keys(P).forEach(function(k){ Object.keys(P[k].et).forEach(function(e){ eqE[e]=(eqE[e]||0)+P[k].et[e]; eqZ[e]=(eqZ[e]||0)+(P[k].pz[e]||0); }); });
    var itR=Object.keys(P).filter(function(k){ return P[k].docs>=MIN_PROD; }).map(function(k){ return {key:k, n:P[k].docs, k:((I[k]||{}).recs||[]).filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }).length}; });
    funilTaxa(itR); var LT={}; itR.forEach(function(x){ LT[x.key]=x.lt; });
    var eqT={tEx:est([].concat.apply([],Object.keys(T).map(function(k){return T[k].tEx;}))), tRv:est([].concat.apply([],Object.keys(T).map(function(k){return T[k].tRv;})))};
    return {LT:LT,P:P,I:I,C:C,S:S,T:T,eqT:eqT,pessoas:pessoas,meses:meses,taxaEq:td?tn/td*100:null,eqE:eqE,eqZ:eqZ};
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
    var h=cabecalhoRel('Relatório de desempenho — qualidade e produção','<b>'+esc(nome)+'</b> · Período: '+nomePeriodo()+' · Serventia: '+esc(selNome())+(state.incSetor==='ri'?' · inconformidades só RI':''));
    var msP=mesesProd(), md=mediaDiaria(k,msP);
    h+='<h2>Resumo</h2><div class="diaria">'+fraseDiaria(md,msP.length)+'</div>'+tilesRel([
      (md&&md.X?['Documentos trabalhados',md.X.toLocaleString('pt-BR'),'no VHL · '+esc(selNome())]:['Documentos trabalhados',p.docs||'—','no VHL']),['Execuções de etapa',totEt||'—',Object.keys(p.et).length+' tipos de etapa'],
      ['Taxa de inconformidade',taxa==null?'—':pct(taxa),'média da equipe '+pct(D.taxaEq)+(function(){ var lt=taxa!=null?D.LT[k]:null; return lt?' · '+lt.txt+' (esperado ≈ '+Math.round(lt.esp)+', normal até '+lt.hi+')':''; })()],['Inconformidades',inc.length,(inc.length-ext)+' internas · '+ext+' externas']])+
      (cer.length?'<div style="height:8px"></div>'+tilesRel([['Certidões emitidas',cer.length,'Tri7'],['No prazo',cerCalc.length?pct(cerOk/cerCalc.length*100):'—',cerCalc.length?cerOk+' de '+cerCalc.length:'fluxo de intimação'],['Mediana',fmtH(mediana(cer.map(function(c){return c.hu;}))),'horas úteis'],['Fora do prazo',cerCalc.length-cerOk,'']]):'')+
      (function(){ var t=D.T&&D.T[k]; if (!t) return ''; var a=[], ex=est(t.tEx), rv=est(t.tRv);
        if (t.PN+t.PA) a.push(['Entradas (prenotou)',t.PN+t.PA,'Tri7']); if (t.RA) a.push(['Re-análises recebidas',t.RA,'título voltou']);
        if (t.REx) a.push(['Exigências redigidas',t.REx,ex.n>=MIN_N?'mediana '+fmtH(ex.mediana)+' após a entrada · equipe '+fmtH(D.eqT.tEx.mediana):'viraram nota de exigência']);
        if (t.NE) a.push(['Notas de exigência emitidas',t.NE,rv.n>=MIN_N?'revisão em '+fmtH(rv.mediana)+' (mediana) · equipe '+fmtH(D.eqT.tRv.mediana):'revisão']);
        if (t.CI+t.AP) a.push(['Custas informadas',t.CI+t.AP,'ONR']); if (t.SG) a.push(['Registros (selos gerados)',t.SG,'protocolos de RI']);
        return a.length?'<div style="height:8px"></div>'+tilesRel(a.slice(0,4))+(a.length>4?'<div style="height:8px"></div>'+tilesRel(a.slice(4)):''):''; })()+
      (taxa==null&&inc.length?'<p class="nota">Taxa não calculada: menos de '+MIN_PROD+' documentos da pessoa no VHL no período.</p>':'');
    // mês a mês
    if (msP.length>1 || D.meses.length>1){ var PDk=(prodDiaria()||{})[k];
      h+='<h2>Mês a mês</h2><table><thead><tr><th>Mês</th><th class="n">Documentos</th><th class="n">Dias ativos</th><th class="n">Dias úteis</th><th class="n">Por dia ativo</th><th class="n">Equipe (mediana)</th><th class="n">Inconformidades</th><th class="n">Taxa</th>'+(cer.length?'<th class="n">Certidões</th>':'')+'</tr></thead><tbody>'+
      msP.map(function(m){ var q=PDk&&PDk.m[m], d=q?q.nd:(p.mes[m]||0), n=inc.filter(function(r){return r.d.slice(0,7)===m;}).length, c=cer.filter(function(x){return x.mes===m;}).length, eq=equipeDiaria(m);
        return '<tr><td>'+nomeMes(m)+'</td><td class="n">'+(d||'—')+'</td><td class="n">'+(q?q.na:'—')+'</td><td class="n">'+duMes(m)+'</td><td class="n"><b>'+(q&&q.na?numBR(q.nd/q.na,1):'—')+'</b></td><td class="n">'+(eq==null?'—':numBR(eq,1))+'</td><td class="n">'+n+'</td><td class="n">'+(d>=10?pct(n/d*100):'—')+'</td>'+(cer.length?'<td class="n">'+c+'</td>':'')+'</tr>'; }).join('')+'</tbody></table>'+
      '<p class="nota">Dia ativo = dia útil em que a pessoa teve ao menos uma execução na Produção por Etapa do VHL. Por dia ativo = documentos ÷ dias ativos (quem tirou férias tem a média só dos dias trabalhados). Equipe = mediana das pessoas com 5+ dias ativos no mês.</p>'; }
    h+=relGraficos(k, D, p, inc);
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
    var outrosP=Object.keys(state.feedback).filter(function(id){ var f=state.feedback[id]; return f&&f.periodo&&f.periodo!==state.periodo&&semAc(f.pessoa||'')===k&&(f.fortes||f.atencao||f.acoes); }).map(function(id){ var p=state.feedback[id].periodo; return p==='todos'?'todos os meses':nomeMes(p); });
    h+='<h2>Devolutiva · '+esc(nomePeriodo())+'</h2>'+(outrosP.length&&!paraImprimir?'<p class="nota">Há devolutiva salva desta pessoa também em: '+esc(outrosP.join(', '))+'. Mude o Período, no topo, para ver.</p>':'')+campos.map(function(c){ var v=fb[c[0]]||'';
      return '<div class="dlab">'+c[1]+'</div>'+(paraImprimir?'<div class="devol'+(v?'':' vazio')+'">'+esc(v)+'</div>':'<textarea data-fb="'+c[0]+'" aria-label="'+c[1]+'" placeholder="Escreva aqui — sai no relatório impresso">'+esc(v)+'</textarea>'); }).join('')+
      '<div class="ass"><div>Gestor(a) responsável</div><div>'+esc(nome)+' — ciência em ___/___/______</div></div>';
    return h;
  }
  // gráficos do relatório individual (tela e arquivo impresso)
  function relGraficos(k, D, p, inc){
    var msP=mesesProd(), PDk=(prodDiaria()||{})[k], g=[];
    function card(t,sub,corpo,w){ return '<div class="rg'+(w?' w':'')+'"><b>'+esc(t)+'</b>'+(sub?'<small>'+sub+'</small>':'')+corpo+'</div>'; }
    var nome=D.pessoas[k];
    if (msP.length>1){
      g.push(card('Documentos por mês','documentos trabalhados no VHL',gLinhas(msP,[{nome:nome,cor:'var(--c1)',v:msP.map(function(m){ var q=PDk&&PDk.m[m]; return q?q.nd:(p.mes[m]||null); }),extra:msP.map(function(m){ var q=PDk&&PDk.m[m]; return q?q.na+' dias ativos':''; })}],{titulo:'Documentos por mês',zero:true,area:true,irMes:'rel',W:420,H:200})));
      if (PDk) g.push(card('Média por dia ativo','dela × mediana da equipe',gLinhas(msP,[{nome:String(nome).split(' ')[0],cor:'var(--c1)',v:msP.map(function(m){ var q=PDk.m[m]; return q&&q.na?q.nd/q.na:null; }),extra:msP.map(function(m){ var q=PDk.m[m]; return q?q.nd+' docs em '+q.na+' dias':''; })},{nome:'Equipe',cor:'var(--c2)',tracejado:true,v:msP.map(equipeDiaria)}],{titulo:'Média por dia ativo',zero:true,irMes:'rel',W:420,H:200})));
    }
    var ets=Object.keys(p.et||{}).sort(function(a,b){ return p.et[b]-p.et[a]; }).slice(0,10);
    if (ets.length) g.push(card('Execuções por etapa','as 10 etapas que mais fez',gBarrasH(ets.map(function(e){ var med=p.pz&&p.pz[e]!=null?p.pz[e]/p.et[e]:null, eq=D.eqE[e]?D.eqZ[e]/D.eqE[e]:null; return {nome:e, v:p.et[e], extra:(med!=null?'média '+numBR(med,1)+' d.u. na etapa':'')+(eq!=null?' · equipe '+numBR(eq,1):'')}; }))));
    if (svModo()!=='cert'){ var X=desExecs(), ms=mesesPeriodo().concat(Object.keys(state.serv)).filter(function(m,i,a){ return a.indexOf(m)===i&&(state.periodo==='todos'||state.periodo===m); }), cel={};
      X.forEach(function(x){ if (x.k!==k||x.dv==null||ms.indexOf(x.m)<0) return; (cel[x.et]=cel[x.et]||[]).push(x.dv); });
      var ek=Object.keys(cel).filter(function(e){ return cel[e].length>=5; }).sort(function(a,b){ return cel[b].length-cel[a].length; }).slice(0,10);
      if (ek.length) g.push(card('Tempo na etapa × equipe','d.u. a mais (+) ou a menos (−) que a equipe na mesma etapa e natureza · 5+ execuções',gBarrasH(ek.map(function(e){ var d=media(cel[e]); return {nome:e, v:Math.round(d*100)/100, cor:d>DES_MIN_DIF?'var(--c2)':'var(--c1)', extra:cel[e].length+' execuções'}; }).sort(function(a,b){ return b.v-a.v; }))));
      if (X.length){ var J=desJanelas(X), P=desPessoas(X,J).filter(function(q){ return q.k===k; })[0]; if (P&&P.an.length) g.push(card('Carta de controle · '+nomeMes(J.agora),'desvio por mês × linha normal dela (faixa cinza); ponto vermelho = fora da faixa',desCarta(P,J,'rel'),true)); }
    }
    if (inc.length){ var pc={}; inc.forEach(function(r){ var c=catDe(r); (pc[c]=pc[c]||[]).push(r); });
      g.push(card('Inconformidades por tipo',inc.length+' registros no período',gBarrasH(Object.keys(pc).sort(function(a,b){ return pc[b].length-pc[a].length; }).slice(0,10).map(function(c){ return {nome:c, v:pc[c].length, cor:'var(--c2)', go:goLista(nome+' · '+c,'inc',pc[c])}; })))); }
    return g.length?'<h2>Gráficos</h2><div class="rgraf">'+g.join('')+'</div>':'';
  }
  function corpoGeral(D){
    var k1=kpi1Mes(todosAtos(), incTodos()), recs=[]; Object.keys(D.I).forEach(function(k){ recs=recs.concat(D.I[k].recs); });
    var cr=certCalc(certRecs()).filter(function(c){return !c.intim;}), cok=cr.filter(function(c){return c.ok;}).length;
    var linhas=Object.keys(D.pessoas).map(function(k){ var p=D.P[k]||{docs:0,et:{}}, inc=((D.I[k]||{}).recs)||[], ip=inc.filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }).length, ext=inc.filter(function(r){return grupoDe(r)==='E';}).length, c=((D.C[k]||{}).recs)||[];
      var t=(D.T||{})[k]||{}, md=mediaDiaria(k); return {md:md,lt:D.LT[k],nome:D.pessoas[k],docs:p.docs,ex:Object.keys(p.et).reduce(function(s,e){return s+p.et[e];},0),inc:inc.length,ext:ext,taxa:p.docs>=MIN_PROD?ip/p.docs*100:null,cert:c.length,ent:(t.PN||0)+(t.PA||0),rex:t.REx||0,sg:t.SG||0}; })
      .sort(function(a,b){ return b.docs-a.docs; });
    var h=cabecalhoRel('Relatório geral — qualidade e produção da equipe','Período: '+nomePeriodo()+(state.incSetor==='ri'?' · inconformidades só RI':''));
    h+='<h2>Indicadores</h2>'+tilesRel([['KPI-01',pct(k1.k),k1.c+' de '+k1.n+' atos RI'],['KPI-01 complementar',pct(k1.ke),'erro externo'],['Taxa da equipe',pct(D.taxaEq),'inconformidades ÷ documentos'],['Certidões no prazo',cr.length?pctK(cok/cr.length*100):'—',cr.length?cok+' de '+cr.length:'']]);
    h+='<h2>Por pessoa</h2><table><thead><tr><th>Pessoa</th><th class="n">Documentos</th><th class="n">Dias ativos</th><th class="n">Por dia ativo</th><th class="n">Execuções</th><th class="n">Inconf.</th><th class="n">Taxa</th><th>Leitura</th><th class="n">Externas</th><th class="n">Certidões</th><th class="n">Entradas</th><th class="n">Exig. redigidas</th><th class="n">Registros</th></tr></thead><tbody>'+
      linhas.map(function(x){ var lt=x.taxa!=null?x.lt:null; return '<tr><td>'+esc(x.nome)+'</td><td class="n">'+(x.docs||'—')+'</td><td class="n">'+(x.md&&x.md.Y?x.md.Y+' <span style="color:#8f897f">de '+x.md.Z+'</span>':'—')+'</td><td class="n"><b>'+(x.md&&x.md.W!=null?numBR(x.md.W,1):'—')+'</b></td><td class="n">'+(x.ex||'—')+'</td><td class="n">'+x.inc+'</td><td class="n">'+(x.taxa==null?'—':pct(x.taxa))+'</td><td class="'+(lt&&lt.sig==='acima'?'acima':lt&&lt.sig==='abaixo'?'bom':'')+'">'+(lt?lt.txt:'—')+'</td><td class="n">'+(x.ext||'')+'</td><td class="n">'+(x.cert||'')+'</td><td class="n">'+(x.ent||'')+'</td><td class="n">'+(x.rex||'')+'</td><td class="n">'+(x.sg||'')+'</td></tr>'; }).join('')+'</tbody></table>'+
      '<p class="nota">'+(prodDiaria()?'Dias ativos = dias úteis com ao menos uma execução no VHL (de quantos dias úteis teve o período); por dia ativo = documentos dessa serventia ÷ dias ativos. ':'Média por dia ativo ainda carregando. ')+'Entradas, exigências redigidas (que viraram nota) e registros (selos gerados) vêm do Tri7. Taxa = inconformidades ÷ documentos trabalhados no VHL, só com '+MIN_PROD+'+ documentos no período. Leitura: "acima" ou "abaixo do esperado" só quando a pessoa foge, com 95% de confiança, da faixa normal para o volume dela (já contando a variação natural entre funções).</p>';
    var ld=linhas.filter(function(x){ return x.md&&x.md.Y>=5; }).sort(function(a,b){ return b.md.W-a.md.W; });
    if (ld.length) h+='<h2>Produção média por dia ativo</h2><div class="rg">'+gBarrasH(ld.map(function(x){ return {nome:x.nome, v:Math.round(x.md.W*10)/10, extra:x.md.X+' documentos em '+x.md.Y+' dias ativos (de '+x.md.Z+' dias úteis)', go:goPessoa(x.nome)}; }))+'</div><p class="nota">Só pessoas com 5 ou mais dias ativos no período.</p>';
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
  // KPI-01, KPI-02 e KPI-13 saíram daqui na 1.10.0: o painel calcula pelos dados importados
  var HIST={
    '2026-01':{'KPI-03 (Comp.)':[99.4,100],'KPI-08':[0,27],'KPI-09':[210.27,4725]},
    '2026-02':{'KPI-03 (Comp.)':[92.4,100],'KPI-08':[0,27],'KPI-09':[24,4185]},
    '2026-03':{'KPI-03 (Comp.)':[92.2,100],'KPI-08':[0,28],'KPI-09':[16,4752]},
    '2026-04':{'KPI-03 (Comp.)':[92.2,100],'KPI-08':[0.5,28],'KPI-09':[42.07,4725]},
    '2026-05':{'KPI-03':[95.53,100],'KPI-03 (Comp.)':[94.2,100],'KPI-04':[0,0],'KPI-08':[0,28],'KPI-09':[55,4617]},
    '2026-06':{'KPI-03':[97.36,100],'KPI-03 (Comp.)':[98.8,100],'KPI-04':[0,0],'KPI-06':[56,56],'KPI-08':[1,28],'KPI-09':[88.55,4788]},
    '2026-07':{'KPI-03':[95.27,100],'KPI-03 (Comp.)':[98.8,100],'KPI-04':[0,0],'KPI-06':[100,100],'KPI-07':[14,25],'KPI-08':[0,28],'KPI-09':[0,4613.4],'KPI-10':[0,0],'KPI-11':[0,0],'KPI-12':[0,0]},
    '2026-08':{'KPI-03':[99.32,100],'KPI-03 (Comp.)':[97.6,100],'KPI-04':[0,0],'KPI-08':[0,28],'KPI-09':[0,4700],'KPI-10':[0,0],'KPI-11':[0,0],'KPI-12':[0,0],'KPI-14':[1,1]},
    '2026-09':{'KPI-03':[96.11,100],'KPI-03 (Comp.)':[93.75,100],'KPI-05':[2,2],'KPI-07':[25,25]}
  };
  function maior(x){ return function(r){ return r>=x; }; } function menor(x){ return function(r){ return r<=x; }; }
  var KPIS=[
    {id:'KPI-01', nome:'Taxa de não conformidade interna (RI)', meta:'≤ 16,5%', metaV:16.5, sentido:'menor', bom:menor(16.5), auto:'k1', taxa:true},
    {id:'KPI-02', nome:'Finalizados na vigência da prenotação', meta:'A fixar (baseline)', baseline:true, auto:'k2', taxa:true},
    {id:'KPI-02 (Comp.)', nome:'Protocolos cancelados (decurso do prazo, desistência ou devolução)', meta:'A fixar (baseline)', baseline:true, auto:'k2c', novo:true},
    {id:'KPI-03', nome:'Satisfação do usuário', meta:'≥ 80', metaV:80, sentido:'maior', bom:maior(80), um:'Nota média (0–100)', den:100, taxa:true, dica:'Pesquisa RPS-SGQ-001 (Forms)'},
    {id:'KPI-03 (Comp.)', nome:'Satisfação do usuário — Google', meta:'≥ 80%', metaV:80, sentido:'maior', bom:maior(80), um:'Nota Google (0–100)', den:100, dica:'Avaliações do Google no mês'},
    {id:'KPI-04', nome:'Manifestações respondidas no prazo', meta:'100%', metaV:100, sentido:'maior', bom:maior(100), zeroOk:true, lab:['Respondidas no prazo','Recebidas'], taxa:true, vazio:'Sem manifestações recebidas no período.'},
    {id:'KPI-05', nome:'Eficácia das Ações Corretivas', meta:'90%', metaV:90, sentido:'maior', bom:maior(90), lab:['NCs com eficácia comprovada','NCs verificadas'], taxa:true, freq:'Trimestral', vazio:'Nenhuma NC atingiu a data de verificação no período.'},
    {id:'KPI-06', nome:'POPs/checklists críticos publicados', meta:'Concluída', bom:maior(100), lab:['Publicados','Previstos'], implant:true, fora:true},
    {id:'KPI-07', nome:'Colaboradores treinados', meta:'Concluído', bom:maior(100), lab:['Treinados','Elegíveis'], implant:true, fora:true},
    {id:'KPI-08', nome:'Rotatividade de pessoal (turnover)', meta:'≤5% ao mês', metaV:5, sentido:'menor', bom:menor(5), auto:'k8'},
    {id:'KPI-09', nome:'Absenteísmo', meta:'4%', metaV:4, sentido:'menor', bom:menor(4), auto:'k9', taxa:true},
    {id:'KPI-10', nome:'Acidentes de trabalho', meta:'0 (tolerância zero)', cont:'SST (CAT/eSocial)'},
    {id:'KPI-11', nome:'Doenças ocupacionais', meta:'0 (tolerância zero)', cont:'SST (nexo ocupacional)'},
    {id:'KPI-12', nome:'Desvios de comportamento ético', meta:'0 (tolerância zero)', cont:'disciplinar (GEP)'},
    {id:'KPI-13', nome:'Tempo de espera médio para início do atendimento', meta:'≤ 15 min', metaV:15, sentido:'menor', bom:menor(15), um:'Minutos (ex.: 1,61 ou 1:37)', den:100, minutos:true, auto:'k13'},
    {id:'KPI-14', nome:'% atualizações normativas registradas e comunicadas', meta:'100%', metaV:100, sentido:'maior', bom:maior(100), zeroOk:true, lab:['Comunicadas no prazo','Identificadas'], vazio:'Nenhuma atualização normativa identificada no período.'},
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


  // valores de cada KPI no mês: {n,d,r,fonte,txt,aviso}
  // 1.10.1: ao marcar "lançado", o valor do mês fica travado (é o que está no ANOREG+). O cálculo vivo continua disponível em o.atual.
  function kpiTravado(m,id){ var L=state.kp[m]&&state.kp[m].lanc&&state.kp[m].lanc[id]; return (L&&typeof L==='object')?L:null; }
  function kpiValor(id, m, semTexto, vivo){
    var f=vivo?null:kpiTravado(m,id), o=kpiValorVivo(id,m,semTexto);
    if (!f) return o;
    if (f.n==null) return o?Object.assign({},o,{atual:o, travado:f}):null;
    return {n:f.n, d:f.d, r:f.r, txt:f.txt||'', fonte:'Lançado no ANOREG+ em '+fmtDataHora(f.em)+' (painel '+(f.ver||'?')+')', travado:f, atual:o};
  }
  function fmtDataHora(iso){ if (!iso) return '?'; var d=new Date(iso); return isNaN(d)?'?':d.toLocaleDateString('pt-BR'); }
  function kpiTravar(K,m){
    var o=kpiValorVivo(K.id,m), e=kpEntrada(m,K.id), txt=e.a!=null?e.a:((o&&o.txt)||'');
    return {n:o?o.n:null, d:o?o.d:null, r:o?o.r:null, sit:kpiSituacao(K,o), txt:txt, em:new Date().toISOString(), ver:APP_VERSAO};
  }
  function kpiValorVivo(id, m, semTexto){
    var K=kpiDef(id), e=kpEntrada(m,id), h=HIST[m]&&HIST[m][id], o=null;
    if (K.auto==='k1' && state.docs[m]){
      var todos=incTodos(), d=state.docs[m], temInc=(state.inconf[m]||[]).length>0;
      if (todos.length){
        { var q=kpi1Mes(d.atos,todos), R={}; d.atos.forEach(function(a){ if (a.cat==='R') R[a.c]=1; });
          var cc={}; todos.forEach(function(r){ if (r.t==='RI' && R[r.c]){ var c=catDe(r); cc[c]=(cc[c]||0)+1; } });
          var top=Object.keys(cc).sort(function(a,b){return cc[b]-cc[a];}).slice(0,3).map(function(c){ return c+' ('+cc[c]+')'; });
          o={n:q.c, d:q.n, fonte:'Painel · atos com inconformidade', txt:q.c+' dos '+q.n+' atos RI registrados no mês tiveram ao menos 1 inconformidade'+(q.e?' ('+q.e+' com erro externo)':'')+'.'+(top.length?' Principais erros: '+top.join('; ')+'.':'')}; }
        var maxD=todos.reduce(function(s,r){ return r.d>s?r.d:s; },''), pm=m.split('-').map(Number), ult=m+'-'+new Date(pm[0],pm[1],0).getDate();
        if (!temInc) o.aviso='Não há inconformidades importadas com data neste mês — confira se a planilha cobre o mês inteiro.';
        else if (maxD<ult) o.aviso='Inconformidades importadas só até '+maxD.split('-').reverse().join('/')+' — importe a planilha do mês inteiro antes de lançar.';
      }
    } else if ((K.auto==='k2'||K.auto==='k2c') && state.docs[m]){
      aplicarTri7(); var s=resumo(state.docs[m].atos), xT=cancSoTri7Mes(m,true);
      if (K.auto==='k2') o={n:s.dentro, d:s.n, fonte:'Painel · 20 d.u. (25 com reingresso)', txt:s.dentro+' de '+s.n+' atos RI registrados no mês concluídos dentro do prazo legal (20 dias úteis, 25 com reingresso — art. 205 c/c art. 9º, §1º, da Lei 6.015/73)'+(s.J?', incluindo '+s.J+' com prazo especial justificado':'')+'. Mediana de '+numBR(s.medB,1)+' dias úteis do ingresso ao registro. Pesquisas qualificadas, Informação Verbal - Visualização de Matrícula e protocolos cancelados ficam fora da base.'};
      else o={n:s.N+xT.length, d:s.total+xT.length, fonte:'Painel · cancelados (VHL + Tri7)', txt:(s.N+xT.length)+' de '+(s.total+xT.length)+' protocolos do mês não chegaram ao registro (cancelamento por decurso do prazo após exigência não cumprida, desistência ou devolução)'+(xT.length?', incluindo '+xT.length+' cancelado'+(xT.length>1?'s':'')+' no Tri7 e ainda sem finalização no VHL':'')+'.'};
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
  function kpiTendLeitura(K,o,m){
    if (!o || K.implant) return '';
    var p=null, mm=m; for (var i=0;i<3&&p==null;i++){ mm=mesAnt(mm); p=kpiComp(kpiValor(K.id,mm)); }
    var a=kpiComp(o); if (p==null||a==null) return '';
    var df=Math.round((a-p)*100)/100; if (!df) return 'estável em relação a '+nomeMes(mm);
    var menorMelhor=K.sentido==='menor'||!!K.cont||K.auto==='k2c';
    return ((df<0)===menorMelhor?'melhorou':'piorou')+' em relação a '+nomeMes(mm);
  }
  function lancMeses(){
    var s={}; [state.docs,state.k9,state.kp,HIST,state.senhas].forEach(function(o){ Object.keys(o||{}).forEach(function(m){ if (/^\d{4}-\d{2}$/.test(m)) s[m]=1; }); });
    var h=mesHoje(); s[h]=1; s[mesAnt(h)]=1; return Object.keys(s).sort().reverse();
  }
  function cp(lab, val, cls){ var v=val==null?'':String(val); return '<button type="button" class="cp'+(cls?' '+cls:'')+'" data-cp="'+esc(v)+'" title="Clique para copiar"><span class="cpl">'+lab+'</span><span class="cpv">'+(v?esc(v):'<i>vazio</i>')+'</span></button>'; }
  function cardSaida(K, m){
    var o=kpiValor(K.id,m), sit=kpiSituacao(K,o), tend=kpiTendencia(K,o,m), e=kpEntrada(m,K.id);
    var txt=(o&&o.travado&&o.travado.n!=null)?(o.txt||''):(e.a!=null?e.a:((o&&o.txt)||''));
    var nTxt=o?numBR(o.n):'', dTxt=o?numBR(o.d):'';
    var h='<div class="lc-grid">'+cp('Competência',compLabel(m))+cp('KPI',K.id)+cp('indicador',K.nome,'w2')+cp('Numerador',nTxt)+cp('Denominador',dTxt)+cp('Meta',K.meta)+cp('Situação',sit,sit==='Não atende'?'bad':sit==='Atende'?'good':'')+cp('Tendência',tend)+cp('Evidência (Link)',e.ev!=null?e.ev:evidLabel(m))+'</div>';
    var res=o&&o.r!=null?numBR(o.r):(o&&K.cont?'—':'');
    var nota=[];
    if (o) nota.push('Resultado (o ANOREG+ calcula): <b>'+(res||'—')+(o.r!=null&&!K.minutos&&K.den!==100?'%':'')+'</b>'+(K.minutos&&o?' · '+mmss(o.n):''));
    var lt=kpiTendLeitura(K,o,m); if (lt) nota.push('Tendência '+tend+' = '+lt+(K.baseline&&!K.metaV?' (sem meta fixada)':''));
    if (o&&o.fonte) nota.push('Fonte: '+esc(o.fonte));
    if (o&&o.travado&&o.travado.n!=null){ var at=o.atual, rA=at?kpiComp(at):null, rT=kpiComp(o), dif=(rA!=null&&rT!=null)?Math.round((rA-rT)*100)/100:null;
      if (!at) nota.push('<span class="mut">Sem dados para recalcular hoje — vale o valor travado.</span>');
      else if (at.n!==o.n||at.d!==o.d) nota.push('<span class="lc-warn">Pela regra/dados de hoje daria '+numBR(at.n)+' / '+numBR(at.d)+(dif!=null?' (diferença de '+numBR(dif)+(o.r!=null&&!K.minutos?' p.p.':'')+')':'')+'. Vale o lançado. Só corrija no ANOREG+ se for erro de dado e mudar a situação ou passar de 1 p.p.</span>');
      else nota.push('<span class="mut">O cálculo de hoje confere com o lançado.</span>'); }
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
  function renderLanc(forca){
    var el=$('tabLanc'); if (!el) return;
    if (state.lancEdit){ if (forca===true||!el.querySelector('.kpied')) el.innerHTML=renderKpiEditor(); return; } // no modo edição só redesenha por ação, para não perder o que está sendo digitado
    var ms=lancMeses(); if (!state.lancMes || ms.indexOf(state.lancMes)<0) state.lancMes=mesAnt(mesHoje());
    var m=state.lancMes, L=(state.kp[m]&&state.kp[m].lanc)||{};
    var vis=KPIS.filter(function(K){ return state.lancTodos || !K.fora; });
    var feitos=vis.filter(function(K){ return L[K.id]; }).length;
    var h='<div class="sec-h"><h2>Lançar KPIs no ANOREG+</h2><span class="note">Clique em qualquer campo para copiar e cole na linha do IND-SGQ-001. O Resultado o ANOREG+ calcula sozinho.</span></div>'+
      '<div class="search"><select id="lancMes" aria-label="Competência">'+ms.map(function(x){ return '<option value="'+x+'"'+(x===m?' selected':'')+'>'+compLabel(x)+'</option>'; }).join('')+'</select>'+
      '<span class="chip'+(feitos===vis.length?' ok':'')+'">'+feitos+' de '+vis.length+' lançados</span>'+
      '<label class="lc-chk"><input type="checkbox" id="lancTodos"'+(state.lancTodos?' checked':'')+'> mostrar ocultos</label>'+(podeEscrever?'<button class="btn sm" type="button" id="kpiEdBtn">Editar indicadores</button>':'')+
      '<span class="spacer"></span><button class="btn sm" type="button" id="memBtn" title="Planilha com o cálculo de cada KPI deste mês, ato por ato, com fórmulas do Excel — para anexar no ANOREG+">Baixar memória de cálculo (.xlsx)</button>'+'</div>'+'';
    h+=vis.map(function(K){
      var s=cardSaida(K,m), done=!!L[K.id], tr=kpiTravado(m,K.id);
      return '<div class="lc-card'+(done?' done':'')+(tr?' travado':'')+'" data-kpi="'+esc(K.id)+'">'+
        '<div class="lc-top"><b>'+esc(K.id)+'</b><span class="lc-nome">'+esc(K.nome)+'</span>'+(K.freq?'<span class="chip">'+K.freq+'</span>':'')+(K.novo?'<span class="chip">ainda não existe no ANOREG+</span>':'')+
        '<span class="spacer"></span><label class="lc-chk"><input type="checkbox" data-lanc="1"'+(done?' checked':'')+(podeEscrever?'':' disabled')+'> lançado</label></div>'+
        (tr?'<div class="lc-trava">🔒 Valor travado em '+fmtDataHora(tr.em)+' (painel '+esc(tr.ver||'?')+'). Mudanças do painel não alteram este mês. Para mudar, desmarque "lançado".</div>':done?'<div class="lc-trava velho">Marcado como lançado antes da trava (1.10.1): o valor não foi guardado. Desmarque e marque de novo para travar o valor de hoje.</div>':'')+
        '<div class="lc-ins">'+(tr?'':cardEntrada(K,m))+'</div>'+
        '<div class="lc-out">'+s.html+'</div>'+
        '<div class="lc-an"><div class="lc-anh"><span class="cpl">Análise / Ação</span><button type="button" class="btn sm" data-cpan="1">Copiar análise</button>'+(!tr&&kpEntrada(m,K.id).a!=null?'<button type="button" class="btn sm" data-anreset="1">Voltar ao texto sugerido</button>':'')+'</div>'+
        '<textarea data-kpin="a" rows="2"'+(tr?' readonly':'')+' placeholder="Sem texto sugerido — escreva a análise se houver">'+esc(s.txt)+'</textarea></div></div>';
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
  var lancPend={};
  function lancSalvar(m){ lancPend[m]=1; clearTimeout(lancTimer); lancTimer=setTimeout(function(){ var ms=Object.keys(lancPend); lancPend={}; ms.forEach(function(x){ if (dbPronto&&podeEscrever&&state.kp[x]) db.doc('kpis/'+x).set(state.kp[x]).catch(function(){ toast('Não consegui salvar'); }); }); },700); }
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
    render();
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
    if (!ms.length){ el.innerHTML='<div class="empty"><b>Nenhuma senha importada</b>Exporte a <b>Consulta de senhas</b> do VHL e solte em Importar dados (pode ser vários meses de uma vez). Ela alimenta o KPI-13 e esta análise.</div>'; return; }
    var per=state.periodo||'todos';
    if (per!=='todos' && ms.indexOf(per)<0){ el.innerHTML='<div class="empty"><b>Sem senhas importadas em '+nomeMes(per)+'</b>Escolha outro mês no Período, no topo, ou importe a Consulta de senhas desse mês.</div>'; return; }
    var Ltodas=senhasLista(per), L=Ltodas.filter(senhaOk), R=senhasResumo(L), D=senhasDias(L), nd=D.length;
    if (state.pgVis.at){ el.innerHTML=visAtend(L); return; }
    var h='<div class="sec-h"><h2>Atendimento · tempo de espera</h2><span class="note">Fonte: VHL · Consulta de senhas. Espera = da emissão da senha à chamada no guichê. KPI-13 = média da espera das senhas chamadas em todas as filas'+(k13Of()?'':' — aqui só as filas de '+esc(selNome())+', por isso o número não é o KPI-13')+'.</span></div>'+
      '<div class="search"><span class="chip ok">'+(per==='todos'?'Todos os meses ('+ms.length+')':compLabel(per))+'</span>'+      '<span class="hint" style="margin:0">'+R.n.toLocaleString('pt-BR')+' senhas · '+nd+' dias com atendimento</span></div>';
    h+='<div class="kpis" style="margin:4px 0 16px">'+
      (k13Of()?kpi('KPI-13 · espera média',fmtMS(R.med),'meta ≤ 15 min · '+numBR(R.med/60)+' min','hero'):kpi('Espera média · '+esc(selNome()),fmtMS(R.med),numBR(R.med/60)+' min · só as filas desta serventia · o KPI-13 usa todas as filas','hero'))+
      kpi('Mediana',fmtMS(R.mediana),'metade espera menos que isso')+
      kpi('90% esperam até',fmtMS(R.p90),'percentil 90')+
      kpi('Acima de 10 min',pctK(R.na?R.a10/R.na*100:null),R.a10+' senhas · gatilho do PCA',R.a10?'canc':'')+
      kpi('Acima de 15 min',pctK(R.na?R.a15/R.na*100:null),R.a15+' senhas · além da meta',R.a15?'canc':'')+
      kpi('Espera máxima',fmtMS(R.mx),'pior caso do período')+
      kpi('Desistências',pctK(R.n?R.des/R.n*100:null),R.des+' senhas finalizadas sem chamada')+'</div>';
    // mês a mês
    if (ms.length>1 && per==='todos'){
      h+='<div class="sub-h">Mês a mês</div><div class="tbl-wrap"><table><thead><tr><th>Mês</th><th class="n">Senhas</th><th class="n">'+(k13Of()?'KPI-13 (média)':'Espera média')+'</th><th class="n">Mediana</th><th class="n">P90</th><th class="n">≥ 10 min</th><th class="n">Máxima</th><th class="n">Desistências</th><th class="n">Dias com gatilho</th></tr></thead><tbody>'+
        ms.map(function(m){ var Lm=state.senhas[m].L.filter(senhaOk), r=senhasResumo(Lm), dd=senhasDias(Lm); return '<tr><td>'+compLabel(m)+'</td><td class="n">'+r.n+'</td><td class="n"><b>'+numBR(r.med/60)+' min</b></td><td class="n">'+fmtMS(r.mediana)+'</td><td class="n">'+fmtMS(r.p90)+'</td><td class="n">'+pct(r.a10/r.na*100)+'</td><td class="n">'+fmtMS(r.mx)+'</td><td class="n">'+pct(r.des/r.n*100)+'</td><td class="n">'+dd.filter(function(x){return x.gat;}).length+' de '+dd.length+'</td></tr>'; }).join('')+'</tbody></table></div>';
    }
    var tAll=L.filter(function(s){return s.c!=null&&s.t!=null&&s.t<=3600;}).map(function(s){return s.t/60;}), eAll=L.filter(function(s){return s.c!=null&&s.e!=null;}).map(function(s){return s.e/60;});
    var rotM=function(x){ return x<1?Math.round(x*60)+' s':x+' min'; };
    h+='<div class="two" style="margin-top:18px"><div><div class="sub-h">Espera · como se distribui</div>'+faixasHTML(eAll,[0.5,1,2,5,10,15],'',rotM)+'</div><div><div class="sub-h">Atendimento · como se distribui</div>'+faixasHTML(tAll,[2,5,10,15,20,30],'',rotM)+'<p class="hint">Mediana '+fmtMS(R.tMed)+' · média '+fmtMS(R.tMedia)+'. Atendimentos acima de 1 h (senha não finalizada) ficam fora.</p></div></div>';
    // mapa de calor
    var met=state.atMet||'esp', horas=[], cel={}, cntDw={};
    D.forEach(function(x){ cntDw[x.dw]=(cntDw[x.dw]||0)+1; });
    L.forEach(function(s){ var hr=Math.floor(s.g/3600), k=s.dw+'_'+hr; var c=cel[k]=cel[k]||{n:0,es:[],a10:0,L:[]}; c.n++; c.L.push(s); if (s.c!=null&&s.e!=null){ c.es.push(s.e); if (s.e>=600) c.a10++; } if (horas.indexOf(hr)<0) horas.push(hr); });
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
        return '<td class="hmc b'+b+'" style="'+(b>=0?'background:color-mix(in srgb, var(--brand) '+MIX[b]+'%, var(--surface))':'')+'" data-tip="'+esc(tip)+'"'+goAttr(c?goLista(DSEM[dw]+' '+hr+'h · senhas','senhas',c.L):null)+'>'+rot(v)+'</td>'; }).join('')+'</tr>'; }).join('')+
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
    // quem atende o quê: senhas de cada atendente por serventia (sempre com todas as filas)
    var AS={}, svs=['RI','RC','RTD/PJ']; Ltodas.forEach(function(x){ if (!x.at||x.c==null) return; var sv=FILA_SV[semAc(x.fila)]||'outra', a=AS[x.at]=AS[x.at]||{n:0}; a.n++; a[sv]=(a[sv]||0)+1; });
    var ak=Object.keys(AS).sort(function(a,b){ return AS[b].n-AS[a].n; });
    if (ak.length) h+='<div class="sub-h" style="margin-top:18px">Quem atende o quê · senhas chamadas por serventia</div><p class="hint" style="margin:0 0 6px">Mostra se a pessoa atende uma fila só ou várias (todas as filas, independente do filtro). Comparar tempo de espera entre pessoas só é justo dentro da mesma fila.</p><div class="tbl-wrap"><table><thead><tr><th class="tleft">Atendente</th><th>Total</th>'+svs.map(function(s){ return '<th>'+s+'</th>'; }).join('')+'<th class="tleft">Perfil</th></tr></thead><tbody>'+
      ak.map(function(k){ var a=AS[k], top=svs.slice().sort(function(x,y){ return (a[y]||0)-(a[x]||0); })[0], pt=(a[top]||0)/a.n; return '<tr><td class="tleft">'+esc(k)+'</td><td class="num"><b>'+a.n+'</b></td>'+svs.map(function(s){ var v=a[s]||0; return '<td class="num">'+(v?'<span class="barra" style="--w:'+Math.round(v/a.n*100)+'%">'+v+' <span class="mut">'+Math.round(v/a.n*100)+'%</span></span>':'<span class="mut">·</span>')+'</td>'; }).join('')+'<td class="tleft mut">'+(pt>=0.9?'só '+top:pt>=0.6?'principalmente '+top:'várias filas')+'</td></tr>'; }).join('')+'</tbody></table></div>';
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
  var MOTIVOS_N={C:'status CANCELADO no relatório de Suspensos',P:'última etapa: Cancelamento de Protocolo',O:'última etapa: ONR - Envio do Recibo do Protocolo (cancelamento)',D:'última etapa: ONR - Nota de Devolução, sem registro',A:'parou em Re-Análise, sem Revisão Oficial',F:'última etapa: Ofício de Cancelamento',X:'Devolução do Depósito Prévio (fora as etapas de pós-registro)',T:'andamento "Cancelado por Desistência ou Impossibilidade" no Tri7 (o Tri7 decide)'};
  function fichaProtocolo(c){
    c=String(c||'').trim().replace(/[^A-Za-z0-9\-]/g,'').toUpperCase(); var box=$('protBox'); state.protSel=c;
    if (!c){ box.hidden=true; return; }
    aplicarTri7(); var a=atoDe(c), L=logDe(c, a&&a.mes), inc=incTodos().filter(function(r){ return String(r.c)===c; });
    var h='<div class="sec-h"><h2>Protocolo '+esc(c)+'</h2><span><button class="btn sm" type="button" id="protCopiar">Copiar resumo</button> <button class="btn sm" type="button" id="protFechar">Fechar</button></span></div>';
    var SF=!a?servFicha(c):''; if (!a && SF){ h=h.replace('<h2>Protocolo ','<h2>Documento '); h+=SF; var incS=incTodos().filter(function(r){ return String(r.c).toUpperCase()===c; }); if (incS.length) h+=protInc(incS); box.innerHTML=h; box.hidden=false; box.scrollIntoView({behavior:'smooth',block:'start'}); state.protTxt='Documento '+c+': '+box.innerText.slice(0,600); return; }
    if (!a){
      h+='<div class="empty"><b>Não encontrei esse protocolo nos meses importados.</b>O painel guarda os atos <i>finalizados</i> (arquivados) nos meses carregados — '+(Object.keys(state.docs).sort().map(nomeMes).join(', ')||'nenhum')+'. Protocolo ainda em andamento, pesquisa qualificada ou de outro mês não aparece.</div>';
      var AF0=andFichaHTML(c); h+=AF0.h;
      if (inc.length) h+=protInc(inc);
      box.innerHTML=h; box.hidden=false; box.scrollIntoView({behavior:'smooth',block:'start'}); state.protTxt='Protocolo '+c+': não encontrado nos meses importados.'+AF0.txt; return;
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
      exp.push(['Retornos',(a.nex?a.nex+' exigência(s) cumprida(s)':'nenhuma exigência')+(a.npg?' · '+a.npg+' espera(s) de pagamento':'')+(a.nri?' · '+a.nri+' devolução(ões) interna(s)':'')+(a.nex>=2?' <span class="pill crit">2+ exigências</span>':'')+(a.exT?'<div class="mut" style="margin-top:3px">'+exExplica(a)+'</div>':'')]);
    } else if (a.cat==='N') exp.push(['Saída',a.fin?fmtData(a.fin):'—']);
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
    box.innerHTML=h; box.hidden=false; box.scrollIntoView({behavior:'smooth',block:'start'});
    state.protTxt='Protocolo '+c+' — '+a.nat+'\n'+sit+'\nIngresso: '+(a.ing?fmtData(a.ing):'—')+(a.reg?' · Registro (última Revisão Oficial): '+fmtData(a.reg):'')+(a.bruto!=null?'\nBruto: '+a.bruto+' d.u. · Limite: '+a.lim+' d.u.'+(a.liq!=null?' · Líquido: '+a.liq+' d.u. · Espera: '+a.espera+' d.u.':''):'')+(a.cat==='R'?'\nExigências: '+a.nex+(a.npg?' · Retornos por pagamento: '+a.npg:''):'')+(linhasTxt.length?'\n\nLinha do tempo:\n'+linhasTxt.join('\n'):'')+AF.txt;
  }
  function protInc(inc){ return '<div class="sub-h" style="margin-top:14px">Inconformidades deste protocolo ('+inc.length+')</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Data</th><th>Responsável</th><th>Tipo</th><th>Erro</th><th>Observação</th></tr></thead><tbody>'+
    inc.map(function(r){ return '<tr><td>'+fmtData(r.d)+'</td><td>'+esc(r.r)+'</td><td>'+(grupoDe(r)==='E'?'Externo':'Interno')+'</td><td>'+esc(catDe(r))+'</td><td style="min-width:240px">'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table></div>'; }

  // ——— Tri7 · Relatório de andamentos: quem fez cada andamento (entrada, exigência, revisão, registro)
  // "Usuário" = quem fez o andamento. "Usuário destino" é ignorado. Nada aqui atribui culpa: é só quem registrou o andamento no Tri7.
  var AND_ORD=['PN','PA','RA','RE','NE','CI','AP','SG','RC'];
  var AND_COR={PN:'good',PA:'good',RA:'mute',RE:'warn',NE:'crit',CI:'mute',AP:'mute',SG:'good',RC:'mute'};
  var AND_LEITURA={PN:'entrada (prenotação)',PA:'entrada automática (ONR)',RE:'exigência redigida, foi para revisão',NE:'<b>exigência enviada ao cliente</b>',CI:'<b>custas informadas → espera de pagamento</b>',AP:'<b>aguardando pagamento</b>',RA:'título voltou (re-análise)',SG:'<span class="pill good">selos gerados</span> registro feito',RC:'recebido para entrega'};
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

  // ——— regra das exigências (VHL × Tri7), aplicada em todos os atos carregados
  // Exigência = Nota de Exigência (Tri7). Parada que o VHL leu como exigência e o Tri7 explica como custas (ONR) = pagamento.
  // Parada que o VHL leu como exigência sem nota nem custas no Tri7 = pagamento (1.10.0).
  function exAjuste(a, ix){
    if (a.nexV===undefined){ a.nexV=a.nex||0; a.npgV=a.npg||0; a.nriV=a.nri||0; a.catV=a.cat; a.motivoV=a.motivo; }
    a.nex=a.nexV; a.npg=a.npgV; a.nri=a.nriV; a.cat=a.catV; a.motivo=a.motivoV; a.exT=null; a.exDiv=false;
    var L=ix[a.c];
    // cancelamento: com o protocolo no Tri7, o andamento "Cancelado por Desistência ou Impossibilidade" decide
    // (Abertura de matrícula + Outros atos continua pelo VHL: a abertura é registrada e só o outro ato cai)
    if (L && a.catV!=='E' && a.catV!=='N' && L.some(function(e){ return e.s==='CD'; })){ a.cat='N'; a.motivo='T'; }
    if (!L || !L.some(function(e){ return e.s==='PN'||e.s==='PA'; })) return;
    // notas seguidas sem o título voltar (Re-análise) = mesma exigência reemitida/corrigida: conta 1 por ciclo
    var ne=0, ci=0, nNotas=0, aberta=false; L.forEach(function(e){ if (e.s==='NE'){ nNotas++; if (!aberta){ ne++; aberta=true; } } else if (e.s==='RA'||e.s==='SG'){ aberta=false; } else if (e.s==='CI'||e.s==='AP'){ ci++; aberta=false; } });
    var extra=Math.max(0,a.nexV-ne), conv=Math.min(extra,ci); extra-=conv;
    // parada que o VHL leu como exigência, sem Nota de Exigência nem Custas no Tri7 = espera de pagamento (decisão de 08/10/2026)
    a.nex=ne; a.npg=Math.max(a.npgV,ci)+extra;
    a.exT={ne:ne, nNotas:nNotas, ci:ci, vhl:a.nexV, pgV:a.npgV, extra:extra, conv:conv, rapidas:Math.max(0,ne-a.nexV)};
    a.nri=Math.max(0,a.nriV-a.exT.rapidas); // o 'retorno interno' do VHL era a exigência cumprida rápido
    a.exDiv=a.nex!==a.nexV;
  }
  function cancSoTri7(){ var ver=[state.andVer||0,Object.keys(state.docs).length,Object.keys(state.serv).length].join('|'); if (state._cst&&state._cst.k===ver) return state._cst.v;
    var conhecidos={}; Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ conhecidos[a.c]=1; }); }); Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ conhecidos[d.c]=1; }); });
    var ix=andIndice(), out={};
    Object.keys(ix).forEach(function(c){ if (conhecidos[c]) return; var L=ix[c], cd=null; L.forEach(function(e){ if (e.s==='CD') cd=e; }); if (!cd) return;
      var m=Motor.isoMin(cd.m).slice(0,7), pn=L.filter(function(e){ return e.s==='PN'||e.s==='PA'; })[0];
      (out[m]=out[m]||[]).push({c:c, cat:'N', motivo:'T', soTri7:true, nat:'(sem finalização no VHL)', ing:cd.i!=null?Motor.isoMin(cd.i).slice(0,10):pn?Motor.isoMin(pn.m).slice(0,10):'', fin:Motor.isoMin(cd.m).slice(0,10), reg:'', bruto:null, mes:m, u:cd.u}); });
    state._cst={k:ver,v:out}; return out; }
  // só entram quando o período tem dados do RI e o filtro de origem é "todas" (a origem desses não é conhecida)
  function cancSoTri7Mes(m, semFiltro){ if ((!semFiltro && (state.riOrig||'todas')!=='todas') || !state.docs[m]) return []; return cancSoTri7()[m]||[]; }
  function cancSoTri7Periodo(){ var o=[]; Object.keys(state.docs).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) o=o.concat(cancSoTri7Mes(m)); }); return o; }
  function aplicarTri7(){
    if (!Object.keys(state.andam).length) return; var ix=andIndice();
    Object.keys(state.docs).forEach(function(m){ var d=state.docs[m]; if (d._andVer===state.andVer) return; d.atos.forEach(function(a){ exAjuste(a,ix); }); d._andVer=state.andVer; });
  }
  function exExplica(a){ var t=a.exT; if (!t) return '';
    var p=[]; p.push(t.ne+' exigência(s) pelo Tri7'+(t.nNotas>t.ne?' ('+t.nNotas+' notas; '+(t.nNotas-t.ne)+' reemitida(s) sem o título voltar, contada(s) uma vez)':''));
    if (t.rapidas) p.push(t.rapidas+' cumprida(s) tão rápido que o VHL não viu parada');
    if (t.conv) p.push(t.conv+' parada(s) que o VHL leu como exigência eram custas (pagamento)');
    if (t.extra) p.push(t.extra+' parada(s) sem Nota de Exigência nem Custas no Tri7: contada(s) como pagamento');
    return p.join(' · ')+(a.exDiv?' · <span class="pill warn">VHL sozinho leria '+t.vhl+'</span>':''); }

  // ——— nomes: login do Tri7 -> nome completo do VHL
  function nomesConhecidos(){
    var tri={}, todos={};
    function add(o,n){ n=String(n||'').trim(); if (!n||/^tri7$/i.test(n)) return; var k=semAc(n); if (!o[k]) o[k]=n; }
    Object.keys(state.cert).forEach(function(m){ var r=state.cert[m].raw||{}; (r.usuarios||[]).forEach(function(n){ add(tri,n); add(todos,n); }); });
    Object.keys(state.logs).forEach(function(m){ (state.logs[m].rps||[]).forEach(function(n){ add(todos,n); }); });
    Object.keys(state.inconf).forEach(function(m){ state.inconf[m].forEach(function(r){ add(todos,r.r); }); });
    return {tri:tri, todos:todos};
  }
  function tituloLogin(l){ return String(l||'').toLowerCase().split(/[.\s]+/).filter(Boolean).map(function(p){ return p.charAt(0).toUpperCase()+p.slice(1); }).join(' '); }
  function mapaSugerido(logins, certNovos){
    var sug={}, votos={};
    if (certNovos){ var velho={}; Object.keys(state.cert).forEach(function(m){ state.cert[m].recs.forEach(function(r){ velho[r.p]=r.u; }); });
      certNovos.forEach(function(r){ var n=velho[r.p]; if (!n||/^tri7$/i.test(n)) return; var v=votos[r.u]=votos[r.u]||{}; v[n]=(v[n]||0)+1; });
      Object.keys(votos).forEach(function(l){ var v=votos[l], best=null; Object.keys(v).forEach(function(n){ if (!best||v[n]>v[best]) best=n; }); var tot=Object.keys(v).reduce(function(s,n){return s+v[n];},0); if (best && v[best]>=Math.max(3,tot*0.8)) sug[l]=best; }); }
    var K=nomesConhecidos(), usados={}; Object.keys(sug).forEach(function(l){ usados[semAc(sug[l])]=1; }); Object.keys(state.usr).forEach(function(l){ usados[semAc(state.usr[l])]=1; });
    function cand(base, tk){ return Object.keys(base).filter(function(k){ var p=k.split(/\s+/); return p[0]===tk[0] && tk.slice(1).every(function(t){ return p.indexOf(t)>=0; }); }).map(function(k){ return base[k]; }); }
    logins.slice().sort(function(a,b){ return b.split('.').length-a.split('.').length; }).forEach(function(l){
      if (sug[l]||state.usr[l]||!l) return; if (l==='TRI7'){ sug[l]='Tri7'; return; }
      var tk=semAc(l).split(/[.\s]+/).filter(Boolean), c=cand(K.tri,tk); if (c.length!==1) c=cand(K.todos,tk);
      if (c.length>1){ var livres=c.filter(function(n){ return !usados[semAc(n)]; }); if (livres.length===1) c=livres; }
      if (c.length===1){ sug[l]=c[0]; usados[semAc(c[0])]=1; } });
    return sug;
  }
  function nomeLogin(l){ if (!l) return '(sem usuário)'; return state.usr[l]||state.usrAuto[l]||tituloLogin(l); }
  function salvarUsr(){ if (dbPronto&&podeEscrever) return db.doc('config/usuarios').set({map:state.usr, em:new Date().toISOString()}).catch(function(){ toast('Não consegui salvar os nomes'); }); return Promise.resolve(); }
  function atualizarAuto(){ var ls={}; Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ ls[e.u]=1; }); }); state.usrAuto=mapaSugerido(Object.keys(ls)); }

  // resumo de quem fez o quê num protocolo
  function andResumo(evs){
    var r={ent:null, ex:{}, rv:{}, ra:{}, ci:{}, sg:null, nRE:0, nNE:0};
    evs.forEach(function(e,i){
      if ((e.s==='PN'||e.s==='PA') && !r.ent) r.ent=e;
      if (e.s==='RE' && reVirouNota(evs,i)){ r.nRE++; r.ex[e.u]=(r.ex[e.u]||0)+1; }
      if (e.s==='NE'){ r.nNE++; r.rv[e.u]=(r.rv[e.u]||0)+1; }
      if (e.s==='CI'||e.s==='AP') r.ci[e.u]=(r.ci[e.u]||0)+1;
      if (e.s==='RA') r.ra[e.u]=(r.ra[e.u]||0)+1;
      if (e.s==='SG') r.sg=e; });
    return r;
  }
  function listaPessoas(o){ return Object.keys(o).map(function(u){ return nomeLogin(u)+(o[u]>1?' ('+o[u]+')':''); }).join(', '); }
  function andResumoHTML(evs){
    var r=andResumo(evs), it=[];
    it.push(['Deu entrada (prenotou)', r.ent?'<b>'+esc(nomeLogin(r.ent.u))+'</b> · '+minFmt(r.ent.m)+(r.ent.s==='PA'?' (automática · ONR)':''):'—']);
    if (r.nRE) it.push(['Exigência redigida por', esc(listaPessoas(r.ex))]);
    if (r.nNE) it.push(['Nota de exigência emitida por', esc(listaPessoas(r.rv))+' <span class="mut">(revisão)</span>']);
    if (Object.keys(r.ci).length) it.push(['Custas informadas por', esc(listaPessoas(r.ci))]);
    if (Object.keys(r.ra).length) it.push(['Re-análise recebida por', esc(listaPessoas(r.ra))]);
    it.push(['Selos gerados (registro) por', r.sg?'<b>'+esc(nomeLogin(r.sg.u))+'</b> · '+minFmt(r.sg.m):'—']);
    return {it:it, h:'<div class="sub-h" style="margin-top:14px">Quem fez (Tri7)</div><div class="prot-grid">'+it.map(function(x){ return '<div class="pk">'+x[0]+'</div><div class="pv">'+x[1]+'</div>'; }).join('')+'</div>'+
      '<p class="hint">É quem registrou o andamento no Tri7. Serve para consulta e treinamento; não indica, sozinho, responsável por erro.</p>',
      txt:'\n\nQuem fez (Tri7):\n'+it.map(function(x){ return x[0]+': '+x[1].replace(/<[^>]+>/g,''); }).join('\n')};
  }
  // ficha sem ato no VHL: só o Tri7
  function andFichaHTML(c){
    var evs=andIndice()[c]; if (!evs||!evs.length) return {h:Object.keys(state.andam).length?'<p class="hint" style="margin-top:12px">Sem andamentos deste protocolo no Relatório de andamentos do Tri7 importado.</p>':'', txt:''};
    var R=andResumoHTML(evs);
    var h=R.h+'<div class="tbl-wrap" style="margin-top:8px"><table class="tleft"><thead><tr><th>Data e hora</th><th>Andamento</th><th>Quem fez</th></tr></thead><tbody>'+
      evs.map(function(e){ return '<tr><td>'+minFmt(e.m)+'</td><td><span class="pill '+(AND_COR[e.s]||'mute')+'">'+esc(andNome(e.s))+'</span></td><td>'+esc(nomeLogin(e.u))+'</td></tr>'; }).join('')+'</tbody></table></div>';
    return {h:h, txt:R.txt+'\n'+evs.map(function(e){ return minFmt(e.m)+' · '+andNome(e.s)+' · '+nomeLogin(e.u); }).join('\n')};
  }

  // ——— produção e tempos por pessoa no Tri7 (período do seletor)
  function andPeriodo(){ var out=[]; Object.keys(state.andam).sort().forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) out=out.concat(state.andam[m]); }); return out; }
  function tri7PorPessoa(){
    var E=andPeriodo(), P={}, ix=andIndice(), fer=Motor.feriadoSet(state.extras), h0=state.cfg.expIni, h1=state.cfg.expFim;
    function p(u){ return P[u]=P[u]||{u:u,PN:0,PA:0,RA:0,RE:0,REx:0,NE:0,CI:0,AP:0,SG:0,RC:0,tEx:[],tRv:[]}; }
    E.forEach(function(e){ if (e.t!=='P') return; var x=p(e.u), L=ix[e.n]||[], i=L.indexOf(e), j;
      if (x[e.s]!=null) x[e.s]++;
      if (e.s==='RE'){ if (reVirouNota(L,i)){ x.REx++; for (j=i-1;j>=0;j--){ if (L[j].s==='PN'||L[j].s==='PA'||L[j].s==='RA'){ x.tEx.push(Motor.horasUteis(L[j].m,e.m,fer,h0,h1)); break; } if (L[j].s==='RE'||L[j].s==='NE'||L[j].s==='CI') break; } } }
      if (e.s==='NE'){ for (j=i-1;j>=0;j--){ if (L[j].s==='RE'){ x.tRv.push(Motor.horasUteis(L[j].m,e.m,fer,h0,h1)); break; } if (L[j].s==='NE'||L[j].s==='RA'||L[j].s==='CI') break; } } });
    return P;
  }

  // ——— página "Quem fez · Tri7"
  function renderTri(){
    var el=$('tabTri'); if (!el) return;
    if (!Object.keys(state.andam).length){ el.innerHTML='<div class="empty"><b>Nenhum Relatório de andamentos importado</b>No Tri7, gere o <i>Relatório de andamentos</i> com 0011 Prenotado, 0504 Prenotado Automaticamente, 0357 Re-análise, 0334 Revisão de Exigência, 0326 Nota de Exigência, Custas Informadas (SAEC/ONR), 0019 Selos Gerados e Cancelado por Desistência ou Impossibilidade, e solte o .xls em <b>Importar dados</b>. Ele substitui a planilha Andamentos antiga (certidões saem dele também).</div>'; return; }
    aplicarTri7();
    var P=tri7PorPessoa(), ix=andIndice(), cer=certRecs();
    Object.keys(P).forEach(function(k){ P[k].CE=0; });
    var porNome={}; Object.keys(P).forEach(function(k){ porNome[semAc(nomeLogin(k))]=k; });
    cer.forEach(function(c){ var k=porNome[semAc(c.u)]; if (!k){ k='nome:'+c.u; P[k]=P[k]||{u:k,nome:c.u,PN:0,PA:0,RA:0,RE:0,REx:0,NE:0,CI:0,AP:0,SG:0,RC:0,CE:0,tEx:[],tRv:[]}; } P[k].CE=(P[k].CE||0)+1; });
    var tot={PN:0,PA:0,RA:0,REx:0,NE:0,CI:0,AP:0,SG:0}; Object.keys(P).forEach(function(k){ Object.keys(tot).forEach(function(s){ tot[s]+=P[k][s]||0; }); });
    // divergências VHL × Tri7 nas exigências dos atos do período
    var R=todosAtos().filter(function(a){ return a.cat==='R'; }), cob=R.filter(function(a){ return a.exT; }), div=cob.filter(function(a){ return a.exDiv; });
    var h='<p class="hint" style="margin:0 0 10px">O Tri7 completa o VHL: o VHL diz quem analisou, as etapas e os prazos; o Tri7 diz quem deu entrada, quando a exigência foi de fato enviada ao cliente, quando as custas foram informadas e quem gerou os selos. As exigências de todo o painel já usam os dois juntos (veja <b>Como é calculado</b>).</p><div class="kpis">'+
      kpi('Entradas (prenotações)',String(tot.PN+tot.PA),tot.PA?tot.PA+' automáticas (ONR)':'balcão e e-protocolo')+
      kpi('Exigências enviadas',String(tot.NE),'notas de exigência')+
      kpi('Custas informadas',String(tot.CI+tot.AP),'esperas de pagamento')+
      kpi('Re-análises',String(tot.RA),'título voltou')+
      kpi('Registros (selos gerados)',String(tot.SG),'protocolos de RI')+
      kpi('Exigências VHL × Tri7',cob.length?pct((cob.length-div.length)/cob.length*100):'—',cob.length?div.length+' de '+cob.length+' atos registrados com contagem corrigida pelo Tri7':'sem atos cobertos no período')+'</div>';
    var ks=Object.keys(P).map(function(k){ var x=P[k]; x.total=x.PN+x.PA+x.RA+x.REx+x.NE+x.CI+x.AP+x.SG+(x.CE||0); return x; }).filter(function(x){ return x.total && x.u!=='TRI7' && !/^tri7$/i.test(x.nome||''); }).sort(function(a,b){ return b.total-a.total; });
    function cel(v,mx){ return '<td class="num">'+(v?'<span class="barra" style="--w:'+Math.round(v/mx*100)+'%">'+v.toLocaleString('pt-BR')+'</span>':'<span class="mut">·</span>')+'</td>'; }
    var cols=[['PN','Entradas','Prenotado + Prenotado automaticamente',function(x){return x.PN+x.PA;}],['RA','Re-análise','Recebeu o título de volta',function(x){return x.RA;}],['REx','Exigência redigida','Revisão de Exigência que virou Nota de Exigência',function(x){return x.REx;}],['NE','Nota emitida','Nota de Exigência: emitida por quem revisou',function(x){return x.NE;}],['CI','Custas informadas','Custas Informadas (SAEC/ONR)',function(x){return x.CI+x.AP;}],['SG','Registro (selos)','Selos Gerados em protocolo de RI',function(x){return x.SG;}],['CE','Certidões','Certidões emitidas (selos)',function(x){return x.CE||0;}]];
    var mx={}; cols.forEach(function(c){ mx[c[0]]=Math.max(1,Math.max.apply(null,ks.map(c[3]))); });
    h+='<div class="sub-h" style="margin-top:16px">Produção por pessoa · '+(state.periodo==='todos'?'todo o período':nomeMes(state.periodo))+'</div><div class="tbl-wrap"><table><thead><tr><th class="tleft">Pessoa</th>'+cols.map(function(c){ return '<th title="'+esc(c[2])+'">'+c[1]+'</th>'; }).join('')+'</tr></thead><tbody>'+
      ks.map(function(x){ return '<tr><td class="tleft">'+esc(x.nome||nomeLogin(x.u))+'</td>'+cols.map(function(c){ return cel(c[3](x),mx[c[0]]); }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
    var fx=function(x,k){ var e=est(x[k]); return e.n>=MIN_N?'<td class="num">'+e.n+'</td><td class="num">'+fmtH(e.mediana)+'</td><td class="num">'+fmtH(e.p90)+'</td>':'<td class="num">'+(e.n||'·')+'</td><td class="num mut" colspan="2">'+(e.n?'poucos casos':'')+'</td>'; };
    var ae=ks.filter(function(x){return x.tEx.length;}), ar=ks.filter(function(x){return x.tRv.length;});
    if (ae.length||ar.length){
      var tAll=est([].concat.apply([],ae.map(function(x){return x.tEx;}))), rAll=est([].concat.apply([],ar.map(function(x){return x.tRv;})));
      h+='<div class="sub-h" style="margin-top:16px">Tempo no sistema (horas úteis, expediente '+state.cfg.expIni+'h–'+state.cfg.expFim+'h)</div><p class="hint" style="margin:0 0 6px">Da entrada (Prenotado ou Re-análise) até a exigência ser redigida, e da exigência até a nota ser emitida. É o tempo entre dois registros no Tri7 — a pessoa pode ter recebido o título depois. Mediana e P90 (90% dos casos em até) só com '+MIN_N+' casos ou mais.</p>'+
        '<div class="grid2"><div class="tbl-wrap"><table><thead><tr><th class="tleft">Redigiu a exigência</th><th>Casos</th><th>Mediana</th><th>P90</th></tr></thead><tbody>'+ae.map(function(x){ return '<tr><td class="tleft">'+esc(nomeLogin(x.u))+'</td>'+fx(x,'tEx')+'</tr>'; }).join('')+'<tr class="tot"><td class="tleft">Equipe</td><td class="num">'+tAll.n+'</td><td class="num">'+fmtH(tAll.mediana)+'</td><td class="num">'+fmtH(tAll.p90)+'</td></tr></tbody></table></div>'+
        '<div class="tbl-wrap"><table><thead><tr><th class="tleft">Revisou (emitiu a nota)</th><th>Casos</th><th>Mediana</th><th>P90</th></tr></thead><tbody>'+ar.map(function(x){ return '<tr><td class="tleft">'+esc(nomeLogin(x.u))+'</td>'+fx(x,'tRv')+'</tr>'; }).join('')+'<tr class="tot"><td class="tleft">Equipe</td><td class="num">'+rAll.n+'</td><td class="num">'+fmtH(rAll.mediana)+'</td><td class="num">'+fmtH(rAll.p90)+'</td></tr></tbody></table></div></div>';
    }
    // nomes
    var ls={}; Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ ls[e.u]=(ls[e.u]||0)+1; }); });
    var K=nomesConhecidos().todos, dl='<datalist id="dlNomes">'+Object.keys(K).sort().map(function(k){ return '<option value="'+esc(K[k])+'">'; }).join('')+'</datalist>';
    h+='<details class="panel" style="margin-top:16px;padding:10px 12px"><summary><b>Nomes dos usuários do Tri7</b> <span class="hint">(login → nome completo usado no painel)</span></summary><p class="hint">Sugerido automaticamente pelos pedidos de certidão já salvos e pelo primeiro nome. Corrija se precisar: o nome precisa ser igual ao do VHL para casar com os relatórios por pessoa e com o fluxo de intimação.</p>'+dl+
      '<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Login no Tri7</th><th>Andamentos</th><th>Nome no painel</th></tr></thead><tbody>'+
      Object.keys(ls).filter(Boolean).sort().map(function(l){ return '<tr><td>'+esc(l)+'</td><td class="num">'+ls[l]+'</td><td><input type="text" list="dlNomes" data-usr="'+esc(l)+'" value="'+esc(nomeLogin(l))+'" '+(podeEscrever?'':'disabled ')+'style="min-width:240px" aria-label="Nome de '+esc(l)+'">'+(state.usr[l]?' <span class="pill good">ajustado</span>':state.usrAuto[l]?' <span class="pill mute">sugerido</span>':' <span class="pill warn">sem par</span>')+'</td></tr>'; }).join('')+'</tbody></table></div></details>';
    el.innerHTML=h;
  }

  // ——— Outras atribuições (RC, RTD, RPJ, Intimações, Malote Digital, Arquivo…): Prazo e Tempo Médio + Produção por Etapa do VHL
  // Prazo legal de cada natureza é configurável (config/prazos). Sem prazo definido, o painel mostra só os tempos.
  // prazos legais pré-preenchidos (só os com base expressa; o resto você define na tela). Valor em dias úteis.
  var PRAZOS_PADRAO={'RC|CRC - Certidão Outros Cartórios':5,'RC|CRC - Certidão CRCO':5,'RC|Casamento Religioso C. E. Civil':1,'Certidão - RTD|Inteiro teor / Breve Relato (RTD)':5};
  var PRAZOS_BASE={'RC|CRC - Certidão Outros Cartórios':'5 dias úteis após o pagamento · Prov. CNJ 149/2023, arts. 239 e 240','RC|CRC - Certidão CRCO':'Até 5 dias · Lei 6.015/73, art. 19','RC|Casamento Religioso C. E. Civil':'Registro em 24 horas da entrada do requerimento · Lei 6.015/73, art. 73 §2º','Certidão - RTD|Inteiro teor / Breve Relato (RTD)':'5 dias úteis · Lei 6.015/73, art. 19 c/c art. 9º §1º',
    'RC|Casamento Civil':'Certificado de habilitação em até 5 dias após a documentação em ordem (Lei 6.015, art. 67 §1º); o tempo total inclui proclamas e a data marcada pelos noivos — sem prazo único','RC|Averbações/Anotações - Casamento':'Anotação/comunicação em 5 dias (Lei 6.015, art. 106); averbação sem prazo próprio','RC|Averbações/Anotações - Nascimento':'Anotação/comunicação em 5 dias (Lei 6.015, art. 106); averbação sem prazo próprio','RC|Averbações/Anotações - Óbito':'Anotação/comunicação em 5 dias (Lei 6.015, art. 106); averbação sem prazo próprio','RC|Nascimento':'Sem prazo federal específico: o assento é lavrado na declaração; envio à CRC em 1 dia útil (Prov. 149, art. 234)','RC|Obito':'Sem prazo federal específico; envio à CRC em 1 dia útil (Prov. 149, art. 234)'};
  var SERV_ORD=['RC','RTD','RPJ','Certidão - RTD','Intimações','Malote Digital','Arquivo','Fichas'];
  function servDocs(tipo){ var out=[]; Object.keys(state.serv).sort().forEach(function(m){ if (state.periodo!=='todos'&&state.periodo!==m) return; state.serv[m].forEach(function(d){ if (!tipo||tipo==='__todas'||d.t===tipo) out.push(d); }); }); return out; }
  function servTipos(){ var c={}; Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ c[d.t]=(c[d.t]||0)+1; }); });
    return Object.keys(c).sort(function(a,b){ var ia=SERV_ORD.indexOf(a), ib=SERV_ORD.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib) || c[b]-c[a]; }); }
  function servDu(d){ if (d._du!=null && d._duV===state.extras.length) return d._du; var du=Motor.criarCalendario(state.extras||[]); d._du=du(d.ing,d.fin); d._duV=state.extras.length; return d._du; }
  function servPrazo(d){ var v=state.prazosServ[d.t+'|'+d.nat]; return v==null||v===''?null:+v; }
  function servOk(d){ var p=servPrazo(d); return p==null?null:servDu(d)<=p; }
  function salvarPrazosServ(){ if (dbPronto&&podeEscrever) db.doc('config/prazos').set({map:state.prazosServ, em:new Date().toISOString()}).catch(function(){ toast('Não consegui salvar os prazos'); }); }
  // monta as outras atribuições a partir dos dados brutos guardados (Prazo + Produção por Etapa)

  function servLista(docs){ return docs.slice().sort(function(a,b){ return servDu(b)-servDu(a); }).slice(0,200).map(function(d){ var ok=servOk(d);
    return '<tr><td>'+protLink(d.c)+'</td><td class="tl">'+esc(d.nat)+'</td><td>'+fmtData(Motor.isoDeDia(d.ing))+'</td><td>'+fmtData(Motor.isoDeDia(d.fin))+'</td><td class="num"><b>'+servDu(d)+'</b></td><td class="num">'+(servPrazo(d)==null?'—':servPrazo(d))+'</td><td>'+(ok==null?'':ok?'<span class="pill good">no prazo</span>':'<span class="pill crit">acima</span>')+'</td><td class="num">'+(d.tempo!=null?fmtMS(d.tempo):'—')+'</td></tr>'; }).join(''); }
  // ——— filtro "Serventia": o site inteiro como se o cartório fosse só RI, só RC, só RTD/PJ… ou tudo junto
  var SV_LISTA=['__todas','RI','RC','RTD/PJ']; // Malote e Arquivo não são produção de serventia (Malote vira só contagem no comparativo)
  var SV_NOME={'RI-bal':'↳ RI · balcão','RI-cen':'↳ RI · central (ONR)','RI-intim':'↳ RI · Intimações','__todas':'Todas as serventias','RI':'RI · Registro de Imóveis','RC':'RC · Registro Civil','RTD/PJ':'RTD/PJ · Títulos e Documentos e Pessoas Jurídicas','Apoio':'Apoio · Malote e Arquivo'};
  var SV_SUB={'RI':[['reg','Registro (protocolos)'],['intim','Intimações'],['cert','Certidões']], 'RC':[['tudo','Tudo'],['atos','Registros e averbações'],['cert','Certidões']], 'RTD/PJ':[['tudo','Tudo'],['atos','Registros'],['cert','Certidões']], 'Apoio':[['tudo','Tudo'],['Malote Digital','Malote Digital'],['Arquivo','Arquivo']]};
  var SV_COR={'RI-bal':'#ff922b','RI-cen':'#d9480f','RI':'var(--brand)','RI-intim':'#f59f00','RC':'#1c7ed6','RTD/PJ':'#2f9e44','Apoio':'#9c36b5'};
  var SO_RI=['ex','nao','cer','tri'], SO_SERV=['nat','eta','fp'];
  var FILA_SV={'registro de imoveis':'RI','nascimento':'RC','casamento civil':'RC','obito':'RC','registro de titulos e documentos, pj':'RTD/PJ'};
  // tipo de documento do VHL (+ natureza) -> serventia e classe (atos, certidões, intimações)
  function svDe(t){ var n=semAc(t); if (n==='ri'||n==='certidao - ri'||n==='intimacoes') return 'RI'; if (n==='rc') return 'RC'; if (n==='rtd'||n==='rpj'||n==='certidao - rtd') return 'RTD/PJ'; if (n==='malote digital'||n==='arquivo'||n==='fichas') return 'Apoio'; return null; }
  function clsDe(t, nat){ var n=semAc(t); if (n==='intimacoes') return 'intim'; if (svDe(t)==='Apoio') return 'atos'; if (n.indexOf('certidao')===0 || /certid/.test(semAc(nat))) return 'cert'; return 'atos'; }
  function svAtual(){ if (SV_LISTA.indexOf(state.sv)<0) state.sv='RI'; return state.sv; }
  function subAtual(){ var s=svAtual(); state.svSub=state.svSub||{}; var op=SV_SUB[s]; if (!op) return null; if (!state.svSub[s] || !op.some(function(o){ return o[0]===state.svSub[s]; })) state.svSub[s]=op[0][0]; return state.svSub[s]; }
  function svModo(){ var s=svAtual(), b=subAtual(); if (s==='__todas') return 'todas'; if (s==='RI') return b==='reg'?'ri':b==='cert'?'cert':'serv'; return 'serv'; }
  function atrAtual(){ var m=svModo(); return (m==='ri'||m==='cert')?'RI':'X'; } // 'RI' = telas do RI; 'X' = telas por documento (RC, RTD/PJ, Apoio, intimações, todas)
  function docOk(d){ var s=svAtual(), b=subAtual(); if (svDe(d.t)!==s) return false; if (s==='RI') return b==='intim'&&d.t==='Intimações';
    if (s==='Apoio') return b==='tudo'||d.t===b; if (b==='tudo') return true; return clsDe(d.t,d.nat)===b; }
  function selDocs(){ return servDocs('__todas').filter(docOk); }
  function selDocsMes(m){ return (state.serv[m]||[]).filter(docOk); }
  function incOk(r){ var s=svAtual(); if (s==='__todas') return true; if (svDe(r.t)!==s) return false; var b=subAtual();
    if (s==='RI') return b==='reg'?r.t==='RI':b==='intim'?r.t==='Intimações':semAc(r.t)==='certidao - ri';
    if (s==='Apoio') return b==='tudo'||r.t===b; if (b==='tudo') return true; return clsDe(r.t,r.n)===b; }
  function k13Of(){ var s=svAtual(); return s==='__todas'||s==='Apoio'; }
  function senhaOk(x){ var s=svAtual(); if (s==='__todas'||s==='Apoio') return true; return FILA_SV[semAc(x.fila)]===s; }
  function selNome(){ var s=svAtual(), b=subAtual(), op=(SV_SUB[s]||[]).filter(function(o){ return o[0]===b; })[0]; return (s==='__todas'?'Todas as serventias':s)+(op&&b!=='tudo'&&!(s==='RI'&&b==='reg')?' · '+op[1]:''); }
  function renderAtrSelect(){
    var sel=$('selAtr'); if (!sel) return;
    var CURTO={'__todas':'Todas','RI':'RI','RC':'RC','RTD/PJ':'RTD/PJ'};
    var html=SV_LISTA.map(function(t){ return '<option value="'+esc(t)+'">'+esc(CURTO[t])+'</option>'; }).join('');
    if (sel.innerHTML!==html) sel.innerHTML=html; sel.value=svAtual(); sel.parentNode.hidden=false;
    var org=$('selOrig'); if (org){ org.hidden=svModo()!=='ri'; org.value=state.riOrig||'todas'; }
    var sub=$('selSub'), op=SV_SUB[svAtual()];
    if (sub){ sub.hidden=!op; if (op){ var hs=op.map(function(o){ return '<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>'; }).join(''); if (sub.innerHTML!==hs) sub.innerHTML=hs; sub.value=subAtual(); } }
    var modo=svModo();
    document.querySelectorAll('.tab').forEach(function(b){ var k=b.dataset.tab;
      if (SO_RI.indexOf(k)>=0) b.hidden=!(modo==='ri'||(modo==='cert'&&k==='cer'));
      else if (SO_SERV.indexOf(k)>=0) b.hidden=modo==='todas'||modo==='cert'; });
    var grp=null, alg=false; Array.prototype.forEach.call($('menu').children,function(el){ if (el.classList.contains('menu-grp')){ if (grp) grp.hidden=!alg; grp=el; alg=false; } else if (el.classList.contains('tab') && !el.hidden) alg=true; }); if (grp) grp.hidden=!alg;
    var sm=$('brandSub'); if (sm) sm.textContent=modo==='ri'?'CRCO · RI · KPI-02 · Art. 205 e Art. 9º §1º da Lei 6.015/73':'CRCO · '+selNome();
    var mk=document.querySelector('.brand .mark'); if (mk) mk.textContent=modo==='todas'?'SGQ':svAtual()==='RTD/PJ'?'TD':svAtual()==='Apoio'?'AP':svAtual();
  }
  function servPorMesSel(){ var o={}; Object.keys(state.serv).sort().forEach(function(m){ o[m]=selDocsMes(m); }); return o; }
  function servTiles(D){
    var e=est(D.map(servDu)), tAt=est(D.map(function(d){ return d.tempo; }).filter(function(x){ return x>0; }));
    var comP=D.filter(function(d){ return servPrazo(d)!=null; }), okN=comP.filter(servOk).length;
    var incC={}; incTodos().filter(incOk).forEach(function(r){ incC[String(r.c).toUpperCase()]=1; }); var comInc=D.filter(function(d){ return incC[String(d.c).toUpperCase()]; }).length;
    return kpi('No prazo',comP.length?pct(okN/comP.length*100):'—',comP.length?okN+' de '+comP.length+' com prazo definido'+(comP.length<D.length?' · '+(D.length-comP.length)+' sem prazo':''):'defina o prazo legal em <b>Por natureza</b>','hero')+
      kpi('Finalizados',String(D.length),state.periodo==='todos'?'no período importado':nomeMes(state.periodo))+
      kpi('Mediana até finalizar',e.n?f1(e.mediana)+' <small style="font-size:.9rem">d.u.</small>':'—',e.n?'média '+f1(e.media)+(e.moda!=null?' · mais comum '+e.moda:'')+' · 90% em até '+f1(e.p90):'')+
      kpi('Tempo de atuação',tAt.n?fmtMS(tAt.mediana):'—',tAt.n?'mediana por documento (cronômetro do VHL)':'sem cronômetro registrado')+
      kpi('Com inconformidade',D.length?pct(comInc/D.length*100):'—',comInc+' de '+D.length+' documentos finalizados',comInc?'canc':'');
  }
  function servGraficosHTML(){
    var PM=servPorMesSel(), ms=Object.keys(PM).filter(function(m){ return PM[m].length; }).sort().slice(-12); if (!ms.length) return '<div class="empty">Sem documentos nesta seleção.</div>';
    var incM={}; incTodos().filter(incOk).forEach(function(r){ var m=String(r.d||'').slice(0,7); incM[m]=(incM[m]||0)+1; });
    var cards=[
      {t:'Finalizados', un:'', v:ms.map(function(m){ return PM[m].length; }), zero:true},
      {t:'Mediana até finalizar', un:'d.u.', v:ms.map(function(m){ var x=est(PM[m].map(servDu)); return x.n?x.mediana:null; }), zero:true, menor:true},
      {t:'90% finalizados em até', un:'d.u.', v:ms.map(function(m){ var x=est(PM[m].map(servDu)); return x.n?x.p90:null; }), zero:true, menor:true},
      {t:'No prazo', un:'%', ir:'fp', v:ms.map(function(m){ var c=PM[m].filter(function(d){ return servPrazo(d)!=null; }); return c.length?c.filter(servOk).length/c.length*100:null; })},
      {t:'Tempo de atuação (mediana)', un:'min', v:ms.map(function(m){ var x=est(PM[m].map(function(d){ return d.tempo; }).filter(function(v){ return v>0; })); return x.n?x.mediana/60:null; }), zero:true},
      {t:'Inconformidades registradas', un:'', ir:'k1', v:ms.map(function(m){ return incM[m]||0; }), zero:true, menor:true}
    ];
    return cards.filter(function(c){ return c.v.some(function(v){ return v!=null; }); }).map(function(c){
      var idx=-1; c.v.forEach(function(v,i){ if (v!=null) idx=i; });
      return '<div class="gm-card"><div class="gm-h"><span class="gm-t">'+esc(c.t)+'</span><span class="gm-v">'+fmtG(c.v[idx],c.un)+'</span></div><div class="gm-s">'+compLabel(ms[idx]).slice(4)+'</div>'+graficoLinha(ms,c.v,{titulo:c.t,un:c.un,zero:c.zero,menor:c.menor,ir:c.ir||'nat'})+'</div>'; }).join('');
  }
  function servNatHTML(D){
    var N={}; D.forEach(function(d){ var k=d.t+'|'+d.nat, x=N[k]=N[k]||{t:d.t,nat:d.nat,docs:[]}; x.docs.push(d); });
    var nk=Object.keys(N).sort(function(a,b){ return N[b].docs.length-N[a].docs.length; }), varios=Object.keys(N).map(function(k){ return N[k].t; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).length>1;
    if (!nk.length) return '<div class="empty">Sem documentos nesta seleção no período.</div>';
    var h='<p class="hint" style="margin:0 0 6px">Dias úteis do ingresso à finalização (sábado, domingo e feriado fora; o dia do ingresso não conta). O <b>prazo legal em dias úteis</b> de cada natureza (0 = no mesmo dia) define o % no prazo; os já preenchidos vêm da pesquisa da Lei 6.015/73 e do Prov. CNJ 149/2023 (passe o mouse no prazo para ver a base). Clique na natureza para ver os documentos.</p>'+
      '<div class="tbl-wrap"><table><thead><tr><th class="tleft">Natureza</th>'+(varios?'<th class="tleft">Tipo</th>':'')+'<th>Qtd.</th><th>Mediana</th><th>P90</th><th>Máx.</th><th>Atuação</th><th>Prazo (d.u.)</th><th>No prazo</th></tr></thead><tbody>'+
      nk.map(function(k){ var x=N[k], s=est(x.docs.map(servDu)), a=est(x.docs.map(function(d){return d.tempo;}).filter(function(v){return v>0;})), pz=state.prazosServ[k], cp=x.docs.filter(function(d){ return servPrazo(d)!=null; }), ok=cp.filter(servOk).length, base=PRAZOS_BASE[k];
        return '<tr class="click'+(state.srvNat===k?' sel':'')+'" data-srvnat="'+esc(k)+'"><td class="tleft">'+esc(x.nat)+'</td>'+(varios?'<td class="tleft mut">'+esc(x.t)+'</td>':'')+'<td class="num">'+x.docs.length+'</td><td class="num" data-tip="'+esc(estTip(s,' d.u.'))+'">'+f1(s.mediana)+'</td><td class="num">'+f1(s.p90)+'</td><td class="num">'+s.max+'</td><td class="num">'+(a.n?fmtMS(a.mediana):'—')+'</td>'+
          '<td'+(base?' data-tip="'+esc(base)+'"':'')+'><input type="text" inputmode="numeric" class="mini" style="width:4.5em" data-srvprazo="'+esc(k)+'" value="'+esc(pz==null?'':pz)+'" '+(podeEscrever?'':'disabled ')+'aria-label="Prazo legal de '+esc(x.nat)+'"></td><td>'+(cp.length?'<span class="pill '+(ok===cp.length?'good':ok/cp.length>=.9?'warn':'crit')+'">'+pct(ok/cp.length*100)+'</span>':'<span class="mut">—</span>')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    if (state.srvNat && N[state.srvNat]) h+='<div class="sub-h" style="margin-top:12px">'+esc(N[state.srvNat].nat)+' · documentos (mais demorados primeiro)</div><div class="tbl-wrap" style="max-height:420px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Finalização</th><th>d.u.</th><th>Prazo</th><th></th><th>Atuação</th></tr></thead><tbody>'+servLista(N[state.srvNat].docs)+'</tbody></table></div>';
    return h;
  }
  function servEtapaHTML(D){
    var ET={}, PE={}; D.forEach(function(d){ d.ets.forEach(function(x){ var a=ET[x.et]=ET[x.et]||{n:0,pz:[]}; a.n++; a.pz.push(x.pz); var b=PE[x.rp]=PE[x.rp]||{n:0,docs:{},et:{}}; b.n++; b.docs[d.c]=1; b.et[x.et]=(b.et[x.et]||0)+1; }); });
    var ek=Object.keys(ET).sort(function(a,b){ return ET[b].n-ET[a].n; }), pk=Object.keys(PE).filter(Boolean).sort(function(a,b){ return PE[b].n-PE[a].n; });
    if (!ek.length) return '<div class="empty">Sem etapas do VHL para esses documentos no período.</div>';
    return '<div class="grid2"><div><div class="sub-h">Por etapa</div><div class="tbl-wrap"><table><thead><tr><th class="tleft">Etapa</th><th>Execuções</th><th>Mediana na etapa</th><th>P90</th></tr></thead><tbody>'+
      ek.map(function(k){ var s=est(ET[k].pz); return '<tr><td class="tleft">'+esc(k)+'</td><td class="num">'+ET[k].n+'</td><td class="num" data-tip="'+esc(estTip(s,' d.u.'))+'">'+f1(s.mediana)+' d.u.</td><td class="num">'+f1(s.p90)+'</td></tr>'; }).join('')+'</tbody></table></div></div>'+
      '<div><div class="sub-h">Por pessoa</div><div class="tbl-wrap"><table><thead><tr><th class="tleft">Pessoa</th><th>Documentos</th><th>Execuções</th><th class="tleft">Etapa mais feita</th></tr></thead><tbody>'+
      pk.map(function(k){ var b=PE[k], top=Object.keys(b.et).sort(function(x,y){ return b.et[y]-b.et[x]; })[0]; return '<tr><td class="tleft">'+esc(k)+'</td><td class="num">'+Object.keys(b.docs).length+'</td><td class="num">'+b.n+'</td><td class="tleft mut">'+esc(top||'')+'</td></tr>'; }).join('')+'</tbody></table></div></div></div>';
  }
  function servFpHTML(D){
    var comP=D.filter(function(d){ return servPrazo(d)!=null; }), fora=comP.filter(function(d){ return !servOk(d); });
    if (!comP.length) return '<div class="empty"><b>Nenhum prazo legal definido para '+esc(selNome())+'</b>Preencha a coluna Prazo (d.u.) na página <b>Por natureza</b>.</div>';
    return '<div class="kpis" style="margin-bottom:12px">'+kpi('Fora do prazo',String(fora.length),'de '+comP.length+' com prazo definido',fora.length?'canc':'')+kpi('No prazo',pct((comP.length-fora.length)/comP.length*100),'')+'</div>'+
      (fora.length?'<div class="tbl-wrap" style="max-height:520px"><table class="tleft"><thead><tr><th>Código</th><th>Natureza</th><th>Ingresso</th><th>Finalização</th><th>d.u.</th><th>Prazo</th><th></th><th>Atuação</th></tr></thead><tbody>'+servLista(fora)+'</tbody></table></div>':'<div class="empty">Todos dentro do prazo no período.</div>');
  }

  // ——— Comparativo (Todas as serventias)
  function mesNoPeriodo(m){ return state.periodo==='todos'||state.periodo===m; }
  function compDados(){
    var linhas={}; function L(s){ return linhas[s]=linhas[s]||{sv:s, fin:0, du:[], comP:0, ok:0, inc:0, docsInc:0, senhas:0, esp:[], cert:0, certOk:0, certCalc:0, certBal:0}; }
    // RI: protocolos registrados/finalizados + intimações (serv)
    Object.keys(state.docs).forEach(function(m){ if (!mesNoPeriodo(m)) return; state.docs[m].atos.forEach(function(a){ if (a.cat!=='R'&&a.cat!=='N') return; [L('RI'),L(origemAto(a)==='central'?'RI-cen':'RI-bal')].forEach(function(x){ x.fin++; if (a.cat==='R'){ if (a.bruto!=null) x.du.push(a.bruto); x.comP++; if (ok(a)) x.ok++; } }); }); });
    var oCod={}; Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ oCod[String(a.c).toUpperCase()]=origemAto(a)==='central'?'RI-cen':'RI-bal'; }); });
    var incC={}; incTodos().forEach(function(r){ var s=svDe(r.t); if (!s) return; var cu=String(r.c).toUpperCase(); incC[s+'|'+cu]=1; if (mesNoPeriodo(String(r.d).slice(0,7))){ L(semAc(r.t)==='intimacoes'?'RI-intim':s).inc++; if (r.t==='RI'&&oCod[cu]) L(oCod[cu]).inc++; } });
    Object.keys(state.docs).forEach(function(m){ if (!mesNoPeriodo(m)) return; state.docs[m].atos.forEach(function(a){ if (a.cat==='R'&&incC['RI|'+String(a.c).toUpperCase()]){ L('RI').docsInc++; L(origemAto(a)==='central'?'RI-cen':'RI-bal').docsInc++; } }); });
    Object.keys(state.serv).forEach(function(m){ if (!mesNoPeriodo(m)) return; state.serv[m].forEach(function(d){ var s=svDe(d.t); if (!s) return; var x=L(s), c=clsDe(d.t,d.nat);
      if (c==='cert'){ x.cert++; var p=servPrazo(d); if (p!=null){ x.certCalc++; if (servOk(d)) x.certOk++; } return; }
      if (c==='intim'){ x=L('RI-intim'); }
      x.fin++; x.du.push(servDu(d)); var p2=servPrazo(d); if (p2!=null){ x.comP++; if (servOk(d)) x.ok++; } if (incC[s+'|'+String(d.c).toUpperCase()]) x.docsInc++; }); });
    var cr=certCalc(certRecs()); cr.forEach(function(c){ var x=L('RI'); x.cert++; if (c.origem==='Balcão') x.certBal++; if (!c.intim){ x.certCalc++; if (c.ok) x.certOk++; } });
    senhasLista(state.periodo).forEach(function(s){ var sv=FILA_SV[semAc(s.fila)]; if (!sv) return; var x=L(sv); x.senhas++; if (s.c!=null&&s.e!=null) x.esp.push(s.e); });
    return ['RI','RI-bal','RI-cen','RI-intim','RC','RTD/PJ'].filter(function(s){ return linhas[s]; }).map(function(s){ return linhas[s]; });
  }
  function graficoBarras(ms, series, o){ // barras empilhadas por mês · o.goMes(m,i) clique na coluna · o.goSeg(m,i,serie) clique no segmento
    var W=640, H=220, pl=36, pr=10, pt=20, pb=26, n=ms.length; if (!n) return '';
    var tot=ms.map(function(m,i){ return series.reduce(function(s,x){ return s+(x.v[i]||0); },0); }), mx=Math.max(1,Math.max.apply(null,tot)), bw=(W-pl-pr)/n*0.68;
    var y=function(v){ return pt+(H-pt-pb)*(1-v/mx); }, s='<svg viewBox="0 0 '+W+' '+H+'" class="gm-svg" role="img" aria-label="'+esc(o.titulo)+'">';
    [0,mx/2,mx].forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(y(t)+3.5)+'" text-anchor="end" font-size="10" style="fill:var(--ink-3)">'+Math.round(t)+(o.pct?'%':'')+'</text>'; });
    ms.forEach(function(m,i){ var x=pl+(W-pl-pr)*(i+0.5)/n-bw/2, acc=0, tip='<b>'+compLabel(m)+'</b>', acM=o.goMes?o.goMes(m,i):null;
      series.forEach(function(se){ var v=se.v[i]||0; if (v) tip+='<br>'+esc(se.nome)+': '+v+' ('+numBR(tot[i]?v/tot[i]*100:0,1)+'%)'; });
      tip+='<br>Total: '+tot[i];
      s+=hitRect(x-bw*0.2,pt,bw*1.4,H-pt-pb,tip,acM); // coluna inteira (atrás dos segmentos)
      series.forEach(function(se){ var v=se.v[i]||0; if (!v) return; var pc=tot[i]?v/tot[i]*100:0, hgt=y(acc)-y(acc+v);
        s+='<rect class="seg-b" x="'+x.toFixed(1)+'" y="'+y(acc+v).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,hgt-1).toFixed(1)+'" style="fill:'+se.cor+'" data-tip="'+esc('<b>'+compLabel(m)+' · '+esc(se.nome)+'</b><br>'+v+' de '+tot[i]+' ('+numBR(pc,1)+'%)')+'"'+goAttr(o.goSeg?o.goSeg(m,i,se):acM)+'/>';
        if (hgt>=13 && bw>=26) s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y(acc+v)+hgt/2+3.5).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" style="fill:#fff" pointer-events="none">'+Math.round(pc)+'%</text>';
        acc+=v; });
      s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y(tot[i])-4).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" style="fill:var(--ink-2)" pointer-events="none">'+tot[i]+'</text>';
      s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-3)" pointer-events="none">'+MES_AB[+m.slice(5)-1]+'</text>'; });
    return s+'</svg><div class="leg">'+series.map(function(se){ return '<span><i style="background:'+se.cor+'"></i>'+esc(se.nome)+'</span>'; }).join('')+'</div>';
  }
  function renderComparativo(){
    var C=compDados(), h='';
    $('secTendencia').hidden=true;
    $('kpis').innerHTML=C.length?C.filter(function(x){ return x.sv!=='RI-bal'&&x.sv!=='RI-cen'; }).map(function(x){ var e=est(x.du); return kpi(esc(x.sv==='RI-intim'?'RI · Intimações':x.sv==='RI'?'RI · Protocolos':x.sv),String(x.fin),'finalizados · mediana '+(e.n?f1(e.mediana)+' d.u.':'—')+(x.comP?' · '+pct(x.ok/x.comP*100)+' no prazo'+(x.comP<x.fin?' (de '+x.comP+' com prazo)':''):'')); }).join(''):'<div class="panel empty" style="grid-column:1/-1"><b>Sem dados ainda</b>Abra <b>Importar dados</b> no menu.</div>';
    // barras mês a mês por serventia
    var ms={}; Object.keys(state.docs).concat(Object.keys(state.serv)).forEach(function(m){ ms[m]=1; }); ms=Object.keys(ms).sort().slice(-12);
    var ser=['RI','RI-intim','RC','RTD/PJ'].map(function(s){ return {nome:s==='RI-intim'?'RI · Intimações':s==='RI'?'RI · Protocolos':s, cor:SV_COR[s], v:ms.map(function(m){ var n=0; if (s==='RI'&&state.docs[m]) n+=state.docs[m].atos.filter(function(a){ return a.cat==='R'||a.cat==='N'; }).length; (state.serv[m]||[]).forEach(function(d){ var c=clsDe(d.t,d.nat); if (c==='cert') return; if (s==='RI-intim'?c==='intim':(svDe(d.t)===s&&c!=='intim')) n++; }); return n; })}; }).filter(function(x){ return x.v.some(Boolean); });
    var cer=['RI','RC','RTD/PJ'].map(function(s){ return {nome:s, cor:SV_COR[s], v:ms.map(function(m){ var n=0; if (s==='RI'&&state.cert[m]) n+=state.cert[m].recs.length; (state.serv[m]||[]).forEach(function(d){ if (svDe(d.t)===s && clsDe(d.t,d.nat)==='cert') n++; }); return n; })}; }).filter(function(x){ return x.v.some(Boolean); });
    function tabPct(series){ var T=series.map(function(x){ return x.v.reduce(function(a,b){ return a+(b||0); },0); }), tt=T.reduce(function(a,b){ return a+b; },0);
      return '<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th class="tleft">Mês</th>'+series.map(function(x){ return '<th><span class="dot" style="background:'+x.cor+'"></span>'+esc(x.nome)+'</th>'; }).join('')+'<th>Total</th></tr></thead><tbody>'+
        ms.map(function(m,i){ var t=series.reduce(function(a,x){ return a+(x.v[i]||0); },0); return '<tr><td class="tleft">'+nomeMes(m)+'</td>'+series.map(function(x){ var v=x.v[i]||0; return '<td class="num" data-tip="'+esc(x.nome+': '+v+' de '+t)+'">'+(t?pct(v/t*100):'—')+' <span class="mut">'+v+'</span></td>'; }).join('')+'<td class="num"><b>'+t+'</b></td></tr>'; }).join('')+
        '<tr class="tot"><td class="tleft">Período</td>'+T.map(function(v){ return '<td class="num">'+(tt?pct(v/tt*100):'—')+' <span class="mut">'+v+'</span></td>'; }).join('')+'<td class="num">'+tt+'</td></tr></tbody></table></div>'; }
    h+='<div class="gm-card" style="grid-column:1/-1"><div class="gm-h"><span class="gm-t">Produção por serventia · documentos finalizados por mês (sem certidões) · % = participação no mês</span></div>'+graficoBarras(ms,ser,{titulo:'Produção por serventia',goMes:function(m){ return goMes(m,'geral'); },goSeg:function(m,i,se){ return {t:'sv',sv:/^RI/.test(se.nome)?'RI':se.nome,sub:se.nome==='RI · Intimações'?'intim':se.nome==='RI · Protocolos'?'reg':undefined,m:m}; }})+tabPct(ser)+'</div>';
    if (cer.length) h+='<div class="gm-card" style="grid-column:1/-1"><div class="gm-h"><span class="gm-t">Certidões emitidas por mês · % = participação no mês</span></div>'+graficoBarras(ms,cer,{titulo:'Certidões por serventia',goMes:function(m){ return goMes(m,'geral'); },goSeg:function(m,i,se){ return {t:'sv',sv:se.nome,sub:'cert',m:m}; }})+tabPct(cer)+'</div>';
    // Malote: só controle de quantos foram cadastrados no mês (não é produção de serventia)
    var mal={}; Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ if (d.t!=='Malote Digital') return; var mi=Motor.isoDeDia(d.ing).slice(0,7); mal[mi]=(mal[mi]||0)+1; }); });
    var malV=ms.map(function(m){ return mal[m]||0; });
    if (malV.some(Boolean)) h+='<div class="gm-card"><div class="gm-h"><span class="gm-t">Malotes cadastrados no mês</span><span class="gm-v">'+malV[malV.length-1]+'</span></div><div class="gm-s">controle · não entra na produção das serventias</div>'+graficoLinha(ms,malV,{titulo:'Malotes cadastrados',un:'',zero:true})+'</div>';
    h+='<div class="gm-card" style="grid-column:1/-1"><div class="gm-h"><span class="gm-t">Comparativo · '+(state.periodo==='todos'?'todo o período':nomeMes(state.periodo))+'</span></div><div class="tbl-wrap"><table><thead><tr><th class="tleft">Serventia</th><th>Finalizados</th><th>Média</th><th>Mediana</th><th>Moda</th><th>P90</th><th>No prazo</th><th>Inconformidades</th><th>Docs c/ inconformidade</th><th>Certidões</th><th>Certidões no prazo</th><th>Senhas</th><th>Espera média</th></tr></thead><tbody>'+
      C.map(function(x){ var e=est(x.du), es=est(x.esp); return '<tr'+(/^RI-/.test(x.sv)?' class="mut"':'')+'><td class="tleft"><span class="dot" style="background:'+SV_COR[x.sv]+'"></span>'+esc(SV_NOME[x.sv])+'</td><td class="num">'+x.fin+'</td><td class="num">'+(e.n?f1(e.media):'—')+'</td><td class="num"><b>'+(e.n?f1(e.mediana):'—')+'</b></td><td class="num">'+(e.moda!=null?e.moda+' <span class="mut">('+Math.round(e.modaPct)+'%)</span>':'—')+'</td><td class="num">'+(e.n?f1(e.p90):'—')+'</td><td class="num">'+(x.comP?pct(x.ok/x.comP*100)+(x.comP<x.fin?' <span class="mut">de '+x.comP+'</span>':''):'<span class="mut">sem prazo</span>')+'</td><td class="num">'+x.inc+'</td><td class="num">'+(x.fin?pct(x.docsInc/x.fin*100):'—')+'</td><td class="num">'+(x.cert?x.cert+(x.sv==='RI'?' <span class="mut">('+x.certBal+' balcão · '+(x.cert-x.certBal)+' central)</span>':''):'—')+'</td><td class="num">'+(x.certCalc?pct(x.certOk/x.certCalc*100):'—')+'</td><td class="num">'+(x.senhas||'—')+'</td><td class="num">'+(es.n?fmtMS(es.media):'—')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="hint">RI · balcão = protocolos feitos no balcão; RI · central = naturezas "ONR - …" (vieram pela central / e-protocolo). Certidões do RI: balcão = pedido cadastrado no VHL; central = só no Tri7 (SAEC). Tempos em dias úteis do ingresso à finalização. Média = soma ÷ quantidade (puxada pelos casos muito demorados); mediana = o caso do meio (metade termina antes); moda = o tempo mais comum, com o % de documentos que tiveram exatamente esse tempo; P90 = 90% terminam em até. RI: protocolos registrados e cancelados (prazo pela regra do KPI-02); as intimações aparecem na linha de baixo. Demais: documentos finalizados no VHL, prazo pela tabela de cada natureza. Certidões contam à parte. Malote e Arquivo não entram na produção (Malote aparece só como contagem de cadastros). Senhas pela fila (Registro de Imóveis, Nascimento/Casamento/Óbito, Títulos e Documentos/PJ).</p></div>';
    $('graficos').innerHTML=h;
  }
  function renderAtr(){
    var modo=svModo();
    if (modo==='todas') return renderComparativo();
    var D=selDocs();
    $('secTendencia').hidden=true;
    $('kpis').innerHTML=D.length?servTiles(D):'<div class="panel empty" style="grid-column:1/-1"><b>Sem documentos de '+esc(selNome())+' no período</b>Escolha outro mês ou importe o Prazo e Tempo Médio em <b>Importar dados</b>.</div>';
    $('graficos').innerHTML=servGraficosHTML();
    $('tabNat').innerHTML=state.pgVis.nat?visNat():servNatHTML(D); $('tabEta').innerHTML=servEtapaHTML(D); $('tabFp').innerHTML=servFpHTML(D);
  }

  // ficha de documento das outras atribuições
  function servFicha(c){
    var achados=[]; Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ if (String(d.c).toUpperCase()===c.toUpperCase()) achados.push(d); }); });
    if (!achados.length) return '';
    var F=function(n){ return fmtData(Motor.isoDeDia(n)); };
    return achados.map(function(d){ var ok=servOk(d), pz=servPrazo(d);
      var h='<div class="prot-grid">'+[['Atribuição',esc(d.t)],['Natureza',esc(d.nat)],['Ingresso',F(d.ing)],['Finalização',F(d.fin)],['Tempo até finalizar','<b>'+servDu(d)+' dias úteis</b> (o dia do ingresso não conta; sábados, domingos e feriados fora)'+(pz!=null?' · prazo '+pz+' d.u. '+(ok?'<span class="pill good">no prazo</span>':'<span class="pill crit">acima</span>'):' · <span class="mut">prazo legal não definido para esta natureza</span>')],['Tempo de atuação',d.tempo?fmtMS(d.tempo)+' (cronômetro do VHL)':'— (sem cronômetro)']].map(function(x){ return '<div class="pk">'+x[0]+'</div><div class="pv">'+x[1]+'</div>'; }).join('')+'</div>';
      if (d.ets.length) h+='<div class="sub-h" style="margin-top:12px">Linha do tempo · Produção por Etapa (VHL)</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Data</th><th>Etapa</th><th>Responsável</th><th>Prazo na etapa</th></tr></thead><tbody>'+d.ets.map(function(x){ return '<tr><td>'+F(x.d)+'</td><td>'+esc(x.et)+'</td><td>'+esc(x.rp||'—')+'</td><td>'+x.pz+' d.u.</td></tr>'; }).join('')+'</tbody></table></div>';
      return h; }).join('<hr style="border:0;border-top:1px solid var(--line);margin:14px 0">');
  }

  // ——— catálogo de KPIs editável (config/kpis): nome, meta, sentido, frequência, visibilidade, ordem e KPIs novos
  var KPIS_PADRAO=null;
  function kpiDoCatalogo(o){ // KPI novo, criado na tela
    var K={id:o.id, nome:o.nome||o.id, meta:o.meta||'', custom:true, freq:o.freq||'', dica:o.dica||''};
    if (o.tipo==='contagem'){ K.cont=o.dica||'registro manual'; }
    else if (o.tipo==='nota'){ K.den=100; K.um=o.lab0||'Nota (0–100)'; K.taxa=true; }
    else if (o.tipo==='minutos'){ K.den=100; K.um=o.lab0||'Minutos'; K.minutos=true; }
    else { K.lab=[o.lab0||'Numerador',o.lab1||'Denominador']; K.taxa=true; }
    K.tipo=o.tipo||'taxa'; return K;
  }
  function catAplicar(cat){
    if (!KPIS_PADRAO) KPIS_PADRAO=KPIS.map(function(K){ return Object.assign({},K); });
    cat=cat||{}; var it=cat.itens||{}, lista=KPIS_PADRAO.map(function(K){ return Object.assign({},K); }).concat((cat.novos||[]).map(kpiDoCatalogo));
    lista.forEach(function(K){ var o=it[K.id]; if (!o) return;
      if (o.nome) K.nome=o.nome; if (o.meta!=null) K.meta=o.meta; if (o.freq!=null) K.freq=o.freq||undefined; if (o.dica!=null) K.dica=o.dica;
      if (o.oculto!=null) K.fora=!!o.oculto;
      if (o.lab0&&K.lab) K.lab=[o.lab0,K.lab[1]]; if (o.lab1&&K.lab) K.lab=[K.lab[0],o.lab1];
      if (o.sentido==='baseline'){ K.baseline=true; } else if (o.sentido&&o.metaV!=null&&!K.cont){ K.baseline=false; K.metaV=+o.metaV; K.bom=o.sentido==='menor'?menor(+o.metaV):maior(+o.metaV); K.sentido=o.sentido; } });
    lista.forEach(function(K){ if (K.custom){ var o=it[K.id]||{}; if (!K.cont && !K.bom){ var v=o.metaV, sd=o.sentido||'maior'; if (sd==='baseline'||v==null||v==='') K.baseline=true; else { K.metaV=+v; K.sentido=sd; K.bom=sd==='menor'?menor(+v):maior(+v); } } } });
    var ordem=cat.ordem||[]; lista.sort(function(a,b){ var ia=ordem.indexOf(a.id), ib=ordem.indexOf(b.id); return (ia<0?999:ia)-(ib<0?999:ib); });
    KPIS.length=0; lista.forEach(function(K){ KPIS.push(K); });
  }
  function metaDe(id, def){ var K=kpiDef(id); return K&&K.metaV!=null?K.metaV:def; }
  function catSalvar(){ catAplicar(state.kpiCat); if (dbPronto&&podeEscrever) db.doc('config/kpis').set(state.kpiCat).then(function(){ toast('Indicadores salvos'); }).catch(function(){ toast('Não consegui salvar os indicadores'); }); }
  function renderKpiEditor(){
    var cat=state.kpiCat=state.kpiCat||{itens:{},novos:[],ordem:[]}; cat.itens=cat.itens||{}; cat.novos=cat.novos||[];
    function sentidoDe(K){ var o=cat.itens[K.id]||{}; return o.sentido||(K.baseline?'baseline':K.sentido||(K.bom&&K.bom(0)&&!K.bom(1e9)?'menor':'maior')); }
    function metaVDe(K){ var o=cat.itens[K.id]||{}; if (o.metaV!=null) return o.metaV; if (K.metaV!=null) return K.metaV; var m=String(K.meta||'').replace(',','.').match(/[\d.]+/); return m?m[0]:''; }
    var h='<div class="sec-h"><h2>Editar indicadores</h2><span class="note">Mude nome, meta, sentido, frequência e quais aparecem. KPIs calculados pelo painel mantêm a fórmula; os novos são de lançamento manual.</span></div>'+
      '<div class="ctl" style="margin:8px 0"><button class="btn primary sm" type="button" id="kpiEdSalvar">Salvar</button><button class="btn sm" type="button" id="kpiEdNovo">+ Novo indicador</button><button class="btn sm" type="button" id="kpiEdFechar">Fechar</button><span class="spacer"></span><button class="btn sm" type="button" id="kpiEdPadrao">Restaurar padrão</button></div>'+
      '<div class="tbl-wrap"><table class="tleft kpied"><thead><tr><th></th><th>KPI</th><th>Nome</th><th>Meta (texto)</th><th>Valor</th><th>Sentido</th><th>Tipo</th><th>Rótulos (numerador / denominador)</th><th>Frequência</th><th>Mostrar</th><th></th></tr></thead><tbody>'+
      KPIS.map(function(K,i){ var o=cat.itens[K.id]||{}, sd=sentidoDe(K), auto=!!K.auto, fixo=K.cont&&!K.custom;
        var tipo=K.custom?K.tipo:(K.cont?'contagem':K.minutos?'minutos':K.den===100?'nota':'taxa');
        return '<tr data-kped="'+esc(K.id)+'"><td class="nowrap"><button type="button" class="btn sm" data-kpmov="-1" aria-label="Subir"'+(i?'':' disabled')+'>↑</button><button type="button" class="btn sm" data-kpmov="1" aria-label="Descer"'+(i<KPIS.length-1?'':' disabled')+'>↓</button></td>'+
          '<td><b>'+esc(K.id)+'</b>'+(auto?'<div class="mut" style="font-size:.72rem">calculado</div>':K.custom?'<div class="mut" style="font-size:.72rem">novo</div>':'')+'</td>'+
          '<td><input type="text" class="mini" data-kpf="nome" value="'+esc(K.nome)+'" style="min-width:220px"></td>'+
          '<td><input type="text" class="mini" data-kpf="meta" value="'+esc(K.meta)+'" style="width:9em"></td>'+
          '<td><input type="text" inputmode="decimal" class="mini" data-kpf="metaV" value="'+esc(fixo?'0':metaVDe(K))+'" style="width:5em"'+(fixo||sd==='baseline'?' disabled':'')+'></td>'+
          '<td>'+(fixo||tipo==='contagem'?'<span class="mut">zero ocorrências</span>':'<select class="mini" data-kpf="sentido"><option value="maior"'+(sd==='maior'?' selected':'')+'>≥ maior ou igual</option><option value="menor"'+(sd==='menor'?' selected':'')+'>≤ menor ou igual</option><option value="baseline"'+(sd==='baseline'?' selected':'')+'>sem meta (baseline)</option></select>')+'</td>'+
          '<td>'+(K.custom?'<select class="mini" data-kpf="tipo"><option value="taxa"'+(tipo==='taxa'?' selected':'')+'>% (numerador ÷ denominador)</option><option value="nota"'+(tipo==='nota'?' selected':'')+'>nota 0–100</option><option value="minutos"'+(tipo==='minutos'?' selected':'')+'>minutos</option><option value="contagem"'+(tipo==='contagem'?' selected':'')+'>contagem (meta zero)</option></select>':'<span class="mut">'+({taxa:'%',nota:'nota 0–100',minutos:'minutos',contagem:'contagem'}[tipo])+'</span>')+'</td>'+
          '<td>'+(K.lab||(K.custom&&tipo!=='contagem')?'<input type="text" class="mini" data-kpf="lab0" value="'+esc((K.lab||[K.um||''])[0]||'')+'" style="width:11em"'+(auto?' disabled':'')+'>'+(K.lab||tipo==='taxa'?' / <input type="text" class="mini" data-kpf="lab1" value="'+esc((K.lab||['',''])[1]||'')+'" style="width:9em"'+(auto?' disabled':'')+'>':''):'<span class="mut">—</span>')+'</td>'+
          '<td><input type="text" class="mini" data-kpf="freq" value="'+esc(K.freq||'Mensal')+'" style="width:7em"></td>'+
          '<td><input type="checkbox" data-kpf="mostrar"'+(K.fora?'':' checked')+' aria-label="Mostrar '+esc(K.id)+'"></td>'+
          '<td>'+(K.custom?'<button type="button" class="btn sm" data-kprm="1">Remover</button>':'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="hint">Valor = número da meta usado para dizer "Atende / Não atende" e para a linha de meta nos gráficos. O texto da meta é o que vai copiado para o ANOREG+. Um KPI oculto some da lista de lançamento (dá para ver marcando "mostrar ocultos").</p>';
    return h;
  }
  function kpiEdLer(){ // lê a tabela para o catálogo
    var cat=state.kpiCat;
    document.querySelectorAll('#tabLanc tr[data-kped]').forEach(function(tr){ var id=tr.dataset.kped, K=kpiDef(id); if (!K) return;
      function v(f){ var e=tr.querySelector('[data-kpf="'+f+'"]'); return e?(e.type==='checkbox'?e.checked:e.value.trim()):null; }
      var o={nome:v('nome'), meta:v('meta'), freq:v('freq'), oculto:!v('mostrar')}, mv=v('metaV'), sd=v('sentido');
      if (sd) o.sentido=sd; if (mv!=null && mv!=='' && !isNaN(numIn(mv))) o.metaV=numIn(mv);
      if (v('lab0')!=null) o.lab0=v('lab0'); if (v('lab1')!=null) o.lab1=v('lab1');
      if (K.custom){ var n=cat.novos.filter(function(x){ return x.id===id; })[0]; if (n){ n.nome=o.nome; n.meta=o.meta; n.freq=o.freq; if (v('tipo')) n.tipo=v('tipo'); if (o.lab0!=null) n.lab0=o.lab0; if (o.lab1!=null) n.lab1=o.lab1; } }
      cat.itens[id]=o; });
    cat.ordem=Array.prototype.map.call(document.querySelectorAll('#tabLanc tr[data-kped]'),function(tr){ return tr.dataset.kped; });
  }

  // ——— versão, dados brutos, recálculo, backup e memória de cálculo (site no GitHub + Supabase)
  var APP_VERSAO='1.10.1';
  // Dados brutos: só as colunas que o cálculo usa (sem título, solicitante ou nome de parte)
  function brutosMontar(){
    var S=XLSX.SSF, out={};
    function mesDe(v){ var d=Motor.paraDia(v,S); return d==null?null:Motor.isoDeDia(d).slice(0,7); }
    function bloco(k,tipo,mes){ return out[k]=out[k]||{tipo:tipo,mes:mes,rows:new Map()}; }  // Map preserva a ordem original (importa para etapas do mesmo dia)
    Motor.linhas(state.arquivos.prazo||[]).forEach(function(r){ var t=Motor.semAcento(r['tipo de documento']); if (!t || t.indexOf('x ')===0) return; // todas as atribuições (sem título nem solicitante)
      var m=mesDe(r['finalizacao']); if (!m) return; bloco('prazo-'+m,'prazo',m).rows.set(String(r['tipo de documento']).trim()+'|'+String(r['codigo']),[r['tipo de documento'],r['codigo'],r['natureza'],r['ingresso'],r['finalizacao'],r['prazo'],r['tempo']]); });
    Motor.linhas(state.arquivos.etapa||[]).forEach(function(r){ var m=mesDe(r['data execucao']); if (!m) return;
      var row=[r['codigo'],r['data execucao'],r['etapa'],r['responsavel'],r['prazo']]; bloco('etapa-'+m,'etapa',m).rows.set(row.join('|'),row); });
    var D=Motor.linhas(state.arquivos.demanda||[]); if (D.length){ var b=bloco('demanda','demanda',null);
      D.forEach(function(r){ if (Motor.semAcento(r['tipo de documento'])!=='ri') return; b.rows.set(String(r['codigo']),[r['codigo'],r['status']]); }); }
    return out;
  }
  var BRUTO_COLS={prazo:['tipo de documento','codigo','natureza','ingresso','finalizacao','prazo','tempo'], etapa:['codigo','data execucao','etapa','responsavel','prazo'], demanda:['codigo','status']};
  function brutoCod(b){ // dicionário de textos repetidos para ocupar menos espaço
    var dic=[], di={}, rows=Array.from(b.rows.values()).map(function(r){ return r.map(function(v){ if (typeof v!=='string') return v; if (!(v in di)){ di[v]=dic.length; dic.push(v); } return '~'+di[v]; }); });
    return {v:1, tipo:b.tipo, mes:b.mes, cols:BRUTO_COLS[b.tipo], dic:dic, rows:rows, em:new Date().toISOString(), versao:APP_VERSAO}; }
  function brutoDecod(doc){ return (doc.rows||[]).map(function(r){ var o={}; doc.cols.forEach(function(c,i){ var v=r[i]; o[c]=(typeof v==='string'&&v.charAt(0)==='~')?doc.dic[+v.slice(1)]:v; }); return o; }); }
  function brutoChave(tipo,o){ return tipo==='etapa'?[o['codigo'],o['data execucao'],o['etapa'],o['responsavel'],o['prazo']].join('|'):tipo==='prazo'?String(o['tipo de documento']).trim()+'|'+String(o['codigo']):String(o['codigo']); }
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
      return recalcDeBrutos(function(t){ b.textContent=t; }).then(function(r){ return r.ri; });
    }).then(function(n){ toast(n+' mês(es) recalculado(s) com a versão '+APP_VERSAO); render(); }).catch(function(e){ toast(e.message||'Não consegui recalcular'); })
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
      var av=$('avisoBackup'); if (av){ av.hidden=!(podeEscrever && (dias==null||dias>30)); av.innerHTML='<b>Backup:</b> '+(d?'o último foi há '+dias+' dias':'você ainda não baixou nenhum')+'. O plano gratuito do Supabase não faz backup automático — abra <b>Importar dados</b> e clique em <b>Baixar backup</b>.'; } });
  }

  // ——— memória de cálculo auditável (.xlsx com fórmulas do próprio Excel)
  function xSerial(iso){ if (!iso) return null; var p=String(iso).slice(0,10).split('-'); return Date.UTC(+p[0],+p[1]-1,+p[2])/864e5+25569; }
  function xFolha(cab, linhas, larguras){ var ws=XLSX.utils.aoa_to_sheet([cab].concat(linhas.map(function(l){ return l.map(function(v){ return v&&typeof v==='object'?null:v; }); })));
    linhas.forEach(function(l,i){ l.forEach(function(v,j){ if (v&&typeof v==='object'){ var a=XLSX.utils.encode_cell({r:i+1,c:j}); ws[a]=v; } }); });
    ws['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(1,linhas.length),c:cab.length-1}}); ws['!cols']=(larguras||[]).map(function(w){ return {wch:w}; }); ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(1,linhas.length),c:cab.length-1}})}; return ws; }
  function xData(iso){ var s=xSerial(iso); return s==null?'':{t:'n',v:s,z:'dd/mm/yyyy'}; }
  function xF(f){ return {t:'n',f:f}; }
  function baixarMemoria(m){
    var d=state.docs[m]; if (!d){ toast('Sem dados do painel para '+compLabel(m)); return; } aplicarTri7();
    var wb=XLSX.utils.book_new(), resumo=[], atos=d.atos, R=atos.filter(function(a){return a.cat==='R';}), nR=R.length;
    // feriados usados (nacionais + locais)
    var fer=Motor.feriadoSet(state.extras), fl=Object.keys(fer).map(Number).filter(function(n){ var y=+Motor.isoDeDia(n).slice(0,4); return y>=2025&&y<=2027; }).sort(function(a,b){return a-b;});
    var nF=fl.length+1;
    // KPI-02
    var l2=R.map(function(a,i){ var r=i+2, j=justDe(a);
      return [a.c, a.natOrig||a.nat, xData(a.ing), xData(a.reg), a.bruto, xF('IF(D'+r+'="","",NETWORKDAYS(C'+r+',D'+r+',Feriados!$A$2:$A$'+nF+')-1)'), xF('IF(F'+r+'="","sem Revisão Oficial (Prazo do VHL)",IF(E'+r+'=F'+r+',"OK","DIFERENTE"))'), a.lim, j?(MOT_JUST[j.motivo]||j.motivo):'', xF('IF(OR(E'+r+'<=H'+r+',I'+r+'<>""),1,0)')]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Ingresso','Registro (última Revisão Oficial)','Dias úteis (painel)','Dias úteis (Excel)','Confere?','Limite (d.u.)','Justificativa','Dentro do prazo'], l2, [11,40,11,14,10,10,14,8,30,10]), 'KPI-02');
    resumo.push(['KPI-02','Finalizados na vigência da prenotação', xF("SUM('KPI-02'!J2:J"+(nR+1)+')'), xF("COUNTA('KPI-02'!A2:A"+(nR+1)+')'), 'Aba KPI-02: um ato registrado por linha. "Dias úteis (Excel)" refaz a conta com NETWORKDAYS e a aba Feriados.']);
    // KPI-02 complementar
    var SITX={R:'Registrado',N:'Não registrado (cancelado/devolvido)',E:'Abertura + outros (especial)',I:'Sem histórico'};
    var lc=atos.map(function(a){ return [a.c, a.natOrig||a.nat, SITX[a.cat]||a.cat, a.cat==='N'?(MOTIVOS[a.motivo]||''):'', a.cat==='N'?1:0]; }).concat(cancSoTri7Mes(m,true).map(function(a){ return [a.c, '(sem finalização no VHL)', 'Cancelado no Tri7, ainda aberto no VHL', MOTIVOS.T, 1]; }));
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Situação','Motivo','Não registrado'], lc, [11,40,30,40,12]), 'KPI-02 Comp');
    resumo.push(['KPI-02 (Comp.)','Protocolos cancelados', xF("SUM('KPI-02 Comp'!E2:E"+(lc.length+1)+')'), xF("COUNTA('KPI-02 Comp'!A2:A"+(lc.length+1)+')'), 'Aba KPI-02 Comp: todos os protocolos arquivados no mês, mais os cancelados no Tri7 no mês que ainda não foram finalizados no VHL.']);
    // KPI-01
    var todos=incTodos(), porCod={}; todos.forEach(function(r){ if (r.t==='RI') porCod[r.c]=(porCod[r.c]||0)+1; });
    var l1=R.map(function(a,i){ return [a.c, a.natOrig||a.nat, porCod[a.c]||0, xF('IF(C'+(i+2)+'>0,1,0)')]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Inconformidades RI ligadas ao protocolo','Teve inconformidade'], l1, [11,40,18,14]), 'KPI-01');
    var incMes=(state.inconf[m]||[]).filter(function(r){return r.t==='RI';});
    var lf=incMes.map(function(r){ return [xData(r.d), r.c, grupoDe(r)==='E'?'Externo':'Interno', catDe(r), r.o]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Data','Documento','Tipo','Erro','Observação'], lf, [11,11,9,30,80]), 'Inconformidades do mês');
    var den1=d.atos.length+((d.raw&&d.raw.pesquisa)||0);
    resumo.push(['KPI-01','Taxa de não conformidade interna (RI) — atos com inconformidade', xF("SUM('KPI-01'!D2:D"+(nR+1)+')'), xF("COUNTA('KPI-01'!A2:A"+(nR+1)+')'), 'Aba KPI-01: atos registrados no mês com ao menos 1 inconformidade (de qualquer data) ÷ atos registrados.']);
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
    var lr=resumo.map(function(x,i){ var r=i+2, tv=kpiTravado(m,x[0]); return [x[0],x[1],x[2],x[3], xF('IF(D'+r+'=0,"—",C'+r+'/D'+r+'*100)'), tv&&tv.n!=null?numBR(tv.n)+' / '+numBR(tv.d)+' em '+fmtDataHora(tv.em)+' (painel '+(tv.ver||'?')+')':'', x[4]]; });
    var wsR=xFolha(['KPI','Indicador','Numerador','Denominador','Resultado','Lançado no ANOREG+ (travado)','Como conferir'], lr, [14,48,12,12,11,30,90]);
    XLSX.utils.book_append_sheet(wb, wsR, 'Resumo'); wb.SheetNames.unshift(wb.SheetNames.pop());
    var wsF=xFolha(['Feriado (dias sem expediente considerados)'], fl.map(function(n){ return [{t:'n',v:n+25569,z:'dd/mm/yyyy'}]; }), [34]);
    XLSX.utils.book_append_sheet(wb, wsF, 'Feriados');
    var leia=[['Memória de cálculo — Painel SGQ · CRCO'],['Competência',compLabel(m)],['Gerado em',new Date().toLocaleString('pt-BR')],['Versão do painel',APP_VERSAO],['Fontes','VHL: Prazo e Tempo Médio, Produção por Etapa, Demanda (Suspensos), Consulta de inconformidades, Consulta de senhas. Folha: Rel. Eventos de Apuração.'],
      ['Como auditar','1) Confira na aba Resumo que Numerador e Denominador são fórmulas sobre as abas de cada KPI. 2) Na aba KPI-02, a coluna "Dias úteis (Excel)" recalcula com NETWORKDAYS: "Confere?" deve dar OK. 3) Sorteie protocolos e compare datas com o VHL. 4) Quem quiser refazer do zero sobe as mesmas planilhas do VHL no painel e compara.'],
      ['Regras','KPI-02: 20 dias úteis do ingresso à última Revisão Oficial (Art. 205 c/c Art. 9º §1º da Lei 6.015/73); 25 com reingresso (Art. 188). Dia do ingresso não conta. Cancelados, pesquisas qualificadas e Informação Verbal - Visualização de Matrícula fora da base.'],
      ['Valor travado','Quando o KPI já foi lançado no ANOREG+, a coluna "Lançado no ANOREG+ (travado)" mostra o valor guardado no dia. Se for diferente do calculado nesta planilha, vale o travado: a diferença vem de dados ou regras posteriores ao lançamento. A evidência anexada no ANOREG+ é a memória baixada no dia do lançamento.'],
      ['Privacidade','Sem nomes de partes ou colaboradores; absenteísmo só por matrícula.']];
    var wsL=XLSX.utils.aoa_to_sheet(leia); wsL['!cols']=[{wch:18},{wch:120}]; XLSX.utils.book_append_sheet(wb, wsL, 'Leia-me');
    XLSX.writeFile(wb, 'Memoria de calculo KPIs - '+compLabel(m).replace(/[\/. ]+/g,'-')+'.xlsx');
    toast('Memória de cálculo baixada');
  }

  // ——— Painel geral: comparação mês a mês de todos os indicadores (pequenos gráficos lado a lado)
  var MES_AB=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function mesesGraficos(){
    var s={}; [state.docs,state.cert,state.senhas,state.k9,state.inconf,state.serv].forEach(function(o){ Object.keys(o||{}).forEach(function(m){ if (/^\d{4}-\d{2}$/.test(m)) s[m]=1; }); });
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
      var v=vals[i], w=n<2?W:(W-pl-pr)/(n-1); s+=hitRect(x(i)-w/2,0,w,H,'<b>'+compLabel(m)+'</b><br>'+o.titulo+': '+fmtG(v,o.un)+(o.extra&&o.extra[i]?'<br>'+o.extra[i]:'')+(o.meta!=null&&v!=null?'<br>'+((o.menor?v<=o.meta:v>=o.meta)?'dentro da meta':'fora da meta'):''),o.ir&&v!=null?goMes(m,o.ir):null); });
    if (ult>=0) s+='<text x="'+Math.min(x(ult),W-pr)+'" y="'+(y(vals[ult])-9)+'" text-anchor="'+(ult===n-1?'end':'middle')+'" font-size="10" font-weight="700" style="fill:var(--ink)">'+fmtG(vals[ult],o.un)+'</text>';
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
      {t:'Certidões no prazo', un:'%', v:ms.map(function(m){ if (!state.cert[m]) return null; var c=certCalc(state.cert[m].recs).filter(function(x){return !x.intim;}); return c.length?c.filter(function(x){return x.ok;}).length/c.length*100:null; }), ir:'cer'},
      {t:'KPI-13 · espera média', un:'min', v:ms.map(function(m){ if (!state.senhas[m]) { var o=kpiValor('KPI-13',m); return o?o.n:null; } var s=senhasResumo(state.senhas[m].L); return s.med!=null?s.med/60:null; }), meta:metaDe('KPI-13',15), menor:true, ir:'at', zero:true},
      {t:'Senhas com espera ≥ 10 min', un:'%', v:ms.map(function(m){ if (!state.senhas[m]) return null; var s=senhasResumo(state.senhas[m].L); return s.na?s.a10/s.na*100:null; }), ir:'at', menor:true, zero:true},
      {t:'KPI-09 · absenteísmo', un:'%', v:serieKPI('KPI-09',ms), meta:metaDe('KPI-09',4), menor:true, ir:'lanc', zero:true},
      {t:'KPI-03 · satisfação', un:'', v:serieKPI('KPI-03',ms), meta:metaDe('KPI-03',80), ir:'lanc'},
      {t:'KPI-03 comp. · Google', un:'', v:serieKPI('KPI-03 (Comp.)',ms), meta:metaDe('KPI-03 (Comp.)',80), ir:'lanc'},
      {t:'Volume RI (atos + pesquisas)', un:'', v:ms.map(function(m){ var d=state.docs[m]; return d?d.atos.length+((d.raw&&d.raw.pesquisa)||0):null; }), ir:'nat', zero:true}
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

  // ═════════ drill-down: todo elemento de gráfico leva ao dado de origem (v1.9) ═════════
  // goAttr(ação) devolve os atributos data-go/data-goh; o clique é tratado em goExec. Ações:
  //   {t:'nat', nat, key?}  natureza (key = "tipo|natureza" nas outras atribuições) → Por natureza com ela aberta
  //   {t:'mes', m, aba}     muda o Período para o mês e abre a página
  //   {t:'lista', titulo, tipo, itens}  lista abaixo do gráfico (tipo: atos, docs, inc, senhas, cert, cods)
  //   {t:'pessoa', nome}    relatório individual        {t:'prot', c}  ficha do protocolo
  //   {t:'des', k}          desempenho da pessoa        {t:'sv', sv, m?}  só aquela serventia
  var GO={}, goN=0;
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
  var LISTA_COLS={
    atos:[['Código',function(a){ return protLink(a.c); }],['Natureza',function(a){ return esc(a.nat); },'tl'],['Ingresso',function(a){ return fmtData(a.ing); }],['Registro / saída',function(a){ return fmtData(a.reg||a.fin); }],['Dias úteis',function(a){ return a.bruto==null?'—':a.bruto; }],['Limite',function(a){ return a.cat==='R'?a.lim:'—'; }],['Exigências',function(a){ return a.nex||''; }],['Situação',sitAto]],
    docs:[['Código',function(d){ return protLink(d.c); }],['Tipo',function(d){ return esc(d.t); }],['Natureza',function(d){ return esc(d.nat); },'tl'],['Ingresso',function(d){ return fmtData(Motor.isoDeDia(d.ing)); }],['Finalização',function(d){ return fmtData(Motor.isoDeDia(d.fin)); }],['Dias úteis',function(d){ return servDu(d); }],['Prazo',function(d){ var p=servPrazo(d); return p==null?'—':p; }],['Situação',function(d){ var ok=servOk(d); return ok==null?'':ok?'<span class="pill good">no prazo</span>':'<span class="pill crit">acima</span>'; }]],
    inc:[['Data',function(r){ return fmtData(r.d); }],['Documento',function(r){ return protLink(r.c)+' <span class="mut">'+esc(r.t)+'</span>'; }],['Pessoa',function(r){ return esc(r.r); },'tl'],['Tipo',function(r){ return grupoDe(r)==='E'?'<span class="pill crit">Externo</span>':'Interno'; }],['Erro',function(r){ return esc(catDe(r)); },'tl'],['Observação',function(r){ return esc(r.o); },'tl obs']],
    senhas:[['Dia',function(s){ return fmtData(s.dia); }],['Emissão',function(s){ return hhmm(s.g); }],['Chamada',function(s){ return hhmm(s.c); }],['Fila',function(s){ return esc(s.fila)+(s.pri?' <span class="pill warn">prioritária</span>':''); },'tl'],['Espera',function(s){ return fmtMS(s.e); }],['Atendimento',function(s){ return fmtMS(s.t); }],['Atendente',function(s){ return esc(s.at||'—'); },'tl']],
    cert:[['Pedido',function(c){ return esc(c.p); }],['Origem',function(c){ return esc(c.origem); }],['Tipo',function(c){ return esc(c.tipo); },'tl'],['Entrada',function(c){ return fmtMin(c.i); }],['Conclusão',function(c){ return fmtMin(c.f); }],['Horas úteis',function(c){ return fmtH(c.hu); }],['Prazo',function(c){ return c.intim?'<span class="mut">intimação</span>':fmtLim(c.lim)+' '+(c.ok?'<span class="pill good">ok</span>':'<span class="pill crit">acima</span>'); }],['Gerou o selo',function(c){ return esc(c.u||'—'); },'tl']],
    cods:[['Pedido',function(x){ return esc(x); }]],
    prots:[['Protocolo',function(x){ return protLink(x); }]]
  };
  function goCodigo(tipo,x){ return tipo==='cods'||tipo==='prots'?x:tipo==='cert'?x.p:tipo==='senhas'?null:x.c; }
  // ordem da lista: os casos mais demorados primeiro (inconformidades: as mais recentes)
  var LISTA_ORD={atos:function(a){ return a.bruto==null?-1:a.bruto; }, docs:function(d){ return servDu(d); }, senhas:function(x){ return x.e==null?-1:x.e; }, cert:function(c){ return c.hu; }};
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
  }

  // ═════════ gráficos reutilizáveis (SVG puro; dica ao passar o mouse/tocar via data-tip) ═════════
  var CAT=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)']; // ordem fixa, nunca cíclica
  function larg(W){ var w=typeof window!=='undefined'?window.innerWidth:1200; return w<700?Math.max(300,Math.min(W||640,w-44)):(W||640); }
  function dSvg(W,H,tit){ return '<svg viewBox="0 0 '+W+' '+H+'" class="gm-svg vz-svg" role="img" aria-label="'+esc(tit||'gráfico')+'">'; }
  function eixoY(lo,hi,y,pl,W,pr,fmt){ var s=''; [lo,(lo+hi)/2,hi].forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t).toFixed(1)+'" y2="'+y(t).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(y(t)+3.5).toFixed(1)+'" text-anchor="end" font-size="10" style="fill:var(--ink-3)">'+fmt(t)+'</text>'; }); return s; }
  function legenda(series){ if (series.length<2) return ''; return '<div class="leg">'+series.map(function(x){ return '<span><i class="dot" style="background:'+x.cor+(x.tracejado?';opacity:.6':'')+'"></i>'+esc(x.nome)+'</span>'; }).join('')+'</div>'; }
  function fmtN(un){ return function(v){ return un==='%'?numBR(v,0)+'%':un==='d.u.'?numBR(v,1):numBR(v,Math.abs(v)<10&&v%1?1:0); }; }

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
    (o.ref||[]).forEach(function(r,k){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(r.v).toFixed(1)+'" y2="'+y(r.v).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="4 3"/><text x="'+(pl+4)+'" y="'+(y(r.v)+(k%2?13:-4)).toFixed(1)+'" font-size="10" style="fill:var(--ink-2)">'+esc(r.nome)+'</text>'; });
    series.forEach(function(se,k){ var d='', first=-1, last=-1; se.v.forEach(function(v,i){ if (v==null||isNaN(v)) return; d+=(d?' L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1); if (first<0) first=i; last=i; });
      if (!d) return;
      if (o.area&&k===0) s+='<path d="'+d+' L'+x(last).toFixed(1)+','+y(lo).toFixed(1)+' L'+x(first).toFixed(1)+','+y(lo).toFixed(1)+' Z" style="fill:'+se.cor+';opacity:.18"/>';
      s+='<path d="'+d+'" fill="none" style="stroke:'+se.cor+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"'+(se.tracejado?' stroke-dasharray="5 4"':'')+'/>';
      se.v.forEach(function(v,i){ if (v==null||isNaN(v)) return; var al=se.alerta&&se.alerta[i]; s+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="'+(al?5:3.5)+'" style="fill:'+(al?'var(--crit)':se.cor)+'" stroke="var(--surface)" stroke-width="2"/>'; });
      if (series.length<=4 && last>=0 && o.rotulos!==false) s+='<text x="'+Math.min(x(last)+2,W-pr)+'" y="'+(y(se.v[last])-8).toFixed(1)+'" text-anchor="end" font-size="10" font-weight="700" style="fill:var(--ink)">'+fmtG(se.v[last],un)+'</text>'; });
    var passo=n>8?2:1;
    ms.forEach(function(m,i){ if ((n-1-i)%passo===0) s+='<text x="'+x(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-3)">'+MES_AB[+m.slice(5)-1]+'</text>';
      var w=n<2?W:(W-pl-pr)/(n-1), tip='<b>'+compLabel(m)+'</b>'; series.forEach(function(se){ var v=se.v[i]; tip+='<br>'+esc(se.nome)+': '+fmtG(v,un)+(se.extra&&se.extra[i]?' <span class=mut>('+se.extra[i]+')</span>':''); });
      if (o.banda&&o.banda.lo[i]!=null) tip+='<br>Faixa normal: '+fmtG(o.banda.lo[i],un)+' a '+fmtG(o.banda.hi[i],un);
      s+=hitRect(x(i)-w/2,0,w,H,tip,o.goMes?o.goMes(m,i):o.irMes?goMes(m,o.irMes):null); });
    return s+'</svg>'+legenda(series);
  }
  // barras horizontais (comparar categorias)
  function gBarrasH(itens, o){
    o=o||{}; if (!itens.length) return '<div class="gm-vazio">Sem dados</div>';
    var mx=Math.max.apply(null,itens.map(function(x){ return Math.abs(x.v)||0; }))||1;
    return '<div class="hb">'+itens.map(function(x){ var w=Math.max(1,Math.abs(x.v)/mx*100);
      return '<div class="hb-row" data-tip="'+esc('<b>'+esc(x.nome)+'</b><br>'+fmtG(x.v,o.un||'')+(x.extra?'<br>'+x.extra:''))+'"'+goAttr(x.go)+'><span class="hb-n">'+esc(x.nome)+'</span><span class="hb-t"><i style="width:'+w.toFixed(1)+'%;background:'+(x.cor||'var(--c1)')+'"></i></span><span class="hb-v">'+fmtG(x.v,o.un||'')+'</span></div>'; }).join('')+'</div>';
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
    s+='<text x="'+cx+'" y="'+(cy-2)+'" text-anchor="middle" font-size="20" font-weight="700" style="fill:var(--ink)" pointer-events="none">'+(o.centro!=null?o.centro:tot.toLocaleString('pt-BR'))+'</text><text x="'+cx+'" y="'+(cy+15)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-3)" pointer-events="none">'+esc(o.sub||'total')+'</text></svg>';
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
    if (o.refY!=null) s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(o.refY).toFixed(1)+'" y2="'+Y(o.refY).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="4 3"/><text x="'+(W-pr)+'" y="'+(Y(o.refY)-4).toFixed(1)+'" text-anchor="end" font-size="10" style="fill:var(--ink-2)">'+esc(o.refYNome||'')+'</text>';
    var tx=o.logX?[Math.pow(10,x0),Math.pow(10,(x0+x1)/2),Math.pow(10,x1)]:[x0,(x0+x1)/2,x1];
    tx.forEach(function(t){ s+='<text x="'+X(t).toFixed(1)+'" y="'+(H-pb+14)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-3)">'+numBR(t,t<10?1:0)+'</text>'; });
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-2)">'+esc(o.xl||'')+'</text><text x="12" y="'+((pt+H-pb)/2)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-2)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+esc(o.yl||'')+'</text>';
    var rot=pts.slice().sort(function(a,b){ return (b.rot||0)-(a.rot||0); }).slice(0,o.nRot==null?5:o.nRot);
    pts.forEach(function(p){ s+='<circle class="pt" cx="'+X(p.x).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="'+(p.r||6)+'" style="fill:'+(p.cor||'var(--c1)')+';fill-opacity:.75" stroke="var(--surface)" stroke-width="2" data-tip="'+esc('<b>'+esc(p.nome)+'</b>'+(o.quem?' <span class=mut>('+esc(o.quem)+')</span>':'')+'<br>'+esc(o.xl||'x')+': '+numBR(p.x,1)+'<br>'+esc(o.yl||'y')+': '+numBR(p.y,1)+(p.extra?'<br>'+p.extra:''))+'"'+goAttr(p.go)+'/>'; });
    var usados=[]; rot.forEach(function(p){ if (!p.rot) return; var px=X(p.x), py=Y(p.y), dir=px>W*0.7, tx=dir?px-8:px+8, nm=String(p.nome).length>22?String(p.nome).slice(0,21)+'…':String(p.nome), w=nm.length*5.6, x0=dir?tx-w:tx;
      if (usados.some(function(u){ return Math.abs(u.y-py)<12 && x0<u.x1 && x0+w>u.x0; })) return; usados.push({x0:x0,x1:x0+w,y:py});
      s+='<text x="'+tx.toFixed(1)+'" y="'+(py+3.5).toFixed(1)+'" font-size="10"'+(dir?' text-anchor="end"':'')+' style="fill:var(--ink-2)" pointer-events="none">'+esc(nm)+'</text>'; });
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
      if (i%Math.ceil((nb+1)/12)===0) s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-12)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-3)" pointer-events="none">'+(i===nb?'≥'+numBR(i*passo):numBR(i*passo))+'</text>'; });
    var xm=pl+(e.mediana/passo+0.5)*bw; s+='<line x1="'+xm.toFixed(1)+'" x2="'+xm.toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-dasharray="3 3" pointer-events="none"/><text x="'+(xm+4).toFixed(1)+'" y="'+(pt+10)+'" font-size="10" style="fill:var(--ink)" pointer-events="none">mediana '+numBR(e.mediana,1)+'</text>';
    if (o.lim!=null){ var xl=pl+(o.lim/passo+(o.limEsq?0:1))*bw; s+='<line x1="'+xl.toFixed(1)+'" x2="'+xl.toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--crit)" stroke-dasharray="4 3" pointer-events="none"/>'; }
    return s+'<text x="'+((pl+W-pr)/2)+'" y="'+(H-1)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-2)">'+esc(o.xl||'')+'</text></svg>';
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
    for (var t=0;t<=xmax+1e-9;t+=passo) s+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)" pointer-events="none"/><text x="'+X(t).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" style="fill:var(--ink-3)" pointer-events="none">'+numBR(t,dec)+'</text>';
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
        var acB=n===1?L[0].go:(o.tipoLista&&L[0].item?goLista(g.nome+' · '+faixa+' '+un,o.tipoLista,L.map(function(p){ return p.item; })):null);
        s+='<circle class="pt" cx="'+xm.toFixed(1)+'" cy="'+cy+'" r="'+r.toFixed(1)+'" style="fill:var(--ink-3)" stroke="var(--surface)" stroke-width="1.5" data-tip="'+esc(tipB)+'"'+goAttr(acB)+'/>';
        if (n>1&&pxS>=15) s+='<text x="'+xm.toFixed(1)+'" y="'+(cy-r-2).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="700" style="fill:var(--ink-2)" pointer-events="none">'+n+'</text>'; });
      if (cort.length){ var xe=W-pr+8, tipC='<b>'+cort.length+(cort.length===1?' caso':' casos')+' acima de '+numBR(xmax,dec)+' '+un+'</b> (fora do eixo)<br>'+cort.slice().sort(function(a,b){ return b.v-a.v; }).slice(0,10).map(function(p){ return p.lab||numBR(p.v,1)+' '+un; }).join('<br>')+(cort.length>10?'<br>…':'');
        var acC=cort.length===1?cort[0].go:(o.tipoLista&&cort[0].item?goLista(g.nome+' · acima de '+numBR(xmax,dec)+' '+un,o.tipoLista,cort.map(function(p){ return p.item; })):null);
        s+='<path d="M'+xe+','+(cy-5)+' l7,5 l-7,5 z" style="fill:var(--ink-2)" pointer-events="none"/><text x="'+(xe+10)+'" y="'+(cy+3.5)+'" font-size="10" font-weight="700" style="fill:var(--ink-2)" pointer-events="none">'+cort.length+' &gt; '+numBR(xmax,dec)+'</text>';
        s+=hitRect(xe-4,cy-lh/2,pr-6,lh,tipC,acC); } });
    return s+'</svg>';
  }
  function vzCard(tit, sub, corpo, cls){ return '<div class="vz-card'+(cls?' '+cls:'')+'"><div class="vz-h"><span class="vz-t">'+esc(tit)+'</span>'+(sub?'<span class="vz-s">'+sub+'</span>':'')+'</div>'+corpo+'</div>'; }

  // ═════════ desempenho: linha normal de cada pessoa, comparação com a equipe e tendência macro ═════════
  function mesDeDia(d){ return new Date(d*864e5).toISOString().slice(0,7); }
  // cada execução de etapa (VHL · Produção por Etapa): pessoa, etapa, natureza, mês da execução e dias úteis que o documento ficou na etapa
  function desExecs(){
    var modo=svModo(), chave=[modo,svAtual(),subAtual(),state.riOrig||'todas',state.grVer,Object.keys(state.docs).length,Object.keys(state.logs).length,Object.keys(state.serv).length,state.andVer||0].join('|');
    if (state._desX&&state._desX.k===chave) return state._desX.v;
    var X=[];
    // mês = mês de finalização do ato (o mesmo critério do resto do painel): assim um mês não perde os atos que ainda estavam em andamento
    function add(rp,et,nat,m,pz,sv,c){ if (!rp||pz==null||isNaN(pz)||!m) return; X.push({k:semAc(rp), nome:rp, et:et, nat:nat, m:m, pz:pz, sv:sv, c:c}); }
    if (modo==='ri'||modo==='todas') Object.keys(state.docs).forEach(function(m){ if (!state.logs[m]) return; var map=state.logCache[m]||(state.logCache[m]=Motor.decodificarLog(state.logs[m]));
      state.docs[m].atos.filter(origOk).forEach(function(a){ var L=map[a.c]; if (!L) return; L.ev.forEach(function(e){ add(e.rp,e.et,a.nat,m,e.pz,'RI',a.c); }); }); });
    if (modo==='serv'||modo==='todas') Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ if (modo==='serv'&&!docOk(d)) return; var sv=svDe(d.t); if (sv==='Apoio') return; d.ets.forEach(function(e){ add(e.rp,e.et,d.nat,m,e.pz,sv,d.c); }); }); });
    // média de cada célula (etapa × natureza) na equipe, e por pessoa, para o "esperado" sem a própria pessoa
    var EM={}; X.forEach(function(x){ var e=EM[x.et]=EM[x.et]||{n:0,s:0}; e.n++; e.s+=x.pz; }); X=X.filter(function(x){ return EM[x.et].s/EM[x.et].n>=0.05; }); // etapa sempre feita no mesmo dia não diz nada sobre ritmo
    var C={}; X.forEach(function(x){ var c=C[x.et+'|'+x.nat]=C[x.et+'|'+x.nat]||{n:0,s:0,p:{}}; c.n++; c.s+=x.pz; var q=c.p[x.k]=c.p[x.k]||{n:0,s:0}; q.n++; q.s+=x.pz; });
    X.forEach(function(x){ var c=C[x.et+'|'+x.nat], q=c.p[x.k], no=c.n-q.n; x.espG=c.s/c.n; x.esp=no>=5?(c.s-q.s)/no:null; x.dv=x.esp==null?null:x.pz-x.esp; x.dvG=x.pz-x.espG; });
    state._desX={k:chave, v:X}; return X;
  }
  function desJanelas(X){
    var ms={}; X.forEach(function(x){ ms[x.m]=1; }); ms=Object.keys(ms).sort();
    var cnt={}, parcial=null; X.forEach(function(x){ cnt[x.m]=(cnt[x.m]||0)+1; });
    var agora=state.periodo!=='todos'&&ms.indexOf(state.periodo)>=0?state.periodo:ms[ms.length-1];
    if (state.periodo==='todos' && ms.length>2){ var ult=ms[ms.length-1], ref=mediana(ms.slice(-7,-1).map(function(m){ return cnt[m]; })); if (cnt[ult]<0.6*ref){ parcial=ult; agora=ms[ms.length-2]; } }
    var i=ms.indexOf(agora);
    return {ms:ms.filter(function(m){ return m!==parcial; }), agora:agora, antes:ms.slice(Math.max(0,i-6),i), parcial:parcial};
  }
  function zWelch(a,b){ var ea=est(a), eb=est(b); if (ea.n<2||eb.n<2) return null; var va=0, vb=0; a.forEach(function(x){ va+=(x-ea.media)*(x-ea.media); }); b.forEach(function(x){ vb+=(x-eb.media)*(x-eb.media); }); va/=ea.n-1; vb/=eb.n-1; var se=Math.sqrt(va/ea.n+vb/eb.n); return {dif:ea.media-eb.media, z:se>0?(ea.media-eb.media)/se:0, ma:ea.media, mb:eb.media, na:ea.n, nb:eb.n}; }
  function zMedia(a){ var e=est(a); if (e.n<2) return null; var v=0; a.forEach(function(x){ v+=(x-e.media)*(x-e.media); }); var se=Math.sqrt(v/(e.n-1)/e.n); return {m:e.media, z:se>0?e.media/se:0, n:e.n, sd:Math.sqrt(v/(e.n-1))}; }
  var DES_MIN_DIF=0.2; // diferença mínima (d.u. por execução) para chamar de "diferente": evita alarme por diferença irrelevante
  function leitura(t, n, maisTxt, menosTxt){ if (!t||n<MIN_N) return {txt:'poucos dados', cls:'mut'}; if (Math.abs(t.z)>=2&&Math.abs(t.dif!=null?t.dif:t.m)>=DES_MIN_DIF) return (t.dif!=null?t.dif:t.m)>0?{txt:maisTxt,cls:'acima'}:{txt:menosTxt,cls:'bom'}; return {txt:'normal',cls:''}; }
  function duMes(m){ var du=Motor.criarCalendario(state.extras||[]), p=m.split('-'), a=Math.round(Date.UTC(+p[0],+p[1]-1,1)/864e5), b=Math.round(Date.UTC(+p[0],+p[1],1)/864e5); return du(a,b); }
  function fDif(v){ return v==null||isNaN(v)?'—':(v>0?'+':'')+numBR(v,2)+' d.u.'; }

  function desVolume(X){ // pessoa -> mês -> documentos trabalhados
    var V={}, modo=svModo();
    if (modo==='ri') Object.keys(state.docs).forEach(function(m){ var pr=(state.docs[m].raw||{}).producao||{}; Object.keys(pr).forEach(function(n){ var v=pr[n], d=typeof v==='number'?v:v&&v.d; if (!d) return; var k=semAc(n); (V[k]=V[k]||{})[m]=(V[k][m]||0)+d; }); });
    else X.forEach(function(x){ (V[x.k]=V[x.k]||{})[x.m]=(V[x.k][x.m]||0)+1; });
    return V;
  }
  function desPessoas(X, J){
    var P={}, VOL=desVolume(X), PD=prodDiaria(); X.forEach(function(x){ var p=P[x.k]=P[x.k]||{k:x.k,nome:x.nome,ag:[],an:[],agAll:0,porMes:{},dvMes:{}}; p.porMes[x.m]=(p.porMes[x.m]||0)+1;
      if (x.dv!=null) (p.dvMes[x.m]=p.dvMes[x.m]||[]).push(x.dv);
      if (x.m===J.agora){ p.agAll++; if (x.dv!=null) p.ag.push(x.dv); } else if (J.antes.indexOf(x.m)>=0 && x.dv!=null) p.an.push(x.dv); });
    var duAg=duMes(J.agora);
    return Object.keys(P).map(function(k){ var p=P[k];
      p.vsEq=zMedia(p.ag); p.lEq=leitura(p.vsEq,p.ag.length,'mais lento que a equipe','mais rápido que a equipe');
      p.ritmo=zWelch(p.ag,p.an); p.lRi=p.an.length<MIN_N?{txt:'sem histórico',cls:'mut'}:leitura(p.ritmo,p.ag.length,'reduziu o ritmo','acelerou');
      var vm=VOL[k]||{}, vAg=vm[J.agora]||0, mesesAntes=J.antes.filter(function(m){ return vm[m]; }), taxa=mesesAntes.length>=2?mesesAntes.reduce(function(s,m){ return s+vm[m]/Math.max(1,duMes(m)); },0)/mesesAntes.length:null;
      p.vAg=vAg; p.volAg=vAg/Math.max(1,duAg); p.volAn=taxa; var lam=taxa!=null?taxa*duAg:null; p.porDiaAtivo=false;
      // com as execuções do VHL: documentos por DIA ATIVO (férias e afastamento não derrubam a média), comparado com a média dela por dia ativo
      var PDp=PD&&PD[k]; if (PD){ var q=PDp&&PDp.m[J.agora]; p.dAg=q?q.na:0; p.vAg=q?q.nd:0; p.duAg=duAg; p.porDiaAtivo=true; p.volAg=p.dAg?p.vAg/p.dAg:0;
        var an=J.antes.filter(function(m){ var x=PDp&&PDp.m[m]; return x&&x.na>=3; }); taxa=an.length>=2?media(an.map(function(m){ return PDp.m[m].nd/PDp.m[m].na; })):null; p.volAn=taxa; lam=taxa!=null?taxa*p.dAg:null; vAg=p.vAg; }
      p.lVol=lam==null||lam<MIN_N?{txt:'—',cls:'mut'}:((vAg-lam)/Math.sqrt(lam)<=-2&&vAg<lam*0.7)?{txt:'abaixo do normal',cls:'acima'}:((vAg-lam)/Math.sqrt(lam)>=2&&vAg>lam*1.3)?{txt:'acima do normal',cls:'bom'}:{txt:'normal',cls:''};
      return p; }).filter(function(p){ return p.agAll>0; }).sort(function(a,b){ return b.agAll-a.agAll; });
  }
  function renderDes(){
    var el=$('tabDes'); if (!el) return;
    if (svModo()==='cert'){ el.innerHTML='<div class="empty"><b>Certidões não têm etapas no VHL</b>Veja quem fez e o tempo na página Certidões.</div>'; return; }
    var X=desExecs(); if (!X.length){ el.innerHTML='<div class="empty"><b>Sem execuções de etapa</b>Importe a Produção por Etapa (PAINEL-02) e a Prazo e Tempo Médio dos meses.</div>'; return; }
    var J=desJanelas(X), P=desPessoas(X,J);
    var h='<div class="sec-h"><h2>Desempenho · '+esc(nomeMes(J.agora))+(J.parcial?' <span class="pill warn">'+esc(nomeMes(J.parcial))+' parece incompleto e ficou de fora; escolha no Período para ver</span>':'')+'</h2><span class="note">Cada execução de etapa no VHL é comparada com o que a equipe leva <b>na mesma etapa e na mesma natureza</b> (sem contar a própria pessoa). Assim quem pega atos mais difíceis não é prejudicado. A <b>linha normal</b> de cada pessoa é o desvio dela nos '+J.antes.length+' meses anteriores ('+(J.antes.length?nomeMes(J.antes[0])+' a '+nomeMes(J.antes[J.antes.length-1]):'sem histórico')+'). Só aponta diferença quando ela é real (95% de confiança) e de pelo menos '+numBR(DES_MIN_DIF,1)+' d.u. por execução.</span></div>';
    h+=desMacroHTML(X,J);
    // por pessoa
    var alertas=P.filter(function(p){ return p.lRi.cls==='acima'||p.lVol.cls==='acima'; });
    h+='<div class="sub-h" style="margin-top:18px">Por pessoa · '+esc(nomeMes(J.agora))+'</div>';
    if (alertas.length) h+='<div class="banner warn" style="margin:0 0 10px">'+alertas.map(function(p){ return '<b>'+esc(p.nome)+'</b>: '+[p.lRi.cls==='acima'?'tempo por execução acima da linha normal dela ('+fDif(p.ritmo&&p.ritmo.dif)+')':'',p.lVol.cls==='acima'?'volume abaixo do normal ('+numBR(p.volAg,1)+' por dia '+(p.porDiaAtivo?'ativo':'útil')+', normal '+numBR(p.volAn,1)+')':''].filter(Boolean).join(' e '); }).join(' · ')+'. Antes de concluir, confira férias, afastamento ou mudança de função.</div>';
    h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Pessoa</th><th class="num">Execuções</th>'+(prodDiaria()?'<th class="num" title="Dias úteis com ao menos 1 execução no VHL, de quantos dias úteis teve o mês">Dias ativos</th><th class="num" title="Documentos trabalhados ÷ dias ativos">Docs por dia ativo</th>':'<th class="num" title="'+(svModo()==='ri'?'Documentos trabalhados no VHL':'Execuções')+' por dia útil do mês">Por dia útil</th>')+'<th>Volume × normal dela</th><th class="num" title="Média de (tempo dela − tempo da equipe na mesma etapa e natureza)">× equipe</th><th>Leitura</th><th class="num" title="Desvio médio nos meses anteriores">Linha normal</th><th>Ritmo</th></tr></thead><tbody>'+
      P.map(function(p){ var nl=p.an.length?media(p.an):null, ag=p.ag.length?media(p.ag):null;
        return '<tr class="click'+(state.desSel===p.k?' sel':'')+'" data-dessel="'+esc(p.k)+'"><td>'+esc(p.nome)+'</td><td class="num">'+p.agAll+'</td>'+(p.porDiaAtivo?'<td class="num">'+p.dAg+' <span class="mut">de '+p.duAg+'</span></td><td class="num" title="'+esc(p.vAg+' documentos em '+p.dAg+' dias ativos')+'"><b>'+numBR(p.volAg,1)+'</b></td>':'<td class="num">'+numBR(p.volAg,1)+'</td>')+'<td class="'+p.lVol.cls+'">'+p.lVol.txt+(p.volAn!=null?' <span class="mut">('+numBR(p.volAn,1)+')</span>':'')+'</td><td class="num">'+fDif(ag)+'</td><td class="'+p.lEq.cls+'">'+p.lEq.txt+'</td><td class="num">'+fDif(nl)+'</td><td class="'+p.lRi.cls+'">'+p.lRi.txt+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="hint">Desvio = dias úteis da pessoa na etapa − média da equipe na mesma etapa e natureza. Negativo é mais rápido. '+(prodDiaria()?'Dia ativo = dia útil com ao menos 1 execução no VHL; "Volume × normal dela" compara os documentos por dia ativo do mês com a média dela por dia ativo nos meses anteriores, então férias não viram queda de volume. ':'(Carregando as execuções para a média por dia ativo…) ')+'Clique numa pessoa para ver a carta de controle dela.</p>';
    var sel=P.filter(function(p){ return p.k===state.desSel; })[0]; if (sel) h+=desPessoaHTML(sel,X,J);
    el.innerHTML=h;
  }
  function desCarta(p, J, irMes){
    var ms=J.ms.filter(function(m){ return m<=J.agora; }).slice(-12), base=p.an, eb=zMedia(base), cen=eb?eb.m:null, sd=eb?eb.sd:null;
    var serie=ms.map(function(m){ var v=p.dvMes[m]; return v&&v.length>=3?media(v):null; }), nM=ms.map(function(m){ return (p.dvMes[m]||[]).length; });
    var lb=function(i){ return Math.max(DES_MIN_DIF,2*sd/Math.sqrt(nM[i])); };
    var bl=ms.map(function(m,i){ return cen!=null&&nM[i]>=3?cen-lb(i):null; }), bh=ms.map(function(m,i){ return cen!=null&&nM[i]>=3?cen+lb(i):null; });
    var alerta=serie.map(function(v,i){ return v!=null&&bh[i]!=null&&(v>bh[i]||v<bl[i]); });
    return gLinhas(ms,[{nome:p.nome,cor:'var(--c1)',v:serie,alerta:alerta,extra:nM.map(function(n){ return n+' execuções'; })}],{titulo:'Carta de controle',un:'d.u.',irMes:irMes,banda:cen!=null?{lo:bl,hi:bh}:null,ref:[{v:0,nome:'equipe'}].concat(cen!=null?[{v:cen,nome:'linha normal'}]:[])});
  }
  function desPessoaHTML(p, X, J){
    var h='<div class="sub-h" style="margin-top:18px">'+esc(p.nome)+' · carta de controle</div><div class="vz-grid">';
    h+=vzCard('Desvio por mês × linha normal','faixa cinza = variação normal dela; ponto vermelho = fora da faixa',desCarta(p,J,'des'),'vz-wide');
    // por etapa: dela × equipe (box plot)
    var me=X.filter(function(x){ return x.k===p.k&&(x.m===J.agora||J.antes.indexOf(x.m)>=0); }), cnt={}; me.forEach(function(x){ cnt[x.et]=(cnt[x.et]||0)+1; });
    var top=Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a]; }).slice(0,5), g=[];
    top.forEach(function(et){ var dela=me.filter(function(x){ return x.et===et; }), nats={}; dela.forEach(function(x){ nats[x.nat]=1; });
      var eq=X.filter(function(x){ return x.et===et&&x.k!==p.k&&nats[x.nat]&&(x.m===J.agora||J.antes.indexOf(x.m)>=0); });
      var ptE=function(x){ return {v:x.pz, item:x.c, lab:x.c+' · '+x.pz+' d.u.', go:x.c?{t:'prot',c:x.c}:null, tip:'<b>Protocolo '+esc(x.c||'—')+'</b><br>'+esc(x.nome)+' · '+esc(et)+'<br>'+esc(x.nat)+'<br>'+x.pz+' d.u. na etapa'+(x.esp!=null?' · equipe '+numBR(x.esp,1):'')}; };
      var et2=et.length>22?et.slice(0,21)+'…':et; g.push({nome:et2+' · dela',cor:'var(--c1)',pts:dela.map(ptE),sub:dela.length+' execuções'}); g.push({nome:et2+' · equipe',cor:'var(--c2)',pts:eq.map(ptE),sub:eq.length+' execuções (mesmas naturezas)'}); });
    h+=vzCard('Dias úteis na etapa · dela × equipe','últimos '+(J.antes.length+1)+' meses, mesmas naturezas',gBox(g,{un:'d.u.',pl:230,tipoLista:'prots'}),'vz-wide');
    // tabela etapa × natureza
    var cel={}; me.filter(function(x){ return x.dv!=null; }).forEach(function(x){ var k=x.et+'|'+x.nat, c=cel[k]=cel[k]||{et:x.et,nat:x.nat,v:[],e:[]}; c.v.push(x.pz); c.e.push(x.esp); });
    var cl=Object.keys(cel).map(function(k){ return cel[k]; }).sort(function(a,b){ return b.v.length-a.v.length; }).slice(0,15);
    h+='</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Etapa</th><th>Natureza</th><th class="num">Execuções</th><th class="num">Dela (média)</th><th class="num">Equipe (média)</th><th class="num">Diferença</th></tr></thead><tbody>'+
      cl.map(function(c){ var a=media(c.v), b=media(c.e), d=a-b; return '<tr><td>'+esc(c.et)+'</td><td>'+esc(c.nat)+'</td><td class="num">'+c.v.length+'</td><td class="num">'+numBR(a,1)+'</td><td class="num">'+numBR(b,1)+'</td><td class="num '+(c.v.length>=5&&d>=0.5?'acima':c.v.length>=5&&d<=-0.5?'bom':'')+'">'+fDif(d)+'</td></tr>'; }).join('')+'</tbody></table></div>';
    return h;
  }
  // tendência da equipe: etapa a etapa e o protocolo inteiro, "antes × agora"
  function desMacroHTML(X, J){
    var ms=J.ms.filter(function(m){ return m<=J.agora; }).slice(-12), h='<div class="sub-h">Equipe · antes × agora</div>';
    // protocolo inteiro
    var prot=desProtocolos(), ag=prot.filter(function(x){ return x.m===J.agora; }), an=prot.filter(function(x){ return J.antes.indexOf(x.m)>=0; });
    var tB=zWelch(ag.map(function(x){ return x.b; }),an.map(function(x){ return x.b; })), tL=zWelch(ag.filter(function(x){ return x.l!=null; }).map(function(x){ return x.l; }),an.filter(function(x){ return x.l!=null; }).map(function(x){ return x.l; }));
    function tile(nome,t,sub){ if (!t) return kpi(nome,'—','poucos dados'); var l=leitura(t,t.na,'piorou','melhorou'); return kpi(nome,numBR(t.mb,1)+' → '+numBR(t.ma,1)+' <small style="font-size:.9rem">d.u.</small>','antes → agora (média) · <span class="'+(l.cls==='acima'?'gm-mau':l.cls==='bom'?'gm-bom':'')+'">'+(l.txt==='normal'?'sem mudança real':l.txt)+'</span> · '+sub); }
    h+='<div class="kpis" style="margin-bottom:10px">'+tile('Protocolo · tempo total (bruto)',tB,ag.length+' agora × '+an.length+' antes')+(tL?tile('Protocolo · tempo com o cartório (líquido)',tL,'sem a espera do cliente'):'')+
      (function(){ var t=zWelch(X.filter(function(x){ return x.m===J.agora; }).map(function(x){ return x.dvG; }),X.filter(function(x){ return J.antes.indexOf(x.m)>=0; }).map(function(x){ return x.dvG; })); if (!t) return ''; var l=leitura(t,t.na,'equipe mais lenta','equipe mais rápida');
        return kpi('Etapas · mesmo mix de atos',fDif(t.dif),'por execução, agora × antes · <span class="'+(l.cls==='acima'?'gm-mau':l.cls==='bom'?'gm-bom':'')+'">'+(l.txt==='normal'?'sem mudança real':l.txt)+'</span>'); })()+'</div>';
    // etapas: top 6 por volume
    var cnt={}; X.forEach(function(x){ if (x.m===J.agora||J.antes.indexOf(x.m)>=0) cnt[x.et]=(cnt[x.et]||0)+1; });
    var top=Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a]; }).slice(0,8);
    var linhas=top.map(function(et){ var a=X.filter(function(x){ return x.et===et&&x.m===J.agora; }), b=X.filter(function(x){ return x.et===et&&J.antes.indexOf(x.m)>=0; });
      var t=zWelch(a.map(function(x){ return x.dvG; }),b.map(function(x){ return x.dvG; })), ma=media(a.map(function(x){ return x.pz; })), mb=media(b.map(function(x){ return x.pz; }));
      var quem=null; if (t&&t.dif>0){ var pp={}; a.forEach(function(x){ var q=pp[x.k]=pp[x.k]||{nome:x.nome,s:0}; q.s+=x.dvG; }); var best=Object.keys(pp).sort(function(u,v){ return pp[v].s-pp[u].s; })[0]; if (best&&pp[best].s>0) quem=pp[best].nome; }
      return {et:et, na:a.length, nb:b.length, ma:ma, mb:mb, t:t, l:leitura(t,a.length,'piorou','melhorou'), quem:quem}; });
    h+='<div class="vz-grid">'+vzCard('Dias úteis por etapa · média mensal','etapas com mais execuções',gLinhas(ms,top.slice(0,6).map(function(et,i){ return {nome:et,cor:CAT[i],v:ms.map(function(m){ var v=X.filter(function(x){ return x.et===et&&x.m===m; }).map(function(x){ return x.pz; }); return v.length>=5?media(v):null; })}; }),{titulo:'Dias por etapa',un:'d.u.',zero:true,rotulos:false,irMes:'des'}),'vz-wide')+
      vzCard('Protocolo · tempo até o registro','mediana e média por mês',gLinhas(ms,[{nome:'Mediana',cor:'var(--c1)',v:ms.map(function(m){ var v=prot.filter(function(x){ return x.m===m; }).map(function(x){ return x.b; }); return v.length?mediana(v):null; })},{nome:'Média',cor:'var(--c2)',tracejado:true,v:ms.map(function(m){ var v=prot.filter(function(x){ return x.m===m; }).map(function(x){ return x.b; }); return v.length?media(v):null; })}],{titulo:'Tempo do protocolo',un:'d.u.',zero:true,irMes:'des'}),'vz-wide')+'</div>';
    h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Etapa</th><th class="num">Antes (média)</th><th class="num">Agora (média)</th><th class="num">Variação</th><th class="num" title="Mudança descontando a troca de naturezas">Mesmo mix</th><th>Leitura</th><th>Maior contribuição</th></tr></thead><tbody>'+
      linhas.map(function(r){ var vp=r.mb?((r.ma-r.mb)/r.mb*100):null; return '<tr><td>'+esc(r.et)+' <span class="mut">('+r.na+' agora)</span></td><td class="num">'+numBR(r.mb,1)+'</td><td class="num">'+numBR(r.ma,1)+'</td><td class="num">'+(vp==null||!isFinite(vp)?'—':(vp>0?'+':'')+numBR(vp,0)+'%')+'</td><td class="num">'+fDif(r.t&&r.t.dif)+'</td><td class="'+r.l.cls+'">'+(r.l.txt==='normal'?'sem mudança real':r.l.txt)+'</td><td>'+(r.l.cls==='acima'&&r.quem?esc(r.quem):'<span class="mut">·</span>')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    return h;
  }
  // tempo do protocolo inteiro: RI (bruto e líquido dos registrados) e demais atribuições (dias úteis do ingresso à finalização)
  function desProtocolos(){
    var modo=svModo(), out=[];
    if (modo==='ri'||modo==='todas') Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.filter(origOk).forEach(function(a){ if (a.cat==='R'&&a.bruto!=null&&!justDe(a)) out.push({m:m,b:a.bruto,l:a.liq}); }); });
    if (modo==='serv'||modo==='todas') Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ if (modo==='serv'&&!docOk(d)) return; if (svDe(d.t)==='Apoio') return; var v=servDu(d); if (v!=null) out.push({m:m,b:v,l:null}); }); });
    return out;
  }

  // ═════════ modo visual: o painel em gráficos (segue Serventia e Período do topo) ═════════
  function renderVis(){
    var el=$('tabVis'); if (!el) return; var modo=svModo(), ms=mesesGraficos(), cards=[];
    var per=nomePeriodo();
    if (modo==='ri'||modo==='cert'){
      aplicarTri7(); var atos=todosAtos(), r=resumo(atos), msR=ms.filter(function(m){ return state.docs[m]; });
      if (modo==='ri'){
        cards.push(vzCard('Volume de protocolos','atos por mês · clique no mês para ver só ele em Por natureza',gLinhas(msR,[{nome:'Atos',cor:'var(--c1)',v:msR.map(function(m){ return atosDoMes(m).length; })}],{titulo:'Volume',area:true,irMes:'nat'}),'vz-wide'));
        cards.push(vzCard('KPI-02 · no prazo','% por mês · clique no mês para ver os fora do prazo',gLinhas(msR,[{nome:'No prazo',cor:'var(--c1)',v:msR.map(function(m){ var x=resumo(atosDoMes(m)); return x.n?x.kpi:null; })}],{titulo:'KPI-02',un:'%',W:360,H:210,irMes:'fp'})));
        var tud=atos.filter(function(a){ return a.cat==='R'||a.cat==='N'; }), cenL=tud.filter(function(a){ return origemAto(a)==='central'; }), balL=tud.filter(function(a){ return origemAto(a)!=='central'; });
        cards.push(vzCard('Origem dos protocolos',per+' · clique na fatia para listar',gRosca([{nome:'Balcão',v:balL.length,cor:'var(--c1)',go:goLista('Protocolos de balcão','atos',balL)},{nome:'Central (ONR)',v:cenL.length,cor:'var(--c2)',go:goLista('Protocolos da central (ONR)','atos',cenL)}],{titulo:'Origem'})));
        var R=r.Rall, E0=R.filter(function(a){ return !a.nex; }), E1=R.filter(function(a){ return a.nex===1; }), E2=R.filter(function(a){ return a.nex>=2; });
        cards.push(vzCard('Exigências por título registrado',per+' · clique na fatia para listar',gRosca([{nome:'Sem exigência',v:E0.length,cor:'var(--c3)',go:goLista('Registrados sem exigência','atos',E0)},{nome:'1 exigência',v:E1.length,cor:'var(--c4)',go:goLista('Registrados com 1 exigência','atos',E1)},{nome:'2 ou mais',v:E2.length,cor:'var(--c2)',go:goLista('Registrados com 2 ou mais exigências','atos',E2)}],{titulo:'Exigências',centro:pct(R.length?E0.length/R.length*100:null),sub:'1ª qualificação'})));
        var nat={}; atos.forEach(function(a){ var n=nat[a.nat]=nat[a.nat]||{n:0,b:[],R:[]}; n.n++; if (a.cat==='R'&&a.bruto!=null){ n.b.push(a.bruto); n.R.push(a); } });
        var topN=Object.keys(nat).sort(function(a,b){ return nat[b].n-nat[a].n; });
        cards.push(vzCard('Naturezas com mais protocolos',per+' · clique para abrir a natureza',gBarrasH(topN.slice(0,10).map(function(k){ return {nome:k,v:nat[k].n,go:goNatRI(k)}; }))));
        cards.push(vzCard('Dias úteis até o registro · por natureza','box plot · linha vermelha = 20 d.u. · cada ponto é um protocolo fora do padrão (clique abre a ficha) · clique na linha para abrir a natureza',
          gBox(topN.slice(0,8).filter(function(k){ return nat[k].b.length>=3; }).map(function(k){ return {nome:k,pts:nat[k].R.map(function(a){ return ptAto(a,a.bruto); }),sub:nat[k].b.length+' registrados',go:goNatRI(k)}; }),{un:'d.u.',ref:20,pl:200,tipoLista:'atos'}),'vz-wide'));
        cards.push(vzCard('Distribuição do tempo até o registro','histograma · todos os registrados · clique na coluna para listar os protocolos',gHisto(r.R.map(function(a){ return a.bruto; }),{un:'d.u.',passo:1,max:30,lim:20,xl:'dias úteis brutos',itens:r.R,tipoLista:'atos',nomeLista:'tempo até o registro'}),'vz-wide'));
        cards.push(vzCard('Volume × tempo por natureza','dispersão · cada ponto é uma natureza · clique para abrir',gDispersao(topN.filter(function(k){ return nat[k].b.length>=3; }).map(function(k,i){ return {nome:k,x:nat[k].n,y:mediana(nat[k].b),rot:i<5?nat[k].n:0,extra:nat[k].b.length+' registrados',go:goNatRI(k)}; }),{xl:'protocolos no período (escala log)',yl:'mediana d.u.',logX:true,refY:20,refYNome:'prazo 20 d.u.',quem:'natureza'}),'vz-wide'));
      }
      // certidões
      var all=certCalc(certRecs()), hum=all.filter(function(x){ return x.u&&!/^tri7$/i.test(x.u); }), auto=[], temAuto=false;
      Object.keys(state.cert).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m){ var rw=state.cert[m].raw||{}; if (rw.auto){ temAuto=true; auto=auto.concat(rw.auto); } } });
      if (all.length){
        cards.push(vzCard('Certidões · de onde vêm',per+' · balcão × central',certOrigemRosca(all)));
        if (temAuto) cards.push(vzCard('Certidões · quem fez',per,gRosca([{nome:'Escreventes',v:hum.length,cor:'var(--c1)',go:goLista('Certidões feitas por escreventes','cert',hum)},{nome:'Automáticas (Tri7)',v:auto.length,cor:'var(--c2)',go:goLista('Certidões automáticas (Tri7)','cods',auto)}],{titulo:'Certidões'})));
        var pc={}; hum.forEach(function(x){ pc[x.u]=(pc[x.u]||0)+1; });
        cards.push(vzCard('Certidões por escrevente','quem gerou o selo · clique para o relatório individual',gBarrasH(Object.keys(pc).sort(function(a,b){ return pc[b]-pc[a]; }).slice(0,10).map(function(k){ return {nome:k,v:pc[k],go:goPessoa(k)}; }))));
        cards.push(vzCard('Horas úteis até a certidão','box plot · balcão × central · cada ponto é um pedido',certBox(all.filter(function(x){ return !x.intim; })),'vz-wide'));
      }
    } else {
      var D=selDocs(), msS=ms.filter(function(m){ return state.serv[m]; });
      var docsMes=function(m){ return selDocsMes(m).filter(function(d){ return svDe(d.t)!=='Apoio'; }); };
      if (modo==='todas'){
        var sv=['RI','RC','RTD/PJ'];
        cards.push(vzCard('Produção por serventia','colunas empilhadas · % do mês · clique no segmento para ver só aquela serventia no mês',graficoBarras(msS,sv.map(function(s,i){ return {nome:s,cor:CAT[i],v:msS.map(function(m){ var n=(state.serv[m]||[]).filter(function(d){ return svDe(d.t)===s; }).length; if (s==='RI'&&state.docs[m]) n+=state.docs[m].atos.length; return n; })}; }),{titulo:'Produção por serventia',goMes:function(m){ return goMes(m,'vis'); },goSeg:function(m,i,se){ return {t:'sv',sv:se.nome,m:m}; }}),'vz-wide'));
        var tot={}; sv.forEach(function(s){ tot[s]=0; }); D=servDocs('__todas').filter(function(d){ return svDe(d.t)!=='Apoio'; }); D.forEach(function(d){ var s=svDe(d.t); if (tot[s]!=null) tot[s]++; }); tot.RI+=todosAtos().length;
        cards.push(vzCard('Participação na produção',per+' · clique para ver só a serventia',gRosca(sv.map(function(s,i){ return {nome:s,v:tot[s],cor:CAT[i],go:{t:'sv',sv:s}}; }),{titulo:'Participação'})));
      } else {
        cards.push(vzCard('Volume','documentos por mês · clique no mês para ver só ele',gLinhas(msS,[{nome:'Documentos',cor:'var(--c1)',v:msS.map(function(m){ return docsMes(m).length; })}],{titulo:'Volume',area:true,irMes:'nat'}),'vz-wide'));
        cards.push(vzCard('No prazo legal','% por mês (naturezas com prazo definido) · clique no mês',gLinhas(msS,[{nome:'No prazo',cor:'var(--c1)',v:msS.map(function(m){ var c=docsMes(m).filter(function(d){ return servPrazo(d)!=null; }); return c.length?c.filter(servOk).length/c.length*100:null; })}],{titulo:'No prazo',un:'%',W:360,H:210,irMes:'fp'})));
      }
      D=D.filter(function(d){ return svDe(d.t)!=='Apoio'; });
      var nt={}; D.forEach(function(d){ var n=nt[d.nat]=nt[d.nat]||{n:0,v:[],D:[]}; n.n++; var v=servDu(d); if (v!=null){ n.v.push(v); n.D.push(d); } });
      var tn=Object.keys(nt).sort(function(a,b){ return nt[b].n-nt[a].n; }), todosD=[].concat.apply([],tn.map(function(k){ return nt[k].D; }));
      var goNt=function(k){ return modo==='todas'?null:goNatServ(k,D); };
      cards.push(vzCard('Naturezas com mais documentos',per+(modo==='todas'?'':' · clique para abrir a natureza'),gBarrasH(tn.slice(0,10).map(function(k){ return {nome:k,v:nt[k].n,go:goNt(k)}; }))));
      cards.push(vzCard('Dias úteis do ingresso à finalização · por natureza','box plot · cada ponto é um documento fora do padrão (clique abre a ficha)',gBox(tn.slice(0,8).filter(function(k){ return nt[k].v.length>=3; }).map(function(k){ return {nome:k,pts:nt[k].D.map(function(d){ return ptDoc(d,servDu(d)); }),sub:nt[k].n+' documentos',go:goNt(k)}; }),{un:'d.u.',pl:220,tipoLista:'docs'}),'vz-wide'));
      cards.push(vzCard('Distribuição do tempo','histograma · clique na coluna para listar os documentos',gHisto(todosD.map(servDu),{un:'d.u.',xl:'dias úteis',itens:todosD,tipoLista:'docs',nomeLista:'tempo até finalizar'}),'vz-wide'));
      cards.push(vzCard('Volume × tempo por natureza','dispersão · cada ponto é uma natureza',gDispersao(tn.filter(function(k){ return nt[k].v.length>=3; }).map(function(k,i){ return {nome:k,x:nt[k].n,y:mediana(nt[k].v),rot:i<5?nt[k].n:0,go:goNt(k)}; }),{xl:'documentos (escala log)',yl:'mediana d.u.',logX:true,quem:'natureza'}),'vz-wide'));
    }
    // pessoas: produção × inconformidades
    var RD=relDados(), pts=Object.keys(RD.P).map(function(k){ var p=RD.P[k], inc=((RD.I[k]||{}).recs||[]).length; return p.docs>=MIN_PROD?{nome:p.nome,x:p.docs,y:inc/p.docs*100,rot:p.docs,extra:inc+' inconformidades',go:goPessoa(p.nome)}:null; }).filter(Boolean);
    var prodP=Object.keys(RD.P).map(function(k){ return {nome:RD.P[k].nome,v:RD.P[k].docs,go:goPessoa(RD.P[k].nome)}; }).filter(function(x){ return x.v; }).sort(function(a,b){ return b.v-a.v; }).slice(0,12);
    if (prodP.length) cards.push(vzCard('Produção por pessoa','documentos trabalhados no VHL · clique para o relatório individual',gBarrasH(prodP)));
    if (pts.length>=2) cards.push(vzCard('Produção × inconformidades','dispersão · cada ponto é uma pessoa com '+MIN_PROD+'+ documentos · clique para o relatório',gDispersao(pts,{xl:'documentos trabalhados',yl:'% inconformidades',unY:'%',nRot:6,quem:'pessoa'}),'vz-wide'));
    if (modo!=='cert'){ var X=desExecs(); if (X.length){ var J=desJanelas(X), P=desPessoas(X,J).filter(function(p){ return p.ag.length>=MIN_N; });
      if (P.length) cards.push(vzCard('Ritmo × equipe · '+nomeMes(J.agora),'d.u. por execução vs equipe (mesma etapa e natureza) · negativo = mais rápido · clique para a carta de controle',gBarrasH(P.map(function(p){ return {nome:p.nome,v:Math.round(media(p.ag)*100)/100,cor:media(p.ag)>DES_MIN_DIF?'var(--c2)':'var(--c1)',extra:p.ag.length+' execuções · '+p.lEq.txt,go:{t:'des',k:p.k}}; }).sort(function(a,b){ return a.v-b.v; }),{un:''}))); } }
    var h='<div class="sec-h"><span class="note">Os mesmos números das outras páginas, em gráfico. Segue a Serventia e o Período do topo ('+esc(per)+'). Passe o mouse para ver os valores; clique (no celular, toque duas vezes) para ir ao dado de origem.</span></div>';
    el.innerHTML=h+(cards.length?'<div class="vz-grid">'+cards.join('')+'</div>':'<div class="empty">Sem dados para o período.</div>');
  }

  // ═════════ v1.9: visão "Visual" de cada página (chave Tabela | Visual no título) ═════════
  var VIS_DICA='<p class="vis-dica">Clique (ou toque duas vezes) em barra, fatia, coluna, ponto ou mês para ir ao dado de origem. Segue a Serventia e o Período do topo.</p>';
  function visGrade(cards){ return VIS_DICA+(cards.length?'<div class="vz-grid">'+cards.join('')+'</div>':'<div class="empty">Sem dados para o período.</div>'); }
  // mapa de calor genérico · linhas/colunas [{k,nome,curto?,go?,tip?}] · cel(linha,coluna) -> {v, txt?, tip, go}
  function gMapa(linhas, colunas, cel){
    var vals=[]; linhas.forEach(function(r){ colunas.forEach(function(c){ var x=cel(r,c); if (x&&x.v) vals.push(x.v); }); });
    var mx=vals.length?Math.max.apply(null,vals):1, MIX=[10,24,40,60,82];
    return '<div class="tbl-wrap"><table class="hm"><thead><tr><th></th>'+colunas.map(function(c){ return '<th title="'+esc(c.nome)+'">'+esc(c.curto||c.nome)+'</th>'; }).join('')+'</tr></thead><tbody>'+
      linhas.map(function(r){ return '<tr><th class="hm-r"'+(r.tip?' data-tip="'+esc(r.tip)+'"':'')+goAttr(r.go)+'>'+esc(r.nome)+'</th>'+colunas.map(function(c){ var x=cel(r,c)||{};
        if (!x.v) return '<td class="hmc"></td>'; var b=Math.max(0,Math.min(4,Math.floor(x.v/mx*5-1e-9)));
        return '<td class="hmc b'+b+'" style="background:color-mix(in srgb, var(--brand) '+MIX[b]+'%, var(--surface))" data-tip="'+esc(x.tip||'')+'"'+goAttr(x.go)+'>'+(x.txt!=null?x.txt:x.v)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
  }
  function abrev(s,n){ s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s; }

  // ——— Inconformidades
  function visK1(atos){
    var A=atrAtual(), todos=incTodos(), filtro=function(r){ return A!=='RI'?incOk(r):(state.incSetor==='todos'||r.t==='RI'); }, recs=incRecs().filter(filtro), per=nomePeriodo(), cards=[];
    if (!recs.length) return '<div class="empty">Sem inconformidades no período com este filtro.</div>';
    var pc={}; recs.forEach(function(r){ var c=catDe(r); (pc[c]=pc[c]||[]).push(r); });
    var cats=Object.keys(pc).sort(function(a,b){ return pc[b].length-pc[a].length; });
    cards.push(vzCard('Erros por tipo',per+' · '+recs.length+' registros',gBarrasH(cats.map(function(c){ return {nome:c, v:pc[c].length, extra:pct(pc[c].length/recs.length*100)+' dos registros', go:goLista('Erro: '+c,'inc',pc[c])}; }))));
    var I=recs.filter(function(r){ return grupoDe(r)!=='E'; }), E=recs.filter(function(r){ return grupoDe(r)==='E'; });
    cards.push(vzCard('Interno × externo',per+' · externo = o erro saiu do cartório',gRosca([{nome:'Interno',v:I.length,cor:'var(--c1)',go:goLista('Inconformidades internas','inc',I)},{nome:'Externo',v:E.length,cor:'var(--c2)',go:goLista('Inconformidades externas','inc',E)}],{titulo:'Interno × externo',sub:'registros'})));
    var ms=Object.keys(state.inconf).sort().slice(-12), porM=ms.map(function(m){ return (state.inconf[m]||[]).filter(filtro); });
    cards.push(vzCard('Registros por mês','todos os meses importados · clique no mês para ver só ele',gLinhas(ms,[{nome:'Registros',cor:'var(--c1)',v:porM.map(function(x){ return x.length; }),extra:porM.map(function(x){ return x.filter(function(r){ return grupoDe(r)==='E'; }).length+' externos'; })}],{titulo:'Registros por mês',zero:true,area:true,irMes:'k1'}),'vz-wide'));
    if (A==='RI'){ var msR=Object.keys(state.docs).sort().slice(-12), kv=msR.map(function(m){ return kpi1Mes(state.docs[m].atos,todos); });
      cards.push(vzCard('KPI-01 · atos com inconformidade','% dos atos RI registrados no mês',gLinhas(msR,[{nome:'KPI-01',cor:'var(--c2)',v:kv.map(function(q){ return q.k; }),extra:kv.map(function(q){ return q.c+' de '+q.n+' atos'; })}],{titulo:'KPI-01',un:'%',zero:true,ref:[{v:metaDe('KPI-01',16.5),nome:'meta'}],irMes:'k1'}),'vz-wide')); }
    // pessoa × tipo
    var pes={}; recs.forEach(function(r){ if (r.r) (pes[r.r]=pes[r.r]||[]).push(r); });
    var pk=Object.keys(pes).sort(function(a,b){ return pes[b].length-pes[a].length; }).slice(0,15), ck=cats.slice(0,8);
    if (pk.length) cards.push(vzCard('Pessoa × tipo de erro','as 15 pessoas e os 8 erros com mais registros · mais escuro = mais registros · clique no número para listar, no nome para o relatório',
      gMapa(pk.map(function(p){ return {k:p, nome:p, tip:'<b>'+esc(p)+'</b><br>'+pes[p].length+' registros no período', go:goPessoa(p)}; }), ck.map(function(c){ return {k:c, nome:c, curto:abrev(c,16)}; }),
        function(r,c){ var L=pes[r.k].filter(function(x){ return catDe(x)===c.k; }); return L.length?{v:L.length, tip:'<b>'+esc(r.k)+'</b><br>'+esc(c.k)+': '+L.length, go:goLista(r.k+' · '+c.k,'inc',L)}:null; }),'vz-wide'));
    // taxa × produção
    var RD=relDados(), pts=Object.keys(RD.P).map(function(k){ var p=RD.P[k], inc=((RD.I[k]||{}).recs||[]).filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }).length, lt=RD.LT[k];
      return p.docs>=MIN_PROD?{nome:p.nome, x:p.docs, y:inc/p.docs*100, rot:p.docs, cor:lt&&lt.sig==='acima'?'var(--c2)':'var(--c1)', extra:inc+' inconformidades'+(lt?' · '+lt.txt:''), go:goPessoa(p.nome)}:null; }).filter(Boolean);
    if (pts.length>=2) cards.push(vzCard('Taxa × produção por pessoa','cada ponto é uma pessoa com '+MIN_PROD+'+ documentos · laranja = acima do esperado para o volume dela',gDispersao(pts,{xl:'documentos trabalhados no VHL',yl:'% de inconformidades',unY:'%',nRot:6,quem:'pessoa',refY:RD.taxaEq,refYNome:'média da equipe'}),'vz-wide'));
    return visGrade(cards);
  }

  // ——— Atendimento
  function visAtend(L){
    var cards=[], at=L.filter(function(s){ return s.c!=null&&s.e!=null; }), per=nomePeriodo();
    if (!at.length) return '<div class="empty">Sem senhas chamadas no período.</div>';
    var FX=[[0,30,'até 30 s'],[30,60,'30 s a 1 min'],[60,120,'1 a 2 min'],[120,300,'2 a 5 min'],[300,600,'5 a 10 min'],[600,900,'10 a 15 min'],[900,1e9,'15 min ou mais']];
    cards.push(vzCard('Espera até a chamada · por faixa',per+' · laranja = 10 min ou mais (gatilho do PCA) · clique para listar as senhas',gBarrasH(FX.map(function(f){ var L2=at.filter(function(s){ return s.e>=f[0]&&s.e<f[1]; }); return {nome:f[2], v:L2.length, cor:f[0]>=600?'var(--c2)':'var(--c1)', extra:pct(L2.length/at.length*100)+' das senhas chamadas', go:goLista('Espera '+f[2],'senhas',L2)}; }))));
    // dia da semana × hora
    var cel={}, horas={}; L.forEach(function(s){ var hr=Math.floor(s.g/3600), k=s.dw+'_'+hr, c=cel[k]=cel[k]||{L:[],es:[]}; c.L.push(s); if (s.c!=null&&s.e!=null) c.es.push(s.e); horas[hr]=(horas[hr]||0)+1; });
    var hs=Object.keys(horas).map(Number).filter(function(h){ return horas[h]>=Math.max(5,L.length*0.005); }).sort(function(a,b){ return a-b; });
    cards.push(vzCard('Quando aperta · espera média (min)','dia da semana × hora da emissão · clique na célula para listar as senhas',gMapa([1,2,3,4,5].map(function(dw){ return {k:dw, nome:DSEM[dw]}; }), hs.map(function(h){ return {k:h, nome:h+'h'}; }),
      function(r,c){ var x=cel[r.k+'_'+c.k]; if (!x||!x.es.length) return null; var m=media(x.es)/60; return {v:Math.max(0.01,m), txt:numBR(m,1), tip:'<b>'+DSEM[r.k]+' · '+c.k+'h–'+(c.k+1)+'h</b><br>'+x.L.length+' senhas · espera média '+fmtMS(media(x.es))+'<br>≥ 10 min: '+x.es.filter(function(e){ return e>=600; }).length, go:goLista(DSEM[r.k]+' '+c.k+'h · senhas','senhas',x.L)}; }),'vz-wide'));
    // por atendente
    var P={}; L.forEach(function(s){ if (!s.at||s.c==null||s.t==null||s.t>3600) return; (P[s.at]=P[s.at]||[]).push(s); });
    var ak=Object.keys(P).filter(function(k){ return P[k].length>=MIN_N; }).sort(function(a,b){ return P[b].length-P[a].length; }).slice(0,12);
    if (ak.length) cards.push(vzCard('Tempo de atendimento por atendente','minutos, da chamada à finalização · clique no nome para o relatório individual · pontos = atendimentos fora do padrão',
      gBox(ak.map(function(k,i){ return {nome:k, cor:'var(--c1)', sub:P[k].length+' atendimentos', go:goPessoa(k), pts:P[k].map(function(s){ return {v:s.t/60, item:s, lab:fmtData(s.dia)+' '+hhmm(s.c)+' · '+fmtMS(s.t), tip:'<b>'+esc(k)+'</b><br>'+fmtData(s.dia)+' às '+hhmm(s.c)+' · '+esc(s.fila)+'<br>Atendimento: '+fmtMS(s.t)}; })}; }),{un:'min',pl:260,tipoLista:'senhas'}),'vz-wide'));
    // mês a mês (todas as senhas, não só o período)
    var ms=Object.keys(state.senhas).sort().slice(-12), Rm=ms.map(function(m){ return senhasResumo(state.senhas[m].L.filter(senhaOk)); });
    cards.push(vzCard((k13Of()?'KPI-13 · espera média':'Espera média · '+esc(selNome()))+' por mês','minutos · clique no mês para ver só ele',gLinhas(ms,[{nome:'Espera média',cor:'var(--c1)',v:Rm.map(function(r){ return r.med!=null?r.med/60:null; }),extra:Rm.map(function(r){ return r.na+' senhas'; })}],{titulo:'Espera média',zero:true,irMes:'at',W:360,H:210})));
    cards.push(vzCard('Senhas com espera ≥ 10 min','% das senhas chamadas no mês',gLinhas(ms,[{nome:'≥ 10 min',cor:'var(--c2)',v:Rm.map(function(r){ return r.na?r.a10/r.na*100:null; }),extra:Rm.map(function(r){ return r.a10+' senhas'; })}],{titulo:'Espera ≥ 10 min',un:'%',zero:true,irMes:'at',W:360,H:210})));
    var F={}; L.forEach(function(s){ (F[s.fila]=F[s.fila]||[]).push(s); });
    cards.push(vzCard('Espera média por fila',per+' · clique para listar as senhas da fila',gBarrasH(Object.keys(F).map(function(f){ var r=senhasResumo(F[f]); return {nome:f, v:r.med!=null?Math.round(r.med/6)/10:0, extra:F[f].length+' senhas · '+fmtMS(r.med)+' em média', go:goLista('Fila '+f,'senhas',F[f])}; }).sort(function(a,b){ return b.v-a.v; }),{un:'min'})));
    return visGrade(cards);
  }

  // ——— Certidões (box plot balcão × central usado aqui e no Modo visual)
  function certBox(C){
    var B=C.filter(function(x){ return x.origem==='Balcão'; }), O=C.filter(function(x){ return x.origem!=='Balcão'; });
    function pts(L){ return L.map(function(c){ return {v:c.hu, item:c, lab:c.p+' · '+fmtH(c.hu), tip:'<b>Pedido '+esc(c.p)+'</b><br>'+esc(c.tipo)+'<br>'+fmtH(c.hu)+' úteis · prazo '+fmtLim(c.lim)+'<br>Selo gerado por '+esc(c.u||'—')}; }); }
    return gBox([{nome:'Balcão',cor:'var(--c1)',pts:pts(B),sub:B.length+' pedidos',go:goLista('Certidões de balcão','cert',B)},{nome:'Central / online',cor:'var(--c2)',pts:pts(O),sub:O.length+' pedidos',go:goLista('Certidões da central','cert',O)}],{un:'h',pl:130,tipoLista:'cert'});
  }
  function visCer(){
    var all=certCalc(certRecs()), hum=all.filter(function(x){ return x.u&&!/^tri7$/i.test(x.u); }), C=all.filter(function(x){ return !x.intim; }), per=nomePeriodo(), cards=[];
    if (!all.length) return '<div class="empty">Sem certidões no período.</div>';
    var AP=certAutoPeriodo(), auto=AP.L, temAuto=AP.tem;
    cards.push(vzCard('De onde vêm os pedidos',per+' · balcão × central · clique na fatia para listar',certOrigemRosca(all)));
    var Bt={}; all.filter(function(x){ return x.origem==='Balcão'; }).forEach(function(x){ (Bt[x.tipo]=Bt[x.tipo]||[]).push(x); }); var btk=Object.keys(Bt).sort(function(a,b){ return Bt[b].length-Bt[a].length; });
    cards.push(vzCard('Balcão · por tipo de certidão',per+' · clique na fatia para listar',gRosca(btk.slice(0,5).map(function(k,i){ return {nome:k,v:Bt[k].length,cor:CAT[i],go:goLista('Balcão · '+k,'cert',Bt[k])}; }).concat(btk.length>5?[{nome:'Outros tipos',v:btk.slice(5).reduce(function(s2,k){ return s2+Bt[k].length; },0),cor:'var(--c6)',go:goLista('Balcão · outros tipos','cert',[].concat.apply([],btk.slice(5).map(function(k){ return Bt[k]; })))}]:[]),{titulo:'Balcão por tipo',sub:'balcão'})));
    var om=certOrigemMensal(); if (om) cards.push(vzCard('Fluxo por mês · balcão × central','colunas empilhadas · clique no segmento para listar',om,'vz-wide'));
    if (temAuto) cards.push(vzCard('Quem fez as certidões',per,gRosca([{nome:'Escreventes',v:hum.length,cor:'var(--c1)',go:goLista('Certidões feitas por escreventes','cert',hum)},{nome:'Automáticas (Tri7)',v:auto.length,cor:'var(--c2)',go:goLista('Certidões automáticas (Tri7)','cods',auto)}],{titulo:'Quem fez',sub:'certidões'})));
    var pc={}; hum.forEach(function(x){ (pc[x.u]=pc[x.u]||[]).push(x); });
    cards.push(vzCard('Certidões por escrevente','quem gerou o selo · clique para o relatório individual',gBarrasH(Object.keys(pc).sort(function(a,b){ return pc[b].length-pc[a].length; }).slice(0,12).map(function(k){ var L=pc[k].filter(function(x){ return !x.intim; }), ok=L.filter(function(x){ return x.ok; }).length; return {nome:k, v:pc[k].length, extra:L.length?pct(ok/L.length*100)+' no prazo':'fluxo de intimação', go:goPessoa(k)}; }))));
    cards.push(vzCard('Horas úteis até a certidão','balcão × central · pontos = pedidos fora do padrão (clique no fim da linha para listar os que passam do eixo)',certBox(C),'vz-wide'));
    var ms=Object.keys(state.cert).sort().slice(-12), pm=ms.map(function(m){ var a=certCalc(state.cert[m].recs).filter(function(x){ return !x.intim; }); return {n:a.length, ok:a.filter(function(x){ return x.ok; }).length}; });
    cards.push(vzCard('Certidões no prazo por mês','% dos pedidos concluídos no mês · clique no mês para ver só ele',gLinhas(ms,[{nome:'No prazo',cor:'var(--c1)',v:pm.map(function(x){ return x.n?x.ok/x.n*100:null; }),extra:pm.map(function(x){ return x.ok+' de '+x.n; })}],{titulo:'No prazo',un:'%',irMes:'cer'}),'vz-wide'));
    var g={}; C.forEach(function(x){ var k=x.origem+' · '+x.tipo; (g[k]=g[k]||[]).push(x); });
    cards.push(vzCard('Pedidos por origem e tipo',per+' · clique para listar',gBarrasH(Object.keys(g).sort(function(a,b){ return g[b].length-g[a].length; }).slice(0,12).map(function(k){ var ok=g[k].filter(function(x){ return x.ok; }).length; return {nome:k, v:g[k].length, extra:pct(ok/g[k].length*100)+' no prazo · prazo '+fmtLim(g[k][0].lim), go:goLista(k,'cert',g[k])}; }))));
    var fora=C.filter(function(x){ return !x.ok; }).sort(function(a,b){ return b.hu-a.hu; });
    if (fora.length) cards.push(vzCard('Fora do prazo por tipo',per+' · '+fora.length+' pedidos',gBarrasH((function(){ var t={}; fora.forEach(function(x){ (t[x.tipo]=t[x.tipo]||[]).push(x); }); return Object.keys(t).sort(function(a,b){ return t[b].length-t[a].length; }).map(function(k){ return {nome:k, v:t[k].length, cor:'var(--c2)', go:goLista('Fora do prazo · '+k,'cert',t[k])}; }); })())));
    return visGrade(cards);
  }

  // ——— Cancelados e especiais
  function visNao(atos){
    atos=atos.concat(cancSoTri7Periodo());
    var R=atos.filter(function(a){ return a.cat==='R'; }), N=atos.filter(function(a){ return a.cat==='N'; }), E=atos.filter(function(a){ return a.cat==='E'; }), I=atos.filter(function(a){ return a.cat==='I'; }), per=nomePeriodo(), cards=[];
    if (!atos.length) return '<div class="empty">Sem protocolos no período.</div>';
    cards.push(vzCard('Situação dos protocolos',per,gRosca([{nome:'Registrados',v:R.length,cor:'var(--c1)',go:goLista('Registrados','atos',R)},{nome:'Cancelados',v:N.length,cor:'var(--c2)',go:goLista('Cancelados','atos',N)},{nome:'Abertura + outros',v:E.length,cor:'var(--c3)',go:goLista('Abertura de matrícula + outros atos','atos',E)},{nome:'Sem histórico',v:I.length,cor:'var(--c4)',go:goLista('Sem histórico suficiente','atos',I)}],{titulo:'Situação',centro:pct(atos.length?N.length/atos.length*100:null),sub:'cancelados'})));
    var pm={}; N.forEach(function(a){ (pm[a.motivo]=pm[a.motivo]||[]).push(a); });
    cards.push(vzCard('Motivos do cancelamento',per+' · clique para listar',gBarrasH(Object.keys(pm).sort(function(a,b){ return pm[b].length-pm[a].length; }).map(function(k){ return {nome:MOTIVOS[k]||k, v:pm[k].length, cor:'var(--c2)', extra:pct(pm[k].length/N.length*100)+' dos cancelados', go:goLista('Cancelados · '+(MOTIVOS[k]||k),'atos',pm[k])}; }))));
    var ms=Object.keys(state.docs).sort().slice(-12), rm=ms.map(function(m){ var A=atosDoMes(m), x=cancSoTri7Mes(m).length, n=A.filter(function(a){ return a.cat==='N'; }).length+x; return {n:n, t:A.length+x}; });
    cards.push(vzCard('Cancelamento por mês','% dos protocolos do mês (KPI-02 complementar) · clique no mês para ver só ele',gLinhas(ms,[{nome:'Cancelados',cor:'var(--c2)',v:rm.map(function(x){ return x.t?x.n/x.t*100:null; }),extra:rm.map(function(x){ return x.n+' de '+x.t; })}],{titulo:'Cancelamento',un:'%',zero:true,irMes:'nao'}),'vz-wide'));
    var pn={}, tn={}; N.forEach(function(a){ if (!a.soTri7) (pn[a.nat]=pn[a.nat]||[]).push(a); }); atos.forEach(function(a){ tn[a.nat]=(tn[a.nat]||0)+1; });
    cards.push(vzCard('Naturezas com mais cancelados',per+' · clique para abrir a natureza',gBarrasH(Object.keys(pn).sort(function(a,b){ return pn[b].length-pn[a].length; }).slice(0,12).map(function(k){ return {nome:k, v:pn[k].length, cor:'var(--c2)', extra:pct(pn[k].length/tn[k]*100)+' dos '+tn[k]+' protocolos da natureza', go:goNatRI(k)}; }))));
    if (E.length) cards.push(vzCard('Abertura de matrícula + outros atos',per+' · dias úteis no Prazo do VHL · clique na coluna para listar',gHisto(E.map(function(a){ return a.pv; }),{un:'d.u.',xl:'Prazo do VHL (d.u.)',itens:E,tipoLista:'atos',nomeLista:'abertura + outros',W:380,H:230})));
    return visGrade(cards);
  }

  // ═════════ v1.9.1: painel de naturezas — juntar, comparar e grupos salvos (Por natureza → Visual) ═════════
  // Grupo salvo (config/naturezas): {id, nome, nats:[nomes originais], ativo}. Grupo ativo substitui os nomes originais nas outras páginas;
  // o nome original fica em a.natOrig (balcão × central, memória de cálculo e registros salvos continuam pelo original). Reversível.
  state.nx={sel:[], modo:'juntar', busca:''}; state.natGr={grupos:[]}; state._grM={}; state.grVer=0;
  function grMapa(){ var m={}; (state.natGr.grupos||[]).forEach(function(g){ if (g.ativo) g.nats.forEach(function(n){ m[n]=g.nome; }); }); return m; }
  function grDefinir(grupos){ state.natGr.grupos=grupos||[]; state._grM=grMapa(); state.grVer++; state._desX=null; }
  function grAtivoPorNome(nome){ return (state.natGr.grupos||[]).filter(function(g){ return g.ativo&&g.nome===nome; })[0]||null; }
  function natsDe(nome){ var g=grAtivoPorNome(nome); return g?g.nats.slice():[nome]; }
  function aplicarGrupos(){ var v=state.grVer, M=state._grM;
    Object.keys(state.docs).forEach(function(k){ var d=state.docs[k]; if (d._grV===v) return; d.atos.forEach(function(a){ if (a.natOrig===undefined) a.natOrig=a.nat; a.nat=M[a.natOrig]||a.natOrig; }); d._grV=v; });
    Object.keys(state.serv).forEach(function(k){ var L=state.serv[k]; if (L._grV===v) return; L.forEach(function(d){ if (d.natOrig===undefined) d.natOrig=d.nat; d.nat=M[d.natOrig]||d.natOrig; }); L._grV=v; }); }
  function grSalvar(msg){ grDefinir(state.natGr.grupos);
    if (dbPronto&&podeEscrever) db.doc('config/naturezas').set({grupos:state.natGr.grupos, em:new Date().toISOString()}).then(function(){ toast(msg||'Grupos salvos'); }).catch(function(){ toast('Não consegui salvar os grupos'); });
    else toast((msg||'Grupos alterados')+' (só nesta sessão)'); render(); }

  // estatística das comparações: Mann-Whitney (tempos) e teste z de duas proporções (percentuais) · 95%, mínimo de 10 casos em cada lado
  function phi(z){ var t=1/(1+0.2316419*Math.abs(z)), d=0.3989423*Math.exp(-z*z/2), p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return z>0?1-p:p; }
  function mannWhitney(a,b){ var n1=a.length, n2=b.length; if (n1<MIN_N||n2<MIN_N) return null;
    var all=a.map(function(v){ return [v,0]; }).concat(b.map(function(v){ return [v,1]; })).sort(function(x,y){ return x[0]-y[0]; }), N=all.length, R1=0, tie=0, i=0;
    while (i<N){ var j=i; while (j+1<N&&all[j+1][0]===all[i][0]) j++; var rk=(i+j)/2+1, t=j-i+1; tie+=t*t*t-t; for (var q=i;q<=j;q++) if (all[q][1]===0) R1+=rk; i=j+1; }
    var U=R1-n1*(n1+1)/2, mu=n1*n2/2, sg=Math.sqrt(n1*n2/12*((N+1)-tie/(N*(N-1)))); if (!sg) return {z:0,p:1}; var z=(U-mu)/sg; return {z:z, p:2*(1-phi(Math.abs(z)))}; }
  function zProp(k1,n1,k2,n2){ if (n1<MIN_N||n2<MIN_N) return null; var p=(k1+k2)/(n1+n2), se=Math.sqrt(p*(1-p)*(1/n1+1/n2)); if (!se) return {z:0,p:1}; var z=(k2/n2-k1/n1)/se; return {z:z, p:2*(1-phi(Math.abs(z)))}; }
  function leituraTeste(t){ return !t?{txt:'poucos casos',cls:'mut'}:t.p<0.05?{txt:'diferença real',cls:'real'}:{txt:'pode ser acaso',cls:'acaso'}; }

  // itens da serventia do topo: RI = protocolos (todosAtos), demais = documentos finalizados
  function nxRI(){ return atrAtual()==='RI'; }
  function nxItens(){ return nxRI()?todosAtos():selDocs().filter(function(d){ return svDe(d.t)!=='Apoio'; }); }
  function nxNat(x){ return x.natOrig||x.nat; }
  function nxDias(x){ return nxRI()?(x.cat==='R'?x.bruto:null):servDu(x); }
  function nxPrazo(x){ return nxRI()?(x.cat==='R'?ok(x):null):servOk(x); }
  function nxMetricas(L){ var ri=nxRI(), dias=L.map(nxDias).filter(function(v){ return v!=null; }), pz=L.map(nxPrazo).filter(function(v){ return v!=null; });
    var m={n:L.length, dias:dias, e:est(dias), pz:[pz.filter(Boolean).length,pz.length]};
    if (ri){ var R=L.filter(function(a){ return a.cat==='R'; }), RN=L.filter(function(a){ return a.cat==='R'||a.cat==='N'; });
      m.R=R.length; m.exig=[R.filter(function(a){ return a.nex>0; }).length,R.length]; m.canc=[L.filter(function(a){ return a.cat==='N'; }).length,L.length]; m.cen=[RN.filter(function(a){ return origemAto(a)==='central'; }).length,RN.length]; }
    return m; }
  function pp(x){ return x[1]?x[0]/x[1]*100:null; }

  function nxOpsHTML(cont){
    var q=semAc(state.nx.busca), ks=Object.keys(cont).filter(function(n){ return !q||semAc(n).indexOf(q)>=0; }).sort(function(a,b){ return cont[b]-cont[a]; }), mx=q?60:24;
    return (ks.length?ks.slice(0,mx).map(function(n){ var on=state.nx.sel.indexOf(n)>=0; return '<button type="button" class="chip nx-op'+(on?' ok':'')+'" data-nxnat="'+esc(n)+'" aria-pressed="'+on+'">'+(on?'✓ ':'+ ')+esc(n)+' <span class="mut">'+cont[n]+'</span></button>'; }).join(''):'<span class="hint">Nenhuma natureza com esse nome no período.</span>')+
      (ks.length>mx?'<span class="hint">+ '+(ks.length-mx)+' naturezas. Refine a busca.</span>':'');
  }
  function visNat(){
    var itens=nxItens(), cont={}; itens.forEach(function(x){ var n=nxNat(x); cont[n]=(cont[n]||0)+1; });
    var S=state.nx, sel=S.sel, grs=state.natGr.grupos||[];
    var h='<p class="vis-dica">Escolha uma ou várias naturezas (os nomes originais do '+(nxRI()?'VHL':'VHL nesta serventia')+'). <b>Juntar</b> trata a seleção como um ato só; <b>Comparar</b> mostra cada uma lado a lado e diz se a diferença é real (95% de confiança, 10+ casos de cada lado). Segue a Serventia e o Período do topo.</p>';
    h+='<div class="nx-box"><div class="search" style="margin:0 0 8px"><input type="search" id="nxBusca" placeholder="Pesquisar natureza (ex.: contrato, escritura, onr)" value="'+esc(S.busca)+'" aria-label="Pesquisar natureza">'+
      '<div class="seg" role="group" aria-label="Modo"><button type="button" class="segb" data-nxmodo="juntar" aria-pressed="'+(S.modo==='juntar')+'">Juntar</button><button type="button" class="segb" data-nxmodo="comparar" aria-pressed="'+(S.modo==='comparar')+'">Comparar</button></div></div>'+
      '<div class="chips" id="nxOps" style="margin:0 0 10px">'+nxOpsHTML(cont)+'</div>'+
      '<div class="sub-h" style="margin:8px 0 4px">Selecionadas ('+sel.length+')</div><div class="chips" style="margin:0">'+(sel.length?sel.map(function(n,i){ return '<span class="chip ok"><i class="dot" style="background:'+(S.modo==='comparar'&&i<6?CAT[i]:'var(--good)')+'"></i>'+esc(n)+' <span class="mut">'+(cont[n]||0)+'</span> <button type="button" class="lnk" data-nxrm="'+esc(n)+'" aria-label="Tirar '+esc(n)+'">✕</button></span>'; }).join('')+'<button type="button" class="btn sm" data-nxlimpar="1">Limpar</button>':'<span class="hint">Nenhuma. Clique nas naturezas acima.</span>')+'</div>';
    // grupos salvos
    h+='<div class="sub-h" style="margin:14px 0 4px">Grupos salvos</div>'+(grs.length?'<div class="nx-grs">'+grs.map(function(g){ return '<div class="nx-gr'+(g.ativo?' on':'')+'"><div><b>'+esc(g.nome)+'</b>'+(g.ativo?' <span class="pill good">ativo nas outras páginas</span>':'')+'<div class="mut" style="font-size:.78rem">'+g.nats.map(esc).join(' + ')+'</div></div><div class="ctl"><button type="button" class="btn sm" data-nxabrir="'+esc(g.id)+'">Abrir</button>'+(podeEscrever?'<button type="button" class="btn sm'+(g.ativo?'':' primary')+'" data-nxativar="'+esc(g.id)+'">'+(g.ativo?'Desfazer nas outras páginas':'Usar como uma natureza só')+'</button><button type="button" class="btn sm" data-nxexcluir="'+esc(g.id)+'">Excluir</button>':'')+'</div></div>'; }).join('')+'</div>':'<p class="hint" style="margin:0">Nenhum grupo salvo.</p>')+
      (podeEscrever&&sel.length>=2?'<div class="ctl" style="margin-top:8px"><input type="text" id="nxNome" class="mini" style="width:280px" placeholder="Nome do grupo (ex.: Contrato (balcão + central))" aria-label="Nome do grupo"><button type="button" class="btn sm primary" data-nxsalvar="1">Salvar a seleção como grupo</button></div>':'')+'</div>';
    if (!sel.length) return h+'<div class="empty" style="margin-top:14px"><b>Escolha ao menos uma natureza</b>Pesquise pelo nome e clique para incluir.</div>';
    var por={}; sel.forEach(function(n){ por[n]=[]; }); itens.forEach(function(x){ var n=nxNat(x); if (por[n]) por[n].push(x); });
    return h+(S.modo==='comparar'?(sel.length<2?'<div class="empty" style="margin-top:14px"><b>Escolha duas ou mais para comparar</b>Ou volte para Juntar.</div>':nxComparar(sel.slice(0,6),por)+(sel.length>6?'<p class="hint">Comparando as 6 primeiras selecionadas.</p>':'')):nxJuntar(sel,[].concat.apply([],sel.map(function(n){ return por[n]; }))));
  }

  function nxJuntar(sel, L){
    var ri=nxRI(), m=nxMetricas(L), e=m.e, nome=sel.length>1?sel.length+' naturezas juntas':sel[0], cards=[];
    var ms=Object.keys(state.docs).concat(Object.keys(state.serv)).filter(function(x,i,a){ return a.indexOf(x)===i; }).sort().slice(-12), porM={}; L.forEach(function(x){ (porM[x.mes]=porM[x.mes]||[]).push(x); });
    var h='<div class="sub-h" style="margin-top:16px">'+esc(nome)+(sel.length>1?' <span class="mut" style="text-transform:none;letter-spacing:0">('+sel.map(esc).join(' + ')+')</span>':'')+'</div><div class="kpis" style="margin-bottom:12px">'+
      kpi(ri?'Protocolos':'Documentos',m.n.toLocaleString('pt-BR'),ri?m.R+' registrados':'finalizados no período','hero')+
      kpi('Mediana',e.n?numBR(e.mediana,1)+' <small style="font-size:.9rem">d.u.</small>':'—',e.n?'média '+numBR(e.media,1)+(e.moda!=null?' · mais comum '+e.moda+' ('+pct(e.modaPct)+')':'')+' · 90% em até '+numBR(e.p90,1)+(e.n<MIN_N?' · poucos casos':''):'')+
      kpi('No prazo',m.pz[1]?pct(pp(m.pz)):'—',m.pz[1]?m.pz[0]+' de '+m.pz[1]:(ri?'':'defina o prazo em Por natureza'))+
      (ri?kpi('Com exigência',pct(pp(m.exig)),m.exig[0]+' de '+m.exig[1]+' registrados')+kpi('Cancelados',pct(pp(m.canc)),m.canc[0]+' de '+m.canc[1],m.canc[0]?'canc':'')+kpi('Pela central (ONR)',pct(pp(m.cen)),m.cen[0]+' central · '+(m.cen[1]-m.cen[0])+' balcão'):'')+'</div>';
    cards.push(vzCard('Volume por mês','clique no mês para ver só ele',gLinhas(ms,[{nome:'Volume',cor:'var(--c1)',v:ms.map(function(x){ return (porM[x]||[]).length||null; })}],{titulo:'Volume',area:true,zero:true,irMes:'nat'}),'vz-wide'));
    cards.push(vzCard('Mediana de dias úteis por mês','dias úteis do ingresso ao '+(ri?'registro':'fim'),gLinhas(ms,[{nome:'Mediana',cor:'var(--c1)',v:ms.map(function(x){ var v=(porM[x]||[]).map(nxDias).filter(function(y){ return y!=null; }); return v.length?mediana(v):null; })},{nome:'P90',cor:'var(--c2)',tracejado:true,v:ms.map(function(x){ var v=est((porM[x]||[]).map(nxDias).filter(function(y){ return y!=null; })); return v.n?v.p90:null; })}],{titulo:'Mediana por mês',un:'d.u.',zero:true,irMes:'nat',ref:ri?[{v:20,nome:'20 d.u.'}]:[]}),'vz-wide'));
    var comD=L.filter(function(x){ return nxDias(x)!=null; });
    cards.push(vzCard('Distribuição dos dias','histograma · clique na coluna para listar',gHisto(comD.map(nxDias),{un:'d.u.',passo:1,max:ri?30:undefined,lim:ri?20:undefined,xl:'dias úteis',itens:comD,tipoLista:ri?'atos':'docs',nomeLista:nome}),'vz-wide'));
    // tempo por etapa
    var et={}; if (ri) L.forEach(function(a){ if (a.cat!=='R') return; (a.etapas||[]).forEach(function(p){ var x=et[p[0]]=et[p[0]]||{s:0,n:0}; x.s+=p[1]; x.n++; }); });
    else L.forEach(function(d){ d.ets.forEach(function(p){ var x=et[p.et]=et[p.et]||{s:0,n:0}; x.s+=p.pz; x.n++; }); });
    var ek=Object.keys(et).sort(function(a,b){ return et[b].s-et[a].s; }).slice(0,10);
    if (ek.length) cards.push(vzCard('Onde o tempo vai · por etapa','média de dias úteis na etapa · as 10 que somam mais tempo',gBarrasH(ek.map(function(k){ return {nome:k, v:Math.round(et[k].s/et[k].n*10)/10, extra:et[k].n+' passagens · '+et[k].s+' d.u. no total'}; }),{un:'d.u.'})));
    if (ri){ var R=L.filter(function(a){ return a.cat==='R'; }), E0=R.filter(function(a){ return !a.nex; }), E1=R.filter(function(a){ return a.nex===1; }), E2=R.filter(function(a){ return a.nex>=2; });
      cards.push(vzCard('Exigências','registrados · clique na fatia para listar',gRosca([{nome:'Sem exigência',v:E0.length,cor:'var(--c3)',go:goLista(nome+' · sem exigência','atos',E0)},{nome:'1 exigência',v:E1.length,cor:'var(--c4)',go:goLista(nome+' · 1 exigência','atos',E1)},{nome:'2 ou mais',v:E2.length,cor:'var(--c2)',go:goLista(nome+' · 2 ou mais exigências','atos',E2)}],{titulo:'Exigências',centro:pct(R.length?E0.length/R.length*100:null),sub:'1ª qualificação'})));
      var RN=L.filter(function(a){ return a.cat==='R'||a.cat==='N'; }), Bc=RN.filter(function(a){ return origemAto(a)!=='central'; }), Cc=RN.filter(function(a){ return origemAto(a)==='central'; });
      cards.push(vzCard('Balcão × central','clique na fatia para listar',gRosca([{nome:'Balcão',v:Bc.length,cor:'var(--c1)',go:goLista(nome+' · balcão','atos',Bc)},{nome:'Central (ONR)',v:Cc.length,cor:'var(--c2)',go:goLista(nome+' · central','atos',Cc)}],{titulo:'Origem'})));
      var N=L.filter(function(a){ return a.cat==='N'; }), O=L.filter(function(a){ return a.cat==='E'||a.cat==='I'; });
      cards.push(vzCard('Situação','clique na fatia para listar',gRosca([{nome:'Registrados',v:R.length,cor:'var(--c1)',go:goLista(nome+' · registrados','atos',R)},{nome:'Cancelados',v:N.length,cor:'var(--c2)',go:goLista(nome+' · cancelados','atos',N)},{nome:'Especiais / sem histórico',v:O.length,cor:'var(--c4)',go:goLista(nome+' · especiais','atos',O)}],{titulo:'Situação',centro:pct(L.length?N.length/L.length*100:null),sub:'cancelados'}))); }
    // quem trabalha nelas
    var pes={}; L.forEach(function(x){ var ev=ri?nxEventos(x):x.ets.map(function(e){ return {rp:e.rp,pz:e.pz}; }); var vist={}; ev.forEach(function(e){ if (!e.rp) return; var q=pes[e.rp]=pes[e.rp]||{n:0,docs:0,pz:0}; q.n++; q.pz+=e.pz; if (!vist[e.rp]){ vist[e.rp]=1; q.docs++; } }); });
    var pk=Object.keys(pes).sort(function(a,b){ return pes[b].n-pes[a].n; }).slice(0,12);
    if (pk.length) cards.push(vzCard('Quem trabalha nelas','execuções de etapa no VHL · clique para o relatório individual',gBarrasH(pk.map(function(k){ return {nome:k, v:pes[k].n, extra:pes[k].docs+' documentos · média '+numBR(pes[k].pz/pes[k].n,1)+' d.u. por etapa', go:goPessoa(k)}; }))));
    // inconformidades ligadas pelo código
    var cods={}; L.forEach(function(x){ cods[String(x.c).toUpperCase()]=1; }); var inc=incTodos().filter(function(r){ return cods[String(r.c).toUpperCase()]&&(ri?r.t==='RI':incOk(r)); });
    if (inc.length){ var pc={}, com={}; inc.forEach(function(r){ var c=catDe(r); (pc[c]=pc[c]||[]).push(r); com[String(r.c).toUpperCase()]=1; });
      cards.push(vzCard('Inconformidades ligadas',inc.length+' registros · '+pct(Object.keys(com).length/L.length*100)+' dos '+(ri?'protocolos':'documentos')+' tiveram ao menos 1 · clique para listar',gBarrasH(Object.keys(pc).sort(function(a,b){ return pc[b].length-pc[a].length; }).slice(0,10).map(function(c){ return {nome:c, v:pc[c].length, cor:'var(--c2)', go:goLista(nome+' · '+c,'inc',pc[c])}; })))); }
    return h+'<div class="vz-grid">'+cards.join('')+'</div>';
  }
  // execuções de etapa de um protocolo (linha do tempo salva em logs)
  function nxEventos(a){ var L=logDe(a.c, a.mes); return L?L.ev:[]; }

  function nxComparar(sel, por){
    var ri=nxRI(), M=sel.map(function(n){ return nxMetricas(por[n]); }), ref=M[0];
    function difDias(i){ var t=mannWhitney(ref.dias,M[i].dias), d=(M[i].e.n&&ref.e.n)?M[i].e.mediana-ref.e.mediana:null; return {t:t,d:d}; }
    function cel(v,dif){ return '<td class="num">'+v+(dif?'<div class="nx-dif '+dif.cls+'">'+dif.txt+'</div>':'')+'</td>'; }
    function difP(i,campo){ var a=ref[campo], b=M[i][campo]; if (!a||!b||!a[1]||!b[1]) return null; var t=zProp(a[0],a[1],b[0],b[1]), d=pp(b)-pp(a), l=leituraTeste(t); return {cls:l.cls, txt:(d>0?'+':'')+numBR(d,1)+' p.p. · '+l.txt}; }
    var linhas=[
      ['Volume',function(m){ return m.n.toLocaleString('pt-BR'); },null],
      ['Média (d.u.)',function(m){ return m.e.n?numBR(m.e.media,1):'—'; },null],
      ['Mediana (d.u.)',function(m){ return m.e.n?'<b>'+numBR(m.e.mediana,1)+'</b>':'—'; },function(i){ var x=difDias(i); if (x.d==null) return null; var l=leituraTeste(x.t); return {cls:l.cls, txt:(x.d>0?'+':'')+numBR(x.d,1)+' d.u. · '+l.txt}; }],
      ['Mais comum (moda)',function(m){ return m.e.moda!=null?m.e.moda+' <span class="mut">('+pct(m.e.modaPct)+')</span>':'—'; },null],
      ['90% em até (P90)',function(m){ return m.e.n?numBR(m.e.p90,1):'—'; },null],
      ['No prazo',function(m){ return m.pz[1]?pct(pp(m.pz)):'—'; },function(i){ return difP(i,'pz'); }]];
    if (ri) linhas.push(['Com exigência',function(m){ return pct(pp(m.exig)); },function(i){ return difP(i,'exig'); }],['Cancelados',function(m){ return pct(pp(m.canc)); },function(i){ return difP(i,'canc'); }],['Pela central (ONR)',function(m){ return pct(pp(m.cen)); },function(i){ return difP(i,'cen'); }]);
    var h='<div class="sub-h" style="margin-top:16px">Comparação · referência: '+esc(sel[0])+'</div><div class="tbl-wrap"><table class="nx-cmp"><thead><tr><th class="tleft">Indicador</th>'+sel.map(function(n,i){ return '<th><i class="dot" style="background:'+CAT[i]+'"></i>'+esc(n)+(i?'':' <span class="mut">(ref.)</span>')+'</th>'; }).join('')+'</tr></thead><tbody>'+
      linhas.map(function(l){ return '<tr><td class="tleft">'+l[0]+'</td>'+M.map(function(m,i){ return cel(l[1](m), i&&l[2]?l[2](i):null); }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
    // frases
    var fr=sel.slice(1).map(function(n,i){ var x=difDias(i+1); if (x.d==null) return ''; var l=leituraTeste(x.t); return '<li><b>'+esc(n)+'</b>: mediana '+numBR(M[i+1].e.mediana,1)+' d.u. × <b>'+esc(sel[0])+'</b>: '+numBR(ref.e.mediana,1)+' d.u. → '+(x.d>0?'+':'')+numBR(x.d,1)+' d.u. <span class="nx-dif '+l.cls+'">'+l.txt+'</span></li>'; }).filter(Boolean);
    if (fr.length) h+='<ul class="hint" style="margin:8px 0 0;padding-left:18px">'+fr.join('')+'</ul>';
    h+='<p class="hint">"Diferença real" = o teste confirma com 95% de confiança (Mann-Whitney para os dias, teste de proporções para os %), com 10 ou mais casos de cada lado. "Pode ser acaso" = a diferença existe nos números, mas cabe na variação normal.</p>';
    var cards=[], ms=Object.keys(state.docs).concat(Object.keys(state.serv)).filter(function(x,i,a){ return a.indexOf(x)===i; }).sort().slice(-12);
    cards.push(vzCard('Dias úteis · lado a lado','box plot · cada ponto junta os casos fora do padrão de um valor (clique para listar)',gBox(sel.map(function(n,i){ var L=por[n].filter(function(x){ return nxDias(x)!=null; }); return {nome:n, cor:CAT[i], sub:L.length+(ri?' registrados':' documentos'), pts:L.map(function(x){ return ri?ptAto(x,x.bruto):ptDoc(x,servDu(x)); })}; }),{un:'d.u.',ref:ri?20:null,pl:220,tipoLista:ri?'atos':'docs'}),'vz-wide'));
    var porM=sel.map(function(n){ var o={}; por[n].forEach(function(x){ (o[x.mes]=o[x.mes]||[]).push(x); }); return o; });
    cards.push(vzCard('Mediana de dias úteis por mês','linhas sobrepostas · clique no mês para ver só ele',gLinhas(ms,sel.map(function(n,i){ return {nome:n, cor:CAT[i], v:ms.map(function(m){ var v=(porM[i][m]||[]).map(nxDias).filter(function(y){ return y!=null; }); return v.length>=3?mediana(v):null; }), extra:ms.map(function(m){ return (porM[i][m]||[]).length+' no mês'; })}; }),{titulo:'Mediana por mês',un:'d.u.',zero:true,irMes:'nat',ref:ri?[{v:20,nome:'20 d.u.'}]:[]}),'vz-wide'));
    cards.push(vzCard('Volume por mês','linhas sobrepostas',gLinhas(ms,sel.map(function(n,i){ return {nome:n, cor:CAT[i], v:ms.map(function(m){ return (porM[i][m]||[]).length||null; })}; }),{titulo:'Volume por mês',zero:true,irMes:'nat'}),'vz-wide'));
    cards.push(vzCard('No prazo','% de cada natureza no período',gBarrasH(sel.map(function(n,i){ return {nome:n, v:M[i].pz[1]?Math.round(pp(M[i].pz)*10)/10:0, cor:CAT[i], extra:M[i].pz[0]+' de '+M[i].pz[1], go:goLista(n+' · fora do prazo',ri?'atos':'docs',por[n].filter(function(x){ return nxPrazo(x)===false; }))}; }),{un:'%'})));
    if (ri) cards.push(vzCard('Com exigência','% dos registrados',gBarrasH(sel.map(function(n,i){ return {nome:n, v:Math.round((pp(M[i].exig)||0)*10)/10, cor:CAT[i], extra:M[i].exig[0]+' de '+M[i].exig[1], go:goLista(n+' · com exigência','atos',por[n].filter(function(a){ return a.cat==='R'&&a.nex>0; }))}; }),{un:'%'})));
    return h+'<div class="vz-grid" style="margin-top:12px">'+cards.join('')+'</div>';
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
    var h='<div class="sec-h"><h2>Certidões</h2><span class="note">Horas úteis do pedido até a conclusão (Selos Gerados), no expediente de '+state.cfg.expIni+'h às '+state.cfg.expFim+'h. Prazos do art. 19 §10 da Lei 6.015/73.</span></div>';
    h+='<div class="kpis" style="margin-bottom:14px">'+
      kpi('Certidões no prazo',pctK(pc(C)),ok+' de '+C.length+' concluídas','hero')+
      kpi('Central / online',pct(pc(O)),O.length+' pedidos · mediana '+fmtH(mediana(O.map(function(x){return x.hu;}))))+
      kpi('Balcão',pct(pc(B)),B.length+' pedidos · mediana '+fmtH(mediana(B.map(function(x){return x.hu;}))))+
      kpi('Inteiro teor no balcão',pct(pc(Bit)),'prazo de 4 h úteis · '+Bit.length+' pedidos',pc(Bit)!=null&&pc(Bit)<95?'canc':'')+
      kpi('Fora do cálculo',String(I),'certidões do fluxo de intimação (prazo corre do pagamento)')+
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
    var usuarios={}, lst=intimLista(); all.forEach(function(x){ usuarios[x.u]=(usuarios[x.u]||0)+1; });
    h+='<div class="sub-h" style="margin-top:16px">Fluxo de intimação (fora do cálculo)</div><p class="hint" style="margin:0 0 6px">Certidões concluídas por quem trabalha no fluxo de intimação não entram no prazo: o cliente paga depois e o prazo corre do pagamento. '+(state.cfg.intim?'Lista ajustada por você.':'Detectado pela produção no VHL.')+' Clique para incluir ou tirar.</p><div class="chips">'+
      Object.keys(usuarios).sort(function(a,b){return usuarios[b]-usuarios[a];}).map(function(u){ var on=lst.indexOf(u)>=0; return '<button type="button" class="chip'+(on?' ok':'')+'" data-intim="'+esc(u)+'" aria-pressed="'+on+'">'+(on?'✓ ':'')+esc(u)+' · '+usuarios[u]+'</button>'; }).join('')+'</div>'+
      '<div class="ctl" style="margin-top:12px"><span class="hint" style="margin:0">Expediente</span><input type="number" id="expIni" min="0" max="23" value="'+state.cfg.expIni+'" style="width:64px" class="mini" aria-label="Início do expediente"><span class="hint" style="margin:0">às</span><input type="number" id="expFim" min="1" max="24" value="'+state.cfg.expFim+'" style="width:64px" class="mini" aria-label="Fim do expediente"><span class="hint" style="margin:0">h · seg a sex, sem feriados</span></div>';
    $('tabCer').innerHTML=h;
  }
  function salvarCfg(){ if (dbPronto&&podeEscrever) db.doc('config/geral').set({feriadosExtras:state.extras, expIni:state.cfg.expIni, expFim:state.cfg.expFim, intim:state.cfg.intim||null}).catch(function(){ toast('Não consegui salvar a configuração'); }); }

  function avDoc(a,res,ob){ return res?{codigo:a.c,mes:a.mes,natureza:a.natOrig||a.nat,exigencias:a.nex,resultado:res,obs:ob,em:new Date().toISOString()}:null; }
  function gravarLote(itens){ // itens: [{a, dados}] — grava tudo de uma vez e redesenha uma vez só
    var feitos=[];
    itens.forEach(function(it){ var id=idDoc(it.a.c); if (it.dados==null) delete state.aval[id]; else state.aval[id]=it.dados; delete state.avDraft[it.a.c]; feitos.push(it); });
    render();
    if (!dbPronto){ toast('Registrado no painel (não salvo): '+feitos.length); return; }
    Promise.all(feitos.map(function(it){ var ref=db.doc('avaliacoes/'+idDoc(it.a.c)); return it.dados==null?ref.delete():ref.set(it.dados); }))
      .then(function(){ toast(feitos.length+(feitos.length>1?' avaliações salvas':' avaliação salva')); })
      .catch(function(e){ toast(e&&e.code==='invalid_argument'?'Sem permissão para salvar':'Algumas não foram salvas, tente de novo'); });
  }
  // quem redigiu as exigências do título (Revisão de Exigência que virou Nota de Exigência no Tri7)
  function exAutores(a){ var L=andIndice()[a.c]||[], out=[]; L.forEach(function(e,i){ if (e.s==='RE' && reVirouNota(L,i) && out.indexOf(e.u)<0 && !/^tri7$/i.test(e.u)) out.push(e.u); }); return out; }
  function irFeedback(a){
    var aut=exAutores(a), login=aut[0];
    if (aut.length>1){ var ip=prompt('Quem redigiu as exigências deste título?\n'+aut.map(function(l,i){ return (i+1)+' – '+nomeLogin(l); }).join('\n')+'\n\nDigite o número:','1'); var n=parseInt(ip,10); if (!n||n<1||n>aut.length) return; login=aut[n-1]; }
    var mA=a.mes||(atoDe(a.c)||{}).mes; if (mA && state.periodo!==mA){ state.periodo=mA; render(); }
    var D=relDados(), k=login?semAc(nomeLogin(login)):null;
    if (!k || !D.pessoas[k]){ state.relSel='__geral'; irAba('rel'); toast(login?'Não achei '+nomeLogin(login)+' nos relatórios deste período. Escolha a pessoa na lista':'Sem Tri7 para este título: escolha na lista quem redigiu'); return; }
    var v=avd2(a), fk=chaveFeedback(k), fb=state.feedback[fk]=Object.assign({},state.feedback[fk]||{}), linha=a.c+' ('+a.nat+'): '+a.nex+' exigências, falha na qualificação'+(v.obs?' — '+v.obs:'')+'.';
    if ((fb.atencao||'').indexOf(a.c)<0) fb.atencao=((fb.atencao||'')+(fb.atencao?'\n':'')+linha);
    state.relSel=k; irAba('rel'); toast('Linha incluída em "Pontos de atenção". Revise e clique em Salvar devolutiva');
  }
  function avd2(a){ var d=state.avDraft[a.c]; if (d) return {resultado:d.res,obs:d.obs}; return state.aval[idDoc(a.c)]||{}; }
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
      '<h3>Gráficos que levam ao dado</h3>Todo gráfico é clicável (cursor de mão e realce ao passar o mouse; no celular, o 1º toque mostra a dica e o 2º abre). Natureza → página Por natureza com ela aberta. Mês → o Período muda para aquele mês. Fatia, coluna ou barra de um grupo → lista dos itens logo abaixo do gráfico, com os mais demorados primeiro e o botão "Voltar ao gráfico". Pessoa → relatório individual. Ponto de um protocolo (casos fora do padrão nos box plots) → ficha do protocolo. Quando o clique leva a outra página, o botão "← Voltar ao gráfico" no rodapé devolve ao lugar de onde você saiu. Nos box plots, o eixo vai até o maior caso; se um caso estiver muito acima dos outros, o eixo é cortado e o fim da linha mostra quantos passam (ex.: "3 &gt; 30"), com a lista ao clicar. Inconformidades, Atendimento, Certidões e Cancelados têm a chave <b>Tabela | Visual</b> no título (o navegador lembra a escolha).'+
      '<h3>Produção média diária</h3>Como o Oficial avalia: <b>X documentos em Y dias ativos (de Z dias úteis) → W documentos por dia ativo</b>. Dia ativo = dia útil (sem sábado, domingo e feriado) em que a pessoa teve ao menos uma execução na Produção por Etapa do VHL. Documentos = códigos distintos trabalhados no mês. Vem dos dados brutos de todas as execuções (inclusive de protocolos ainda não finalizados), então férias e afastamentos não derrubam a média, mas o relatório mostra quantos dias foram. Segue o filtro Serventia: protocolo ainda sem finalização com código só de números conta como RI. Equipe = mediana das pessoas com 5+ dias ativos no mês. No Desempenho, "Volume × normal dela" compara os documentos por dia ativo do mês com a média dela por dia ativo nos meses anteriores.'+
      '<h3>Naturezas: juntar e comparar</h3>Em Por natureza → Visual: escolha uma ou várias naturezas pelos nomes originais do VHL. <b>Juntar</b> trata a seleção como um ato só. <b>Comparar</b> mostra cada uma lado a lado contra a primeira escolhida (referência): a diferença só é chamada de "real" quando o teste confirma com 95% de confiança e há 10+ casos de cada lado (Mann-Whitney para os dias, teste de duas proporções para os %). Um grupo salvo pode ser usado como uma natureza só nas outras páginas: o grupo substitui os nomes originais nas tabelas, gráficos e relatórios, mas balcão × central, memória de cálculo, justificativas e avaliações continuam pelo nome original, e os KPIs lançados não mudam. "Desfazer" devolve os nomes originais na hora.'+
      '<h3>Desempenho (ritmo e linha normal)</h3>Cada execução de etapa no VHL (Produção por Etapa) é comparada com a média da equipe <b>na mesma etapa e na mesma natureza</b>, sem contar a própria pessoa. A diferença é o <b>desvio</b> (negativo = mais rápido). A <b>linha normal</b> da pessoa é o desvio médio dela nos até 6 meses anteriores. "Reduziu o ritmo" só aparece quando o mês atual difere da linha normal com 95% de confiança <b>e</b> por pelo menos '+numBR(DES_MIN_DIF,1)+' d.u. por execução. O volume compara documentos trabalhados por dia útil com a média dela nos meses anteriores (alerta abaixo de 70% do normal). O mês de cada execução é o mês de finalização do ato, igual ao resto do painel. Etapas sempre feitas no mesmo dia ficam fora porque não mostram ritmo. Um mês muito menor que os anteriores é tratado como incompleto quando o período é "Todos". Antes de concluir, confira férias, afastamento ou mudança de função.'+
      '<h3>Como lemos os números</h3><b>Média</b> é o número do KPI (é o que a ficha técnica define). <b>Mediana</b> é o caso típico — metade fica abaixo, metade acima — e não é puxada por poucos casos extremos. <b>Moda</b> (“mais comum”) só aparece em contagens inteiras, como dias úteis; em tempo de relógio usamos a <b>faixa mais comum</b>. <b>90% em até</b> (P90) mostra o risco: o que acontece com os piores 10%. <b>Faixa típica</b> é onde está a metade central dos casos — larga quer dizer processo imprevisível. Com menos de '+MIN_N+' casos o painel avisa “poucos” e não tira conclusão.'+
      '<h3>Comparação justa entre pessoas</h3><b>Inconformidades:</b> cada pessoa é comparada com a faixa normal para o volume de documentos dela, já contando que funções diferentes erram em ritmos diferentes (funil com sobredispersão). Só aparece “acima” ou “abaixo do esperado” com 95% de confiança — o resto é variação normal. <b>Atendimento:</b> o tempo é comparado com a mediana da equipe <i>na mesma fila</i>, e só vira ponto de atenção quando a diferença é consistente (teste do sinal, menos de 5% de chance de ser acaso, 10+ atendimentos). “≈” marca diferença que pode ser acaso.'+
      '<h3>Prazo</h3>20 dias úteis contados do ingresso (Art. 205, com dias úteis pelo Art. 9º §1º da Lei 6.015/73). Se o título teve retorno — passou por <code>Re-Análise</code>, <code>Revisão de Exigência</code> ou aparece no relatório de Suspensos —, o limite vai a <b>25 dias úteis</b>. O dia do ingresso não conta.'+
      '<h3>Até quando conta</h3>Até a última <b>Revisão Oficial</b>, que é quando o registro sai para o cliente. Imprimir Ficha e Arquivamento vêm depois e ficam de fora. Atos que não passam por Revisão Oficial (ex.: CNIB) usam o campo Prazo do VHL.'+
      '<h3>Bruto, líquido e espera</h3><b>Bruto</b>: dias úteis do ingresso até o registro. <b>Líquido</b>: soma dos dias em cada etapa até o registro — o tempo em que o documento estava com o cartório. <b>Espera</b>: bruto − líquido, o tempo suspenso aguardando o cliente. Nos atos sem reingresso, líquido e bruto coincidem.'+
      '<h3>Quem sai do KPI-02</h3><b>Pesquisa Qualificada</b> e <b>Informação Verbal - Visualização de Matrícula</b> (consultas: só contam no volume). <b>Não registrados</b>: com o Relatório de andamentos do Tri7, decide o andamento <b>Cancelado por Desistência ou Impossibilidade</b> — se ele existe, o título é cancelado, mesmo que o VHL mostre outra coisa. Sem o protocolo no Tri7, vale o VHL: status Cancelado, ou última etapa útil (ignorando Imprimir Ficha e Arquivamento) Cancelamento de Protocolo, Ofício de Cancelamento, Devolução Depósito Prévio, ONR – Envio do Recibo do Protocolo, ONR – Nota de Devolução ou Re-Análise sem Revisão Oficial depois. <b>Abertura de matrícula + Outros atos</b>: fluxo especial, acompanhado à parte. <b>Sem histórico</b>: atos que entraram antes do início da Produção por Etapa importada.'+
      '<h3>Fora do prazo justificado</h3>Atos com prazo especial (Georreferenciamento, sobrestado a pedido do interessado, suscitação de dúvida, ordem judicial) ficam em aberto até você registrar o motivo. Com motivo, contam como dentro do prazo no KPI-02 e saem das médias e medianas, para não distorcer a curva normal.'+'<h3>KPI-02 complementar · cancelamento</h3>Atos cancelados, devolvidos ou com prenotação caducada, sobre o total de atos RI do período (sem consultas). Protocolos cancelados no Tri7 que ainda não foram finalizados no VHL entram no mês do cancelamento no Tri7 — no numerador e no denominador — e aparecem em Cancelados e especiais como "Cancelados no Tri7, ainda abertos no VHL". Só entram com a serventia em Todas ou RI completo. Cancelados também entram na avaliação mensal.'+'<h3>Exigências e pagamento (VHL + Tri7)</h3>Com o Relatório de andamentos do Tri7, a contagem é: <b>exigência = cada Nota de Exigência</b> (o documento que vai para o cliente; notas seguidas sem o título voltar por Re-análise são a mesma exigência reemitida e contam uma vez; Revisão de Exigência sozinha não conta, porque a pendência pode virar cobrança de custas). Parada que o VHL leu como exigência e o Tri7 mostra como <b>Custas Informadas</b> = pagamento. Parada que o VHL leu como exigência, sem Nota de Exigência nem Custas no Tri7 = <b>pagamento</b> (sem a nota, nada foi exigido do cliente). A ficha do protocolo mostra a conta de cada ato e a aba Exigências tem o filtro de divergências. Sem o protocolo no Tri7 (prenotado antes do relatório), vale só a regra do VHL abaixo. '+'Regra do VHL: quando o título fica parado fora do fluxo (dias úteis que nenhuma etapa explica) e consta como Suspenso no relatório de Demanda, houve uma suspensão. Se ele volta por <code>Re-Análise</code> ou <code>Revisão de Exigência</code>, foi <b>exigência</b> cumprida; se volta direto para Minuta, foi <b>pagamento</b> (ONR). Re-Análise sem suspensão (Revisão devolvendo ao analista) não conta como exigência. Aprovado na 1ª qualificação = registrado sem nenhuma exigência. Títulos com 2 ou mais exigências vão para avaliação: conforme (causa do cliente) ou não conforme (falha na qualificação).'+'<h3>Lançar KPIs · valor travado</h3>Ao marcar <b>lançado</b>, o painel guarda numerador, denominador, análise, data e versão do painel daquele mês. A partir daí o card, a tendência, os gráficos de KPI e a memória de cálculo usam o valor travado — melhorias do painel não mexem no que já está no ANOREG+. Se o cálculo de hoje der diferente, o card avisa. <b>Regra de correção:</b> mudança de regra vale daqui para frente (registrar no controle de alterações da ficha técnica); só se corrige um mês lançado quando for erro de dado <b>e</b> mudar a situação (Atende/Não atende) ou passar de 1 p.p. Para corrigir, desmarque lançado, confira e marque de novo. Anexe no ANOREG+ a memória de cálculo baixada no dia do lançamento.'+'<h3>KPI-13 · espera</h3>O KPI-13 oficial é a média da espera de <b>todas as filas</b>. Com a Serventia filtrada, a página Atendimento mostra "Espera média · serventia", só com as filas dela — não é o KPI-13.<h3>LGPD</h3>CPF e RG escritos na Observação das inconformidades são mascarados na importação (e nas já salvas, na primeira abertura de quem pode editar). Números de 11 dígitos só são mascarados quando o dígito verificador é de CPF válido, para não apagar números de OS. A sessão vale só enquanto o navegador estiver aberto.<h3>KPI-01 · inconformidades</h3>KPI-01 = atos RI registrados no período com ao menos 1 inconformidade ÷ atos RI registrados. A inconformidade é ligada ao ato pelo código, então não importa o mês em que foi registrada. Complementar = mesma conta só com erro externo. O nome do erro sai da Observação (regras por palavras-chave) e pode ser corrigido na lista. A taxa por pessoa divide as inconformidades pelos documentos que a pessoa trabalhou no VHL no período.'+'<h3>Certidões</h3>Base: Relatório de andamentos do Tri7 (andamento Selos Gerados dos pedidos de certidão), no horário local. Certidões emitidas automaticamente pelo usuário TRI7 (central SAEC, sem ação de ninguém) ficam fora. Meses antigos podem ter vindo da planilha Andamentos (horário corrigido em 3 horas); ao importar o relatório novo, ele prevalece no mesmo pedido e o resto continua. Conta horas úteis do pedido até os selos gerados, só dentro do expediente.'+'<h3>Quem fez · Tri7</h3>Do Relatório de andamentos do Tri7 sai, por protocolo, quem fez cada andamento (a coluna Usuário; Usuário destino é ignorado): <b>Prenotado</b> = quem deu entrada; <b>Revisão de Exigência</b> = quem redigiu a exigência e mandou revisar; <b>Nota de Exigência</b> = quem revisou e emitiu a nota; <b>Re-análise</b> = quem recebeu o título de volta; <b>Selos Gerados</b> = quem gerou os selos do registro. É informação de consulta e treinamento: o cruzamento com inconformidades não aponta responsável. Os prazos do KPI-02 continuam pela Revisão Oficial do VHL. Prazos (art. 19 §10 da Lei 6.015/73): inteiro teor 4 horas; ônus e ações / situação jurídica 1 dia útil; demais 5 dias úteis. Pedido de balcão = aparece como Certidão - RI no VHL, que também dá o tipo; os demais vêm da central e seguem o prazo de 4 horas. Certidões do fluxo de intimação ficam fora porque o prazo corre do pagamento.'+'<h3>Balcão × central (RI)</h3>Protocolo com natureza "ONR - …" veio pela central (e-protocolo); os demais são de balcão. O seletor de origem no topo (só no RI · Registro) filtra todas as páginas do RI; o KPI-02 lançado no ANOREG+ continua com todos. Certidão do RI cadastrada no VHL (Certidão - RI) é de balcão; a que só existe no Tri7 veio da central.'+'<h3>Serventias</h3>O filtro Serventia no topo vale para o site todo: RI (registro, intimações ou certidões), RC (registros ou certidões), RTD/PJ (registros ou certidões) ou Todas, que abre o comparativo com a participação % de cada serventia na produção do mês. Malote e Arquivo não são produção de serventia: o Malote aparece só como contagem de cadastros no mês. Senhas por fila: Registro de Imóveis → RI; Nascimento, Casamento e Óbito → RC; Títulos e Documentos/PJ → RTD/PJ. Prazos legais pré-preenchidos só onde há base expressa: certidão em 5 dias (Lei 6.015, art. 19; CRC: Prov. CNJ 149/2023, arts. 239-240, 5 dias úteis), casamento religioso com efeito civil em 24 h (art. 73 §2º), certidão de RTD em 5 dias úteis (art. 19 c/c art. 9º §1º). Os demais ficam em branco até você definir.'+'<h3>Outras atribuições</h3>RC, RTD, RPJ, Intimações, Malote Digital e Arquivo vêm do Prazo e Tempo Médio (todos os tipos de documento) e da Produção por Etapa do VHL. Tempo = dias úteis do ingresso à finalização (o dia do ingresso não conta). O prazo legal de cada natureza é definido por você na própria página; sem prazo, o painel mostra só os tempos. Atuação = cronômetro do VHL. Título e solicitante não são guardados.'+'<h3>Indicadores editáveis</h3>Em Lançar KPIs → Editar indicadores: nome, meta (texto copiado para o ANOREG+ e valor usado para Atende/Não atende e para os gráficos), sentido, frequência, ordem e quais aparecem. KPIs calculados pelo painel mantêm a fórmula; os novos são de lançamento manual.'+'<h3>Feriados</h3>Nacionais automáticos, inclusive Carnaval, Sexta-feira Santa e Corpus Christi. Locais: em Importar dados.'+
      '<h3>Meses salvos</h3>'+(meses.length?'<table style="max-width:560px"><thead><tr><th>Mês</th><th>Atos</th><th>Sem histórico</th><th>Atualizado</th></tr></thead><tbody>'+meses.map(function(m){ var d=state.docs[m]; return '<tr><td>'+nomeMes(m)+'</td><td>'+d.raw.total+'</td><td>'+d.raw.incompletos+'</td><td>'+new Date(d.raw.atualizadoEm).toLocaleDateString('pt-BR')+'</td></tr>'; }).join('')+'</tbody></table><p class="hint">Para apagar um mês, use <b>Importar dados › Excluir dados de um mês</b> — ele apaga o mês em todas as bases de uma vez.</p>':'Nenhum ainda.')+
      '</div>';
  }

  // ——— importar dados: um lugar só. O painel reconhece cada planilha, junta com o que já tem e recalcula tudo (RI e demais atribuições)
  var IMP_TIPOS=[['prazo','chipPrazo','PAINEL-01 · Prazo e Tempo Médio'],['etapa','chipEtapa','PAINEL-02 · Produção por Etapa'],['demanda','chipDemanda','PAINEL-03 · Demanda suspensa'],['inconf','chipInconf','PAINEL-04 · Inconformidades'],['andam','chipAndam','Tri7 · Relatório de andamentos'],['tri7','chipTri7','Andamentos (Tri7) · antiga']];
  function lerArquivo(f){
    return f.arrayBuffer().then(function(buf){
      var wb=XLSX.read(buf,{type:'array'}), ws=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(ws,{raw:true,defval:null}), cab=rows.length?Object.keys(rows[0]):[];
      var tipo=senhasEhArquivo(cab)?'senhas':Motor.detectar(cab);
      if (!tipo){ var k=k9Ler(XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}), f.name); if (k) return {tipo:'k9', k9:k, nome:f.name}; }
      return {tipo:tipo, rows:rows, nome:f.name};
    });
  }
  function k9Guardar(r){
    if (!r.mes){ var v=prompt('Não achei o período no arquivo '+r.arquivo+'. Competência (AAAA-MM):', state.lancMes||mesAnt(mesHoje())); if (!v||!/^\d{4}-\d{2}$/.test(v)) return; r.mes=v; }
    state.k9[r.mes]=r; state.lancMes=r.mes; state.impFeito.k9=(state.impFeito.k9||0)+1;
    toast('KPI-09 de '+compLabel(r.mes)+' apurado ('+r.headcount+' colaboradores)');
    if (dbPronto&&podeEscrever) db.doc('kpi09/'+r.mes).set(r).catch(function(){ toast('Apurado, mas não consegui salvar'); });
  }
  function receber(files){
    var lista=Array.prototype.slice.call(files);
    Promise.all(lista.map(lerArquivo)).then(function(res){
      var ign=[];
      res.forEach(function(r){
        if (!r.tipo){ ign.push(r.nome); return; }
        if (r.tipo==='senhas'){ senhasImportar(r.rows, r.nome); state.impFeito.senhas=(state.impFeito.senhas||0)+1; return; }
        if (r.tipo==='k9'){ k9Guardar(r.k9); return; }
        state.arquivos[r.tipo]=state.arquivos[r.tipo].concat(r.rows); state.nomes[r.tipo].push(r.nome);
      });
      if (ign.length) toast('Não reconheci: '+ign.join(', '));
      atualizarChips(); previaImport();
    }).catch(function(e){ toast('Não consegui ler o arquivo: '+e.message); });
  }
  function atualizarChips(){
    IMP_TIPOS.forEach(function(x){ var n=state.arquivos[x[0]].length, el=$(x[1]); if (!el) return;
      el.className='chip'+(n?' ok':''); el.textContent=(n?'✓ ':'')+x[2]+(n?' · '+n.toLocaleString('pt-BR')+' linhas':''); if (x[0]==='tri7') el.hidden=!n; });
    [['senhas','chipSenhas','PAINEL-05 · Senhas'],['k9','chipK9','Folha · Rel. Eventos (KPI-09)']].forEach(function(x){ var n=state.impFeito[x[0]]||0, el=$(x[1]); if (!el) return;
      el.className='chip'+(n?' ok':''); el.textContent=(n?'✓ ':'')+x[2]+(n?' · salvo':''); });
  }
  function mesesDe(rows, campo){ var o={}; Motor.linhas(rows).forEach(function(r){ var d=Motor.paraDia(r[campo],XLSX.SSF); if (d!=null) o[Motor.isoDeDia(d).slice(0,7)]=1; }); return Object.keys(o).sort(); }
  function listaMeses(ms){ return ms.length>4?nomeMes(ms[0])+' a '+nomeMes(ms[ms.length-1])+' ('+ms.length+' meses)':ms.map(nomeMes).join(', '); }
  function previaImport(){
    var a=state.arquivos, it=[];
    state.resInc = a.inconf.length ? Motor.processarInconf(a.inconf, XLSX.SSF) : null;
    state.resAnd = a.andam.length ? Motor.processarAndam(a.andam) : null;
    state.resCert = a.tri7.length ? Motor.processarCert(a.tri7) : null;
    if (a.prazo.length){ var tp={}; Motor.linhas(a.prazo).forEach(function(r){ var t=String(r['tipo de documento']||'').trim(); if (t && !/^x /i.test(t)) tp[t]=(tp[t]||0)+1; });
      it.push('<b>Prazo e Tempo Médio</b> · '+listaMeses(mesesDe(a.prazo,'finalizacao'))+' · '+Object.keys(tp).sort(function(x,y){ return tp[y]-tp[x]; }).map(function(t){ return esc(t)+' '+tp[t]; }).join(', ')); }
    if (a.etapa.length) it.push('<b>Produção por Etapa</b> · '+listaMeses(mesesDe(a.etapa,'data execucao'))+' · '+a.etapa.length.toLocaleString('pt-BR')+' execuções');
    if (a.demanda.length) it.push('<b>Demanda suspensa</b> · '+a.demanda.length.toLocaleString('pt-BR')+' linhas');
    if (state.resInc){ var mi=Object.keys(state.resInc).sort(); it.push('<b>Inconformidades</b> · '+listaMeses(mi)+' · '+mi.reduce(function(s,m){ return s+state.resInc[m].length; },0)+' registros'); }
    if (state.resAnd){ var RA=state.resAnd; it.push('<b>Tri7 · andamentos</b> · '+listaMeses(Object.keys(RA.ev).sort())+' · '+RA.nP.toLocaleString('pt-BR')+' andamentos de protocolo e '+RA.nC.toLocaleString('pt-BR')+' certidões (apresentante, adquirente e valores não são lidos)'); }
    if (state.resCert) it.push('<b>Andamentos (Tri7) · antiga</b> · certidões de '+listaMeses(Object.keys(state.resCert).sort()));
    if (!it.length){ $('previa').innerHTML=''; return; }
    var calc=a.prazo.length||a.etapa.length||a.demanda.length;
    $('previa').innerHTML='<div class="sub-h">Pronto para salvar</div><ul class="hint" style="padding-left:18px;margin:0 0 8px">'+it.map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul>'+
      '<p class="hint">Ao salvar, o painel <b>junta</b> com o que já está guardado'+(calc?' e <b>recalcula</b> todos os meses do RI e das demais atribuições com os dados brutos completos':'')+'. Nada do que já existe se perde.</p>'+
      '<div class="ctl" style="margin-top:10px"><button class="btn primary" type="button" id="btnSalvar">Salvar e atualizar o painel</button><button class="btn" type="button" id="btnLimpar">Limpar arquivos</button></div>';
  }
  // inconformidades do mês: se o arquivo novo cobre o período do salvo, substitui; se cobre só parte, junta
  function juntarInconf(m, novos){
    var velhos=state.inconf[m]||[]; if (!velhos.length) return novos;
    function faixa(L){ var d=L.map(function(r){ return r.d; }).sort(); return [d[0],d[d.length-1]]; }
    var fv=faixa(velhos), fn=faixa(novos);
    if (fn[0]<=fv[0] && fn[1]>=fv[1]) return novos;
    var por={}; velhos.forEach(function(r){ por[r.id]=r; }); novos.forEach(function(r){ por[r.id]=r; }); return Object.keys(por).map(function(k){ return por[k]; });
  }
  // recalcula RI (meses + logs) e demais atribuições (serv) a partir de todos os dados brutos guardados
  function recalcDeBrutos(aviso){
    return window.nuvem.lerColecao('brutos').then(function(rows){
      var P=[], E=[], D=[]; rows.forEach(function(x){ var d=brutoDecod(x.dados); if (x.id.indexOf('prazo-')===0) P=P.concat(d); else if (x.id.indexOf('etapa-')===0) E=E.concat(d); else if (x.id==='demanda') D=D.concat(d); });
      if (!P.length) return {ri:0, serv:0};
      var p=Promise.resolve(), nRI=0, nS=0;
      if (E.length){ if (aviso) aviso('Recalculando o RI…');
        var res=Motor.processar(P,E,D,XLSX.SSF,state.extras), ms=Object.keys(res.meses).sort(), origem={recalculado:new Date().toISOString(), versao:APP_VERSAO, etapaIni:res.etapaIni, etapaFim:res.etapaFim}; nRI=ms.length;
        ms.forEach(function(m){ p=p.then(function(){ var dm=Motor.codificar(res.meses[m],origem,(res.producao||{})[m]); state.docs[m]={raw:dm,atos:Motor.decodificar(dm)}; return db.doc('meses/'+m).set(dm); })
          .then(function(){ var lg=Motor.codificarLog(res.meses[m]); state.logs[m]=lg; delete state.logCache[m]; return db.doc('logs/'+m).set(lg); }); }); }
      var S=Motor.processarServ(P,E,XLSX.SSF), msS=Object.keys(S).sort(); nS=msS.length;
      p=p.then(function(){ if (aviso) aviso('Atualizando RC, RTD, RPJ e demais…'); });
      msS.forEach(function(m){ var doc=Motor.codificarServ(m,S[m],'Prazo e Tempo Médio + Produção por Etapa (VHL)'); p=p.then(function(){ state.serv[m]=Motor.decodificarServ(doc); return db.doc('serv/'+m).set(doc); }); });
      return p.then(function(){ return {ri:nRI, serv:nS}; });
    });
  }
  function salvar(){
    if (!dbPronto||!podeEscrever){ toast('Banco de dados indisponível — nada foi salvo'); return; }
    var a=state.arquivos, docs=[], btn=$('btnSalvar'), org=function(t){ return state.nomes[t].join(', '); };
    function aviso(t){ if (btn) btn.textContent=t; }
    btn.disabled=true; aviso('Salvando…');
    if (state.resInc) Object.keys(state.resInc).forEach(function(m){ docs.push({col:'inconf',id:m,data:{mes:m,v:1,origem:org('inconf'),atualizadoEm:new Date().toISOString(),recs:juntarInconf(m,state.resInc[m])}}); });
    var usrNovo=null, certNovo={}, autoNovo={};
    if (state.resAnd){ var RA=state.resAnd, certN=[].concat.apply([],Object.keys(RA.cert).map(function(m){ return RA.cert[m].recs; })), lsA={};
      Object.keys(RA.ev).forEach(function(m){ RA.ev[m].forEach(function(e){ lsA[e.u]=1; }); }); certN.forEach(function(r){ lsA[r.u]=1; });
      var sug=mapaSugerido(Object.keys(lsA), certN); Object.keys(sug).forEach(function(l){ state.usrAuto[l]=sug[l]; }); usrNovo=Object.assign({},state.usrAuto,state.usr);
      Object.keys(RA.ev).forEach(function(m){ docs.push({col:'andam',id:m,data:Motor.codificarAndam(m,(state.andam[m]||[]).concat(RA.ev[m]),org('andam'))}); });
      Object.keys(RA.cert).forEach(function(m){ if (RA.cert[m].auto) autoNovo[m]=RA.cert[m].auto; certNovo[m]=(certNovo[m]||[]).concat(RA.cert[m].recs.map(function(r){ return {p:r.p,i:r.i,f:r.f,u:nomeLogin(r.u)}; })); }); }
    if (state.resCert) Object.keys(state.resCert).forEach(function(m){ certNovo[m]=(certNovo[m]||[]).concat(state.resCert[m].recs); });
    Object.keys(certNovo).forEach(function(m){ var ex=state.cert[m], por={}; if (ex) ex.recs.forEach(function(r){ por[r.p]=r; }); certNovo[m].forEach(function(r){ por[r.p]=r; });
      var au=((ex&&ex.raw.auto)||[]).concat(autoNovo[m]||[]);
      docs.push({col:'cert',id:m,data:Motor.codificarCert({mes:m, erros:ex?ex.raw.erros||0:0, pend:ex?ex.raw.pend||0:0, auto:(au.length||(ex&&ex.raw.auto)||autoNovo[m])?au:null, recs:Object.keys(por).map(function(k){ return por[k]; }).sort(function(x,y){ return x.f-y.f; })}, org('andam')||org('tri7'))}); });
    var grande=docs.filter(function(d){ return JSON.stringify(d.data).length>(d.col==='andam'?900000:250000); });
    if (grande.length){ toast('Mês grande demais para salvar: '+grande.map(function(d){return d.col+' '+nomeMes(d.id);}).join(', ')); btn.disabled=false; aviso('Salvar e atualizar o painel'); return; }
    var calc=a.prazo.length||a.etapa.length||a.demanda.length, p=Promise.resolve(), resumoTxt=[];
    docs.forEach(function(d){ p=p.then(function(){ return db.doc(d.col+'/'+d.id).set(d.data); }).then(function(){
      if (d.col==='cert') state.cert[d.id]={raw:d.data,recs:Motor.decodificarCert(d.data)};
      else if (d.col==='andam'){ state.andam[d.id]=Motor.decodificarAndam(d.data); state.andIdx=null; }
      else if (d.col==='inconf') state.inconf[d.id]=d.data.recs; }); });
    if (usrNovo) p=p.then(function(){ state.usr=usrNovo; return salvarUsr(); });
    if (calc) p=p.then(function(){ aviso('Guardando dados brutos…'); return brutosSalvar(); }).then(function(){ return recalcDeBrutos(aviso); }).then(function(r){ if (r.ri) resumoTxt.push('RI: '+r.ri+' meses'); if (r.serv) resumoTxt.push('demais atribuições: '+r.serv+' meses'); });
    p.then(function(){ var n={}; docs.forEach(function(d){ n[d.col]=(n[d.col]||0)+1; });
        if (n.inconf) resumoTxt.push('inconformidades: '+n.inconf+' meses'); if (n.cert) resumoTxt.push('certidões: '+n.cert+' meses'); if (n.andam) resumoTxt.push('andamentos Tri7: '+n.andam+' meses');
        limparArquivos(); render(); irAba('geral'); toast('Painel atualizado'+(resumoTxt.length?' — '+resumoTxt.join(' · '):'')); })
     .catch(function(e){ btn.disabled=false; aviso('Salvar e atualizar o painel');
       toast(e&&e.code==='quota_exceeded'?'Banco cheio':e&&e.code==='invalid_argument'?'Sem permissão para salvar':'Não consegui salvar, tente de novo'); });
  }
  function limparArquivos(){ IMP_TIPOS.forEach(function(x){ state.arquivos[x[0]]=[]; state.nomes[x[0]]=[]; }); state.resAnd=null; state.resInc=null; state.resCert=null; state.resultado=null; atualizarChips(); $('previa').innerHTML=''; }
  function abrirImport(){ irAba('imp'); }
  // ——— excluir os dados de um mês (arquiva no banco; dá para voltar com um backup)
  var EXC_GRUPOS=[
    ['ri','Prazos do RI (resultado e linha do tempo)',function(m){ return state.docs[m]?state.docs[m].atos.length+' atos':null; },[['meses'],['logs']],true],
    ['serv','RC, RTD/PJ, intimações e malote',function(m){ return state.serv[m]?state.serv[m].length+' documentos':null; },[['serv']],true],
    ['brutos','Dados brutos do VHL (Prazo e Produção por Etapa) — sem isso o mês volta no próximo recálculo',function(m){ return 'prazo e etapas'; },[['brutos','prazo-'],['brutos','etapa-']],true],
    ['inconf','Inconformidades',function(m){ return state.inconf[m]?state.inconf[m].length+' registros':null; },[['inconf']],true],
    ['cert','Certidões',function(m){ return state.cert[m]?state.cert[m].recs.length+' certidões':null; },[['cert']],true],
    ['andam','Andamentos do Tri7',function(m){ return state.andam[m]?state.andam[m].length+' andamentos':null; },[['andam']],true],
    ['senhas','Senhas',function(m){ return state.senhas[m]?state.senhas[m].L.length+' senhas':null; },[['senhas']],true],
    ['k9','KPI-09 (Rel. Eventos)',function(m){ return state.k9[m]?state.k9[m].headcount+' colaboradores':null; },[['kpi09']],true],
    ['kp','Lançamentos de KPIs que você digitou',function(m){ return state.kp[m]?'valores e análises':null; },[['kpis']],false]];
  function excMeses(){ var o={}; [state.docs,state.serv,state.inconf,state.cert,state.andam,state.senhas,state.k9,state.kp,state.logs].forEach(function(x){ Object.keys(x||{}).forEach(function(m){ if (/^\d{4}-\d{2}$/.test(m)) o[m]=1; }); }); return Object.keys(o).sort().reverse(); }
  function renderExcluir(){
    var sel=$('excMes'); if (!sel) return; var ms=excMeses(), atual=sel.value;
    var html='<option value="">Escolha o mês…</option>'+ms.map(function(m){ return '<option value="'+m+'">'+nomeMes(m)+'</option>'; }).join('');
    if (sel.innerHTML!==html){ sel.innerHTML=html; sel.value=ms.indexOf(atual)>=0?atual:''; }
    var m=sel.value, el=$('excPrevia'); if (!m){ el.innerHTML=''; return; }
    var itens=EXC_GRUPOS.map(function(g){ var q=g[2](m); if (q==null) return ''; return '<label class="lc-chk" style="display:flex;gap:6px;margin:3px 0"><input type="checkbox" data-exc="'+g[0]+'"'+(g[4]?' checked':'')+'> <span>'+esc(g[1])+' <span class="mut">· '+esc(q)+'</span></span></label>'; }).join('');
    el.innerHTML=itens+'<div class="ctl" style="margin-top:8px"><button class="btn" type="button" id="btnExcluirMes" style="border-color:var(--crit);color:var(--crit)">Excluir dados de '+nomeMes(m)+'</button></div>';
  }
  function excluirMes(){
    var m=$('excMes').value; if (!m||!dbPronto||!podeEscrever) return;
    var marc=Array.prototype.map.call(document.querySelectorAll('#excPrevia input[data-exc]:checked'),function(i){ return i.dataset.exc; }); if (!marc.length){ toast('Marque o que excluir'); return; }
    var nomes=EXC_GRUPOS.filter(function(g){ return marc.indexOf(g[0])>=0; }).map(function(g){ return '• '+g[1].split(' — ')[0]; });
    if (!confirm('Excluir de '+nomeMes(m)+':\n\n'+nomes.join('\n')+'\n\nOs registros ficam arquivados no banco (um backup anterior traz de volta). Continuar?')) return;
    var alvos=[]; EXC_GRUPOS.forEach(function(g){ if (marc.indexOf(g[0])<0) return; g[3].forEach(function(c){ alvos.push(c[0]+'/'+(c[1]||'')+m); }); });
    var b=$('btnExcluirMes'); b.disabled=true; b.textContent='Excluindo…'; var p=Promise.resolve();
    alvos.forEach(function(a){ p=p.then(function(){ return db.doc(a).delete().catch(function(){}); }); });
    p.then(function(){
      if (marc.indexOf('ri')>=0){ delete state.docs[m]; delete state.logs[m]; delete state.logCache[m]; }
      if (marc.indexOf('serv')>=0) delete state.serv[m];
      if (marc.indexOf('inconf')>=0) delete state.inconf[m];
      if (marc.indexOf('cert')>=0) delete state.cert[m];
      if (marc.indexOf('andam')>=0){ delete state.andam[m]; state.andIdx=null; }
      if (marc.indexOf('senhas')>=0) delete state.senhas[m];
      if (marc.indexOf('k9')>=0) delete state.k9[m];
      if (marc.indexOf('kp')>=0) delete state.kp[m];
      if (state.periodo===m) state.periodo='todos';
      $('excMes').value=''; render(); renderExcluir(); toast('Dados de '+nomeMes(m)+' excluídos'); })
     .catch(function(){ toast('Não consegui excluir tudo — tente de novo'); b.disabled=false; });
  }

  function renderFeriados(){
    $('ferLista').innerHTML=state.extras.length?state.extras.slice().sort().map(function(d){ return '<span class="fer">'+fmtData(d)+'<button type="button" data-fer="'+d+'" aria-label="Remover '+fmtData(d)+'">×</button></span>'; }).join(''):'<span class="hint">Nenhum.</span>';
  }
  function salvarFeriados(){ renderFeriados(); salvarCfg(); render(); }

  // ——— eventos
  $('selMes').addEventListener('change',function(e){ state.periodo=e.target.value; if (state.periodo!=='todos') state.lancMes=state.periodo; render(); });
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
    if (t.id==='btnVoltar') return goVoltar();
    if (t.dataset && t.dataset.golvoltar){ var gx=$('goLista'); if (gx) gx.remove(); if (state.goAnc&&state.goAnc.scrollIntoView) state.goAnc.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    if (t.dataset && t.dataset.golfechar){ var gx2=$('goLista'); if (gx2) gx2.remove(); return; }
    if (t.dataset && t.dataset.golcopiar){ var GA=state.goListaAtual; if (GA) copiarTexto(GA.itens.map(function(x){ return goCodigo(GA.tipo,x); }).filter(function(x){ return x!=null; }).join('\n'), t); return; }
    if (t.dataset && t.dataset.pv!=null) return pgVisDef(state.aba, t.dataset.pv==='1');
    var gel=t.closest&&t.closest('[data-go]'); if (gel){ if (toqueSoDica(gel)) return; return goExec(gel); }
    if (t.id==='btnVis'){ if (state.aba==='vis') return irAba(state.abaAntVis||'geral'); state.abaAntVis=state.aba; return irAba('vis'); }
    var dsl=t.closest&&t.closest('tr[data-dessel]'); if (dsl){ state.desSel=state.desSel===dsl.dataset.dessel?null:dsl.dataset.dessel; renderDes(); var dd=document.querySelector('#tabDes .sub-h:last-of-type'); return; }
    var sn=t.closest&&t.closest('tr[data-srvnat]'); if (sn && !t.closest('input')){ state.srvNat=state.srvNat===sn.dataset.srvnat?null:sn.dataset.srvnat; return renderAtr(); }
    if (t.id==='kpiEdBtn'){ state.lancEdit=true; return renderLanc(true); }
    if (t.id==='kpiEdFechar'){ state.lancEdit=false; catAplicar(state.kpiCat); return renderLanc(); }
    if (t.id==='kpiEdSalvar'){ kpiEdLer(); catSalvar(); state.lancEdit=false; render(); return renderLanc(); }
    if (t.id==='kpiEdPadrao'){ if (!confirm('Voltar todos os indicadores ao padrão? Os KPIs novos que você criou serão removidos da lista (os valores lançados continuam guardados).')) return; state.kpiCat={itens:{},novos:[],ordem:[]}; catSalvar(); return renderLanc(true); }
    if (t.id==='kpiEdNovo'){ kpiEdLer(); var nid=prompt('Código do novo indicador (ex.: KPI-16):'); if (!nid) return; nid=nid.trim(); if (kpiDef(nid)){ toast('Já existe um indicador com esse código'); return; }
      state.kpiCat.novos.push({id:nid, nome:nid, meta:'', tipo:'taxa', lab0:'Numerador', lab1:'Denominador'}); state.kpiCat.itens[nid]={sentido:'maior'}; catAplicar(state.kpiCat); return renderLanc(true); }
    if (t.dataset && t.dataset.kpmov){ kpiEdLer(); var o=state.kpiCat.ordem, id=t.closest('tr').dataset.kped, i=o.indexOf(id), j=i+(+t.dataset.kpmov); if (i<0||j<0||j>=o.length) return; o.splice(i,1); o.splice(j,0,id); catAplicar(state.kpiCat); return renderLanc(true); }
    if (t.dataset && t.dataset.kprm){ var rid=t.closest('tr').dataset.kped; if (!confirm('Remover '+rid+' da lista? Os valores já lançados continuam guardados.')) return; kpiEdLer(); state.kpiCat.novos=state.kpiCat.novos.filter(function(x){ return x.id!==rid; }); delete state.kpiCat.itens[rid]; catAplicar(state.kpiCat); return renderLanc(true); }
    if (t.dataset && (t.dataset.justSalvar||t.dataset.justRm||t.dataset.avSalvar)){
      var row=t.closest('tr'), a=atoPorCod(row.dataset.cod); if(!a) return;
      if (t.dataset.justSalvar){ var mot=row.querySelector('select').value, obs=row.querySelector('input').value.trim();
        if (mot==='outro' && !obs){ toast('Descreva o motivo na observação'); row.querySelector('input').focus(); return; }
        return gravar('justificativas',a,{codigo:a.c,mes:a.mes,natureza:a.natOrig||a.nat,motivo:mot,obs:obs,em:new Date().toISOString()}); }
      if (t.dataset.justRm) return gravar('justificativas',a,null);
      var res=row.querySelector('select').value, ob=row.querySelector('input').value.trim();
      return gravarLote([{a:a,dados:avDoc(a,res,ob)}]);
    }
    if (t.dataset && t.dataset.avFb){ var ra=atoPorCod(t.closest('tr').dataset.cod); if (ra) irFeedback(ra); return; }
    if (t.dataset && t.dataset.avTudo){ var lote=[]; Object.keys(state.avDraft).forEach(function(c){ var a=atoPorCod(c); if (!a) return; var d=state.avDraft[c]; lote.push({a:a,dados:avDoc(a,d.res,d.obs)}); }); if (!lote.length) return; return gravarLote(lote); }
    if (t.dataset && t.dataset.verrel){ state.relSel=state.incFiltroPessoa?semAc(state.incFiltroPessoa):'__geral'; return irAba('rel'); }
    if (t.id==='relBaixar') return baixarRelatorio();
    var cpb=t.closest&&t.closest('.cp'); if (cpb) return copiarTexto(cpb.dataset.cp, cpb);
    var pl=t.closest&&t.closest('[data-prot]'); if (pl){ if (!pl.closest('#protBox')) goGuardar(); $('protIn').value=pl.dataset.prot; return fichaProtocolo(pl.dataset.prot); }
    if (t.id==='protFechar'){ state.protSel=null; $('protBox').hidden=true; return; }
    if (t.id==='protCopiar') return copiarTexto(state.protTxt, t);
    if (t.id==='memBtn') return baixarMemoria(state.lancMes);
    if (t.id==='btnBackup') return exportarBackup();
    if (t.id==='btnRestaurar') return $('restIn').click();
    if (t.id==='btnRecalc') return recalcularTudo();
    if (t.dataset && t.dataset.atmet){ state.atMet=t.dataset.atmet; return renderAtend(); }
    var atp=t.closest&&t.closest('tr[data-atpessoa]'); if (atp){ state.atPessoa=state.atPessoa===atp.dataset.atpessoa?null:atp.dataset.atpessoa; renderAtend(); var dt=$('atDet'); if (dt) dt.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (t.dataset && t.dataset.atfechar){ state.atPessoa=null; return renderAtend(); }
    if (t.dataset && t.dataset.atrel){ state.relSel=semAc(state.atPessoa); return irAba('rel'); }
    if (t.dataset && t.dataset.attodos){ state.atTodosDias=!state.atTodosDias; return renderAtend(); }
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
    if (t.id==='btnExcluirMes') return excluirMes();
    if (t.id==='fecharDet'){ state.natSel=null; return render(); }
    if (t.dataset && t.dataset.fer){ state.extras=state.extras.filter(function(d){return d!==t.dataset.fer;}); return salvarFeriados(); }
    if (t.dataset && t.dataset.nxnat!=null){ var nn=t.dataset.nxnat, ix=state.nx.sel.indexOf(nn); if (ix>=0) state.nx.sel.splice(ix,1); else state.nx.sel.push(nn); return render(); }
    if (t.dataset && t.dataset.nxrm!=null){ state.nx.sel=state.nx.sel.filter(function(x){ return x!==t.dataset.nxrm; }); return render(); }
    if (t.dataset && t.dataset.nxlimpar){ state.nx.sel=[]; return render(); }
    if (t.dataset && t.dataset.nxmodo){ state.nx.modo=t.dataset.nxmodo; return render(); }
    if (t.dataset && t.dataset.nxabrir){ var ga=(state.natGr.grupos||[]).filter(function(g){ return g.id===t.dataset.nxabrir; })[0]; if (ga){ state.nx.sel=ga.nats.slice(); state.nx.modo='juntar'; render(); } return; }
    if (t.dataset && t.dataset.nxsalvar){ var nm=($('nxNome').value||'').trim(), G=state.natGr.grupos||[], todosN={};
      Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ todosN[a.natOrig||a.nat]=1; }); }); Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ todosN[d.natOrig||d.nat]=1; }); });
      if (!nm){ toast('Dê um nome ao grupo'); $('nxNome').focus(); return; }
      if (G.some(function(g){ return g.nome===nm; })){ toast('Já existe um grupo com esse nome'); return; }
      if (todosN[nm] && state.nx.sel.indexOf(nm)<0){ toast('Esse nome já é de uma natureza do VHL: escolha outro'); return; }
      G.push({id:'g'+Date.now().toString(36), nome:nm, nats:state.nx.sel.slice(), ativo:false, em:new Date().toISOString()}); state.natGr.grupos=G; return grSalvar('Grupo "'+nm+'" salvo'); }
    if (t.dataset && t.dataset.nxativar){ var gg=(state.natGr.grupos||[]).filter(function(g){ return g.id===t.dataset.nxativar; })[0]; if (!gg) return;
      if (!gg.ativo){ var conf=(state.natGr.grupos||[]).filter(function(g){ return g.ativo&&g.id!==gg.id&&g.nats.some(function(n){ return gg.nats.indexOf(n)>=0; }); })[0]; if (conf){ toast('Uma das naturezas já está no grupo ativo "'+conf.nome+'"'); return; }
        if (!confirm('Usar "'+gg.nome+'" como uma natureza só nas outras páginas?\n\n'+gg.nats.join(' + ')+'\n\nOs KPIs lançados não mudam. Dá para desfazer a qualquer momento.')) return; }
      gg.ativo=!gg.ativo; return grSalvar(gg.ativo?'"'+gg.nome+'" agora vale como uma natureza só':'"'+gg.nome+'" desfeito: os nomes originais voltaram'); }
    if (t.dataset && t.dataset.nxexcluir){ var ge=(state.natGr.grupos||[]).filter(function(g){ return g.id===t.dataset.nxexcluir; })[0]; if (!ge||!confirm('Excluir o grupo "'+ge.nome+'"? As naturezas originais não mudam.')) return; state.natGr.grupos=state.natGr.grupos.filter(function(g){ return g!==ge; }); return grSalvar('Grupo excluído'); }
    var seg=t.closest&&t.closest('.segb');
    if (seg){ state.natTodas=seg.dataset.todas==='1'; return renderNat(todosAtos()); }
    var th=t.closest&&t.closest('#tabNat th');
    if (th){ var k=th.dataset.k; state.sortNat = state.sortNat.k===k?{k:k,d:-state.sortNat.d}:{k:k,d:k==='nat'?1:-1}; return renderNatTabela(todosAtos()); }
    var tr=t.closest&&t.closest('#tabNat tr.click');
    if (tr){ var n=tr.dataset.nat; state.natSel = state.natSel===n?null:n; state.busca=''; state.filtroFora=false; var A=todosAtos(); renderNatTabela(A); if(state.natSel) renderDetalhe(A.filter(function(a){return a.nat===state.natSel;})); else $('detalhe').innerHTML=''; if(state.natSel){ var d=$('detalhe'); d&&d.scrollIntoView({behavior:'smooth',block:'nearest'}); } return; }
    var gir=t.closest&&t.closest('[data-ir]'); if (gir) return irAba(gir.dataset.ir);
    if (t.id==='btnMenu'){ if (window.innerWidth>980) return menuRecolher(false); return menuAbrir(!document.body.classList.contains('menu-aberto')); }
    if (t.id==='btnRecolher') return menuRecolher(true);
    if (t.id==='btnTema') return temaTrocar();
    if (t.id==='menuFundo') return menuAbrir(false);
    var tab=t.closest&&t.closest('.tab');
    if (tab){ state.voltar=null; $('btnVoltar').hidden=true; return irAba(tab.dataset.tab); }
  });
  var PG_VIS={k1:1,at:1,cer:1,nao:1,nat:1};
  function pgVisLer(){ try{ return JSON.parse(localStorage.getItem('crco-pgvis')||'{}')||{}; }catch(e){ return {}; } }
  state.pgVis=pgVisLer();
  function pgVisDef(aba,on){ state.pgVis[aba]=on; try{ localStorage.setItem('crco-pgvis',JSON.stringify(state.pgVis)); }catch(e){} pgVisSw(); render(); }
  function pgVisSw(){ var el=$('pgVisSw'); if (!el) return; var k=state.aba; if (!PG_VIS[k]){ el.innerHTML=''; return; } var on=!!state.pgVis[k];
    el.innerHTML='<div class="seg" role="group" aria-label="Formato da página"><button type="button" class="segb" data-pv="0" aria-pressed="'+!on+'">▤ Tabela</button><button type="button" class="segb" data-pv="1" aria-pressed="'+on+'">◫ Visual</button></div>'; }
  var TITULOS={des:'Desempenho · ritmo e linha normal',vis:'Modo visual',geral:'Painel geral',nat:'Prazos · por natureza',eta:'Prazos · por etapa',fp:'Prazos · fora do prazo',ex:'Prazos · exigências',nao:'Prazos · cancelados e especiais',k1:'Inconformidades',imp:'Importar dados',cer:'Certidões',at:'Atendimento',rel:'Relatórios por pessoa',tri:'Quem fez · Tri7',lanc:'Lançar KPIs no ANOREG+',met:'Como é calculado'};
  function menuAbrir(sim){ document.body.classList.toggle('menu-aberto',!!sim); $('menuFundo').hidden=!sim; }
  function irAba(k){ if (k==='imp' && !podeEscrever) k='geral'; if (typeof svModo==='function' && svModo()==='cert' && (k==='geral'||SO_SERV.indexOf(k)>=0)) k='cer'; state.aba=k; $('pgGeral').hidden=k!=='geral'; $('pgConteudo').hidden=k==='geral'||k==='imp'; $('importar').hidden=k!=='imp'; $('pgTitulo').textContent=TITULOS[k]||''; pgVisSw(); menuAbrir(false); window.scrollTo(0,0); if (k==='geral'){ if (state.sujo&&state.sujo.geral) pagPendente('geral'); else renderGraficos(); } document.querySelectorAll('.tab').forEach(function(b){ b.setAttribute('aria-selected',b.dataset.tab===k?'true':'false'); });
    var MAP={nat:'tabNat',k1:'tabK1',cer:'tabCer',eta:'tabEta',fp:'tabFp',ex:'tabEx',nao:'tabNao',at:'tabAt',tri:'tabTri',lanc:'tabLanc',rel:'tabRel',met:'tabMet',des:'tabDes',vis:'tabVis'}; Object.keys(MAP).forEach(function(x){ $(MAP[x]).hidden=state.aba!==x; });
    if (state.sujo && ['rel','tri','lanc','at'].indexOf(k)>=0) delete state.sujo[k]; else if (k!=='geral') pagPendente(k);
    if (k==='rel') renderRel(); if (k==='tri') renderTri(); if (k==='imp') renderExcluir();  if (k==='lanc') renderLanc(); if (k==='at') renderAtend(); if (k==='des') renderDes(); if (k==='vis') renderVis(); var bv=$('btnVis'); if (bv) bv.setAttribute('aria-pressed',k==='vis'?'true':'false'); }
  function avRascunho(t){ var row=t.closest&&t.closest('#tabEx tr[data-cod]'); if (!row||!t.matches('select.mini,input.mini')) return false;
    var cod=row.dataset.cod, a=atoPorCod(cod); if (!a) return true; var res=row.querySelector('select').value, ob=row.querySelector('input').value.trim(), sv=state.aval[idDoc(cod)]||{};
    if ((sv.resultado||'')===res && (sv.obs||'')===ob) delete state.avDraft[cod]; else state.avDraft[cod]={res:res,obs:ob};
    row.classList.toggle('rasc',!!state.avDraft[cod]); var n=Object.keys(state.avDraft).length, b=$('avTudo'); if (b){ b.disabled=!n; b.textContent=n?'Salvar tudo ('+n+' alterada'+(n>1?'s':'')+')':'Salvar tudo'; }
    if (t.tagName==='SELECT'){ var bf=row.querySelector('[data-av-fb]'); if (res==='nc' && !bf){ var sb=row.querySelector('[data-av-salvar]'); sb.insertAdjacentHTML('afterend',' <button class="btn sm" type="button" data-av-fb="1" title="Abrir o feedback da pessoa que redigiu a exigência">→ Feedback</button>'); } else if (res!=='nc' && bf) bf.remove(); }
    return true; }
  document.addEventListener('change',function(e){
    var t=e.target; if (avRascunho(t)) return;
    if (t.id==='relSel'){ state.relSel=t.value; return renderRel(); }
    if (t.dataset && t.dataset.kpf==='sentido'){ var mi=t.closest('tr').querySelector('[data-kpf="metaV"]'); if (mi) mi.disabled=t.value==='baseline'; return; }
    if (t.dataset && t.dataset.srvprazo!=null){ var vp=t.value.trim().replace(',','.'); if (vp===''||isNaN(+vp)) state.prazosServ[t.dataset.srvprazo]=null; else state.prazosServ[t.dataset.srvprazo]=Math.max(0,Math.round(+vp)); salvarPrazosServ(); return renderAtr(); }
    if (t.id==='excMes') return renderExcluir();
    if (t.id==='selOrig'){ state.riOrig=t.value; return render(); }
    if (t.id==='selAtr'||t.id==='selSub'){ if (t.id==='selAtr') state.sv=t.value; else { state.svSub=state.svSub||{}; state.svSub[svAtual()]=t.value; } state.srvNat=null; state.incFiltroCat=null; state.incFiltroPessoa=null; render(); if (svModo()==='cert') irAba('cer'); else if (state.aba==='cer'&&svModo()!=='ri') irAba('geral'); return; }
    if (t.id==='lancMes'){ state.lancMes=t.value; return renderLanc(); }
    if (t.id==='lancTodos'){ state.lancTodos=t.checked; return renderLanc(); }
    if (t.id==='restIn'){ if (t.files.length) restaurarBackup(t.files[0]); t.value=''; return; }
    if (t.dataset && t.dataset.lanc){ var cdl=t.closest('.lc-card'), dl=lancDoc(state.lancMes), kid=cdl.dataset.kpi, Kl=kpiDef(kid);
      if (t.checked) dl.lanc[kid]=kpiTravar(Kl,state.lancMes);
      else { if (kpiTravado(state.lancMes,kid) && !confirm('Destravar '+kid+' de '+compLabel(state.lancMes)+'?\n\nO valor guardado será descartado e o card volta a mostrar o cálculo de hoje. Faça isso só se for corrigir o valor no ANOREG+.')){ t.checked=true; return; } delete dl.lanc[kid]; }
      lancSalvar(state.lancMes); return renderLanc(); }
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
    if (avRascunho(e.target)) return;
    if (e.target.dataset && e.target.dataset.kpin){ var card=e.target.closest('.lc-card'), dk=lancDoc(state.lancMes), id=card.dataset.kpi, v=dk.v[id]=dk.v[id]||{}; v[e.target.dataset.kpin]=e.target.value; if (e.target.dataset.kpin!=='a') lancAtualizarCard(card); lancSalvar(state.lancMes); return; }
    if (e.target.dataset && e.target.dataset.fb && state.relSel!=='__geral'){ var kf=chaveFeedback(state.relSel), o=state.feedback[kf]=Object.assign({},state.feedback[kf]||{}); o[e.target.dataset.fb]=e.target.value; return; }
    if (e.target.dataset && e.target.dataset.usr!=null){ var lg=e.target.dataset.usr, nv=e.target.value.trim(); clearTimeout(state.usrT); state.usrT=setTimeout(function(){ if (nv) state.usr[lg]=nv; else delete state.usr[lg]; salvarUsr(); },900); return; }
    if (e.target.id==='buscaEx'){ state.buscaEx=e.target.value; var p2=e.target.selectionStart; renderEx(todosAtos()); var bx=$('buscaEx'); bx.focus(); bx.setSelectionRange(p2,p2); return; }
    if (e.target.id==='nxBusca'){ state.nx.busca=e.target.value; var cn={}; nxItens().forEach(function(x){ var n=nxNat(x); cn[n]=(cn[n]||0)+1; }); var op=$('nxOps'); if (op) op.innerHTML=nxOpsHTML(cn); return; }
    if (e.target.id==='natBusca'){ state.natBusca=e.target.value; renderNatTabela(todosAtos()); return; }
    if (e.target.id==='busca'){ state.busca=e.target.value; var pos=e.target.selectionStart; renderDetalhe(todosAtos().filter(function(a){return a.nat===state.natSel;})); var b=$('busca'); b.focus(); b.setSelectionRange(pos,pos); }
    if (e.target.id==='soFora'){ state.filtroFora=e.target.checked; renderDetalhe(todosAtos().filter(function(a){return a.nat===state.natSel;})); }
  });
  var tip=$('tip'), tipTimer=null, toque={el:null,ultimo:null,novo:false,t:0};
  function dicaGo(el,toq){ var g=el.dataset.goh?el:(el.closest&&el.closest('[data-go]')); return g&&g.dataset.goh?'<div class="tip-go">▸ '+(toq?'Toque de novo para ':'Clique para ')+esc(g.dataset.goh)+'</div>':''; }
  // no celular o 1º toque mostra a dica; o 2º toque no mesmo elemento abre
  function toqueSoDica(el){ if (Date.now()-toque.t>900 || toque.el!==el || !toque.novo || !el.hasAttribute('data-tip')) return false; toque.novo=false; return true; }
  document.addEventListener('touchstart',function(e){ var g=e.target.closest&&e.target.closest('[data-go]'); toque.novo=!!g&&g!==toque.ultimo; toque.el=g; toque.ultimo=g; toque.t=Date.now();
    var el=e.target.closest&&e.target.closest('[data-tip]'); if (!el){ tip.hidden=true; return; }
    var to=e.touches[0]; tip.innerHTML=el.getAttribute('data-tip')+dicaGo(el,true); tip.hidden=false; var w=tip.offsetWidth, h=tip.offsetHeight, x=Math.min(Math.max(8,to.clientX-w/2),innerWidth-w-8), y=to.clientY-h-18; if (y<8) y=to.clientY+18;
    tip.style.left=x+'px'; tip.style.top=y+'px'; clearTimeout(tipTimer); tipTimer=setTimeout(function(){ tip.hidden=true; },3500); },{passive:true});
  document.addEventListener('mousemove',function(e){
    if (Date.now()-toque.t<1200) return; // mouse emulado depois de um toque: a dica do toque fica
    var el=e.target.closest&&e.target.closest('[data-tip]');
    if(!el){ tip.hidden=true; return; }
    tip.innerHTML=el.getAttribute('data-tip')+dicaGo(el,false); tip.hidden=false;
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
    if (user && user.can){ Promise.resolve(user.can('data.write')).then(function(v){ if(v===false){ podeEscrever=false; $('tabImp').hidden=true; $('grpDados').hidden=true; if (state.aba==='imp') irAba('geral'); avisar('Você está vendo em modo leitura.'); render(); } }); }
    db.collection('meses').onSnapshot(function(snap){
      var docs={}; snap.docs.forEach(function(d){ var raw=d.data(); if(raw&&raw.atos) docs[raw.mes||d.id]={raw:raw,atos:Motor.decodificar(raw)}; });
      state.docs=docs; agendarRender();
    }, function(e){ avisar('Perdi a conexão com o banco ('+e.code+'). Recarregue a página.'); });
    db.collection('justificativas').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ m[d.id]=d.data(); }); state.just=m; agendarRender(); }, function(){});
    db.collection('avaliacoes').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ m[d.id]=d.data(); }); state.aval=m; agendarRender(); }, function(){});
    // LGPD: CPF/RG nas observações saem mascarados na tela; o administrador regrava o mês já mascarado (uma vez só)
    var incLimpos={};
    db.collection('inconf').onSnapshot(function(snap){ var m={}, sujos=[];
      snap.docs.forEach(function(d){ var x=d.data(); if (!(x&&x.recs)) return; var mud=0;
        var recs=x.recs.map(function(r){ var o=Motor.mascarar(r.o), j=Motor.mascarar(r.j); if (o!==r.o||j!==r.j){ mud++; return Object.assign({},r,{o:o,j:j}); } return r; });
        m[x.mes||d.id]=recs; if (mud) sujos.push({id:d.id, doc:Object.assign({},x,{recs:recs}), n:mud}); });
      state.inconf=m; agendarRender();
      if (podeEscrever && sujos.length){ var p=Promise.resolve(), tot=0; sujos.forEach(function(z){ if (incLimpos[z.id]) return; incLimpos[z.id]=1; tot+=z.n; p=p.then(function(){ return db.doc('inconf/'+z.id).set(z.doc); }); });
        if (tot) p.then(function(){ toast('LGPD: mascarei CPF/RG em '+tot+' observação(ões) de inconformidade já salvas'); }).catch(function(){ toast('Não consegui regravar as inconformidades mascaradas'); }); }
    }, function(){});
    db.collection('inc_cat').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ var x=d.data()||{}; m[d.id]={cat:x.cat,g:x.g}; }); state.incCat=m; agendarRender(); }, function(){});
    db.doc('config/geral').get().then(function(s){ if(s.exists){ var c=s.data(); state.extras=(c.feriadosExtras||[]).slice(); if (c.expIni!=null) state.cfg.expIni=c.expIni; if (c.expFim!=null) state.cfg.expFim=c.expFim; if (c.intim) state.cfg.intim=c.intim.slice(); renderFeriados(); agendarRender(); } }).catch(function(){});
    db.collection('logs').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows!=null){ state.logs[d.id]=x; delete state.logCache[d.id]; } }); if (state.protSel) fichaProtocolo(state.protSel); }, function(){});
    db.collection('senhas').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows) state.senhas[d.id]=senhasDecod(x); }); agendarRender(); }, function(){});
    db.collection('kpis').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x) state.kp[d.id]={mes:d.id,v:x.v||{},lanc:x.lanc||{}}; }); if (state.aba==='lanc') agendarRender(); }, function(){});
    db.collection('kpi09').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.pessoas) state.k9[d.id]=x; }); if (state.aba==='lanc') agendarRender(); }, function(){});
    db.collection('feedback').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ m[d.id]=d.data(); }); Object.assign(state.feedback,m); if (state.aba==='rel' && !document.activeElement.matches('#tabRel textarea')) renderRel(); }, function(){});
    db.doc('config/usuarios').get().then(function(s){ if (s.exists){ var u=s.data(); state.usr=Object.assign({},u.map||{}); if (state.aba==='tri') renderTri(); } }).catch(function(){});
    db.doc('config/prazos').get().then(function(s){ state.prazosServ=Object.assign({},PRAZOS_PADRAO,s.exists?(s.data().map||{}):{}); agendarRender(); }).catch(function(){});
    db.doc('config/naturezas').get().then(function(s){ if (s.exists){ grDefinir(s.data().grupos||[]); agendarRender(); } }).catch(function(){});
    db.doc('config/kpis').get().then(function(s){ if (s.exists){ state.kpiCat=s.data(); catAplicar(state.kpiCat); agendarRender(); } }).catch(function(){});
    db.collection('serv').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows) state.serv[x.mes||d.id]=Motor.decodificarServ(x); }); agendarRender(); if (state.protSel) fichaProtocolo(state.protSel); }, function(){});
    db.collection('andam').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows) state.andam[x.mes||d.id]=Motor.decodificarAndam(x); }); state.andIdx=null; atualizarAuto(); agendarRender(); if (state.protSel) fichaProtocolo(state.protSel); }, function(){});
    db.collection('cert').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.recs) m[x.mes||d.id]={raw:x,recs:Motor.decodificarCert(x)}; }); state.cert=m; agendarRender(); }, function(){});
  });
})();

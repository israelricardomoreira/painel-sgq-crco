/* Painel SGQ · CRCO — js/nucleo.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/nucleo.js']='0.35.1';
  // ——— tema (automático / claro / escuro) e barra lateral recolhida: preferências deste navegador
  function prefLer(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function prefGravar(k,v){ try{ if (v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} }
  function temaAplicar(t){ if (!TEMAS[t]) t='auto'; var r=document.documentElement; if (t==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',t==='escuro'?'dark':'light');
    var b=document.getElementById('btnTema'); if (b){ b.textContent=TEMAS[t][0]; b.title=TEMAS[t][1]+' · clique para trocar'; } return t; }
  function temaTrocar(){ temaAtual=temaAplicar(temaAtual==='auto'?'escuro':temaAtual==='escuro'?'claro':'auto'); prefGravar('crco-tema',temaAtual==='auto'?null:temaAtual); if (typeof toast==='function') toast(TEMAS[temaAtual][1]); }
  function menuRecolher(sim){ document.body.classList.toggle('menu-recolhido',!!sim); prefGravar('crco-menu',sim?'recolhido':null); var b=document.getElementById('btnMenu'); if (b) b.setAttribute('aria-label',sim?'Mostrar a barra lateral':'Abrir menu de seções'); }
  function nomeMes(m){ var p=m.split('-'); return MESES[+p[1]-1]+'/'+p[0].slice(2); }
  function fmtData(s){ if(!s) return '—'; var p=s.split('-'); return p[2]+'/'+p[1]+'/'+p[0].slice(2); }
  function f1(x){ return x==null||isNaN(x)?'—':(Math.round(x*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}); }
  function pct(x){ return x==null||isNaN(x)?'—':(Math.round(x*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'; }
  function mediana(arr){ var a=arr.filter(function(x){return x!=null;}).sort(function(x,y){return x-y;}); if(!a.length) return null; var m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
  function media(arr){ var a=arr.filter(function(x){return x!=null;}); if(!a.length) return null; return a.reduce(function(s,x){return s+x;},0)/a.length; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  // 0.34.1: avisos empilhados numa caixa só (#toasts), com tempo proporcional ao texto, erro em destaque e clique para fechar.
  // Com uma janela (dlg) aberta, a caixa vai para dentro dela, senão o aviso ficaria atrás do fundo escuro.
  function toastCaixa(){ var c=document.getElementById('toasts'); if (!c){ c=document.createElement('div'); c.id='toasts'; c.className='toasts'; c.setAttribute('aria-live','polite'); }
    var dl=document.querySelector('dialog.dlg[open]'), pai=dl||document.body; if (c.parentNode!==pai) pai.appendChild(c); return c; }
  function toastTempo(t, erro){ return Math.max(erro?8000:4500, Math.min(12000, 1500+String(t||'').length*70)); }
  function toastErro(t){ return /^(n[ãa]o consegui|n[ãa]o achei|n[ãa]o encontrei|erro|parei no meio|apurado, mas)/i.test(String(t||'').trim()); }
  function toast(t, tipo){ var c=toastCaixa(), erro=tipo==='erro'||(tipo==null&&toastErro(t));
    [].slice.call(c.children).forEach(function(x){ if (x.dataset.txt===String(t)&&!x.classList.contains('desf')) x.remove(); }); // o mesmo aviso não empilha
    var d=document.createElement('div'); d.className='toast'+(erro?' erro':''); d.dataset.txt=String(t); d.setAttribute('role',erro?'alert':'status'); d.title='Clique para fechar';
    d.textContent=t; d.addEventListener('click',function(){ d.remove(); }); c.appendChild(d); while (c.children.length>4) c.firstChild.remove();
    setTimeout(function(){ d.remove(); }, toastTempo(t,erro)); return d; }
  // 0.25.0: aviso com Desfazer por 10 segundos
  function toastDesfazer(t, fn){ var v=document.querySelector('.toast.desf'); if (v) v.remove(); var d=document.createElement('div'); d.className='toast desf'; d.setAttribute('role','status'); d.textContent=t; var b=document.createElement('button'); b.type='button'; b.className='lnk'; b.textContent='Desfazer'; b.addEventListener('click',function(){ d.remove(); fn(); }); d.appendChild(b); toastCaixa().appendChild(d); setTimeout(function(){ d.remove(); },10000); }
  // 0.34.1: janelas da própria página no lugar de prompt()/confirm()/alert() do navegador.
  // dlgAbrir(o) devolve uma Promise: null se cancelou; true (sem campo) ou o texto/valor escolhido (com campo).
  //   o = {titulo, msg, ok, cancelar, perigo, campo:{rotulo, valor, tipo, placeholder, obrig, valida(v)→erro|null}, opcoes:[[valor,rótulo]…]}
  // Ids fixos para automação e leitor de tela: #dlg, #dlgTitulo, #dlgMsg, #dlgCampo, #dlgErro, #dlgOk, #dlgCancelar.
  var dlgFila=Promise.resolve();
  function dlgAbrir(o){ var p=dlgFila.then(function(){ return dlgMostrar(o||{}); }); dlgFila=p.catch(function(){}); return p; }
  function dlgMostrar(o){ return new Promise(function(resolve){
    var d=document.createElement('dialog'); d.id='dlg'; d.className='dlg'+(o.perigo?' perigo':''); d.setAttribute('aria-labelledby',o.titulo?'dlgTitulo':'dlgMsg');
    var f=document.createElement('form'); f.method='dialog'; f.noValidate=true; d.appendChild(f);
    function el(tag, cls, txt, id){ var x=document.createElement(tag); if (cls) x.className=cls; if (txt!=null) x.textContent=txt; if (id) x.id=id; return x; }
    if (o.titulo) f.appendChild(el('h2','dlg-t',o.titulo,'dlgTitulo'));
    if (o.msg) f.appendChild(el('p','dlg-m',o.msg,'dlgMsg'));
    var campo=null, radios=null;
    if (o.opcoes){ var fs=el('div','dlg-op'); fs.setAttribute('role','radiogroup'); fs.id='dlgOpcoes'; radios=[];
      o.opcoes.forEach(function(op,i){ var l=el('label','dlg-opl'), r=document.createElement('input'); r.type='radio'; r.name='dlgOp'; r.value=String(op[0]); r.id='dlgOp'+i; if (i===0) r.checked=true; l.appendChild(r); l.appendChild(document.createTextNode(' '+op[1])); fs.appendChild(l); radios.push(r); }); f.appendChild(fs); }
    else if (o.campo){ var c=o.campo, l2=el('label','dlg-c'); if (c.rotulo) l2.appendChild(el('span',null,c.rotulo));
      campo=document.createElement(c.tipo==='textarea'?'textarea':'input'); if (c.tipo&&c.tipo!=='textarea') campo.type=c.tipo; else if (!c.tipo) campo.type='text';
      campo.id='dlgCampo'; campo.value=c.valor==null?'':String(c.valor); if (c.placeholder) campo.placeholder=c.placeholder; if (c.max) campo.maxLength=c.max; campo.setAttribute('aria-label',c.rotulo||o.titulo||o.msg||'Valor'); campo.autocomplete='off';
      l2.appendChild(campo); f.appendChild(l2); }
    var erro=el('p','dlg-e','', 'dlgErro'); erro.setAttribute('role','alert'); erro.hidden=true; f.appendChild(erro);
    var bts=el('div','dlg-b'), bc=el('button','btn',o.cancelar||'Cancelar','dlgCancelar'), bo=el('button','btn primary',o.ok||'OK','dlgOk'); bc.type='button'; bo.type='submit';
    if (o.soOk) bc.hidden=true; bts.appendChild(bc); bts.appendChild(bo); f.appendChild(bts);
    var feito=false;
    function fim(v){ if (feito) return; feito=true; var tc=document.getElementById('toasts'); if (tc&&tc.parentNode===d) document.body.appendChild(tc); try{ if (d.open&&d.close) d.close(); }catch(e){} d.remove(); resolve(v); }
    function confirmar(){ var v=true;
      if (radios){ v=(radios.filter(function(r){ return r.checked; })[0]||{}).value; if (v==null) return; }
      else if (campo){ v=String(campo.value).trim(); var c=o.campo, msg=(!v&&c.obrig)?(c.obrigMsg||'Preencha o campo'):(c.valida?c.valida(v):null);
        if (msg){ erro.textContent=msg; erro.hidden=false; campo.setAttribute('aria-invalid','true'); campo.focus(); return; } }
      fim(v); }
    f.addEventListener('submit',function(e){ e.preventDefault(); confirmar(); });
    bc.addEventListener('click',function(){ fim(null); });
    d.addEventListener('cancel',function(e){ e.preventDefault(); fim(null); }); // Esc
    d.addEventListener('keydown',function(e){ if (e.key==='Escape'){ e.preventDefault(); fim(null); } });
    d.addEventListener('mousedown',function(e){ d._fora=e.target===d; });
    d.addEventListener('click',function(e){ if (e.target===d&&d._fora) fim(null); }); // clique no fundo escuro
    document.body.appendChild(d);
    if (typeof d.showModal==='function') d.showModal(); else { d.setAttribute('open',''); d.classList.add('sem-modal'); }
    var foco=campo||(radios&&radios[0])||(o.perigo?bc:bo); foco.focus(); if (campo&&campo.select&&campo.type!=='month'&&campo.type!=='date') campo.select();
  }); }
  function dlgConfirmar(msg, o){ return dlgAbrir(Object.assign({msg:msg, ok:'Confirmar'},o||{})).then(function(v){ return v===true; }); }
  function dlgPedir(msg, padrao, o){ o=o||{}; return dlgAbrir(Object.assign({msg:msg},o,{campo:Object.assign({valor:padrao},o.campo||{})})); }
  function dlgEscolher(msg, opcoes, o){ return dlgAbrir(Object.assign({msg:msg, opcoes:opcoes},o||{})); }
  function dlgAviso(msg, o){ return dlgAbrir(Object.assign({msg:msg, soOk:true},o||{})); }
  // guarda e devolve a rolagem da página e o foco em volta de um redesenho (innerHTML troca tudo e o navegador pula).
  // Se o campo em uso continua existindo depois do redesenho, é ele que fica no mesmo lugar da tela; senão, volta a rolagem que estava.
  function manterTela(raiz, fn, chave){ var y=window.scrollY, x=window.scrollX, a=document.activeElement, sel=null, ini=null, fimS=null, topo=null, r=typeof raiz==='string'?document.getElementById(raiz):raiz;
    if (a&&r&&r.contains(a)&&chave){ sel=chave(a); if (sel){ topo=a.getBoundingClientRect().top; try{ ini=a.selectionStart; fimS=a.selectionEnd; }catch(e){} } }
    var mh=r?r.style.minHeight:''; if (r){ r.style.minHeight=r.offsetHeight+'px'; r.style.overflowAnchor='none'; } // a página não encolhe no meio do redesenho; quem cuida da posição é esta função, não a âncora do navegador
    fn();
    if (r&&typeof expMarcar==='function') expMarcar(r); // a linha "Baixar em Excel" das tabelas também entra já agora
    if (r&&typeof txtEncolher==='function') txtEncolher(r); // os textos longos viram "? Como ler" já agora, não um quadro depois (senão a tela mexe de novo)
    if (r) r.style.minHeight=mh;
    var n=sel&&r?r.querySelector(sel):null;
    if (n){ if (n!==document.activeElement){ try{ n.focus({preventScroll:true}); if (ini!=null&&n.setSelectionRange) n.setSelectionRange(ini,fimS); }catch(e){} }
      var d=n.getBoundingClientRect().top-topo; if (Math.abs(d)>0.5) window.scrollBy(0,d); }
    else if (Math.abs(window.scrollY-y)>1||Math.abs(window.scrollX-x)>1) window.scrollTo(x,y); }
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
  // 1.10.2: justificar fora do prazo e avaliar 2+ exigências é obrigatório só a partir desta competência (antes é opcional)
  function obrig(a){ return (a.mes||(a.fin||'').slice(0,7))>=marco(); } // 0.10.6: marco na Configuração (padrão set/2026)
  function justDe(a){ return a.dentro?null:(state.just[idDoc(a.c)]||null); }
  function ok(a){ return a.dentro || !!justDe(a); }
  function resumo(atos){
    var Rall=atos.filter(function(a){return a.cat==='R';});
    var dentro=Rall.filter(ok).length, J=Rall.filter(function(a){return !!justDe(a);}).length;
    var R=Rall.filter(function(a){return !justDe(a);}); // estatísticas de tempo sem os justificados
    var comLiq=R.filter(function(a){return a.liq!=null;});
    return { R:R, Rall:Rall, J:J, aberto:Rall.filter(function(a){ return !ok(a)&&obrig(a); }).length, prim:Rall.filter(function(a){return !a.nex;}).length, comEx:Rall.filter(function(a){return a.nex>0;}).length,
      n:Rall.length, dentro:dentro, kpi:Rall.length?dentro/Rall.length*100:null,
      N:atos.filter(function(a){return a.cat==='N';}).length, E:atos.filter(function(a){return a.cat==='E';}).length,
      I:atos.filter(function(a){return a.cat==='I';}).length, total:atos.length,
      medB:mediana(R.map(function(a){return a.bruto;})), mB:media(R.map(function(a){return a.bruto;})),
      medL:mediana(comLiq.map(function(a){return a.liq;})), mL:media(comLiq.map(function(a){return a.liq;})),
      mEsp:media(comLiq.map(function(a){return a.espera;})), reing:Rall.filter(function(a){return a.reing;}).length };
  }
  function est(v){ var a=(v||[]).filter(function(x){return x!=null&&!isNaN(x);}).sort(function(x,y){return x-y;}), n=a.length; if (!n) return {n:0};
    function q(p){ var i=(n-1)*p, lo=Math.floor(i); return a[lo]+(a[Math.min(lo+1,n-1)]-a[lo])*(i-lo); }
    var s=0; a.forEach(function(x){ s+=x; }); var o={n:n, media:s/n, mediana:q(.5), q1:q(.25), q3:q(.75), p90:q(.9), min:a[0], max:a[n-1]};
    if (a.every(function(x){ return x%1===0; })){ var c={}, bm=null; a.forEach(function(x){ c[x]=(c[x]||0)+1; if (bm==null||c[x]>c[bm]) bm=x; }); o.moda=+bm; o.modaPct=c[bm]/n*100; }
    return o; }
  function estTip(o, un, fmt){ fmt=fmt||f1; if (!o||!o.n) return 'sem dados';
    return 'Casos: '+o.n+(o.n<MIN_N?' (poucos — leia com cuidado)':'')+'<br>Média: '+fmt(o.media)+un+'<br>Mediana: '+fmt(o.mediana)+un+(o.moda!=null?'<br>Mais comum (moda): '+o.moda+un+' ('+pct(o.modaPct)+')':'')+'<br>Metade dos casos entre '+fmt(o.q1)+' e '+fmt(o.q3)+un+'<br>90% em até '+fmt(o.p90)+un; } function lnF(k){ for (var i=LF.length;i<=k;i++) LF[i]=LF[i-1]+Math.log(i); return LF[k]; }
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
  function render(){ if (renderPend){ clearTimeout(renderPend); renderPend=null; } aplicarGrupos(); state.sujo={}; render0(); if (state.aba==='des') renderDes(); if (state.aba==='geral') renderVis(); if (state.aba==='pend'&&typeof renderPendencias==='function') renderPendencias(); if (typeof pendBadge==='function') pendBadge(); if (state.aba==='gar'&&typeof renderGargalo==='function'&&!FOCO('#tabGar input')) renderGargalo(); if (typeof PA_ABAS!=='undefined'&&PA_ABAS[state.aba]&&!FOCO('#tabPcs textarea,#tabPcs input')) paRender(state.aba); if (state.aba==='pes'&&typeof renderPes==='function'&&!FOCO('#tabPes input')) renderPes(); }
  // vários snapshots chegam juntos na carga: junta tudo num desenho só
  function agendarRender(){ if (renderPend) return; renderPend=setTimeout(function(){ renderPend=null; render(); }, 40); }
  function pag(aba, fn){ if (state.aba===aba) fn(); else state.sujo[aba]=fn; }
  function pagPendente(k){ var f=state.sujo&&state.sujo[k]; if (!f) return; delete state.sujo[k]; f(); }
  function render0(){
    renderAtrSelect(); renderSelect(); if (typeof renderGeralCab==='function') renderGeralCab(null); var atos=todosAtos();
    if (atrAtual()!=='RI'){ if (SO_RI.indexOf(state.aba)>=0 || (svModo()==='todas'&&SO_SERV.indexOf(state.aba)>=0)) irAba('geral'); renderAtr(); pag('k1',function(){ renderK1([]); }); pag('at',renderAtend); pag('rel',function(){ if (!FOCO('#tabRel textarea')) renderRel(); }); pag('lanc',function(){ if (!FOCO('#tabLanc input[type=text],#tabLanc textarea')) renderLanc(); }); pag('met',renderMetodo); pag('sau',renderSau); pag('eqp',renderEqp); pag('apr',renderApr); pag('pn',function(){ state._pnC=null; if (!state.pnEd&&!state.pnNomeEd) renderPn(); }); return; }
    var vazio=!atos.length && !Object.keys(state.inconf).length && !Object.keys(state.cert).length && !Object.keys(state.senhas).length;
    $('secTendencia').hidden = Object.keys(state.docs).length<2 || state.periodo!=='todos'; // 0.25.0: com um mês escolhido, o dia a dia substitui a comparação por mês
    if (vazio){
      $('kpis').innerHTML='<div class="panel empty" style="grid-column:1/-1"><b>Nenhum mês carregado ainda</b>Abra <b>Importar dados</b> no menu e solte as planilhas do VHL. Os resultados ficam salvos aqui e cada mês novo vai se somando.</div>';
      ['tabNat','tabK1','tabCer','tabEta','tabNao','tabFp','tabEx','tabRel'].forEach(function(id){ $(id).innerHTML='<div class="empty">Sem dados para o período.</div>'; });
      pag('lanc',function(){ if (!FOCO('#tabLanc input[type=text],#tabLanc textarea')) renderLanc(); }); pag('tri',function(){ if (!FOCO('#tabTri input')) renderTri(); }); pag('at',renderAtend); pag('geral',renderGraficos); pag('met',renderMetodo); pag('sau',renderSau); return;
    }
    pag('geral',function(){ pintarGeral(atos); });
    pag('nat',function(){ renderNat(atos); }); pag('eta',function(){ renderEta(atos); }); pag('nao',function(){ renderNao(atos); }); pag('fp',function(){ renderFp(atos); }); pag('ex',function(){ renderEx(atos); }); pag('k1',function(){ renderK1(atos); }); pag('cer',renderCer);
    pag('rel',function(){ if (!FOCO('#tabRel textarea')) renderRel(); }); pag('lanc',function(){ if (!FOCO('#tabLanc input[type=text],#tabLanc textarea')) renderLanc(); }); pag('tri',function(){ if (!FOCO('#tabTri input')) renderTri(); }); pag('at',renderAtend); pag('met',renderMetodo); pag('sau',renderSau); pag('eqp',renderEqp); pag('apr',renderApr); pag('pn',function(){ state._pnC=null; if (!state.pnEd&&!state.pnNomeEd) renderPn(); });
  }

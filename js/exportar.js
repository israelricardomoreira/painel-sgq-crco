/* Painel SGQ · CRCO — js/exportar.js (0.29.0: "Baixar tabela (.xlsx)" em toda tabela das páginas)
 * Só leitura da tela: copia o que a tabela mostra (cabeçalho e linhas, com o que estiver escolhido nos campos) para uma planilha.
 * Não lê o banco, não grava nada e não muda nenhuma regra de cálculo. A planilha sai com o nome da página, da seção e do período do topo.
 * A biblioteca de planilhas é a mesma da memória de cálculo (precisaXLSX, em js/dados.js). */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/exportar.js']='0.33.0';
  var EXP_RAIZES=['pgGeral','pgConteudo'], EXP_MIN_LINHAS=2;
  function expLimpo(s){ return String(s==null?'':s).replace(/ /g,' ').replace(/\s+/g,' ').trim(); }
  // texto de uma célula como a pessoa vê: opção escolhida no seletor, valor digitado no campo, sem o que está oculto e sem os botões de ajuda
  function expCelula(td){
    var c=td.cloneNode(true), vivos=td.querySelectorAll('select,input,textarea'), copias=c.querySelectorAll('select,input,textarea');
    for (var i=0;i<copias.length;i++){ var o=vivos[i], n=copias[i], t='';
      if (o.tagName==='SELECT'){ var op=o.options[o.selectedIndex]; t=op?op.text:''; }
      else if (o.type==='checkbox'||o.type==='radio') t=o.checked?'Sim':'Não';
      else if (o.type==='hidden'||o.type==='file'||o.type==='password') t='';
      else t=o.value;
      n.parentNode.replaceChild(document.createTextNode(' '+t+' '), n); }
    var fora=c.querySelectorAll('[hidden],script,style,button.txt-q,.tip-go'); for (var j=0;j<fora.length;j++) fora[j].parentNode.removeChild(fora[j]);
    var br=c.querySelectorAll('br'); for (var k=0;k<br.length;k++) br[k].parentNode.replaceChild(document.createTextNode(' '), br[k]);
    return expLimpo(c.textContent); }
  // número brasileiro puro vira número na planilha; percentual, data, hora e código com zero à esquerda ficam como texto
  function expValor(t){
    if (!t) return '';
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^-?\d+,\d+$/.test(t)) return Number(t.replace(/\./g,'').replace(',','.'));
    if (/^-?(0|[1-9]\d{0,14})$/.test(t)) return Number(t);
    return t; }
  function expMatriz(tb){
    var out=[], linhas=tb.rows;
    for (var i=0;i<linhas.length;i++){ var tr=linhas[i]; if (tr.hidden) continue; var L=[];
      for (var j=0;j<tr.cells.length;j++){ var cel=tr.cells[j], cab=cel.tagName==='TH', t=expCelula(cel); L.push(cab?t:expValor(t));
        for (var s=1;s<(cel.colSpan||1);s++) L.push(''); }
      if (L.some(function(x){ return x!==''; })) out.push(L); }
    return out; }
  // título mais próximo acima da tabela, dentro da página
  function expSecao(tb, raiz){
    var alvo=null, tit=raiz.querySelectorAll('h2,h3,h4,.sec-h b,.sec-h strong,.sec-t');
    for (var i=0;i<tit.length;i++){ var p=tit[i].compareDocumentPosition(tb); if (p & 4){ var x=expLimpo(tit[i].textContent); if (x) alvo=x; } }
    return alvo||''; }
  function expNome(tb, raiz){
    var pg=expLimpo((document.getElementById('pgTitulo')||{}).textContent), sec=expSecao(tb, raiz), sm=document.getElementById('selMes'), per='';
    if (sm && sm.options && sm.selectedIndex>=0) per=expLimpo(sm.options[sm.selectedIndex].text);
    var partes=[pg||'Painel SGQ']; if (sec && sec!==pg) partes.push(sec); if (per) partes.push(per);
    return partes.join(' - ').replace(/[\\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').slice(0,110); }
  function expAba(nome){ return (nome.replace(/[\[\]\*\?\/\\:]+/g,' ').replace(/\s+/g,' ').trim().slice(0,31))||'Tabela'; }
  function expBaixar(tb){
    var raiz=tb.closest('#pgGeral,#pgConteudo')||document.body, M=expMatriz(tb), nome=expNome(tb, raiz);
    if (M.length<EXP_MIN_LINHAS){ toast('Tabela sem linhas para baixar'); return Promise.resolve(false); }
    return precisaXLSX().then(function(X){
      var ws=X.utils.aoa_to_sheet(M), larg=[];
      M.forEach(function(L){ L.forEach(function(v,i){ var n=String(v==null?'':v).length; if (!larg[i]||n>larg[i]) larg[i]=n; }); });
      ws['!cols']=larg.map(function(n){ return {wch:Math.max(6,Math.min(60,(n||0)+2))}; });
      var wb=X.utils.book_new(); X.utils.book_append_sheet(wb, ws, expAba(expSecao(tb, raiz)||nome));
      X.writeFile(wb, nome+'.xlsx'); toast('Planilha baixada'); return true;
    }).catch(function(e){ toast('Não consegui gerar a planilha: '+(e&&e.message?e.message:'erro')); return false; }); }
  // põe o botão acima de cada tabela que ainda não tem; tira o botão que ficou sem a sua tabela depois de um redesenho
  function expMarcar(raiz){
    if (!raiz) return;
    var soltos=raiz.querySelectorAll('.exp-l');
    for (var i=0;i<soltos.length;i++){ var prox=soltos[i].nextElementSibling; if (!prox || !(prox.matches('table[data-exp]')||prox.querySelector('table[data-exp]'))) soltos[i].parentNode.removeChild(soltos[i]); }
    var tbs=raiz.querySelectorAll('table:not([data-exp])');
    for (var j=0;j<tbs.length;j++){ var tb=tbs[j]; if (tb.closest('table[data-exp]')||tb.closest('.sem-exp')) continue; if (tb.rows.length<EXP_MIN_LINHAS) continue;
      var caixa=tb.closest('.tbl-wrap,.scroll')||tb; if (!caixa.parentNode) continue;
      tb.setAttribute('data-exp','1');
      var ant=caixa.previousElementSibling; if (ant && ant.classList && ant.classList.contains('exp-l')) continue;
      var d=document.createElement('div'); d.className='exp-l';
      d.innerHTML='<button type="button" class="btn sm exp-b" data-exp-btn="1" title="Baixa esta tabela como está na tela, em planilha do Excel">Baixar tabela (.xlsx)</button>';
      caixa.parentNode.insertBefore(d, caixa); } }
  function expTabelaDoBotao(b){ var l=b.closest('.exp-l'), prox=l&&l.nextElementSibling; if (!prox) return null; return prox.matches('table')?prox:prox.querySelector('table'); }
  (function(){ var fila=false;
    function rodar(){ fila=false; EXP_RAIZES.forEach(function(id){ expMarcar(document.getElementById(id)); }); }
    function agenda(){ if (fila) return; fila=true; (window.requestAnimationFrame||setTimeout)(rodar); }
    document.addEventListener('click',function(e){ var b=e.target&&e.target.closest?e.target.closest('[data-exp-btn]'):null; if (!b) return;
      var tb=expTabelaDoBotao(b); if (!tb){ toast('Não achei a tabela'); return; } b.disabled=true; expBaixar(tb).then(function(){ b.disabled=false; }); });
    function ligar(){ if (typeof MutationObserver==='function') EXP_RAIZES.forEach(function(id){ var r=document.getElementById(id); if (r) new MutationObserver(agenda).observe(r,{childList:true,subtree:true}); }); agenda(); }
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',ligar); else ligar();
  })();

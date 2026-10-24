/* Painel SGQ · CRCO — js/visao.js (0.24.0: Desempenho › Visão geral — quanto cada pessoa entrega, comparado com quem faz o mesmo serviço)
 * Nota = (horas-padrão entregues − horas de retrabalho) ÷ horas disponíveis.
 *   Horas-padrão: cada ato vale o tempo-padrão da equipe para aquela etapa e natureza (mediana do cronômetro, sem as pessoas ocultas);
 *   a contagem de atos vem do relatório Desempenho Usuário (não depende de a pessoa ligar o cronômetro). Certidões do Tri7 fora do VHL e
 *   balcão (senhas) entram em horas. Retrabalho: cada inconformidade interna e cada exigência avaliada como não conforme desconta o
 *   tempo-padrão de refazer (Re-Análise da natureza). Nenhum peso é escolhido: o "peso" de cada linha é o tempo que a própria equipe leva.
 * Gráficos na frente; o clique numa pessoa abre a conta, linha por linha. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/visao.js']='0.25.0';
  var VG_PAD_OK=0.8;   // parte dos atos com tempo-padrão para a pessoa entrar na comparação
  var VG_MIN_H=80;     // horas disponíveis mínimas no período para sair de "pouco dado"
  function vgWmean(E){ var s=0, w=0; E.forEach(function(e){ s+=e.v*e.w; w+=e.w; }); return w?s/w:null; }
  function vgBase(){
    var B=trBase(), X=eqExecs();
    var k0=[B===state._vgB0, state._trB&&state._trB.k, Object.keys(state.inconf).length, Object.keys(state.aval).length, Object.keys(state.incCat||{}).length, Object.keys(state.apr||{}).length, Object.keys(state.andam).length].join('|');
    if (state._vgB&&state._vgB.k===k0&&state._vgB0===B) return state._vgB.v;
    // tempo-padrão: célula (etapa × natureza) → etapa → função; mediana (principal) e média (teste de robustez)
    var ETE={}, FNE={}, FNNE={};
    Object.keys(B.C).forEach(function(id){ var c=B.C[id]; c.mean=c.q>=TR_MIN_CEL?vgWmean(c.E):null; (ETE[c.et]=ETE[c.et]||[]).push.apply(ETE[c.et],c.E); (FNE[c.fn]=FNE[c.fn]||[]).push.apply(FNE[c.fn],c.E); var k=c.fn+'|'+c.nat; (FNNE[k]=FNNE[k]||[]).push.apply(FNNE[k],c.E); });
    function resumo(E){ var q=E.reduce(function(s,e){ return s+e.w; },0); return q>=TR_MIN_CEL?{med:trWq(E,.5), mean:vgWmean(E), q:q}:null; }
    var ET={}, FN={}, FNN={}; Object.keys(ETE).forEach(function(k){ ET[k]=resumo(ETE[k]); }); Object.keys(FNE).forEach(function(k){ FN[k]=resumo(FNE[k]); }); Object.keys(FNNE).forEach(function(k){ FNN[k]=resumo(FNNE[k]); });
    function pad(et, nat){ var c=B.C[et+'|'+nat]; if (c&&c.pad!=null) return {med:c.pad, mean:c.mean, de:'etapa e natureza'}; var e=ET[et]; if (e) return {med:e.med, mean:e.mean, de:'etapa (todas as naturezas)'}; return null; }
    // custo de refazer um ato da natureza: Re-Análise da natureza → Re-Análise geral
    var RA=FN['Re-Análise']||null;
    function custo(nat){ var x=FNN['Re-Análise|'+nat]; if (x) return {med:x.med, mean:x.mean, de:'Re-Análise de '+nat}; if (RA) return {med:RA.med, mean:RA.mean, de:'Re-Análise (todas as naturezas)'}; return {med:0, mean:0, de:'sem tempo de Re-Análise'}; }
    var PM={};
    B.L.forEach(function(l){ var id=l.k+'|'+l.m, p=B.PM[id]; if (!p) return; var x=PM[id]=PM[id]||{k:l.k, nome:p.nome, m:l.m, p:p, eMed:0, eMean:0, q:0, qPad:0, fnH:{}, svH:{}, lin:{}, ret:[], tri:{}, docs:{}, docsNat:{}, inc:0, incNat:{}};
      var pd=pad(l.et,l.nat); x.q+=l.q; var li=x.lin[l.et+'|'+l.nat]=x.lin[l.et+'|'+l.nat]||{et:l.et, nat:l.nat, fn:l.fn, sv:l.sv, q:0, pad:pd, real:0, qc:0};
      li.q+=l.q; if (l.seg>0){ li.real+=l.seg*l.q; li.qc+=l.q; }
      if (pd){ x.qPad+=l.q; x.eMed+=pd.med*l.q; x.eMean+=(pd.mean!=null?pd.mean:pd.med)*l.q; x.fnH[l.fn]=(x.fnH[l.fn]||0)+pd.med*l.q; x.svH[l.sv]=(x.svH[l.sv]||0)+pd.med*l.q; } });
    // documentos distintos trabalhados (VHL) e andamentos do Tri7 (contagem, sem horas)
    X.forEach(function(x){ var id=chavePessoa(x.nome)+'|'+x.m, p=PM[id]; if (!p) return;
      if (x.src==='VHL'){ p.docs[x.c]=1; (p.docsNat[x.nat]=p.docsNat[x.nat]||{})[x.c]=1; } else if (x.raw!=='Certidão (Tri7)') p.tri[x.fn]=(p.tri[x.fn]||0)+1; });
    // retrabalho: inconformidades internas e exigências não conformes
    incTodos().forEach(function(r){ if (!r.r||grupoDe(r)!=='I') return; var id=chavePessoa(r.r)+'|'+String(r.d||'').slice(0,7), p=PM[id]; if (!p) return; var cu=custo(r.n);
      p.inc++; p.incNat[r.n]=(p.incNat[r.n]||0)+1; p.ret.push({tipo:'Inconformidade', d:r.d, nat:r.n, c:r.c, txt:catDe(r), med:cu.med, mean:cu.mean, de:cu.de}); });
    Object.keys(state.aval||{}).forEach(function(id){ var v=state.aval[id]; if (!v||v.resultado!=='nc') return; var a=atoPorCod(v.codigo); if (!a) return;
      (typeof exAutores==='function'?exAutores(a):[]).forEach(function(l){ var p=PM[chavePessoa(nomeLogin(l))+'|'+(v.mes||a.mes)]; if (!p) return; var cu=custo(v.natureza||a.nat); p.ret.push({tipo:'Exigência não conforme', d:(v.em||'').slice(0,10), nat:v.natureza||a.nat, c:v.codigo, txt:'2+ exigências, avaliada como não conforme', med:cu.med, mean:cu.mean, de:cu.de}); }); });
    Object.keys(PM).forEach(function(id){ var x=PM[id], p=x.p; x.disp=p.disp; x.cert=p.sCert; x.bal=p.sBal; x.nCert=p.nCert; x.oculto=p.oculto; x.da=p.da; x.du=p.du;
      x.rMed=x.ret.reduce(function(s,r){ return s+r.med; },0); x.rMean=x.ret.reduce(function(s,r){ return s+r.mean; },0);
      x.cob=x.q?x.qPad/x.q:0; x.ndocs=Object.keys(x.docs).length; x.ok=!x.oculto&&x.da>=TR_DIAS_OK&&x.cob>=VG_PAD_OK; });
    // desenvolvimento: funções que sabe fazer (12 meses, mínimo da Equipe) e POPs em que é apta
    var ult=B.ms[B.ms.length-1]||mesHoje(), ini=ult; for (var i=0;i<11;i++) ini=mesAnt(ini); var SF={};
    X.forEach(function(x){ if (x.m<ini||x.m>ult) return; var k=chavePessoa(x.nome), f=(SF[k]=SF[k]||{}); f[x.fn]=(f[x.fn]||0)+1; });
    var DEV={}; Object.keys(SF).forEach(function(k){ DEV[k]={fns:Object.keys(SF[k]).filter(function(f){ return SF[k][f]>=eqMin(); }), aptos:[]}; });
    (typeof aprLista==='function'?aprLista():[]).forEach(function(a){ if (a.res!=='apto'||!a.k) return; var d=DEV[a.k]=DEV[a.k]||{fns:[],aptos:[]}; if (d.aptos.indexOf(a.pop)<0) d.aptos.push(a.pop); });
    var v={B:B, PM:PM, DEV:DEV, pad:pad, custo:custo};
    state._vgB0=B; state._vgB={k:k0, v:v}; return v;
  }
  // nota de uma pessoa num conjunto de meses, para uma variante do critério
  function vgNota(L, vr){ var n=0, d=0, e=0, r=0, c=0, b=0; L.forEach(function(x){ if (!x.ok) return; var ent=(vr.mean?x.eMean:x.eMed), ret=(vr.mean?x.rMean:x.rMed)*vr.ret; e+=ent; r+=ret; c+=x.cert; b+=x.bal; d+=x.disp; n+=ent+x.cert+x.bal-ret; }); return d?{nota:n/d, ent:e, ret:r, cert:c, bal:b, disp:d}:null; }
  var VG_VAR=[{id:'base', nome:'critério do painel', mean:false, ret:1},{id:'media', nome:'tempo-padrão pela média', mean:true, ret:1},{id:'ret2', nome:'retrabalho em dobro', mean:false, ret:2},{id:'ret0', nome:'sem descontar retrabalho', mean:false, ret:0},{id:'ult3', nome:'só os últimos 3 meses', mean:false, ret:1, ult3:true}];
  function vgPessoas(V, MS){
    var P={}; Object.keys(V.PM).forEach(function(id){ var x=V.PM[id]; if (MS.indexOf(x.m)<0) return; (P[x.k]=P[x.k]||{k:x.k, nome:x.nome, L:[]}).L.push(x); });
    var u3=MS.slice(-3);
    var L=Object.keys(P).map(function(k){ var p=P[k], fnH={};
      p.L.forEach(function(x){ if (!x.ok) return; Object.keys(x.fnH).forEach(function(f){ fnH[f]=(fnH[f]||0)+x.fnH[f]; }); });
      p.fn=Object.keys(fnH).sort(function(a,b){ return fnH[b]-fnH[a]; })[0]||null;
      p.oculto=p.L.some(function(x){ return x.oculto; }); p.cob=p.L.reduce(function(s,x){ return s+x.qPad; },0)/Math.max(1,p.L.reduce(function(s,x){ return s+x.q; },0));
      p.v={}; VG_VAR.forEach(function(vr){ p.v[vr.id]=vgNota(vr.ult3?p.L.filter(function(x){ return u3.indexOf(x.m)>=0; }):p.L, vr); });
      p.R=p.v.base; p.inc=0; p.docs=0; p.L.forEach(function(x){ p.inc+=x.inc; p.docs+=x.ndocs; }); p.taxa=p.docs>=MIN_PROD?p.inc/p.docs:null; // 0.24.0: mesma definição de TAXA_DEF
      p.da=p.L.reduce(function(s,x){ return s+x.da; },0); p.du=p.L.reduce(function(s,x){ return s+x.du; },0); p.dev=V.DEV[k]||{fns:[],aptos:[]};
      p.apr=[].concat.apply([],p.L.map(function(x){ return x.p.apr||[]; })).filter(function(v,i,a){ return a.indexOf(v)===i; });
      return p; });
    // grupos por função principal: faixa = metade central das notas do grupo (3+ pessoas)
    var G={}; L.forEach(function(p){ if (p.oculto||!p.R||!p.fn) return; (G[p.fn]=G[p.fn]||[]).push(p); });
    function cat(x, f){ if (!x||!f) return null; if (x.nota>f.p75) return 'acima'; if (x.nota<f.p25-TR_MARGEM) return 'abaixo'; return 'normal'; }
    Object.keys(G).forEach(function(fn){ var g=G[fn], fx={}; VG_VAR.forEach(function(vr){ var v=g.map(function(p){ return p.v[vr.id]&&p.v[vr.id].disp>=VG_MIN_H*1800?p.v[vr.id].nota:null; }).filter(function(v){ return v!=null; }); fx[vr.id]=v.length>=3?{p25:trQ(v,.25), p50:trQ(v,.5), p75:trQ(v,.75)}:null; });
      g.fx=fx; var ti=0, td=0; g.forEach(function(p){ ti+=p.inc; td+=p.docs; }); g.taxa=td?ti/td:null;
      g.forEach(function(p){ p.grupo=g; p.pouco=p.R.disp<VG_MIN_H*3600; p.cat=p.pouco?null:cat(p.R,fx.base); p.cats=VG_VAR.map(function(vr){ return p.v[vr.id]&&p.v[vr.id].disp>=VG_MIN_H*1800?cat(p.v[vr.id],fx[vr.id]):null; }); var val=p.cats.filter(Boolean); p.estavel=val.length>=3&&val.every(function(c){ return c===p.cat; }); p.nMesma=val.filter(function(c){ return c===p.cat; }).length; p.nVal=val.length; }); });
    return {L:L, G:G};
  }
  function vgCatTxt(p){ if (p.oculto) return 'fora da comparação'; if (!p.R) return p.cob<VG_PAD_OK?'sem tempo-padrão para a maior parte do trabalho':'poucos dias ativos'; if (!p.grupo||!p.grupo.fx.base) return 'sem faixa (menos de 3 na função)'; if (p.pouco) return 'pouco dado'; return p.cat==='acima'?'acima da faixa':p.cat==='abaixo'?'abaixo da faixa':'na faixa'; }
  function vgPct(x){ return x==null||isNaN(x)?'—':numBR(x*100,0)+'%'; }

  // ═════════ página ═════════
  function vgRender(el){
    if (!podeEscrever){ el.innerHTML+='<div class="banner">A visão geral por pessoa fica só para quem administra o painel.</div>'; return; }
    var B=trBase(); if (!B.ms.length){ el.innerHTML+='<div class="empty"><b>Sem tempo de trabalho importado</b>A visão geral usa o relatório <b>Desempenho Usuário</b> do VHL (um arquivo por pessoa e mês). Importe em Importar dados.</div>'; return; }
    var MS=trMesesPer(B); if (!MS.length){ el.innerHTML+='<div class="empty"><b>Sem tempo de trabalho em '+esc(nomeMes(state.periodo))+'</b>Escolha outro mês no Período.</div>'; return; }
    var V=vgBase(), R=vgPessoas(V,MS), per=MS.length>1?nomeMes(MS[0])+' a '+nomeMes(MS[MS.length-1]):nomeMes(MS[0]);
    var todasF=Object.keys(R.G).sort(function(a,b){ return R.G[b].length-R.G[a].length; }), fns=todasF.filter(function(f){ return R.G[f].length>=2; }), sos=todasF.filter(function(f){ return R.G[f].length<2; });
    if (!fns.length) fns=todasF.slice(0,1); var fsel=fns.indexOf(state.vgFn)>=0?state.vgFn:fns[0];
    var h='<div class="sec-h"><h2>Visão geral · '+esc(per)+'</h2><span class="note"><b>Nota = (horas-padrão entregues − horas de retrabalho) ÷ horas disponíveis.</b> Cada ato vale o tempo que a equipe costuma levar nele (mediana do cronômetro do VHL); certidões fora do VHL e balcão entram em horas; cada erro desconta o tempo de refazer. Cada pessoa é comparada só com quem tem a mesma função principal. Clique numa pessoa para ver a conta.</span></div>';
    if (!fns.length){ el.innerHTML+=h+'<div class="empty"><b>Sem pessoas para comparar</b>Nenhuma função com dados suficientes no período.</div>'; return; }
    h+='<div class="search" style="margin-bottom:8px"><div class="seg seg-wrap" role="group" aria-label="Função">'+fns.map(function(f){ return '<button type="button" class="segb" data-vgfn="'+esc(f)+'" aria-pressed="'+(f===fsel)+'">'+esc(f)+' <span class="mut">'+R.G[f].length+'</span></button>'; }).join('')+'</div></div>'+
      (sos.length?'<p class="hint" style="margin:-4px 0 8px">Sem par na função (única pessoa com essa função principal, não entra no ranking): '+sos.map(function(f){ var p=R.G[f][0]; return '<button type="button" class="lnk" data-vgsel1="'+esc(p.k)+'">'+esc(p.nome)+'</button> <span class="mut">('+esc(f)+' · '+vgPct(p.R.nota)+')</span>'; }).join(' · ')+'.</p>':'');
    var G0=R.G[fsel], g=G0.slice().sort(function(a,b){ return b.R.nota-a.R.nota; }), fx=G0.fx.base; g.taxa=G0.taxa; g.fx=G0.fx;
    h+='<div class="vz-grid">'+vzCard(fsel+' · quanto cada um entrega','barra = horas-padrão entregues ÷ horas disponíveis (azul: etapas · verde: certidões · roxo: balcão · vermelho: retrabalho descontado) · faixa cinza = metade central da função',vgBarras(g,fx),'vz-wide')+'</div>';
    // dispersão: nota × inconformidade (todas as funções)
    var todos=R.L.filter(function(p){ return p.R&&!p.oculto&&p.taxa!=null&&p.fn; }), cor={}; fns.slice(0,CAT.length).forEach(function(f,i){ cor[f]=CAT[i]; }); todos.forEach(function(p){ if (!cor[p.fn]) cor[p.fn]='var(--ink-3)'; });
    h+='<div class="vz-grid">'+vzCard('Entrega × qualidade','cada ponto é uma pessoa · em cima = entrega mais · à esquerda = erra menos · cor = função principal',gDispersao(todos.map(function(p){ return {x:p.taxa*100, y:p.R.nota*100, nome:p.nome, rot:p.fn===fsel?1:0, cor:cor[p.fn], go:{t:'vg',k:p.k}, extra:esc(p.fn)+' · '+p.inc+' inconformidade(s) em '+p.docs+' documentos'}; }),{xl:'Inconformidade (% dos documentos)', yl:'Nota (%)', nRot:8}),'vz-wide')+'</div>'+
      '<div class="leg" style="margin:-8px 0 12px">'+fns.slice(0,CAT.length).map(function(f){ return '<span><i class="dot" style="background:'+cor[f]+'"></i>'+esc(f)+'</span>'; }).join('')+(todos.some(function(p){ return cor[p.fn]==='var(--ink-3)'; })?'<span><i class="dot" style="background:var(--ink-3)"></i>outras funções</span>':'')+'</div>';
    // leitura do grupo
    var ab=g.filter(function(p){ return p.cat==='abaixo'; }), ac=g.filter(function(p){ return p.cat==='acima'; });
    h+='<p class="hint">'+(fx?'Faixa da função: '+vgPct(fx.p25)+' a '+vgPct(fx.p75)+' (mediana '+vgPct(fx.p50)+'). ':'Menos de 3 pessoas nesta função: sem faixa, só a comparação lado a lado. ')+
      (ac.length?'Acima: <b>'+ac.map(function(p){ return esc(p.nome); }).join('</b>, <b>')+'</b>. ':'')+(ab.length?'Abaixo: <b>'+ab.map(function(p){ return esc(p.nome)+(p.estavel?'':' (depende do critério)'); }).join('</b>, <b>')+'</b>. ':'')+
      'O teste de robustez refaz a conta com '+(VG_VAR.length-1)+' critérios diferentes (tempo-padrão pela média, retrabalho em dobro, sem retrabalho, só os últimos 3 meses); "firme" quer dizer que a posição não muda com nenhum deles.</p>';
    var sel=state.vgSel&&R.L.filter(function(p){ return p.k===state.vgSel; })[0];
    if (sel) h+=vgContaHTML(V,R,sel,MS);
    h+=vgTabelaHTML(R,g,fsel);
    // 0.24.0: dimensionamento saiu do ar (comparava o trabalho do VHL com o dia inteiro da pessoa). Volta na 0.27 com fila × capacidade por etapa.
    el.innerHTML+=h.replace(/<div class="tbl-wrap"/g,'<div class="tbl-wrap" tabindex="0" role="region" aria-label="Tabela (role para ver tudo)"');
  }
  // barras empilhadas por pessoa, com a faixa da função ao fundo
  function vgBarras(g, fx){
    var W=larg(), lh=30, pl=Math.min(190,Math.round(W*0.34)), pr=64, pt=8, pb=24, H=pt+pb+g.length*lh;
    var mx=Math.max(1,Math.max.apply(null,g.map(function(p){ var r=p.R; return (r.ent+r.cert+r.bal)/r.disp; }))*1.05), X=function(v){ return pl+(W-pl-pr)*Math.max(0,v)/mx; };
    var s=dSvg(W,H,'Entrega por pessoa'), nch=Math.max(10,Math.floor(pl/7.6));
    [0,0.25,0.5,0.75,1].forEach(function(t){ if (t>mx) return; s+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)" pointer-events="none"/><text x="'+X(t).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)" pointer-events="none">'+numBR(t*100,0)+'%</text>'; });
    if (fx) s+='<rect x="'+X(fx.p25).toFixed(1)+'" y="'+pt+'" width="'+Math.max(1,X(fx.p75)-X(fx.p25)).toFixed(1)+'" height="'+(H-pt-pb)+'" style="fill:var(--ink-3);opacity:.13" pointer-events="none"/>';
    g.forEach(function(p,i){ var r=p.R, d=r.disp, cy=pt+i*lh+lh/2, x0=X(0), a=r.ent/d, c=r.cert/d, b=r.bal/d, rt=r.ret/d, tot=a+c+b;
      var tip='<b>'+esc(p.nome)+'</b> · nota <b>'+vgPct(r.nota)+'</b><br>Etapas: '+trFmtH(r.ent)+' · certidões: '+trFmtH(r.cert)+' · balcão: '+trFmtH(r.bal)+'<br>Retrabalho: −'+trFmtH(r.ret)+'<br>Horas disponíveis: '+trFmtH(r.disp)+'<br>'+esc(vgCatTxt(p))+(p.nVal?' · posição igual em '+p.nMesma+' de '+p.nVal+' critérios':'');
      s+=hitRect(0,cy-lh/2,W,lh,tip,{t:'vg',k:p.k});
      s+='<text x="'+(pl-8)+'" y="'+(cy+3.5)+'" text-anchor="end" font-size="11" style="fill:var(--ink-2)" pointer-events="none">'+esc(p.nome.length>nch?p.nome.slice(0,nch-1)+'…':p.nome)+'</text>';
      var seg=function(v0,v1,cor,op){ if (v1<=v0) return ''; return '<rect x="'+X(v0).toFixed(1)+'" y="'+(cy-8)+'" width="'+Math.max(0.5,X(v1)-X(v0)).toFixed(1)+'" height="16" style="fill:'+cor+(op?';opacity:'+op:'')+'" pointer-events="none"/>'; };
      s+=seg(0,a,'var(--c1)')+seg(a,a+c,'var(--c3)')+seg(a+c,tot,'var(--c4)')+seg(Math.max(0,tot-rt),tot,'var(--crit)',0.85);
      if (state.vgSel===p.k) s+='<rect x="'+(x0-2)+'" y="'+(cy-11)+'" width="'+(X(tot)-x0+4).toFixed(1)+'" height="22" fill="none" stroke="var(--ink)" stroke-width="1.5" rx="3" pointer-events="none"/>';
      s+='<text x="'+(X(tot)+6).toFixed(1)+'" y="'+(cy+4)+'" font-size="12" font-weight="700" style="fill:'+(p.cat==='abaixo'?'var(--crit)':p.cat==='acima'?'var(--good)':'var(--ink)')+'" pointer-events="none">'+vgPct(r.nota)+(p.cat&&!p.estavel?' *':'')+'</text>'; });
    return s+'</svg><p class="hint" style="margin:4px 0 0">* a posição muda conforme o critério (teste de robustez).</p>';
  }
  // tabela (atrás do gráfico): os números de cada pessoa da função
  function vgTabelaHTML(R, g, fsel){
    var tx=g.taxa;
    return '<details class="met-sec" style="margin:6px 0 12px"><summary>Ver a tabela · '+esc(fsel)+'</summary><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Pessoa</th><th class="num">Nota</th><th class="num">Horas entregues</th><th class="num">Retrabalho</th><th class="num">Disponíveis</th><th class="num" title="Inconformidades internas ÷ documentos trabalhados no VHL">Inconformidade</th><th>Posição</th><th class="num" title="Em quantos critérios do teste de robustez a posição se mantém">Robustez</th><th>Desenvolvimento</th>'+(podeEscrever?'<th></th>':'')+'</tr></thead><tbody>'+
      g.map(function(p){ var r=p.R; return '<tr class="click'+(state.vgSel===p.k?' sel':'')+'" data-vgsel="'+esc(p.k)+'"><td>'+esc(p.nome)+'</td><td class="num"><b>'+vgPct(r.nota)+'</b></td><td class="num">'+trFmtH(r.ent+r.cert+r.bal)+'</td><td class="num">'+(r.ret?'−'+trFmtH(r.ret):'—')+'</td><td class="num">'+trFmtH(r.disp)+'</td><td class="num '+(p.taxa!=null&&tx!=null&&p.taxa>tx*1.5&&p.inc>=3?'acima':'')+'">'+(p.taxa==null?'—':pct(p.taxa*100))+'</td><td class="'+(p.cat==='abaixo'?'acima':p.cat==='acima'?'bom':'')+'">'+esc(vgCatTxt(p))+'</td><td class="num">'+(p.nVal?(p.estavel?'firme':p.nMesma+' de '+p.nVal):'—')+'</td><td>'+p.dev.fns.length+' funções · '+p.dev.aptos.length+' POPs apta</td>'+(podeEscrever?'<td class="nw">'+oclBtn(p.nome)+'</td>':'')+'</tr>'; }).join('')+
      '</tbody></table></div><p class="hint">Inconformidade da função: '+(tx==null?'—':pct(tx*100))+'. Desenvolvimento não entra na nota: funções com '+eqMin()+'+ execuções nos últimos 12 meses e POPs com resultado Apto na Aprendizagem.</p></details>';
  }
  // ——— a conta de uma pessoa (o dado real), com comparação lado a lado
  function vgContaHTML(V, R, p, MS){
    var r=p.R, B=V.B, nome=p.nome, g=p.grupo||[], outros=(g.length>=2?g:R.L).filter(function(x){ return x.k!==p.k&&x.R&&!x.oculto; }), cmp=state.vgCmp&&outros.filter(function(x){ return x.k===state.vgCmp; })[0];
    function linhas(pp){ var o={}; pp.L.forEach(function(x){ if (!x.ok) return; Object.keys(x.lin).forEach(function(id){ var l=x.lin[id], y=o[id]=o[id]||{et:l.et, nat:l.nat, fn:l.fn, q:0, h:0, pad:l.pad, real:0, qc:0}; y.q+=l.q; y.real+=l.real; y.qc+=l.qc; if (l.pad) y.h+=l.pad.med*l.q; }); }); return o; }
    var LA=linhas(p), LB=cmp?linhas(cmp):{}, ids=Object.keys(LA).concat(Object.keys(LB).filter(function(id){ return !LA[id]; }));
    ids.sort(function(a,b){ return ((LB[b]||{}).h||0)+((LA[b]||{}).h||0)-((LB[a]||{}).h||0)-((LA[a]||{}).h||0); });
    var mostra=state.vgTudo?ids:ids.slice(0,20);
    var h='<div class="panel" id="vgConta" style="margin:6px 0 14px"><div class="sec-h" style="flex-wrap:wrap;gap:6px"><h2>'+esc(nome)+' · a conta</h2><span class="spacer"></span><label class="hint" style="margin:0;max-width:100%">Comparar com <select id="vgCmpSel" aria-label="Comparar com" style="max-width:min(220px,55vw)"><option value="">ninguém</option>'+outros.map(function(x){ return '<option value="'+esc(x.k)+'"'+(cmp===x?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join('')+'</select></label> <button class="btn sm" type="button" data-vgfechar="1">Fechar</button></div>';
    if (!r){ h+='<p class="hint">'+esc(vgCatTxt(p))+'.</p></div>'; return h; }
    // evolução mês a mês
    var ms=B.ms.filter(function(m){ return state.periodo==='todos'||m<=state.periodo; }).slice(-12), fx=g.fx&&g.fx.base;
    var serie=ms.map(function(m){ var x=V.PM[p.k+'|'+m]; var n=x?vgNota([x],VG_VAR[0]):null; return n?n.nota*100:null; }), vz=ms.map(function(m){ var x=V.PM[p.k+'|'+m]; return !!(x&&!x.ok); });
    var series=[{nome:nome, cor:'var(--c1)', v:serie, vazio:vz}]; if (cmp) series.push({nome:cmp.nome, cor:'var(--c2)', v:ms.map(function(m){ var x=V.PM[cmp.k+'|'+m]; var n=x?vgNota([x],VG_VAR[0]):null; return n?n.nota*100:null; })});
    h+='<div class="vz-grid">'+vzCard('Nota mês a mês',fx?'faixa cinza = metade central da função no período':'',gLinhas(ms,series,{titulo:'Nota mês a mês',un:'%',banda:fx?{lo:ms.map(function(){ return fx.p25*100; }),hi:ms.map(function(){ return fx.p75*100; })}:null}),'vz-wide')+'</div>';
    // a conta, linha por linha
    var col=function(l){ if (!l) return '<td class="num mut">—</td><td class="num mut">—</td>'; return '<td class="num">'+l.q.toLocaleString('pt-BR')+'</td><td class="num">'+(l.pad?trFmtH(l.h):'<span class="mut" title="Sem tempo-padrão: não entra na nota">sem padrão</span>')+'</td>'; };
    var cab='<tr><th>Etapa</th><th>Natureza</th><th class="num" title="Tempo-padrão da equipe">Vale</th><th class="num">Atos</th><th class="num">Horas</th>'+(cmp?'<th class="num">Atos · '+esc(cmp.nome.split(' ')[0])+'</th><th class="num">Horas · '+esc(cmp.nome.split(' ')[0])+'</th>':'')+'</tr>';
    var rc=cmp?cmp.R:null;
    h+='<div class="tbl-wrap"><table class="tleft"><thead>'+cab+'</thead><tbody>'+
      mostra.map(function(id){ var a=LA[id], b=LB[id], l=a||b; return '<tr><td>'+esc(l.et)+'</td><td>'+esc(l.nat)+'</td><td class="num" title="'+esc(l.pad?'tempo-padrão por '+l.pad.de:'')+'">'+(l.pad?trFmtMin(l.pad.med):'—')+'</td>'+col(a)+(cmp?col(b):'')+'</tr>'; }).join('')+
      (ids.length>20?'<tr><td colspan="'+(cmp?7:5)+'"><button type="button" class="lnk" data-vgtudo="1">'+(state.vgTudo?'Mostrar só as 20 maiores':'Mostrar todas as '+ids.length+' linhas')+'</button></td></tr>':'')+
      '<tr><td colspan="3"><b>Etapas do VHL</b></td><td></td><td class="num"><b>'+trFmtH(r.ent)+'</b></td>'+(cmp?'<td></td><td class="num"><b>'+trFmtH(rc.ent)+'</b></td>':'')+'</tr>'+
      '<tr><td colspan="3">Certidões do Tri7 fora do VHL <span class="mut">(tempo da certidão parecida do VHL)</span></td><td class="num">'+p.L.reduce(function(s,x){ return s+(x.ok?x.nCert:0); },0)+'</td><td class="num">'+trFmtH(r.cert)+'</td>'+(cmp?'<td class="num">'+cmp.L.reduce(function(s,x){ return s+(x.ok?x.nCert:0); },0)+'</td><td class="num">'+trFmtH(rc.cert)+'</td>':'')+'</tr>'+
      '<tr><td colspan="3">Balcão <span class="mut">(tempo de atendimento das senhas)</span></td><td></td><td class="num">'+trFmtH(r.bal)+'</td>'+(cmp?'<td></td><td class="num">'+trFmtH(rc.bal)+'</td>':'')+'</tr>'+
      '<tr><td colspan="3">Retrabalho <span class="mut">(cada erro desconta o tempo de refazer)</span></td><td class="num">'+p.L.reduce(function(s,x){ return s+(x.ok?x.ret.length:0); },0)+'</td><td class="num acima">'+(r.ret?'−'+trFmtH(r.ret):'0 h')+'</td>'+(cmp?'<td class="num">'+cmp.L.reduce(function(s,x){ return s+(x.ok?x.ret.length:0); },0)+'</td><td class="num acima">'+(rc.ret?'−'+trFmtH(rc.ret):'0 h')+'</td>':'')+'</tr>'+
      '<tr><td colspan="3"><b>Horas entregues</b></td><td></td><td class="num"><b>'+trFmtH(r.ent+r.cert+r.bal-r.ret)+'</b></td>'+(cmp?'<td></td><td class="num"><b>'+trFmtH(rc.ent+rc.cert+rc.bal-rc.ret)+'</b></td>':'')+'</tr>'+
      '<tr><td colspan="3">Horas disponíveis <span class="mut">(dias ativos × '+B.jor+' h)</span></td><td></td><td class="num">'+trFmtH(r.disp)+'</td>'+(cmp?'<td></td><td class="num">'+trFmtH(rc.disp)+'</td>':'')+'</tr>'+
      '<tr><td colspan="3"><b>Nota</b></td><td></td><td class="num"><b>'+vgPct(r.nota)+'</b></td>'+(cmp?'<td></td><td class="num"><b>'+vgPct(rc.nota)+'</b></td>':'')+'</tr></tbody></table></div>';
    // andamentos do Tri7 (contagem)
    var tri={}; p.L.forEach(function(x){ Object.keys(x.tri).forEach(function(f){ tri[f]=(tri[f]||0)+x.tri[f]; }); });
    if (Object.keys(tri).length) h+='<p class="hint"><b>Andamentos no Tri7</b> (contados, sem horas: o Tri7 não marca tempo): '+Object.keys(tri).sort(function(a,b){ return tri[b]-tri[a]; }).map(function(f){ return esc(f.replace(/ \(Tri7\)$/,''))+' '+tri[f]; }).join(' · ')+'.</p>';
    // qualidade: taxa geral e por natureza × equipe
    var EQ={}, eqD={}; R.L.forEach(function(x){ if (x.oculto) return; x.L.forEach(function(y){ Object.keys(y.docsNat).forEach(function(n){ eqD[n]=(eqD[n]||0)+Object.keys(y.docsNat[n]).length; }); Object.keys(y.incNat).forEach(function(n){ EQ[n]=(EQ[n]||0)+y.incNat[n]; }); }); });
    var mD={}, mI={}; p.L.forEach(function(y){ Object.keys(y.docsNat).forEach(function(n){ mD[n]=(mD[n]||0)+Object.keys(y.docsNat[n]).length; }); Object.keys(y.incNat).forEach(function(n){ mI[n]=(mI[n]||0)+y.incNat[n]; }); });
    var nats=Object.keys(mD).filter(function(n){ return mD[n]>=5||mI[n]; }).sort(function(a,b){ return (mI[b]||0)-(mI[a]||0)||mD[b]-mD[a]; }).slice(0,12);
    var eqT=0, eqTD=0; Object.keys(eqD).forEach(function(n){ eqTD+=eqD[n]; eqT+=EQ[n]||0; });
    h+='<div class="sub-h" style="margin-top:12px">Qualidade · inconformidades internas</div><p class="hint" style="margin:0 0 6px">Taxa geral: <b>'+(p.docs?pct(p.inc/p.docs*100):'—')+'</b> ('+p.inc+' em '+p.docs.toLocaleString('pt-BR')+' documentos) · equipe: '+(eqTD?pct(eqT/eqTD*100):'—')+'.</p>';
    if (nats.length) h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Natureza</th><th class="num">Documentos</th><th class="num">Inconformidades</th><th class="num">Taxa dela</th><th class="num">Taxa da equipe</th></tr></thead><tbody>'+
      nats.map(function(n){ var t=mD[n]?(mI[n]||0)/mD[n]:null, te=eqD[n]?(EQ[n]||0)/eqD[n]:null; return '<tr><td>'+esc(n)+'</td><td class="num">'+mD[n]+'</td><td class="num">'+(mI[n]||0)+'</td><td class="num '+(t!=null&&te!=null&&mI[n]>=2&&t>te*1.5?'acima':'')+'">'+(t==null?'—':pct(t*100))+'</td><td class="num">'+(te==null?'—':pct(te*100))+'</td></tr>'; }).join('')+'</tbody></table></div>';
    var RET=[].concat.apply([],p.L.filter(function(x){ return x.ok; }).map(function(x){ return x.ret; }));
    if (RET.length) h+='<details class="met-sec" style="margin:8px 0"><summary>Retrabalho descontado · '+RET.length+' erro(s)</summary><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Data</th><th>Tipo</th><th>Documento</th><th>Natureza</th><th>O quê</th><th class="num">Desconto</th></tr></thead><tbody>'+
      RET.sort(function(a,b){ return a.d<b.d?1:-1; }).map(function(x){ return '<tr><td>'+fmtData(x.d)+'</td><td>'+esc(x.tipo)+'</td><td>'+(typeof protLink==='function'?protLink(x.c):esc(x.c))+'</td><td>'+esc(x.nat)+'</td><td>'+esc(x.txt)+'</td><td class="num" title="'+esc(x.de)+'">−'+trFmtMin(x.med)+'</td></tr>'; }).join('')+'</tbody></table></div></details>';
    // contexto (não entra na nota)
    var ctx=[]; ctx.push(p.da+' dias ativos de '+p.du+' úteis'); if (p.apr.length) ctx.push('em aprendizagem: '+p.apr.join(', ')); ctx.push('sabe fazer '+p.dev.fns.length+' função(ões): '+(p.dev.fns.slice(0,6).join(', ')||'—')); ctx.push('apta em '+p.dev.aptos.length+' POP(s)');
    var tp=0, tq=0; p.L.forEach(function(x){ if (x.ok&&x.p.ritmo!=null){ tp+=x.p.num; tq+=x.p.den; } }); if (tq) ctx.push('tempo por ato × equipe: '+trFmtRi(tp/tq));
    h+='<p class="hint"><b>Contexto</b> (não muda a nota): '+ctx.map(esc).join(' · ')+'.</p>';
    if (p.nVal) h+='<p class="hint"><b>Robustez</b>: '+VG_VAR.map(function(vr,i){ var c=p.cats[i]; return esc(vr.nome)+' → '+(c==='acima'?'acima':c==='abaixo'?'abaixo':c==='normal'?'na faixa':'—'); }).join(' · ')+'.</p>';
    return h+'</div>';
  }
  // ——— dimensionamento: quantas pessoas o trabalho de cada setor pediu × quantas trabalharam nele
  function vgDimHTML(V, B){
    var ms=B.ms.filter(function(m){ return state.periodo==='todos'||m<=state.periodo; }).slice(-12), S={}, RT={};
    Object.keys(V.PM).forEach(function(id){ var x=V.PM[id], tot=Object.keys(x.svH).reduce(function(s,k){ return s+x.svH[k]; },0); if (!tot) return;
      Object.keys(x.svH).forEach(function(sv){ var sh=x.svH[sv]/tot, s=(S[sv]=S[sv]||{}), q=s[x.m]=s[x.m]||{h:0,d:0,n:{}}; q.h+=x.svH[sv]; if (!x.oculto){ q.d+=x.disp*sh; if (sh>=0.3) q.n[x.nome]=1; } });
      if (x.ok){ var sp=Object.keys(x.svH).sort(function(a,b){ return x.svH[b]-x.svH[a]; })[0]; var n=vgNota([x],VG_VAR[0]); if (n) (RT[sp]=RT[sp]||[]).push(n.nota); } });
    var svs=Object.keys(S).filter(function(sv){ return RT[sv]&&RT[sv].length>=6; }).sort(function(a,b){ var ta=0, tb=0; ms.forEach(function(m){ ta+=(S[a][m]||{}).h||0; tb+=(S[b][m]||{}).h||0; }); return tb-ta; });
    if (!svs.length) return '';
    var sv=svs.indexOf(state.vgDim)>=0?state.vgDim:svs[0], ref=trQ(RT[sv],.5), jor=B.jor;
    var nec=ms.map(function(m){ var q=S[sv][m]; return q&&ref?q.h/(duMes(m)*jor*3600*ref):null; }), tem=ms.map(function(m){ var q=S[sv][m]; return q?q.d/(duMes(m)*jor*3600):null; });
    var dif=ms.map(function(m,i){ return nec[i]!=null&&tem[i]!=null?tem[i]-nec[i]:null; });
    return '<div class="sub-h" style="margin-top:16px">Dimensionamento · pessoas que o trabalho pediu × pessoas que trabalharam</div><div class="search" style="margin-bottom:8px"><div class="seg seg-wrap" role="group" aria-label="Setor">'+svs.slice(0,7).map(function(x){ return '<button type="button" class="segb" data-vgdim="'+esc(x)+'" aria-pressed="'+(x===sv)+'">'+esc(x)+'</button>'; }).join('')+'</div></div><div class="vz-grid">'+
      vzCard(sv+' · pessoas por mês','"pediu" = horas-padrão do setor ÷ (dias úteis × '+jor+' h × o que uma pessoa típica do setor entrega, '+vgPct(ref)+') · "trabalharam" = horas disponíveis de quem trabalhou no setor, em pessoas de tempo integral',gLinhas(ms,[{nome:'Pediu',cor:'var(--c1)',v:nec,extra:dif.map(function(d){ return d==null?'':(d>=0?'sobra de ':'falta de ')+numBR(Math.abs(d),1)+' pessoa(s)'; })},{nome:'Trabalharam',cor:'var(--c2)',tracejado:true,v:tem}],{titulo:'Dimensionamento',un:'',zero:true}),'vz-wide')+'</div>'+
      '<p class="hint">Quando "trabalharam" fica acima de "pediu", sobrou gente para o trabalho que entrou no mês; abaixo, faltou. A régua é o ritmo típico da própria equipe (mediana das notas do setor), não uma meta de fora: se a equipe toda estiver lenta, isso não aparece aqui — compare com os setores e com os meses.</p>';
  }

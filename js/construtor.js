/* Painel SGQ · CRCO — js/construtor.js (0.19.0: Meus painéis — construtor de cartões no estilo das ferramentas de BI)
 * Cada cartão é uma "pergunta": fonte → filtros → medida (ou taxa A ÷ B) → agrupar por (até 2) → formato.
 * Os painéis ficam no banco (coleção paineis): versões novas do painel não apagam nada, e entram no backup. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/construtor.js']='0.20.0';
  var PN_DOW=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  function pnDow(iso){ if (!iso) return null; var p=String(iso).slice(0,10).split('-').map(Number); return PN_DOW[new Date(Date.UTC(p[0],p[1]-1,p[2])).getUTCDay()]; }
  function pnMesIso(iso){ return iso?String(iso).slice(0,7):null; }
  function pnSimNao(b){ return b==null?null:b?'Sim':'Não'; }
  // campos: id comum entre fontes (para a taxa A ÷ B casar os grupos), nome, tipo (cat | num | bool), un (unidade)
  var PN_FONTES={
    atos:{nome:'Atos do RI (protocolos finalizados)', lista:'atos', dica:'Um por protocolo do RI, no mês da finalização.',
      linhas:function(){ if (typeof aplicarTri7==='function') aplicarTri7(); var o=[]; Object.keys(state.docs).forEach(function(m){ o=o.concat(state.docs[m].atos); }); return o; },
      campos:[['mes','Mês','cat',function(a){ return a.mes||pnMesIso(a.fin); }],['natureza','Natureza','cat',function(a){ return a.nat; }],['origem','Origem','cat',function(a){ return origemAto(a)==='central'?'Central (ONR)':'Balcão'; }],
        ['situacao','Situação','cat',function(a){ return SIT[a.cat]||a.cat; }],['cancelado','Cancelado','bool',function(a){ return pnSimNao(a.cat==='N'); }],['motivo','Motivo do cancelamento','cat',function(a){ return a.cat==='N'?(MOTIVOS[a.motivo]||a.motivo||'(sem motivo)'):null; }],['noPrazo','Registrado no prazo','bool',function(a){ return a.cat==='R'?pnSimNao(!!a.dentro):null; }],['comExig','Teve exigência','bool',function(a){ return pnSimNao(a.nex>0); }],
        ['reing','Reingresso','bool',function(a){ return pnSimNao(!!a.reing); }],['dow','Dia da semana do ingresso','cat',function(a){ return pnDow(a.ing); }],
        ['bruto','Tempo bruto','num',function(a){ return a.bruto; },'d.u.'],['liq','Tempo líquido (com o cartório)','num',function(a){ return a.liq; },'d.u.'],['espera','Espera do cliente','num',function(a){ return a.espera; },'d.u.'],['nex','Nº de exigências','num',function(a){ return a.nex||0; },'']]},
    docs:{nome:'Documentos das outras serventias', lista:'docs', dica:'RC, RTD/PJ, Intimações, certidões e apoio, no mês da finalização.',
      linhas:function(){ var o=[]; Object.keys(state.serv).forEach(function(m){ o=o.concat(state.serv[m]); }); return o; },
      campos:[['mes','Mês','cat',function(d){ return d.mes; }],['serventia','Serventia','cat',function(d){ return svDe(d.t)||d.t; }],['tipo','Tipo de documento','cat',function(d){ return d.t; }],['natureza','Natureza','cat',function(d){ return d.nat; }],
        ['noPrazo','No prazo','bool',function(d){ var ok=servOk(d); return ok==null?null:pnSimNao(ok); }],['dias','Dias úteis','num',function(d){ return servDu(d); },'d.u.'],['trab','Tempo de trabalho (VHL)','num',function(d){ return d.tempo==null?null:d.tempo/60; },'min']]},
    execs:{nome:'Execuções de etapa (quem fez o quê)', lista:'pnExec', dica:'VHL (etapas) e Tri7 (andamentos e certidões), no mês da execução; funções da Configuração.',
      linhas:function(){ return eqExecs(); },
      campos:[['mes','Mês','cat',function(x){ return x.m; }],['pessoa','Pessoa','cat',function(x){ return x.nome; }],['funcao','Função','cat',function(x){ return x.fn; }],['setor','Setor','cat',function(x){ return x.setor; }],['natureza','Natureza','cat',function(x){ return x.nat; }],
        ['sistema','Sistema','cat',function(x){ return x.src; }],['dow','Dia da semana','cat',function(x){ return pnDow(x.d); }],['pz','Tempo na etapa','num',function(x){ return x.pz; },'d.u.']]},
    inc:{nome:'Inconformidades', lista:'inc', dica:'PAINEL-04, no mês do registro da inconformidade.',
      linhas:function(){ return incTodos(); },
      campos:[['mes','Mês','cat',function(r){ return pnMesIso(r.d); }],['pessoa','Pessoa','cat',function(r){ return pnPessoa(r.r); }],['tipoErro','Tipo de erro','cat',function(r){ return catDe(r); }],['grupoErro','Interno × externo','cat',function(r){ return grupoDe(r)==='E'?'Externo':'Interno'; }],
        ['serventia','Serventia','cat',function(r){ return r.t; }],['natureza','Natureza','cat',function(r){ return r.n; }],['dow','Dia da semana','cat',function(r){ return pnDow(r.d); }]]},
    cert:{nome:'Certidões (Tri7)', lista:'cert', dica:'Pedidos de certidão, no mês do pedido; prazo em horas úteis do expediente.',
      linhas:function(){ var o=[]; Object.keys(state.cert).forEach(function(m){ o=o.concat(state.cert[m].recs); }); return certCalc(o); },
      campos:[['mes','Mês','cat',function(c){ return c.mes; }],['pessoa','Pessoa','cat',function(c){ return c.u?pnPessoa(nomeLogin(c.u)):null; }],['tipoCert','Tipo','cat',function(c){ return c.tipo; }],['origem','Origem','cat',function(c){ return c.origem; }],
        ['noPrazo','No prazo','bool',function(c){ return c.intim?null:pnSimNao(c.ok); }],['intim','Fluxo de intimação','bool',function(c){ return pnSimNao(c.intim); }],['dow','Dia da semana do pedido','cat',function(c){ return pnDow(Motor.isoMin(c.i)); }],
        ['hora','Hora do pedido','cat',function(c){ return Motor.isoMin(c.i).slice(11,13)+'h'; }],['hu','Horas úteis até os selos','num',function(c){ return c.hu; },'h']]},
    senhas:{nome:'Senhas do balcão', lista:'senhas', dica:'PAINEL-05; espera = da emissão à chamada.',
      linhas:function(){ return senhasLista('todos'); },
      campos:[['mes','Mês','cat',function(s){ return pnMesIso(s.dia); }],['fila','Fila','cat',function(s){ return s.fila; }],['pessoa','Atendente','cat',function(s){ return pnPessoa(s.at); }],['dow','Dia da semana','cat',function(s){ return PN_DOW[s.dw]; }],
        ['hora','Hora da emissão','cat',function(s){ return s.g==null?null:String(Math.floor(s.g/3600)).padStart(2,'0')+'h'; }],['atendida','Atendida','bool',function(s){ return pnSimNao(s.c!=null); }],['passou15','Esperou mais de 15 min','bool',function(s){ return s.e==null?null:pnSimNao(s.e>900); }],
        ['espera','Espera','num',function(s){ return s.e==null?null:s.e/60; },'min'],['atend','Tempo de atendimento','num',function(s){ return s.t==null||s.t>3600?null:s.t/60; },'min']]},
    andam:{nome:'Andamentos do Tri7', lista:'pnAnd', dica:'Relatório de andamentos, no mês do andamento.',
      linhas:function(){ var o=[]; Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ if (e.t==='P') o.push(e); }); }); return o; },
      campos:[['mes','Mês','cat',function(e){ return Motor.isoMin(e.m).slice(0,7); }],['status','Andamento','cat',function(e){ return Motor.AND_NOME[e.s]||e.s; }],['pessoa','Pessoa','cat',function(e){ return pnPessoa(nomeLogin(e.u)); }],
        ['dow','Dia da semana','cat',function(e){ return pnDow(Motor.isoMin(e.m)); }],['hora','Hora','cat',function(e){ return Motor.isoMin(e.m).slice(11,13)+'h'; }]]}
  };
  function pnCampo(f, id){ var F=PN_FONTES[f]; if (!F) return null; for (var i=0;i<F.campos.length;i++) if (F.campos[i][0]===id) return {id:id, nome:F.campos[i][1], tipo:F.campos[i][2], get:F.campos[i][3], un:F.campos[i][4]||''}; return null; }
  var PN_MED={qtd:'Quantidade', distintos:'Documentos distintos', pct:'% que atende a condição', media:'Média de', mediana:'Mediana de', p90:'90% em até (P90)', min:'Mínimo de', max:'Máximo de', soma:'Soma de'};
  var PN_FMT=[
    ['numero','Cartão (número)','Um resultado só, com meta: o KPI do mês, a taxa do período.','Precisa mostrar evolução ou comparação.'],
    ['linha','Linha','Evolução no tempo: o mês a mês, tendência, antes e depois de uma ação (use os marcos).','O eixo não é tempo (agrupe por Mês).'],
    ['barras','Barras horizontais','Comparar categorias (naturezas, erros, funções). Ordenadas da maior para a menor, mostram o que pesa mais (Pareto).','São mais de ~15 categorias: use tabela ou limite.'],
    ['empilhadas','Barras empilhadas','A composição de cada mês ou categoria: interno × externo, balcão × central (precisa de 2 agrupamentos).','A medida é % ou média (as partes não somam: use Linha), ou são mais de 5 partes.'],
    ['tabela','Tabela','Ver os números exatos, ordenar, conferir, auditar.','O objetivo é ver um padrão de relance.'],
    ['calor','Mapa de calor','Cruzar duas coisas e achar onde concentra: dia da semana × hora, natureza × tipo de erro (precisa de 2 agrupamentos).','Os grupos têm poucos casos.'],
    ['dispersao','Dispersão','Relação entre duas medidas por grupo: "quem tem mais volume tem mais erro?" (use a Medida B como eixo Y).','Há poucos pontos.'],
    ['caixa','Caixa (box plot)','Comparar a variação de um tempo entre grupos, não só a média; mostra os casos fora da curva.','O público não conhece o gráfico (a dica explica).']];
  function pnSugerir(c){ var g1=c.g1, g2=c.g2; if (c.fmtAuto===false&&c.fmt) return c.fmt;
    if (!g1) return 'numero'; if (c.b&&c.bModo==='eixo') return 'dispersao'; if (g1==='mes'&&!g2) return 'linha'; if (g1==='mes'&&g2) return pnSomavel(c)?'empilhadas':'linha'; if (g2) return 'calor'; return 'barras'; }
  function pnSomavel(c){ var t=(c.m||{}).t; return !c.b && (t==='qtd'||t==='soma'||t==='distintos'); }
  // ——— cálculo
  function pnCache(){ var k=[Object.keys(state.docs).length,Object.keys(state.serv).length,Object.keys(state.inconf).length,Object.keys(state.cert).length,Object.keys(state.senhas).length,state.andVer||0,state.fnVer||0,state.apurVer||0,(state.extras||[]).length].join('|');
    if (state._pnC&&state._pnC.k===k) return state._pnC; state._pnC={k:k, L:{}}; return state._pnC; }
  // a mesma pessoa escrita com acento ou maiúsculas diferentes (inconformidades × VHL × Tri7) vira um nome só: o do VHL/Tri7
  function pnPessoa(n){ if (!n) return null; var C=pnCache(); if (!C.nomes){ C.nomes={}; pnLinhas('execs').forEach(function(x){ if (x.nome) C.nomes[semAc(x.nome).replace(/\s+/g,' ')]=x.nome; }); } return C.nomes[semAc(n).replace(/\s+/g,' ')]||n; }
  function pnLinhas(f){ var C=pnCache(); if (!C.L[f]) C.L[f]=PN_FONTES[f]?PN_FONTES[f].linhas():[]; return C.L[f]; }
  function pnFiltrar(f, filtros, periodo){ var L=pnLinhas(f), fm=pnCampo(f,'mes'), fs=(filtros||[]).map(function(x){ var c=pnCampo(f,x.campo); return c?{c:c,x:x}:null; }).filter(Boolean);
    return L.filter(function(r){ if (periodo!=='todos' && state.periodo!=='todos' && fm && fm.get(r)!==state.periodo) return false;
      for (var i=0;i<fs.length;i++){ var c=fs[i].c, x=fs[i].x, v=c.get(r);
        if (c.tipo==='num'){ if (v==null) return false; if (x.op==='>='&&!(v>=+x.v)) return false; if (x.op==='<='&&!(v<=+x.v)) return false; }
        else if ((x.vals||[]).length && x.vals.indexOf(v==null?'(vazio)':String(v))<0) return false; }
      return true; }); }
  function pnMedir(f, rows, M){ M=M||{t:'qtd'};
    if (M.t==='qtd') return rows.length;
    if (M.t==='distintos'){ var o={}; rows.forEach(function(r){ o[String(r.c!=null?r.c:r.p!=null?r.p:r.n)]=1; }); return Object.keys(o).length; }
    if (M.t==='pct'){ var c=pnCampo(f,M.campo); if (!c) return null; var base=rows.filter(function(r){ return c.get(r)!=null; }); if (!base.length) return null; var alvo=M.valor||'Sim'; return base.filter(function(r){ return String(c.get(r))===alvo; }).length/base.length*100; }
    var c2=pnCampo(f,M.campo); if (!c2) return null; var v=rows.map(function(r){ return c2.get(r); }).filter(function(x){ return x!=null&&!isNaN(x); }); if (!v.length) return null;
    if (M.t==='media') return media(v); if (M.t==='mediana') return quant(v,.5); if (M.t==='p90') return quant(v,.9); if (M.t==='min') return Math.min.apply(null,v); if (M.t==='max') return Math.max.apply(null,v); if (M.t==='soma') return v.reduce(function(s,x){ return s+x; },0); return null; }
  function pnUn(f, M){ if (!M) return ''; if (M.t==='pct') return '%'; if (M.t==='qtd'||M.t==='distintos') return ''; var c=pnCampo(f,M.campo); return c?c.un:''; }
  function pnOrdemChaves(id, ks, val){ if (id==='mes') return ks.sort(); if (id==='dow') return ks.sort(function(a,b){ var o=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']; return o.indexOf(a)-o.indexOf(b); }); if (id==='hora') return ks.sort();
    return ks.sort(function(a,b){ return (val?(val(b)||0)-(val(a)||0):0) || String(a).localeCompare(String(b),'pt-BR'); }); }
  // resultado de um cartão: {k1:[...], k2:[...], v(k1,k2), n(k1,k2), rows(k1,k2), total, un}
  function pnPer(c){ return c.periodo==='todos'||(c.g1==='mes'&&c.periodo!=='topo')?'todos':'topo'; }
  function pnCalc(c){
    var per=pnPer(c), eixo=c.b&&c.bModo==='eixo', fator=c.b&&c.bPct?100:1;
    var A=pnFiltrar(c.f, c.filtros, per), B=c.b?pnFiltrar(c.b.f, c.b.filtros, per):null;
    var g1=c.g1?pnCampo(c.f,c.g1):null, g2=c.g2?pnCampo(c.f,c.g2):null, g1b=c.b&&c.g1?pnCampo(c.b.f,c.g1):null, g2b=c.b&&c.g2?pnCampo(c.b.f,c.g2):null;
    function chave(g,r){ if (!g) return '_'; var v=g.get(r); return v==null?'(vazio)':String(v); }
    function agrupar(rows, ga, gb){ var o={}, o1={}; rows.forEach(function(r){ var a=chave(ga,r), b=chave(gb,r); var x=o[a]=o[a]||{}; (x[b]=x[b]||[]).push(r); (o1[a]=o1[a]||[]).push(r); }); return {c:o, g:o1}; }
    var GA=agrupar(A,g1,g2), GB=B?agrupar(B,g1b,g2b):{c:{},g:{}};
    function razao(ra, rb){ var va=pnMedir(c.f,ra,c.m); if (!c.b||eixo) return va; var vb=pnMedir(c.b.f,rb,c.b.m); return vb?va/vb*fator:null; }
    function cel(a,b){ return (GA.c[a]||{})[b]||[]; } function celB(a,b){ return (GB.c[a]||{})[b]||[]; }
    var v=function(a,b){ return razao(cel(a,b), celB(a,b)); }, v1=function(a){ return razao(GA.g[a]||[], GB.g[a]||[]); };
    var vB=function(a){ return c.b?pnMedir(c.b.f,GB.g[a]||[],c.b.m):null; };
    var k1=Object.keys(GA.g); if (c.b&&!eixo) Object.keys(GB.g).forEach(function(k){ if (k1.indexOf(k)<0) k1.push(k); });
    var k2={}; Object.keys(GA.c).forEach(function(a){ Object.keys(GA.c[a]).forEach(function(b){ k2[b]=1; }); }); k2=Object.keys(k2);
    k1=pnOrdemChaves(c.g1, k1, g2?function(a){ return (GA.g[a]||[]).length; }:v1); k2=pnOrdemChaves(c.g2, k2, function(b){ return k1.reduce(function(s,a){ return s+cel(a,b).length; },0); });
    if (+c.minN>0) k1=k1.filter(function(a){ return (GA.g[a]||[]).length>=+c.minN; });
    if (c.lim&&c.g1!=='mes') k1=k1.slice(0,+c.lim);
    var un=c.b&&!eixo?(c.bPct?'%':''):pnUn(c.f,c.m);
    return {k1:k1, k2:k2, v:v, v1:v1, vB:vB, cel:cel, rows1:function(a){ return GA.g[a]||[]; }, rowsAll:A, total:razao(A,B||[]), un:un, nA:A.length, nB:B?B.length:null, per:per}; }
  function pnFmtV(v, un){ if (v==null||isNaN(v)) return '—'; var d=un==='%'||Math.abs(v)<10&&v%1?1:0; if (un==='d.u.'||un==='h'||un==='min') d=1; return numBR(v,d)+(un==='%'?'%':un?' '+un:''); }
  function pnMetaOk(c, v){ if (!c.meta||c.meta.v===''||c.meta.v==null||v==null) return null; var m=+c.meta.v; return c.meta.bom==='acima'?v>=m:v<=m; }
  // antes × depois de uma ação (mês da ação + nº de meses de cada lado)
  function pnAntesDepois(c){ if (!c.ad||!c.ad.mes) return ''; var n=Math.max(1,+c.ad.n||3), ms=[], m=c.ad.mes, i;
    var antes=[]; for (i=0;i<n;i++){ m=mesAnt(m); antes.unshift(m); } var dep=[c.ad.mes]; for (i=1;i<n;i++){ var p=dep[dep.length-1].split('-').map(Number); p[1]++; if (p[1]>12){ p[1]=1; p[0]++; } dep.push(p[0]+'-'+(p[1]<10?'0':'')+p[1]); }
    dep=dep.filter(function(x){ return x<=mesHoje(); });
    function janela(L){ var fa=pnCampo(c.f,'mes'), A=pnFiltrar(c.f,c.filtros,'todos').filter(function(r){ return L.indexOf(fa.get(r))>=0; }), va=pnMedir(c.f,A,c.m);
      if (!c.b||c.bModo==='eixo') return {v:va,n:A.length}; var fb=pnCampo(c.b.f,'mes'), B=pnFiltrar(c.b.f,c.b.filtros,'todos').filter(function(r){ return fb&&L.indexOf(fb.get(r))>=0; }), vb=pnMedir(c.b.f,B,c.b.m); return {v:vb?va/vb*(c.bPct?100:1):null,n:A.length,nb:B.length}; }
    var a=janela(antes), d=janela(dep), un=c.b&&c.bModo!=='eixo'?(c.bPct?'%':''):pnUn(c.f,c.m), varr=a.v?(d.v-a.v)/a.v*100:null;
    var poucos=a.n<20||d.n<20;
    return '<div class="pn-ad"><div><span>Antes · '+esc(nomeMes(antes[0]))+' a '+esc(nomeMes(antes[antes.length-1]))+'</span><b>'+pnFmtV(a.v,un)+'</b><small>'+a.n+' casos</small></div><div><span>Depois · '+esc(nomeMes(dep[0]||c.ad.mes))+(dep.length>1?' a '+esc(nomeMes(dep[dep.length-1])):'')+'</span><b>'+pnFmtV(d.v,un)+'</b><small>'+d.n+' casos'+(dep.length<n?' · '+dep.length+' de '+n+' meses já passaram':'')+'</small></div><div><span>Variação</span><b>'+(varr==null?'—':(varr>0?'+':'')+numBR(varr,0)+'%')+'</b><small>'+(poucos?'poucos casos: conclua com cuidado':'')+'</small></div></div>'; }
  function pnEmpilhadas(labels, series, un){ var W=560, H=230, pl=40, pr=8, pt=12, pb=26, tot=labels.map(function(l,i){ return series.reduce(function(s,se){ return s+(se.v[i]||0); },0); }), mx=Math.max.apply(null,tot.concat([1]));
    var bw=(W-pl-pr)/labels.length, y=function(v){ return pt+(H-pt-pb)*(1-v/mx); }, s='<svg viewBox="0 0 '+W+' '+H+'" class="gm-svg vz-svg" role="img" aria-label="Barras empilhadas">';
    [0,mx/2,mx].forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t).toFixed(1)+'" y2="'+y(t).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(y(t)+3.5).toFixed(1)+'" text-anchor="end" font-size="11" style="fill:var(--ink-3)">'+numBR(t,t%1?1:0)+'</text>'; });
    labels.forEach(function(l,i){ var x=pl+i*bw+bw*0.15, acc=0, tip='<b>'+esc(l)+'</b>'; series.forEach(function(se){ var v=se.v[i]||0; if (!v) return; var y1=y(acc+v), y0=y(acc); s+='<rect x="'+x.toFixed(1)+'" y="'+y1.toFixed(1)+'" width="'+(bw*0.7).toFixed(1)+'" height="'+Math.max(0,y0-y1-1).toFixed(1)+'" rx="2" style="fill:'+se.cor+'"/>'; acc+=v; tip+='<br>'+esc(se.nome)+': '+pnFmtV(v,un); });
      s+='<text x="'+(x+bw*0.35).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)">'+esc(String(l).length>9?String(l).slice(0,8)+'…':l)+'</text>'+hitRect(pl+i*bw,0,bw,H,tip,null); });
    return s+'</svg><div class="leg">'+series.map(function(se){ return '<span><i class="dot" style="background:'+se.cor+'"></i>'+esc(se.nome)+'</span>'; }).join('')+'</div>'; }
  function pnMedNome(f,M){ M=M||{t:'qtd'}; var cm=pnCampo(f,M.campo); return (PN_MED[M.t]||'')+(M.t==='pct'&&cm?' '+cm.nome+' = '+(M.valor||'Sim'):cm&&M.t!=='qtd'&&M.t!=='distintos'?' '+cm.nome.toLowerCase():''); }
  // ponto da caixa: protocolo abre a ficha
  function pnPonto(c, r, cn){ var v=cn.get(r), cod=r.c!=null?r.c:r.n; return {v:v, item:r, lab:(cod!=null?cod+' · ':'')+pnFmtV(v,cn.un), go:cod!=null&&c.f!=='senhas'&&c.f!=='inc'?{t:'prot',c:cod}:null}; }
  function pnRotulo(id,k){ return id==='mes'&&/^\d{4}-\d{2}$/.test(k)?nomeMes(k):k; }
  function pnLista(c, rows, tit){ var F=PN_FONTES[c.f]; pnListasReg(); return goLista(tit, F.lista, rows); }
  function pnListasReg(){ if (typeof LISTA_COLS==='undefined' || LISTA_COLS.pnExec) return;
    LISTA_COLS.pnExec=[['Código',function(x){ return protLink(x.c); }],['Pessoa',function(x){ return esc(x.nome); },'tl'],['Função',function(x){ return esc(x.fn); },'tl'],['Natureza',function(x){ return esc(x.nat); },'tl'],['Data',function(x){ return fmtData(x.d); }],['Tempo na etapa',function(x){ return x.pz==null?'—':x.pz+' d.u.'; }],['Sistema',function(x){ return x.src; }]];
    LISTA_COLS.pnAnd=[['Protocolo',function(e){ return protLink(e.n); }],['Andamento',function(e){ return esc(Motor.AND_NOME[e.s]||e.s); }],['Pessoa',function(e){ return esc(nomeLogin(e.u)); },'tl'],['Quando',function(e){ return esc(minFmt(e.m)); }]]; }
  // ——— desenho de um cartão
  function pnRolavel(h){ return h.replace(/<div class="tbl-wrap"/g,'<div class="tbl-wrap" tabindex="0" role="region" aria-label="Tabela do cartão (role para ver tudo)"'); }
  function pnDesenho(c){
    var F=PN_FONTES[c.f]; if (!F) return '<div class="gm-vazio">Fonte desconhecida</div>';
    var R=pnCalc(c), fmt=pnSugerir(c), un=R.un, h='';
    if (fmt==='numero'||!c.g1){ var ok=pnMetaOk(c,R.total);
      h='<div class="pn-num"><b>'+pnFmtV(R.total,un)+'</b>'+(ok!=null?'<span class="pill '+(ok?'good':'crit')+'">'+(ok?'atende a meta':'fora da meta')+' ('+(c.meta.bom==='acima'?'≥ ':'≤ ')+pnFmtV(+c.meta.v,un)+')</span>':'')+'<small>'+R.nA.toLocaleString('pt-BR')+' casos'+(R.nB!=null?' · base '+R.nB.toLocaleString('pt-BR'):'')+'</small></div>'; }
    else if (fmt==='linha'){ var ms=R.k1.filter(function(k){ return /^\d{4}-\d{2}$/.test(k); }), ser=[];
      if (c.g2){ ser=R.k2.slice(0,6).map(function(b,i){ return {nome:pnRotulo(c.g2,b), cor:EQ_CORES[i], v:ms.map(function(m){ return R.v(m,b); })}; }); }
      else ser=[{nome:c.titulo||'valor', cor:'var(--serie)', v:ms.map(function(m){ return R.v1(m); }), alerta:ms.map(function(m){ return pnMetaOk(c,R.v1(m))===false; }), extra:ms.map(function(m){ return R.rows1(m).length+' casos'; })}];
      var marcos=(c.marcos||[]).map(function(x){ return {i:ms.indexOf(x.mes), txt:x.txt}; }).filter(function(x){ return x.i>=0; });
      h=gLinhas(ms, ser, {titulo:c.titulo, un:un, zero:true, W:560, H:230, ref:c.meta&&c.meta.v!==''&&c.meta.v!=null?[{v:+c.meta.v,nome:'meta'}]:null, marcos:marcos}); }
    else if (fmt==='barras'){ h=gBarrasH(R.k1.map(function(a){ var v=R.v1(a), ok=pnMetaOk(c,v);
        return {nome:pnRotulo(c.g1,a), v:v==null?0:Math.round(v*100)/100, cor:ok===false?'var(--crit)':'var(--serie)', extra:R.rows1(a).length+' casos', go:pnLista(c,R.rows1(a),(c.titulo||'Cartão')+' · '+pnRotulo(c.g1,a))}; }),{un:un}); }
    else if (fmt==='empilhadas'){ h=(pnSomavel(c)?'':'<p class="hint">A medida é % ou média: as partes não somam. A Linha mostra melhor.</p>')+pnEmpilhadas(R.k1.map(function(a){ return pnRotulo(c.g1,a); }), R.k2.slice(0,6).map(function(b,i){ return {nome:pnRotulo(c.g2,b), cor:EQ_CORES[i], v:R.k1.map(function(a){ return R.v(a,b)||0; })}; }), un)+(R.k2.length>6?'<p class="hint">Mostrando as 6 maiores partes.</p>':''); }
    else if (fmt==='calor'&&c.g2){ h=gMapa(R.k1.map(function(a){ return {k:a, nome:pnRotulo(c.g1,a)}; }), R.k2.map(function(b){ return {k:b, nome:pnRotulo(c.g2,b), curto:String(pnRotulo(c.g2,b)).slice(0,10)}; }), function(r,co){ var v=R.v(r.k,co.k), rows=R.cel(r.k,co.k); if (v==null||!rows.length) return null; return {v:Math.max(0.0001,v), txt:pnFmtV(v,un).replace(' '+un,''), tip:'<b>'+esc(r.nome)+' · '+esc(co.nome)+'</b><br>'+pnFmtV(v,un)+'<br>'+rows.length+' casos', go:pnLista(c,rows,(c.titulo||'Cartão')+' · '+r.nome+' · '+co.nome)}; }); }
    else if (fmt==='dispersao'){ h=gDispersao(R.k1.map(function(a){ return {x:R.v1(a), y:R.vB(a), nome:pnRotulo(c.g1,a), rot:R.v1(a), go:pnLista(c,R.rows1(a),(c.titulo||'Cartão')+' · '+pnRotulo(c.g1,a))}; }),{W:560, xl:pnMedNome(c.f,c.m)+' · '+PN_FONTES[c.f].nome.split(' (')[0], yl:c.b?pnMedNome(c.b.f,c.b.m)+' · '+PN_FONTES[c.b.f].nome.split(' (')[0]:'', unY:c.b?pnUn(c.b.f,c.b.m):''}); }
    else if (fmt==='caixa'){ var cn=pnCampo(c.f,(c.m||{}).campo); if (!cn||cn.tipo!=='num') h='<div class="gm-vazio">A caixa precisa de uma medida sobre um campo de tempo ou número (média, mediana…).</div>';
      else h=gBox(R.k1.map(function(a){ return {nome:pnRotulo(c.g1,a), pts:R.rows1(a).map(function(r){ return pnPonto(c,r,cn); }), go:pnLista(c,R.rows1(a),(c.titulo||'Cartão')+' · '+pnRotulo(c.g1,a))}; }),{un:cn.un, ref:c.meta&&c.meta.v!==''&&c.meta.v!=null?+c.meta.v:null}); }
    else { // tabela (ou calor sem 2º agrupamento)
      var cols=c.g2?R.k2:['_'], vt=function(a,b){ return b==='_'?R.v1(a):R.v(a,b); }, rt=function(a,b){ return b==='_'?R.rows1(a):R.cel(a,b); };
      h='<div class="tbl-wrap" style="max-height:420px"><table class="tleft pn-t"><thead><tr><th>'+esc((pnCampo(c.f,c.g1)||{}).nome||'')+'</th>'+cols.map(function(b){ return '<th>'+esc(b==='_'?'Valor':pnRotulo(c.g2,b))+'</th>'; }).join('')+(c.g2?'':'<th>Casos</th>')+'</tr></thead><tbody>'+
        R.k1.map(function(a){ return '<tr><td>'+esc(pnRotulo(c.g1,a))+'</td>'+cols.map(function(b){ var v=vt(a,b), ok=pnMetaOk(c,v), rr=rt(a,b), go=rr.length?pnLista(c,rr,(c.titulo||'Cartão')+' · '+pnRotulo(c.g1,a)+(b==='_'?'':' · '+pnRotulo(c.g2,b))):null; return '<td class="n"'+(ok===false?' style="color:var(--crit);font-weight:700"':'')+'>'+(go?'<button type="button" class="lnk"'+goAttr(go)+'>'+pnFmtV(v,un)+'</button>':pnFmtV(v,un))+'</td>'; }).join('')+(c.g2?'':'<td class="n mut">'+R.rows1(a).length+'</td>')+'</tr>'; }).join('')+'</tbody></table></div>'; }
    return pnRolavel(h)+pnAntesDepois(c); }
  function pnDescr(c){ var F=PN_FONTES[c.f]||{nome:'?'}, M=c.m||{t:'qtd'}, cm=pnCampo(c.f,M.campo);
    var med=(PN_MED[M.t]||'')+(M.t==='pct'&&cm?' "'+cm.nome+' = '+(M.valor||'Sim')+'"':cm&&M.t!=='qtd'&&M.t!=='distintos'?' '+cm.nome.toLowerCase():'');
    var b=c.b?' ÷ '+(PN_MED[c.b.m.t]||'')+(pnCampo(c.b.f,c.b.m.campo)?' '+pnCampo(c.b.f,c.b.m.campo).nome.toLowerCase():'')+' de '+PN_FONTES[c.b.f].nome+(c.bPct?' × 100':''):'';
    var fl=(c.filtros||[]).map(function(x){ var cc=pnCampo(c.f,x.campo); return cc?cc.nome+(cc.tipo==='num'?' '+x.op+' '+x.v:': '+(x.vals||[]).join(', ')):''; }).filter(Boolean);
    return esc(F.nome)+' · '+esc(med+b)+(c.g1?' · por '+esc((pnCampo(c.f,c.g1)||{}).nome||'')+(c.g2?' e '+esc((pnCampo(c.f,c.g2)||{}).nome||''):''):'')+(fl.length?' · filtro: '+esc(fl.join('; ')):'')+' · '+(c.periodo==='todos'||c.g1==='mes'&&c.periodo!=='topo'?'todos os meses carregados':'período do topo'); }
  // ——— página
  function pnLista0(){ return Object.keys(state.pn||{}).map(function(id){ return state.pn[id]; }).filter(function(p){ return p&&!p.arquivado; }).sort(function(a,b){ return (a.ordem||0)-(b.ordem||0) || String(a.nome).localeCompare(String(b.nome)); }); }
  function pnSalvar(p){ state.pn=Object.assign({},state.pn); state.pn[p.id]=p; p.em=new Date().toISOString(); p.por=nomeUsuario(); if (dbPronto&&podeEscrever) db.doc('paineis/'+p.id).set(p).catch(function(){ toast('Não consegui salvar o painel'); }); }
  function renderPn(){
    var el=$('tabPn'); if (!el) return; var L=pnLista0();
    if (!state.pnSel||!state.pn[state.pnSel]||state.pn[state.pnSel].arquivado) state.pnSel=L.length?L[0].id:null;
    var P=state.pnSel?state.pn[state.pnSel]:null;
    var h='<div class="sec-h"><span class="note">Monte os seus cartões: escolha a fonte, a medida (ou uma taxa A ÷ B), como agrupar e o formato. Os painéis ficam salvos no banco e vão no backup; versões novas do painel não apagam nada.</span></div>'+
      '<div class="pn-tabs">'+L.map(function(p){ return '<button type="button" class="chip'+(P&&p.id===P.id?' on':'')+'" data-pnsel="'+esc(p.id)+'">'+esc(p.nome)+' <span class="mut">'+(p.cards||[]).length+'</span></button>'; }).join('')+(podeEscrever?'<button type="button" class="btn sm" data-pnnovo="1">+ Novo painel</button>':'')+'</div>';
    if (!P){ el.innerHTML=h+'<div class="empty"><b>Nenhum painel ainda</b>Clique em "+ Novo painel" e depois em "+ Cartão".</div>'; return; }
    h+='<div class="search"><b class="pn-nome">'+esc(P.nome)+'</b>'+(podeEscrever?'<button class="btn primary sm" type="button" data-pncard="1">+ Cartão</button><button class="btn sm" type="button" data-pnrenomear="1">Renomear</button><button class="btn sm" type="button" data-pnduppainel="1">Duplicar painel</button><button class="btn sm" type="button" data-pnexcluir="1">Excluir painel</button>':'')+'<span class="spacer"></span><span class="hint">Período do topo: '+esc(state.periodo==='todos'?'todos os meses':nomeMes(state.periodo))+'</span></div>';
    if (state.pnEd) h+=pnEditorHTML(state.pnEd);
    var cards=P.cards||[];
    h+=cards.length?'<div class="pn-grid">'+cards.map(function(c,i){ var corpo; try{ corpo=pnDesenho(c); }catch(e){ corpo='<div class="gm-vazio">Não consegui montar este cartão: '+esc(e.message)+'</div>'; }
      return '<div class="gm-card pn-card'+(c.largo?' largo':'')+'" data-pncardid="'+esc(c.id)+'"><div class="gm-h"><span class="gm-t">'+esc(c.titulo||'Sem título')+'</span>'+(podeEscrever?'<span class="pn-acoes"><button class="lnk" type="button" data-pnedit="'+i+'">editar</button><button class="lnk" type="button" data-pndup="'+i+'">duplicar</button><button class="lnk" type="button" data-pnmover="'+i+'|-1" aria-label="Mover para trás">←</button><button class="lnk" type="button" data-pnmover="'+i+'|1" aria-label="Mover para frente">→</button><button class="lnk" type="button" data-pndel="'+i+'">excluir</button></span>':'')+'</div>'+corpo+'<p class="pn-desc">'+pnDescr(c)+'</p>'+(c.nota?'<p class="pn-nota">'+esc(c.nota)+'</p>':'')+'</div>'; }).join('')+'</div>':'<div class="empty"><b>Painel vazio</b>Clique em "+ Cartão".</div>';
    el.innerHTML=h; }
  // ——— editor de cartão
  function pnOpcoes(f, tipos, sel, vazio){ var F=PN_FONTES[f]; return (vazio?'<option value="">'+esc(vazio)+'</option>':'')+F.campos.filter(function(x){ return tipos.indexOf(x[2])>=0; }).map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===sel?' selected':'')+'>'+esc(x[1])+'</option>'; }).join(''); }
  function pnValores(f, campo){ var c=pnCampo(f,campo); if (!c) return []; var o={}; pnLinhas(f).forEach(function(r){ var v=c.get(r); v=v==null?'(vazio)':String(v); o[v]=(o[v]||0)+1; }); return Object.keys(o).sort(function(a,b){ return campo==='mes'?(a<b?1:-1):o[b]-o[a]; }).slice(0,300).map(function(v){ return [v,o[v]]; }); }
  function pnMedHTML(pref, f, M){ M=M||{t:'qtd'}; var c=pnCampo(f,M.campo);
    return '<select data-pned="'+pref+'.m.t" aria-label="Medida '+pref.toUpperCase()+'">'+Object.keys(PN_MED).map(function(k){ return '<option value="'+k+'"'+(M.t===k?' selected':'')+'>'+PN_MED[k]+'</option>'; }).join('')+'</select>'+
      (M.t==='pct'?'<select data-pned="'+pref+'.m.campo" aria-label="Campo da condição">'+pnOpcoes(f,['bool','cat'],M.campo,'campo…')+'</select>'+(c?'<span>=</span><select data-pned="'+pref+'.m.valor" aria-label="Valor da condição">'+pnValores(f,M.campo).filter(function(v){ return v[0]!=='(vazio)'; }).map(function(v){ return '<option'+((M.valor||'Sim')===v[0]?' selected':'')+'>'+esc(v[0])+'</option>'; }).join('')+'</select>':''):
       (M.t!=='qtd'&&M.t!=='distintos'?'<select data-pned="'+pref+'.m.campo" aria-label="Campo da medida">'+pnOpcoes(f,['num'],M.campo,'campo…')+'</select>':'')); }
  function pnFiltrosHTML(pref, f, L){ return (L||[]).map(function(x,i){ var c=pnCampo(f,x.campo); return '<div class="pn-fl"><b>'+esc(c?c.nome:x.campo)+'</b>'+(c&&c.tipo==='num'?' '+esc(x.op)+' '+esc(x.v):': '+esc((x.vals||[]).join(', ')))+' <button class="lnk" type="button" data-pnfdel="'+pref+'|'+i+'">remover</button></div>'; }).join('')+
    '<div class="pn-fl add"><select data-pnfcampo="'+pref+'" aria-label="Filtrar por">'+pnOpcoes(f,['cat','bool','num'],state.pnFC&&state.pnFC[pref],'+ filtrar por…')+'</select>'+(function(){ var fc=state.pnFC&&state.pnFC[pref], c=fc?pnCampo(f,fc):null; if (!c) return '';
      if (c.tipo==='num') return '<select data-pnfop="'+pref+'" aria-label="Operador"><option value=">=">≥</option><option value="<=">≤</option></select><input type="number" step="any" data-pnfv="'+pref+'" aria-label="Valor do filtro" style="width:90px"><button class="btn sm" type="button" data-pnfadd="'+pref+'">Adicionar</button>';
      return '<select multiple size="5" data-pnfvals="'+pref+'" aria-label="Valores do filtro" style="min-width:220px">'+pnValores(f,fc).map(function(v){ return '<option value="'+esc(v[0])+'">'+esc(v[0])+' ('+v[1]+')</option>'; }).join('')+'</select><button class="btn sm" type="button" data-pnfadd="'+pref+'">Adicionar</button><span class="hint">Ctrl/Shift para marcar vários</span>'; })()+'</div>'; }
  function pnEditorHTML(c){ var fmtS=pnSugerir(Object.assign({},c,{fmtAuto:true})), fmt=c.fmtAuto===false&&c.fmt?c.fmt:fmtS;
    var gOpts=function(sel,vazio){ var ids=PN_FONTES[c.f].campos.filter(function(x){ return x[2]!=='num' && (!c.b||pnCampo(c.b.f,x[0])); }); return '<option value="">'+vazio+'</option>'+ids.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===sel?' selected':'')+'>'+esc(x[1])+'</option>'; }).join(''); };
    var h='<div class="panel pn-ed"><div class="sec-h"><h2>'+(c._novo?'Novo cartão':'Editar cartão')+'</h2><span class="spacer"></span><button class="btn primary sm" type="button" data-pnedsalvar="1">Salvar cartão</button><button class="btn sm" type="button" data-pnedcancelar="1">Cancelar</button></div>'+
      '<div class="pn-ed-g"><label>Título<input type="text" data-pned="titulo" value="'+esc(c.titulo||'')+'" placeholder="ex.: Apuração NC-010"></label>'+
      '<label>Fonte<select data-pned="f">'+Object.keys(PN_FONTES).map(function(k){ return '<option value="'+k+'"'+(c.f===k?' selected':'')+'>'+esc(PN_FONTES[k].nome)+'</option>'; }).join('')+'</select><small>'+esc(PN_FONTES[c.f].dica)+'</small></label>'+
      '<div class="pn-ed-l"><span>Medida</span><div class="pn-row">'+pnMedHTML('a',c.f,c.m)+'</div></div>'+
      '<div class="pn-ed-l"><span>Filtros</span>'+pnFiltrosHTML('a',c.f,c.filtros)+'</div>'+
      '<div class="pn-ed-l"><label class="lc-chk"><input type="checkbox" data-pned="usaB"'+(c.b?' checked':'')+'> Dividir por outra medida (taxa A ÷ B) ou usar como eixo Y da dispersão</label>'+
      (c.b?'<div class="pn-b"><div class="pn-row"><select data-pned="b.f" aria-label="Fonte de B">'+Object.keys(PN_FONTES).map(function(k){ return '<option value="'+k+'"'+(c.b.f===k?' selected':'')+'>'+esc(PN_FONTES[k].nome)+'</option>'; }).join('')+'</select>'+pnMedHTML('b',c.b.f,c.b.m)+'</div>'+
        '<div class="pn-row"><label class="lc-chk"><input type="radio" name="pnbm" data-pned="bModo" value="razao"'+(c.bModo!=='eixo'?' checked':'')+'> A ÷ B</label><label class="lc-chk"><input type="checkbox" data-pned="bPct"'+(c.bPct?' checked':'')+'> × 100 (em %)</label><label class="lc-chk"><input type="radio" name="pnbm" data-pned="bModo" value="eixo"'+(c.bModo==='eixo'?' checked':'')+'> B como eixo Y (dispersão)</label></div>'+
        '<div><span class="hint">Filtros de B</span>'+pnFiltrosHTML('b',c.b.f,c.b.filtros)+'</div><p class="hint">Os agrupamentos usam campos que existem nas duas fontes (mês, natureza, pessoa…), para A e B casarem.</p></div>':'')+'</div>'+
      '<label>Agrupar por<select data-pned="g1">'+gOpts(c.g1,'— sem agrupar (um número) —')+'</select></label>'+
      '<label>E também por<select data-pned="g2"'+(c.g1?'':' disabled')+'>'+gOpts(c.g2,'— nada —')+'</select></label>'+
      '<label>Período<select data-pned="periodo"><option value="auto"'+(!c.periodo||c.periodo==='auto'?' selected':'')+'>automático (mês a mês = todos os meses; senão, o do topo)</option><option value="topo"'+(c.periodo==='topo'?' selected':'')+'>sempre o período do topo</option><option value="todos"'+(c.periodo==='todos'?' selected':'')+'>sempre todos os meses carregados</option></select></label>'+
      '<label>Mínimo de casos por grupo<input type="number" min="0" data-pned="minN" value="'+esc(c.minN||'')+'" placeholder="sem mínimo"><small>Esconde grupos pequenos (1 caso = 100%).</small></label>'+
      '<label>Mostrar só os maiores<input type="number" min="0" data-pned="lim" value="'+esc(c.lim||'')+'" placeholder="todos"></label>'+
      '<label>Meta<span class="pn-row"><input type="number" step="any" data-pned="meta.v" aria-label="Valor da meta" value="'+esc(c.meta&&c.meta.v!=null?c.meta.v:'')+'" style="width:100px"><select data-pned="meta.bom" aria-label="Sentido da meta"><option value="abaixo"'+(!c.meta||c.meta.bom!=='acima'?' selected':'')+'>bom quando abaixo</option><option value="acima"'+(c.meta&&c.meta.bom==='acima'?' selected':'')+'>bom quando acima</option></select></span></label>'+
      '<label class="lc-chk" style="align-self:end"><input type="checkbox" data-pned="largo"'+(c.largo?' checked':'')+'> cartão largo (ocupa a linha toda)</label></div>'+
      '<div class="pn-ed-l"><span>Formato</span><div class="pn-fmts">'+PN_FMT.map(function(x){ var on=fmt===x[0]; return '<label class="pn-fmt'+(on?' on':'')+'"><input type="radio" name="pnfmt" data-pned="fmt" value="'+x[0]+'"'+(on?' checked':'')+'><b>'+esc(x[1])+(x[0]===fmtS?' <span class="pill good">sugerido</span>':'')+'</b><small>Melhor para: '+esc(x[2])+'</small><small class="mut">Evite quando: '+esc(x[3])+'</small></label>'; }).join('')+'</div></div>'+
      '<div class="pn-ed-l"><span>Marcos no gráfico de linha</span>'+(c.marcos||[]).map(function(x,i){ return '<div class="pn-fl"><b>'+esc(nomeMes(x.mes))+'</b> '+esc(x.txt)+' <button class="lnk" type="button" data-pnmdel="'+i+'">remover</button></div>'; }).join('')+'<div class="pn-fl add"><input type="month" id="pnMMes" aria-label="Mês do marco"><input type="text" id="pnMTxt" aria-label="Texto do marco" placeholder="ex.: ação da NC-010 (treinamento)"><button class="btn sm" type="button" data-pnmadd="1">Adicionar marco</button></div></div>'+
      '<div class="pn-ed-l"><span>Antes × depois de uma ação</span><div class="pn-row"><label>Mês da ação <input type="month" data-pned="ad.mes" value="'+esc(c.ad&&c.ad.mes||'')+'"></label><label>meses de cada lado <input type="number" min="1" max="12" data-pned="ad.n" value="'+esc(c.ad&&c.ad.n||3)+'" style="width:70px"></label><span class="hint">Compara a mesma medida nos meses antes e a partir da ação, ignorando o período do topo. Use taxa (A ÷ B) para não confundir com queda de volume.</span></div></div>'+
      '<label class="pn-ed-l"><span>Nota (aparece embaixo do cartão)</span><input type="text" data-pned="nota" value="'+esc(c.nota||'')+'" placeholder="ex.: verificação de eficácia da NC-010 · KPI-05"></label>'+
      '<div class="pn-prev"><div class="sub-h">Prévia</div><div class="gm-card">'+(function(){ try{ return pnDesenho(c); }catch(e){ return '<div class="gm-vazio">'+esc(e.message)+'</div>'; } })()+'<p class="pn-desc">'+pnDescr(c)+'</p></div></div></div>';
    return h; }
  function pnSet(o, path, v){ var p=path.split('.'), x=o; for (var i=0;i<p.length-1;i++){ x[p[i]]=x[p[i]]||{}; x=x[p[i]]; } x[p[p.length-1]]=v; }
  function pnNovoCard(){ return {_novo:true, id:'c'+Date.now().toString(36), titulo:'', f:'atos', m:{t:'qtd'}, filtros:[], g1:'mes', g2:'', periodo:'auto', fmtAuto:true}; }
  function pnEdMudou(t){ var c=state.pnEd; if (!c) return false;
    if (t.dataset.pned){ var k=t.dataset.pned, v=t.type==='checkbox'?t.checked:t.value;
      if (k==='usaB'){ c.b=v?{f:c.f, m:{t:'qtd'}, filtros:[]}:null; if (v){ c.bPct=true; c.bModo='razao'; } }
      else if (k==='f'){ c.f=v; c.filtros=[]; c.m={t:'qtd'}; if (c.g1&&!pnCampo(v,c.g1)) c.g1=''; if (c.g2&&!pnCampo(v,c.g2)) c.g2=''; }
      else if (k==='b.f'){ c.b.f=v; c.b.filtros=[]; c.b.m={t:'qtd'}; }
      else if (k==='a.m.t'){ c.m={t:v}; } else if (k==='b.m.t'){ c.b.m={t:v}; }
      else if (k==='a.m.campo'||k==='b.m.campo'){ var Mx=k[0]==='a'?c.m:c.b.m, fx=k[0]==='a'?c.f:c.b.f; Mx.campo=v; delete Mx.valor; if (Mx.t==='pct'){ var c0=pnCampo(fx,v); if (c0&&c0.tipo==='cat'){ var vs=pnValores(fx,v).filter(function(z){ return z[0]!=='(vazio)'; }); if (vs.length) Mx.valor=vs[0][0]; } } }
      else if (k==='a.m.valor'){ c.m.valor=v; } else if (k==='b.m.valor'){ c.b.m.valor=v; }
      else if (k==='fmt'){ c.fmt=v; c.fmtAuto=false; }
      else if (k==='g1'){ c.g1=v; if (!v) c.g2=''; } else if (k==='bModo'){ c.bModo=v; } else pnSet(c,k,v);
      renderPn(); return true; }
    if (t.dataset.pnfcampo){ state.pnFC=Object.assign({},state.pnFC); state.pnFC[t.dataset.pnfcampo]=t.value; renderPn(); return true; }
    return false; }
  function pnClique(t){
    var P=state.pnSel?state.pn[state.pnSel]:null;
    if (t.dataset.pnsel){ state.pnSel=t.dataset.pnsel; state.pnEd=null; renderPn(); return true; }
    if (t.dataset.pnnovo){ var nome=prompt('Nome do painel:','Meu painel'); if (!nome) return true; var id='p'+Date.now().toString(36); pnSalvar({id:id, nome:nome, ordem:pnLista0().length, cards:[]}); state.pnSel=id; renderPn(); return true; }
    if (!P) return false;
    if (t.dataset.pnrenomear){ var n2=prompt('Novo nome:',P.nome); if (n2){ P=JSON.parse(JSON.stringify(P)); P.nome=n2; pnSalvar(P); renderPn(); } return true; }
    if (t.dataset.pnduppainel){ var cp=JSON.parse(JSON.stringify(P)); cp.id='p'+Date.now().toString(36); cp.nome=P.nome+' (cópia)'; cp.ordem=pnLista0().length; pnSalvar(cp); state.pnSel=cp.id; renderPn(); return true; }
    if (t.dataset.pnexcluir){ if (!confirm('Excluir o painel "'+P.nome+'"? Ele é arquivado no banco (o backup e o histórico de gravações trazem de volta).')) return true; if (dbPronto&&podeEscrever) db.doc('paineis/'+P.id).delete(); var c0=Object.assign({},state.pn); delete c0[P.id]; state.pn=c0; state.pnSel=null; renderPn(); return true; }
    if (t.dataset.pncard){ state.pnEd=pnNovoCard(); renderPn(); window.scrollTo(0,0); return true; }
    if (t.dataset.pnedit!=null){ state.pnEd=JSON.parse(JSON.stringify(P.cards[+t.dataset.pnedit])); state.pnEdIdx=+t.dataset.pnedit; renderPn(); window.scrollTo(0,0); return true; }
    if (t.dataset.pndup!=null){ var P2=JSON.parse(JSON.stringify(P)), i=+t.dataset.pndup, cc=JSON.parse(JSON.stringify(P2.cards[i])); cc.id='c'+Date.now().toString(36); cc.titulo=(cc.titulo||'')+' (cópia)'; P2.cards.splice(i+1,0,cc); pnSalvar(P2); renderPn(); return true; }
    if (t.dataset.pndel!=null){ if (!confirm('Excluir este cartão?')) return true; var P3=JSON.parse(JSON.stringify(P)); P3.cards.splice(+t.dataset.pndel,1); pnSalvar(P3); renderPn(); return true; }
    if (t.dataset.pnmover){ var q=t.dataset.pnmover.split('|'), a=+q[0], b=a+(+q[1]), P4=JSON.parse(JSON.stringify(P)); if (b<0||b>=P4.cards.length) return true; var tmp=P4.cards[a]; P4.cards[a]=P4.cards[b]; P4.cards[b]=tmp; pnSalvar(P4); renderPn(); return true; }
    var c=state.pnEd; if (!c) return false;
    if (t.dataset.pnedcancelar){ state.pnEd=null; renderPn(); return true; }
    if (t.dataset.pnedsalvar){ var P5=JSON.parse(JSON.stringify(P)), cd=JSON.parse(JSON.stringify(c)); var novo=cd._novo; delete cd._novo; if (!cd.titulo) cd.titulo='Cartão '+(P5.cards.length+1); P5.cards=P5.cards||[];
      if (novo) P5.cards.push(cd); else P5.cards[state.pnEdIdx]=cd; pnSalvar(P5); state.pnEd=null; renderPn(); toast('Cartão salvo'); return true; }
    if (t.dataset.pnfadd){ var pref=t.dataset.pnfadd, fonte=pref==='a'?c.f:c.b.f, campo=state.pnFC&&state.pnFC[pref], cm=pnCampo(fonte,campo); if (!cm) return true; var Lf=pref==='a'?(c.filtros=c.filtros||[]):(c.b.filtros=c.b.filtros||[]);
      if (cm.tipo==='num'){ var vv=(document.querySelector('[data-pnfv="'+pref+'"]')||{}).value; if (vv===''||vv==null) return true; Lf.push({campo:campo, op:(document.querySelector('[data-pnfop="'+pref+'"]')||{}).value||'>=', v:+vv}); }
      else { var sel=[].slice.call((document.querySelector('[data-pnfvals="'+pref+'"]')||{}).selectedOptions||[]).map(function(o){ return o.value; }); if (!sel.length){ toast('Escolha ao menos um valor'); return true; } Lf.push({campo:campo, vals:sel}); }
      state.pnFC[pref]=''; renderPn(); return true; }
    if (t.dataset.pnfdel){ var z=t.dataset.pnfdel.split('|'), Lx=z[0]==='a'?c.filtros:c.b.filtros; Lx.splice(+z[1],1); renderPn(); return true; }
    if (t.dataset.pnmadd){ var mm=($('pnMMes')||{}).value, tx=String(($('pnMTxt')||{}).value||'').trim(); if (!mm){ toast('Escolha o mês do marco'); return true; } (c.marcos=c.marcos||[]).push({mes:mm, txt:tx||'marco'}); renderPn(); return true; }
    if (t.dataset.pnmdel!=null){ c.marcos.splice(+t.dataset.pnmdel,1); renderPn(); return true; }
    return false; }

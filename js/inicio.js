/* Painel SGQ · CRCO — js/inicio.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/inicio.js']='0.22.1';
  // 0.12.0: confere logo de saída se todos os arquivos do painel vieram da mesma entrega
  var ARQUIVOS_APP=["js/nucleo.js", "js/prazos.js", "js/inconformidades.js", "js/relatorios.js", "js/kpis.js", "js/atendimento.js", "js/ficha.js", "js/configuracao.js", "js/tri7.js", "js/serventias.js", "js/dados.js", "js/graficos.js", "js/desempenho.js", "js/trabalho.js", "js/visual.js", "js/certidoes.js", "js/importar.js", "js/saude.js", "js/equipe.js", "js/catalogo.js", "js/aprendizagem.js", "js/construtor.js", "js/navegacao.js", "js/inicio.js"];
  try{ checarVersoes('0.22.1'); }catch(e){ var avv=document.getElementById('avisoVersao'); if (avv){ avv.hidden=false; avv.textContent='Faltam arquivos do painel ou eles são de versões diferentes. Suba de novo todos os arquivos da entrega e recarregue a página.'; } }
  var $=function(id){ return document.getElementById(id); };
  var TEMAS={auto:['◐ Auto','Tema: automático (segue o computador)'],claro:['☀ Claro','Tema: claro'],escuro:['☾ Escuro','Tema: escuro']};
  var temaAtual=temaAplicar(prefLer('crco-tema')||'auto');
  if (prefLer('crco-menu')==='recolhido') menuRecolher(true);
  temaAplicar(temaAtual);
  var state={ docs:{}, extras:[], arquivos:{prazo:[],etapa:[],demanda:[],inconf:[],tri7:[],andam:[]}, nomes:{prazo:[],etapa:[],demanda:[],inconf:[],tri7:[],andam:[]}, andam:{}, andIdx:null, usr:{}, usrAuto:{}, resAnd:null, serv:{}, impFeito:{}, prazosServ:{}, sv:'RI', svSub:{}, srvNat:null, kpiCat:null, lancEdit:false,
    resultado:null, periodo:'todos', aba:'geral', natSel:null, sortNat:{k:'total',d:-1}, filtroFora:false, busca:'', natBusca:'', natTodas:false, just:{}, aval:{}, filtroEx:'pend', avDraft:{}, buscaEx:'', inconf:{}, incCat:{}, eqOcl:{}, eqMin:10, apr:{}, pn:{}, pnSel:null, pnEd:null, pnFC:{}, incSetor:'ri' /* 0.13.0: o setor segue a Serventia do topo (RI = só RI; Todas = todas) */, incFiltroCat:null, incFiltroPessoa:null, cert:{}, cfg:{expIni:8, expFim:17, intim:null}, relSel:'__geral', feedback:{}, kp:{}, k9:{}, lancMes:null, lancTodos:false, atPessoa:null, logs:{}, logCache:{}, protSel:null, protTxt:'', senhas:{}, trab:{}, trabVer:0, desVis:null, atMes:'todos', atMet:'esp', atTodosDias:false };
  var db=null, dbPronto=false, podeEscrever=true;

  var MOTIVOS={C:'Cancelado (status)',P:'Cancelamento de Protocolo',O:'ONR – recibo de cancelamento',D:'ONR – nota de devolução, sem registro',A:'Re-análise sem registro (caducou)',F:'Ofício de Cancelamento',X:'Devolução do depósito prévio',T:'Cancelado no Tri7 (desistência ou impossibilidade)'};
  var MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  var MOT_JUST={geo:'Georreferenciamento – notificação de confrontantes',sobrestado:'Sobrestado a pedido do interessado',duvida:'Suscitação de dúvida (Art. 198)',judicial:'Aguardando ordem judicial ou administrativa',outro:'Outro motivo'};

  // ——— estatística honesta: distribuição (média, mediana, moda, quartis, P90) e testes de probabilidade
  var MIN_N=10;
  var LF=[0,0];

  // ——— render
  // 1.10.1: só a página visível é desenhada; as outras ficam marcadas e são desenhadas quando abertas
  var renderPend=null;
  var FOCO=function(sel){ return !!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest(sel)); };
  var COLS=[['nat','Natureza'],['total','Atos'],['kpi','KPI-02'],['medB','Bruto · mediana / média'],['medL','Líquido · mediana / média'],['iqr','Faixa típica · bruto'],['mEsp','Espera média'],['canc','Cancelados']];
  var MIN_ATOS=10;
  var AV={'':'Pendente',conforme:'Conforme – causa do cliente',nc:'Não conforme – falha na qualificação',na:'Não é exigência dupla – lançamento errado'};
  var SIT={R:'Registrado',N:'Cancelado',E:'Abertura + outros',I:'Sem histórico'};

  // ——— KPI-01 · inconformidades
  var MIN_PROD=30;


  // ——— aba Relatórios (o que aparece na tela é o que sai impresso)
  var downloads=null;
  var REL_CSS='@page{size:A4;margin:14mm 12mm}'+
    '.relsheet{--bg:#fff;--surface:#fff;--surface-2:#f1efeb;--line:#e3dfd8;--ink:#2b2926;--ink-2:#5d5952;--ink-3:#6f695f;--brand:#e8590c;--brand-soft:#fde8da;--crit:#b3362f;--good:#1f7a4d;--c1:#2a78d6;--serie:#2f5d8a;--c2:#eb6834;--c3:#1baf7a;--c4:#eda100;--c5:#e87ba4;--c6:#008300;color-scheme:light;-webkit-print-color-adjust:exact;print-color-adjust:exact}.relsheet *{-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
    '.relsheet svg{width:100%;height:auto;display:block}.relsheet svg text{font-family:"Segoe UI",Arial,sans-serif;fill:#5d5952}'+
    '.relsheet .diaria{background:#fde8da;border-radius:8px;padding:10px 12px;font-size:13px;margin:0 0 10px;break-inside:avoid}'+
    '.relsheet .rgraf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.relsheet .rg{border:1px solid #e3dfd8;border-radius:8px;padding:8px 10px;break-inside:avoid;min-width:0}.relsheet .rg.w{grid-column:1/-1}.relsheet .rg b{display:block;font-size:11.5px}.relsheet .rg small{display:block;color:#716a60;font-size:9.5px;margin-bottom:4px}'+
    '.relsheet .hb{display:flex;flex-direction:column;gap:4px}.relsheet .hb-row{display:grid;grid-template-columns:minmax(80px,40%) 1fr auto;gap:6px;align-items:center;font-size:10.5px}.relsheet .hb-n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#5d5952}.relsheet .hb-t{height:9px;background:#f1efeb;border-radius:3px;overflow:hidden}.relsheet .hb-t i{display:block;height:100%}.relsheet .hb-v{text-align:right;font-variant-numeric:tabular-nums}'+
    '.relsheet .leg{display:flex;flex-wrap:wrap;gap:10px;font-size:10px;color:#5d5952;margin-top:3px}.relsheet .leg i,.relsheet .dot{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px}.relsheet .gm-vazio{font-size:10.5px;color:#6f695f;padding:16px 0;text-align:center}'+
    '@media (max-width:640px){.relsheet .rgraf{grid-template-columns:1fr}}'+
    '.relsheet{font-family:"Segoe UI",Arial,sans-serif;color:#2b2926;font-size:11.5px;background:#fff;max-width:860px;margin:0 auto;padding:26px 28px;line-height:1.45}'+
    '.relsheet header{border-bottom:3px solid #FC6506;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;gap:16px;align-items:flex-end;flex-wrap:wrap}'+
    '.relsheet h1{font-size:19px;margin:0 0 3px;color:#2b2926}.relsheet h2{font-size:12px;margin:20px 0 8px;color:#343434;text-transform:uppercase;letter-spacing:.05em;border-left:4px solid #FC6506;padding-left:8px}'+
    '.relsheet .rmeta{color:#716a60;font-size:11px}.relsheet .org{font-weight:700;color:#a8420a;font-size:12px}'+
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
    '.relsheet th,.relsheet td{white-space:normal;overflow-wrap:break-word;padding:4px 4px}.relsheet th{font-size:8.5px;letter-spacing:0}.relsheet td{font-size:10.5px}'+ /* 0.13.0: a tabela cabe na folha */
    '.relsheet .pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:600;background:#eceae6;color:#5d5952;white-space:nowrap}.relsheet .pill.good{background:#e3f3ea;color:#1f7a4d}.relsheet .pill.warn{background:#fbf0d9;color:#8a5a00}'+
    '.relsheet .eq-rp td{vertical-align:middle}.relsheet .eq-q{display:grid;grid-template-columns:minmax(70px,30%) 1fr auto;gap:8px;align-items:center;font-size:11px;margin:5px 0}.relsheet .eq-q div{display:flex;flex-direction:column;gap:2px}.relsheet .eq-q i{display:block;height:8px;border-radius:2px;min-width:1px}'+
    '.relsheet .eq-so{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.relsheet .eq-so div{border:1px solid #e3dfd8;border-left:4px solid #1f7a4d;border-radius:6px;padding:7px 10px;font-size:11px;break-inside:avoid}.relsheet .eq-so b{display:block;font-size:17px}.relsheet .eq-so small{display:block;color:#716a60;font-size:10px}'+
    '.relsheet .dest{display:grid;grid-template-columns:1.3fr 1fr;gap:8px;margin:0 0 8px}.relsheet .dest>div{border:1px solid #e3dfd8;border-radius:8px;padding:8px 12px}.relsheet .dest .t1{border-color:#2f5d8a;background:#f4f7fb}.relsheet .dest span{display:block;color:#716a60;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em}.relsheet .dest b{font-size:22px}.relsheet .dest small{color:#5d5952;font-size:10.5px;margin-left:4px}'+
    '.relsheet .sug{font-size:10px;color:#a8420a;margin-left:6px;text-transform:none;letter-spacing:0}'+
    '.relsheet tr{break-inside:avoid}@media (max-width:640px){.relsheet{padding:16px}.relsheet .tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}';

  // ——— aba Lançar KPIs (cópia campo a campo para o IND-SGQ-001 no ANOREG+)
  var MES_C=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  // valores já lançados no ANOREG+ (IND-SGQ-001, export de 01/10/2026) — base para a tendência
  // KPI-01, KPI-02 e KPI-13 saíram daqui na 1.10.0: o painel calcula pelos dados importados
  // 0.11.0: estes valores agora ficam no banco (kpis/AAAA-MM, campo hist). A tabela abaixo só semeia o banco na primeira abertura de quem grava
  // e serve de reserva enquanto isso não acontece. Para corrigir um mês, digite o valor em Lançar KPIs (o digitado vale mais que o histórico).
  var HIST_SEMENTE={
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
  var histMigrado=false;

  // KPI-09: leitura do Rel. Eventos de Apuração por Período (mesma regra da Calculadora KPI-09)
  var K9_AUS=['Atestado médico','Outros Atestados','Faltas abonadas'], K9_LEG=['Licença maternidade','Licença paternidade','Auxílio-doença (INSS)','Auxilio-doenca (INSS)'],
      K9_JOR=['Horas normais','Home office','Férias','Atestado médico','Outros Atestados','Faltas abonadas','Licença maternidade','Feriado pago'];
  var lancTimer=null;
  var lancPend={};

  // ——— aba Atendimento (VHL · Consulta de senhas) — base do KPI-13 e análise do fluxo
  var DSEM=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var POS_REG=/imprimir ficha|arquivamento|envio de registro|digitalizar selo/;
  var MOTIVOS_N={C:'status CANCELADO no relatório de Suspensos',P:'última etapa: Cancelamento de Protocolo',O:'última etapa: ONR - Envio do Recibo do Protocolo (cancelamento)',D:'última etapa: ONR - Nota de Devolução, sem registro',A:'parou em Re-Análise, sem Revisão Oficial',F:'última etapa: Ofício de Cancelamento',X:'Devolução do Depósito Prévio (fora as etapas de pós-registro)',T:'andamento "Cancelado por Desistência ou Impossibilidade" no Tri7 (o Tri7 decide)'};

  // ——— Tri7 · Relatório de andamentos: quem fez cada andamento (entrada, exigência, revisão, registro)
  // "Usuário" = quem fez o andamento. "Usuário destino" é ignorado. Nada aqui atribui culpa: é só quem registrou o andamento no Tri7.
  var AND_ORD=['PN','PA','RA','RE','NE','CI','AP','SG','RC'];
  var AND_COR={PN:'good',PA:'good',RA:'mute',RE:'warn',NE:'crit',CI:'mute',AP:'mute',SG:'good',RC:'mute'};
  var AND_LEITURA={PN:'entrada (prenotação)',PA:'entrada automática (ONR)',RE:'exigência redigida, foi para revisão',NE:'<b>exigência enviada ao cliente</b>',CI:'<b>custas informadas → espera de pagamento</b>',AP:'<b>aguardando pagamento</b>',RA:'título voltou (re-análise)',SG:'<span class="pill good">selos gerados</span> registro feito',RC:'recebido para entrega'};

  // ——— regra das exigências (VHL × Tri7), aplicada em todos os atos carregados
  // Exigência = Nota de Exigência (Tri7). Parada que o VHL leu como exigência e o Tri7 explica como custas (ONR) = pagamento.
  // Parada que o VHL leu como exigência sem nota nem custas no Tri7 = pagamento (1.10.0).
  var duCalK=null, duCalF=null;
  // ═════════ 0.10.6: Configuração do painel — regras macro com vigência por competência e histórico ═════════
  // Toda mudança vale a partir de uma competência (AAAA-MM), pede motivo e fica no histórico. O padrão é o combinado até a 0.10.5.
  state.apur={itens:{}, simples:{}, hist:[]}; state.apurVer=0; state.cfgEd=null;
  var CFG_DEF={
    'ri.prazoBase':{nome:'Prazo da prenotação (RI)', un:'d.u.', tipo:'num', def:[['0000-00',20]], ajuda:'Art. 205 da Lei 6.015/73. É o limite do KPI-02 quando não há retorno de exigência.'},
    'ri.retornoMais':{nome:'Dias úteis depois do retorno de exigência', un:'d.u.', tipo:'num', def:[['0000-00',5]], ajuda:'Art. 188, §1º, III. Limite = dia útil do retorno + este valor, nunca menos que o prazo da prenotação.'},
    'ri.retornoComprovado':{nome:'Reingresso só com retorno comprovado', tipo:'bool', def:[['0000-00',false],['2026-10',true]], ajuda:'Sim: Re-análise (Tri7) só conta depois de Nota de Exigência, ou a etapa Re-Análise do VHL; sem retorno, vale o prazo da prenotação. Não: regra antiga (Revisão de Exigência e Demanda também indicam reingresso; sem data, prazo + dias depois do retorno).'},
    'ri.registroSelo':{nome:'Selos Gerados antes da Revisão Oficial vira a data do registro', tipo:'bool', def:[['0000-00',true]], ajuda:'Sim: quando o Selos Gerados do Tri7 sai antes da última Revisão Oficial do VHL, vale a data do selo (a Revisão posterior é só o fechamento do fluxo).'},
    'ri.cancelTri7':{nome:'Cancelamento decidido pelo Tri7', tipo:'bool', def:[['0000-00',true]], ajuda:'Sim: Cancelado, Cancelado por Decurso de Prazo ou Cancelado por Desistência ou Impossibilidade no protocolo = cancelado, mesmo com Selos Gerados (o selo é da baixa).'}
  };
  var CFG_SIMPLES={
    'pend.marco':{nome:'Justificativas e avaliações obrigatórias a partir de', tipo:'mes', def:'2026-09', ajuda:'Fora do prazo sem motivo e títulos com indício de dupla exigência sem avaliação viram pendência a partir desta competência. Antes dela são opcionais.'},
    'amostra.min':{nome:'Amostra pequena: menos de', un:'documentos', tipo:'num', def:30, ajuda:'Abaixo disso o "no prazo" aparece como amostra pequena e sem destaque.'}
  };
  // 0.21.0: regra de eficácia da Aprendizagem (editável; vale na hora e fica no histórico)
  CFG_SIMPLES['apr.limite']={nome:'Aprendizagem · limite de inconformidade', un:'%', tipo:'num', def:10, ajuda:'Taxa de inconformidade relacionada ao POP (÷ atos no escopo) até este valor = o painel sugere Apto. Acima = Não apto. A decisão é do Gestor da Qualidade.'};
  CFG_SIMPLES['apr.janela']={nome:'Aprendizagem · janela de referência', un:'meses', tipo:'num', def:3, ajuda:'Período contado a partir do treinamento. É referência: o Gestor da Qualidade pode concluir antes ou depois.'};
  CFG_SIMPLES['apr.minMeses']={nome:'Aprendizagem · mínimo de atos = volume de', un:'mês(es)', tipo:'num', def:1, ajuda:'O mínimo de cada POP é o que uma pessoa costuma fazer no escopo neste número de meses (mediana de quem faz 80% do volume do escopo), entre o piso e o teto.'};
  CFG_SIMPLES['apr.piso']={nome:'Aprendizagem · piso do mínimo', un:'atos', tipo:'num', def:10, ajuda:'Abaixo disso a amostra não sustenta a conclusão (1 erro em 10 atos já é 10%).'};
  CFG_SIMPLES['apr.teto']={nome:'Aprendizagem · teto do mínimo', un:'atos', tipo:'num', def:30, ajuda:'Acima disso mais atos quase não mudam a confiança, então não precisa esperar.'};
  CFG_SIMPLES['apr.refMeses']={nome:'Aprendizagem · histórico para o mínimo', un:'meses', tipo:'num', def:12, ajuda:'Meses fechados usados para calcular o volume típico de cada POP.'};
  CFG_SIMPLES['apr.expMeses']={nome:'Aprendizagem · período do Apto por experiência', un:'meses', tipo:'num', def:6, ajuda:'Meses fechados avaliados na carga inicial (ISO 9001 7.2 b).'};
  state.popsCfg={map:{}}; state.popsVer=0; state.popEd=null; state.popNovo=false; state.aprDraft={}; state.aprExp=null;
  var MARCO_RET='2026-10';

  // ——— Outras atribuições (RC, RTD, RPJ, Intimações, Malote Digital, Arquivo…): Prazo e Tempo Médio + Produção por Etapa do VHL
  // Prazo legal de cada natureza é configurável (config/prazos). Sem prazo definido, o painel mostra só os tempos.
  // prazos legais pré-preenchidos (só os com base expressa; o resto você define na tela). Valor em dias úteis.
  var PRAZOS_PADRAO={'RC|CRC - Certidão Outros Cartórios':5,'RC|CRC - Certidão CRCO':5,'RC|Casamento Religioso C. E. Civil':1,'Certidão - RTD|Inteiro teor / Breve Relato (RTD)':5};
  var PRAZOS_BASE={'RC|CRC - Certidão Outros Cartórios':'5 dias úteis após o pagamento · Prov. CNJ 149/2023, arts. 239 e 240','RC|CRC - Certidão CRCO':'Até 5 dias · Lei 6.015/73, art. 19','RC|Casamento Religioso C. E. Civil':'Registro em 24 horas da entrada do requerimento · Lei 6.015/73, art. 73 §2º','Certidão - RTD|Inteiro teor / Breve Relato (RTD)':'5 dias úteis · Lei 6.015/73, art. 19 c/c art. 9º §1º',
    'RC|Casamento Civil':'Certificado de habilitação em até 5 dias após a documentação em ordem (Lei 6.015, art. 67 §1º); o tempo total inclui proclamas e a data marcada pelos noivos — sem prazo único','RC|Averbações/Anotações - Casamento':'Anotação/comunicação em 5 dias (Lei 6.015, art. 106); averbação sem prazo próprio','RC|Averbações/Anotações - Nascimento':'Anotação/comunicação em 5 dias (Lei 6.015, art. 106); averbação sem prazo próprio','RC|Averbações/Anotações - Óbito':'Anotação/comunicação em 5 dias (Lei 6.015, art. 106); averbação sem prazo próprio','RC|Nascimento':'Sem prazo federal específico: o assento é lavrado na declaração; envio à CRC em 1 dia útil (Prov. 149, art. 234)','RC|Obito':'Sem prazo federal específico; envio à CRC em 1 dia útil (Prov. 149, art. 234)'};
  var SERV_ORD=['RC','RTD','RPJ','Certidão - RTD','Intimações','Malote Digital','Arquivo','Fichas'];
  var duServK=null, duServF=null;
  // ——— filtro "Serventia": o site inteiro como se o cartório fosse só RI, só RC, só RTD/PJ… ou tudo junto
  var SV_LISTA=['__todas','RI','RC','RTD/PJ']; // Malote e Arquivo não são produção de serventia (Malote vira só contagem no comparativo)
  var SV_NOME={'RI-bal':'↳ RI · balcão','RI-cen':'↳ RI · central (ONR)','RI-intim':'↳ RI · Intimações','__todas':'Todas as serventias','RI':'RI · Registro de Imóveis','RC':'RC · Registro Civil','RTD/PJ':'RTD/PJ · Títulos e Documentos e Pessoas Jurídicas','Apoio':'Apoio · Malote e Arquivo'};
  var SV_SUB={'RI':[['reg','Registro (protocolos)'],['intim','Intimações'],['cert','Certidões']], 'RC':[['tudo','Tudo'],['atos','Registros e averbações'],['cert','Certidões']], 'RTD/PJ':[['tudo','Tudo'],['atos','Registros'],['cert','Certidões']], 'Apoio':[['tudo','Tudo'],['Malote Digital','Malote Digital'],['Arquivo','Arquivo']]};
  var SV_COR={'RI-bal':'#ff922b','RI-cen':'#d9480f','RI':'var(--brand)','RI-intim':'#f59f00','RC':'#1c7ed6','RTD/PJ':'#2f9e44','Apoio':'#9c36b5'};
  var SO_RI=['ex','nao','cer','tri'], SO_SERV=['nat','eta','fp'];
  var FILA_SV={'registro de imoveis':'RI','nascimento':'RC','casamento civil':'RC','obito':'RC','registro de titulos e documentos, pj':'RTD/PJ'};

  // ——— catálogo de KPIs editável (config/kpis): nome, meta, sentido, frequência, visibilidade, ordem e KPIs novos
  var KPIS_PADRAO=null;

  // ——— versão, dados brutos, recálculo, backup e memória de cálculo (site no GitHub + Supabase)
  var APP_VERSAO='0.22.1';
  // 0.11.0: a biblioteca de planilhas (≈310 KB) só é baixada quando precisa — importar, recalcular ou baixar a memória de cálculo
  var XLSX_URL='xlsx.full.min.js?v=0.20.3', XLSX_SRI='sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT', xlsxProm=null;
  var BRUTO_COLS={prazo:['tipo de documento','codigo','natureza','ingresso','finalizacao','prazo','tempo'], etapa:['codigo','data execucao','etapa','responsavel','prazo'], demanda:['codigo','status']};

  // ——— Painel geral: comparação mês a mês de todos os indicadores (pequenos gráficos lado a lado)
  var MES_AB=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  // ═════════ drill-down: todo elemento de gráfico leva ao dado de origem (v1.9) ═════════
  // goAttr(ação) devolve os atributos data-go/data-goh; o clique é tratado em goExec. Ações:
  //   {t:'nat', nat, key?}  natureza (key = "tipo|natureza" nas outras atribuições) → Por natureza com ela aberta
  //   {t:'mes', m, aba}     muda o Período para o mês e abre a página
  //   {t:'lista', titulo, tipo, itens}  lista abaixo do gráfico (tipo: atos, docs, inc, senhas, cert, cods)
  //   {t:'pessoa', nome}    relatório individual        {t:'prot', c}  ficha do protocolo
  //   {t:'des', k}          desempenho da pessoa        {t:'sv', sv, m?}  só aquela serventia
  var GO={}, goN=0;
  var LISTA_COLS={
    atos:[['Código',function(a){ return protLink(a.c); }],['Natureza',function(a){ return esc(a.nat); },'tl'],['Ingresso',function(a){ return fmtData(a.ing); }],['Registro / saída',function(a){ return fmtData(a.reg||a.fin); }],['Dias úteis',function(a){ return a.bruto==null?'—':a.bruto; }],['Limite',function(a){ return a.cat==='R'?a.lim:'—'; }],['Exigências',function(a){ return a.nex||''; }],['Situação',sitAto]],
    docs:[['Código',function(d){ return protLink(d.c); }],['Tipo',function(d){ return esc(d.t); }],['Natureza',function(d){ return esc(d.nat); },'tl'],['Ingresso',function(d){ return fmtData(Motor.isoDeDia(d.ing)); }],['Finalização',function(d){ return fmtData(Motor.isoDeDia(d.fin)); }],['Dias úteis',function(d){ return servDu(d); }],['Prazo',function(d){ var p=servPrazo(d); return p==null?'—':p; }],['Situação',function(d){ var ok=servOk(d); return ok==null?'':ok?'<span class="pill good">no prazo</span>':'<span class="pill crit">acima</span>'; }]],
    inc:[['Data',function(r){ return fmtData(r.d); }],['Documento',function(r){ return protLink(r.c)+' <span class="mut">'+esc(r.t)+'</span>'; }],['Pessoa',function(r){ return esc(r.r); },'tl'],['Tipo',function(r){ return grupoDe(r)==='E'?'<span class="pill crit">Externo</span>':'Interno'; }],['Erro',function(r){ return esc(catDe(r)); },'tl'],['Observação',function(r){ return esc(r.o); },'tl obs']],
    senhas:[['Dia',function(s){ return fmtData(s.dia); }],['Emissão',function(s){ return hhmm(s.g); }],['Chamada',function(s){ return hhmm(s.c); }],['Fila',function(s){ return esc(s.fila)+(s.pri?' <span class="pill warn">prioritária</span>':''); },'tl'],['Espera',function(s){ return fmtMS(s.e); }],['Atendimento',function(s){ return fmtMS(s.t); }],['Atendente',function(s){ return esc(s.at||'—'); },'tl']],
    cert:[['Pedido',function(c){ return esc(c.p); }],['Origem',function(c){ return esc(c.origem); }],['Tipo',function(c){ return esc(c.tipo); },'tl'],['Entrada',function(c){ return fmtMin(c.i); }],['Conclusão',function(c){ return fmtMin(c.f); }],['Horas úteis',function(c){ return fmtH(c.hu); }],['Prazo',function(c){ return c.intim?'<span class="mut">intimação</span>':fmtLim(c.lim)+' '+(c.ok?'<span class="pill good">ok</span>':'<span class="pill crit">acima</span>'); }],['Gerou o selo',function(c){ return esc(c.u||'—'); },'tl']],
    cods:[['Pedido',function(x){ return esc(x); }]],
    prots:[['Protocolo',function(x){ return protLink(x); }]]
  };
  // ordem da lista: os casos mais demorados primeiro (inconformidades: as mais recentes)
  var LISTA_ORD={atos:function(a){ return a.bruto==null?-1:a.bruto; }, docs:function(d){ return servDu(d); }, senhas:function(x){ return x.e==null?-1:x.e; }, cert:function(c){ return c.hu; }};

  // ═════════ gráficos reutilizáveis (SVG puro; dica ao passar o mouse/tocar via data-tip) ═════════
  var CAT=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  var DES_MIN_DIF=0.2;

  // ═════════ v1.9: visão "Visual" de cada página (chave Tabela | Visual no título) ═════════
  var VIS_DICA='<p class="vis-dica">Clique (ou toque duas vezes) em barra, fatia, coluna, ponto ou mês para ir ao dado de origem. Segue a Serventia e o Período do topo.</p>';

  // ═════════ v1.9.1: painel de naturezas — juntar, comparar e grupos salvos (Por natureza → Visual) ═════════
  // Grupo salvo (config/naturezas): {id, nome, nats:[nomes originais], ativo}. Grupo ativo substitui os nomes originais nas outras páginas;
  // o nome original fica em a.natOrig (balcão × central, memória de cálculo e registros salvos continuam pelo original). Reversível.
  state.nx={sel:[], modo:'juntar', busca:''}; state.natGr={grupos:[]}; state._grM={}; state.grVer=0;

  // ——— aba Certidões
  var INTIM_RX=/diligencia|decurso|intimac|edital|publicac|notificac/;
  var INTIM_NAT=/intimac/;

  // ——— importar dados: um lugar só. O painel reconhece cada planilha, junta com o que já tem e recalcula tudo (RI e demais serventias)
  var IMP_TIPOS=[['prazo','chipPrazo','PAINEL-01 · Prazo e Tempo Médio'],['etapa','chipEtapa','PAINEL-02 · Produção por Etapa'],['demanda','chipDemanda','PAINEL-03 · Demanda suspensa'],['inconf','chipInconf','PAINEL-04 · Inconformidades'],['andam','chipAndam','Tri7 · Relatório de andamentos'],['tri7','chipTri7','Andamentos (Tri7) · antiga']];
  // ——— excluir os dados de um mês (arquiva no banco; dá para voltar com um backup)
  var EXC_GRUPOS=[
    ['ri','Prazos do RI (resultado e linha do tempo)',function(m){ return state.docs[m]?state.docs[m].atos.length+' atos':null; },[['meses'],['logs']],true],
    ['serv','RC, RTD/PJ, intimações e malote',function(m){ return state.serv[m]?state.serv[m].length+' documentos':null; },[['serv']],true],
    ['brutos','Dados brutos do VHL (Prazo e Produção por Etapa) — sem isso o mês volta no próximo recálculo',function(m){ return 'prazo e etapas'; },[['brutos','prazo-'],['brutos','etapa-']],true],
    ['inconf','Inconformidades',function(m){ return state.inconf[m]?state.inconf[m].length+' registros':null; },[['inconf']],true],
    ['cert','Certidões',function(m){ return state.cert[m]?state.cert[m].recs.length+' certidões':null; },[['cert']],true],
    ['andam','Andamentos do Tri7',function(m){ return state.andam[m]?state.andam[m].length+' andamentos':null; },[['andam']],true],
    ['senhas','Senhas',function(m){ return state.senhas[m]?state.senhas[m].L.length+' senhas':null; },[['senhas']],true],
    ['trab','Tempo de trabalho (Desempenho Usuário)',function(m){ return state.trab[m]?Object.keys(state.trab[m].p).length+' pessoas':null; },[['trab']],true],
    ['k9','KPI-09 (Rel. Eventos)',function(m){ return state.k9[m]?state.k9[m].headcount+' colaboradores':null; },[['kpi09']],true],
    ['kp','Lançamentos de KPIs que você digitou',function(m){ return state.kp[m]?'valores e análises':null; },[['kpis']],false]];

  // 0.10.7: calendário do ano — mostra exatamente o que o cálculo usa como dia não útil; clique num dia útil marca feriado local, clique num feriado nacional marca "funcionou neste dia"
  state.calAno=new Date().getFullYear();

  // ——— eventos
  $('selMes').addEventListener('change',function(e){ if (e.target.value==='__ant'){ e.target.value=state.periodo; toast('Carregando meses anteriores…'); window.nuvem.carregarAnteriores().then(function(n){ toast(n?'Meses anteriores carregados':'Não há meses anteriores no banco'); }).catch(function(x){ toast('Não consegui carregar: '+x.message); }); return; } state.periodoEscolhido=true; state.periodo=e.target.value; if (state.periodo!=='todos') state.lancMes=state.periodo; render(); });
  var drop=$('drop'), fin=$('fileIn');
  drop.addEventListener('click',function(){ fin.click(); });
  drop.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fin.click(); } });
  fin.addEventListener('change',function(){ if(fin.files.length) receber(fin.files); fin.value=''; });
  ['dragenter','dragover'].forEach(function(t){ drop.addEventListener(t,function(e){ e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave','drop'].forEach(function(t){ drop.addEventListener(t,function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop',function(e){ if(e.dataTransfer.files.length) receber(e.dataTransfer.files); });
  if ($('ferAdd')) $('ferAdd').addEventListener('click',function(){ var v=$('ferData').value; if(!v) return; if(state.extras.indexOf(v)<0){ state.extras.push(v); apurLog('Feriado local','—',fmtData(v),'imediato',''); apurSalvar(); } $('ferData').value=''; salvarFeriados(); });
  document.addEventListener('click',function(e){
    var t=e.target;
    if (t.dataset && t.dataset.metall!=null){ document.querySelectorAll('#tabMet details.met-sec').forEach(function(d){ d.open=t.dataset.metall==='1'; }); return; }
    if (t.dataset && t.dataset.metgo!=null){ var dm=document.getElementById('met-'+t.dataset.metgo); if (dm){ dm.open=true; dm.scrollIntoView({block:'start'}); } return; }
    var ls=t.closest&&t.closest('[data-lancsel]'); if (ls){ state.lancSel=ls.dataset.lancsel; document.querySelectorAll('.lc-it').forEach(function(b){ b.classList.toggle('on',b===ls); }); document.querySelectorAll('.lc-cards .lc-card').forEach(function(c){ c.classList.toggle('lc-on',c.dataset.kpi===state.lancSel); }); return; } // 0.13.0
    if (t.dataset && (t.dataset.cfged||t.dataset.cfgcancel||t.dataset.cfgsalvar||t.dataset.cfgpadrao) && cfgClique(t)) return;
    if (t.dataset && (t.dataset.fnsalvar||t.dataset.fndescartar) && fnClique(t)) return;
    if (t.closest && t.closest('#tabApr') && t.dataset && aprClique(t)) return;
    if (t.closest && t.closest('#tabCfg') && t.dataset && popClique(t)) return;
    if (t.closest && t.closest('[data-poplista]')){ var pl=t.closest('[data-poplista]'), pc=document.querySelector('[data-popcont="'+pl.dataset.poplista+'"]'); if (pc) pc.textContent=pl.querySelectorAll('input:checked').length+' marcada(s)'; }
    if (t.closest && t.closest('#tabPn') && t.dataset && pnClique(t)) return;
    if (t.dataset && t.dataset.eqsetor!=null){ state.eqSetor=t.dataset.eqsetor||''; state.eqFn=null; state.eqNat=null; state.eqAud=null; return renderEqp(); }
    if (t.dataset && t.dataset.cfgir){ state.cfgEd=t.dataset.cfgir==='cal'?null:t.dataset.cfgir; irAba('cfg'); if (t.dataset.cfgir==='cal'){ var c=$('cfgCal'); if (c&&c.scrollIntoView) c.scrollIntoView({block:'start'}); } return; }
    if (t.id==='btnSalvar') return salvar();
    if (t.id==='btnVoltar') return goVoltar();
    if (t.dataset && t.dataset.golvoltar){ var gx=$('goLista'); if (gx) gx.remove(); if (state.goAnc&&state.goAnc.scrollIntoView) state.goAnc.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    if (t.dataset && t.dataset.golfechar){ var gx2=$('goLista'); if (gx2) gx2.remove(); return; }
    if (t.dataset && t.dataset.golcopiar){ var GA=state.goListaAtual; if (GA) copiarTexto(GA.itens.map(function(x){ return goCodigo(GA.tipo,x); }).filter(function(x){ return x!=null; }).join('\n'), t); return; }
    if (t.dataset && t.dataset.pv!=null) return pgVisDef(state.aba, t.dataset.pv==='1');
    var gel=t.closest&&t.closest('[data-go]'); if (gel){ if (toqueSoDica(gel)) return; return goExec(gel); }
    if (t.id==='btnVis'){ if (state.aba==='vis') return irAba(state.abaAntVis||'geral'); if (PG_VIS[state.aba]) return pgVisDef(state.aba,!state.pgVis[state.aba]); state.abaAntVis=state.aba; return irAba('vis'); } // 1.10.4: um só botão — nas páginas com visual próprio ele liga/desliga o visual da página
    if (t.dataset && t.dataset.desvis){ state.desVis=t.dataset.desvis; return renderDes(); } // 0.22.1
    var tre=t.closest&&t.closest('tr[data-tret]'); if (tre){ state.trEtSel=state.trEtSel===tre.dataset.tret?null:tre.dataset.tret; return renderDes(); }
    if (t.dataset && t.dataset.trsetor){ state.trSetor=t.dataset.trsetor; return renderDes(); }
    if (t.dataset && t.dataset.tretall){ state.trEtTodas=!state.trEtTodas; return renderDes(); }
    var trp=t.closest&&t.closest('tr[data-trpes]'); if (trp){ state.trPes=state.trPes===trp.dataset.trpes?null:trp.dataset.trpes; return renderDes(); }
    if (t.dataset && t.dataset.trimpok){ state.trImp=null; return trImpResumo(); }
    if (t.dataset && t.dataset.trir){ state.desVis='trab'; return irAba('des'); }
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
    if (t.id==='memBtn'){ var mb=t, mt=mb.textContent; mb.disabled=true; mb.textContent='Preparando…'; return precisaXLSX().then(function(){ baixarMemoria(state.lancMes); }).catch(function(e){ toast(e.message); }).then(function(){ mb.disabled=false; mb.textContent=mt; }); }
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
    if (t.dataset && t.dataset.incsetor){ state.incSetor=t.dataset.incsetor; renderK1(todosAtos()); return renderRel(); }
    if (t.dataset && t.dataset.eqocultar){ var ko=t.dataset.eqocultar, Qo=eqContar(eqPeriodo()); state.eqOcl=Object.assign({},state.eqOcl||{}); state.eqOcl[ko]=Qo.nomes[ko]||ko; state._pd=null; eqSalvarOcl(); toast((Qo.nomes[ko]||ko)+' oculto(a) desta página'); return renderEqp(); }
    if (t.dataset && t.dataset.eqmostrar){ state.eqOcl=Object.assign({},state.eqOcl||{}); delete state.eqOcl[t.dataset.eqmostrar]; state._pd=null; eqSalvarOcl(); if (!Object.keys(state.eqOcl).length) state.eqVerOcl=false; return renderEqp(); }
    if (t.dataset && t.dataset.eqaudk){ var Qa=eqContar(eqPeriodo()), ka=t.dataset.eqaudk, fa=t.dataset.eqaudfn||null; state.eqAud=(state.eqAud&&state.eqAud.k===ka&&state.eqAud.fn===fa)?null:{k:ka, fn:fa, nat:null, nome:Qa.nomes[ka]||ka}; state.eqAudLim=100; renderEqp(); var ea=$('eqAud'); if (ea) ea.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (t.dataset && t.dataset.eqaudfechar){ state.eqAud=null; return renderEqp(); }
    if (t.dataset && t.dataset.eqaudmais){ state.eqAudLim=(state.eqAudLim||100)+100; return renderEqp(); }
    if (t.dataset && t.dataset.eqaudxls){ return eqAudXls(); }
    if (t.dataset && t.dataset.eqexp){ state.eqExp=Object.assign({},state.eqExp||{}); state.eqExp[t.dataset.eqexp]=!state.eqExp[t.dataset.eqexp]; return renderEqp(); }
    if (t.dataset && t.dataset.eqcarga){ state.eqCarga=!state.eqCarga; renderEqp(); var eg=$('eqCarga'); if (eg&&state.eqCarga) eg.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (t.dataset && t.dataset.eqcob){ state.eqCob=!state.eqCob; renderEqp(); var ec=$('eqCob'); if (ec&&state.eqCob) ec.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (t.dataset && t.dataset.eqocl){ state.eqVerOcl=!state.eqVerOcl; return renderEqp(); }
    if (t.dataset && t.dataset.eqtodasfn){ state.eqTodasFn=!state.eqTodasFn; return renderEqp(); }
    if (t.dataset && t.dataset.eqfn){ state.eqFn=t.dataset.eqfn; state.eqNat=null; renderEqp(); var sf=$('eqFnSel'); if (sf) sf.closest('.panel').scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (t.id==='btnHist') return renderHist();
    if (t.dataset && t.dataset.hvdesfazer!=null) return hvDesfazer(+t.dataset.hvdesfazer);
    if (t.dataset && t.dataset.goSau){ return irAba('sau'); }
    if (t.dataset && t.dataset.carregarAnt){ t.disabled=true; t.textContent='Carregando…'; window.nuvem.carregarAnteriores().then(function(n){ toast(n?'Carreguei '+n+' registro(s) dos meses anteriores':'Não há meses anteriores no banco'); renderSau(); renderSelect(); }).catch(function(e){ toast('Não consegui carregar: '+e.message); renderSau(); }); return; }
    if (t.dataset && t.dataset.incmais){ var sc=document.querySelector('#tabK1 .scroll[style*="480"]'), top=sc?sc.scrollTop:0; state.incLim=t.dataset.incmais==='todos'?1e9:(state.incLim||INC_PASSO)+INC_PASSO; renderK1(todosAtos()); var sc2=document.querySelector('#tabK1 .scroll[style*="480"]'); if (sc2) sc2.scrollTop=top; return; }
    if (t.dataset && t.dataset.inclimpar){ state.incFiltroCat=null; state.incFiltroPessoa=null; return renderK1(todosAtos()); }
    var ic=t.closest&&t.closest('[data-inccat]'); if (ic){ state.incFiltroCat = state.incFiltroCat===ic.dataset.inccat?null:ic.dataset.inccat; return renderK1(todosAtos()); }
    var ip=t.closest&&t.closest('tr[data-incpessoa]'); if (ip){ state.incFiltroPessoa = state.incFiltroPessoa===ip.dataset.incpessoa?null:ip.dataset.incpessoa; return renderK1(todosAtos()); }
    if (t.dataset && t.dataset.fex){ state.filtroEx=t.dataset.fex; return renderEx(todosAtos()); }
    if (t.id==='btnLimpar') return limparArquivos();
    if (t.id==='btnExcluirMes') return excluirMes();
    if (t.id==='fecharDet'){ state.natSel=null; return render(); }
    if (t.dataset && t.dataset.calano){ state.calAno+=+t.dataset.calano; return renderFeriados(); }
    if (t.dataset && (t.dataset.calloc||t.dataset.calnac)){ var iso=t.dataset.calloc||t.dataset.calnac, nac=!!t.dataset.calnac, tem=nac?state.extras.indexOf('!'+iso)>=0:state.extras.indexOf(iso)>=0;
      var txt=nac?(tem?'Voltar '+fmtData(iso)+' a ser feriado nacional':'Marcar que o cartório FUNCIONOU em '+fmtData(iso)+' (feriado nacional passa a contar como dia útil)'):(tem?'Tirar o feriado local de '+fmtData(iso):'Marcar '+fmtData(iso)+' como feriado local (dia sem expediente)');
      var mot=window.prompt(txt+'\n\nMotivo (obrigatório — fica no histórico):',''); if (mot==null) return; mot=String(mot).trim(); if (!mot){ toast('Sem motivo, nada foi mudado'); return; }
      var k=nac?'!'+iso:iso; if (tem) state.extras=state.extras.filter(function(x){ return x!==k; }); else state.extras.push(k);
      apurLog(nac?'Feriado nacional (dia trabalhado)':'Feriado local', tem?(nac?'funcionou':'feriado'):(nac?'feriado':'dia útil'), tem?(nac?'feriado':'dia útil'):(nac?'funcionou':'feriado'), fmtData(iso), mot); apurSalvar(); return salvarFeriados(); }
    if (t.dataset && t.dataset.fer){ var fx=t.dataset.fer; state.extras=state.extras.filter(function(d){return d!==fx;}); apurLog('Feriado local',fmtData(fx),'removido','imediato',''); apurSalvar(); return salvarFeriados(); }
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
  state.pgVis=pgVisLer(); // 1.10.4: a chave de dentro da página saiu; o estado aparece no botão do topo
  var TITULOS={des:'Desempenho · ritmo e linha normal',vis:'Gráficos',geral:'Painel geral',nat:'Prazos · por natureza',eta:'Prazos · por etapa',fp:'Prazos · fora do prazo',ex:'Prazos · exigências',nao:'Prazos · cancelados e especiais',k1:'Inconformidades',imp:'Importar dados',cer:'Certidões',at:'Atendimento',rel:'Relatórios por pessoa',tri:'Quem fez · Tri7',lanc:'Lançar KPIs no ANOREG+',met:'Como é calculado',cfg:'Configuração do painel',sau:'Saúde dos dados',eqp:'Equipe e funções',apr:'Aprendizagem · eficácia da capacitação',pn:'Meus painéis'};
  document.addEventListener('change',function(e){
    var t=e.target; if (avRascunho(t)) return;
    if (t.closest && t.closest('#tabApr') && aprMudou(t)) return;
    if (t.closest && t.closest('#tabPn') && pnEdMudou(t)) return;
    if (t.dataset && (t.dataset.fnraw!=null||t.dataset.fnoc!=null||t.dataset.fnsetor!=null||t.id==='fnBusca') && fnMudou(t)) return;
    if (t.id==='eqSem'){ state.eqSem=t.value||''; return renderEqp(); }
    if (t.id==='eqAudNat'){ state.eqAud.nat=t.value||null; state.eqAudLim=100; return renderEqp(); }
    if (t.id==='eqMin'){ state.eqMin=+t.value; return renderEqp(); }
    if (t.id==='eqFnSel'){ state.eqFn=t.value; state.eqNat=null; return renderEqp(); }
    if (t.id==='eqNatSel'){ state.eqNat=t.value; return renderEqp(); }
    if (t.id==='hvTudo'){ state.hvTudo=t.checked; return renderHist(); }
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
    if (t.id==='expIni'||t.id==='expFim'){ var a=Math.max(0,Math.min(23,parseInt($('expIni').value,10)||8)), b=Math.max(a+1,Math.min(24,parseInt($('expFim').value,10)||17)); var ant=state.cfg.expIni+'h–'+state.cfg.expFim+'h'; state.cfg.expIni=a; state.cfg.expFim=b; if (ant!==a+'h–'+b+'h'){ apurLog('Expediente das certidões',ant,a+'h–'+b+'h','imediato',''); apurSalvar(); } salvarCfg(); return renderCer(); } if (!(t.dataset && (t.dataset.inccatsel||t.dataset.incgsel))) return;
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
  if (!window.claude || !window.claude.use){ avisar('Não consegui conectar ao banco de dados.'); } else { // 0.12.0: era um return dentro da função única
  Promise.resolve(window.claude.use('downloads')).then(function(d){ downloads=d; }).catch(function(){});
  Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(r){
    db=r[0]; var user=r[1];
    if (!db){ avisar('Banco de dados indisponível nesta visualização — os resultados não ficam salvos.'); return; }
    dbPronto=true; renderBackupInfo(); if ($('appVersao')) $('appVersao').textContent=APP_VERSAO;
    if (user && user.can){ Promise.resolve(user.can('data.write')).then(function(v){ if(v===false){ podeEscrever=false; $('tabImp').hidden=true; $('grpDados').hidden=true; if ($('tabEqpBtn')) $('tabEqpBtn').hidden=true; if ($('tabAprBtn')) $('tabAprBtn').hidden=true; if (state.aba==='imp') irAba('geral'); avisar('Você está vendo em modo leitura.'); render(); } }); }
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
    db.doc('config/apuracao').get().then(function(s){ if (s.exists){ var c=s.data()||{}; state.apur={itens:c.itens||{}, simples:c.simples||{}, hist:c.hist||[]}; state.apurVer++; agendarRender(); } }).catch(function(){});
    db.doc('config/geral').get().then(function(s){ if(s.exists){ var c=s.data(); state.extras=(c.feriadosExtras||[]).slice(); if (c.expIni!=null) state.cfg.expIni=c.expIni; if (c.expFim!=null) state.cfg.expFim=c.expFim; if (c.intim) state.cfg.intim=c.intim.slice(); renderFeriados(); agendarRender(); } }).catch(function(){});
    db.collection('logs').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows!=null){ state.logs[d.id]=x; delete state.logCache[d.id]; } }); if (state.protSel) fichaProtocolo(state.protSel); }, function(){});
    db.collection('trab').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.p) state.trab[x.mes||d.id]=trDecodificar(x); }); state.trabVer=(state.trabVer||0)+1; state._trB=null; agendarRender(); }, function(){});
    db.collection('senhas').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows) state.senhas[d.id]=senhasDecod(x); }); agendarRender(); }, function(){});
    db.collection('kpis').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x) state.kp[d.id]={mes:d.id,v:x.v||{},lanc:x.lanc||{},hist:x.hist||null}; }); if (state.aba==='lanc') agendarRender(); setTimeout(histMigrar,2500); }, function(){});
    db.collection('kpi09').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.pessoas) state.k9[d.id]=x; }); if (state.aba==='lanc') agendarRender(); }, function(){});
    db.collection('feedback').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ m[d.id]=d.data(); }); Object.assign(state.feedback,m); if (state.aba==='rel' && !document.activeElement.matches('#tabRel textarea')) renderRel(); }, function(){});
    db.doc('config/usuarios').get().then(function(s){ if (s.exists){ var u=s.data(); state.usr=Object.assign({},u.map||{}); if (state.aba==='tri') renderTri(); } }).catch(function(){});
    db.collection('paineis').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.id) m[d.id]=x; }); state.pn=m; if (state.aba==='pn' && !state.pnEd) renderPn(); }, function(){});
    db.collection('aprendiz').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.id) m[d.id]=x; }); state.apr=m; if (state.aba==='apr') renderApr(); }, function(){});
    db.doc('config/pops').get().then(function(s){ if (s.exists){ var c=s.data()||{}; state.popsCfg={map:c.map||{}}; state.popsVer++; state._popEsc=null; state._aprC=null; if (state.aba==='apr') renderApr(); if (state.aba==='cfg') renderCfg(); } }).catch(function(){});
    db.doc('config/funcoes').get().then(function(s){ if (s.exists){ var c=s.data()||{}; state.fnCfg={map:c.map||{}, setor:c.setor||{}}; state.fnVer=(state.fnVer||0)+1; state._eqX=null; if (state.aba==='eqp') renderEqp(); if (state.aba==='cfg') renderCfg(); } }).catch(function(){});
    db.doc('config/equipe').get().then(function(s){ if (s.exists){ state.eqOcl=Object.assign({},(s.data()||{}).ocultos||{}); state._pd=null; if (state.aba==='eqp') renderEqp(); } }).catch(function(){});
    db.doc('config/prazos').get().then(function(s){ state.prazosServ=Object.assign({},PRAZOS_PADRAO,s.exists?(s.data().map||{}):{}); agendarRender(); }).catch(function(){});
    db.doc('config/naturezas').get().then(function(s){ if (s.exists){ grDefinir(s.data().grupos||[]); agendarRender(); } }).catch(function(){});
    db.doc('config/kpis').get().then(function(s){ if (s.exists){ state.kpiCat=s.data(); catAplicar(state.kpiCat); agendarRender(); } }).catch(function(){});
    db.collection('serv').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows) state.serv[x.mes||d.id]=Motor.decodificarServ(x); }); agendarRender(); if (state.protSel) fichaProtocolo(state.protSel); }, function(){});
    db.collection('andam').onSnapshot(function(snap){ snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.rows) state.andam[x.mes||d.id]=Motor.decodificarAndam(x); }); state.andIdx=null; atualizarAuto(); agendarRender(); if (state.protSel) fichaProtocolo(state.protSel); }, function(){});
    db.collection('cert').onSnapshot(function(snap){ var m={}; snap.docs.forEach(function(d){ var x=d.data(); if (x&&x.recs) m[x.mes||d.id]={raw:x,recs:Motor.decodificarCert(x)}; }); state.cert=m; agendarRender(); }, function(){});
  });
  }
  document.addEventListener('input',function(e){ var t=e.target; if (t.dataset && t.dataset.popbusca!=null) popFiltrar(t); if (t.dataset && t.dataset.aprbusca!=null) aprFiltrar(t); }); // 0.21.1: filtro das listas do catálogo
  // 0.14.0: a nuvem avisa quando descobre (ou carrega) meses anteriores aos 12 da abertura
  window.aoMudarJanela=function(){ renderSelect(); if (state.aba==='sau') renderSau(); };
  // 0.13.0: o menu da conta fecha ao clicar fora
  document.addEventListener('click',function(e){ var u=document.getElementById('umenu'); if (u && u.open && !u.contains(e.target)) u.open=false; });
  // 0.13.0: fundo escuro da ficha lateral; fecha com Esc ou clicando fora
  (function(){ var pb=document.getElementById('protBox'), pf=document.getElementById('protFundo'); if (!pb||!pf) return;
    function fechar(){ state.protSel=null; pb.hidden=true; }
    new MutationObserver(function(){ pf.hidden=pb.hidden; document.body.style.overflow=pb.hidden?'':'hidden'; }).observe(pb,{attributes:true,attributeFilter:['hidden']});
    pf.addEventListener('click',fechar); document.addEventListener('keydown',function(e){ if (e.key==='Escape' && !pb.hidden) fechar(); }); })();

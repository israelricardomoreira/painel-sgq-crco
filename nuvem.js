/* Painel SGQ · CRCO — camada de nuvem (Supabase)
 * Login com senha + código do autenticador (MFA obrigatório), leitura e gravação no banco,
 * downloads. Expõe a mesma interface que o painel já usava (claude.use('db'|'user'|'downloads')),
 * então o restante do código não precisa saber onde os dados ficam.
 * Segurança: quem decide o que cada um pode ler/gravar é o BANCO (Row Level Security em schema.sql),
 * não este arquivo. A chave usada aqui é a pública ("anon"/"publishable"), feita para ficar no site. */
(function(){
  'use strict';
  var CFG = window.CRCO_CONFIG || {};
  var MIN_INATIVO = CFG.minutosInatividade || 30;
  var sb = null, perfil = null, usuario = null;
  var cache = {}, ouvintes = {};
  var resolverPronto, pronto = new Promise(function(r){ resolverPronto = r; });

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function erroBanco(e){ var x=new Error((e&&e.message)||'erro'); x.code=(e&&(e.code==='42501'||/row-level security|permission/i.test(e.message||'')))?'invalid_argument':(e&&e.code)||'erro'; x.original=e; return x; }

  // ——— tela de login ———
  function tela(html){ var t=$('nuvemLogin'); t.innerHTML='<div class="nl-card"><div class="nl-marca"><div class="mark">RI</div><div><b>Painel SGQ · CRCO</b><small>Acesso restrito</small></div></div>'+html+'</div>'; t.hidden=false; var f=t.querySelector('input'); if (f) f.focus(); }
  function msg(t,erro){ var m=$('nlMsg'); if (m){ m.textContent=t||''; m.className='nl-msg'+(erro?' erro':''); } }
  function telaSenha(aviso){
    tela('<form id="nlForm" autocomplete="on"><label>E-mail<input type="email" id="nlEmail" autocomplete="username" required></label>'+
      '<label>Senha<input type="password" id="nlSenha" autocomplete="current-password" required></label>'+
      '<button class="btn primary" type="submit">Entrar</button><p id="nlMsg" class="nl-msg"></p></form>'+
      '<p class="nl-rod">Esqueceu a senha? Peça ao administrador para redefinir no Supabase.</p>');
    if (aviso) msg(aviso,true);
    $('nlForm').addEventListener('submit',function(e){ e.preventDefault(); msg('Entrando…');
      sb.auth.signInWithPassword({email:$('nlEmail').value.trim(), password:$('nlSenha').value}).then(function(r){
        if (r.error){ msg('E-mail ou senha incorretos.',true); return; } usuario=r.data.user; etapaMFA(); }); });
  }
  function telaCodigo(titulo, extra, aoEnviar){
    tela('<form id="nlForm"><p class="nl-tit">'+titulo+'</p>'+(extra||'')+'<label>Código de 6 dígitos do autenticador<input id="nlCod" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>'+
      '<button class="btn primary" type="submit">Confirmar</button><p id="nlMsg" class="nl-msg"></p></form><p class="nl-rod"><button type="button" class="lnk" id="nlSair">Entrar com outra conta</button></p>');
    $('nlForm').addEventListener('submit',function(e){ e.preventDefault(); msg('Verificando…'); aoEnviar($('nlCod').value.trim()); });
    $('nlSair').addEventListener('click',function(){ sb.auth.signOut().then(function(){ telaSenha(); }); });
  }
  function etapaMFA(){
    sb.auth.mfa.getAuthenticatorAssuranceLevel().then(function(r){
      if (r.error){ telaSenha('Não consegui verificar o login. Tente de novo.'); return; }
      if (r.data.currentLevel==='aal2') return carregar();
      return sb.auth.mfa.listFactors().then(function(f){
        var todos=(f.data&&f.data.all)||[], ok=todos.filter(function(x){ return x.factor_type==='totp' && x.status==='verified'; });
        if (ok.length){
          telaCodigo('Verificação em duas etapas', '', function(code){
            sb.auth.mfa.challengeAndVerify({factorId:ok[0].id, code:code}).then(function(v){ if (v.error){ msg('Código inválido ou expirado.',true); return; } carregar(); }); });
          return;
        }
        // primeiro acesso: cadastrar o autenticador (descarta cadastros anteriores não concluídos)
        var pend=todos.filter(function(x){ return x.status!=='verified'; });
        return Promise.all(pend.map(function(x){ return sb.auth.mfa.unenroll({factorId:x.id}); })).then(function(){
          return sb.auth.mfa.enroll({factorType:'totp', friendlyName:'Painel SGQ '+new Date().toISOString().slice(0,10)});
        }).then(function(en){
          if (en.error){ telaSenha('Não consegui iniciar a verificação em duas etapas: '+en.error.message); return; }
          var t=en.data.totp;
          telaCodigo('Primeiro acesso: ative a verificação em duas etapas',
            '<p class="nl-txt">Abra o Google Authenticator (ou Microsoft Authenticator), toque em <b>+</b> e leia o QR code. Depois digite o código que aparecer.</p>'+
            '<div class="nl-qr"><img alt="QR code do autenticador" src="'+esc(t.qr_code)+'"></div><p class="nl-txt">Sem câmera? Digite a chave: <code>'+esc(t.secret)+'</code></p>',
            function(code){ sb.auth.mfa.challengeAndVerify({factorId:en.data.id, code:code}).then(function(v){ if (v.error){ msg('Código inválido. Confira a hora do celular e tente de novo.',true); return; } carregar(); }); });
        });
      });
    });
  }

  // ——— carga inicial ———
  function lerPaginado(montar){
    var tam=500, out=[];
    function pag(i){ return montar().range(i,i+tam-1).then(function(r){ if (r.error) throw erroBanco(r.error); out=out.concat(r.data||[]); return (r.data||[]).length===tam?pag(i+tam):out; }); }
    return pag(0);
  }
  function carregar(){
    tela('<p class="nl-tit">Carregando dados…</p>');
    sb.auth.getUser().then(function(u){ usuario=u.data.user;
      return sb.from('perfis').select('papel,nome').eq('user_id',usuario.id).maybeSingle(); })
    .then(function(p){
      if (p.error || !p.data){ tela('<p class="nl-tit">Acesso não liberado</p><p class="nl-txt">Seu login funcionou, mas este usuário ainda não tem permissão no painel. Peça ao administrador para incluí-lo (tabela <code>perfis</code>).</p><p class="nl-rod"><button type="button" class="lnk" id="nlSair">Sair</button></p>');
        $('nlSair').addEventListener('click',sair); return; }
      perfil=p.data;
      return lerPaginado(function(){ return sb.from('docs').select('colecao,id,dados').eq('arquivado',false).neq('colecao','brutos').order('colecao').order('id'); })
        .then(function(rows){ rows.forEach(function(r){ (cache[r.colecao]=cache[r.colecao]||{})[r.id]=r.dados; });
          $('nuvemLogin').hidden=true; barraUsuario(); vigiarInatividade(); resolverPronto(); });
    }).catch(function(e){ tela('<p class="nl-tit">Não consegui carregar os dados</p><p class="nl-txt">'+esc(e.message)+'</p><p class="nl-rod"><button type="button" class="lnk" id="nlTentar">Tentar de novo</button></p>'); $('nlTentar').addEventListener('click',carregar); });
  }
  function barraUsuario(){
    var ctl=document.querySelector('header.top .ctl'); if (!ctl || $('nlUser')) return;
    var s=document.createElement('span'); s.id='nlUser'; s.className='nl-user';
    s.innerHTML='<span title="'+esc(usuario.email)+'">'+esc(perfil.nome||usuario.email)+' · '+(perfil.papel==='admin'?'administrador':'leitura')+'</span><button class="btn sm" type="button" id="nlBtnSair">Sair</button>';
    ctl.appendChild(s); $('nlBtnSair').addEventListener('click',sair);
  }
  function sair(){ sb.auth.signOut().then(function(){ location.reload(); }); }
  function vigiarInatividade(){
    var t=null; function zera(){ clearTimeout(t); t=setTimeout(function(){ sb.auth.signOut().then(function(){ location.reload(); }); }, MIN_INATIVO*60000); }
    ['click','keydown','mousemove','touchstart','scroll'].forEach(function(ev){ document.addEventListener(ev,zera,{passive:true}); }); zera();
  }

  // ——— interface de dados usada pelo painel ———
  function emitir(col){ var m=cache[col]||{}, snap={docs:Object.keys(m).map(function(id){ return {id:id, data:function(){ return m[id]; }}; })};
    (ouvintes[col]||[]).forEach(function(cb){ try{ cb(snap); }catch(e){ console.error(e); } }); }
  function partes(path){ var i=path.indexOf('/'); return {col:path.slice(0,i), id:path.slice(i+1)}; }
  function gravar(col,id,dados){
    return sb.from('docs').upsert({colecao:col, id:id, dados:dados, arquivado:false}, {onConflict:'colecao,id'}).then(function(r){
      if (r.error) throw erroBanco(r.error); if (col!=='brutos'){ (cache[col]=cache[col]||{})[id]=dados; emitir(col); } }); }
  var dbApi={
    collection:function(col){ return { onSnapshot:function(cb){ (ouvintes[col]=ouvintes[col]||[]).push(cb); setTimeout(function(){ emitir(col); },0); return function(){ ouvintes[col]=(ouvintes[col]||[]).filter(function(x){return x!==cb;}); }; } }; },
    doc:function(path){ var p=partes(path); return {
      get:function(){ var m=cache[p.col]||{}; return Promise.resolve({exists:p.id in m, data:function(){ return m[p.id]; }}); },
      set:function(d){ return gravar(p.col,p.id,d); },
      // "excluir" nunca apaga: arquiva (o banco não aceita DELETE vindo do site)
      delete:function(){ return sb.from('docs').update({arquivado:true}).eq('colecao',p.col).eq('id',p.id).then(function(r){ if (r.error) throw erroBanco(r.error); if (cache[p.col]) delete cache[p.col][p.id]; emitir(p.col); }); }
    }; }
  };
  var userApi={ can:function(){ return Promise.resolve(perfil && perfil.papel==='admin'); } };
  var dlApi={ save:function(o){ var tipo=/\.html?$/i.test(o.filename)?'text/html;charset=utf-8':/\.json$/i.test(o.filename)?'application/json':'application/octet-stream';
    var blob=o.data instanceof Blob?o.data:new Blob([o.data],{type:tipo}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=o.filename; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); },1000); return Promise.resolve({status:'saved'}); } };

  window.claude={ use:function(nome){ return pronto.then(function(){ return nome==='db'?dbApi:nome==='user'?userApi:nome==='downloads'?dlApi:null; }); } };
  // funções extras: backup, restauração e dados brutos
  window.nuvem={
    papel:function(){ return perfil&&perfil.papel; },
    gravar:gravar,
    ler:function(col,id){ return sb.from('docs').select('dados').eq('colecao',col).eq('id',id).eq('arquivado',false).maybeSingle().then(function(r){ if (r.error) throw erroBanco(r.error); return r.data?r.data.dados:null; }); },
    lerColecao:function(col){ return lerPaginado(function(){ return sb.from('docs').select('id,dados').eq('colecao',col).eq('arquivado',false).order('id'); }); },
    lerTudo:function(){ return lerPaginado(function(){ return sb.from('docs').select('colecao,id,dados').eq('arquivado',false).order('colecao').order('id'); }); }
  };

  // ——— início ———
  document.addEventListener('DOMContentLoaded',function(){
    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || !window.supabase){ tela('<p class="nl-tit">Site ainda não configurado</p><p class="nl-txt">Preencha <code>config.js</code> com a URL e a chave pública (anon) do seu projeto Supabase. Veja o README.</p>'); return; }
    sb=window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {auth:{persistSession:true, autoRefreshToken:true, storageKey:'crco-painel-sessao'}});
    sb.auth.getSession().then(function(r){ if (r.data && r.data.session){ usuario=r.data.session.user; etapaMFA(); } else telaSenha(); });
  });
})();

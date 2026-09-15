(function(){
  "use strict";

  var ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.4 2 11.8c0 1.9.5 3.6 1.5 5.2L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.4 10-9.8C22 6.4 17.5 2 12 2zm0 17.8c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.9-1.4-1.3-3-1.3-4.7 0-4.4 3.7-8 8.3-8s8.3 3.6 8.3 8-3.6 7.6-8.1 7.6zm4.6-5.8c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-1-1.1-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s1 2.5 1.1 2.6c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5L2.8 10.9c-1.1.4-1.1 1.1-.2 1.4l4.8 1.5 1.9 5.7c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.7l3-14c.3-1.1-.4-1.6-1.7-1z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 5.6c-1.3-.6-2.6-1-4-1.3l-.2.4c1.3.3 2.5.8 3.7 1.5-2.6-1.2-5.6-1.2-8.2-1.5-1.3.3-2.5.8-3.7 1.5 1.2-.7 2.4-1.2 3.7-1.5l-.2-.4c-1.4.3-2.7.7-4 1.3C3.1 8.9 2.4 12.1 2.7 15.3c1.6 1.2 3.2 1.9 4.7 2.4l.6-1c-.8-.3-1.6-.7-2.3-1.2.2.1.4.3.6.4 3.1 1.4 6.6 1.4 9.7 0 .2-.1.4-.2.6-.4-.7.5-1.5.9-2.3 1.2l.6 1c1.5-.5 3.1-1.2 4.7-2.4.4-3.6-.6-6.7-2.1-9.7zM9.1 13.6c-.7 0-1.3-.7-1.3-1.5s.6-1.5 1.3-1.5 1.3.7 1.3 1.5-.6 1.5-1.3 1.5zm5.8 0c-.7 0-1.3-.7-1.3-1.5s.6-1.5 1.3-1.5 1.3.7 1.3 1.5-.6 1.5-1.3 1.5z"/></svg>'
  };
  var PLAT_LABEL = { whatsapp: "WhatsApp", telegram: "Telegram", discord: "Discord" };

  var popunderLoaded = false;
  function loadPopunderOnce(){
    if(popunderLoaded) return;
    popunderLoaded = true;
    var s = document.createElement("script");
    s.src = "popunder.js";
    document.body.appendChild(s);
  }

  function fmt(n){
    return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function escapeHtml(str){
    return String(str || "").replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  var grid = document.getElementById("grid");
  var emptyState = document.getElementById("emptyState");
  var emptyTitle = document.getElementById("emptyTitle");
  var emptyText = document.getElementById("emptyText");
  var searchInput = document.getElementById("search");
  var statGroups = document.getElementById("statGroups");
  var statMembers = document.getElementById("statMembers");
  var eyebrowText = document.getElementById("eyebrowText");

  var allGroups = [];

  function renderGroups(){
    statGroups.textContent = fmt(allGroups.length);
    statMembers.textContent = fmt(allGroups.reduce(function(a, g){ return a + (Number(g.members) || 0); }, 0));
    eyebrowText.textContent = allGroups.length > 0
      ? allGroups.length + " grupo" + (allGroups.length > 1 ? "s" : "") + " ativo" + (allGroups.length > 1 ? "s" : "") + " agora"
      : "grupos chegando em breve";

    var q = searchInput.value.trim().toLowerCase();
    var filtered = allGroups.filter(function(g){
      if(q === "") return true;
      return ((g.name || "") + " " + (g.desc || "")).toLowerCase().indexOf(q) !== -1;
    });

    grid.innerHTML = "";
    filtered.forEach(function(g){
      var card = document.createElement("article");
      card.className = "card";
      var icon = ICONS[g.plat] || ICONS.whatsapp;
      var label = PLAT_LABEL[g.plat] || "Grupo";
      var photoHtml = g.photo
        ? '<div class="card-photo"><img src="' + escapeHtml(g.photo) + '" alt="" loading="lazy"></div>'
        : '';
      card.innerHTML =
        photoHtml +
        '<div class="card-top">' +
          '<div class="platform">' +
            '<span class="icon">' + icon + '</span>' +
            '<span class="name">' + escapeHtml(g.name) + '</span>' +
          '</div>' +
          '<span class="members">' + fmt(g.members) + '</span>' +
        '</div>' +
        '<p class="desc">' + escapeHtml(g.desc) + '</p>' +
        '<div class="card-foot">' +
          '<span class="tag">' + label + '</span>' +
          '<a class="join" href="grupo.html?id=' + encodeURIComponent(g.id) + '" target="_blank" rel="noopener" aria-label="Ver grupo ' + escapeHtml(g.name) + '">Entrar' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          '</a>' +
        '</div>';
      card.addEventListener("click", function(e){
        if(e.target.closest(".join")) return;
        window.location.href = "grupo.html?id=" + encodeURIComponent(g.id);
      });
      grid.appendChild(card);
    });

    if(allGroups.length === 0){
      emptyTitle.textContent = "Nenhum grupo cadastrado ainda";
      emptyText.textContent = "Assim que os grupos forem adicionados no painel admin, eles aparecem aqui.";
    } else {
      emptyTitle.textContent = "Nenhum grupo encontrado";
      emptyText.textContent = "Tenta outro termo de busca.";
    }
    emptyState.classList.toggle("show", filtered.length === 0);
  }

  searchInput.addEventListener("input", renderGroups);

  fetch("/api/groups")
    .then(function(res){
      if(!res.ok) throw new Error("Falha ao carregar grupos");
      return res.json();
    })
    .then(function(groups){
      allGroups = groups;
      renderGroups();
      loadPopunderOnce();
    })
    .catch(function(err){
      console.error(err);
      emptyTitle.textContent = "Não foi possível carregar os grupos";
      emptyText.textContent = "Verifique se o servidor está rodando e recarregue a página.";
      emptyState.classList.add("show");
    });

  // ---- ember particle canvas ----
  var canvas = document.getElementById("embers");
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var particles = [];
  var w, h, dpr;

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth = canvas.parentElement.clientWidth;
    h = canvas.clientHeight = canvas.parentElement.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle(randomY){
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + 20,
      r: 1.4 + Math.random() * 3,
      speed: 0.12 + Math.random() * 0.3,
      drift: (Math.random() - 0.5) * 0.25,
      flicker: Math.random() * Math.PI * 2,
      hue: Math.random() > 0.5 ? "216,31,63" : "242,89,122"
    };
  }

  function init(){
    resize();
    particles = [];
    var count = Math.round((w * h) / 9000);
    for(var i = 0; i < count; i++) particles.push(makeParticle(true));
  }

  function draw(){
    ctx.clearRect(0, 0, w, h);
    particles.forEach(function(p){
      p.flicker += 0.05;
      var alpha = 0.35 + Math.sin(p.flicker) * 0.25;
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + p.hue + "," + Math.max(alpha, 0.08) + ")";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      if(!reduceMotion){
        p.y -= p.speed;
        p.x += p.drift;
        if(p.y < -10){
          p.y = h + 10;
          p.x = Math.random() * w;
        }
      }
    });
    if(!reduceMotion) requestAnimationFrame(draw);
  }

  init();
  draw();
  window.addEventListener("resize", init);
})();

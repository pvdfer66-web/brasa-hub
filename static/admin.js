(function(){
  "use strict";

  var PLAT_LABEL = { whatsapp: "WhatsApp", telegram: "Telegram", discord: "Discord" };

  function fmt(n){
    return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function escapeHtml(str){
    return String(str || "").replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  var loginSection = document.getElementById("loginSection");
  var panelSection = document.getElementById("panelSection");
  var logoutBtn = document.getElementById("logoutBtn");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var loginPassword = document.getElementById("loginPassword");

  var addForm = document.getElementById("addForm");
  var formError = document.getElementById("formError");
  var fName = document.getElementById("fName");
  var fPlat = document.getElementById("fPlat");
  var fLink = document.getElementById("fLink");
  var fMembers = document.getElementById("fMembers");
  var fDesc = document.getElementById("fDesc");
  var fPhoto = document.getElementById("fPhoto");

  var adminList = document.getElementById("adminList");
  var adminEmpty = document.getElementById("adminEmpty");

  function showLogin(){
    loginSection.hidden = false;
    panelSection.hidden = true;
    logoutBtn.hidden = true;
  }

  function showPanel(){
    loginSection.hidden = true;
    panelSection.hidden = false;
    logoutBtn.hidden = false;
    loadGroups();
  }

  function checkSession(){
    fetch("/api/me")
      .then(function(res){ res.ok ? showPanel() : showLogin(); })
      .catch(showLogin);
  }

  loginForm.addEventListener("submit", function(e){
    e.preventDefault();
    loginError.hidden = true;
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword.value })
    }).then(function(res){
      if(!res.ok) throw new Error("Senha incorreta");
      loginPassword.value = "";
      showPanel();
    }).catch(function(){
      loginError.textContent = "Senha incorreta.";
      loginError.hidden = false;
    });
  });

  logoutBtn.addEventListener("click", function(){
    fetch("/api/logout", { method: "POST" }).finally(showLogin);
  });

  addForm.addEventListener("submit", function(e){
    e.preventDefault();
    formError.hidden = true;

    var submitBtn = addForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    var formData = new FormData();
    formData.append("name", fName.value.trim());
    formData.append("plat", fPlat.value);
    formData.append("link", fLink.value.trim());
    formData.append("members", String(Number(fMembers.value) || 0));
    formData.append("desc", fDesc.value.trim());
    if(fPhoto.files && fPhoto.files[0]){
      formData.append("photo", fPhoto.files[0]);
    }

    fetch("/api/groups", {
      method: "POST",
      body: formData
    }).then(function(res){
      if(res.status === 401){ showLogin(); throw new Error("Sessão expirada"); }
      if(!res.ok) return res.json().then(function(data){ throw new Error(data.detail || "Erro ao salvar"); });
      addForm.reset();
      loadGroups();
    }).catch(function(err){
      formError.textContent = err.message;
      formError.hidden = false;
    }).finally(function(){
      submitBtn.disabled = false;
    });
  });

  function loadGroups(){
    fetch("/api/groups")
      .then(function(res){ return res.json(); })
      .then(function(groups){
        adminList.innerHTML = "";
        adminEmpty.hidden = groups.length > 0;

        groups.forEach(function(g){
          var row = document.createElement("div");
          row.className = "admin-row";
          var photoHtml = g.photo
            ? '<img class="thumb" src="' + escapeHtml(g.photo) + '" alt="">'
            : '';
          row.innerHTML =
            '<div class="row-main">' +
              photoHtml +
              '<div class="info">' +
                '<div class="name">' + escapeHtml(g.name) + '</div>' +
                '<div class="meta">' + (PLAT_LABEL[g.plat] || g.plat) + ' · ' + fmt(g.members) + ' membros</div>' +
                '<div class="desc">' + escapeHtml(g.desc) + '</div>' +
              '</div>' +
            '</div>';
          var delBtn = document.createElement("button");
          delBtn.className = "btn danger";
          delBtn.type = "button";
          delBtn.textContent = "Remover";
          delBtn.addEventListener("click", function(){
            if(!confirm('Remover o grupo "' + g.name + '"?')) return;
            fetch("/api/groups/" + encodeURIComponent(g.id), { method: "DELETE" })
              .then(function(res){
                if(res.status === 401){ showLogin(); return; }
                if(!res.ok) throw new Error("Erro ao remover");
                loadGroups();
              })
              .catch(function(){ alert("Erro ao remover o grupo."); });
          });
          row.appendChild(delBtn);
          adminList.appendChild(row);
        });
      });
  }

  checkSession();
})();

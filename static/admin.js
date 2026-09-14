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
  var formTitle = document.getElementById("formTitle");
  var submitBtn = document.getElementById("submitBtn");
  var cancelEditBtn = document.getElementById("cancelEditBtn");
  var fName = document.getElementById("fName");
  var fPlat = document.getElementById("fPlat");
  var fLink = document.getElementById("fLink");
  var fMembers = document.getElementById("fMembers");
  var fDesc = document.getElementById("fDesc");
  var fPhoto = document.getElementById("fPhoto");
  var fPhotoLabel = document.getElementById("fPhotoLabel");

  var adminList = document.getElementById("adminList");
  var adminEmpty = document.getElementById("adminEmpty");

  var editingId = null;

  function enterEditMode(g){
    editingId = g.id;
    fName.value = g.name;
    fPlat.value = g.plat;
    fLink.value = g.link;
    fMembers.value = g.members;
    fDesc.value = g.desc;
    fPhoto.value = "";
    formTitle.textContent = "Editar grupo";
    submitBtn.textContent = "Salvar alterações";
    fPhotoLabel.textContent = g.photo
      ? "Foto do grupo (deixe em branco pra manter a atual)"
      : "Foto do grupo (opcional)";
    cancelEditBtn.hidden = false;
    addForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exitEditMode(){
    editingId = null;
    addForm.reset();
    formTitle.textContent = "Adicionar grupo";
    submitBtn.textContent = "Adicionar grupo";
    fPhotoLabel.textContent = "Foto do grupo (opcional)";
    cancelEditBtn.hidden = true;
  }

  cancelEditBtn.addEventListener("click", exitEditMode);

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

    var url = editingId ? "/api/groups/" + encodeURIComponent(editingId) : "/api/groups";
    var method = editingId ? "PUT" : "POST";

    fetch(url, {
      method: method,
      body: formData
    }).then(function(res){
      if(res.status === 401){ showLogin(); throw new Error("Sessão expirada"); }
      if(!res.ok) return res.json().then(function(data){ throw new Error(data.detail || "Erro ao salvar"); });
      exitEditMode();
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
          var actions = document.createElement("div");
          actions.style.display = "flex";
          actions.style.gap = "8px";
          actions.style.flex = "none";

          var editBtn = document.createElement("button");
          editBtn.className = "btn ghost";
          editBtn.type = "button";
          editBtn.textContent = "Editar";
          editBtn.addEventListener("click", function(){ enterEditMode(g); });
          actions.appendChild(editBtn);

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
          actions.appendChild(delBtn);

          row.appendChild(actions);
          adminList.appendChild(row);
        });
      });
  }

  checkSession();
})();

(function(){
  "use strict";

  var ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.4 2 11.8c0 1.9.5 3.6 1.5 5.2L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.4 10-9.8C22 6.4 17.5 2 12 2zm0 17.8c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.9-1.4-1.3-3-1.3-4.7 0-4.4 3.7-8 8.3-8s8.3 3.6 8.3 8-3.6 7.6-8.1 7.6zm4.6-5.8c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-1-1.1-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s1 2.5 1.1 2.6c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5L2.8 10.9c-1.1.4-1.1 1.1-.2 1.4l4.8 1.5 1.9 5.7c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.7l3-14c.3-1.1-.4-1.6-1.7-1z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 5.6c-1.3-.6-2.6-1-4-1.3l-.2.4c1.3.3 2.5.8 3.7 1.5-2.6-1.2-5.6-1.2-8.2-1.5-1.3.3-2.5.8-3.7 1.5 1.2-.7 2.4-1.2 3.7-1.5l-.2-.4c-1.4.3-2.7.7-4 1.3C3.1 8.9 2.4 12.1 2.7 15.3c1.6 1.2 3.2 1.9 4.7 2.4l.6-1c-.8-.3-1.6-.7-2.3-1.2.2.1.4.3.6.4 3.1 1.4 6.6 1.4 9.7 0 .2-.1.4-.2.6-.4-.7.5-1.5.9-2.3 1.2l.6 1c1.5-.5 3.1-1.2 4.7-2.4.4-3.6-.6-6.7-2.1-9.7zM9.1 13.6c-.7 0-1.3-.7-1.3-1.5s.6-1.5 1.3-1.5 1.3.7 1.3 1.5-.6 1.5-1.3 1.5zm5.8 0c-.7 0-1.3-.7-1.3-1.5s.6-1.5 1.3-1.5 1.3.7 1.3 1.5-.6 1.5-1.3 1.5z"/></svg>'
  };
  var PLAT_LABEL = { whatsapp: "WhatsApp", telegram: "Telegram", discord: "Discord" };

  function fmt(n){
    return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  var loadingState = document.getElementById("loadingState");
  var notFoundState = document.getElementById("notFoundState");
  var detail = document.getElementById("groupDetail");
  var detailPhotoWrap = document.getElementById("detailPhotoWrap");
  var detailPhoto = document.getElementById("detailPhoto");
  var detailIcon = document.getElementById("detailIcon");
  var detailName = document.getElementById("detailName");
  var detailMembers = document.getElementById("detailMembers");
  var detailTag = document.getElementById("detailTag");
  var detailDesc = document.getElementById("detailDesc");
  var detailJoin = document.getElementById("detailJoin");

  var id = new URLSearchParams(window.location.search).get("id");

  function showNotFound(){
    loadingState.hidden = true;
    notFoundState.hidden = false;
  }

  if(!id){
    showNotFound();
  } else {
    fetch("/api/groups/" + encodeURIComponent(id))
      .then(function(res){
        if(!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(function(g){
        document.title = g.name + " — Gruposzap18";
        detailIcon.innerHTML = ICONS[g.plat] || ICONS.whatsapp;
        detailName.textContent = g.name;
        detailMembers.textContent = fmt(g.members) + " membros";
        detailTag.textContent = PLAT_LABEL[g.plat] || "Grupo";
        detailDesc.textContent = g.desc;
        detailJoin.href = g.link;
        detailJoin.addEventListener("click", function(e){
          e.preventDefault();
          window.open(g.link, "_blank");
        });
        if(g.photo){
          detailPhoto.src = g.photo;
          detailPhotoWrap.hidden = false;
        }
        loadingState.hidden = true;
        detail.hidden = false;
      })
      .catch(showNotFound);
  }
})();

/* js/app.js - Merged full Sadat app
   - Restores original features
   - Adds drag-drop, search, mocked login, FAB, skeletons, profile edit, animations
   - Fixes analytics loop by only updating on events
*/

(() => {
  // helpers
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // constants & storage keys
  const STORAGE_KEY = 'sadat_v1';
  const USER_KEY = 'sadat_user';
  const SHOW_LANDING = 'sadat_no_landing';
  const THEME_KEY = 'ss_theme';

  // initial sample posts (restored)
  function genId(){ return 'id_' + Math.random().toString(36).slice(2,9) }
  const samplePosts = [
    {
      id: genId(), user: 'Amina', avatar:'assets/avatar1.png',
      text: "Loving the new front-end project I'm building! 🚀\n#portfolio #webdev",
      img: '', likes: 12, comments: [{id:genId(), user:'John', text:'Nice work!', time:Date.now()-3600000}],
      created: Date.now()-3600000, saved:false
    },
    {
      id: genId(), user: 'Liam', avatar:'assets/avatar2.png',
      text: "Morning coffee and code. ☕",
      img: '', likes: 4, comments: [], created: Date.now()-7200000, saved:false
    }
  ];

  // app state
  const state = {
    user: { name: localStorage.getItem(USER_KEY) || null, avatar: 'assets/avatar-default.png', bio: 'Front-end developer • Portfolio' },
    posts: [],
    view: 'feed',
    notifications: []
  };

  // DOM refs
  const loginWrapper = document.getElementById('loginWrapper');
  const loginName = document.getElementById('loginName');
  const loginSubmit = document.getElementById('loginSubmit');
  const loginGuest = document.getElementById('loginGuest');
  const mainApp = document.getElementById('mainApp');
  const miniName = document.getElementById('miniName');
  const miniBio = document.getElementById('miniBio');
  const miniAvatar = document.getElementById('miniAvatar');
  const viewRoot = document.getElementById('view');
  const createModal = document.getElementById('createModal');
  const postText = document.getElementById('postText');
  const postImageInput = document.getElementById('postImage');
  const imgPreviewWrap = document.getElementById('imgPreviewWrap');
  const imgPreview = document.getElementById('imgPreview');
  const publishBtn = document.getElementById('publishBtn');
  const dropZone = document.getElementById('dropZone');
  const globalSearch = document.getElementById('globalSearch');
  const fab = document.getElementById('fab');
  const landingModal = document.getElementById('landingModal');
  const dontShowLanding = document.getElementById('dontShowLanding');

  // Chart var
  let miniChart = null;

  // init app
  function init(){
    loadState();
    bindUI();
    applyAutoTheme();
    mountView(state.view);
    renderMiniProfile();
    renderSuggestions();
    initMiniChart();
    // show landing if not disabled and not returning user
    if(!localStorage.getItem(SHOW_LANDING) && !localStorage.getItem(USER_KEY)) {
      showModal(landingModal);
    }
  }

  // load & save
  function loadState(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      try {
        const parsed = JSON.parse(raw);
        state.posts = parsed.posts || samplePosts.slice();
        state.notifications = parsed.notifications || [];
      } catch(e){
        console.warn('corrupt storage; seeding sample');
        state.posts = samplePosts.slice();
        saveState();
      }
    } else {
      state.posts = samplePosts.slice();
      saveState();
    }
  }
  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ posts: state.posts, notifications: state.notifications }));
    updateNotifBadge();
    updateMiniChart();
  }

  // UI bindings
  function bindUI(){
    // login
    loginSubmit.addEventListener('click', () => {
      const name = loginName.value.trim();
      if(!name) return alert('Enter a display name');
      state.user.name = name;
      localStorage.setItem(USER_KEY, name);
      loginWrapper.classList.add('hidden');
      mainApp.classList.remove('hidden');
      renderMiniProfile();
    });
    loginGuest.addEventListener('click', () => {
      state.user.name = 'Guest';
      localStorage.setItem(USER_KEY, 'Guest');
      loginWrapper.classList.add('hidden');
      mainApp.classList.remove('hidden');
      renderMiniProfile();
    });

    // top actions (delegation)
    document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', e => {
      const action = el.dataset.action;
      handleAction(action, e);
    }));

    document.getElementById('openCreate').addEventListener('click', openCreateModal);
    document.getElementById('mobileCreate').addEventListener('click', openCreateModal);
    fab.addEventListener('click', openCreateModal);

    // global search (client-side)
    globalSearch.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const posts = viewRoot.querySelectorAll('.post-card');
      posts.forEach(p => {
        const text = (p.querySelector('.post-text')?.textContent || '').toLowerCase();
        p.style.display = text.includes(q) ? '' : 'none';
      });
    });

    // create modal bindings
    postText.addEventListener('input', e => $('#charCount').textContent = `${e.target.value.length} / 300`);
    postImageInput.addEventListener('change', handleImageSelect);
    publishBtn.addEventListener('click', publishPost);

    // drag & drop
    dropZone.addEventListener('dragover', (ev) => { ev.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (ev) => {
      ev.preventDefault();
      dropZone.classList.remove('dragover');
      const file = ev.dataTransfer.files[0];
      if(file) readFileToPreview(file);
    });
    dropZone.addEventListener('click', () => postImageInput.click());

    // modal close by overlay
    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', (ev) => { if(ev.target === m) hideModal(m) });
    });

    // theme toggle
    $('#themeToggle').addEventListener('click', toggleTheme);

    // notification
    $('#notifBtn').addEventListener('click', toggleNotifDropdown);

    // landing modal dont show
    dontShowLanding?.addEventListener('change', (e) => {
      if(e.target.checked) localStorage.setItem(SHOW_LANDING, '1');
      else localStorage.removeItem(SHOW_LANDING);
    });

    // comment send delegated later when modal opens
  }

  // handle top action names
  function handleAction(action, e){
    switch(action){
      case 'go-home': mountView('feed'); break;
      case 'go-profile': mountView('profile'); break;
      case 'go-explore': mountView('explore'); break;
      case 'go-saved': mountView('saved'); break;
      case 'go-settings': mountView('settings'); break;
      case 'open-create': openCreateModal(); break;
      case 'open-notifs': toggleNotifDropdown(); break;
      case 'close-modal': hideModal(e.target.closest('.modal')); break;
      default: break;
    }
  }

  // --- Views ---
  function mountView(name){
    state.view = name;
    viewRoot.innerHTML = '';
    if(name === 'feed') renderFeed(viewRoot);
    if(name === 'profile') renderProfile(viewRoot);
    if(name === 'explore') renderExplore(viewRoot);
    if(name === 'saved') renderSaved(viewRoot);
    if(name === 'settings') renderSettings(viewRoot);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  // Render skeletons then content for perceived performance
  function renderFeed(container){
    // skeleton
    const skeletonWrap = document.createElement('div');
    skeletonWrap.innerHTML = `
      <div class="small-card skeleton" style="height:86px;margin-bottom:12px"></div>
      <div class="small-card skeleton" style="height:220px;margin-bottom:12px"></div>
    `;
    container.appendChild(skeletonWrap);

    // simulate small delay then render
    setTimeout(() => {
      container.innerHTML = '';
      // compose box
      const compose = document.createElement('div');
      compose.className = 'small-card';
      compose.innerHTML = `<div style="display:flex;gap:10px;align-items:center">
        <img src="${state.user.avatar}" class="avatar" style="width:48px;height:48px"/>
        <input placeholder="What's happening?" id="quickPost" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,0.06)"/>
        <button class="btn" id="quickBtn">Post</button>
      </div>`;
      container.appendChild(compose);

      $('#quickBtn').addEventListener('click', () => {
        const t = $('#quickPost').value.trim();
        if(!t) return;
        createPost({ text: t });
        $('#quickPost').value = '';
      });

      const feedWrap = document.createElement('div');
      feedWrap.id = 'feedWrap';
      container.appendChild(feedWrap);

      state.posts.slice().sort((a,b)=>b.created-a.created).forEach(p => {
        feedWrap.appendChild(makePostCard(p));
      });

    }, 350); // short delay to show skeletons
  }

  function renderProfile(container){
    const header = document.createElement('div');
    header.className = 'small-card';
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <img src="${state.user.avatar}" class="avatar" style="width:84px;height:84px"/>
        <div style="flex:1">
          <h2 style="margin:0" id="profileTitle">${state.user.name||'You'}</h2>
          <div class="muted" id="profileBio">${state.user.bio}</div>
          <div style="margin-top:8px">
            <button class="btn" id="editProfileBtn">Edit profile</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(header);

    // posts
    const grid = document.createElement('div');
    grid.className = 'small-card';
    grid.style.marginTop = '12px';
    grid.innerHTML = '<h4>Your Posts</h4><div id="profilePosts"></div>';
    container.appendChild(grid);

    const profilePosts = grid.querySelector('#profilePosts');
    const myPosts = state.posts.filter(p => p.user === state.user.name);
    if(myPosts.length === 0) profilePosts.innerHTML = '<p class="muted">No posts yet. Create one!</p>';
    myPosts.slice().reverse().forEach(p => profilePosts.appendChild(makePostCard(p)));

    document.getElementById('editProfileBtn').addEventListener('click', () => {
      const newName = prompt('Display name:', state.user.name);
      if(newName) {
        state.user.name = newName;
        localStorage.setItem(USER_KEY, newName);
        renderMiniProfile();
        mountView('profile');
      }
    });
  }

  function renderExplore(container){
    const card = document.createElement('div');
    card.className = 'small-card';
    card.innerHTML = '<h4>Explore • Trending</h4><div id="trending"></div>';
    container.appendChild(card);
    const trending = card.querySelector('#trending');

    const tags = {};
    state.posts.forEach(p=>{
      (p.text||'').split(/\s+/).forEach(w=>{
        if(w.startsWith('#')) tags[w] = (tags[w]||0)+1;
      });
    });
    const trendingList = Object.entries(tags).sort((a,b)=>b[1]-a[1]).slice(0,6);
    if(trendingList.length === 0) trending.innerHTML = '<p class="muted">No trending tags yet.</p>';
    else trendingList.forEach(([tag,count])=>{
      const el = document.createElement('div');
      el.className = 'muted small';
      el.style.padding = '8px 0';
      el.textContent = `${tag} • ${count} posts`;
      trending.appendChild(el);
    });

    // suggested posts
    const feed = document.createElement('div');
    feed.style.marginTop = '12px';
    feed.appendChild(document.createElement('h4')).textContent = 'Suggested posts';
    state.posts.slice().sort((a,b)=>b.likes-a.likes).slice(0,6).forEach(p => feed.appendChild(makePostCard(p)));
    container.appendChild(feed);
  }

  function renderSaved(container){
    const saved = state.posts.filter(p => p.saved);
    const card = document.createElement('div');
    card.className = 'small-card';
    card.innerHTML = `<h4>Saved posts</h4>`;
    container.appendChild(card);
    if(saved.length === 0) {
      container.appendChild(document.createElement('div')).innerHTML = '<p class="muted">No saved posts.</p>';
      return;
    }
    saved.forEach(p => container.appendChild(makePostCard(p)));
  }

  function renderSettings(container){
    const card = document.createElement('div');
    card.className = 'small-card';
    card.innerHTML = `
      <h4>Settings</h4>
      <div style="margin-top:8px">
        <label>Display name</label><br/>
        <input id="settingsName" value="${state.user.name||''}" style="padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);margin-top:6px"/>
        <div style="margin-top:8px">
          <label>Bio</label><br/>
          <input id="settingsBio" value="${state.user.bio||''}" style="padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);margin-top:6px"/>
        </div>
        <div style="margin-top:12px">
          <button class="btn primary" id="saveSettings">Save</button>
          <button class="btn" id="clearData">Clear saved data</button>
        </div>
      </div>
    `;
    container.appendChild(card);

    $('#saveSettings').addEventListener('click', () => {
      const v = $('#settingsName').value.trim();
      const bio = $('#settingsBio').value.trim();
      if(v) {
        state.user.name = v;
        state.user.bio = bio || 'Front-end developer • Portfolio';
        localStorage.setItem(USER_KEY, v);
        renderMiniProfile();
        alert('Saved');
      }
    });
    $('#clearData').addEventListener('click', () => {
      if(confirm('Clear all app data? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });
  }

  // --- Post card builder (restored + improved) ---
  function makePostCard(p){
    const tpl = document.querySelector('#postCardTpl');
    const el = tpl.content.firstElementChild.cloneNode(true);

    el.querySelector('.post-avatar').src = p.avatar || 'assets/avatar-default.png';
    el.querySelector('.username').textContent = p.user;
    el.querySelector('.post-text').textContent = p.text || '';
    const imgEl = el.querySelector('.post-image');
    if(p.img){
      imgEl.src = p.img;
      imgEl.classList.remove('hidden');
    } else imgEl.classList.add('hidden');

    const likeBtn = el.querySelector('.like-btn');
    const likeCount = el.querySelector('.like-count');
    likeCount.textContent = p.likes || 0;

    const commentBtn = el.querySelector('.comment-btn');
    commentBtn.querySelector('.comment-count').textContent = (p.comments||[]).length;

    // save
    const saveBtn = el.querySelector('.save-btn');
    saveBtn.textContent = p.saved ? '★' : '☆';
    saveBtn.addEventListener('click', () => {
      p.saved = !p.saved;
      saveBtn.textContent = p.saved ? '★' : '☆';
      saveState();
      notify(`Post ${p.saved ? 'saved' : 'unsaved'}`);
    });

    // like handler
    likeBtn.addEventListener('click', () => {
      p.likes = (p.likes || 0) + 1;
      likeCount.textContent = p.likes;
      likeBtn.classList.add('liked');
      animateHeart(likeBtn);
      saveState();
      notify(`${state.user.name} liked ${p.user}'s post`);
    });

    // double-tap like on image (mobile)
    imgEl.addEventListener('dblclick', () => {
      likeBtn.click();
    });

    // comment handler (open modal)
    commentBtn.addEventListener('click', () => openComments(p));

    // share
    el.querySelector('.share-btn').addEventListener('click', () => {
      navigator?.clipboard?.writeText(`${p.user}: ${p.text}`).then(() => {
        notify('Post copied to clipboard');
      }).catch(()=> alert('Copy failed'));
    });

    // timestamp
    const ts = el.querySelector('.timestamp');
    ts.textContent = timeAgo(p.created);

    return el;
  }

  // quick create helper
  function createPost({ text='', img='' }){
    const post = {
      id: genId(), user: state.user.name || 'Guest', avatar: state.user.avatar,
      text, img, likes:0, comments:[], created: Date.now(), saved:false
    };
    state.posts.push(post);
    saveState();
    if(state.view === 'feed') mountView('feed'); // re-render feed
  }

  // publish from modal
  function publishPost(){
    const text = postText.value.trim();
    const img = imgPreviewWrap?.dataset?.img || '';
    if(!text && !img){ alert('Add text or image'); return; }
    createPost({ text, img });
    hideModal(createModal);
    postText.value = '';
    imgPreviewWrap.classList.add('hidden');
    imgPreviewWrap.dataset.img = '';
    notify('Post published');
  }

  // image preview
  function handleImageSelect(e){
    const file = e.target.files[0];
    if(!file) return;
    readFileToPreview(file);
  }
  function readFileToPreview(file){
    const reader = new FileReader();
    reader.onload = function(evt){
      imgPreview.src = evt.target.result;
      imgPreviewWrap.classList.remove('hidden');
      imgPreviewWrap.dataset.img = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  // comments modal
  function openComments(post){
    state.activePost = post;
    const cm = document.getElementById('commentModal');
    cm.classList.remove('hidden');
    const body = document.getElementById('commentBody');
    body.innerHTML = '';
    (post.comments||[]).forEach(c => {
      const el = document.createElement('div');
      el.style.padding = '8px 0';
      el.innerHTML = `<strong>${c.user}</strong> <span class="muted small">${timeAgo(c.time)}</span><div>${c.text}</div>`;
      body.appendChild(el);
    });
    document.getElementById('commentInput').value = '';
    document.getElementById('sendComment').onclick = () => {
      const txt = document.getElementById('commentInput').value.trim();
      if(!txt) return;
      const newC = { id: genId(), user: state.user.name || 'Guest', text: txt, time: Date.now() };
      post.comments = post.comments || [];
      post.comments.push(newC);
      saveState();
      openComments(post);
      notify(`${state.user.name} commented`);
    };
  }

  // notifications
  function notify(text){
    const n = { id: genId(), text, time: Date.now() };
    state.notifications.unshift(n);
    if(state.notifications.length > 50) state.notifications.pop();
    saveState();
    updateNotifDropdown();
  }
  function updateNotifDropdown(){
    const dd = document.getElementById('notifDropdown');
    dd.innerHTML = '';
    if(state.notifications.length === 0) dd.innerHTML = '<div class="small-card muted">No notifications</div>';
    else state.notifications.slice(0,6).forEach(n => {
      const el = document.createElement('div');
      el.className = 'small-card';
      el.style.margin = '8px';
      el.innerHTML = `<div class="muted small">${timeAgo(n.time)}</div><div>${n.text}</div>`;
      dd.appendChild(el);
    });
    updateNotifBadge();
  }
  function toggleNotifDropdown(){ document.getElementById('notifDropdown').classList.toggle('hidden'); }
  function updateNotifBadge(){
    const badge = document.getElementById('notifBadge');
    const count = state.notifications.length;
    if(!badge) return;
    if(count>0){ badge.textContent = count; badge.classList.remove('hidden'); } else badge.classList.add('hidden');
  }

  // profile render
  function renderMiniProfile(){
    miniName.textContent = state.user.name || 'You';
    miniBio.textContent = state.user.bio || 'Front-end developer • Portfolio';
    miniAvatar.src = state.user.avatar || 'assets/avatar-default.png';
  }

  // suggestions
  function renderSuggestions(){
    const el = document.getElementById('suggestions');
    el.innerHTML = '';
    const users = ['Amina','Liam','Sofia','Noah','Zara'];
    users.forEach(u => {
      const row = document.createElement('div');
      row.style.display = 'flex';row.style.alignItems='center';row.style.justifyContent='space-between';row.style.padding='8px 0';
      row.innerHTML = `<div style="display:flex;gap:10px;align-items:center">
        <img src="assets/avatar-default.png" style="width:36px;height:36px;border-radius:50%"/>
        <div><strong>${u}</strong><div class="muted small">Suggested</div></div>
      </div>
      <button class="btn small follow" data-user="${u}">Follow</button>`;
      el.appendChild(row);
      row.querySelector('.follow').addEventListener('click', () => {
        notify(`You followed ${u}`);
        row.querySelector('.follow').textContent = 'Following';
      });
    });
  }

  // time helper
  function timeAgo(ts){
    if(!ts) return '';
    const s = Math.floor((Date.now()-ts)/1000);
    if(s < 60) return `${s}s`;
    if(s < 3600) return `${Math.floor(s/60)}m`;
    if(s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}d`;
  }

  // animations
  function animateHeart(btn){
    btn.animate([{ transform:'scale(1)' }, { transform:'scale(1.25)' }, { transform:'scale(1)' }], { duration:380, easing:'ease-out' });
  }

  // modal helpers
  function showModal(m){ m.classList.remove('hidden'); }
  function hideModal(m){ m.classList.add('hidden'); }
  function openCreateModal(){
    showModal(createModal);
    postText.value = '';
    $('#charCount').textContent = '0 / 300';
    postImageInput.value = '';
    imgPreviewWrap.classList.add('hidden');
    imgPreviewWrap.dataset.img = '';
  }

  // search (global) implemented earlier via input binding

  // theme functions
  function applyAutoTheme(){
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if(saved === 'dark') document.documentElement.classList.add('dark');
      else if(saved === 'light') document.documentElement.classList.remove('dark');
      else {
        if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
      }
    } catch(e){}
  }
  function toggleTheme(){
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }
  $('#themeToggle').addEventListener('click', toggleTheme);

  // mini chart (Chart.js) - only update on demand
  function initMiniChart(){
    const ctx = document.getElementById('miniChart').getContext('2d');
    miniChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: ['Posts','Likes','Comments'], datasets: [{ label:'Stats', data:getStats() }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
    });
  }
  function getStats(){
    const posts = state.posts.length;
    const likes = state.posts.reduce((s,p)=>s+(p.likes||0),0);
    const comments = state.posts.reduce((s,p)=>s+(p.comments?.length||0),0);
    return [posts, likes, comments];
  }
  function updateMiniChart(){ if(miniChart) { miniChart.data.datasets[0].data = getStats(); miniChart.update(); } }

  // post creation helper used by quick post and publish
  function addPostLocal(data){
    const post = {
      id: genId(), user: state.user.name || 'Guest', avatar: state.user.avatar,
      text: data.text || '', img: data.img || '', likes:0, comments:[], created: Date.now(), saved:false
    };
    state.posts.push(post);
    saveState();
  }

  // quick create binding done in renderFeed; to support direct call:
  window.addPost = (d) => { addPostLocal(d); if(state.view === 'feed') mountView('feed'); };

  // Update chart and anything else on interaction
  function updateAfterInteraction(){ updateMiniChart(); saveState(); }

  // initial mount - if user exists show main, otherwise show login
  function showAppropriate(){
    if(localStorage.getItem(USER_KEY)){
      loginWrapper.classList.add('hidden');
      mainApp.classList.remove('hidden');
      state.user.name = localStorage.getItem(USER_KEY);
      renderMiniProfile();
    } else {
      loginWrapper.classList.remove('hidden');
      mainApp.classList.add('hidden');
    }
  }

  // notify with small UI - (already done above)
  // utility: open comments etc done earlier

  // Onload behavior
  document.addEventListener('DOMContentLoaded', () => {
    showAppropriate();
    init();
  });

  // Expose a couple helpers to window for debugging
  window.sadatState = state;
  window.sadatSave = saveState;

})();

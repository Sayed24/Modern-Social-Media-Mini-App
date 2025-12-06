/* app.js - SocialSphere front-end mini app */
(() => {
  // Utilities
  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const $ = qs;
  const storageKey = 'socialsphere_v1';

  // default sample data
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

  // State
  const state = {
    user: { name: localStorage.getItem('ss_user_name') || 'You', avatar:'assets/avatar-default.png', bio: 'Front-end developer • Portfolio'},
    posts: [],
    view: 'feed',
    activePost: null,
    notifications: []
  };

  // Initialize
  function init(){
    loadState();
    bindUI();
    mountView(state.view);
    renderMiniProfile();
    renderSuggestions();
    initTheme();
    initMiniChart();
  }

  // Generate ID
  function genId(){ return 'id_' + Math.random().toString(36).slice(2,9) }

  // Load from localStorage or seed
  function loadState(){
    const raw = localStorage.getItem(storageKey);
    if(raw){
      try {
        const parsed = JSON.parse(raw);
        state.posts = parsed.posts || [];
        state.notifications = parsed.notifications || [];
      } catch(e){
        console.warn('corrupt data, reseeding');
        localStorage.removeItem(storageKey);
        state.posts = samplePosts;
      }
    } else {
      state.posts = samplePosts;
      saveState();
    }
  }

  function saveState(){
    localStorage.setItem(storageKey, JSON.stringify({ posts: state.posts, notifications: state.notifications }));
    updateNotifBadge();
  }

  // UI bindings
  function bindUI(){
    // top actions
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = el.dataset.action;
        handleAction(action, e);
      });
    });

    // bottom nav create
    $('#mobileCreate')?.addEventListener('click', () => openCreate());

    // create modal behavior
    $('#postText').addEventListener('input', e => {
      $('#charCount').textContent = `${e.target.value.length} / 300`;
    });
    $('#postImage').addEventListener('change', handleImageSelect);
    $('#publishBtn').addEventListener('click', publishPost);

    // theme toggle
    $('#themeToggle').addEventListener('click', toggleTheme);

    // close modal by clicking background
    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', (ev) => {
        if(ev.target === m) closeModal(m);
      });
    });

    // notification dropdown
    $('#notifBtn').addEventListener('click', toggleNotifDropdown);

    // basic actions (delegated)
    $('#view').addEventListener('click', handleViewClick);
    // mobile bottom nav
    document.querySelectorAll('.bn-item').forEach(btn => btn.addEventListener('click', e => {
      handleAction(btn.dataset.action);
    }));

    // create button
    $('#createBtn').addEventListener('click', openCreate);
  }

  function handleAction(action, e){
    switch(action){
      case 'go-home': mountView('feed'); break;
      case 'go-profile': mountView('profile'); break;
      case 'go-explore': mountView('explore'); break;
      case 'go-saved': mountView('saved'); break;
      case 'go-settings': mountView('settings'); break;
      case 'open-create': openCreate(); break;
      case 'open-notifs': toggleNotifDropdown(); break;
      case 'close-modal': closeModal(e.target.closest('.modal')); break;
      default: break;
    }
  }

  // Views
  function mountView(name){
    state.view = name;
    const view = $('#view');
    view.innerHTML = '';
    if(name === 'feed') renderFeed(view);
    if(name === 'profile') renderProfile(view);
    if(name === 'explore') renderExplore(view);
    if(name === 'saved') renderSaved(view);
    if(name === 'settings') renderSettings(view);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  // Render feed
  function renderFeed(container){
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
      addPost({ text: t });
      $('#quickPost').value = '';
    });

    const feedWrap = document.createElement('div');
    feedWrap.id = 'feedWrap';
    container.appendChild(feedWrap);

    // animated render (newest first)
    state.posts.slice().sort((a,b)=>b.created-a.created).forEach(p => {
      feedWrap.appendChild(makePostCard(p));
    });
  }

  // Render profile page
  function renderProfile(container){
    const header = document.createElement('div');
    header.className = 'small-card';
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <img src="${state.user.avatar}" class="avatar" style="width:84px;height:84px"/>
        <div style="flex:1">
          <h2 style="margin:0">${state.user.name}</h2>
          <div class="muted">${state.user.bio}</div>
          <div style="margin-top:8px">
            <button class="btn" id="editProfileBtn">Edit profile</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(header);

    // posts grid
    const grid = document.createElement('div');
    grid.className = 'small-card';
    grid.style.marginTop = '12px';
    grid.innerHTML = '<h4>Your Posts</h4><div id="profilePosts"></div>';
    container.appendChild(grid);

    const profilePosts = grid.querySelector('#profilePosts');
    const myPosts = state.posts.filter(p => p.user === state.user.name);
    if(myPosts.length === 0) profilePosts.innerHTML = '<p class="muted">No posts yet. Create one!</p>';
    myPosts.slice().reverse().forEach(p => {
      profilePosts.appendChild(makePostCard(p));
    });

    // edit profile action
    $('#editProfileBtn').addEventListener('click', () => {
      const newName = prompt('Display name:', state.user.name);
      if(newName) {
        state.user.name = newName;
        localStorage.setItem('ss_user_name', newName);
        renderMiniProfile();
        mountView('profile'); // rerender
      }
    });
  }

  // Explore page
  function renderExplore(container){
    const card = document.createElement('div');
    card.className = 'small-card';
    card.innerHTML = '<h4>Explore • Trending</h4><div id="trending"></div>';
    container.appendChild(card);
    const trending = card.querySelector('#trending');
    // basic trending by hashtag frequency
    const tags = {};
    state.posts.forEach(p=>{
      (p.text||'').split(/\s+/).forEach(w=>{
        if(w.startsWith('#')) tags[w] = (tags[w]||0)+1;
      });
    });
    const trendingList = Object.entries(tags).sort((a,b)=>b[1]-a[1]).slice(0,6);
    if(trendingList.length === 0) trending.innerHTML = '<p class="muted">No trending tags yet.</p>';
    else {
      trendingList.forEach(([tag,count])=>{
        const el = document.createElement('div');
        el.className = 'muted small';
        el.style.padding = '8px 0';
        el.textContent = `${tag} • ${count} posts`;
        trending.appendChild(el);
      });
    }

    // show feed preview
    const feed = document.createElement('div');
    feed.style.marginTop = '12px';
    feed.appendChild(document.createElement('h4'));
    feed.querySelector('h4').textContent = 'Suggested posts';
    state.posts.slice().sort((a,b)=>b.likes-a.likes).slice(0,6).forEach(p => feed.appendChild(makePostCard(p)));
    container.appendChild(feed);
  }

  // Saved page
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

  // Settings
  function renderSettings(container){
    const card = document.createElement('div');
    card.className = 'small-card';
    card.innerHTML = `
      <h4>Settings</h4>
      <div style="margin-top:8px">
        <label>Display name</label><br/>
        <input id="settingsName" value="${state.user.name}" style="padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);margin-top:6px"/>
        <div style="margin-top:8px">
          <label>Bio</label><br/>
          <input id="settingsBio" value="${state.user.bio}" style="padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);margin-top:6px"/>
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
        localStorage.setItem('ss_user_name', v);
        renderMiniProfile();
        alert('Saved');
      }
    });
    $('#clearData').addEventListener('click', () => {
      if(confirm('Clear all app data? This cannot be undone.')) {
        localStorage.removeItem(storageKey);
        location.reload();
      }
    });
  }

  // Build post card element
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

    // save button
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
      updateMiniChart();
    });

    // double-tap like on image
    imgEl.addEventListener('dblclick', () => {
      likeBtn.click();
    });

    // comment handler (open modal)
    commentBtn.addEventListener('click', () => openComments(p, commentBtn));

    // share button (native share or copy link)
    el.querySelector('.share-btn').addEventListener('click', () => {
      // for demo just copy text
      navigator?.clipboard?.writeText(`${p.user}: ${p.text}`).then(() => {
        notify('Post content copied to clipboard');
      }).catch(()=>{ alert('Copy failed') });
    });

    // small timestamp
    const ts = el.querySelector('.timestamp');
    ts.textContent = timeAgo(p.created);

    // return
    return el;
  }

  function handleViewClick(e){
    const like = e.target.closest('.like-btn');
    const comment = e.target.closest('.comment-btn');
    if(like || comment){
      // handled individually already by makePostCard
      return;
    }
    const postCard = e.target.closest('.post-card');
    if(postCard && e.target.classList.contains('post-image')) {
      // image clicked, open a simple viewer (new tab)
      window.open(e.target.src, '_blank');
    }
  }

  // Image select preview
  function handleImageSelect(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(evt){
      $('#imgPreview').src = evt.target.result;
      $('#imgPreviewWrap').classList.remove('hidden');
      $('#imgPreviewWrap').dataset.img = evt.target.result;
    }
    reader.readAsDataURL(file);
  }

  // Open create modal
  function openCreate(){
    $('#postText').value = '';
    $('#charCount').textContent = '0 / 300';
    $('#postImage').value = '';
    $('#imgPreviewWrap').classList.add('hidden');
    $('#createModal').classList.remove('hidden');
  }

  function closeModal(modal){
    if(!modal) return;
    modal.classList.add('hidden');
  }

  // Publish post
  function publishPost(){
    const text = $('#postText').value.trim();
    const img = $('#imgPreviewWrap')?.dataset?.img || '';
    if(!text && !img){ alert('Add text or image'); return; }
    addPost({ text, img });
    closeModal($('#createModal'));
    // render feed view again
    if(state.view === 'feed') mountView('feed');
    notify('Post published');
    updateMiniChart();
  }

  // Add post to state
  function addPost({ text='', img='' }){
    const post = {
      id: genId(), user: state.user.name, avatar: state.user.avatar,
      text, img, likes: 0, comments: [], created: Date.now(), saved:false
    };
    state.posts.push(post);
    saveState();
  }

  // Comments modal
  function openComments(post, anchorBtn){
    state.activePost = post;
    const cm = $('#commentModal');
    cm.classList.remove('hidden');
    const body = $('#commentBody');
    body.innerHTML = '';
    (post.comments||[]).forEach(c => {
      const el = document.createElement('div');
      el.style.padding = '8px 0';
      el.innerHTML = `<strong>${c.user}</strong> <span class="muted small">${timeAgo(c.time)}</span><div>${c.text}</div>`;
      body.appendChild(el);
    });
    $('#commentInput').value = '';
    $('#sendComment').onclick = () => {
      const txt = $('#commentInput').value.trim();
      if(!txt) return;
      const newC = { id: genId(), user: state.user.name, text: txt, time: Date.now() };
      post.comments = post.comments || [];
      post.comments.push(newC);
      saveState();
      openComments(post); // refresh modal
      notify(`${state.user.name} commented`);
      updateMiniChart();
    };
  }

  // Notifications (simple)
  function notify(text){
    const n = { id: genId(), text, time: Date.now() };
    state.notifications.unshift(n);
    saveState();
    updateNotifDropdown();
  }

  function updateNotifDropdown(){
    const dd = $('#notifDropdown');
    dd.innerHTML = '';
    if(state.notifications.length === 0) {
      dd.innerHTML = '<div class="small-card muted">No notifications</div>';
    } else {
      state.notifications.slice(0,6).forEach(n => {
        const el = document.createElement('div');
        el.className = 'small-card';
        el.style.margin = '8px';
        el.innerHTML = `<div class="muted small">${timeAgo(n.time)}</div><div>${n.text}</div>`;
        dd.appendChild(el);
      });
    }
    updateNotifBadge();
  }

  function toggleNotifDropdown(){
    const dd = $('#notifDropdown');
    dd.classList.toggle('hidden');
  }
  function updateNotifBadge(){
    const badge = $('#notifBadge');
    const count = state.notifications.length;
    if(!badge) return;
    if(count>0){ badge.textContent = count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }

  // Theme
  function initTheme(){
    const t = localStorage.getItem('ss_theme') || 'light';
    if(t === 'dark') document.body.classList.add('dark');
  }
  function toggleTheme(){
    document.body.classList.toggle('dark');
    const dark = document.body.classList.contains('dark');
    localStorage.setItem('ss_theme', dark ? 'dark' : 'light');
  }

  // Mini profile render
  function renderMiniProfile(){
    $('#miniName').textContent = state.user.name;
    $('#miniBio').textContent = state.user.bio;
    $('#miniAvatar').src = state.user.avatar;
  }

  // Suggestions: dummy users
  function renderSuggestions(){
    const el = $('#suggestions');
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

  // Time ago helper
  function timeAgo(ts){
    if(!ts) return '';
    const s = Math.floor((Date.now()-ts)/1000);
    if(s < 60) return `${s}s`;
    if(s < 3600) return `${Math.floor(s/60)}m`;
    if(s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}d`;
  }

  // heart animation
  function animateHeart(btn){
    btn.animate([{ transform:'scale(1)' }, { transform:'scale(1.25)' }, { transform:'scale(1)' }], { duration:380, easing:'ease-out' });
  }

  // mini chart using Chart.js
  let chart;
  function initMiniChart(){
    const ctx = document.getElementById('miniChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'bar',
      data: { labels: ['Posts','Likes','Comments'], datasets: [{ label:'Stats', data:getStats(), backgroundColor:['rgba(91,108,255,0.8)','rgba(240,58,127,0.8)','rgba(107,115,255,0.6)'] }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
    });
  }
  function getStats(){
    const posts = state.posts.length;
    const likes = state.posts.reduce((s,p)=>s+(p.likes||0),0);
    const comments = state.posts.reduce((s,p)=>s+(p.comments?.length||0),0);
    return [posts, likes, comments];
  }
  function updateMiniChart(){ if(chart){ chart.data.datasets[0].data = getStats(); chart.update(); } }

  // Expose for initial mount
  window.addPost = addPost;

  // init!
  init();
})();

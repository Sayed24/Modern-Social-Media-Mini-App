// ===================== MOCK LOGIN =====================
const loginPage = document.getElementById("loginPage");
const mainPage = document.getElementById("mainPage");
const loginBtn = document.getElementById("loginBtn");
const loginUsername = document.getElementById("loginUsername");
const displayUser = document.getElementById("displayUser");

// Auto-login if user already saved
if (localStorage.getItem("sadatUser")) {
  showMain();
}

loginBtn.addEventListener("click", () => {
  const user = loginUsername.value.trim();
  if (!user) return;

  localStorage.setItem("sadatUser", user);
  showMain();
});

function showMain() {
  displayUser.textContent = localStorage.getItem("sadatUser");
  loginPage.classList.add("hidden");
  mainPage.classList.remove("hidden");
}


// ===================== THEME SWITCH =====================
document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});


// ===================== CREATE POSTS =====================
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const feed = document.getElementById("feed");

let imageData = null;

postBtn.addEventListener("click", () => {
  const text = postText.value.trim();
  if (!text && !imageData) return;

  createPost(text, imageData);
  postText.value = "";
  imageData = null;
});


// ===================== DRAG & DROP IMAGE =====================
const dropZone = document.getElementById("dropZone");
const imageUpload = document.getElementById("imageUpload");

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  readImage(file);
});

imageUpload.addEventListener("change", () => {
  readImage(imageUpload.files[0]);
});

function readImage(file) {
  const reader = new FileReader();
  reader.onload = () => { imageData = reader.result; };
  reader.readAsDataURL(file);
}


// ===================== POST TEMPLATE =====================
function createPost(text, image) {
  const post = document.createElement("div");
  post.className = "post";

  post.innerHTML = `
    <p>${text}</p>
    ${image ? `<img src="${image}" />` : ""}
  `;

  feed.prepend(post);
}


// ===================== CLIENT-SIDE SEARCH =====================
document.getElementById("searchInput").addEventListener("input", (e) => {
  const value = e.target.value.toLowerCase();
  const posts = document.querySelectorAll(".post");

  posts.forEach(post => {
    post.style.display = post.textContent.toLowerCase().includes(value)
      ? "block"
      : "none";
  });
});

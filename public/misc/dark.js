document.getElementById("light").onclick = darkMode;
document.getElementById("dark").onclick = darkMode;

document.querySelectorAll('li').forEach(item => {
  item.addEventListener('click', darkMode);
});

function darkMode() {
  let body = document.querySelector('body');
  let mode = this.dataset.mode;
  body.dataset.theme = mode;
}
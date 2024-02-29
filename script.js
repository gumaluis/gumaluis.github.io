const WIDTH = document.body.clientWidth;
const HEIGHT = document.body.clientHeight;
const BTN_H_MAR = 90;
const BTN_W_MAR = 120;
let count = 0;

function random(nobtn) {
  nobtn.style.position = "absolute";
  let randomH = Math.random() * HEIGHT + BTN_H_MAR;
  let randomW = Math.random() * WIDTH + BTN_W_MAR;
  //Adjusting sizes for preventing offscreens
  randomW = adjustW(randomW);
  randomH = adjustH(randomH);
  nobtn.style.top = `${randomH}px`;
  nobtn.style.right = `${randomW}px`;
  count++;
  if (count >= 10) {
    document.getElementById("yesbtn").classList.add("ics");
    let interval = setInterval(() => {
      nobtn.style.opacity = count / 10;
      count--;
      if (count <= 0) {
        nobtn.style.display = "none";
        clearInterval(interval);
      }
    }, 10);
  }
}

function adjustW(rW) {
  if (rW <= BTN_W_MAR) rW = BTN_W_MAR;
  else if (rW >= WIDTH - BTN_W_MAR) rW = WIDTH - BTN_W_MAR;
  return rW;
}

function adjustH(rH) {
  if (rH <= BTN_H_MAR) rH = BTN_H_MAR;
  else if (rH >= WIDTH - BTN_H_MAR) rH = WIDTH - BTN_H_MAR;
  return rH;
}

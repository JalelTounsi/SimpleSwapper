const qs = require("qs");
const Web3 = require("Web3");
const { default: BigNumber } = require("bignumber.js");

let currentTrade = {};
let currentSelectSide;
let tokens;

async function init() {
  await listAvailableTokens();
  document.getElementById("from_amount").value = 0;
  document.getElementById("to_amount").value = 0;
  document.getElementById("from_amount").placeholder = "Amount";
  document.getElementById("to_amount").placeholder = "Amount";

  document.getElementById("from_token_img").setAttribute("hidden", "hidden");
  document.getElementById("to_token_img").setAttribute("hidden", "hidden");
}

async function listAvailableTokens() {
  console.log("initializing");
  // Create token list for modal
  let tokenListJSON = require("./tokenslist.json");
  let tokens = tokenListJSON.tokens;
  let parent = document.getElementById("token_list");
  for (const i in tokens) {
    // Token row in the modal token list
    let div = document.createElement("div");
    div.className = "token_row";
    let html = `
        <img class="token_list_img" src="${tokens[i].logoURI}" >
          <span class="token_list_text">${tokens[i].symbol}</span>
          `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(tokens[i]);
    };
    parent.appendChild(div);
  }
}

async function selectToken(token) {
  closeModal();
  currentTrade[currentSelectSide] = token;
  console.log("currentTrade: ", currentTrade);
  renderInterface();
}

function renderInterface() {
  if (currentTrade.from) {
    console.log(currentTrade.from);
    document.getElementById("from_token_img").src = currentTrade.from.logoURI;
    document.getElementById("from_token_text").innerHTML =
      currentTrade.from.symbol;
    document.getElementById("from_token_img").removeAttribute("hidden");
  }
  if (currentTrade.to) {
    console.log(currentTrade.to);
    document.getElementById("to_token_img").src = currentTrade.to.logoURI;
    document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    document.getElementById("to_token_img").removeAttribute("hidden");
  }
}

async function connect() {
  if (typeof window.ethereum !== "undefined") {
    try {
      console.log("connecting");
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      document.getElementById("login_button").innerHTML = "You are Connected";
      $("#login_button").removeClass("btn-primary").addClass("btn-success");
      document.getElementById("swap_button").disabled = false;
      console.log("connected");
      console.log("account: ", accounts[0]);
      const accountPlaceholder = document.getElementById("accountPlaceholder");
      const wrapper = document.createElement("div");
      wrapper.innerHTML = [`${accounts[0]}`].join("");

      accountPlaceholder.append(wrapper);
      document.getElementById("login_button").disabled = true;
    } catch (error) {
      console.log(error);
    }
  } else {
    document.getElementById("login_button").innerHTML =
      "Please install MetaMask";
  }
}

function openModal(side) {
  currentSelectSide = side;
  document.getElementById("token_modal").style.display = "block";
}

function closeModal() {
  document.getElementById("token_modal").style.display = "none";
}

async function getPrice() {
  console.log("Getting Price");

  if (
    !currentTrade.from ||
    !currentTrade.to ||
    !document.getElementById("from_amount").value
  )
    return;

  let amount = Number(
    document.getElementById("from_amount").value *
      10 ** currentTrade.from.decimals
  );

  const params = {
    sellToken: currentTrade.from.address,
    buyToken: currentTrade.to.address,
    sellAmount: amount,
  };

  // Fetch the swap price.
  const response = await fetch(
    `https://api.0x.org/swap/v1/price?${qs.stringify(params)}`
  );

  swapPriceJSON = await response.json();
  console.log("Price: ", swapPriceJSON);

  document.getElementById("to_amount").value =
    swapPriceJSON.buyAmount / 10 ** currentTrade.to.decimals;
  document.getElementById("gas_estimate").innerHTML =
    swapPriceJSON.estimatedGas;
}

async function getQuote(account) {
  console.log("Getting Quote");

  if (
    !currentTrade.from ||
    !currentTrade.to ||
    !document.getElementById("from_amount").value
  )
    return;
  let amount = Number(
    document.getElementById("from_amount").value *
      10 ** currentTrade.from.decimals
  );

  const params = {
    sellToken: currentTrade.from.address,
    buyToken: currentTrade.to.address,
    sellAmount: amount,
    takerAddress: account,
  };

  // Fetch the swap quote.
  const response = await fetch(
    `https://api.0x.org/swap/v1/quote?${qs.stringify(params)}`
  );

  swapQuoteJSON = await response.json();
  console.log("Quote: ", swapQuoteJSON);

  document.getElementById("to_amount").value =
    swapQuoteJSON.buyAmount / 10 ** currentTrade.to.decimals;
  document.getElementById("gas_estimate").innerHTML =
    swapQuoteJSON.estimatedGas;

  return swapQuoteJSON;
}

async function trySwap() {
  const erc20abi = require("./erc20.abi.json");
  console.log("trying swap");

  // Only work if MetaMask is connect
  // Connecting to Ethereum: Metamask
  web3 = new Web3(Web3.givenProvider);

  // The address, if any, of the most recently used account that the caller is permitted to access
  let accounts = await ethereum.request({ method: "eth_accounts" });
  let takerAddress = accounts[0];
  console.log("takerAddress: ", takerAddress);

  const swapQuoteJSON = await getQuote(takerAddress);

  // Set Token Allowance
  // Set up approval amount
  const fromTokenAddress = currentTrade.from.address;
  const maxApproval = new BigNumber(2).pow(256).minus(1);
  console.log("approval amount: ", maxApproval);
  const ERC20TokenContract = new web3.eth.Contract(erc20abi, fromTokenAddress);
  console.log("setup ERC20TokenContract: ", ERC20TokenContract);

  // Grant the allowance target an allowance to spend our tokens.
  const tx = await ERC20TokenContract.methods
    .approve(swapQuoteJSON.allowanceTarget, maxApproval)
    .send({ from: takerAddress })
    .then((tx) => {
      console.log("tx: ", tx);
    });

  // Perform the swap
  const receipt = await web3.eth.sendTransaction(swapQuoteJSON);
  console.log("receipt: ", receipt);
}

function darkMode() {
  let body = document.querySelector("body");
  let mode = this.dataset.mode;
  console.log(mode);
  body.dataset.theme = mode;
}

init();

document.getElementById("login_button").onclick = connect;
document.getElementById("from_token_select").onclick = () => {
  openModal("from");
};
document.getElementById("to_token_select").onclick = () => {
  openModal("to");
};
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_amount").onblur = getPrice;
document.getElementById("swap_button").onclick = trySwap;

// document.getElementById("light").onclick = darkMode;
// document.getElementById("dark").onclick = darkMode;

document.getElementById("theme").onclick = changeTheme;

// function darkMode() {
//   let body = document.querySelector("body");
//   let mode = this.dataset.mode;
//   console.log("1 - this.dataset.mode", mode);
//   body.dataset.theme = mode;
//   console.log("2 - body.dataset.theme", body.dataset.theme);
// }

document.getElementById("check_darkmode").ontoggle = checkDarMode();

function checkDarMode() {
  let body = document.querySelector("body");
  console.log("0 - present body.dataset.theme", body.dataset.theme);
  if ((document.getElementById("check_darkmode").checked = true)) {
    body.dataset.theme = "dark";
    console.log("1 - dark?", body.dataset.theme);
  }
  if ((document.getElementById("check_darkmode").checked = false)) {
    body.dataset.theme = "light";
    console.log("2 - light?", body.dataset.theme);
  }
}
function changeTheme() {
  let body = document.querySelector("body");
  console.log("0 - present body.dataset.theme", body.dataset.theme);
  if (body.dataset.theme === "light") {
    body.dataset.theme = "dark";
    document.getElementById("change-theme-img").src = "./images/light.png";
  } else {
    body.dataset.theme = "light";
    document.getElementById("change-theme-img").src = "./images/dark.png";
  }
  //body.dataset.theme = body.dataset.theme === "dark" ? "light": "dark";
  console.log("1 - future body.dataset.theme", body.dataset.theme);
}

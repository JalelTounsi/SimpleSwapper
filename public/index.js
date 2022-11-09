const qs = require("qs");
const Web3 = require("Web3");
const { default: BigNumber } = require("bignumber.js");

let currentTrade = {};
let currentSelectSide;
let tokens;

async function init() {
  await listAvailableTokens();
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
        <img class="token_list_img" src="${tokens[i].logoURI}">
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
  }
  if (currentTrade.to) {
    console.log(currentTrade.to);
    document.getElementById("to_token_img").src = currentTrade.to.logoURI;
    document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
  }
}

async function connect() {
  if (typeof window.ethereum !== "undefined") {
    try {
      console.log("connecting");
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      document.getElementById("login_button").innerHTML = "Connected";
      $("#login_button").removeClass("btn-primary").addClass("btn-success");
      document.getElementById("swap_button").disabled = false;
      console.log("connected");
      console.log("account: ", accounts[0]);
      const accountPlaceholder = document.getElementById("accountPlaceholder");
      const wrapper = document.createElement("div");
      wrapper.innerHTML = [
        `<div class="alert alert-success alert-dismissible fade show" role="alert">`,
        `   <div>${accounts[0]}</div>`,
        "</div>",
      ].join("");

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

  updateTokenPairPrice();
  printTokenPairChart();
  document.getElementById("charts_title").innerHTML =
    currentTrade.from.symbol + "\\" + currentTrade.to.symbol;
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
  const web3 = new Web3(Web3.givenProvider);

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

//for the charts!!

///  Calling API and modeling data for each chart ///

const TokenPairData = async () => {
  const sellToken = currentTrade.from.symbol;
  const buyToken = currentTrade.to.symbol;

  console.log("sell: ", currentTrade.from.symbol);
  console.log("buy: ", currentTrade.to.symbol);
  const response = await fetch(
    `https://min-api.cryptocompare.com/data/v2/histominute?fsym=${sellToken}&tsym=${buyToken}&limit=119&api_key=0646cc7b8a4d4b54926c74e0b20253b57fd4ee406df79b3d57d5439874960146`
  );
  //const response = await fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=LINK&tsym=DAI&limit=119&api_key=0646cc7b8a4d4b54926c74e0b20253b57fd4ee406df79b3d57d5439874960146`);

  const json = await response.json();
  const data = json.Data.Data;
  console.log("data: ", json.Data.Data);
  const times = data.map((obj) => obj.time);
  const prices = data.map((obj) => obj.high);
  return {
    times,
    prices,
  };
};

/// Error handling ///
function checkStatus(response) {
  if (response.ok) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(new Error(response.statusText));
  }
}

async function printTokenPairChart() {
  let { times, prices } = await TokenPairData();
  let TokenPairChart = document
    .getElementById("TokenPairChart")
    .getContext("2d");

  let gradient = TokenPairChart.createLinearGradient(0, 0, 0, 400);

  gradient.addColorStop(0, "rgba(78,56,216,.5)");
  gradient.addColorStop(0.425, "rgba(118,106,192,0)");

  Chart.defaults.global.defaultFontFamily = "Red Hat Text";
  Chart.defaults.global.defaultFontSize = 12;
  createTokenPairChart = new Chart(TokenPairChart, {
    type: "line",
    data: {
      labels: times,
      xValueType: "dateTime",
      datasets: [
        {
          //label: "$",
          data: prices,
          backgroundColor: gradient,
          borderColor: "rgba(118,106,192,1)",
          borderJoinStyle: "round",
          borderCapStyle: "round",
          borderWidth: 3,
          pointRadius: 0,
          pointHitRadius: 10,
          lineTension: 0.2,
        },
      ],
    },

    options: {
      title: {
        display: false,
        text: "Simple Swapper Chart!",
        fontSize: 35,
      },

      legend: {
        display: false,
      },

      layout: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },

      scales: {
        xAxes: [
          {
            display: true,
            gridLines: {},
          },
        ],
        yAxes: [
          {
            display: true,
            gridLines: {},
          },
        ],
      },

      tooltips: {
        callbacks: {
          //This removes the tooltip title
          title: function () {},
        },
        //this removes legend color
        displayColors: false,
        yPadding: 10,
        xPadding: 10,
        position: "nearest",
        caretSize: 10,
        backgroundColor: "rgba(255,255,255,.9)",
        bodyFontSize: 15,
        bodyFontColor: "#303030",
      },
    },
  });
}

/// Update current price ///
async function updateTokenPairPrice() {
  let { times, prices } = await TokenPairData();
  let currentPrice = prices[prices.length - 1].toFixed(2);

  document.getElementById("ethPrice").innerHTML = currentPrice;
}

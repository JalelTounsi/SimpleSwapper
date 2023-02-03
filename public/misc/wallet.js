const Web3 = require("Web3");

async function connect() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const web3 = new Web3(Web3.givenProvider);
      const accounts = await ethereum.request({method: "eth_requestAccounts"});
      // get account
      const address = accounts[0];
      // get network (simple / straitforward / hacky)
      const _network = window.ethereum.networkVersion;
      const network = _network === "1" ? "mainnet" : _network === "5" ? "goerli" : _network === "11155111" ? "sepolia" : "undefined"
      // get balance
      web3.eth.getBalance(address, (error, balance) => {
        if (error) { console.error(error);} 
        else {
          // display the balance in ETH
          document.getElementById("balance").innerHTML = `Balance: ${(balance/10**18)} ETH`;
          // display the wallet address
          document.getElementById("address").innerHTML = `Address: ${address}`;
          // display the network
          document.getElementById("network").innerHTML = `Network: ${network}`;
        }
      });
    } catch (error) {
      console.log(error);
    }
  }
}

connect();

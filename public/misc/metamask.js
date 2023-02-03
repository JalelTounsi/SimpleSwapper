const Web3 = require("Web3");
if (typeof window.ethereum !== 'undefined') {
    console.log('MetaMask is installed!');
  }
  else {
    console.log('MetaMask is not installed');
  }
  
const { ethers } = require('ethers')
const UniswapSDK = require('uniswap-sdk')
const { UniswapDapp } = require('@uniswap/dapp')

async function main() {
  // Set the provider (e.g. Infura)
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)

  // Set the contract addresses (e.g. Mainnet addresses)
  const uniswapFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
  const uniswapRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

  // Initialize the UniswapSDK
  const uniswap = new UniswapSDK(provider, {
    factoryAddress: uniswapFactoryAddress,
    routerAddress: uniswapRouterAddress
  })

  // Set the contract instances
  const factory = uniswap.factory
  const router = uniswap.router

  // Set the token addresses (e.g. ETH and DAI)
  const tokenA = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  const tokenB = '0x6B175474E89094C44Da98b954EedeAC495271d0F'

  // Call the getPair function to get the pair address
  const pairAddress = await router.getPair(tokenA, tokenB)

  // Call the getReserves function to get the balance of each token in the pair
  const reserves = await uniswap.getReserves(pairAddress)
  console.log(reserves) // { tokenA: 100, tokenB: 50 }

  // Call the getPrice function to get the price of token B in terms of token A
  const price = await uniswap.getPrice(tokenA, tokenB)
  console.log(price) // 1.2

  // Use the UniswapDapp to create a swap form
  const swap = new UniswapDapp(router, tokenA, tokenB)
  const form = swap.form()
  form.on('swap', function(output, input) {
    console.log(`You swapped ${output.amount} ${output.token.symbol} for ${input.amount} ${input.token.symbol}`)
  })
}

main()

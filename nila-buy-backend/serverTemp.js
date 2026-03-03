const { ethers } = require("ethers")
const { TronWeb } = require("tronweb")

const erc20Data = require("./data")   // Ethereum USDT
const trc20Data = require("./data2")  // Tron USDT

/*************************
 * ETHEREUM (ERC20)
 *************************/

// WebSocket provider is REQUIRED for real-time events
const ethProvider = new ethers.WebSocketProvider(
  "wss://eth-mainnet.g.alchemy.com/v2/ATMRDOeJN88OXeJOJyif6JYKUG-CcR1h"
)

async function listenERC20Transfers() {
  if (!erc20Data.address || !erc20Data.abi) {
    console.log("ERC20 data not configured yet")
    return
  }

  const token = new ethers.Contract(
    erc20Data.address,
    erc20Data.abi,
    ethProvider
  )

token.on("Transfer", (from, to, value, log) => {
  const amount = ethers.formatUnits(value, 6)

  console.log("🔵 ERC20 Transfer Detected")
  console.log(`From   : ${from}`)
  console.log(`To     : ${to}`)
  console.log(`Amount : ${amount} USDT`)
  console.log(`TxHash : ${log.transactionHash}`)
  console.log("──────────────────────────")
})

}

/*************************
 * TRON (TRC20)
 *************************/

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io"
})

async function listenTRC20Transfers() {
  if (!trc20Data.address || !trc20Data.abi) {
    console.log("TRC20 data not configured yet")
    return
  }

  console.log("TRC20 listener started...")

  let lastTimestamp = Date.now()

  setInterval(async () => {
    try {
      const res = await tronWeb.getEventResult(
        trc20Data.address,
        {
          eventName: "Transfer",
          sinceTimestamp: lastTimestamp
        }
      )

      lastTimestamp = Date.now()

      const events = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : []

  for (const ev of events) {
  const from = tronWeb.address.fromHex(ev.result.from)
  const to = tronWeb.address.fromHex(ev.result.to)
  const amount = Number(ev.result.value) / 1_000_000

  const txHash =
    ev.transaction_id ||
    ev.transaction ||
    "N/A"

  console.log("🟢 TRC20 Transfer Detected")
  console.log(`From   : ${from}`)
  console.log(`To     : ${to}`)
  console.log(`Amount : ${amount} USDT`)
  console.log(`TxHash : ${txHash}`)
  console.log("──────────────────────────")
}

    } catch (err) {
      console.error("TRON error:", err.message)
    }
  }, 3000)
}


/*************************
 * START SERVER
 *************************/

async function start() {
  console.log("Listening for USDT transfers...\n")

  await listenERC20Transfers()
  await listenTRC20Transfers()
}

start()

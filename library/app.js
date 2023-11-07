const getDevices = require("./getDevices")
const SSHConnector = require("./sshConnector")

const { startSpinner, stopSpinner, updateSpinnerText } = require("./spinner")
const readline = require("readline")

function promptEnterKey() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question("請按下 Enter 鍵結束...", () => {
      rl.close()
      resolve()
    })
  })
}

async function main(device) {
  const spinner = startSpinner(`正在連接 ${device.host}...\n`)
  const sshConnector = new SSHConnector()
  try {
    //連接裝置
    await sshConnector.connect(device)

    //啟動會話及執行命令
    await sshConnector.startShell()
    sshConnector.sendCommand("dir")
    await sshConnector.waitForPrompt("bumble@BUMBLE_G14 C:\\Users\\Bumble>")

    //取得輸出
    const output = sshConnector.getOutput()
    console.log(`來自 ${device.host} 的輸出:`)
    console.log(output)
  } catch (error) {
    console.error("SSH 錯誤: ", error)
    stopSpinner(spinner, `連接 ${device.host} 時出錯`, false)
  } finally {
    sshConnector.endShell()
    stopSpinner(spinner, `${device.host} 命令執行完成。\n`)
  }
}

async function handleDevices(devices) {
  try {
    const promises = devices.map((device) => main(device))
    await Promise.all(promises)
    console.log("所有裝置處理完成。")
  } finally {
    await promptEnterKey()
    process.exit(0)
  }
}

handleDevices(getDevices())

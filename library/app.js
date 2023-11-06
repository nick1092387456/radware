const getDevices = require("./getDevices")
const SSHConnector = require("./sshModule")
const { startSpinner, stopSpinner, updateSpinnerText } = require("./spinner")
const readline = require("readline")

// 等待使用者按下 Enter 鍵
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
  let spinner
  try {
    spinner = startSpinner(`正在連接 ${device.host}...\n`)
    const sshConnector = new SSHConnector()
    const output = await sshConnector.executeCommand(device, "-help\n")
    updateSpinnerText(spinner, `連接上 ${device.host}, 執行命令中...\n`)
    console.log(`來自 ${device.host} 的輸出:`)
    console.log(output)
  } catch (error) {
    console.error("SSH 錯誤: ", error)
    if (spinner) {
      stopSpinner(spinner, `連接 ${device.host} 時出錯`, false)
    }
  } finally {
    if (spinner) {
      stopSpinner(spinner, `${device.host} 命令執行完成。`)
    }
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

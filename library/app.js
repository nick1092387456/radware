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

    rl.question("請按下 Enter 鍵結束...\n", () => {
      rl.close()
      resolve()
    })
  })
}

function updateGlobalSpinner(spinner, devices) {
  const texts = devices.map(
    (device, index) =>
      `${index > 0 ? "  " : ""}${device.host} ${
        globalSpinnerState[device.host] || "等待中..."
      }`
  )
  updateSpinnerText(spinner, texts.filter(Boolean).join("\n"))
}

async function simulateDelay(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

let globalSpinnerState = {}
async function main(device, spinner) {
  globalSpinnerState[device.host] = `正在連接...`
  updateGlobalSpinner(spinner, getDevices())

  const sshConnector = new SSHConnector()
  try {
    // 模擬連接延遲
    await simulateDelay(3000)
    await sshConnector.connect(device)

    // 模擬命令執行延遲
    await simulateDelay(3000)
    await sshConnector.startShell()
    sshConnector.sendCommand("dir")
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    globalSpinnerState[device.host] = `${device.host} 命令執行完成。\n`
    updateGlobalSpinner(spinner, getDevices())

    const output = sshConnector.getOutput()
    console.log(`\n來自 ${device.host} 的輸出:\n`)
    console.log(output)
  } catch (error) {
    console.error("SSH 錯誤: ", error)
    globalSpinnerState[device.host] = `連接 ${device.host} 時出錯\n`
    updateGlobalSpinner(spinner, getDevices())
  } finally {
    sshConnector.endShell()
  }
}

async function handleDevices(devices) {
  const spinner = startSpinner("處理中...\n")
  try {
    const promises = devices.map((device) => main(device, spinner))
    await Promise.all(promises)
  } catch (error) {
    console.error("處理裝置時出錯: ", error)
  } finally {
    stopSpinner(spinner, "所有裝置處理完成。\n")
    await promptEnterKey()
    process.exit(0)
  }
}

handleDevices(getDevices())

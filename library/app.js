const getDevices = require("./getDevices")
const SSHConnector = require("./sshConnector")
const { parseCSV } = require("./csvParser")
const {
  startSSHConfigClipboard,
  genDeleteFeature,
  genDeleteFilter,
  buildAttribute,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  setCommand,
  stopSSHConfigClipboard,
  cleanString,
} = require("./commandGenerator")
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

async function processDeleteCommands(sshConnector, urlList, initialId) {
  for (const url of urlList) {
    // 發送刪除特徵指令
    const deleteFeatureCommand = genDeleteFeature(initialId++)
    sshConnector.sendCommand(deleteFeatureCommand)
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
    // 發送刪除過濾器指令
    sshConnector.sendCommand(genDeleteFilter(url))
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
  }
}

async function processAddCommand(sshConnector, urlList, listName, initialId) {
  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i]
    sshConnector.sendCommand(buildFilterCommand(url))
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
    sshConnector.sendCommand(
      buildFeatureCommand(url, `${listName}.csv`, initialId)
    )
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
    sshConnector.sendCommand(packCommand(initialId))
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
    initialId++
  }
  return initialId // 回傳更新後的 initialId
}

let globalSpinnerState = {}
async function main(device, spinner, urlLists) {
  globalSpinnerState[device.host] = `處理中...`
  updateGlobalSpinner(spinner, getDevices())

  const sshConnector = new SSHConnector()
  try {
    if (process.env.TEST_MODE === "true") await simulateDelay(3000)
    await sshConnector.connect(device)

    if (process.env.TEST_MODE === "true") await simulateDelay(3000)
    await sshConnector.startShell()

    // 初始指令
    const initialCommand = []
    initialCommand.push(buildAttribute())
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    // 先刪除
    await processDeleteCommands(sshConnector, urlLists.hinet, 300001)
    await processDeleteCommands(
      sshConnector,
      urlLists.gsn,
      urlLists.hinet.length + 300001
    )

    // 在寫入
    await processAddCommand(
      sshConnector,
      urlLists.hinet,
      "Hinet清單.csv",
      300001
    )
    await processAddCommand(
      sshConnector,
      urlLists.gsn,
      "GSN清單.csv",
      urlLists.hinet.length + 300001
    )

    // 設定update指令
    sshConnector.sendCommand(setCommand())
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    globalSpinnerState[device.host] = `命令執行完成。\r\n`
    updateGlobalSpinner(spinner, getDevices())

    // 取得輸出
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
    const urlLists = {
      hinet: await parseCSV("Hinet清單.csv"),
      gsn: await parseCSV("GSN清單.csv"),
    }
    const promises = devices.map((device) => main(device, spinner, urlLists))
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

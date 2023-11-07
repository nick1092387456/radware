const getDevices = require("./getDevices")
const SSHConnector = require("./sshConnector")
const copyCsvToBackup = require("./backupCSVForNextTimeDelete")
const { startSpinner, stopSpinner, updateSpinnerText } = require("./spinner")
const { parseCSV } = require("./csvParser")
const { createLog } = require("./logger")
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

async function processAddCommand(
  sshConnector,
  urlList,
  listName,
  initialId,
  spinner,
  deviceHost
) {
  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i]
    // 更新 Spinner 文字為當前 URL 處理狀態
    globalSpinnerState[deviceHost] = `正在處理: ${url}`
    updateGlobalSpinner(spinner, getDevices())

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
  globalSpinnerState[deviceHost] = `所有 ${listName} 命令處理完成。`
  updateGlobalSpinner(spinner, getDevices())
  return initialId // 回傳更新後的 initialId
}

//讀取RadWare裝置中已設定的資料，並解析出ID與過濾器名稱
function getHistorySetting(output) {
  // Split input string into lines
  const lines = output.trim().split("\n")

  // Initialize arrays to hold IDs and Filter Names
  const ids = []
  const filterNames = []

  // Variable to keep track of the current parts of the Filter Name
  let currentFilterParts = []

  // Process each line
  for (const line of lines) {
    // Split line by whitespace
    const fields = line.trim().split(/\s+/)

    // If the line starts with a numeric ID, it's a new record
    if (fields.length > 0 && /^\d+$/.test(fields[0])) {
      if (currentFilterParts.length > 0) {
        // Join the current Filter Name parts and remove the initial 'F_'
        filterNames.push(currentFilterParts.join("").replace(/^F_/, ""))
        currentFilterParts = []
      }
      // Add the ID
      ids.push(fields[0])
    }

    // Detect Filter Name parts (starting with 'F_' or continuing from previous line)
    if (
      currentFilterParts.length > 0 ||
      fields.some((field) => field.startsWith("F_"))
    ) {
      // Add all parts after 'F_' or the entire line if we're already in the middle of a Filter Name
      const startIndex =
        currentFilterParts.length > 0
          ? 0
          : fields.findIndex((field) => field.startsWith("F_"))
      const parts = fields.slice(startIndex)

      // Check if the last part is a number (indicating the end of the Filter Name and start of Tracking Time)
      if (parts.length > 0 && /^\d+$/.test(parts[parts.length - 1])) {
        // If there's a number, all before it are part of the Filter Name
        currentFilterParts.push(...parts.slice(0, -1))
        // Join the current Filter Name parts, remove the initial 'F_', and reset
        filterNames.push(currentFilterParts.join("").replace(/^F_/, ""))
        currentFilterParts = []
      } else {
        // No number means the Filter Name continues
        currentFilterParts.push(...parts)
      }
    }
  }

  // Catch any trailing Filter Name parts in case the last line didn't end with an ID or a number
  if (currentFilterParts.length > 0) {
    filterNames.push(currentFilterParts.join("").replace(/^F_/, ""))
  }

  console.log("IDs:", ids)
  console.log("Filter Names:", filterNames)
  return { ids, filterNames }
}

async function processDeleteCommandsByGetHistorySettingOutput(
  sshConnector,
  urlList
) {
  const { ids, filterNames } = urlList
  for (const id of ids) {
    // 發送刪除特徵指令
    const deleteFeatureCommand = genDeleteFeature(id)
    sshConnector.sendCommand(deleteFeatureCommand)
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
  }
  for (const filterName of filterNames) {
    // 發送刪除過濾器指令
    sshConnector.sendCommand(genDeleteFilter(filterName))
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
  }
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

    // 再寫入
    await processAddCommand(
      sshConnector,
      urlLists.hinet,
      "Hinet清單.csv",
      300001,
      spinner,
      device.host
    )
    await processAddCommand(
      sshConnector,
      urlLists.gsn,
      "GSN清單.csv",
      urlLists.hinet.length + 300001,
      spinner,
      device.host
    )

    // 寫入設定生效指令
    sshConnector.sendCommand(setCommand())
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    globalSpinnerState[device.host] = `命令執行完成。\r\n`
    updateGlobalSpinner(spinner, getDevices())

    // 取得輸出
    const output = sshConnector.getOutput()
    if (process.env.TEST_MODE === "true") {
      console.log(`\n來自 ${device.host} 的輸出:\n`)
      console.log(output)
    }
    await createLog(output, device.host, "Log")
  } catch (error) {
    console.error("SSH 錯誤: ", error)
    globalSpinnerState[device.host] = `連接 ${device.host} 時出錯\n`
    updateGlobalSpinner(spinner, getDevices())
  } finally {
    copyCsvToBackup("./public/Hinet清單.csv", "./public/backup/")
    sshConnector.endShell()
  }
}

async function handleDevices(devices) {
  const spinner = startSpinner()
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

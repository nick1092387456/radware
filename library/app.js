const getDevices = require("./getDevices")
const SSHConnector = require("./sshConnector")
const copyCsvToBackup = require("./backupCSVForNextTimeDelete")
const { startSpinner, stopSpinner, updateSpinnerText } = require("./spinner")
const { parseCSV } = require("./csvParse")
const { createLog, appendErrorLogToCsv } = require("./logger")
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
const devices = getDevices()
let globalSpinnerState = {}

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
        globalSpinnerState[device.host]
      }`
  )
  updateSpinnerText(spinner, texts.join("\r\n"))
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
  let errorCount = 0 // 初始化錯誤計數器

  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i]
    let isErrorOccurred = false // 標記是否發生錯誤

    // 更新 Spinner 文字為當前 URL 處理狀態
    globalSpinnerState[deviceHost] = `正在處理: ${url}`
    updateGlobalSpinner(spinner, devices)

    // 嘗試執行 SSH 命令並檢查其成功與否
    sshConnector.sendCommand(buildFilterCommand(url))
    if (!(await sshConnector.waitForPrompt("Created successfully"))) {
      isErrorOccurred = true // 如果任務失敗，標記錯誤發生
    }

    sshConnector.sendCommand(
      buildFeatureCommand(url, `${listName}.csv`, initialId)
    )
    if (
      !isErrorOccurred &&
      !(await sshConnector.waitForPrompt("Created successfully"))
    ) {
      isErrorOccurred = true
    }

    sshConnector.sendCommand(packCommand(initialId))
    if (
      !isErrorOccurred &&
      !(await sshConnector.waitForPrompt("Created successfully"))
    ) {
      isErrorOccurred = true
    }

    if (isErrorOccurred) {
      errorCount++ // 增加錯誤計數
      await appendErrorLogToCsv(url, deviceHost, "Error") // 寫入錯誤日誌
    }
    initialId++
  }

  // 返回更新后的 initialId 和錯誤計數
  return { initialId, errorCount }
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

async function main(device, spinner, urlLists) {
  globalSpinnerState[device.host] = `處理中...`
  updateGlobalSpinner(spinner, devices)

  const sshConnector = new SSHConnector(device)
  let errorOccurred = false // 新增錯誤標記
  try {
    if (process.env.TEST_MODE === "true") await simulateDelay(3000)
    await sshConnector.connect()

    if (process.env.TEST_MODE === "true") await simulateDelay(3000)
    await sshConnector.startShell()

    // 初始指令
    const initialCommand = []
    initialCommand.push(buildAttribute())
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    // 先刪除
    const historyHinetList = await parseCSV(
      "Hinet清單_backup.csv",
      "./public/backup"
    )
    await processDeleteCommands(sshConnector, historyHinetList, 300001)
    const historyGsnList = await parseCSV(
      "GSN清單_backup.csv",
      "./public/backup"
    )
    await processDeleteCommands(
      sshConnector,
      historyGsnList,
      historyGsnList.length + 300001
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
  } catch (error) {
    console.error("SSH 錯誤: ", error)
    errorOccurred = true
  } finally {
    if (errorOccurred) {
      copyCsvToBackup("./public/Hinet清單.csv", "./public/backup/")
      copyCsvToBackup("./public/GSN清單.csv", "./public/backup/")
    }
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

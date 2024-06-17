const getDevices = require("./getDevices")
const SSHConnector = require("./sshConnector")
const { startSpinner, stopSpinner, updateSpinnerText } = require("./spinner")
const { parseCSV } = require("./csvParse")
const { createLog, appendLogToCsv } = require("./logger")
const {
  genDeleteFeature,
  genDeleteFilter,
  initialCommand,
  stopSystemConfigPaste,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  setCommand,
} = require("./commandGenerator")
const inquirer = require("inquirer")

async function selectFunction() {
  let devices = []
  try {
    devices = getDevices()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }

  const choices = [
    { name: "．刪除所有URL清單", value: "deleteHistory" },
    { name: "．寫入URL清單", value: "main" },
    { name: "．解釋選項一及選項二", value: "explainOptions" },
    { name: "．離開", value: "exit" },
  ]

  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "function",
      message: "請選擇要執行的功能: ",
      choices: choices,
    },
  ])

  switch (answer.function) {
    case "main":
      const urlLists = {
        hinet: await parseCSV("Hinet清單.csv"),
        gsn: await parseCSV("GSN清單.csv"),
      }
      await handleDevices(devices, main, urlLists)
      break
    case "deleteHistory":
      const deleteAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "deleteCount",
          message: "請輸入要刪除的數量: ",
          validate: function (value) {
            const valid = !isNaN(parseInt(value))
            return valid || "請輸入一個有效的數字"
          },
          filter: Number,
        },
      ])
      await handleDevices(
        devices,
        deleteHistory,
        null,
        deleteAnswer.deleteCount
      )
    case "explainOptions":
      console.log(
        "  選項一：刪除所有URL設定 - 此選項將從系統中刪除所有URL相關設定。"
      )
      console.log(
        "  選項二：寫入URL清單 - 將public資料夾中的'Hinet清單.csv'及'GSN清單.csv'寫入系統。(執行前會先刪除所有URL設定)\n"
      )
      await selectFunction() // 重新調用 selectFunction 以返回主頁
      break
    case "exit":
      console.log("已退出程式。")
      process.exit(0)
      break
    default:
      console.log("未知的功能選擇")
  }
}

function promptEnterKey() {
  return inquirer.prompt([
    {
      type: "input",
      name: "enterKey",
      message: "請按下 Enter 鍵結束...",
    },
  ])
}

let globalSpinnerState = {}
function updateGlobalSpinner(spinner, device, state) {
  // 更新特定裝置的狀態
  globalSpinnerState[device.host] = state
  // 構建新的 spinner 文本，顯示所有裝置的狀態
  const texts = Object.entries(globalSpinnerState).map(
    ([host, st]) => `${host}: ${st}`
  )
  updateSpinnerText(spinner, texts.join("\r\n  "))
}

async function simulateDelay(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

async function processDeleteCommands(sshConnector, device, deleteCount) {
  for (let count = 300001; count < 300001 + deleteCount; count++) {
    // 發送刪除特徵指令
    await sshConnector.sendCommand(genDeleteFeature(count))
    if (!(await sshConnector.waitForPrompt("Deleted successfully")))
      appendLogToCsv(`${count}`, device.host, "featureDeleteError") // 寫入錯誤日誌
    // 發送刪除過濾器指令
    await sshConnector.sendCommand(genDeleteFilter(count))
    if (!(await sshConnector.waitForPrompt("Deleted successfully")))
      appendLogToCsv(`F_${count}`, device.host, "filterDeleteError") // 寫入錯誤日誌
  }
}

async function processAddCommand(
  sshConnector,
  urlList,
  listName,
  initialId,
  spinner,
  device
) {
  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i]
    let isErrorOccurred = false // 標記是否發生錯誤
    const serialNo = initialId

    // 更新 Spinner 文字為當前 URL 處理狀態
    updateGlobalSpinner(
      spinner,
      device,
      `正在處理: "${url}" ${listName} 第 ${i + 1} 筆`
    )

    // 嘗試執行 SSH 命令並檢查其成功與否
    await sshConnector.sendCommand(buildFilterCommand(url, serialNo))
    if (!(await sshConnector.waitForPrompt("Created successfully"))) {
      isErrorOccurred = true // 如果任務失敗，標記錯誤發生
    }

    await sshConnector.sendCommand(
      buildFeatureCommand(`${listName}.csv`, serialNo)
    )
    if (
      !isErrorOccurred &&
      !(await sshConnector.waitForPrompt("Created successfully"))
    ) {
      isErrorOccurred = true
    }

    await sshConnector.sendCommand(packCommand(serialNo))
    if (
      !isErrorOccurred &&
      !(await sshConnector.waitForPrompt("Created successfully"))
    ) {
      isErrorOccurred = true
    }

    if (isErrorOccurred) {
      // 只要有任何一個步驟失敗，就刪除新增的特徵碼，並將URL寫入錯誤日誌(如果是特徵碼新增失敗，可以照樣執行刪除，他只會說找不到無法刪除沒影響)
      const deleteFeatureCommand = genDeleteFeature(serialNo)
      await sshConnector.sendCommand(deleteFeatureCommand)
      await sshConnector.waitForPrompt("Deleted successfully")
      appendLogToCsv(url, device.host, "AddError") // 寫入錯誤日誌
    } else {
      await appendLogToCsv(url, device.host, "AddSuccess") // 寫入成功日誌(Hinet與GSN會一起寫入)
    }

    initialId++
  }
}

async function main(device, spinner, urlLists) {
  updateGlobalSpinner(spinner, device, `處理中...`)
  const sshConnector = new SSHConnector(device)
  try {
    if (process.env.TEST_MODE === "true") await simulateDelay(3000)
    await sshConnector.connect()

    if (process.env.TEST_MODE === "true") await simulateDelay(3000)
    await sshConnector.startShell()

    // 初始指令
    await sshConnector.sendCommand(initialCommand())
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    // 初始ID
    let initialId = 300001

    // 處理 Hinet 清單
    await processAddCommand(
      sshConnector,
      urlLists.hinet,
      "Hinet清單",
      initialId,
      spinner,
      device
    )
    console.log("\r\nHinet清單處理完成")

    // 更新初始ID
    initialId += urlLists.hinet.length

    // 處理 GSN 清單
    await processAddCommand(
      sshConnector,
      urlLists.gsn,
      "GSN清單",
      initialId,
      spinner,
      device
    )
    console.log("\r\nGSN清單處理完成")

    // 寫入設定生效指令
    await sshConnector.sendCommand(setCommand())
    await sshConnector.waitForPrompt("Updated successfully")

    // 在終端機中顯示設定清單紀錄
    await sshConnector.sendCommand("dp signatures-protection attacks user get")
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    // 取得終端console中的紀錄
    const output = sshConnector.getOutput()
    await createLog(output, device.host, "Log")

    // 寫入停止ssh config剪貼簿指令
    await sshConnector.sendCommand(stopSystemConfigPaste())
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
  } catch (error) {
    throw error
  } finally {
    sshConnector.endShell()
  }
}

async function deleteHistory(device, spinner, deleteCount = 0) {
  updateGlobalSpinner(spinner, device, `處理中...`)
  const sshConnector = new SSHConnector(device)

  try {
    if (process.env.TEST_MODE === "true") await simulateDelay(3000)
    await sshConnector.connect()

    if (process.env.TEST_MODE === "true") await simulateDelay(3000)
    await sshConnector.startShell()

    // 初始指令
    await sshConnector.sendCommand(initialCommand())
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    await processDeleteCommands(sshConnector, device, deleteCount)

    // 寫入設定生效指令
    await sshConnector.sendCommand(setCommand())
    await sshConnector.waitForPrompt("Updated successfully")

    // 在終端機中顯示設定清單紀錄
    await sshConnector.sendCommand("dp signatures-protection attacks user get")
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)

    // 取得終端console中的紀錄
    const output = sshConnector.getOutput()
    await createLog(output, device.host, "DeleteLog")

    // 寫入停止ssh config剪貼簿指令
    await sshConnector.sendCommand(stopSystemConfigPaste())
    await sshConnector.waitForPrompt(process.env.PROMPT_STRING)
  } catch (error) {
    throw error
  } finally {
    sshConnector.endShell()
  }
}

async function handleDevices(
  devices,
  actionFunction,
  urlLists = null,
  deleteCount = 0
) {
  const spinner = startSpinner()
  console.time("  執行時間")
  try {
    if (devices.length === 0) return

    const promises = urlLists
      ? devices.map((device) => actionFunction(device, spinner, urlLists))
      : devices.map((device) => actionFunction(device, spinner, deleteCount))

    await Promise.all(promises)
  } catch (error) {
    stopSpinner(spinner, `處理裝置時發生錯誤: ${error}`, false)
    console.timeEnd("  執行時間")
    await promptEnterKey()
    process.exit(1)
  }
  stopSpinner(spinner, "所有裝置處理完成。")
  console.timeEnd("  執行時間")
  await promptEnterKey()
  process.exit(0)
}

selectFunction()

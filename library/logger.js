const fs = require("fs")
const path = require("path")
const date = require("date-and-time")
const process = require("process")

/**
 * 创建日志文件
 * @param {string} content - 要写入的内容
 * @param {string} device - 设备名称或标识
 * @param {string} type - 日志类型 (dailyLog, previousLog, CMDResponse, Error)
 */
async function createLog(content, device, type) {
  let location = ""
  let fileName = ""

  switch (type) {
    case "Log":
      location = "./cfg/Log"
      fileName = `${date.format(new Date(), "YYYY-MM-DD_HH-mm")}_${device}.log`
      break
    case "Error":
      location = "./cfg/Error"
      fileName = `${date.format(new Date(), "YYYY-MM-DD_HH-mm")}_error.log`
      break
    default:
      location = "./cfg/Error"
      fileName = `${date.format(new Date(), "YYYY-MM-DD_HH-mm")}_error.log`
      break
  }

  try {
    await fs.promises.writeFile(
      path.resolve(process.cwd(), location, fileName),
      content
    )
  } catch (err) {
    console.error(err)
  }
}

/**
 * 追加内容到现有日志文件
 * @param {string} content - 要追加的内容
 * @param {string} device - 设备名称或标识
 * @param {string} type - 日志类型 (dailyLog, previousLog, CMDResponse, Error)
 */
async function appendLog(content, device, type) {
  let location = ""
  let fileName = ""

  switch (type) {
    case "Error":
      location = "./cfg/Error"
      fileName = `${date.format(
        new Date(),
        "YYYY-MM-DD"
      )}_${device}_failureList.log`
      break
    // 可以根據需要增加其他類型
  }

  const fullPath = path.resolve(process.cwd(), location, fileName)

  try {
    // 檢查文件是否存在以及是否為空
    const exists = fs.existsSync(fullPath)
    const stats = exists && (await fs.promises.stat(fullPath))
    const shouldPrependComma = exists && stats.size > 0

    // 如果文件已存在且不為空，則在内容前加逗號
    const dataToAppend = shouldPrependComma ? "," + content : content

    await fs.promises.appendFile(fullPath, dataToAppend)
  } catch (err) {
    throw err
  }
}

/**
 * 追加内容到特定设备的日志文件
 * @param {string} content - 要追加的内容
 * @param {string} logName - 日志名称或设备标识
 */
async function appendDomainLog(content, logName) {
  const logPath = path.resolve(process.cwd(), "./cfg", `${logName}.txt`)
  const historyPath = path.resolve(
    process.cwd(),
    "./cfg/history",
    `${date.format(new Date(), "YYYY-MM-DD_HH-mm")}_${logName}.txt`
  )

  try {
    // 追加到历史日志
    await fs.promises.appendFile(historyPath, `${content},`)
  } catch (err) {
    throw err
  }
}

module.exports = {
  createLog,
  appendLog,
  appendDomainLog,
}

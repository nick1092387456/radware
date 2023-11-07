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
    case "dailyLog":
      location = "./cfg/history"
      fileName = `${date.format(new Date(), "YYYY-MM-DD_HH-mm")}_${device}.txt`
      break
    case "previousLog":
      location = "./cfg"
      fileName = `${device}.txt`
      break
    case "CMDResponse":
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
    case "dailyLog":
      location = "./cfg/history"
      fileName = `${date.format(new Date(), "YYYY-MM-DD_HH-mm")}_${device}.txt`
      break
    case "previousLog":
      location = "./cfg"
      fileName = `${device}.txt`
      break
    case "CMDResponse":
      location = "./cfg/Log"
      fileName = `${date.format(new Date(), "YYYY-MM-DD")}_${device}.log`
      break
    default:
      location = "./cfg/Error"
      fileName = `${date.format(new Date(), "YYYY-MM-DD")}_error.log`
      break
  }

  try {
    await fs.promises.appendFile(
      path.resolve(process.cwd(), location, fileName),
      content
    )
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

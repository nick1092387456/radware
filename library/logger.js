const fs = require("fs")
const path = require("path")
const date = require("date-and-time")
const csv = require("fast-csv")
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

async function appendErrorLogToCsv(url, device, type) {
  async function getLastSN(fullPath) {
    if (!fs.existsSync(fullPath)) {
      return 0
    }

    return new Promise((resolve, reject) => {
      let lastSN = 0
      fs.createReadStream(fullPath)
        .pipe(csv.parse({ headers: true }))
        .on("error", (error) => reject(error))
        .on("data", (row) => {
          lastSN = parseInt(row.SN, 10)
        })
        .on("end", (rowCount) => resolve(lastSN))
    })
  }
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
    // ... 其他類型
  }

  const fullPath = path.resolve(process.cwd(), location, fileName)

  try {
    const snCounter = (await getLastSN(fullPath)) + 1
    const fileExists = fs.existsSync(fullPath)
    const shouldAppendHeader =
      !fileExists || (await fs.promises.stat(fullPath)).size === 0

    // 如果文件不存在或大小為0，則先寫入BOM
    if (shouldAppendHeader) {
      await fs.promises.writeFile(fullPath, "\ufeff", { flag: "a" })
    }

    const ws = fs.createWriteStream(fullPath, { flags: "a" })
    const csvStream = csv.format({
      headers: shouldAppendHeader,
      includeEndRowDelimiter: true,
    })

    csvStream.pipe(ws).on("end", () => process.exit())
    csvStream.write({
      SN: snCounter,
      "DN/IP-List": url,
      "First-Date": "",
      "Last-Date": "",
    })
    csvStream.end()
  } catch (err) {
    throw err
  }
}

module.exports = {
  createLog,
  appendErrorLogToCsv,
}

const fs = require("fs")
const path = require("path")
const csv = require("fast-csv")
const { createLog } = require("./logger")

/**
 * 解析CSV檔案並提取資料。
 * @param {string} csvFileName - CSV檔案的名稱。
 * @returns {Promise<Array<string>>} - 解析得到的URL列表。
 */
async function parseCSV(csvFileName) {
  if (!csvFileName) return

  const shouldCheckUrls = process.env.CSV_URL_CHECK === "true"
  const baseName = path.basename(csvFileName)
  const URLList = []
  const errorURLList = []
  const filePath = path.resolve(process.cwd(), "./public", baseName)
  const stream = fs
    .createReadStream(filePath)
    .pipe(csv.parse({ headers: true }))

  try {
    for await (const row of stream) {
      const url = row["DN/IP-List"]
      // 檢查是否需要檢測URL
      if (!shouldCheckUrls || isValidUrl(url)) {
        URLList.push(url)
      } else {
        errorURLList.push(url)
      }
    }

    const rowCount = URLList.length
    const message =
      baseName === "Hinet清單.csv"
        ? `Hinet清單處理中，共 ${rowCount} 個有效網址...`
        : `GSN清單處理中，共 ${rowCount} 個有效網址...`
    console.log(message)

    if (shouldCheckUrls && errorURLList.length) {
      console.log(`有 ${errorURLList.length} 個無效網址。`)
      await createLog(errorURLList, csvFileName, "Error")
    }
    if (URLList.length) return URLList
  } catch (error) {
    console.error(error)
  }
}

/**
 * 驗證URL是否有效。
 * @param {string} url - 需要驗證的URL。
 * @returns {boolean} - 如果URL有效，則返回true，否則返回false。
 */
function isValidUrl(url) {
  // 此正則表示式用於檢查URL的結構，不包括"https://"部分。
  const regexPattern = process.env.CSV_URL_REGEX
  const regex = new RegExp(regexPattern, "i")
  return regex.test(url)
}

module.exports = {
  parseCSV,
}

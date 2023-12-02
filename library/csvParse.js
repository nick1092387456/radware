const fs = require("fs")
const path = require("path")
const csv = require("fast-csv")
const { createLog } = require("./logger")

/**
 * 解析CSV檔案並提取資料。
 * @param {string} csvFileName - CSV檔案的名稱。
 * @param {string} csvFilePath - CSV檔案的路徑，預設為"./public"。
 * @returns {Promise<Array<string>>} - 解析得到的URL列表。
 */
async function parseCSV(csvFileName, csvFilePath = "./public") {
  if (!csvFileName) return []

  const filePath = path.resolve(process.cwd(), csvFilePath, csvFileName)

  // 檢查檔案是否存在
  if (!fs.existsSync(filePath)) {
    return [] // 如果檔案不存在，直接返回空陣列
  }

  const shouldCheckUrls = process.env.CSV_URL_CHECK === "true"
  const URLList = []
  const errorURLList = []

  try {
    const stream = fs
      .createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
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
    switch (csvFileName) {
      case "Hinet清單.csv":
        console.log(`  Hinet清單處理中，共 ${rowCount} 個網址...`)
        break
      case "GSN清單.csv":
        console.log(`  GSN清單處理中，共 ${rowCount} 個網址...`)
        break
    }

    if (shouldCheckUrls && errorURLList.length) {
      console.log(`${csvFileName}有 ${errorURLList.length} 個無效網址。`)
      await createLog(errorURLList, csvFileName, "Error")
    }
    return URLList
  } catch (error) {
    return [] // 如果發生錯誤，返回空陣列
  }
}

/**
 * 驗證URL是否有效。
 * @param {string} url - 需要驗證的URL。
 * @returns {boolean} - 如果URL有效，則返回true，否則返回false。
 */
function isValidUrl(url) {
  const regexPattern = process.env.CSV_URL_REGEX
  const regex = new RegExp(regexPattern, "i")
  return regex.test(url)
}

module.exports = {
  parseCSV,
}

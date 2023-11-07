// CSV解析模块
const fs = require("fs")
const path = require("path")
const csv = require("fast-csv")

/**
 * 解析CSV文件并提取数据。
 * @param {string} csvFileName - CSV文件的名称。
 * @returns {Promise<Array<string>>} - 解析得到的URL列表。
 */
async function parseCSV(csvFileName) {
  if (!csvFileName) return

  const baseName = path.basename(csvFileName)

  const URLList = []
  const filePath = path.resolve(process.cwd(), "./public", baseName)
  const stream = fs
    .createReadStream(filePath)
    .pipe(csv.parse({ headers: true }))

  try {
    for await (const row of stream) {
      URLList.push(row["DN/IP-List"])
    }

    const rowCount = URLList.length
    const message =
      baseName === "Hinet清單.csv"
        ? `Hinet清單處理中，共 ${rowCount} 個網址...`
        : `GSN清單處理中，共 ${rowCount} 個網址...`

    console.log(message)

    if (URLList.length) return URLList
  } catch (error) {
    console.error(error)
  }
}

parseCSV("Hinet清單.csv")

module.exports = {
  parseCSV,
}

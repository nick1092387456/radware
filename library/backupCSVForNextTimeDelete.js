const fs = require("fs")
const path = require("path")

function copyCsvToBackup(originalCsvFilePath, backupDir) {
  const fileName = path.basename(originalCsvFilePath, ".csv")
  const newFileName = `${fileName}_backup.csv` // 新檔案名稱
  const newCsvFilePath = path.join(backupDir, newFileName)

  fs.copyFile(originalCsvFilePath, newCsvFilePath, (err) => {
    if (err) {
      console.error("Error copying the CSV file: ", err)
      return
    }
  })
}

module.exports = copyCsvToBackup

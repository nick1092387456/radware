const fs = require("fs")
const path = require("path")
const { readdir } = require("fs/promises")

async function getCSVFile() {
  const dir = path.join(process.cwd(), "public")
  const files = await readdir(dir)

  const targetFiles = ["Hinet清單.csv", "GSN清單.csv"]

  if (!targetFiles.every((file) => files.includes(file))) {
    throw new Error(
      "請在public資料夾內放入Hinet清單.csv、GSN清單.csv後再執行程式"
    )
  }

  return targetFiles.map((file) => path.join(dir, file))
}

async function checkRemoveListExist(device_list) {
  const files = await fs.promises.readdir(path.resolve(process.cwd(), "./cfg"))
  const removeFileName = files
    .filter((file) => path.extname(file) === ".txt")
    .map((file) => file.split(".").slice(0, -1).join("."))

  return device_list.filter((existDevice) =>
    removeFileName.includes(existDevice)
  )
}

async function getSameDevice(device_list) {
  try {
    const files = await fs.promises.readdir(
      path.resolve(process.cwd(), "./cfg")
    )

    const previousFileNameList = files
      .filter((file) => path.extname(file) === ".txt")
      .map((fileName) => fileName.split(".").slice(0, -1).join("."))

    const sameDevices = device_list.filter((existDevice) =>
      previousFileNameList.includes(existDevice)
    )

    return sameDevices
  } catch (err) {
    throw err
  }
}

async function parseIdNumber(parseFile) {
  const filePath = path.resolve(process.cwd(), "./cfg", `${parseFile}.txt`)
  const fileContent = await fs.promises.readFile(filePath, { encoding: "utf8" })
  const idList = fileContent.split(",")
  return idList.length
}

module.exports = {
  getCSVFile,
  checkRemoveListExist,
  getSameDevice,
  parseIdNumber,
}

const fs = require("fs")
const path = require("path")
const { readdir } = require("fs/promises")
const { Client } = require("ssh2")
const csv = require("fast-csv")
const date = require("date-and-time")
const now = new Date()
const process = require("process")
const rdl = require("readline")
const std = process.stdout
require("dotenv").config({
  path: path.resolve(process.cwd(), "./config", ".env"),
})
const device_list = process.env.HOST.split(",")

//class area
class Spinner {
  spin() {
    //remove the cursor so we can see the effect
    process.stdout.write("\x1B[?25l")
    const spinners = ["-", "\\", "|", "/"]
    let index = 0
    this.timer = setInterval(() => {
      let line = spinners[index]

      if (line == undefined) {
        index = 0
        line = spinners[index]
      }
      std.write(line)
      rdl.cursorTo(std, 0)
      index = index >= spinners.length ? 0 : index + 1
    }, 100)
  }
  stop() {
    clearTimeout(this.timer)
  }
}

//function area
async function createConn(asyncFunction, deviceAmount) {
  const connList = new Array(deviceAmount)

  for (let i = deviceAmount - 1; i >= 0; i--) {
    let client = new Client()
    connList[i] = client
    await asyncFunction(i, connList)
  }
}

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

async function checkRemoveListExist() {
  const files = await fs.promises.readdir(path.resolve(process.cwd(), "./cfg"))
  const removeFileName = files
    .filter((file) => path.extname(file) === ".txt")
    .map((file) => file.split(".").slice(0, -1).join("."))

  return device_list.filter((existDevice) =>
    removeFileName.includes(existDevice)
  )
}

async function getSameDevice() {
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

function genDeleteFeature(fileName) {
  const filePath = path.resolve(process.cwd(), "./cfg", fileName)
  const data = fs.readFileSync(filePath, { encoding: "utf8" }).split(",")
  const result = []

  for (let i = 0; i < data.length; i++) {
    const id = 300001 + i
    result.push(`dp signatures-protection attacks user del ${id}\n`)
  }

  return result
}

function genDeleteFilter(fileName) {
  const filePath = path.resolve(process.cwd(), "./cfg", fileName)
  const data = fs.readFileSync(filePath, { encoding: "utf8" }).split(",")

  return data.map((url) => {
    const trimmedUrl = url.slice(0, 29)
    return `dp signatures-protection filter basic-filters user del ${trimmedUrl}\n`
  })
}

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

function buildAttribute() {
  return `hidden attributes values create type_1 User -ti 1 -va 10001`
}

function buildFilterCommand(url, device) {
  return url.map((_url) => {
    let filterName = "F_" + _url.slice(0, 25)
    appendDomainLog(filterName, device)
    let urlParse = _url
      .split(".")
      .map((str) => {
        return "\\\\x" + str.length.toString(16).padStart(2, "0") + str
      })
      .join("")
    let contentMaxSearchLength = urlParse.length + 12
    return `dp signatures-protection filter basic-filters user setCreate ${filterName} -p udp -o 2 -om f8400000 -oc Equal -ol "Two Bytes" -co 12 -c ${urlParse} -ct Text -cm ${contentMaxSearchLength} -ce "Case Insensitive" -rt "L4 Data" -dp dns -cr Yes`
  })
}

function buildFeatureCommand(url, fileName, idCount) {
  const baseName = path.basename(fileName)
  let featureNameTitle = ""
  switch (baseName) {
    case "Hinet清單.csv":
      featureNameTitle = "H_"
      break
    case "GSN清單.csv":
      featureNameTitle = "G_"
      break
    case "Append":
      featureNameTitle = "A_"
      break
  }

  let featureName = featureNameTitle + url
  let filterName = "F_" + url

  if (featureName.length > 27) {
    featureName = featureName.slice(0, 27)
  }

  if (filterName.length > 27) {
    filterName = filterName.slice(0, 27)
  }

  return `dp signatures-protection attacks user setCreate ${idCount} -n ${featureName} -f ${filterName} -dr "In Bound" -tt 25`
}

function packCommand(id) {
  return `hidden attacks attributes create ${id} type_1 attribute_10001 -ti 1 -va 10001`
}

async function createLog(content, device, type) {
  let location = ""
  let fileName = ""

  switch (type) {
    case "dailyLog":
      location = "./cfg/history"
      fileName = `${date.format(now, "YYYY-MM-DD_HH-mm")}_${device}.txt`
      break
    case "previousLog":
      location = "./cfg"
      fileName = `${device}.txt`
      break
    case "CMDResponse":
      location = "./cfg/Log"
      fileName = `${date.format(now, "YYYY-MM-DD_HH-mm")}_${device}.log`
      break
    default:
      location = "./cfg/Error"
      fileName = `${date.format(now, "YYYY-MM-DD_HH-mm")}_error.log`
      break
  }

  try {
    await fs.promises.writeFile(
      path.resolve(process.cwd(), location, fileName),
      cleanString(content)
    )
  } catch (err) {
    console.error(err)
    return
  }
}

async function appendLog(content, device, type) {
  const now = new Date()
  const date = require("date-fns")
  const fs = require("fs")
  const path = require("path")

  let location = ""
  let fileName = ""

  switch (type) {
    case "dailyLog":
      location = "./cfg/history"
      fileName = `${date.format(now, "YYYY-MM-DD_HH-mm")}_${device}.txt`
      break
    case "previousLog":
      location = "./cfg"
      fileName = `${device}.txt`
      break
    case "CMDResponse":
      location = "./cfg/Log"
      fileName = `${date.format(now, "YYYY-MM-DD")}_${device}.log`
      break
    default:
      location = "./cfg/Error"
      fileName = `${date.format(now, "YYYY-MM-DD")}_error.log`
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

async function appendDomainLog(content, logName) {
  const logPath = path.resolve(process.cwd(), "./cfg", `${logName}.txt`)
  const historyPath = path.resolve(
    process.cwd(),
    "./cfg/history",
    `${date.format(now, "YYYY-MM-DD_HH-mm")}_${logName}.txt`
  )

  try {
    await fs.promises.appendFile(logPath, `${content},`)
    await fs.promises.appendFile(historyPath, `${content},`)
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

function cleanString(input) {
  const controlCharsRegex = /[\x00-\x09\x0E-\x1F\x80-\x9F]/g
  return input.replace(controlCharsRegex, "")
}

module.exports = {
  parseIdNumber,
  createConn,
  checkRemoveListExist,
  getSameDevice,
  parseCSV,
  buildAttribute,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  createLog,
  appendLog,
  genDeleteFeature,
  genDeleteFilter,
  getCSVFile,
  Spinner,
}

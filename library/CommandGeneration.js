// CommandGeneration.js

const fs = require("fs")
const path = require("path")

// 產生刪除特徵碼指令
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

// 產生刪除過濾器指令
function genDeleteFilter(fileName) {
  const filePath = path.resolve(process.cwd(), "./cfg", fileName)
  const data = fs.readFileSync(filePath, { encoding: "utf8" }).split(",")

  return data.map((url) => {
    const trimmedUrl = url.slice(0, 29)
    return `dp signatures-protection filter basic-filters user del ${trimmedUrl}\n`
  })
}

// 產生初始化隱藏命令
function buildAttribute() {
  return `hidden attributes values create type_1 User -ti 1 -va 10001`
}

// 產生過濾器指令
function buildFilterCommand(url, device) {
  return url.map((_url) => {
    let filterName = "F_" + _url.slice(0, 25)
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

// 產生特徵碼指令
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

// 打包指令
function packCommand(id) {
  return `hidden attacks attributes create ${id} type_1 attribute_10001 -ti 1 -va 10001`
}

function cleanString(input) {
  const controlCharsRegex = /[\x00-\x09\x0E-\x1F\x80-\x9F]/g
  return input.replace(controlCharsRegex, "")
}

module.exports = {
  genDeleteFeature,
  genDeleteFilter,
  buildAttribute,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  cleanString,
}

// 產生刪除特徵碼指令
function genDeleteFeature(idCount) {
  return `dp signatures-protection attacks user del ${idCount}\r\n`
}

// 產生刪除過濾器指令
function genDeleteFilter(url) {
  const trimmedUrl = `F_${url.slice(0, 25)}`
  return `dp signatures-protection filter basic-filters user del ${trimmedUrl}\r\n`
}

// 啟動ssh config 剪貼簿
function startSSHConfigClipboard() {
  return `system config paste start`
}

// 產生初始化隱藏命令
function initialCommand() {
  let commands = []
  // 關閉終端分頁
  commands.push("manage terminal more-prompt set off")
  // 管理終端輸出和指令設定
  commands.push("manage terminal grid-mode set disable")
  commands.push("manage terminal traps-output set 1")
  commands.push("dp reporting global send-terminal set 2")
  // 開始批量指令發送
  commands.push("system config paste start")
  // 加入您原本的指令
  commands.push("hidden attributes values create type_1 User -ti 1 -va 10001")
  // 將指令串接為一個字符串並返回
  return commands.join("\r\n")
}

function stopSystemConfigPaste() {
  return `system config paste stop`
}

// 產生過濾器指令
function buildFilterCommand(url) {
  let filterName = "F_" + url.slice(0, 25)
  let urlParse = url
    .split(".")
    .map((str) => {
      return "\\\\x" + str.length.toString(16).padStart(2, "0") + str
    })
    .join("")
  let contentMaxSearchLength = urlParse.length + 12
  return `dp signatures-protection filter basic-filters user setCreate ${filterName} -p udp -o 2 -om f8400000 -oc Equal -ol "Two Bytes" -co 12 -c ${urlParse} -ct Text -cm ${contentMaxSearchLength} -ce "Case Insensitive" -rt "L4 Data" -dp dns -cr Yes`
}

// 產生特徵碼指令
function buildFeatureCommand(url, fileName, idCount) {
  let featureNameTitle = ""
  switch (fileName) {
    case "Hinet清單.csv":
      featureNameTitle = "H_"
      break
    case "GSN清單.csv":
      featureNameTitle = "G_"
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
function packCommand(idCount) {
  return `hidden attacks attributes create ${idCount} type_1 attribute_10001 -ti 1 -va 10001`
}

//設定生效指令
function setCommand() {
  return `dp update-policies set 1`
}

// 關閉ssh config 剪貼簿
function stopSSHConfigClipboard() {
  return `system config paste stop`
}

function cleanString(input) {
  const controlCharsRegex = /[\x00-\x09\x0E-\x1F\x80-\x9F]/g
  return input.replace(controlCharsRegex, "")
}

module.exports = {
  startSSHConfigClipboard,
  genDeleteFeature,
  genDeleteFilter,
  initialCommand,
  stopSystemConfigPaste,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  setCommand,
  stopSSHConfigClipboard,
  cleanString,
}

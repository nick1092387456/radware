const parseData = (line, nextLine = "") => {
  const parts = line.split(/\s+/)
  let nextParts = nextLine.split(/\s+/)
  nextParts = nextParts.filter((part) => part !== "") // 移除空白部分

  return {
    id: parseInt(parts[0], 10),
    attackName: parts[1] + (nextParts[0] || ""),
    filterName: parts[2] + (nextParts[1] || ""),
  }
}

const getDeleteList = (data) => {
  const lines = data.split("\n")
  const result = []
  let currentData = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/^3\d+/)) {
      // 檢查是否以3開頭的數字開始
      if (currentData) {
        result.push(currentData) // 將前一筆數據推入結果陣列
      }
      currentData = parseData(line, lines[i + 1]) // 解析當前行和下一行
    }
  }

  if (currentData) {
    result.push(currentData) // 將最後一筆數據推入結果陣列
  }

  return result
}

module.exports = { getDeleteList }

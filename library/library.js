const fs = require('fs')
const path = require('path')
const csv = require('fast-csv')
const date = require('date-and-time')
const now = new Date()
const process = require('process')
const rdl = require('readline')
const std = process.stdout

//class area
class Spinner {
  spin() {
    //remove the cursor so we can see the effect
    process.stdout.write('\x1B[?25l')
    const spinners = ['-', '\\', '|', '/']
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
function checkCSVexist() {
  return new Promise((res, rej) => {
    fs.readdir(path.resolve(process.cwd(), './public'), (err, files) => {
      if (
        files.length === 0 ||
        !(files.includes('Hinet清單.csv') || files.includes('GSN清單.csv'))
      )
        rej('請在public資料夾內放入Hinet清單.csv、GSN清單.csv後再執行程式')
      let result = files.filter((item) => {
        if (item === 'Hinet清單.csv' || item === 'GSN清單.csv') {
          return true
        }
      })
      res(result)
    })
  })
}

function checkRemoveListExist(removeListFileName) {
  return new Promise((res, rej) => {
    fs.readdir(path.resolve(process.cwd(), './cfg'), (err, files) => {
      if (err) rej(err)
      res(files.includes(removeListFileName))
    })
  })
}

function parseCSV(csvFileName) {
  return new Promise((res, rej) => {
    let URLList = []
    if (csvFileName) {
      fs.createReadStream(path.resolve(process.cwd(), './public', csvFileName))
        .pipe(csv.parse({ headers: true }))
        .on('error', (error) => console.error(error))
        .on('data', (row) => {
          URLList.push(row['DN/IP-List'])
        })
        .on('end', (rowCount) => {
          csvFileName === 'Hinet清單.csv'
            ? console.log(`Hinet清單處理中，共 ${rowCount} 個網址...`)
            : console.log(`GSN清單處理中，共 ${rowCount} 個網址...`)
          if (URLList.length) res(URLList)
        })
    }
  })
}

function buildAttribute() {
  return `hidden attributes values create type_1 User -ti 1 -va 10001`
}

function buildFilterCommand(url, device, fileName) {
  let filterNameTitle = ''

  if (fileName === 'Hinet清單.csv') {
    filterNameTitle = 'H_'
  } else if (fileName === 'GSN清單.csv') {
    filterNameTitle = 'G_'
  }

  return url.map((_url) => {
    let filterName = filterNameTitle + _url
    writeLog(filterName, device)
    let urlParse = _url
      .split('.')
      .map((str) => (str = '\\\\x0' + str.length + str))
      .join('')
    return `dp signatures-protection filter basic-filters user setCreate ${filterName} -p Udp -o 2 -om f8400000 -oc Equal -ol "Two Bytes" -c ${urlParse} -ct Text -ce "Case Insensitive" -rt "L4 Data" -dp dns`
  })
}

function buildFeatureCommand(url, fileName, idCount) {
  let filterNameTitle = ''
  if (fileName === 'Hinet清單.csv') {
    filterNameTitle = 'H_'
  } else if (fileName === 'GSN清單.csv') {
    filterNameTitle = 'G_'
  }
  return `dp signatures-protection attacks user setCreate ${idCount} -n ${filterNameTitle}${url} -f ${filterNameTitle}${url} -dr "In Bound" -tt 25`
}

function packCommand(id) {
  return `hidden attacks attributes create ${id} type_1 attribute_10001 -ti 1 -va 10001`
}

function createLog(content = 'empty', device, type) {
  let location = ''
  let fileName = ''
  if (type === 'dailyLog') {
    location = './cfg/history'
    fileName = `${date.format(now, 'YYYY-MM-DD_HH-mm')}_${device}.txt`
  } else if (type === 'previousLog') {
    location = './cfg'
    fileName = `${device}.txt`
  } else if (type === 'CMDResponse') {
    location = './cfg/Log'
    fileName = `${date.format(now, 'YYYY-MM-DD')}_${device}.log`
  } else {
    location = './cfg/Error'
    fileName = `${date.format(now, 'YYYY-MM-DD')}_error.log`
  }
  fs.writeFileSync(
    path.resolve(process.cwd(), location, fileName),
    content,
    (err) => {
      if (err) {
        console.error(err)
        return
      }
    }
  )
}

function writeLog(content, logName) {
  fs.appendFile(
    path.resolve(process.cwd(), './cfg', `${logName}.txt`),
    `${content},`,
    (err) => {
      if (err) throw err
    }
  )

  fs.appendFile(
    path.resolve(
      process.cwd(),
      './cfg/history',
      `${date.format(now, 'YYYY-MM-DD_HH-mm')}_${logName}.txt`
    ),
    `${content},`,
    (err) => {
      if (err) throw err
    }
  )
}

function removeAllSetting(fileName) {
  let data = fs
    .readFileSync(path.resolve(process.cwd(), './cfg', fileName), {
      encoding: 'utf8',
    })
    .split(',')

  return data.map((url, index) => {
    let id = 300001 + index
    return `dp signatures-protection attacks user del ${id}\n dp signatures-protection filter basic-filters user del ${url}\n`
  })
}

module.exports = {
  checkRemoveListExist,
  parseCSV,
  buildAttribute,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  createLog,
  writeLog,
  removeAllSetting,
  checkCSVexist,
  Spinner,
}

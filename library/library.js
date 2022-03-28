const fs = require('fs')
const path = require('path')
const { Client } = require('ssh2')
const csv = require('fast-csv')
const date = require('date-and-time')
const now = new Date()
const process = require('process')
const rdl = require('readline')
const std = process.stdout
require('dotenv').config({
  path: path.resolve(process.cwd(), './config', '.env'),
})
const device_list = process.env.HOST.split(',')

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
function createConn(functionTodo, device_amount) {
  conn_List = new Array(device_amount)
  ;(async () => {
    for (let i = device_amount - 1; i >= 0; i--) {
      conn_List[i] = new Client()
      await functionTodo(i)
    }
  })()
}

function getCSVFile() {
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

function checkRemoveListExist() {
  return new Promise((res, rej) => {
    fs.readdir(path.resolve(process.cwd(), './cfg'), (err, files) => {
      if (err) rej(err)
      let removeFileName = files.filter((file) => {
        return path.extname(file) == '.txt'
      })
      for (let i = 0, j = removeFileName.length; i < j; i++) {
        removeFileName[i] = removeFileName[i].split('.').slice(0, -1).join('.')
      }
      res(
        device_list.filter((existDevice) => {
          return removeFileName.includes(existDevice)
        })
      )
    })
  })
}

function getSameDevice() {
  return new Promise((res, rej) => {
    fs.readdir(path.resolve(process.cwd(), './cfg'), (err, files) => {
      if (err) rej(err)
      let previousFileNameList = files.filter((file) => {
        return path.extname(file) == '.txt'
      })
      previousFileNameList.forEach((fileName, index) => {
        return (previousFileNameList[index] = fileName
          .split('.')
          .slice(0, -1)
          .join('.'))
      })
      res(
        device_list.filter((existDevice) => {
          return previousFileNameList.includes(existDevice)
        })
      )
    })
  })
}

function genDeleteFeature(fileName) {
  let data = fs
    .readFileSync(path.resolve(process.cwd(), './cfg', fileName), {
      encoding: 'utf8',
    })
    .split(',')

  return data.map((_url, index) => {
    let id = 300001 + index
    return `dp signatures-protection attacks user del ${id}\n`
  })
}

function genDeleteFilter(fileName) {
  let data = fs
    .readFileSync(path.resolve(process.cwd(), './cfg', fileName), {
      encoding: 'utf8',
    })
    .split(',')

  return data.map((url) => {
    if (url.length >= 29) url = url.slice(0, 29)
    return `dp signatures-protection filter basic-filters user del ${url}\n`
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

function buildFilterCommand(url, device) {
  return url.map((_url) => {
    let filterName = 'F_' + _url
    appendDomainLog(filterName, device)
    if (filterName.length >= 29) filterName = filterName.slice(0, 29)
    let urlParse = ''
    // _url.split('.').some((_str) => _str.length >= 10)
    //   ? (urlParse = _url)
    //   : (urlParse = _url
    urlParse = _url
      .split('.')
      .map((str) => {
        return '\\\\x' + str.length.toString(16).padStart(2, '0') + str
      })
      .join('')

    let contentMaxSearchLength = urlParse.length + 12
    return `dp signatures-protection filter basic-filters user setCreate ${filterName} -p udp -o 2 -om f8400000 -oc Equal -ol "Two Bytes" -co 12 -c ${urlParse} -ct Text -cm ${contentMaxSearchLength} -ce "Case Insensitive" -rt "L4 Data" -dp dns -cr Yes`
  })
}

function buildFeatureCommand(url, fileName, idCount) {
  let featureNameTitle = ''
  if (fileName === 'Hinet清單.csv') {
    featureNameTitle = 'H_'
  } else if (fileName === 'GSN清單.csv') {
    featureNameTitle = 'G_'
  } else if (fileName === 'Append') {
    featureNameTitle = 'A_'
  }
  let featureName = featureNameTitle + url
  if (featureName.length >= 29) featureName = featureName.slice(0, 29)
  let filterName = 'F_' + url
  if (filterName.length >= 29) filterName = filterName.slice(0, 29)

  return `dp signatures-protection attacks user setCreate ${idCount} -n ${featureName} -f ${filterName} -dr "In Bound" -tt 25`
}

function packCommand(id) {
  return `hidden attacks attributes create ${id} type_1 attribute_10001 -ti 1 -va 10001`
}

function createLog(content, device, type) {
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

function appendLog(content, device, type) {
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
  fs.appendFile(
    path.resolve(process.cwd(), location, fileName),
    content,
    (err) => {
      if (err) throw err
    }
  )
}

function appendDomainLog(content, logName) {
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

function parseIdNumber(parseFile) {
  return fs
    .readFileSync(path.resolve(process.cwd(), './cfg', `${parseFile}.txt`), {
      encoding: 'utf8',
    })
    .split(',').length
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

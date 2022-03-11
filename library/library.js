const fs = require('fs')
const path = require('path')
const csv = require('fast-csv')
const date = require('date-and-time')
const now = new Date()

//function area
function parseCSV(fileName) {
  return new Promise((res, rej) => {
    let URLList = []
    fs.createReadStream(path.resolve(__dirname, '../public', fileName))
      .pipe(csv.parse({ headers: true }))
      .on('error', (error) => console.error(error))
      .on('data', (row) => {
        URLList.push(row['DN/IP-List'])
      })
      .on('end', (rowCount) => {
        fileName === 'Hinet清單.csv'
          ? console.log(`Hinet清單處理中，共 ${rowCount} 個網址...`)
          : console.log(`GSP清單處理中，共 ${rowCount} 個網址...`)
        if (URLList.length) res(URLList)
      })
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
    location = '../cfg/history'
    fileName = `${date.format(now, 'YYYY-MM-DD')}_${device}.txt`
  } else if (type === 'previousLog') {
    location = '../cfg'
    fileName = `${device}.txt`
  } else if (type === 'CMDResponse') {
    location = '../cfg/Log'
    fileName = `${date.format(now, 'YYYY-MM-DD')}_${device}.log`
  } else {
    location = '../cfg/Error'
    fileName = `${date.format(now, 'YYYY-MM-DD')}_error.log`
  }
  fs.writeFileSync(
    path.resolve(__dirname, location, fileName),
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
    path.resolve(__dirname, '../cfg', `${logName}.txt`),
    `${content},`,
    (err) => {
      if (err) throw err
    }
  )

  fs.appendFile(
    path.resolve(
      __dirname,
      '../cfg/history',
      `${date.format(now, 'YYYY-MM-DD')}_${logName}.txt`
    ),
    `${content},`,
    (err) => {
      if (err) throw err
    }
  )
}

function removeAllSetting(fileName) {
  let data = fs
    .readFileSync(path.resolve(__dirname, '../cfg', fileName), {
      encoding: 'utf8',
    })
    .split(',')

  return data.map((url, index) => {
    let id = 300001 + index
    return `dp signatures-protection attacks user del ${id}\n dp signatures-protection filter basic-filters user del ${url}\n`
  })
}

module.exports = {
  parseCSV,
  buildAttribute,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  createLog,
  writeLog,
  removeAllSetting,
}

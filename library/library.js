const fs = require('fs')
const path = require('path')
const csv = require('fast-csv')
const date = require('date-and-time')

//function area
function parseCSV(fileName = '專案惡意中繼站清單_DN_forTest.csv') {
  return new Promise((res, rej) => {
    let URLList = []
    fs.createReadStream(path.resolve(__dirname, '../public', fileName))
      .pipe(csv.parse({ headers: true }))
      .on('error', (error) => console.error(error))
      .on('data', (row) => {
        URLList.push(row['DN/IP-List'])
        res(URLList)
      })
      .on('end', (rowCount) => console.log(`Parsed ${rowCount} rows`))
  })
}

function buildAttribute() {
  return `hidden attributes values create type_1 User -ti 1 -va 10001`
}

function buildFilterCommand(url) {
  let log = `${url.join(',')}`
  generateLog(log)
  return url.map((_url) => {
    let urlParse = _url
      .split('.')
      .map((str) => (str = '\\x0' + str.length + str))
      .join('')
    return `dp signatures-protection filter basic-filters user setCreate ${_url} -p Udp -o 2 -om f8400000 -oc Equal -ol "Two Bytes" -c ${urlParse} -ct Text -ce "Case Insensitive" -rt "L4 Data" -dp dns`
  })
}

function buildFeatureCommand(name) {
  return name.map((_name, index) => {
    let id = index + 300001
    return `dp signatures-protection attacks user setCreate ${id} -n ${_name} -f ${_name} -dr "In Bound" -tt 25`
  })
}

function packCommand(id) {
  return `hidden attacks attributes create ${id} type_1 attribute_10001 -ti 1 -va 10001`
}

function generateLog(content = 'empty') {
  const now = new Date()
  let LogName = date.format(now, 'YYYY-MM-DD_HHmm') + '.txt'
  let lastTimeDoing = 'lastTimeDoing.txt'
  fs.writeFileSync(
    path.resolve(__dirname, '../cfg/history', LogName),
    content,
    (err) => {
      if (err) {
        console.error(err)
        return
      }
    }
  )
  fs.writeFileSync(
    path.resolve(__dirname, '../cfg', lastTimeDoing),
    content,
    (err) => {
      if (err) {
        console.error(err)
        return
      }
    }
  )
}

function removeAllSetting() {
  let fileName = 'lastTimeDoing.txt'
  let data = fs
    .readFileSync(path.resolve(__dirname, '../cfg', fileName), {
      encoding: 'utf8',
      flag: 'r',
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
  generateLog,
  removeAllSetting,
}

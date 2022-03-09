const fs = require('fs')
const path = require('path')
const csv = require('fast-csv')
const date = require('date-and-time')
const dir = path.resolve(__dirname, '../public')

// let data = []
// ;(async () => {
//   const fileLists = ['Hinet清單.csv', 'GSN清單.csv']
//   for (let i = 0, j = fileLists.length; i < j; i++) {
//     data = data.concat(await parseCSV(fileLists[i]))
//   }
//   console.log(data)
// })()

//function area
function parseCSV(fileName) {
  return new Promise((res, rej) => {
    let URLList = []
    fs.createReadStream(path.resolve(__dirname, '../public', fileName))
      .pipe(csv.parse({ headers: true }))
      .on('error', (error) => console.error(error))
      .on('data', (row) => {
        if (fileName === 'Hinet清單.csv') {
          URLList.push('H_' + row['DN/IP-List'])
        } else if (fileName === 'GSN清單.csv') {
          URLList.push('G_' + row['DN/IP-List'])
        }
      })
      .on('end', (rowCount) => {
        // console.log(`Parsed ${rowCount} rows`)
        if (URLList.length) res(URLList)
      })
  })
}

function buildAttribute() {
  return `hidden attributes values create type_1 User -ti 1 -va 10001`
}

function buildFilterCommand(url, device) {
  let log = `${url.join(',')}`
  generateLog(log, device)
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
    let id = index + 320001
    return `dp signatures-protection attacks user setCreate ${id} -n ${_name} -f ${_name} -dr "In Bound" -tt 25`
  })
}

function packCommand(id) {
  return `hidden attacks attributes create ${id} type_1 attribute_10001 -ti 1 -va 10001`
}

function generateLog(content = 'empty', device, locat) {
  const now = new Date()
  let dateLog = `${date.format(now, 'YYYY-MM-DD')}_${device}.txt`
  let previousLog = `${device}.txt`
  fs.writeFileSync(
    path.resolve(__dirname, '../cfg/history', dateLog),
    content,
    (err) => {
      if (err) {
        console.error(err)
        return
      }
    }
  )
  fs.writeFileSync(
    path.resolve(__dirname, '../cfg', previousLog),
    content,
    (err) => {
      if (err) {
        console.error(err)
        return
      }
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
    let id = 320001 + index
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

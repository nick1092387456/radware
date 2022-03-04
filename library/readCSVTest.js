const fs = require('fs')
const path = require('path')
const csv = require('fast-csv')

function parseCSV() {
  return new Promise((res) => {
    let URLList = []
    fs.createReadStream(path.resolve(__dirname, '../public', 'Hinet.csv'))
      .pipe(csv.parse({ headers: true }))
      .on('error', (error) => console.error(error))
      .on('data', (row) => {
        URLList.push(row['DN/IP-List'])
        res(URLList)
      })
      .on('end', (rowCount) => console.log(`Parsed ${rowCount} rows`))
  })
}

let data = parseCSV()

const fs = require('fs')
const neatCsv = require('neat-csv');

const FILENAME_REGEX = /[A-Z]-[A-Z][A-Z][A-Z][0-9][0-9]/i
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const INVALID_FILENAME_ERROR = Error(`The format of one of the files is not valid. Valid format: 'X-MMMYY' (X-initial, MMM-month, YY-year)`)

const INPUT_CSV_SEPARATOR = ';'
const OUTPUT_CSV_SEPARATOR = '\t'
const OUTPUT_COLUMN_ORDER = ['month', 'text', 'initial', 'amount', 'date']


function parseFilename(filename) {
    const withoutExt = filename.substr(0, filename.indexOf('.'))
    if (!FILENAME_REGEX.test(withoutExt))
        throw INVALID_FILENAME_ERROR

    const [initial, month] = withoutExt.split('-')
    if (MONTHS.indexOf(month.substr(0, 3)) === -1)
        throw INVALID_FILENAME_ERROR

    return { filename, initial, month }
}

function cleanRow({ Date, Text, Amount }) {
    return {
        date: Date.replace(/\./g, '/'),
        amount: Amount.replace('-', ''),
        text: Text.replace(/\s*\)\)\)\)/g, '')
    }
}

function compareRow(a, b) {
    const ad = a.date.toLowerCase() 
    const bd = b.date.toLowerCase() 
    if (ad < bd) {
        return -1;
    }
    if (ad > bd) {
        return 1;
    }
    return 0;
}

function formatCSV(inputCSV, initial, month) {
    return inputCSV
        .filter(({ Amount }) => Amount.startsWith('-'))
        .map(cleanRow)
        .map(row => Object.assign({ initial, month }, row))
}

function readCSV(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, async (error, data) => {
            if (error) {
                reject(error)
            }
            resolve(data)
        })
    })
    
}

async function main() {
    const filenames = process.argv.slice(2)
    const parsedFilenames = []

    if (filenames.length !== 2)
        throw Error('Expected only 2 arguments')

    for (const filename of filenames) {
        parsedFilenames.push(parseFilename(filename))

        if (!fs.existsSync(filename))
            throw Error(`File '${filename}' not found`)
    }

    let expenses = []

    for (const { filename, initial, month } of parsedFilenames) {
        const inputCSV = await readCSV(filename)
        const parsedCSV = await neatCsv(inputCSV, { separator: INPUT_CSV_SEPARATOR })
        expenses =  expenses.concat(formatCSV(parsedCSV, initial, month))
    }

    expenses.sort(compareRow)

    console.log(OUTPUT_COLUMN_ORDER.join(INPUT_CSV_SEPARATOR))
    for (const row of expenses) {
        console.log(OUTPUT_COLUMN_ORDER.map(col => row[col]).join(INPUT_CSV_SEPARATOR))
    }

}

main()
    .then()
    .catch(error => {
        console.error('Error: ' + error.message)
    })
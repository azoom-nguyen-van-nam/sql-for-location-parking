import knex from './database.js'
import excelJS from 'exceljs'
import fs from 'fs'
import LatLon from 'geodesy/latlon-ellipsoidal-vincenty.js'

const classification = {
  EXIST: 'exist',
  MAYBE_EXIST: 'maybeExist',
  NEW: 'new'
}

const getSheet = async (filePath, sheetName) => {
  const workbook = new excelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const sheet = workbook.getWorksheet(sheetName)

  if (!sheet) {
    throw new Error(`Not found ${sheetName}`)
  }

  return sheet
}

const getDBLocationParkings = async cityIds => {
  return knex('location_parking as parking')
    .select('parking.*')
    .leftJoin('location_city as city', 'city.id', 'parking.city_id')
    .whereIn('city.id', cityIds)
}

const readColumnData = async (sheet, column) => {
  const dataMap = {}
  sheet.eachRow((row, rowNumber) => {
    const cell = row.getCell(column.name)
    const dataRow = cell.value.split(',')
    if (rowNumber > 1) {
      dataMap[rowNumber] = {
        lat: +dataRow[0],
        lng: +dataRow[1].trim()
      }
    }
  })
  return dataMap
}

const calcParkingDistance = (parkingA, parkingB) => {
  const pA = new LatLon(parkingA.lat, parkingA.lng)
  const pB = new LatLon(parkingB.lat, parkingB.lng)

  return pA.distanceTo(pB)
}

const classifyCrawlParking = (newParkings, oldParkings) => {
  return Object.entries(newParkings).reduce(
    (parkingClassification, [rowNumber, location]) => {
      console.log(rowNumber)
      const { distanceType, parkingInfos } = getDistanceTypeInfo(
        oldParkings,
        location
      )

      parkingClassification[distanceType] = [
        ...parkingClassification[distanceType],
        { rowNumber, parkingInfos, distanceType }
      ]

      return parkingClassification
    },
    {
      exist: [],
      new: [],
      maybeExist: []
    }
  )
}

const getDistanceTypeInfo = (parkings, location) => {
  let distanceType = classification.NEW
  let parkingInfos = []
  for (let i = 0; i < parkings.length; i++) {
    const distance = calcParkingDistance(location, parkings[i])
    if (distance <= 10) {
      if (distanceType !== classification.EXIST) {
        parkingInfos = []
      }
      distanceType = classification.EXIST
      parkingInfos = [...parkingInfos, { distance, parkingId: parkings[i].id }]
      continue
    }

    if (distance <= 20 && distanceType !== classification.EXIST) {
      distanceType = classification.MAYBE_EXIST
      parkingInfos = [...parkingInfos, { distance, parkingId: parkings[i].id }]
    }
  }

  return { distanceType, parkingInfos }
}

const writeSheetFile = (baseSheet, newWorkbook, fileName, targetRows) => {
  const newRows = []
  targetRows.forEach(targetRow => {
    const row = baseSheet.getRow(targetRow.rowNumber)
    const rowData = []
    row.eachCell({ includeEmpty: true }, cell => {
      rowData.push(cell.value)
    })
    rowData.push(
      targetRow.parkingInfos
        .map(
          parking =>
            `https://admin-hs.carparking.jp/admin/search/edit.php?p_id=${parking.parkingId} (distance: ${parking.distance}m)`
        )
        .join('\n')
    )
    newRows.push(rowData)
  })

  const newWorksheet = newWorkbook.addWorksheet(fileName)

  newRows.forEach(rowData => {
    newWorksheet.addRow(rowData)
  })
}

/**
 * Processing Steps:
 * I will read the provided Excel file and filter data from the `緯度経度` column
 * With Osaka, I obtain its cityIds from the admin_carparking (https://github.com/azoom/admin-carparking/blob/19426286f57565b540c4043ee443e426a6228f03/admin/report/car_room_operational_status.php#L76)
 * I retrieve the locationParkings with Osaka cityIds.
 * Then I proceed to classify the crawled parking into three categories. (exist, maybeExist, new)
 * Finally, I proceed to write it to an Excel file.
 */
const filePath = './parking.xlsx'
const sheetName = '大阪市' // OSAKA
const osakaCityIds = [
  27102, 27103, 27104, 27106, 27107, 27108, 27109, 27111, 27113, 27114, 27115,
  27116, 27117, 27118, 27119, 27120, 27121, 27122, 27123, 27124, 27125, 27126,
  27127, 27128, 27227
]

const locationColumn = {
  name: 'D'
}

const main = async () => {
  const baseSheet = await getSheet(filePath, sheetName)
  const locations = await readColumnData(baseSheet, locationColumn)
  const osakaParkings = await getDBLocationParkings(osakaCityIds)
  const classifiedCrawlParking = classifyCrawlParking(locations, osakaParkings)
  // await fs.promises.writeFile('result.js', `export const classifiedCrawlParking = ${JSON.stringify(classifiedCrawlParking)}`)
  // const { classifiedCrawlParking } = await import('./result.js')

  const newWorkbook = new excelJS.Workbook()
  await Promise.all(
    Object.entries(classifiedCrawlParking).map(([type, data]) => {
      return writeSheetFile(baseSheet, newWorkbook, type, data)
    })
  )
  await newWorkbook.xlsx.writeFile('result.xlsx')
}

main()

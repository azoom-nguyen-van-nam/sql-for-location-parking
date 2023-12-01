import knex from './database.js'
import excelJS from 'exceljs'
import fs from 'fs'
import LatLon from 'geodesy/latlon-ellipsoidal-vincenty.js'
const MIN_DISTANCE = 30

const sheetNames = [
  {
    value: 1,
    name: '東京都',
    latin: 'Tokyo',
    selfCheck: () => {
      return true
    },
    existedCityIds: [
      13101, 13102, 13103, 13104, 13105, 13106, 13107, 13108, 13109, 13110,
      13111, 13112, 13113, 13114, 13115, 13116, 13117, 13118, 13119, 13120,
      13121, 13122, 13123, 13201, 13202, 13203, 13204, 13205, 13206, 13207,
      13208, 13209, 13210, 13211, 13212, 13213, 13214, 13215, 13218, 13219,
      13220, 13221, 13222, 13223, 13224, 13225, 13227, 13228, 13229, 13303,
      13305, 13307, 13308, 13361, 13362, 13363, 13364, 13381, 13382, 13401,
      13402, 13421
    ]
  },
  {
    value: 2,
    name: '神奈川県　横浜市及び川崎市',
    latin: 'Kanagawa',
    selfCheck: value => {
      return value.includes('神奈川県')
    },
    existedCityIds: [
      14101, 14102, 14103, 14104, 14105, 14106, 14107, 14108, 14109, 14110,
      14111, 14112, 14113, 14114, 14115, 14116, 14117, 14118, 14131, 14132,
      14133, 14134, 14135, 14136, 14137, 14201, 14203, 14204, 14205, 14206,
      14207, 14208, 14209, 14210, 14211, 14212, 14213, 14214, 14215, 14216,
      14217, 14218, 14301, 14321, 14341, 14342, 14361, 14362, 14363, 14364,
      14366, 14382, 14383, 14384, 14401, 14402
    ]
  },
  {
    value: 3,
    name: '福岡県博多市',
    latin: 'Fukuoka',
    selfCheck: () => {
      return true
    },
    existedCityIds: [
      40101, 40103, 40105, 40106, 40107, 40108, 40109, 40131, 40132, 40133,
      40134, 40135, 40136, 40137, 40202, 40203, 40204, 40205, 40206, 40207,
      40210, 40211, 40212, 40213, 40214, 40215, 40216, 40217, 40218, 40219,
      40220, 40221, 40222, 40223, 40224, 40225, 40226, 40227, 40228, 40229,
      40305, 40341, 40342, 40343, 40344, 40345, 40348, 40349, 40381, 40382,
      40383, 40384, 40401, 40402, 40421, 40447, 40448, 40462, 40463, 40503,
      40522, 40541, 40543, 40544, 40545, 40546, 40601, 40602, 40604, 40605,
      40608, 40609, 40610, 40621, 40625, 40642, 40646, 40647
    ]
  },
  //  { value: 4, name: '大阪府' }, OSAKA
  {
    value: 5,
    name: '愛知県　名古屋市',
    latin: 'Nagoya',
    selfCheck: () => {
      return true
    },
    existedCityIds: [
      23101, 23102, 23103, 23104, 23105, 23106, 23107, 23108, 23109, 23110,
      23111, 23112, 23113, 23114, 23115, 23116, 23201, 23202, 23203, 23204,
      23205, 23206, 23207, 23208, 23209, 23210, 23211, 23212, 23213, 23214,
      23215, 23216, 23217, 23219, 23220, 23221, 23222, 23223, 23224, 23225,
      23226, 23227, 23228, 23229, 23230, 23231, 23232, 23233, 23234, 23235,
      23237, 23238, 23302, 23304, 23342, 23345, 23361, 23362, 23421, 23422,
      23423, 23424, 23425, 23427, 23441, 23442, 23445, 23446, 23447, 23481,
      23482, 23483, 23501, 23521, 23561, 23562, 23563, 23603
    ]
  },
  {
    value: 6,
    name: '北海道　札幌市',
    latin: 'Sapporo',
    selfCheck: () => {
      return true
    },
    existedCityIds: [
      1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1109, 1110, 1202, 1203,
      1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213, 1214, 1215,
      1216, 1217, 1218, 1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226, 1227,
      1228, 1229, 1230, 1231, 1233, 1234, 1235, 1236, 1303, 1304, 1331, 1332,
      1333, 1334, 1337, 1343, 1345, 1346, 1347, 1361, 1362, 1363, 1364, 1367,
      1370, 1371, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400,
      1401, 1402, 1403, 1404, 1405, 1406, 1407, 1408, 1409, 1423, 1424, 1425,
      1427, 1428, 1429, 1430, 1431, 1432, 1433, 1434, 1436, 1437, 1438, 1439,
      1452, 1453, 1454, 1455, 1456, 1457, 1458, 1459, 1460, 1461, 1462, 1463,
      1464, 1465, 1468, 1469, 1470, 1471, 1481, 1482, 1483, 1484, 1485, 1486,
      1487, 1488, 1511, 1512, 1513, 1514, 1516, 1517, 1518, 1519, 1543, 1544,
      1545, 1546, 1547, 1549, 1550, 1552, 1555, 1558, 1559, 1560, 1561, 1562,
      1563, 1564, 1571, 1575, 1578, 1581, 1584, 1585, 1586, 1601, 1602, 1604,
      1607, 1608, 1609, 1610, 1631, 1632, 1633, 1634, 1635, 1636, 1637, 1638,
      1639, 1641, 1642, 1643, 1644, 1645, 1646, 1647, 1648, 1649, 1661, 1662,
      1663, 1664, 1665, 1667, 1668, 1691, 1692, 1693, 1694
    ]
  }
]

const locationColumns = {
  parkingName: {
    value: 'A',
    convertFinalValue: v => {
      return {
        name: v && v.trim().replace('の駐車場情報', ''),
        space_type: v && v.includes('バイク') ? 2 : 1,
        parking_type: v && v.includes('バイク') ? 2 : 1
      }
    }
  },
  crawlParkingId: {
    value: 'B',
    convertFinalValue: v => {
      return { crawledId: v }
    }
  },
  parkingAddress: {
    value: 'C',
    convertFinalValue: v => {
      return { address: v && v.trim() }
    }
  },
  parkingLocation: {
    value: 'D',
    convertFinalValue: v => {
      const [lat, lng] = v.split(',').map(x => Number(x.trim()))
      return {
        lat,
        lng
      }
    }
  },
  paymentUserFee: {
    value: 'F',
    convertFinalValue: v => {
      return {
        user_fee: Math.floor(
          Number(
            v.replace(',', '').replace('円', '').replace('ヵ月', '').trim()
          ) || 0
        ),
        user_fee_class: v.includes('円') ? 2 : v.includes('ヵ月') ? 1 : -1
      }
    }
  },
  paymentUserKeyMoney: {
    value: 'G',
    convertFinalValue: v => {
      return {
        user_key_money: Math.floor(
          Number(
            v.replace(',', '').replace('円', '').replace('ヵ月', '').trim()
          ) || 0
        ),
        user_key_money_class: v.includes('円') ? 2 : v.includes('ヵ月') ? 1 : -1
      }
    }
  },
  paymentDeposit: {
    value: 'H',
    convertFinalValue: v => {
      return {
        deposit: Math.floor(
          Number(
            v.replaceAll(',', '').replace('円', '').replace('ヵ月', '').trim()
          ) || 0
        ),
        deposit_class: v.includes('円') ? 2 : v.includes('ヵ月') ? 1 : -1
      }
    }
  },
  timeTimeClass: {
    value: 'I',
    convertFinalValue: v => {
      return {
        time_class: v === '24時間' ? 1 : -1
      }
    }
  },
  spaceFacility: {
    value: 'J',
    convertFinalValue: v => {
      return {
        facility: v === '平面' ? 2 : v === '機械' ? 12 : 0
      }
    }
  },
  spaceRoofType: {
    value: 'K',
    convertFinalValue: v => {
      return {
        roof_type: v === '屋内' ? 1 : v === '屋外' ? 2 : -1
      }
    }
  },
  sizeLength: {
    value: 'O',
    convertFinalValue: v => {
      return {
        length: parseInt(v.replace(',', '')) || 0
      }
    }
  },
  sizeWidth: {
    value: 'P',
    convertFinalValue: v => {
      return {
        width: parseInt(v.replace(',', '')) || 0
      }
    }
  },
  sizeHeight: {
    value: 'Q',
    convertFinalValue: v => {
      return {
        height: parseInt(v.replace(',', '')) || 0
      }
    }
  },
  sizeWeight: {
    value: 'R',
    convertFinalValue: v => {
      return {
        weight: parseInt(v.replace(',', '')) || 0
      }
    }
  },
  spaceHire: {
    value: 'S',
    convertFinalValue: v => {
      return {
        hire: parseInt(v.replace(',', '')) || 0
      }
    }
  },
  spaceTotalEmptyRooms: {
    value: 'W',
    convertFinalValue: v => {
      return {
        total_empty_rooms: parseInt(v) || 0
      }
    }
  },
  spaceOthers: {
    value: 'X',
    convertFinalValue: v => {
      return {
        is_available_for_large_cars: v && v.includes('大型') ? 1 : 0,
        is_available_for_high_roof_cars: v && v.includes('ハイルーフ') ? 1 : 0
      }
    }
  }
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

const fetchCrawledParkings = async (sheet, attributionValue) => {
  const dataMap = []
  sheet.eachRow((row, rowNumber) => {
    const rowData = Object.entries(locationColumns).reduce(
      (acc, [key, col]) => {
        const colValue = row.getCell(col.value).value
        return { ...acc, ...col.convertFinalValue(colValue) }
      },
      {
        agent_fee_for_procedure: null,
        agent_fee_for_procedure_class: -1,
        opened_at: '',
        closed_at: '',
        opened_at_saturday: '',
        closed_at_saturday: '',
        opened_at_sunday: '',
        closed_at_sunday: '',
        referral_fee_from_management: -1,
        referral_fee_from_owner: -1,
        issuing_type: -1,
        issuing_fee: 0,
        issuing_fee_tax_type: 1,
        status: 0,
        address_view: '',
        capacity: 0,
        special_instruction: '',
        is_noticed_about_cancel: 0,
        created_from: 0,
        source_type: 1,
        is_public_about_hire: 0,
        negotiation_about_hire: -1,
        has_division_drawing: 0,
        can_search_by_address: 0,
        has_appointment_for_sublease: 0,
        created_by_id: 1,
        use_record_in_short_term: -1,
        name_prefix: '',
        rentable_for_outside: -1,
        is_important_for_marketing: 0,
        attribution: attributionValue,
        ground_height: 0,
        tire_width: 0,
        remarks: '',
        setting_type: 1,
        is_available_for_small_cars: 1,
        is_available_for_middle_cars: 1,
        is_available_for_middle_roof_cars: 1,
        is_ignore_for_aggregate_markets_hire: 0,
        capacity: 0,
        hire_tax_class: -1,
        retention_corp: 1
      }
    )
    if (rowNumber > 1) {
      dataMap.push(rowData)
    }
  })
  return dataMap
}

const calcParkingDistance = (parkingA, parkingB) => {
  const pA = new LatLon(parkingA.lat, parkingA.lng)
  const pB = new LatLon(parkingB.lat, parkingB.lng)

  return pA.distanceTo(pB)
}

const getValidCrawledParkings = (newParkings, oldParkings, selfCheck) => {
  return newParkings.filter((newParking, index) => {
    console.log(index)
    return (
      newParking.address &&
      selfCheck(newParking.address) &&
      checkIsValidDistance(oldParkings, newParking)
    )
  })
}

const checkIsValidDistance = (parkings, { lat, lng }) => {
  return parkings.every(parking => {
    const distance = calcParkingDistance({ lat, lng }, parking)
    return distance >= MIN_DISTANCE
  })
}

const formatCrawledParkings = parkings => {
  return parkings.reduce((acc, parking) => {
    const existedParking = acc.find(p => p.id === parking.crawledId)
    if (existedParking) {
      existedParking.location_spaces = [
        ...existedParking.location_spaces,
        {
          is_visible: 0,
          total_empty_rooms: parking.total_empty_rooms,
          hire: parking.hire,
          facility: parking.facility,
          setting_type: parking.setting_type,
          is_available_for_small_cars: parking.is_available_for_small_cars,
          is_available_for_middle_cars: parking.is_available_for_middle_cars,
          is_available_for_large_cars: parking.is_available_for_large_cars,
          is_available_for_middle_roof_cars:
            parking.is_available_for_middle_roof_cars,
          is_available_for_high_roof_cars:
            parking.is_available_for_high_roof_cars,
          is_ignore_for_aggregate_markets_hire:
            parking.is_ignore_for_aggregate_markets_hire,
          capacity: parking.capacity,
          roof_type: parking.roof_type,
          hire_tax_class: parking.hire_tax_class,
          name: `p${existedParking.location_spaces.length + 1}`,
          space_type: parking.space_type,
          location_size: {
            length: parking.length,
            width: parking.width,
            height: parking.height,
            weight: parking.weight,
            ground_height: parking.ground_height,
            tire_width: parking.tire_width,
            remarks: parking.remarks
          }
        }
      ]

      return acc
    }

    return [
      ...acc,
      {
        id: parking.crawledId,
        location_parking: {
          lat: parking.lat,
          lng: parking.lng,
          status: parking.status,
          parking_type: parking.parking_type,
          name: parking.name,
          address: parking.address,
          address_view: parking.address_view,
          capacity: parking.capacity,
          special_instruction: parking.special_instruction,
          is_noticed_about_cancel: parking.is_noticed_about_cancel,
          created_from: parking.created_from,
          source_type: parking.source_type,
          is_public_about_hire: parking.is_public_about_hire,
          negotiation_about_hire: parking.negotiation_about_hire,
          has_division_drawing: parking.has_division_drawing,
          can_search_by_address: parking.can_search_by_address,
          has_appointment_for_sublease: parking.has_appointment_for_sublease,
          created_at: parking.created_at,
          updated_at: parking.updated_at,
          payment_id: parking.payment_id,
          income_for_agency_id: parking.income_for_agency_id,
          available_time_range_id: parking.available_time_range_id,
          strage_document_id: parking.strage_document_id,
          city_id: parking.city_id,
          region_id: parking.region_id,
          created_by_id: parking.created_by_id,
          use_record_in_short_term: parking.use_record_in_short_term,
          name_prefix: parking.name_prefix,
          rentable_for_outside: parking.rentable_for_outside,
          is_important_for_marketing: parking.is_important_for_marketing,
          attribution: parking.attribution,
          retention_corp: parking.retention_corp
        },
        location_payment: {
          user_fee: parking.user_fee,
          user_fee_class: parking.user_fee_class,
          user_key_money: parking.user_key_money,
          user_key_money_class: parking.user_key_money_class,
          deposit: parking.deposit,
          deposit_class: parking.deposit_class,
          agent_fee_for_procedure: parking.agent_fee_for_procedure,
          agent_fee_for_procedure_class: parking.agent_fee_for_procedure_class
        },
        location_availabletimerange: {
          time_class: parking.time_class,
          opened_at: parking.opened_at,
          closed_at: parking.closed_at,
          opened_at_saturday: parking.opened_at_saturday,
          closed_at_saturday: parking.closed_at_saturday,
          opened_at_sunday: parking.opened_at_sunday,
          closed_at_sunday: parking.closed_at_sunday
        },
        company_incomeforagency: {
          referral_fee_from_management: parking.referral_fee_from_management,
          referral_fee_from_owner: parking.referral_fee_from_owner
        },
        location_stragedocument: {
          issuing_type: parking.issuing_type,
          issuing_fee: parking.issuing_fee,
          issuing_fee_tax_type: parking.issuing_fee_tax_type
        },
        location_spaces: [
          {
            is_visible: 1,
            total_empty_rooms: parking.total_empty_rooms,
            hire: parking.hire,
            facility: parking.facility,
            setting_type: parking.setting_type,
            is_available_for_small_cars: parking.is_available_for_small_cars,
            is_available_for_middle_cars: parking.is_available_for_middle_cars,
            is_available_for_large_cars: parking.is_available_for_large_cars,
            is_available_for_middle_roof_cars:
              parking.is_available_for_middle_roof_cars,
            is_available_for_high_roof_cars:
              parking.is_available_for_high_roof_cars,
            is_ignore_for_aggregate_markets_hire:
              parking.is_ignore_for_aggregate_markets_hire,
            capacity: parking.capacity,
            roof_type: parking.roof_type,
            hire_tax_class: parking.hire_tax_class,
            name: 'p',
            space_type: parking.space_type,
            location_size: {
              length: parking.length,
              width: parking.width,
              height: parking.height,
              weight: parking.weight,
              ground_height: parking.ground_height,
              tire_width: parking.tire_width,
              remarks: parking.remarks
            }
          }
        ]
      }
    ]
  }, [])
}

const writeSheetFile = async (sheetName, parkings, newWorkbook) => {
  const newRows = []

  parkings.forEach(parking => {
    if (newRows.length === 0) {
      // add key to first row in excel
      newRows[0] = [...Object.keys(parking)]
    }
    newRows.push(Object.values(parking))
  })

  const newWorksheet = newWorkbook.addWorksheet(sheetName)
  newRows.forEach(rowData => {
    newWorksheet.addRow(rowData)
  })
}

const filePath = './parking.xlsx'
const main = async () => {
  const newWorkbook = new excelJS.Workbook()

  for (const sheet of sheetNames) {
    const areaSheet = await getSheet(filePath, sheet.name)
    const locations = await fetchCrawledParkings(areaSheet, sheet.value)
    const existedParkings = await getDBLocationParkings(sheet.existedCityIds)
    const validParkings = getValidCrawledParkings(
      locations,
      existedParkings,
      sheet.selfCheck
    )
    const formattedParkings = formatCrawledParkings(validParkings)

    // const { formattedParkings } = await import(
    //   `./${sheet.value}-${sheet.name}.js`
    // )
    console.log('formattedParkings length', formattedParkings.length)
    writeSheetFile(sheet.name, validParkings, newWorkbook)

    await fs.promises.writeFile(
      `${sheet.value}-${sheet.name}.js`,
      `export const formattedParkings = ${JSON.stringify(formattedParkings)}`
    )
  }

  await newWorkbook.xlsx.writeFile('result.xlsx')
}

main()

import knex from './database.js'
import excelJS from 'exceljs'
import fs from 'fs'
import LatLon from 'geodesy/latlon-ellipsoidal-vincenty.js'
const MIN_DISTANCE = 30
const attributionType = {
  osaka: 4
}

const locationColumns = {
  parkingName: {
    value: 'A',
    convertFinalValue: v => {
      return {
        name: v && v.trim(),
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

const fetchCrawledParkings = async sheet => {
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
        attribution: attributionType.osaka, // For OSAKA
        ground_height: 0,
        tire_width: 0,
        remarks: '',
        setting_type: 1,
        is_available_for_small_cars: 1,
        is_available_for_middle_cars: 1,
        is_available_for_middle_roof_cars: 1,
        is_ignore_for_aggregate_markets_hire: 0,
        capacity: 0,
        hire_tax_class: -1
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

const getValidCrawledParkings = (newParkings, oldParkings) => {
  return newParkings.filter((newParking, index) => {
    console.log(index)
    return checkIsValidDistance(oldParkings, newParking)
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
          attribution: parking.attribution
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

const writeSheetFile = async parkings => {
  const newWorkbook = new excelJS.Workbook()
  const newRows = []

  parkings.forEach(parking => {
    if (newRows.length === 0) {
      // add key to first row in excel
      newRows[0] = [...Object.keys(parking)]
    }
    newRows.push(Object.values(parking))
  })

  const newWorksheet = newWorkbook.addWorksheet('>= 30m')
  newRows.forEach(rowData => {
    newWorksheet.addRow(rowData)
  })
  await newWorkbook.xlsx.writeFile('result.xlsx')
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

const main = async () => {
  const baseSheet = await getSheet(filePath, sheetName)
  const locations = await fetchCrawledParkings(baseSheet)
  const osakaParkings = await getDBLocationParkings(osakaCityIds)
  const validParkings = getValidCrawledParkings(locations, osakaParkings)
  const formattedParkings = formatCrawledParkings(validParkings)

  console.log('formattedParkings length', formattedParkings.length)

  await fs.promises.writeFile(
    'final.js',
    `export const formattedParkings = ${JSON.stringify(formattedParkings)}`
  )
  // const { formattedParkings } = await import('./result.js')

  writeSheetFile(validParkings)
}

main()

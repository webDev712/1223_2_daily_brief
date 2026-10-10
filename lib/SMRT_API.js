function testSmrtApi() {
  const url = getURL();
  const bearer = getBearer();

  const payload = {
    query: '{ __typename }'
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + bearer
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  return response.getContentText() === '{"data":{"__typename":"Query"}}';
}

const test = () => console.log(getURL())

function introspectBusiness() {
  const payload = {
    query: `
      query {
        __type(name: "Business") {
          name
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    `
  };

  sendQuery(payload);
}


const getEmployees = () => {
  const payload = {
    query: `
      query {
        business {
        employees {
          id
          name
        }
      }
      }
    `
  };
  let employeesResponse = sendQuery(payload);
  let employees = [];
  try {
    employees = employeesResponse.data.business.employees;
  }
  catch (e) {
    console.log(e);
  }
  // console.log(employees)
  return employees;
}


const getProductionStationTypeEnum = () => {
  const payload = {
    query: `
        query {
          __type(name: "ProductionStationTypeEnum") {
            name
            enumValues {
              name
          }
      }
    }`
  };

  let PSTEResponse = sendQuery(payload)

  let PSTE = []
  try {
    PSTE = PSTEResponse.data.__type.enumValues;
  }
  catch (e) {
    console.log(e);
  }
  console.log(PSTE)
  return PSTE;
}

const get_Pieces_PPOH_Value = (departments, limit=100000, skip_zero_hours=true) => {
  const PSTE = getProductionStationTypeEnum();
  const employees = getEmployees();
  console.log('PSTE.map(p => p.name)')
  console.log(PSTE.map(p => p.name))
  let results = []
  let queryParts = [];
  let station = {name: 'press'};
  let alias;
  let i = 0;
  employees.forEach((emp) => {
    if (i < limit){
      PSTE.filter(pste => departments ? PSTE.map(p => p.name).includes(pste.name) : ['press'].includes(pste.name)).forEach((station) => {
      alias = `emp${emp.id}_${station.name}`;
      queryParts.push(`
        ${alias}: business {
          productionStationStatistics(
            employeeId: "${emp.id}"
            productionStationType: ${station.name}
          ) {
            id
            localId
            hours
            pieces
            weightedPieces
            ppoh
            goal
            value
          }
        }
      `);
      query = `
      query {
          ${queryParts[i]}
        }
      `;
      
      const data = sendQuery({ query });
      if (data.data){
        emp_data = data.data[alias].productionStationStatistics;
        emp_data.emp_id = Object.keys(data.data)[0].match(/(?<=emp)\d+(?=_)/gm)[0];
        emp_data.name = employees.filter((e) => e.id == emp_data.emp_id)[0].name || '';
        emp_data.date = new Date(emp_data.localId.match(/_([^_]+)$/gm)[0].slice(1) * 1000).toISOString().split('T')[0]
        emp_data.department = station.name
        if(!skip_zero_hours || (emp_data.hours !== 0)){
          results.push(emp_data);
        }
      }
      i++;
        
      })
      
    }
  });
  console.log(results);
  return results;
};



      // let query = `
      //   query {
      //     ${alias}: business {
      //       productionStationStatistics(
      //         employeeId: "${emp.id}"
      //         productionStationType: ${station.name}
      //       ) {
      //         id
      //         localId
      //         hours
      //         minutes
      //         pieces
      //         weightedPieces
      //         ppoh
      //         goal
      //         value
      //         itemIdList
      //       }
      //     }
      //   }
      // `;


// max@lenovoblue:~$ curl -X POST 'https://apitesting.smrtapp.com/graphql' \
//   -H 'Content-Type: application/json' \
//   -H "Authorization: Bearer $my_bearer" \
//   -d '{
//     "query": "query { __type(name: \"Business\") { name fields { name type { name kind ofType { name kind } } } } }"
//   }'
// {"data":{"__type":{"name":"Business","fields":[{"name":"id","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"ID","kind":"SCALAR"}}},{"name":"localId","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"ID","kind":"SCALAR"}}},{"name":"shortId","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"Int","kind":"SCALAR"}}},{"name":"subdomain","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"String","kind":"SCALAR"}}},{"name":"settings","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"Settings","kind":"OBJECT"}}},{"name":"employeeSettings","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"Settings","kind":"OBJECT"}}},{"name":"stores","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"storesForCurrentBrand","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"communicationTemplatesList","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"contactCommunicationTemplates","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"CommunicationTemplates","kind":"OBJECT"}}},{"name":"employees","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"routes","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"route","type":{"name":"Route","kind":"OBJECT","ofType":null}},{"name":"routesOnDate","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"groups","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"notes","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"notesCount","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"Int","kind":"SCALAR"}}},{"name":"brands","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"agents","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"holidays","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"itemCategories","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"itemTypes","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"subscriptions","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"taxRates","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"paymentMethods","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"taxConfigurationRules","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"itemValidationRules","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"itemFields","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"financialDepartments","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"specialCares","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"alertTypes","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"alertSubTypes","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"chatRooms","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"customerFields","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"usesPaymentSystem","type":{"name":"Boolean","kind":"SCALAR","ofType":null}},{"name":"getCustomer","type":{"name":"Customer","kind":"OBJECT","ofType":null}},{"name":"getCustomers","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"searchCustomer","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"getOrder","type":{"name":"Order","kind":"OBJECT","ofType":null}},{"name":"getTicket","type":{"name":"OrderBag","kind":"OBJECT","ofType":null}},{"name":"getDueDate","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"DateTime","kind":"SCALAR"}}},{"name":"getAppointment","type":{"name":"Appointment","kind":"OBJECT","ofType":null}},{"name":"queryReports","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"QueryReportsResult","kind":"OBJECT"}}},{"name":"productionStationStatistics","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"ProductionStationStatistics","kind":"OBJECT"}}},{"name":"merchants","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"surcharges","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"customPriceLists","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"marketingEmailTemplates","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"marketingBroadcasts","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"marketingFilters","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"autoReplyReviewTemplates","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"stripePublishableKey","type":{"name":null,"kind":"NON_NULL","ofType":{"name":"String","kind":"SCALAR"}}},{"name":"promotions","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"validMarketingPromotions","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"lockers","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"racks","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"deliveryVehicles","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"geoFences","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"uniqueTwilioErrors","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"storesForReviews","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"emailReports","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}},{"name":"featureFlags","type":{"name":null,"kind":"NON_NULL","ofType":{"name":null,"kind":"LIST"}}}]}}}max@lenovoblue:~$ ^C



import { ApiCheck } from 'checkly/constructs'

new ApiCheck('wusool-api-catalog', {
  name: 'Wusool API - Catalog Fetch',
  frequency: 1,
  locations: ['us-east-1', 'eu-west-1', 'me-south-1'],
  request: {
    url: 'https://wusool.ps/api/catalog',
    method: 'GET',
    assertions: [
      { source: 'STATUS_CODE', comparison: 'EQUALS', target: '200' },
    ],
  },
  degradedResponseTime: 800,
  maxResponseTime: 1000,
  tags: ['api', 'catalog'],
})

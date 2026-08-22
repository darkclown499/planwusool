import { ApiCheck } from 'checkly/constructs'

new ApiCheck('wusool-api-whatsapp', {
  name: 'Wusool API - WhatsApp Integration',
  frequency: 1,
  locations: ['us-east-1', 'eu-west-1', 'me-south-1'],
  request: {
    url: 'https://wusool.ps/api/whatsapp/status',
    method: 'GET',
    assertions: [
      { source: 'STATUS_CODE', comparison: 'EQUALS', target: '200' },
    ],
  },
  degradedResponseTime: 800,
  maxResponseTime: 1000,
  tags: ['api', 'whatsapp'],
})

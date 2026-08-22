import { UrlMonitor } from 'checkly/constructs'

new UrlMonitor('wusool-homepage-ssl', {
  name: 'Wusool Homepage & SSL',
  url: 'https://wusool.ps',
  frequency: 1,
  locations: ['us-east-1', 'eu-west-1', 'me-south-1'],
  request: {
    assertions: [
      { source: 'STATUS_CODE', comparison: 'EQUALS', target: '200' },
    ],
  },
  degradedResponseTime: 800,
  maxResponseTime: 1000,
  tags: ['homepage', 'ssl'],
})

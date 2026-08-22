import { BrowserCheck } from 'checkly/constructs'

new BrowserCheck('wusool-auth-onboarding', {
  name: 'Wusool Auth & Onboarding - Login Page',
  frequency: 5,
  locations: ['us-east-1', 'eu-west-1', 'me-south-1'],
  code: { entrypoint: './wusool-auth-onboarding.spec.ts' },
  tags: ['auth', 'login'],
})

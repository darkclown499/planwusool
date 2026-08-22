import { defineConfig } from 'checkly'

export default defineConfig({
  projectName: 'Wusool Monitoring',
  logicalId: 'wusool-monitoring',
  checks: {
    locations: ['us-east-1', 'eu-west-1', 'me-south-1'],
    checkMatch: '**/*.check.ts',
    browserChecks: { testMatch: '**/*.spec.ts' },
  },
})

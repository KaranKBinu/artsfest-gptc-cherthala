import { testCertificateGeneration } from './src/actions/certificates-puppeteer'

console.log('🚀 Starting Malayalam certificate generation test...\n')

testCertificateGeneration()
    .then(result => {
        if (result.success) {
            console.log('\n✅ SUCCESS! Certificate generated with Malayalam text')
            console.log('📄 Check the file at:', result.path)
            process.exit(0)
        } else {
            console.error('\n❌ FAILED:', result.error)
            process.exit(1)
        }
    })
    .catch(err => {
        console.error('\n❌ ERROR:', err)
        process.exit(1)
    })

import { useState } from 'react'
import { cloudSetup } from './cloud'
import CloudAccount from './CloudAccount'
import JournalApp from './JournalApp'
import InstallApp from './InstallApp'

export default function App() {
  const [setup] = useState(cloudSetup)
  const [demo, setDemo] = useState(!setup.client)
  return <>{demo ? <JournalApp onCloudLogin={() => setDemo(false)} /> : <CloudAccount client={setup.client} createDeviceClient={setup.createDeviceClient} setupError={setup.error} onDemo={() => setDemo(true)} />}<InstallApp /></>
}

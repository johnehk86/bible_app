import { useState } from 'react'
import HomeScreen from './screens/HomeScreen.jsx'
import PassageListScreen from './screens/PassageListScreen.jsx'
import MemorizationScreen from './screens/MemorizationScreen.jsx'
import { PASSAGES } from './data/verses.js'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [selectedPassage, setSelectedPassage] = useState(null)

  const handleSelectPassage = (id) => {
    const passage = PASSAGES.find(p => p.id === id)
    setSelectedPassage(passage)
    setScreen('memorization')
  }

  return (
    <>
      {screen === 'home' && (
        <HomeScreen onNavigate={setScreen} onSelectPassage={handleSelectPassage} />
      )}
      {screen === 'memorization-list' && (
        <PassageListScreen
          onSelect={handleSelectPassage}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'memorization' && selectedPassage && (
        <MemorizationScreen
          passage={selectedPassage}
          onBack={() => setScreen('memorization-list')}
        />
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import HomeScreen from './screens/HomeScreen.jsx'
import PassageListScreen from './screens/PassageListScreen.jsx'
import MemorizationScreen from './screens/MemorizationScreen.jsx'
import InstallScreen from './screens/InstallScreen.jsx'
import { PASSAGES } from './data/verses.js'

// 화면 상태를 브라우저 history 에 기록 → 휴대폰 뒤로가기 버튼이 앱 안에서 이전 화면으로 동작
// nav = { screen: 'home' | 'memorization-list' | 'memorization' | 'install', passageId? }
const HOME = { screen: 'home' }

export default function App() {
  const [nav, setNav] = useState(() => window.history.state?.screen ? window.history.state : HOME)

  useEffect(() => {
    window.history.replaceState(nav, '')
    const onPop = (e) => {
      setNav(e.state?.screen ? e.state : HOME)
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (next) => {
    window.history.pushState(next, '')
    setNav(next)
    window.scrollTo(0, 0)
  }
  const goBack = () => window.history.back()

  const handleSelectPassage = (id) => navigate({ screen: 'memorization', passageId: id })
  const selectedPassage = PASSAGES.find(p => p.id === nav.passageId)
  // 없는 구절 id 로 복원된 경우 홈으로
  const screen = nav.screen === 'memorization' && !selectedPassage ? 'home' : nav.screen

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          onNavigate={(screen) => navigate({ screen })}
          onSelectPassage={handleSelectPassage}
        />
      )}
      {screen === 'memorization-list' && (
        <PassageListScreen onSelect={handleSelectPassage} onBack={goBack} />
      )}
      {screen === 'memorization' && selectedPassage && (
        <MemorizationScreen passage={selectedPassage} onBack={goBack} />
      )}
      {screen === 'install' && (
        <InstallScreen onBack={goBack} />
      )}
    </>
  )
}

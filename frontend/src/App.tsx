import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Proofread from '@/pages/Proofread'
import Dedup from '@/pages/Dedup'
import Analysis from '@/pages/Analysis'
import DifyKnowledge from '@/pages/DifyKnowledge'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="proofread" element={<Proofread />} />
          <Route path="dedup" element={<Dedup />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="knowledge" element={<DifyKnowledge />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

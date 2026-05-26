import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home         from './pages/Home.jsx'
import Session      from './pages/Session.jsx'
import CourseDetail from './pages/CourseDetail.jsx'
import Due          from './pages/Due.jsx'
import Progress     from './pages/Progress.jsx'
import Levels       from './pages/Levels.jsx'
import Browse       from './pages/Browse.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/session/:id" element={<Session />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/due"         element={<Due />} />
        <Route path="/progress"    element={<Progress />} />
        <Route path="/levels"      element={<Levels />} />
        <Route path="/browse"      element={<Browse />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

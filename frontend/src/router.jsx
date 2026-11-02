import { createBrowserRouter } from 'react-router'
import HomePage from './pages/store/HomePage'

/**
 * Router tạm; layout store/admin và route guard làm ở task 09.
 */
export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
])

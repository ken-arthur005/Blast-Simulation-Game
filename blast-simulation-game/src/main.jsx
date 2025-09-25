import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './App.css'
import {createBrowserRouter, RouterProvider} from 'react-router-dom'
import HomePage from './Pages/HomePage.jsx';
import CsvParse from './Components/CsvParse.jsx'


const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage/>
  },
  {
    path: '/csvfile',
    element: <CsvParse/>
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

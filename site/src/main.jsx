import React from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  useNavigate
} from "react-router-dom";
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import pages from './assets/json/pages.json';

//const navigate = useNavigate();

function checkPage(number) {
  return pages.filter(obj => {
    return obj.number == number
  })[0];
}

var teletextPageSelector = [];
window.addEventListener('keyup', function(e) {
  if (isNaN(e.key)) {
    return;
  }
  teletextPageSelector.push(e.key);
  if (teletextPageSelector.length == 3) {

    let page = teletextPageSelector.join('')
    if (checkPage(page) === undefined) {
      page = 404;
    }
    console.log(page);
    //navigate(page);
    teletextPageSelector = []
  }
})

const router = createBrowserRouter([
  {
    path: "/:page?",
    element: <App />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/*
    <App />
    */}
     <RouterProvider router={router} />
  </React.StrictMode>,
)

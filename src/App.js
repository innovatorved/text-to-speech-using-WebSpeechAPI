import React from 'react';
import { BrowserRouter as Router} from "react-router-dom";

import BackState from './Context/BackState';

import './App.css';

import Home from './Component/Home';
import Navbar from './Component/Navbar';

function App() {
  return (
    <div className="App">
      <BackState>
        <Router>
          <Navbar/>
          
          <div style={{"marginTop":"60px"}}>
            <Home />
          </div>
          
        </Router>
      </BackState>
    </div>
  );
}

export default App;

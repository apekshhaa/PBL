/*import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
*/

import React, { useState } from 'react';
import './App.css';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';

function App() {
  const [page, setPage] = useState('signup');

  const handleSignup = () => {
    setPage('dashboard');
  };

  return (
    <>
      {page === 'signup' && <SignUp onSignup={handleSignup} />}
      {page === 'dashboard' && <Dashboard />}
    </>
  );
}

export default App;



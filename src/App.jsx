import React from 'react'
import PatientList from './components/PatientList'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>OnTarget EHR Interface</h1>
        <p className="subtitle">Demo General Hospital - Patient List</p>
      </header>
      <main className="App-main">
        <PatientList />
      </main>
    </div>
  )
}

export default App


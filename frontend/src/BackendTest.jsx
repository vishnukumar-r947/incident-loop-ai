import { useEffect, useState } from 'react'

function BackendTest() {
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then((response) => response.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('Connection failed'))
  }, [])

  return <p>Backend Status: {status}</p>
}

export default BackendTest
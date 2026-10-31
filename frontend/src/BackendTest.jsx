import { useEffect, useState } from 'react'
import API_URL from './api';

function BackendTest() {
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((response) => response.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('Connection failed'))
  }, [])

  return <p>Backend Status: {status}</p>
}

export default BackendTest
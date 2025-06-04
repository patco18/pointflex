import React, { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Chargement...')
  const [response, setResponse] = useState('')
  const [input, setInput] = useState('')
  const [postResult, setPostResult] = useState('')

  useEffect(() => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage('Erreur de connexion au backend'))
  }, [])

  const handleClick = () => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setResponse(data.message))
      .catch(() => setResponse('Échec de la requête au backend'))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetch('/api/echo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: input })
    })
      .then(res => res.json())
      .then(data => setPostResult(data.response))
      .catch(() => setPostResult("Erreur lors de l'envoi"))
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>PointFlex</h1>
      <p>{message}</p>
      <button onClick={handleClick}>Tester l'API Backend</button>
      {response && <p style={{ marginTop: '1rem', color: 'green' }}>{response}</p>}

      <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écris un message"
        />
        <button type="submit">Envoyer</button>
      </form>

      {postResult && <p style={{ marginTop: '1rem', color: 'blue' }}>{postResult}</p>}
    </div>
  )
}

export default App

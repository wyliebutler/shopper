import { useState } from 'react'
import { Lock } from 'lucide-react'

function Login({ onLogin }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })
            if (res.ok) {
                const data = await res.json()
                onLogin(data.token)
            } else {
                setError('Incorrect password')
            }
        } catch (err) {
            setError('Login failed')
        }
    }

    return (
        <div className="glass-container" style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
            <h1>Welcome</h1>
            <p style={{ marginBottom: '2rem', opacity: 0.8 }}>Please enter the family password.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    <Lock size={20} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.5 }} />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                        autoFocus
                    />
                </div>

                {error && <p style={{ color: '#ff4444', margin: 0 }}>{error}</p>}

                <button type="submit" className="btn-primary">
                    Unlock List
                </button>
            </form>
        </div>
    )
}

export default Login

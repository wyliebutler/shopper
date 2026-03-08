import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'

export default function StoreManager({ show, onClose, stores, onAddStore, onDeleteStore }) {
    const [newStoreName, setNewStoreName] = useState('')
    const [newStoreColor, setNewStoreColor] = useState('#ffffff')

    if (!show) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!newStoreName.trim()) return
        
        const success = await onAddStore(newStoreName, newStoreColor)
        if (success) {
            setNewStoreName('')
            setNewStoreColor('#ffffff')
        }
    }

    return (
        <div style={{
            position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 50,
            background: 'rgba(30,41,59,0.95)', padding: '15px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: 'white' }}>Manage Stores</h3>
                <button onClick={onClose} className="btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} placeholder="Store name" style={{ flex: 1 }} />
                <input type="color" value={newStoreColor} onChange={e => setNewStoreColor(e.target.value)} style={{ width: '40px', padding: '0', height: '40px', borderRadius: '8px', cursor: 'pointer' }} title="Pick Store Color" />
                <button type="submit" className="btn-primary" style={{ padding: '0 15px' }}><Plus size={20} /></button>
            </form>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                {stores.map(store => (
                    <li key={store.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ color: store.color, fontWeight: 'bold' }}>{store.name}</span>
                        <button onClick={() => onDeleteStore(store.id)} className="btn-icon btn-delete" style={{ padding: '4px' }}><Trash2 size={16} /></button>
                    </li>
                ))}
                {stores.length === 0 && <li style={{ opacity: 0.5, textAlign: 'center', fontSize: '0.9em' }}>No stores added.</li>}
            </ul>
        </div>
    )
}

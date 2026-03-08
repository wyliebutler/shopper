import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Trash2, Check, X, Camera, Pencil, LogOut, Mic, ScanBarcode, RefreshCcw, Store, Filter, ShoppingBag, List } from 'lucide-react'
import { io } from 'socket.io-client'
import Login from './Login'
import BarcodeScanner from './BarcodeScanner'
import StoreManager from './StoreManager'
import AddForm from './AddForm'
import ItemCard from './ItemCard'

function App() {
    const [items, setItems] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [selectedStore, setSelectedStore] = useState('')
    const [stores, setStores] = useState([])
    const [showStoreManager, setShowStoreManager] = useState(false)
    const [activeFilter, setActiveFilter] = useState('All')
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')
    const [editStore, setEditStore] = useState('')
    const [token, setToken] = useState(localStorage.getItem('shopper_token'))
    const [isListening, setIsListening] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [isStoreMode, setIsStoreMode] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (token) {
            fetchItems()
            fetchStores()

            const socket = io()

            socket.on('item_added', (newItem) => {
                setItems(prevItems => {
                    if (!prevItems.find(i => i.id === newItem.id)) {
                        return [newItem, ...prevItems];
                    }
                    return prevItems;
                });
            })

            socket.on('item_updated', (updatedData) => {
                setItems(prevItems => prevItems.map(item => {
                    if (item.id === updatedData.id) {
                        const merged = { ...item };
                        if (updatedData.text !== undefined) merged.text = updatedData.text;
                        if (updatedData.completed !== undefined) merged.completed = updatedData.completed;
                        if (updatedData.store_id !== undefined) merged.store_id = updatedData.store_id;
                        return merged;
                    }
                    return item
                }))
            })

            socket.on('item_deleted', (id) => {
                setItems(prevItems => prevItems.filter(item => item.id !== id))
            })

            socket.on('items_cleared', () => {
                setItems(prevItems => prevItems.filter(item => !item.completed))
            })
            
            socket.on('store_added', (newStore) => {
                setStores(prev => {
                    if (!prev.find(s => s.id === newStore.id)) {
                        return [...prev, newStore].sort((a,b) => a.name.localeCompare(b.name));
                    }
                    return prev;
                })
            })

            socket.on('store_updated', (updatedStore) => {
                setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s).sort((a,b) => a.name.localeCompare(b.name)))
            })

            socket.on('store_deleted', (id) => {
                setStores(prev => prev.filter(s => s.id !== id))
                if (activeFilter === id.toString()) setActiveFilter('All')
                if (selectedStore === id.toString()) setSelectedStore('')
            })

            return () => {
                socket.disconnect()
            }
        }
    }, [token])

    const handleApiError = (status) => {
        if (status === 401 || status === 403) {
            handleLogout()
        }
    }

    const vibrate = (pattern) => {
        if (navigator.vibrate) {
            navigator.vibrate(pattern)
        }
    }

    const handleLogin = (newToken) => {
        localStorage.setItem('shopper_token', newToken)
        setToken(newToken)
    }

    const handleLogout = () => {
        localStorage.removeItem('shopper_token')
        setToken(null)
        setItems([])
    }

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/items', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setItems(data)
            } else {
                handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error fetching items:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStores = async () => {
        try {
            const res = await fetch('/api/stores', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setStores(data)
            }
        } catch (error) {
            console.error('Error fetching stores:', error)
        }
    }

    const forceRefresh = () => {
        setLoading(true)
        setActiveFilter('All')
        fetchItems()
        fetchStores()
    }

    const createNewItem = async (text) => {
        if (!text.trim()) return false
        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: text, store_id: selectedStore || null })
            })
            if (res.ok) {
                vibrate(50)
                return true
            } else {
                 handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error adding item:', error)
        }
        return false
    }

    const addItem = async () => {
        const success = await createNewItem(inputValue)
        if (success) {
            setInputValue('')
            setSelectedStore('')
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('image', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })
            if (!res.ok) {
                handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error uploading image:', error)
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const toggleComplete = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/items/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ completed: !currentStatus })
            })
            if (res.ok) {
                vibrate(isStoreMode ? [30, 30] : 10)
            } else {
                 handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error updating item:', error)
        }
    }

    const deleteItem = async (id) => {
        try {
            const res = await fetch(`/api/items/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                vibrate([20, 50, 20])
            } else {
                handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error deleting item:', error)
        }
    }

    const startEdit = (item) => {
        setEditingId(item.id)
        setEditText(item.text)
        setEditStore(item.store_id ? item.store_id.toString() : '')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditText('')
        setEditStore('')
    }

    const saveEdit = async (id) => {
        if (!editText.trim()) return

        try {
            const res = await fetch(`/api/items/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: editText, store_id: editStore ? parseInt(editStore) : null })
            })
            if (res.ok) {
                setEditingId(null)
                setEditText('')
                setEditStore('')
            } else {
                handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error updating item text:', error)
        }
    }

    const clearCompleted = async () => {
        try {
            const res = await fetch('/api/items/completed', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                vibrate(50)
            } else {
                handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error clearing completed items:', error)
        }
    }

    const handleAddStore = async (name, color) => {
        try {
            const res = await fetch('/api/stores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, color })
            })
            if (res.ok) {
                vibrate(50)
                return true
            } else {
                handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error adding store:', error)
        }
        return false
    }

    const deleteStore = async (id) => {
        try {
            const res = await fetch(`/api/stores/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                vibrate([20, 50])
            } else {
                handleApiError(res.status)
            }
        } catch (error) {
            console.error('Error deleting store:', error)
        }
    }

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice input is not supported in this browser.')
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            setInputValue(transcript)

            setTimeout(async () => {
                const success = await createNewItem(transcript)
                if (success) setInputValue('')
            }, 1000)
        }

        recognition.start()
    }

    const handleBarcodeDetected = async (code) => {
        setShowScanner(false)
        try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
            const data = await res.json()

            let productName = code
            if (data.status === 1 && data.product && data.product.product_name) {
                productName = data.product.product_name
            }

            await createNewItem(productName)
        } catch (error) {
            console.error("Error looking up barcode:", error)
            await createNewItem(code)
        }
    }

    const groupedItems = useMemo(() => {
        const filteredItems = items.filter(item => activeFilter === 'All' || (item.store_id && item.store_id.toString() === activeFilter));
        const groups = [];
        
        const noStoreItems = filteredItems.filter(item => !item.store_id);
        if (noStoreItems.length > 0) {
            groups.push({ id: 'none', name: 'General List', color: '#fff', items: noStoreItems });
        }
        
        const storeGroups = stores.map(store => ({
            ...store,
            items: filteredItems.filter(item => item.store_id === store.id)
        })).filter(g => g.items.length > 0);
        
        groups.push(...storeGroups);
        return groups;
    }, [items, stores, activeFilter]);

    if (!token) return <Login onLogin={handleLogin} />

    return (
        <div className={`glass-container ${isStoreMode ? 'store-mode' : ''}`}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 6vw, 2.2rem)' }}>Shopper</h1>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 'bold' }}>v2.1</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setIsStoreMode(!isStoreMode)} className="btn-icon" title={isStoreMode ? "Switch to Edit Mode" : "Switch to Store Mode"} style={{ opacity: isStoreMode ? 1 : 0.7, color: isStoreMode ? '#4ade80' : 'inherit', padding: '8px 6px' }}>
                        {isStoreMode ? <ShoppingBag size={20} /> : <List size={20} />}
                    </button>
                    <button onClick={() => setShowStoreManager(true)} className="btn-icon" title="Manage Stores" style={{ opacity: 0.7, padding: '8px 6px' }}>
                        <Store size={20} />
                    </button>
                    <button onClick={forceRefresh} className="btn-icon" title="Force Refresh" style={{ opacity: 0.7, padding: '8px 6px' }}>
                        <RefreshCcw size={20} />
                    </button>
                    <button onClick={handleLogout} className="btn-icon" title="Logout" style={{ opacity: 0.7, padding: '8px 6px' }}>
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <StoreManager 
                show={showStoreManager} 
                onClose={() => setShowStoreManager(false)} 
                stores={stores} 
                onAddStore={handleAddStore} 
                onDeleteStore={deleteStore} 
            />

            {!isStoreMode && (
                <AddForm 
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    selectedStore={selectedStore}
                    setSelectedStore={setSelectedStore}
                    stores={stores}
                    uploading={uploading}
                    onAddItem={addItem}
                    fileInputRef={fileInputRef}
                    onImageUpload={handleImageUpload}
                    onVoiceInput={handleVoiceInput}
                    isListening={isListening}
                    onShowScanner={() => setShowScanner(true)}
                />
            )}

            {isStoreMode && (
                <div className="store-mode-badge" style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '6px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.8rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShoppingBag size={14} /> <strong>Store Mode Active:</strong> One-handed optimized UI
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center', opacity: 0.7 }}>Loading...</p>
            ) : (
                <>
                    <nav className="hide-scrollbar" style={{ display: 'flex', gap: '8px', marginBottom: '5px', overflowX: 'auto', paddingBottom: '5px', maxWidth: '100%' }}>
                        <button 
                            onClick={() => setActiveFilter('All')}
                            className={`filter-pill ${activeFilter === 'All' ? 'active' : ''}`}
                            style={{ 
                                padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.3)',
                                background: activeFilter === 'All' ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white',
                                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem'
                            }}
                        >
                            All
                        </button>
                        {stores.map(store => (
                            <button 
                                key={store.id}
                                onClick={() => setActiveFilter(store.id.toString())}
                                title={store.name}
                                style={{ 
                                    width: '32px', height: '32px', borderRadius: '50%', border: '1px solid ' + store.color,
                                    background: activeFilter === store.id.toString() ? store.color : 'transparent',
                                    color: activeFilter === store.id.toString() ? '#000' : store.color,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.9rem', fontWeight: 'bold', padding: 0, flexShrink: 0
                                }}
                            >
                                {store.name.charAt(0).toUpperCase()}
                            </button>
                        ))}
                    </nav>

                    <ul className="list">
                        {groupedItems.length === 0 ? (
                            <p style={{ textAlign: 'center', opacity: 0.5, fontStyle: 'italic' }}>Your list is empty. Time to shop!</p>
                        ) : (
                            groupedItems.map(group => (
                                <div key={group.id} style={{ marginBottom: isStoreMode ? '12px' : '8px' }}>
                                    <div className="store-group-header" style={{ color: group.color }}>{group.name}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: isStoreMode ? '8px' : '4px' }}>
                                        {group.items.map(item => (
                                            <ItemCard 
                                                key={item.id}
                                                item={item}
                                                isStoreMode={isStoreMode}
                                                isEditing={editingId === item.id}
                                                editText={editText}
                                                setEditText={setEditText}
                                                editStore={editStore}
                                                setEditStore={setEditStore}
                                                stores={stores}
                                                onSaveEdit={saveEdit}
                                                onCancelEdit={cancelEdit}
                                                onToggle={toggleComplete}
                                                onDelete={deleteItem}
                                                onStartEdit={startEdit}
                                                color={group.color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </ul>
                    {items.some(item => item.completed) && (
                        <button onClick={clearCompleted} className="btn-clear-completed" style={{
                            width: '100%', marginTop: '0.75rem', padding: '10px',
                            background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30',
                            border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '12px',
                            cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease'
                        }}>
                            Clear Completed
                        </button>
                    )}
                </>
            )}

            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeDetected}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    )
}

export default App

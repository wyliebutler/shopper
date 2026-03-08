import { Plus, Camera, Mic, ScanBarcode } from 'lucide-react'

export default function AddForm({
    inputValue,
    setInputValue,
    selectedStore,
    setSelectedStore,
    stores,
    uploading,
    onAddItem,
    fileInputRef,
    onImageUpload,
    onVoiceInput,
    isListening,
    onShowScanner,
    aiEnabled
}) {
    const handleSubmit = (e) => {
        e.preventDefault()
        onAddItem()
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Add a new item..."
                    disabled={uploading}
                    style={{ flex: 1, minWidth: 0 }}
                />
                <button type="submit" className="btn-primary" disabled={uploading} style={{ flexShrink: 0 }}>
                    <Plus size={20} />
                </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <select 
                    value={selectedStore} 
                    onChange={e => setSelectedStore(e.target.value)}
                    style={{
                        padding: '12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', flex: '1 1 auto',
                        minWidth: '120px', outline: 'none', cursor: 'pointer', appearance: 'none'
                    }}
                >
                    <option value="" style={{ color: 'black' }}>No Store</option>
                    {stores.map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.name}</option>)}
                </select>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {aiEnabled && (
                        <>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={fileInputRef}
                                onChange={onImageUpload}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => fileInputRef.current.click()}
                                disabled={uploading}
                                style={{ background: '#e0e7ff', color: '#4f46e5', padding: '12px' }}
                            >
                                {uploading ? <div className="spinner">...</div> : <Camera size={20} />}
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={onVoiceInput}
                        disabled={uploading || isListening}
                        style={{ background: isListening ? '#fee2e2' : '#f3f4f6', color: isListening ? '#ef4444' : '#4b5563', padding: '12px' }}
                    >
                        <Mic size={20} />
                    </button>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={onShowScanner}
                        disabled={uploading || isListening}
                        style={{ background: '#f3f4f6', color: '#4b5563', padding: '12px' }}
                    >
                        <ScanBarcode size={20} />
                    </button>
                </div>
            </div>
        </form>
    )
}

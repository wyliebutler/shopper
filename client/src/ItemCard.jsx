import { Check, X, Pencil, Trash2 } from 'lucide-react'

export default function ItemCard({
    item,
    isStoreMode,
    isEditing,
    editText,
    setEditText,
    editStore,
    setEditStore,
    stores,
    onSaveEdit,
    onCancelEdit,
    onToggle,
    onDelete,
    onStartEdit,
    color,
}) {
    return (
        <li className={`item ${item.completed ? 'completed' : ''}`} style={{ borderLeftColor: color }}>
            {item.image_path && (
                <img
                    src={item.image_path}
                    alt="Item"
                    style={{
                        width: isStoreMode ? '70px' : '50px',
                        height: isStoreMode ? '70px' : '50px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        marginRight: '12px',
                        border: '1px solid rgba(255,255,255,0.3)'
                    }}
                />
            )}

            {isEditing ? (
                <div style={{ flex: 1, display: 'flex', gap: '8px', marginRight: '8px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        style={{ padding: '8px', fontSize: '0.9rem', flex: 1, minWidth: '120px' }}
                    />
                    <select 
                        value={editStore} 
                        onChange={e => setEditStore(e.target.value)}
                        style={{
                            padding: '8px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white',
                            outline: 'none', cursor: 'pointer', appearance: 'none'
                        }}
                    >
                        <option value="" style={{ color: 'black' }}>No Store</option>
                        {stores.map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.name}</option>)}
                    </select>
                    <button onClick={() => onSaveEdit(item.id)} className="btn-icon" style={{ color: '#4ade80' }}>
                        <Check size={18} />
                    </button>
                    <button onClick={onCancelEdit} className="btn-icon" style={{ color: '#f87171' }}>
                        <X size={18} />
                    </button>
                </div>
            ) : (
                <>
                    <span 
                        onClick={() => onToggle(item.id, item.completed)} 
                        style={{ 
                            cursor: 'pointer', flex: 1, 
                            color: item.store_id ? stores.find(s => s.id === item.store_id)?.color || 'inherit' : 'inherit',
                            fontWeight: item.store_id ? '600' : 'normal'
                        }}
                    >
                        {item.text}
                    </span>
                    <div className="item-actions">
                        <button
                            onClick={() => onStartEdit(item)}
                            className="btn-icon"
                            title="Edit"
                        >
                            <Pencil size={isStoreMode ? 22 : 18} />
                        </button>
                        <button
                            onClick={() => onToggle(item.id, item.completed)}
                            className="btn-icon"
                            title={item.completed ? "Mark incomplete" : "Mark complete"}
                        >
                            {item.completed ? <X size={isStoreMode ? 22 : 18} /> : <Check size={isStoreMode ? 22 : 18} />}
                        </button>
                        <button
                            onClick={() => onDelete(item.id)}
                            className="btn-icon btn-delete"
                            title="Delete"
                        >
                            <Trash2 size={isStoreMode ? 22 : 18} />
                        </button>
                    </div>
                </>
            )}
        </li>
    )
}

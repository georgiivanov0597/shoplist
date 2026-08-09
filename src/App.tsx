import { useState, useEffect } from 'react'

interface ShoppingItem {
  id: string
  text: string
  quantity: number
  category: string
  checked: boolean
}

const CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Pantry',
  'Frozen',
  'Household',
  'Bakery',
  'Other'
] as const

type Category = typeof CATEGORIES[number]

const STORAGE_KEY = 'shoplist-items'

function App() {
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [newItem, setNewItem] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newCategory, setNewCategory] = useState<Category>('Other')

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const activeItems = items.filter(i => !i.checked)
  const completedItems = items.filter(i => i.checked)
  const remaining = activeItems.length

  function addItem(e?: React.FormEvent) {
    e?.preventDefault()
    const text = newItem.trim()
    if (!text) return

    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      text,
      quantity: Math.max(1, newQty),
      category: newCategory,
      checked: false,
    }

    setItems(prev => [item, ...prev])
    setNewItem('')
    setNewQty(1)
  }

  function toggleItem(id: string) {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function clearCompleted() {
    setItems(prev => prev.filter(item => !item.checked))
  }

  function updateQuantity(id: string, qty: number) {
    const newQty = Math.max(1, Math.min(99, qty))
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity: newQty } : item))
    )
  }

  function adjustQuantity(id: string, delta: number) {
    const item = items.find(i => i.id === id)
    if (!item) return
    updateQuantity(id, item.quantity + delta)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      addItem()
    }
  }

  const QtyControls = ({ item }: { item: ShoppingItem }) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => adjustQuantity(item.id, -1)}
        className="w-6 h-6 flex items-center justify-center text-lg leading-none border border-[var(--border)] rounded active:bg-[var(--bg)] disabled:opacity-40"
        disabled={item.quantity <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <div className="qty min-w-[34px]">{item.quantity}</div>
      <button
        onClick={() => adjustQuantity(item.id, 1)}
        className="w-6 h-6 flex items-center justify-center text-lg leading-none border border-[var(--border)] rounded active:bg-[var(--bg)]"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <div className="shopping-container">
        {/* Header */}
        <div className="header pt-2 pb-1">
          <div>
            <h1 className="title">Shoplist</h1>
            <p className="stats">
              {remaining} item{remaining !== 1 ? 's' : ''} to buy
            </p>
          </div>

          {completedItems.length > 0 && (
            <button
              onClick={clearCompleted}
              className="btn-secondary"
            >
              Clear done
            </button>
          )}
        </div>

        {/* Active List */}
        {activeItems.length > 0 ? (
          <div className="mb-6">
            {activeItems.map(item => (
              <div key={item.id} className="item">
                <div
                  className="checkbox"
                  onClick={() => toggleItem(item.id)}
                  role="checkbox"
                  aria-checked={false}
                >
                  {item.checked && '✓'}
                </div>

                <div className="item-text">{item.text}</div>

                <QtyControls item={item} />

                <div className="category">{item.category}</div>

                <button
                  onClick={() => deleteItem(item.id)}
                  className="delete-btn"
                  aria-label="Delete item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            Your list is empty.<br />Add something below to get started.
          </div>
        )}

        {/* Completed */}
        {completedItems.length > 0 && (
          <div>
            <div className="section-title">Completed ({completedItems.length})</div>
            {completedItems.map(item => (
              <div key={item.id} className="item checked">
                <div
                  className="checkbox checked"
                  onClick={() => toggleItem(item.id)}
                  role="checkbox"
                  aria-checked={true}
                >
                  ✓
                </div>

                <div className="item-text">{item.text}</div>

                <QtyControls item={item} />

                <div className="category">{item.category}</div>

                <button
                  onClick={() => deleteItem(item.id)}
                  className="delete-btn"
                  aria-label="Delete item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Bar */}
      <form onSubmit={addItem} className="add-form">
        <div className="add-row">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add item (e.g. bananas)"
            className="input"
            autoFocus
          />

          <input
            type="number"
            value={newQty}
            onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
            min={1}
            max={99}
            className="qty-input w-16"
            aria-label="Quantity"
          />

          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Category)}
            className="select"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button type="submit" className="btn">
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

export default App

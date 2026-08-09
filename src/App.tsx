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

type Category = typeof CATEGORIES[number] | 'All'

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

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<Category>('All')

  // Share feedback
  const [shareMessage, setShareMessage] = useState('')

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // Load shared list from URL on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const data = params.get('data')

    if (data) {
      try {
        const decoded = atob(data)
        const parsed: ShoppingItem[] = JSON.parse(decoded)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Replace current list with shared one
          setItems(parsed)
          // Clear the URL param so it doesn't re-load on refresh
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch (e) {
        console.error('Failed to load shared list', e)
      }
    }
  }, [])

  // Filtering
  const filteredItems = items.filter(item => {
    const matchesSearch = item.text.toLowerCase().includes(searchTerm.toLowerCase().trim())
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const activeItems = filteredItems.filter(i => !i.checked)
  const completedItems = filteredItems.filter(i => i.checked)
  const remaining = items.filter(i => !i.checked).length   // always show real remaining count

  function addItem(e?: React.FormEvent) {
    e?.preventDefault()
    const text = newItem.trim()
    if (!text) return

    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      text,
      quantity: Math.max(1, newQty),
      category: newCategory === 'All' ? 'Other' : newCategory,
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

  function adjustQuantity(id: string, delta: number) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const newQty = Math.max(1, Math.min(99, item.quantity + delta))
        return { ...item, quantity: newQty }
      })
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      addItem()
    }
  }

  // === SHARE LIST ===
  async function shareList() {
    if (items.length === 0) {
      alert('Add some items first to share the list.')
      return
    }

    try {
      const json = JSON.stringify(items)
      const encoded = btoa(json)
      const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`

      await navigator.clipboard.writeText(url)

      setShareMessage('Link copied!')
      setTimeout(() => setShareMessage(''), 2200)
    } catch (err) {
      // Fallback for older browsers / iOS issues
      const json = JSON.stringify(items)
      const encoded = btoa(json)
      const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`
      prompt('Copy this link:', url)
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

          <div className="flex gap-2">
            <button onClick={shareList} className="btn-secondary">
              Share
            </button>
            {completedItems.length > 0 && (
              <button onClick={clearCompleted} className="btn-secondary">
                Clear done
              </button>
            )}
          </div>
        </div>

        {/* Share toast */}
        {shareMessage && (
          <div className="text-center text-sm mb-3 text-[var(--accent)]">
            {shareMessage}
          </div>
        )}

        {/* Search */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Category filters */}
        <div className="filter-chips">
          <button
            className={`chip ${filterCategory === 'All' ? 'active' : ''}`}
            onClick={() => setFilterCategory('All')}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`chip ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
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
            {searchTerm || filterCategory !== 'All'
              ? 'No items match your search/filter.'
              : 'Your list is empty.<br />Add something below to get started.'}
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

      {/* Fixed Add Bar at bottom */}
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
            className="qty-input"
            style={{ width: '52px' }}
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

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
  'Frozen',
  'Sauces',
  'Drinks',
  'Cereals',
  'Household',
  'Bakery',
  'Other'
] as const

type CategoryKey = typeof CATEGORIES[number]
type Category = CategoryKey | 'All'

const CATEGORY_LABELS: Record<string, string> = {
  'All': 'Всички',
  'Produce': 'Плодове и зеленчуци',
  'Dairy': 'Млечни продукти',
  'Meat & Seafood': 'Месо и риба',
  'Frozen': 'Замразени',
  'Sauces': 'Сосове',
  'Drinks': 'Напитки',
  'Cereals': 'Зърнени',
  'Household': 'Домакински',
  'Bakery': 'Хлебни изделия',
  'Other': 'Друго',
  'Pantry': 'Килер',
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Produce': '🥬',
  'Dairy': '🥛',
  'Meat & Seafood': '🥩',
  'Frozen': '🧊',
  'Sauces': '🥫',
  'Drinks': '🥤',
  'Cereals': '🌾',
  'Household': '🧼',
  'Bakery': '🍞',
  'Other': '📦',
  'Pantry': '🫙',
}

function getCategoryDisplay(cat: string): string {
  const emoji = CATEGORY_EMOJIS[cat] || "📦";
  const label = CATEGORY_LABELS[cat] || cat;
  return `${emoji} ${label}`
}

function encodeData(str: string): string {
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
}

function decodeData(str: string): string {
  try { return decodeURIComponent(escape(atob(str))); } catch { return atob(str); }
}


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
  const [newCategory, setNewCategory] = useState<CategoryKey>('Other')

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<Category>('All')

  // Share feedback
  const [shareMessage, setShareMessage] = useState('')

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null)

  // Theme: teal (default) or pink
  const [theme, setTheme] = useState<'teal' | 'pink'>(() => {
    try {
      return (localStorage.getItem('shoplist-theme') as 'teal' | 'pink') || 'teal'
    } catch {
      return 'teal'
    }
  })

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // Persist and apply theme
  useEffect(() => {
    try {
      localStorage.setItem('shoplist-theme', theme)
    } catch {}
    const root = document.documentElement
    root.classList.remove('theme-teal', 'theme-pink')
    root.classList.add(`theme-${theme}`)

    // Update meta theme-color for PWA/browser
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (meta) {
      meta.setAttribute('content', theme === 'teal' ? '#0f766e' : '#db2777')
    }
  }, [theme])

  // Load shared list from URL on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const data = params.get('data')

    if (data) {
      try {
        const decoded = decodeData(data)
        const parsed: ShoppingItem[] = JSON.parse(decoded)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed)
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
  const totalRemaining = items.filter(i => !i.checked).length

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

  function toggleTheme() {
    setTheme(t => (t === 'teal' ? 'pink' : 'teal'))
  }

  function updateQuantity(id: string, newQty: number) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const qty = Math.max(1, Math.min(99, newQty || 1))
        return { ...item, quantity: qty }
      })
    )
  }

  // === DRAG TO REORDER ===
  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, dropId: string) {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/plain')
    setDraggedId(null)

    if (!dragId || dragId === dropId) return

    reorderItems(dragId, dropId)
  }

  function handleDragEnd() {
    setDraggedId(null)
  }

  function reorderItems(dragId: string, dropId: string) {
    setItems(prev => {
      const dragIndex = prev.findIndex(i => i.id === dragId)
      const dropIndex = prev.findIndex(i => i.id === dropId)
      if (dragIndex === -1 || dropIndex === -1) return prev

      const newItems = [...prev]
      const [draggedItem] = newItems.splice(dragIndex, 1)
      newItems.splice(dropIndex, 0, draggedItem)
      return newItems
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      addItem()
    }
  }

  // === SHARE LIST ===
  async function shareList() {
    if (items.length === 0) {
      alert("Добавете продукти, за да споделите списъка.");
      return;
    }

    try {
      const json = JSON.stringify(items);
      const encoded = encodeData(json);
      const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMessage("Линкът е копиран!");
        setTimeout(() => setShareMessage(""), 2800);
      } else {
        throw new Error("clipboard not available");
      }
    } catch (err) {
      const json = JSON.stringify(items);
      const encoded = encodeData(json);
      const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
      prompt("Копирайте този линк:", url);
      setShareMessage("Линкът е готов за копиране");
      setTimeout(() => setShareMessage(""), 2200);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <div className="shopping-container">
        {/* Header */}
        <div className="header pt-2 pb-1">
          <div>
            <h1 className="title">Списък</h1>
            <p className="stats">
              {totalRemaining} {totalRemaining === 1 ? 'продукт' : 'продукта'}&nbsp;за&nbsp;купуване
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={toggleTheme} className="btn-secondary theme-toggle" title="Смени тема" style={{marginRight: "12px"}}>
              {theme === 'teal' ? '🩷' : '🌿'}
            </button>
            <button onClick={shareList} className="btn-secondary">
              Сподели
            </button>
            {completedItems.length > 0 && (
              <button onClick={clearCompleted} className="btn-secondary">
                Изчисти готовите
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
            placeholder="Търси продукти..."
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
            {CATEGORY_LABELS['All']}
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`chip ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {getCategoryDisplay(cat)}
            </button>
          ))}
        </div>

        {/* Active List */}
        {activeItems.length > 0 ? (
          <div className="mb-6">
            {activeItems.map(item => (
              <div
                key={item.id}
                className={`item ${draggedId === item.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
              >
                <div
                  className="drag-handle"
                  title="Плъзни за пренареждане"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ≡
                </div>

                <div
                  className="checkbox"
                  onClick={() => toggleItem(item.id)}
                  role="checkbox"
                  aria-checked={false}
                >
                  {item.checked && '✓'}
                </div>

                <div className="item-text">{item.text}</div>

                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                  min={1}
                  max={99}
                  className="qty-input"
                  aria-label="Количество"
                />

                <div
                  className="category"
                  title={CATEGORY_LABELS[item.category as CategoryKey]}
                >
                  {CATEGORY_EMOJIS[item.category as CategoryKey]}
                </div>

                <button
                  onClick={() => deleteItem(item.id)}
                  className="delete-btn"
                  aria-label="Изтрий"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            {searchTerm || filterCategory !== 'All'
              ? 'Няма продукти, които отговарят на търсенето.'
              : <>Списъкът е празен.<br />Добавете нещо отдолу.</>}
          </div>
        )}

        {/* Completed */}
        {completedItems.length > 0 && (
          <div>
            <div className="section-title">
              Готови ({completedItems.length})
            </div>
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

                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                  min={1}
                  max={99}
                  className="qty-input"
                  aria-label="Количество"
                />

                <div
                  className="category"
                  title={CATEGORY_LABELS[item.category as CategoryKey]}
                >
                  {CATEGORY_EMOJIS[item.category as CategoryKey]}
                </div>

                <button
                  onClick={() => deleteItem(item.id)}
                  className="delete-btn"
                  aria-label="Изтрий"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Add Bar */}
      <form onSubmit={addItem} className="add-form">
        <div className="add-row">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Добави продукт (напр. банани)"
            className="input"
            autoFocus
          />

          <div className="qty-stepper">
            <button
              type="button"
              onClick={() => setNewQty(Math.max(1, newQty - 1))}
              className="qty-btn"
              aria-label="Намали количество"
            >
              −
            </button>
            <span className="qty-value" aria-label="Количество">{newQty}</span>
            <button
              type="button"
              onClick={() => setNewQty(Math.min(99, newQty + 1))}
              className="qty-btn"
              aria-label="Увеличи количество"
            >
              +
            </button>
          </div>

          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as CategoryKey)}
            className="select"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {getCategoryDisplay(cat)}
              </option>
            ))}
          </select>

          <button type="submit" className="btn">
            Добави
          </button>
        </div>
      </form>
    </div>
  )
}

export default App

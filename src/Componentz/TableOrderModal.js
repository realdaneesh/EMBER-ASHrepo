import React, { useState } from 'react';

const COMMON_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const TableOrderModal = ({
  isOpen,
  onClose,
  orderItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  activeOrder,
  onSendToTable,
  initialStep = 'cart',
}) => {
  const [step, setStep] = useState(initialStep); // 'cart' | 'table_prompt' | 'status'
  const [tableNumber, setTableNumber] = useState(activeOrder ? activeOrder.tableNumber : '');
  const [guestName, setGuestName] = useState('');
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [tableError, setTableError] = useState('');

  // Sync step if active order exists and opened
  React.useEffect(() => {
    if (activeOrder && initialStep === 'status') {
      setStep('status');
      setTableNumber(activeOrder.tableNumber);
    } else if (orderItems.length === 0 && !activeOrder) {
      setStep('cart');
    } else if (initialStep === 'table_prompt') {
      setStep('table_prompt');
    } else {
      setStep('cart');
    }
  }, [isOpen, activeOrder, initialStep, orderItems.length]);

  if (!isOpen) return null;

  const subtotal = orderItems.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);
  const gst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst;

  const handleProceedToTable = () => {
    if (orderItems.length === 0) return;
    setTableError('');
    setStep('table_prompt');
  };

  const handleConfirmOrder = (e) => {
    e.preventDefault();
    if (!tableNumber || String(tableNumber).trim() === '') {
      setTableError('Please select or enter your table number in the restaurant.');
      return;
    }
    onSendToTable({
      tableNumber: String(tableNumber).trim(),
      guestName: guestName.trim() || 'Guest',
      notes: kitchenNotes.trim(),
    });
    setStep('status');
  };

  return (
    <div className="order-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Table Order">
      <div className="order-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="order-modal-header">
          <div className="order-modal-header-left">
            <span className="order-modal-icon">
              {step === 'status' ? '🔥' : '🍽️'}
            </span>
            <div>
              <h2 className="order-modal-title">
                {step === 'cart' && 'Your Table Order'}
                {step === 'table_prompt' && 'Table Delivery Details'}
                {step === 'status' && 'Order in Making'}
              </h2>
              <span className="order-modal-subtitle">
                Ember & Ash · Lower Parel, Mumbai
              </span>
            </div>
          </div>
          <button className="order-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="order-modal-body">
          {/* STEP 1: CART / ORDER ITEMS */}
          {step === 'cart' && (
            <div>
              {activeOrder && (
                <div className="active-order-alert-box">
                  <div className="active-order-alert-left">
                    <span className="pulsing-flame">🔥</span>
                    <div>
                      <strong>Active Order for Table #{activeOrder.tableNumber} in making!</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        You can add more items below to append to your table order.
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn-status-view"
                    onClick={() => setStep('status')}
                  >
                    View Status
                  </button>
                </div>
              )}

              {orderItems.length === 0 ? (
                <div className="empty-order-state">
                  <span className="empty-order-emoji">🥘</span>
                  <h3>Your Table Tray is Empty</h3>
                  <p>Browse our Lower Parel menu and click <strong>"+ Add to Order"</strong> on your favorite dishes to dine in.</p>
                  <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '1rem' }}>
                    Browse Menu
                  </button>
                </div>
              ) : (
                <>
                  <div className="order-items-list">
                    {orderItems.map((item) => (
                      <div key={item.id} className="order-item-row">
                        <img src={item.image} alt={item.name} className="order-item-img" />
                        <div className="order-item-info">
                          <h4 className="order-item-name">{item.name}</h4>
                          <span className="order-item-price">₹{item.priceNum} each</span>
                        </div>
                        <div className="order-qty-control">
                          <button
                            className="qty-btn"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            –
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button
                            className="qty-btn"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <div className="order-item-total">
                          ₹{item.priceNum * item.quantity}
                        </div>
                        <button
                          className="order-item-remove"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="order-bill-summary">
                    <div className="bill-row">
                      <span>Items Subtotal ({orderItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="bill-row">
                      <span>Restaurant GST (5%)</span>
                      <span>₹{gst}</span>
                    </div>
                    <div className="bill-row bill-total">
                      <span>Total Amount</span>
                      <span className="total-highlight">₹{grandTotal}</span>
                    </div>
                  </div>

                  <div className="order-modal-actions">
                    <button className="btn-secondary-link" onClick={onClearOrder}>
                      Clear All
                    </button>
                    <button
                      id="proceed-to-table-btn"
                      className="btn btn-primary btn-full"
                      onClick={handleProceedToTable}
                    >
                      Send Order to Table 🍽️
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: TABLE NUMBER SELECTION */}
          {step === 'table_prompt' && (
            <form onSubmit={handleConfirmOrder} className="table-prompt-form">
              <div className="table-prompt-banner">
                <span style={{ fontSize: '1.75rem' }}>📍</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-cream)' }}>
                    Which table are you seated at?
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Our Lower Parel floor team will deliver your freshly prepared food directly to your table.
                  </p>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-amber-light)' }}>
                  Quick Select Table Number:
                </label>
                <div className="quick-tables-grid">
                  {COMMON_TABLES.map((num) => (
                    <button
                      type="button"
                      key={num}
                      className={`table-chip-btn ${String(tableNumber) === String(num) ? 'selected' : ''}`}
                      onClick={() => {
                        setTableNumber(String(num));
                        setTableError('');
                      }}
                    >
                      Table {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="custom-table-input" className="form-label">
                  Or enter specific Table / Section:
                </label>
                <input
                  id="custom-table-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Table 14, Rooftop T2, or Lounge Booth 3"
                  value={tableNumber}
                  onChange={(e) => {
                    setTableNumber(e.target.value);
                    setTableError('');
                  }}
                  required
                />
                {tableError && <span className="field-error-msg">{tableError}</span>}
              </div>

              <div className="form-row" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="guest-name-input" className="form-label">
                    Guest Name (Optional)
                  </label>
                  <input
                    id="guest-name-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul / Aditi"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="kitchen-notes-input" className="form-label">
                    Kitchen Notes (Optional)
                  </label>
                  <input
                    id="kitchen-notes-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Medium spicy, extra napkins"
                    value={kitchenNotes}
                    onChange={(e) => setKitchenNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-order-preview-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Selected Destination:</span>
                  <strong style={{ color: 'var(--color-amber-light)' }}>
                    {tableNumber ? `Table #${tableNumber}` : 'Please select table above'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Items to Kitchen:</span>
                  <strong>{orderItems.reduce((acc, i) => acc + i.quantity, 0)} dishes (₹{grandTotal})</strong>
                </div>
              </div>

              <div className="order-modal-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={() => setStep('cart')}
                >
                  ← Back to Items
                </button>
                <button
                  id="confirm-table-order-btn"
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  🔥 Confirm & Send to Table
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: "ORDER IN MAKING" LIVE STATUS */}
          {step === 'status' && activeOrder && (
            <div className="order-status-view">
              <div className="order-status-hero">
                <div className="status-flame-bubble">
                  <span className="flame-anim">🔥</span>
                </div>
                <div className="status-badge-making">
                  <span className="pulsing-indicator" />
                  ORDER IN MAKING
                </div>
                <h3 className="status-hero-title">
                  Sent to Table #{activeOrder.tableNumber}!
                </h3>
                <p className="status-hero-desc">
                  Our grill master chefs at Ember & Ash, Lower Parel have received your order and are firing up the flames right now.
                </p>
                <div className="status-estimate-pill">
                  ⏱️ Estimated Prep Time: <strong>15–20 minutes</strong>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="order-tracker-timeline">
                <div className="tracker-step completed">
                  <div className="tracker-dot">✓</div>
                  <div className="tracker-text">
                    <strong>Order Placed</strong>
                    <span>Sent to Table #{activeOrder.tableNumber}</span>
                  </div>
                </div>
                <div className="tracker-line active" />
                <div className="tracker-step current">
                  <div className="tracker-dot pulsing">👨‍🍳</div>
                  <div className="tracker-text">
                    <strong>Order in Making</strong>
                    <span className="glow-text">Chefs grilling over live fire</span>
                  </div>
                </div>
                <div className="tracker-line" />
                <div className="tracker-step pending">
                  <div className="tracker-dot">🍽️</div>
                  <div className="tracker-text">
                    <strong>Serving to Table</strong>
                    <span>Hot & fresh to your table</span>
                  </div>
                </div>
              </div>

              {/* Order Info Card */}
              <div className="order-details-card">
                <div className="order-meta-header">
                  <div>
                    <span className="meta-label">ORDER ID</span>
                    <span className="meta-value">{activeOrder.orderId}</span>
                  </div>
                  <div>
                    <span className="meta-label">TABLE</span>
                    <span className="meta-value highlight">Table #{activeOrder.tableNumber}</span>
                  </div>
                  <div>
                    <span className="meta-label">GUEST</span>
                    <span className="meta-value">{activeOrder.guestName}</span>
                  </div>
                </div>

                <div className="active-order-dishes">
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: '0.6rem' }}>
                    Dishes being prepared:
                  </h4>
                  {activeOrder.items.map((it) => (
                    <div key={it.id} className="active-dish-line">
                      <span>{it.quantity} × {it.name}</span>
                      <span>₹{it.priceNum * it.quantity}</span>
                    </div>
                  ))}
                  {activeOrder.notes && (
                    <div className="active-order-notes">
                      <strong>Special Note:</strong> "{activeOrder.notes}"
                    </div>
                  )}
                  <div className="active-order-total-line">
                    <span>Total Amount (incl. taxes)</span>
                    <strong style={{ color: 'var(--color-amber-light)', fontSize: '1.1rem' }}>₹{activeOrder.total}</strong>
                  </div>
                </div>
              </div>

              <div className="order-status-footer-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setStep('cart');
                    onClose();
                  }}
                  style={{ flex: 1 }}
                >
                  + Add More Dishes
                </button>
                <button
                  className="btn btn-primary"
                  onClick={onClose}
                  style={{ flex: 1 }}
                >
                  Got It, Enjoy Dining!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableOrderModal;

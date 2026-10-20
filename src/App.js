import React, { useState, useCallback } from 'react';
import { API_BASE_URL } from './apiConfig';
import './App.css';
import Navbar from './Componentz/Navbar';
import Hero from './Componentz/Hero';
import MenuSection from './Componentz/MenuSection';
import AboutSection from './Componentz/AboutSection';
import TestimonialsSection from './Componentz/TestimonialsSection';
import ReservationSection from './Componentz/ReservationSection';
import Footer from './Componentz/Footer';
import TableOrderModal from './Componentz/TableOrderModal';

function Toast({ message }) {
  return (
    <div className="toast" role="alert" aria-live="polite">
      {message}
    </div>
  );
}

function App() {
  const [toast, setToast] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState('cart');

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Add dish to table order
  const handleAddToOrder = useCallback((dish) => {
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          priceNum: dish.priceNum || parseInt(String(dish.price).replace(/[^0-9]/g, ''), 10) || 0,
          image: dish.image,
          quantity: 1,
        },
      ];
    });
    showToast(`✅ "${dish.name}" added to Table Order!`);
  }, [showToast]);

  // Update item quantity
  const handleUpdateQuantity = useCallback((id, newQty) => {
    if (newQty <= 0) {
      setOrderItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setOrderItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
      );
    }
  }, []);

  // Remove single item
  const handleRemoveItem = useCallback((id) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Clear order
  const handleClearOrder = useCallback(() => {
    setOrderItems([]);
    showToast('Table order cleared');
  }, [showToast]);

  // Send order to table in hotel (saves to MongoDB)
  const handleSendToTable = useCallback(async ({ tableNumber, guestName, guestEmail, email, notes }) => {
    const subtotal = orderItems.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);
    const gst = Math.round(subtotal * 0.05);
    const grandTotal = subtotal + gst;

    const orderPayload = {
      orderId: `EA-LWP-${Math.floor(1000 + Math.random() * 9000)}`,
      tableNumber,
      guestName: guestName || 'Guest',
      guestEmail: guestEmail || email || '',
      email: guestEmail || email || '',
      notes,
      items: [...orderItems],
      subtotal,
      gst,
      total: grandTotal,
      timePlaced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'in_making',
    };

    setActiveOrder(orderPayload);
    setOrderItems([]); // Items moved to active table order
    showToast(`🔥 Order placed for Table #${tableNumber}! Saved to database.`);

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      if (res.ok) {
        const saved = await res.json();
        setActiveOrder(saved);
      }
    } catch (e) {
      console.warn('API server offline, order stored in local session:', e.message);
    }
  }, [orderItems, showToast]);

  // Open modal for cart or active order status
  const handleOpenOrder = useCallback(() => {
    if (activeOrder && orderItems.length === 0) {
      setModalInitialStep('status');
    } else {
      setModalInitialStep('cart');
    }
    setIsOrderModalOpen(true);
  }, [activeOrder, orderItems.length]);

  const handleOpenStatus = useCallback(() => {
    setModalInitialStep('status');
    setIsOrderModalOpen(true);
  }, []);

  const handleReserve = useCallback(async (reserveData) => {
    const guestName = typeof reserveData === 'object' ? reserveData.name : reserveData;
    showToast(`🎉 Table reserved for ${guestName || 'Guest'}! Saved to database.`);

    if (typeof reserveData === 'object') {
      try {
        await fetch(`${API_BASE_URL}/api/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reserveData),
        });
      } catch (e) {
        console.warn('API server offline, reservation stored in local session:', e.message);
      }
    }
  }, [showToast]);

  const scrollToMenu = useCallback(() => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const totalItemCount = orderItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalSubtotal = orderItems.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="App">
      <Navbar
        orderCount={totalItemCount}
        activeOrder={activeOrder}
        onOpenOrder={handleOpenOrder}
      />

      <Hero onScrollToMenu={scrollToMenu} />

      <MenuSection
        onOrder={handleAddToOrder}
        orderItems={orderItems}
      />

      <AboutSection />
      <TestimonialsSection />
      <ReservationSection onReserve={handleReserve} />
      <Footer />

      {/* Floating Bottom Table Order Bar / Tracker Pill */}
      {totalItemCount > 0 && (
        <aside
          className="floating-order-bar"
          onClick={handleOpenOrder}
          role="button"
          tabIndex={0}
          aria-label="View table order"
          onKeyDown={(e) => { if (e.key === 'Enter') handleOpenOrder(); }}
        >
          <div className="floating-order-bar-content">
            <div className="floating-order-left">
              <span className="floating-order-icon">🛒</span>
              <div>
                <strong>Table Order ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</strong>
                <span className="floating-order-price">₹{totalSubtotal}</span>
              </div>
            </div>
            <button className="floating-order-cta">
              Send to Table →
            </button>
          </div>
        </aside>
      )}

      {/* Floating Active Order Status Pill when cart is empty but order is active */}
      {activeOrder && totalItemCount === 0 && (
        <aside
          className="floating-active-status-pill"
          onClick={handleOpenStatus}
          role="button"
          tabIndex={0}
          aria-label="View order in making status"
          onKeyDown={(e) => { if (e.key === 'Enter') handleOpenStatus(); }}
        >
          <span className="pulsing-flame">🔥</span>
          <div className="status-pill-text">
            <strong>Table #{activeOrder.tableNumber}: Order in Making</strong>
            <span>Estimated ~15 mins · Click to view</span>
          </div>
          <span className="status-pill-arrow">›</span>
        </aside>
      )}

      {/* Order & Table Delivery Modal */}
      <TableOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        orderItems={orderItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearOrder={handleClearOrder}
        activeOrder={activeOrder}
        onSendToTable={handleSendToTable}
        initialStep={modalInitialStep}
      />

      {toast && <Toast message={toast} />}
    </div>
  );
}

export default App;

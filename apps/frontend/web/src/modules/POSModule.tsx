import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";

export default function POSModule() {
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });
  
  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
  });

  const createOrder = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setCart([]);
      setSelectedCustomer('');
      alert('Ordine completato con successo!');
    },
  });

  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Il carrello è vuoto!');
      return;
    }

    const orderData = {
      customerId: selectedCustomer || null,
      subtotal: calculateTotal().toString(),
      tax: (calculateTotal() * 0.22).toFixed(2),
      total: (calculateTotal() * 1.22).toFixed(2),
      paymentMethod: 'cash',
      status: 'completed',
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        total: (parseFloat(item.price) * item.quantity).toString(),
      })),
    };

    createOrder.mutate(orderData);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Products Grid */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '24px' }}>
          Punto Vendita (POS)
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {products?.map((product: any) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                textAlign: 'left'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: '100%',
                height: '80px',
                background: 'linear-gradient(135deg, rgba(255, 105, 0, 0.1) 0%, rgba(123, 44, 191, 0.1) 100%)',
                borderRadius: '8px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px'
              }}>
                📦
              </div>
              <h4 style={{ color: 'white', fontSize: '14px', margin: '0 0 4px 0' }}>
                {product.name}
              </h4>
              <p style={{ color: '#FF6900', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                €{product.price}
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', margin: '4px 0 0 0' }}>
                Stock: {product.quantity}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div style={{
        width: '400px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '20px' }}>
          Carrello
        </h3>

        {/* Customer Selection */}
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '10px',
            color: 'white',
            marginBottom: '20px'
          }}
        >
          <option value="">Cliente Occasionale</option>
          {customers?.map((customer: any) => (
            <option key={customer.id} value={customer.id}>
              {customer.firstName} {customer.lastName}
            </option>
          ))}
        </select>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.length === 0 ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center' }}>
              Carrello vuoto
            </p>
          ) : (
            cart.map((item) => (
              <div key={item.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'white', margin: 0 }}>{item.name}</p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: '4px 0 0 0' }}>
                      €{item.price} x {item.quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      background: 'rgba(255, 67, 54, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#ff4336',
                      cursor: 'pointer'
                    }}
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '20px'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Subtotale:</span>
              <span style={{ color: 'white' }}>€{calculateTotal().toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>IVA (22%):</span>
              <span style={{ color: 'white' }}>€{(calculateTotal() * 0.22).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>Totale:</span>
              <span style={{ color: '#FF6900', fontSize: '18px', fontWeight: 'bold' }}>
                €{(calculateTotal() * 1.22).toFixed(2)}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            style={{
              width: '100%',
              padding: '14px',
              background: cart.length > 0
                ? 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'transform 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (cart.length > 0) e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              if (cart.length > 0) e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Completa Ordine
          </button>
        </div>
      </div>
    </div>
  );
}
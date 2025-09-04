import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";

export default function InventoryModule() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    price: '',
    cost: '',
    quantity: 0,
    minStock: 5,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const createProduct = useMutation({
    mutationFn: async (productData: any) => {
      return await apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowAddForm(false);
      setNewProduct({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        price: '',
        cost: '',
        quantity: 0,
        minStock: 5,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate(newProduct);
  };

  const getLowStockCount = () => {
    return products?.filter((p: any) => p.quantity <= p.minStock).length || 0;
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
          Gestione Magazzino
        </h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          + Nuovo Prodotto
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '8px' }}>
            Prodotti Totali
          </p>
          <p style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            {products?.length || 0}
          </p>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '8px' }}>
            Stock Basso
          </p>
          <p style={{ color: '#ff4336', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            {getLowStockCount()}
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '8px' }}>
            Valore Totale
          </p>
          <p style={{ color: '#FF6900', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            €{products?.reduce((sum: number, p: any) => sum + (parseFloat(p.price) * p.quantity), 0).toFixed(0) || 0}
          </p>
        </div>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: 'white', marginBottom: '20px' }}>Aggiungi Nuovo Prodotto</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input
              type="text"
              placeholder="Nome prodotto"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              required
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <input
              type="text"
              placeholder="SKU"
              value={newProduct.sku}
              onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              required
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <input
              type="text"
              placeholder="Codice a barre"
              value={newProduct.barcode}
              onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <input
              type="number"
              placeholder="Prezzo"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              required
              step="0.01"
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <input
              type="number"
              placeholder="Costo"
              value={newProduct.cost}
              onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
              step="0.01"
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <input
              type="number"
              placeholder="Quantità"
              value={newProduct.quantity}
              onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) })}
              required
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <textarea
              placeholder="Descrizione"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              style={{
                gridColumn: '1 / -1',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white',
                minHeight: '80px'
              }}
            />
            <button
              type="submit"
              style={{
                gridColumn: '1 / -1',
                padding: '12px',
                background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Salva Prodotto
            </button>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: 'white', marginBottom: '20px' }}>Inventario Prodotti</h3>
        
        {isLoading ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Caricamento prodotti...</p>
        ) : products && products.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>SKU</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>Nome</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>Prezzo</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>Stock</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>{product.sku}</td>
                    <td style={{ padding: '12px', color: 'white' }}>{product.name}</td>
                    <td style={{ padding: '12px', color: '#FF6900' }}>€{product.price}</td>
                    <td style={{ padding: '12px', color: 'white' }}>{product.quantity}</td>
                    <td style={{ padding: '12px' }}>
                      {product.quantity <= product.minStock ? (
                        <span style={{
                          background: 'rgba(255, 67, 54, 0.2)',
                          color: '#ff4336',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          Stock Basso
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(76, 175, 80, 0.2)',
                          color: '#4caf50',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          Disponibile
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center' }}>
            Nessun prodotto trovato. Aggiungi il primo prodotto!
          </p>
        )}
      </div>
    </div>
  );
}
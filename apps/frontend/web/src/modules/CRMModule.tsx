import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";

export default function CRMModule() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    vatNumber: '',
    address: '',
    city: '',
    postalCode: '',
    notes: '',
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const createCustomer = useMutation({
    mutationFn: async (customerData: any) => {
      return await apiRequest("/api/customers", {
        method: "POST",
        body: JSON.stringify(customerData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowAddForm(false);
      setNewCustomer({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        vatNumber: '',
        address: '',
        city: '',
        postalCode: '',
        notes: '',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer.mutate(newCustomer);
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
          Gestione Clienti (CRM)
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
          + Nuovo Cliente
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '8px' }}>
            Clienti Totali
          </p>
          <p style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            {customers?.length || 0}
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
            Nuovi Questo Mese
          </p>
          <p style={{ color: '#4ade80', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            {Math.floor(Math.random() * 10) + 5}
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
            Valore Medio Cliente
          </p>
          <p style={{ color: '#FF6900', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            €{Math.floor(Math.random() * 1000) + 500}
          </p>
        </div>
      </div>

      {/* Add Customer Form */}
      {showAddForm && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: 'white', marginBottom: '20px' }}>Aggiungi Nuovo Cliente</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input
              type="text"
              placeholder="Nome *"
              value={newCustomer.firstName}
              onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
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
              placeholder="Cognome *"
              value={newCustomer.lastName}
              onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
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
              type="email"
              placeholder="Email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <input
              type="tel"
              placeholder="Telefono"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
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
              placeholder="Azienda"
              value={newCustomer.company}
              onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
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
              placeholder="P.IVA"
              value={newCustomer.vatNumber}
              onChange={(e) => setNewCustomer({ ...newCustomer, vatNumber: e.target.value })}
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
              placeholder="Indirizzo"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              style={{
                gridColumn: '1 / -1',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <input
              type="text"
              placeholder="Città"
              value={newCustomer.city}
              onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
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
              placeholder="CAP"
              value={newCustomer.postalCode}
              onChange={(e) => setNewCustomer({ ...newCustomer, postalCode: e.target.value })}
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white'
              }}
            />
            <textarea
              placeholder="Note"
              value={newCustomer.notes}
              onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
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
              Salva Cliente
            </button>
          </form>
        </div>
      )}

      {/* Customers List */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: 'white', marginBottom: '20px' }}>Lista Clienti</h3>
        
        {isLoading ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Caricamento clienti...</p>
        ) : customers && customers.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {customers.map((customer: any) => (
              <div key={customer.id} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '16px',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>
                    {customer.firstName} {customer.lastName}
                  </h4>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {customer.email && (
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: 0 }}>
                        📧 {customer.email}
                      </p>
                    )}
                    {customer.phone && (
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: 0 }}>
                        📱 {customer.phone}
                      </p>
                    )}
                    {customer.company && (
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: 0 }}>
                        🏢 {customer.company}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
                    Speso: €{customer.totalSpent || '0'}
                  </span>
                  <button style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}>
                    Dettagli
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center' }}>
            Nessun cliente trovato. Aggiungi il primo cliente!
          </p>
        )}
      </div>
    </div>
  );
}
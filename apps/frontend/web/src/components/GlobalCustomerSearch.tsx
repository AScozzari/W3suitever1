import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'wouter';
import { Search, User, Building2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTenantNavigation } from '../hooks/useTenantNavigation';

interface Customer {
  id: string;
  customerType: 'b2b' | 'b2c';
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  vatNumber?: string;
  status?: string;
}

interface GlobalCustomerSearchProps {
  placeholder?: string;
  className?: string;
}

export default function GlobalCustomerSearch({ 
  placeholder = "Cerca cliente...",
  className = ""
}: GlobalCustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { navigateToTenantPath } = useTenantNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: customersData, isLoading } = useQuery<{ success: boolean; data: Customer[] }>({
    queryKey: ['/api/crm/customers/search', { q: debouncedQuery }],
    enabled: debouncedQuery.length >= 2,
  });

  const customers = customersData?.data || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerSelect = (customerId: string) => {
    navigateToTenantPath(`/crm/customers/${customerId}`);
    setSearchQuery('');
    setIsOpen(false);
  };

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.customerType === 'b2b') {
      return customer.companyName || 'Azienda senza nome';
    }
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Cliente senza nome';
  };

  return (
    <div className={`relative ${className}`} style={{ minWidth: '280px', maxWidth: '400px' }}>
      <div className="relative">
        <Search 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
          size={18} 
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          data-testid="input-customer-search"
        />
        {isLoading && (
          <Loader2 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" 
            size={16} 
          />
        )}
      </div>

      {isOpen && debouncedQuery.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto"
          data-testid="dropdown-customer-results"
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Caricamento...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Nessun cliente trovato
            </div>
          ) : (
            <div className="py-2">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer.id)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-start gap-3"
                  data-testid={`customer-result-${customer.id}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {customer.customerType === 'b2b' ? (
                      <Building2 size={18} className="text-purple-600" />
                    ) : (
                      <User size={18} className="text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {getCustomerDisplayName(customer)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      {customer.email && (
                        <span className="truncate">{customer.email}</span>
                      )}
                      {customer.phone && (
                        <>
                          {customer.email && <span>•</span>}
                          <span>{customer.phone}</span>
                        </>
                      )}
                      {customer.vatNumber && customer.customerType === 'b2b' && (
                        <>
                          {(customer.email || customer.phone) && <span>•</span>}
                          <span>P.IVA {customer.vatNumber}</span>
                        </>
                      )}
                    </div>
                    {customer.status && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          customer.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : customer.status === 'prospect'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.status === 'active' ? 'Attivo' : customer.status === 'prospect' ? 'Prospect' : customer.status}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 🎯 BRAND STRUCTURES DATATABLE
 * Unified DataTable for Campaigns, Pipelines, and Funnels with relationship tracking
 * Features: Tabs, Linked Items badges, 4 actions (View/Edit/Enable-Disable/Delete)
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { 
  Eye, Edit, Power, Trash2, 
  ExternalLink, Filter, ArrowUpDown, Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useAllBrandTemplates, useToggleBrandTemplate, useDeleteBrandTemplate, type BrandTemplate } from '../hooks/useBrandTemplates';
import { useToast } from '../hooks/use-toast';

// Types
type StructureType = 'campaign' | 'pipeline' | 'funnel';
type StructureStatus = 'active' | 'draft' | 'archived';

interface LinkedItem {
  id: string;
  name: string;
  type: StructureType;
}

interface BrandStructure {
  id: string;
  name: string;
  type: StructureType;
  status: StructureStatus;
  isActive: boolean;
  linkedItems: LinkedItem[];
  description?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

interface BrandStructuresDataTableProps {
  onEdit: (id: string, type: StructureType) => void;
  onView: (id: string, type: StructureType) => void;
  onToggleActive: (id: string, currentState: boolean) => void;
  onDelete: (id: string) => void;
}

type TabFilter = 'all' | 'campaign' | 'pipeline' | 'funnel';

export function BrandStructuresDataTable({
  onEdit,
  onView,
  onToggleActive,
  onDelete
}: BrandStructuresDataTableProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
  const [linkedFilter, setLinkedFilter] = useState<LinkedItem | null>(null);
  const { toast } = useToast();

  // Fetch all templates from API
  const { data: templates, isLoading, error } = useAllBrandTemplates();
  const deleteMutation = useDeleteBrandTemplate('campaign'); // Type will be determined dynamically

  // Map BrandTemplate to BrandStructure format
  const structures: BrandStructure[] = (templates || []).map((template: BrandTemplate) => ({
    id: template.id,
    name: template.name,
    type: template.type,
    status: template.status,
    isActive: template.isActive,
    linkedItems: template.linkedItems || [],
    description: template.description,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    metadata: template.metadata
  }));

  // Filter structures
  const filteredStructures = structures.filter(s => {
    // Tab filter
    if (activeTab !== 'all' && s.type !== activeTab) return false;
    
    // Linked items filter (when clicking on a badge)
    if (linkedFilter) {
      return s.linkedItems.some(item => item.id === linkedFilter.id);
    }
    
    return true;
  });

  // Count by type
  const counts = {
    all: structures.length,
    campaign: structures.filter(s => s.type === 'campaign').length,
    pipeline: structures.filter(s => s.type === 'pipeline').length,
    funnel: structures.filter(s => s.type === 'funnel').length
  };

  const getTypeBadgeColor = (type: StructureType) => {
    switch (type) {
      case 'campaign': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'pipeline': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'funnel': return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getStatusBadgeColor = (status: StructureStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-yellow-100 text-yellow-700';
      case 'archived': return 'bg-gray-100 text-gray-700';
    }
  };

  const handleLinkedItemClick = (item: LinkedItem) => {
    // Set filter to show only structures linked to this item
    setLinkedFilter(item);
    // Switch to appropriate tab
    setActiveTab(item.type);
  };

  const clearLinkedFilter = () => {
    setLinkedFilter(null);
  };

  const viewedStructure = structures.find(s => s.id === viewDetailsId);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        <span className="ml-2 text-gray-600">Caricamento templates...</span>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Errore nel caricamento dei templates</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs + Linked Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['all', 'campaign', 'pipeline', 'funnel'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab(tab);
                clearLinkedFilter();
              }}
              data-testid={`tab-${tab}`}
            >
              {tab === 'all' && `All (${counts.all})`}
              {tab === 'campaign' && `Campagne (${counts.campaign})`}
              {tab === 'pipeline' && `Pipeline (${counts.pipeline})`}
              {tab === 'funnel' && `Funnel (${counts.funnel})`}
            </Button>
          ))}
        </div>

        {linkedFilter && (
          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Filtrando per:</span>
            <span className={`px-2 py-1 rounded border ${getTypeBadgeColor(linkedFilter.type)}`}>
              {linkedFilter.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLinkedFilter}
              className="h-6 px-2"
            >
              ✕
            </Button>
          </div>
        )}
      </div>

      {/* DataTable */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linked Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aggiornato
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStructures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nessuna struttura trovata
                  </td>
                </tr>
              ) : (
                filteredStructures.map((structure) => (
                  <tr
                    key={structure.id}
                    className="hover:bg-gray-50 transition-colors"
                    data-testid={`structure-row-${structure.id}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{structure.name}</span>
                        {!structure.isActive && (
                          <span className="text-xs text-red-600">(Disabilitato)</span>
                        )}
                      </div>
                      {structure.description && (
                        <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {structure.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getTypeBadgeColor(structure.type)}`}>
                        {structure.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(structure.status)}`}>
                        {structure.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {structure.linkedItems.length === 0 ? (
                          <span className="text-xs text-gray-400">Nessun link</span>
                        ) : (
                          structure.linkedItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleLinkedItemClick(item)}
                              className={`px-2 py-1 text-xs rounded border ${getTypeBadgeColor(item.type)} hover:opacity-75 transition-opacity inline-flex items-center gap-1`}
                              data-testid={`linked-badge-${item.id}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {item.name}
                            </button>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(structure.updatedAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* View */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewDetailsId(structure.id)}
                          className="h-10 w-10 p-0"
                          title="Visualizza dettagli"
                          data-testid={`button-view-${structure.id}`}
                        >
                          <Eye className="h-6 w-6 text-blue-600" />
                        </Button>

                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(structure.id, structure.type)}
                          className="h-10 w-10 p-0"
                          title="Modifica"
                          data-testid={`button-edit-${structure.id}`}
                        >
                          <Edit className="h-6 w-6 text-orange-600" />
                        </Button>

                        {/* Enable/Disable */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleActive(structure.id, structure.isActive)}
                          className="h-10 w-10 p-0"
                          title={structure.isActive ? 'Disabilita' : 'Abilita'}
                          data-testid={`button-toggle-${structure.id}`}
                        >
                          <Power className={`h-6 w-6 ${structure.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(structure.id)}
                          className="h-10 w-10 p-0"
                          title="Elimina"
                          data-testid={`button-delete-${structure.id}`}
                        >
                          <Trash2 className="h-6 w-6 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      <Dialog open={viewDetailsId !== null} onOpenChange={(open) => !open && setViewDetailsId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dettagli Struttura</DialogTitle>
            <DialogDescription>
              Visualizzazione readonly dei dettagli della struttura
            </DialogDescription>
          </DialogHeader>
          {viewedStructure && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome</label>
                  <p className="mt-1 text-sm text-gray-900">{viewedStructure.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getTypeBadgeColor(viewedStructure.type)}`}>
                      {viewedStructure.type}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(viewedStructure.status)}`}>
                      {viewedStructure.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Stato</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {viewedStructure.isActive ? '✅ Attivo' : '❌ Disabilitato'}
                  </p>
                </div>
              </div>

              {viewedStructure.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Descrizione</label>
                  <p className="mt-1 text-sm text-gray-900">{viewedStructure.description}</p>
                </div>
              )}

              {viewedStructure.linkedItems.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Linked Items</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {viewedStructure.linkedItems.map((item) => (
                      <span
                        key={item.id}
                        className={`px-3 py-1 text-sm rounded border ${getTypeBadgeColor(item.type)}`}
                      >
                        {item.name} ({item.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-700">Creato il</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(viewedStructure.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ultimo aggiornamento</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(viewedStructure.updatedAt).toLocaleString('it-IT')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

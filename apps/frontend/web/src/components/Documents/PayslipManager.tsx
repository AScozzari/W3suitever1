import { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface PayslipManagerProps {
  onClose?: () => void;
}

interface Payslip {
  id: string;
  year: number;
  month: number;
  netSalary: number;
  grossSalary: number;
  deductions: number;
  fileName: string;
  uploadedAt: string;
}

export default function PayslipManager({ onClose }: PayslipManagerProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareYear, setCompareYear] = useState(selectedYear - 1);

  const { data: payslips = [], isLoading } = useQuery<Payslip[]>({
    queryKey: ['/api/hr/documents/payslips', selectedYear],
    enabled: true
  });

  const { data: comparePayslips = [] } = useQuery<Payslip[]>({
    queryKey: ['/api/hr/documents/payslips', compareYear],
    enabled: compareMode
  });

  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const getPayslipForMonth = (month: number, year?: number) => {
    const slips = year === compareYear ? comparePayslips : payslips;
    return slips?.find((p) => p.month === month && p.year === (year || selectedYear));
  };

  const calculateYearlyTotals = (slips: Payslip[] | undefined) => {
    if (!slips || slips.length === 0) return { net: 0, gross: 0, deductions: 0 };
    return slips.reduce((acc, slip) => ({
      net: acc.net + slip.netSalary,
      gross: acc.gross + slip.grossSalary,
      deductions: acc.deductions + slip.deductions
    }), { net: 0, gross: 0, deductions: 0 });
  };

  const handleDownloadYear = async () => {
    const response = await fetch(`/api/hr/documents/payslips/${selectedYear}/download-all`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buste-paga-${selectedYear}.zip`;
    a.click();
  };

  const handleDownloadCUD = async () => {
    // Generate CUD document
    window.open(`/api/hr/documents/cud/${selectedYear}`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gestione Buste Paga</h2>
          <p className="text-gray-500 mt-1">Visualizza e gestisci tutte le tue buste paga</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            data-testid="select-year"
          >
            {[2024, 2023, 2022, 2021, 2020].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Compare Toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              compareMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
            data-testid="button-compare-mode"
          >
            <TrendingUp className="h-4 w-4" />
            Confronta
          </button>

          {/* Download Actions */}
          <button
            onClick={handleDownloadYear}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            data-testid="button-download-year"
          >
            <Download className="h-4 w-4" />
            Download {selectedYear}
          </button>
          
          <button
            onClick={handleDownloadCUD}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            data-testid="button-download-cud"
          >
            <FileText className="h-4 w-4" />
            CUD {selectedYear}
          </button>
        </div>
      </div>

      {/* Compare Year Selector */}
      {compareMode && (
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
          <label className="text-sm text-indigo-700 mr-2">Confronta con:</label>
          <select
            value={compareYear}
            onChange={(e) => setCompareYear(parseInt(e.target.value))}
            className="px-3 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500"
            data-testid="select-compare-year"
          >
            {[2024, 2023, 2022, 2021, 2020].filter(y => y !== selectedYear).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      {/* Yearly Summary */}
      {payslips && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Netto Totale</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculateYearlyTotals(payslips)?.net || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
            {compareMode && comparePayslips && (
              <div className="mt-2 text-sm">
                <span className="text-green-100">vs {compareYear}:</span>
                <span className="ml-2 font-medium">
                  {getPercentageChange(
                    calculateYearlyTotals(payslips)?.net || 0,
                    calculateYearlyTotals(comparePayslips)?.net || 0
                  )}%
                </span>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Lordo Totale</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculateYearlyTotals(payslips)?.gross || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Trattenute</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculateYearlyTotals(payslips)?.deductions || 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-200" />
            </div>
          </div>
        </div>
      )}

      {/* Monthly Payslips */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-700 mb-3">Dettaglio Mensile</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-2">Caricamento...</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {months.map((month, index) => {
              const monthNum = index + 1;
              const payslip = getPayslipForMonth(monthNum);
              const comparePayslip = compareMode ? getPayslipForMonth(monthNum, compareYear) : null;
              const isExpanded = expandedMonth === monthNum;
              
              return (
                <div
                  key={monthNum}
                  className={`border rounded-lg transition-all ${
                    payslip ? 'bg-white hover:shadow-md' : 'bg-gray-50 opacity-50'
                  }`}
                >
                  <button
                    onClick={() => payslip && setExpandedMonth(isExpanded ? null : monthNum)}
                    disabled={!payslip}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                    data-testid={`button-month-${monthNum}`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className={`h-4 w-4 ${payslip ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${payslip ? 'text-gray-900' : 'text-gray-400'}`}>
                        {month} {selectedYear}
                      </span>
                      {payslip && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Disponibile
                        </span>
                      )}
                    </div>
                    
                    {payslip && (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Netto</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(payslip.netSalary)}
                          </p>
                        </div>
                        
                        {comparePayslip && (
                          <div className="text-right border-l pl-4">
                            <p className="text-sm text-gray-500">{compareYear}</p>
                            <p className="font-semibold text-gray-600">
                              {formatCurrency(comparePayslip.netSalary)}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                  
                  {isExpanded && payslip && (
                    <div className="px-4 pb-4 border-t">
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-500">Lordo</p>
                          <p className="font-semibold">{formatCurrency(payslip.grossSalary)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Trattenute</p>
                          <p className="font-semibold text-red-600">
                            -{formatCurrency(payslip.deductions)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Caricato il</p>
                          <p className="text-sm">
                            {formatDistanceToNow(new Date(payslip.uploadedAt), { addSuffix: true, locale: it })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <a
                          href={`/api/hr/documents/${payslip.id}/download`}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                          data-testid={`link-download-${monthNum}`}
                        >
                          <Download className="h-3 w-3 inline mr-1" />
                          Download PDF
                        </a>
                        <button
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                        >
                          Visualizza
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
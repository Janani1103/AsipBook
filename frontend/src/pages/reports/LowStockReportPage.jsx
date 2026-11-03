import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import ReportExportActions from '../../components/reports/ReportExportActions';
import { useLowStockReport } from '../../features/reports/useReports';

export default function LowStockReportPage() {
    const navigate = useNavigate();
    const { data, isLoading } = useLowStockReport();
    const items = data?.data || [];

    const columns = [
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.productCode}</span> },
        { key: 'productName', label: 'Product', render: (r) => <span className="font-medium">{r.productName}</span> },
        { key: 'productType', label: 'Type', render: (r) => <Badge>{r.productType?.replace(/_/g, ' ')}</Badge> },
        {
            key: 'available', label: 'Available', render: (r) =>
                r.isCritical ? <Badge variant="danger">{r.available} (critical)</Badge> : <Badge variant="warning">{r.available}</Badge>
        },
        { key: 'reorderLevel', label: 'Reorder At' },
        { key: 'minimumStock', label: 'Min Stock' },
        { key: 'shortage', label: 'Shortage' },
    ];

    return (
        <div>
            <PageHeader
                title="Low Stock Alerts Report"
                description="Products at or below safe reorder levels needing replenishment"
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => navigate('/reports')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back to Reports
                        </Button>
                        <ReportExportActions
                            reportTitle="Low Stock Alerts"
                            disabled={isLoading || items.length === 0}
                            getExportData={() => {
                                const headers = ['Product Code', 'Product Name', 'Product Type', 'Available Qty', 'Reorder Level', 'Minimum Stock', 'Shortage Units', 'Critical Alert'];
                                const rows = items.map((r) => [
                                    r.productCode,
                                    r.productName,
                                    (r.productType || '').replace(/_/g, ' '),
                                    r.available,
                                    r.reorderLevel || 0,
                                    r.minimumStock || 0,
                                    r.shortage || 0,
                                    r.isCritical ? 'CRITICAL (EMPTY)' : 'LOW STOCK',
                                ]);
                                return {
                                    headers,
                                    rows,
                                    meta: [
                                        ['Total Urgent Items', items.length],
                                        ['Critical Items Count', items.filter(i => i.isCritical).length]
                                    ]
                                };
                            }}
                        />
                    </div>
                }
            />

            {items.length === 0 ? (
                <Card className="p-12 text-center">
                    <p className="text-green-600 text-lg font-medium">All stock levels are healthy</p>
                    <p className="text-sm text-gray-500 mt-1">No products below reorder level</p>
                </Card>
            ) : (
                <>
                    <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
                        <p className="text-sm text-amber-900 flex items-center gap-2">
                            <AlertTriangle size={16} /><strong>{items.length} products</strong> need attention.
                            Consider creating purchase orders for suppliers.
                        </p>
                    </Card>
                    <Card>
                        {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                            : <Table columns={columns} data={items} />}
                    </Card>
                </>
            )}
        </div>
    );
}
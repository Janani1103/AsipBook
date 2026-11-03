import express from 'express';
import {
    getDashboardKpis, getRevenueChart, getTopProducts, getTopCustomers,
} from '../controllers/dashboardController.js';
import {
    getSalesSummary, getSalesByProduct, getSalesByCustomer, getSalesTrend,
} from '../controllers/reports/salesReportsController.js';
import {
    getStockValuation, getStockMovement, getSlowFastMovers, getLowStockReport,
} from '../controllers/reports/inventoryReportsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    getProductionSummary, getProductionByProduct, getProductionWastage,
} from '../controllers/reports/productionReportsController.js';
import {
    getReturnsSummary, getDamagesReport,
} from '../controllers/reports/returnsReportsController.js';
import { getFinancialSnapshot } from '../controllers/reports/financialReportsController.js';
import {
    getHeadcountReport, getAttendanceReport, getLeavePatternsReport, getPayrollSummaryReport,
} from '../controllers/reports/hrReportsController.js';

// Add these route definitions:


const router = express.Router();
router.use(protect);

// Production
router.get('/production/summary', getProductionSummary);
router.get('/production/by-product', getProductionByProduct);
router.get('/production/wastage', getProductionWastage);

// Returns & Damages
router.get('/returns/summary', getReturnsSummary);
router.get('/damages/summary', getDamagesReport);

// Financial
router.get('/financial/snapshot', getFinancialSnapshot);

// HR
router.get('/hr/headcount', getHeadcountReport);
router.get('/hr/attendance-summary', getAttendanceReport);
router.get('/hr/leave-patterns', getLeavePatternsReport);
router.get('/hr/payroll-summary', getPayrollSummaryReport);

// Dashboard
router.get('/dashboard/kpis', getDashboardKpis);
router.get('/dashboard/revenue-chart', getRevenueChart);
router.get('/dashboard/top-products', getTopProducts);
router.get('/dashboard/top-customers', getTopCustomers);

// Sales reports
router.get('/sales/summary', getSalesSummary);
router.get('/sales/by-product', getSalesByProduct);
router.get('/sales/by-customer', getSalesByCustomer);
router.get('/sales/trend', getSalesTrend);

// Inventory reports
router.get('/inventory/valuation', getStockValuation);
router.get('/inventory/movement', getStockMovement);
router.get('/inventory/slow-fast-movers', getSlowFastMovers);
router.get('/inventory/low-stock', getLowStockReport);

export default router;
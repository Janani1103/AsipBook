"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CreditCard, DollarSign, Factory, FileText, Package, ShoppingCart, TrendingUp, Users, FileText as QuoteIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import { useAuthStore } from "../../client/store/authStore.js";
import { useDashboardKpis, useRevenueChart, useTopCustomers, useTopProducts, useExpiryAlerts } from "../../client/features/reports/useReports.js";
import { useSalesOrders } from "../../client/features/salesOrders/useSalesOrders.js";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 0 }).format(value || 0);
const shortMoney = (value) => value >= 1000000 ? `LKR ${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `LKR ${(value / 1000).toFixed(0)}k` : money(value);
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening"; };

function Metric({ label, value, subtext, href, Icon }) {
  const body = (
    <Card className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
            <Icon size={20} className="text-indigo-600" />
          </div>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="mt-1 text-xs text-gray-500 font-medium">{subtext}</p>}
    </Card>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

function RankedList({ title, rows, customer = false, empty, href }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <Link href={href}>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </div>

      {rows?.length ? (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row._id}
              className="flex items-center justify-between border-b py-2 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {customer ? row.customerName : row.productName}
                  </p>
                  <p className="font-mono text-xs text-gray-500">
                    {customer ? row.customerCode : row.productCode}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {money(customer ? row.totalInvoiced : row.revenue)}
                </p>
                <p className="text-xs text-gray-500">
                  {customer
                    ? `${row.invoiceCount} invoice${row.invoiceCount !== 1 ? "s" : ""}`
                    : `${row.quantitySold} units`}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-gray-500">{empty}</p>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: kpiData, isLoading } = useDashboardKpis();
  const { data: revenueData } = useRevenueChart(6);
  const { data: productsData } = useTopProducts({ period: "month", limit: 5 });
  const { data: customersData } = useTopCustomers({ period: "month", limit: 5 });
  const { data: expiryData } = useExpiryAlerts({ days: 3 });
  const { data: recentOrders } = useSalesOrders({ limit: 5 });
  const data = kpiData?.data;

  if (isLoading || !data) {
    return <div className="py-16 text-center text-gray-500">Loading dashboard...</div>;
  }

  const grossMargin = data.revenue.thisMonth > 0 ? ((data.grossProfit.thisMonth / data.revenue.thisMonth) * 100).toFixed(1) : "0.0";
  const cashPercent = data.revenue.thisMonth > 0 ? ((data.cashFlow.thisMonth / data.revenue.thisMonth) * 100).toFixed(1) : "0.0";
  const formattedDate = new Intl.DateTimeFormat("en-LK", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, <span className="text-indigo-600">{user?.firstName}!</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your store today
          </p>
        </div>
        <p className="rounded-xl border bg-white px-4 py-2 text-sm text-gray-600">
          {formattedDate}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Revenue"
          value={shortMoney(data.revenue.thisMonth)}
          subtext="This Month"
          Icon={TrendingUp}
        />
        <Metric
          label="Gross Profit"
          value={`${shortMoney(data.grossProfit.thisMonth)} (${grossMargin}%)`}
          subtext="Gross Margin Percentage"
          Icon={DollarSign}
        />
        <Metric
          label="Net Cash Flow"
          value={`${shortMoney(data.cashFlow.thisMonth)} (${cashPercent}%)`}
          subtext="% of Total Revenue"
          Icon={CreditCard}
        />
        <Metric
          label="Orders Today"
          value={data.orders.today}
          href="/sales-orders"
          Icon={ShoppingCart}
        />
        <Metric
          label="Receivables"
          value={shortMoney(data.receivables.total)}
          href="/invoices"
          Icon={ArrowRight}
        />
        <Metric
          label="Low Stock"
          value={data.stock.lowStockCount}
          href="/reports/inventory/low-stock"
          Icon={AlertTriangle}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Pending Approvals"
          value={data.orders.pendingApproval}
          Icon={FileText}
        />
        <Metric
          label="Pending Dispatch"
          value={data.orders.pendingDispatch}
          Icon={Package}
        />
        <Metric
          label="Active Production"
          value={data.production.active}
          subtext={`${data.production.completedThisMonth} completed this month`}
          Icon={Factory}
        />
        <Metric
          label="Active Customers"
          value={data.customers.total}
          subtext={`${data.customers.newThisMonth} new this month`}
          Icon={Users}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Revenue Trend (Last 6 Months)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueData?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="monthLabel" />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => money(value)} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Quick Actions</h2>
          <div className="space-y-2">
            {[
              ["New Sales Order", "/sales-orders/new"],
              ["New Quotation", "/quotations/new"],
              ["Record Payment", "/payments/new"],
              ["New Purchase Order", "/purchase-orders/new"],
              ["View All Reports", "/reports"],
            ].map(([label, href]) => (
              <Link key={href} href={href}>
                <Button fullWidth variant="outline" className="mb-2">
                  {label}
                  <ArrowRight size={14} className="ml-auto" />
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankedList
          title="Top Products This Month"
          rows={productsData?.data}
          empty="No sales this month yet"
          href="/reports/sales"
        />
        <RankedList
          title="Top Customers This Month"
          rows={customersData?.data}
          customer
          empty="No invoices this month yet"
          href="/customers"
        />
      </div>

      <div className="mb-6">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Recent Sales Orders</h2>
            <Link href="/sales-orders">
              <Button variant="outline" size="sm">
                View All Orders
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="pb-2 font-medium">Order #</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders?.data?.data?.length > 0 ? (
                  recentOrders.data.data.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-indigo-600">
                        <Link href={`/sales-orders/${order._id}`}>{order.orderNumber}</Link>
                      </td>
                      <td className="py-3 font-medium text-gray-900">{order.customer?.name || "Cash Customer"}</td>
                      <td className="py-3 text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            order.status === "COMPLETED" ? "success" : order.status === "PENDING" ? "warning" : "default"
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-900">{money(order.totalAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">
                      No recent orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {data.stock.lowStockItems?.length > 0 && (
        <Card className="border-l-4 border-l-red-500 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <AlertTriangle size={18} />
              Low Stock Alerts
            </h2>
            <Link href="/stock">
              <Button variant="outline" size="sm">
                View Stock
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.stock.lowStockItems.slice(0, 10).map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded bg-red-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="font-mono text-xs text-gray-600">{item.productCode}</p>
                </div>
                <div className="text-right">
                  <Badge variant="danger">{item.available} left</Badge>
                  <p className="mt-1 text-xs text-gray-600">
                    Reorder at: {item.reorderLevel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {expiryData?.data && (expiryData.data.expiredCount > 0 || expiryData.data.expiringTodayCount > 0 || expiryData.data.expiringSoonCount > 0) && (
        <Card className="border-l-4 border-l-orange-500 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-700">
              <AlertTriangle size={18} />
              Expiry Alerts
            </h2>
            <Link href="/stock">
              <Button variant="outline" size="sm">
                View Stock
              </Button>
            </Link>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div className="rounded bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{expiryData.data.expiredCount}</p>
              <p className="text-xs text-gray-600">Expired</p>
            </div>
            <div className="rounded bg-orange-50 p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{expiryData.data.expiringTodayCount}</p>
              <p className="text-xs text-gray-600">Expiring Today</p>
            </div>
            <div className="rounded bg-yellow-50 p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{expiryData.data.expiringSoonCount}</p>
              <p className="text-xs text-gray-600">Expiring Soon (3 days)</p>
            </div>
          </div>
          {(expiryData.data.expired?.length > 0 || expiryData.data.expiringToday?.length > 0 || expiryData.data.expiringSoon?.length > 0) && (
            <div className="space-y-2">
              {expiryData.data.expired?.slice(0, 5).map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded bg-red-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{item.productId?.name}</p>
                    <p className="font-mono text-xs text-gray-600">{item.productId?.productCode}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="danger">Expired</Badge>
                    <p className="mt-1 text-xs text-gray-600">{item.quantities?.available} units</p>
                  </div>
                </div>
              ))}
              {expiryData.data.expiringToday?.slice(0, 5).map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded bg-orange-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{item.productId?.name}</p>
                    <p className="font-mono text-xs text-gray-600">{item.productId?.productCode}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="warning">Expiring Today</Badge>
                    <p className="mt-1 text-xs text-gray-600">{item.quantities?.available} units</p>
                  </div>
                </div>
              ))}
              {expiryData.data.expiringSoon?.slice(0, 5).map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded bg-yellow-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{item.productId?.name}</p>
                    <p className="font-mono text-xs text-gray-600">{item.productId?.productCode}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="warning">Expiring in {item.daysUntilExpiry} days</Badge>
                    <p className="mt-1 text-xs text-gray-600">{item.quantities?.available} units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

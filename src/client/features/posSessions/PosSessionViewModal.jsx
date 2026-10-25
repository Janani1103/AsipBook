import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, Receipt, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { salesOrdersApi } from "../salesOrders/salesOrdersApi.js";
import Modal from "../../../components/ui/Modal.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(value || 0);
const dateTime = (value) =>
  value ? new Date(value).toLocaleString("en-LK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
const expectedBalance = (session) => (session.openingBalance || 0) + (session.cashSales || 0) - (session.cashExpenses || 0);

export default function PosSessionViewModal({ isOpen, onClose, session }) {
  if (!session) return null;

  const difference = session.status === "closed" ? (session.actualClosingBalance || 0) - expectedBalance(session) : 0;

  // Fetch orders for this session using cashier + date range
  const cashierId = session.userId?._id || session.userId;
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["salesOrders", "pos-session", session._id],
    queryFn: () =>
      salesOrdersApi.list({
        salesRepId: cashierId,
        startDate: session.openedAt,
        endDate: session.closedAt || new Date().toISOString(),
        limit: 200,
        sortBy: "orderDate",
        sortOrder: "asc",
      }),
    enabled: isOpen && !!session._id,
  });
  const orders = ordersData?.data || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="POS Session Details" size="xl">
      <div className="space-y-6 text-sm">
        {/* Header Info */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Status</span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${session.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-800'}`}>
              {session.status}
            </span>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Cashier</span>
            <span className="flex items-center gap-1 font-medium text-gray-800">
              <User size={14} />
              {session.userId?.firstName
                ? `${session.userId.firstName} ${session.userId.lastName || ""}`.trim()
                : session.userId?._id || session.userId || "Unknown"}
            </span>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Opened At</span>
            <span className="flex items-center gap-1 text-gray-800"><Clock size={14} /> {dateTime(session.openedAt)}</span>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Closed At</span>
            <span className="flex items-center gap-1 text-gray-800"><Clock size={14} /> {session.closedAt ? dateTime(session.closedAt) : "Active"}</span>
          </div>
        </div>

        {/* Financial Summary */}
        <div>
          <h3 className="mb-3 border-b pb-2 text-base font-semibold text-gray-800">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Opening Balance</span>
              <span className="font-mono font-medium">{money(session.openingBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cash Sales</span>
              <span className="font-mono font-medium text-emerald-600">+{money(session.cashSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cash Expenses</span>
              <span className="font-mono font-medium text-rose-600">-{money(session.cashExpenses)}</span>
            </div>
            <div className="my-2 border-t border-dashed"></div>
            <div className="flex justify-between font-semibold">
              <span className="text-gray-800">Expected Closing Balance</span>
              <span className="font-mono">{money(expectedBalance(session))}</span>
            </div>
            {session.status === "closed" && (
              <>
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-800">Actual Closing Balance</span>
                  <span className="font-mono">{money(session.actualClosingBalance)}</span>
                </div>
                <div className={`mt-2 flex justify-between rounded p-2 font-bold ${difference === 0 ? 'bg-emerald-50 text-emerald-700' : difference > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                  <span>Discrepancy</span>
                  <span className="font-mono">{difference > 0 ? "+" : ""}{money(difference)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Orders in this session */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 border-b pb-2 text-base font-semibold text-gray-800">
            <ShoppingCart size={16} className="text-indigo-600" />
            Orders in this Session
            {orders.length > 0 && (
              <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                {orders.length}
              </span>
            )}
          </h3>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-lg bg-gray-50 py-6 text-center text-gray-400">
              <ShoppingCart size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">No orders found for this session</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Order #</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-indigo-700">{order.orderNumber}</td>
                      <td className="px-3 py-2 text-gray-800">
                        {order.customerId?.displayName || order.customerSnapshot?.name || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${order.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">{money(order.grandTotal)}</td>
                      <td className="px-3 py-2 text-center">
                        {order.invoiceId ? (
                          <Link
                            href={`/receipt/${order.invoiceId}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                          >
                            <Receipt size={12} /> View
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        {session.notes && (
          <div>
            <h3 className="mb-2 border-b pb-2 text-base font-semibold text-gray-800">Notes</h3>
            <div className="flex items-start gap-2 rounded bg-amber-50 p-3 text-amber-800">
              <FileText size={16} className="mt-0.5 shrink-0" />
              <p className="whitespace-pre-wrap leading-relaxed">{session.notes}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

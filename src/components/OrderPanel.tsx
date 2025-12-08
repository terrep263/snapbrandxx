'use client';

interface OrderPanelProps {
  clientName: string;
  orderId: string;
  notes: string;
  onClientNameChange: (value: string) => void;
  onOrderIdChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export default function OrderPanel({
  clientName,
  orderId,
  notes,
  onClientNameChange,
  onOrderIdChange,
  onNotesChange,
}: OrderPanelProps) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Order & Client Info</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => onClientNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
              placeholder="Enter client name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Order ID</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => onOrderIdChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary"
              placeholder="Enter order ID"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-primary resize-none"
              placeholder="Internal notes..."
            />
          </div>
        </div>
        {clientName && orderId && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              Working on: <span className="text-gray-300 font-medium">{clientName}</span> – Order{' '}
              <span className="text-gray-300 font-medium">{orderId}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


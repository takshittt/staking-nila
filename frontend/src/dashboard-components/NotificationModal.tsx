import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface NotificationItemProps {
    type: 'pending' | 'success' | 'error';
    title: string;
    message: string;
}

const NotificationItem = ({ type, title, message }: NotificationItemProps) => {
    const getIcon = () => {
        switch (type) {
            case 'pending':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'success':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'pending':
                return 'bg-blue-50 hover:bg-blue-100';
            case 'success':
                return 'bg-green-50 hover:bg-green-100';
            case 'error':
                return 'bg-red-50 hover:bg-red-100';
        }
    };

    return (
        <div className={`p-4 rounded-xl border border-transparent transition-all duration-300 ${getBgColor()} mb-3 last:mb-0 cursor-pointer group`}>
            <div className="flex gap-3">
                <div className="mt-0.5">{getIcon()}</div>
                <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">{title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function NotificationModal() {
    return (
        <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-slate-800">Notifications</h3>
                <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">3 New</span>
            </div>

            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                <NotificationItem
                    type="pending"
                    title="Pending Transaction"
                    message="Your staking transaction is being confirmed on-chain."
                />

                <NotificationItem
                    type="success"
                    title="Success"
                    message="Stake successful. Instant cashback credited."
                />

                <NotificationItem
                    type="error"
                    title="Error"
                    message="Transaction failed. Please try again."
                />
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    Mark all as read
                </button>
            </div>
        </div>
    );
}

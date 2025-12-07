
const Toast = ({ message, type, onClose }) => {
  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md animate-slide-in`}>
      <div className="flex items-start space-x-3">
        
        <div className="flex-1">
          <p className="text-lg font-medium ">{message}</p>
        </div>
        <button onClick={onClose} className="flex-shrink-0 ml-2 hover:opacity-75">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
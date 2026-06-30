import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const CustomerProtectedRoute = ({ children }) => {
  const { currentCustomer, customerLoading } = useCustomerAuth();
  const location = useLocation();

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentCustomer) {
    return <Navigate to="/customer/login" state={{ from: location }} replace />;
  }

  return children;
};

export default CustomerProtectedRoute;

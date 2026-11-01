
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";

import MainLayout from "./layouts/MainLayout";
import ResponsivePage from "./components/ResponsivePage";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Desktop pages
import Dashboard from "./pages/Dashboard";
import StockIn from "./pages/StockIn";
import AddStock from "./pages/AddStock";
import Products from "./pages/Products";
import StockInHistory from "./pages/StockInHistory";
import ScanInvoice from "./pages/ScanInvoice";
import Billing from "./pages/Billing";
import Sales from "./pages/Sales";
import BillDetails from "./pages/BillDetails";

// Mobile pages
import DashboardMobile from "./pages/mobile/DashboardMobile";
import ProductsMobile from "./pages/mobile/ProductsMobile";
import BillingMobile from "./pages/mobile/BillingMobile";
import StockInMobile from "./pages/mobile/StockInMobile";
import PaymentsMobile from "./pages/mobile/PaymentsMobile";

function ResponsiveProducts() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 639px)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile ? <ProductsMobile /> : <Products />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes — no login required */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes — require login */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/"
              element={
                <ResponsivePage
                  desktop={<Dashboard />}
                  mobile={<DashboardMobile />}
                />
              }
            />
            <Route
              path="/stock-in"
              element={
                <ResponsivePage
                  desktop={<StockIn />}
                  mobile={<StockInMobile />}
                />
              }
            />
            <Route path="/stock-in/add" element={<AddStock />} />
            <Route path="/products" element={<ResponsiveProducts />} />
            <Route path="/sales" element={<Sales />} />
            <Route
              path="/billing"
              element={
                <ResponsivePage
                  desktop={<Billing />}
                  mobile={<BillingMobile />}
                />
              }
            />
            <Route
              path="/payments"
              element={<PaymentsMobile />}
            />
            <Route path="/sales/bill/:billId" element={<BillDetails />} />
            <Route path="/stock-in-history" element={<StockInHistory />} />
            <Route path="/scan-invoice" element={<ScanInvoice />} />

            {/* Fallback for protected area */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
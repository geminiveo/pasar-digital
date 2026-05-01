/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ProductDetails from './pages/ProductDetails';
import Shop from './pages/Shop';
import Vendors from './pages/Vendors';
import Checkout from './pages/Checkout';
import Success from './pages/Success';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/product/:slug" element={<ProductDetails />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/checkout/:productId" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
          </Routes>
        </main>
        <Footer />
        <Toaster position="bottom-right" theme="dark" richColors />
      </div>
    </Router>
  );
}


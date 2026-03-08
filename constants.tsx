
import React from 'react';
//need API_BASE_URL on enviroment if local then local url and if dev dev url else production url 
 export const API_BASE_URL = "https://dev-api.razaboilers.com/api";
//export const API_BASE_URL = "http://127.0.0.1:8000/api";
import { 
  LayoutDashboard, Truck, ShoppingBag, Users, Store, MapPin, 
  Car, ClipboardCheck, Wallet, Zap, Scissors, ListOrdered, FileSpreadsheet, 
  Box, CreditCard, ReceiptIndianRupee, Contact2, Factory, Utensils, BarChart3
} from 'lucide-react';

export const HOTEL_CUTS = ["Coldress", "Lollipop", "Boneless"];
export const SHOP_LIVE = ["Fresh", "Lame", "Tandoor"];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18}/> },
  { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 size={18}/>, roles: ['Owner', 'Accounts'] },
  { id: 'order_command', label: 'Order Command', icon: <Zap size={18}/>, roles: ['Owner', 'Manager'] },
  { id: 'customer_master', label: 'Customer Master', icon: <Contact2 size={18}/>, roles: ['Owner', 'Accounts'] },
  { id: 'company_master', label: 'Company Master', icon: <Factory size={18}/>, roles: ['Owner', 'Accounts'] },
  { id: 'procurement', label: 'Procurement', icon: <Truck size={18}/>, roles: ['Owner', 'Manager'] },
  { id: 'shop_delivery', label: 'Shop Delivery', icon: <Store size={18}/>, roles: ['Owner', 'Manager'] },
  { id: 'hotel_delivery', label: 'Hotel Delivery', icon: <Utensils size={18}/>, roles: ['Owner', 'Delivery', 'Accounts'] },
  { id: 'assignment_dashboard', label: 'Assignments', icon: <ListOrdered size={18}/>, roles: ['Owner', 'Manager', 'HotelManager'] },
  { id: 'sales_ledger', label: 'Sales Ledger', icon: <ReceiptIndianRupee size={18}/>, roles: ['Owner', 'Accounts'] },
  { id: 'purchase_ledger', label: 'Purchase Ledger', icon: <FileSpreadsheet size={18}/>, roles: ['Owner', 'Accounts'] },
  { id: 'maintenance_ledger', label: 'Maintenance Log', icon: <ReceiptIndianRupee size={18}/>, roles: ['Owner', 'Accounts'] },
  { id: 'vehicles', label: 'Fleet & Info', icon: <Car size={18}/> },
  { id: 'payroll', label: 'Staff Payroll', icon: <Users size={18}/> },
  { id: 'financials', label: 'Pricing Hub', icon: <Wallet size={18}/>, roles: ['Owner', 'Accounts'] },
];

export const INITIAL_PRICES = {
  inPrice: 120,
  outPriceHotel: 185,
  outPriceShop: 145,
  itemRates: {
    Coldress: 185,
    Lollipop: 210,
    Tandoor: 195,
    Boneless: 320,
    Fresh: 145,
    Lame: 135
  }
};

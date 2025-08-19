import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Product {
  id: string;
  name: string;
  qty: number;
  rate: number;
  total: number;
  gst: number;
}

interface InvoiceState {
  products: Product[];
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  isLoading: boolean;
  error: string | null;
  pdfUrl: string | null;
}

const initialState: InvoiceState = {
  products: [],
  subtotal: 0,
  totalGst: 0,
  grandTotal: 0,
  isLoading: false,
  error: null,
  pdfUrl: null,
};

// Calculate totals helper
const calculateTotals = (products: Product[]) => {
  const subtotal = products.reduce((sum, product) => sum + product.total, 0);
  const totalGst = products.reduce((sum, product) => sum + product.gst, 0);
  const grandTotal = subtotal + totalGst;
  
  return { subtotal, totalGst, grandTotal };
};

// Async thunks
export const generatePDF = createAsyncThunk(
  'invoice/generatePDF',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { invoice: InvoiceState; auth: { token: string } };
      const response = await axios.post(
        `${API_BASE_URL}/invoice/generate-pdf`,
        {
          products: state.invoice.products,
          subtotal: state.invoice.subtotal,
          totalGst: state.invoice.totalGst,
          grandTotal: state.invoice.grandTotal,
        },
        {
          headers: {
            Authorization: `Bearer ${state.auth.token}`,
          },
          responseType: 'blob',
        }
      );
      
      // Create blob URL for download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      return url;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'PDF generation failed');
    }
  }
);

const invoiceSlice = createSlice({
  name: 'invoice',
  initialState,
  reducers: {
    addProduct: (state, action: PayloadAction<Omit<Product, 'id' | 'total' | 'gst'>>) => {
      const { name, qty, rate } = action.payload;
      const total = qty * rate;
      const gst = total * 0.18; // 18% GST
      
      const newProduct: Product = {
        id: Date.now().toString(),
        name,
        qty,
        rate,
        total,
        gst,
      };
      
      state.products.push(newProduct);
      
      // Recalculate totals
      const totals = calculateTotals(state.products);
      state.subtotal = totals.subtotal;
      state.totalGst = totals.totalGst;
      state.grandTotal = totals.grandTotal;
    },
    
    updateProduct: (state, action: PayloadAction<Product>) => {
      const updatedProduct = action.payload;
      const index = state.products.findIndex(p => p.id === updatedProduct.id);
      
      if (index !== -1) {
        // Recalculate total and GST
        updatedProduct.total = updatedProduct.qty * updatedProduct.rate;
        updatedProduct.gst = updatedProduct.total * 0.18;
        
        state.products[index] = updatedProduct;
        
        // Recalculate totals
        const totals = calculateTotals(state.products);
        state.subtotal = totals.subtotal;
        state.totalGst = totals.totalGst;
        state.grandTotal = totals.grandTotal;
      }
    },
    
    removeProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(p => p.id !== action.payload);
      
      // Recalculate totals
      const totals = calculateTotals(state.products);
      state.subtotal = totals.subtotal;
      state.totalGst = totals.totalGst;
      state.grandTotal = totals.grandTotal;
    },
    
    clearProducts: (state) => {
      state.products = [];
      state.subtotal = 0;
      state.totalGst = 0;
      state.grandTotal = 0;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearPdfUrl: (state) => {
      if (state.pdfUrl) {
        window.URL.revokeObjectURL(state.pdfUrl);
        state.pdfUrl = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generatePDF.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generatePDF.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pdfUrl = action.payload;
        state.error = null;
      })
      .addCase(generatePDF.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  addProduct,
  updateProduct,
  removeProduct,
  clearProducts,
  clearError,
  clearPdfUrl,
} = invoiceSlice.actions;

export default invoiceSlice.reducer;
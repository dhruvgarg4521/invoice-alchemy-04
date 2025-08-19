import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShoppingCart, ArrowRight, LogOut, Calculator } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { addProduct, removeProduct, clearProducts } from '@/store/slices/invoiceSlice';
import { logoutUser } from '@/store/slices/authSlice';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { AppDispatch, RootState } from '@/store/store';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  qty: z.number().min(1, 'Quantity must be at least 1'),
  rate: z.number().min(0.01, 'Rate must be greater than 0'),
});

type ProductFormData = z.infer<typeof productSchema>;

const Products = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { products, subtotal, totalGst, grandTotal } = useSelector((state: RootState) => state.invoice);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = (data: ProductFormData) => {
    dispatch(addProduct({
      name: data.name,
      qty: data.qty,
      rate: data.rate,
    }));
    reset();
    toast({
      title: "Product added!",
      description: `${data.name} has been added to your invoice.`,
    });
  };

  const handleRemoveProduct = (productId: string) => {
    dispatch(removeProduct(productId));
    toast({
      title: "Product removed",
      description: "Product has been removed from your invoice.",
    });
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const handleNextStep = () => {
    if (products.length === 0) {
      toast({
        title: "No products added",
        description: "Please add at least one product to continue.",
        variant: "destructive",
      });
      return;
    }
    navigate('/generate-pdf');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl invoice-gradient flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Invoice Generator</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.name}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Product Form */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="invoice-card sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Product
                  </CardTitle>
                  <CardDescription>
                    Enter product details to add to your invoice
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name</Label>
                      <Input
                        id="productName"
                        placeholder="Enter product name"
                        {...register('name')}
                      />
                      {errors.name && (
                        <p className="text-destructive text-sm">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="qty">Quantity</Label>
                        <Input
                          id="qty"
                          type="number"
                          placeholder="0"
                          {...register('qty', { valueAsNumber: true })}
                        />
                        {errors.qty && (
                          <p className="text-destructive text-sm">{errors.qty.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rate">Rate (₹)</Label>
                        <Input
                          id="rate"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register('rate', { valueAsNumber: true })}
                        />
                        {errors.rate && (
                          <p className="text-destructive text-sm">{errors.rate.message}</p>
                        )}
                      </div>
                    </div>

                    <Button type="submit" className="w-full invoice-gradient">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Products List & Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products Table */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="invoice-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Products</CardTitle>
                      <CardDescription>
                        {products.length} product{products.length !== 1 ? 's' : ''} added
                      </CardDescription>
                    </div>
                    {products.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dispatch(clearProducts())}
                        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground">No products added</h3>
                      <p className="text-sm text-muted-foreground">Add your first product to get started</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">GST (18%)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {products.map((product, index) => (
                              <motion.tr
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                className="border-b border-border"
                              >
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary">{product.qty}</Badge>
                                </TableCell>
                                <TableCell className="text-right">₹{product.rate.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">₹{product.total.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-success">₹{product.gst.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveProduct(product.id)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Invoice Summary */}
            {products.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="invoice-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Invoice Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total GST (18%)</span>
                        <span className="text-success">₹{totalGst.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Grand Total</span>
                          <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleNextStep}
                      className="w-full h-12 text-base success-gradient hover:opacity-90"
                    >
                      Generate Invoice PDF
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
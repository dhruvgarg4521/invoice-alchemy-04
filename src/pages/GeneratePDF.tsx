import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, FileText, ArrowLeft, Check, Loader2, Calendar, User, Calculator } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generatePDF, clearPdfUrl, clearError } from '@/store/slices/invoiceSlice';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { AppDispatch, RootState } from '@/store/store';

const GeneratePDF = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { products, subtotal, totalGst, grandTotal, isLoading, error, pdfUrl } = useSelector((state: RootState) => state.invoice);
  const [isPDFGenerated, setIsPDFGenerated] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (products.length === 0) {
      navigate('/products');
      return;
    }
  }, [isAuthenticated, products.length, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      if (pdfUrl) {
        dispatch(clearPdfUrl());
      }
    };
  }, [dispatch, pdfUrl]);

  const handleGeneratePDF = async () => {
    try {
      await dispatch(generatePDF()).unwrap();
      setIsPDFGenerated(true);
      toast({
        title: "PDF Generated!",
        description: "Your invoice PDF has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `invoice-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your invoice PDF is being downloaded.",
      });
    }
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/products')}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-primary rounded-xl invoice-gradient flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Generate Invoice PDF</h1>
                <p className="text-sm text-muted-foreground">Review and download your invoice</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Invoice Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="invoice-card shadow-invoice">
              <CardHeader className="text-center border-b border-border">
                <CardTitle className="text-2xl font-bold">INVOICE</CardTitle>
                <CardDescription>Invoice #{Date.now().toString().slice(-6)}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {/* Invoice Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Bill To:
                    </h3>
                    <div className="text-muted-foreground">
                      <p className="font-medium text-foreground">{user?.name}</p>
                      <p>{user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:text-right">
                    <h3 className="font-semibold text-lg flex items-center gap-2 md:justify-end">
                      <Calendar className="w-5 h-5" />
                      Invoice Date:
                    </h3>
                    <p className="text-muted-foreground">{currentDate}</p>
                  </div>
                </div>

                {/* Products Table */}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">GST (18%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{product.qty}</Badge>
                          </TableCell>
                          <TableCell className="text-right">₹{product.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">₹{product.total.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-success">₹{product.gst.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Invoice Summary */}
                <div className="space-y-4">
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-end">
                      <div className="w-full max-w-sm space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total GST (18%):</span>
                          <span className="text-success">₹{totalGst.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-border pt-3">
                          <div className="flex justify-between text-xl font-bold">
                            <span>Grand Total:</span>
                            <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="invoice-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Generate PDF
                </CardTitle>
                <CardDescription>
                  Click the button below to generate and download your invoice PDF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {isPDFGenerated && pdfUrl && (
                  <Alert className="border-success bg-success-light">
                    <Check className="w-4 h-4 text-success" />
                    <AlertDescription className="text-success">
                      PDF generated successfully! You can now download it.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4">
                  {!isPDFGenerated ? (
                    <Button
                      onClick={handleGeneratePDF}
                      disabled={isLoading}
                      className="flex-1 h-12 text-base invoice-gradient"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate PDF
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleDownload}
                      disabled={!pdfUrl}
                      className="flex-1 h-12 text-base success-gradient"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => navigate('/products')}
                    className="h-12"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Products
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GeneratePDF;
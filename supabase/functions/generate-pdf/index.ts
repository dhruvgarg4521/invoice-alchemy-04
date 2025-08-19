import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  qty: number;
  rate: number;
  total: number;
  gst: number;
}

interface InvoiceData {
  products: Product[];
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  userEmail: string;
  userName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth header
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const invoiceData: InvoiceData = await req.json();
    
    // Generate professional HTML for PDF
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333;
              background: white;
            }
            .invoice-container { 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 40px;
              background: white;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 40px;
            }
            .company-info h1 { 
              font-size: 32px; 
              font-weight: bold; 
              color: #2563eb;
              margin-bottom: 5px;
            }
            .company-info p { 
              color: #666; 
              font-size: 14px;
            }
            .invoice-details { 
              text-align: right;
            }
            .invoice-number { 
              font-size: 24px; 
              font-weight: bold; 
              color: #2563eb;
              margin-bottom: 5px;
            }
            .invoice-date { 
              color: #666; 
              font-size: 14px;
            }
            .billing-section { 
              display: flex; 
              justify-content: space-between; 
              margin: 40px 0;
            }
            .billing-info h3 { 
              font-size: 16px; 
              color: #2563eb;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .billing-info p { 
              margin-bottom: 5px;
              font-size: 14px;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 40px 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .items-table thead { 
              background: #2563eb;
              color: white;
            }
            .items-table th { 
              padding: 15px 12px; 
              text-align: left; 
              font-weight: 600;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .items-table td { 
              padding: 15px 12px; 
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            .items-table tbody tr:nth-child(even) { 
              background-color: #f9fafb;
            }
            .items-table tbody tr:hover { 
              background-color: #f3f4f6;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary-section { 
              margin-top: 40px; 
              display: flex; 
              justify-content: flex-end;
            }
            .summary-table { 
              min-width: 300px;
              border-collapse: collapse;
            }
            .summary-table td { 
              padding: 12px 20px; 
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            .summary-table .label { 
              font-weight: 600; 
              color: #374151;
            }
            .summary-table .amount { 
              text-align: right; 
              font-weight: 600;
            }
            .total-row { 
              background: #2563eb;
              color: white;
              font-size: 18px;
              font-weight: bold;
            }
            .total-row td { 
              border-bottom: none;
              padding: 15px 20px;
            }
            .footer { 
              margin-top: 60px; 
              padding-top: 30px; 
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .currency { 
              font-weight: 600;
              color: #059669;
            }
            @media print {
              body { margin: 0; }
              .invoice-container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info">
                <h1>Invoice Pro</h1>
                <p>Professional Invoice Generation</p>
              </div>
              <div class="invoice-details">
                <div class="invoice-number">INV-${Date.now().toString().slice(-6)}</div>
                <div class="invoice-date">${new Date().toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
            </div>
            
            <div class="billing-section">
              <div class="billing-info">
                <h3>Bill To</h3>
                <p><strong>${invoiceData.userName}</strong></p>
                <p>${invoiceData.userEmail}</p>
              </div>
              <div class="billing-info">
                <h3>Invoice Details</h3>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                <p><strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Rate</th>
                  <th class="text-right">Amount</th>
                  <th class="text-right">GST (18%)</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.products.map(product => `
                  <tr>
                    <td><strong>${product.name}</strong></td>
                    <td class="text-center">${product.qty}</td>
                    <td class="text-right"><span class="currency">₹${product.rate.toFixed(2)}</span></td>
                    <td class="text-right"><span class="currency">₹${product.total.toFixed(2)}</span></td>
                    <td class="text-right"><span class="currency">₹${product.gst.toFixed(2)}</span></td>
                    <td class="text-right"><span class="currency">₹${(product.total + product.gst).toFixed(2)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="summary-section">
              <table class="summary-table">
                <tr>
                  <td class="label">Subtotal:</td>
                  <td class="amount"><span class="currency">₹${invoiceData.subtotal.toFixed(2)}</span></td>
                </tr>
                <tr>
                  <td class="label">Total GST (18%):</td>
                  <td class="amount"><span class="currency">₹${invoiceData.totalGst.toFixed(2)}</span></td>
                </tr>
                <tr class="total-row">
                  <td>GRAND TOTAL:</td>
                  <td class="text-right">₹${invoiceData.grandTotal.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Generated on ${new Date().toLocaleString('en-IN')} • Invoice Pro System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    const page = await browser.newPage();
    
    // Set content and generate PDF
    await page.setContent(invoiceHtml, { 
      waitUntil: 'networkidle0' 
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });

    await browser.close();

    // Return PDF as downloadable file
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${Date.now()}.pdf"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: `PDF generation failed: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

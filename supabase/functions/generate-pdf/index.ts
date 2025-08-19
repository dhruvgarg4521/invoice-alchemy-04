import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

// ⚡ Import Puppeteer from npm (works in Deno if you enable npm specifier support)
import puppeteer from "npm:puppeteer";

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const invoiceData: InvoiceData = await req.json();

    // Generate HTML string for invoice
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-title { font-size: 28px; font-weight: bold; color: #333; }
            .invoice-number { color: #666; margin-top: 5px; }
            .user-info { margin: 30px 0; }
            .user-info h3 { margin-bottom: 10px; color: #333; }
            .date { text-align: right; margin-top: -60px; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary { margin-top: 30px; }
            .summary-table { width: 300px; margin-left: auto; }
            .summary-table td { border: none; padding: 8px; }
            .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">Invoice #${Date.now().toString().slice(-6)}</div>
          </div>
          <div class="user-info">
            <h3>Bill To:</h3>
            <div><strong>${invoiceData.userName}</strong></div>
            <div>${invoiceData.userEmail}</div>
          </div>
          <div class="date">
            <h3>Invoice Date:</h3>
            <div>${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Total</th>
                <th class="text-right">GST (18%)</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.products.map(product => `
                <tr>
                  <td>${product.name}</td>
                  <td class="text-center">${product.qty}</td>
                  <td class="text-right">₹${product.rate.toFixed(2)}</td>
                  <td class="text-right">₹${product.total.toFixed(2)}</td>
                  <td class="text-right">₹${product.gst.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="summary">
            <table class="summary-table">
              <tr>
                <td>Subtotal:</td>
                <td class="text-right">₹${invoiceData.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total GST (18%):</td>
                <td class="text-right">₹${invoiceData.totalGst.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Grand Total:</td>
                <td class="text-right">₹${invoiceData.grandTotal.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    // ✅ Launch Puppeteer to convert HTML -> PDF
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(invoiceHtml, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });
    await browser.close();

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${Date.now()}.pdf"`,
      },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

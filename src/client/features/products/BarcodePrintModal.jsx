"use client";
import { useState, useEffect } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";

export default function BarcodePrintModal({ isOpen, onClose, product }) {
  const [format, setFormat] = useState("code128");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && product) {
      if (product.barcode) {
        setBarcodeValue(product.barcode);
      } else {
        // Generate random CODE128 string if none exists
        setFormat("code128");
        setBarcodeValue(Math.random().toString(36).substring(2, 10).toUpperCase());
      }
      setQuantity(1);
    }
  }, [isOpen, product]);

  const generateAuto = () => {
    if (format === "ean13") {
      const code = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
      }
      setBarcodeValue(code + ((10 - (sum % 10)) % 10));
    } else if (format === "upca") {
      const code = Math.floor(10000000000 + Math.random() * 90000000000).toString();
      let sum = 0;
      for (let i = 0; i < 11; i++) {
        sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
      }
      setBarcodeValue(code + ((10 - (sum % 10)) % 10));
    } else {
      setBarcodeValue(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
  };

  const handlePrint = () => {
    if (!barcodeValue) return;
    
    const printWindow = window.open("", "_blank");
    const barcodeUrl = `https://barcode.orcascan.com/?type=${format}&data=${barcodeValue}`;
    
    let html = `
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 10px; display: flex; flex-wrap: wrap; gap: 10px; }
            .label { 
              width: 2in; height: 1.25in; 
              border: 1px dashed #ccc; 
              padding: 5px; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: space-between; 
              text-align: center;
              page-break-inside: avoid;
            }
            .name { font-size: 11px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
            .price { font-size: 13px; font-weight: bold; }
            img { max-width: 100%; max-height: 50px; }
          </style>
        </head>
        <body>
    `;
    
    for (let i = 0; i < quantity; i++) {
      html += `
        <div class="label">
          <div class="name">${product?.name || "Product"}</div>
          <img src="${barcodeUrl}" alt="barcode" />
          <div class="price">LKR ${product?.basePrice?.toFixed(2) || "0.00"}</div>
        </div>
      `;
    }
    
    html += `
        </body>
        <script>
          window.onload = () => { 
            setTimeout(() => {
              window.print(); 
            }, 300);
          };
          window.onafterprint = () => {
            window.close();
          };
        </script>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Barcodes" size="md">
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Format"
            options={[
              { value: "code128", label: "CODE 128" },
              { value: "ean13", label: "EAN 13" },
              { value: "upca", label: "UPC A" }
            ]}
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          />
          <Input
            label="Quantity to Print"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Barcode Value"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={generateAuto} className="mb-[1px]">
            Generate
          </Button>
        </div>

        <div className="mt-4 border rounded-lg p-4 bg-gray-50 flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-gray-700">Preview (Single Label)</p>
          <div className="w-[2in] h-[1.25in] border border-dashed border-gray-400 bg-white p-2 flex flex-col items-center justify-between text-center">
            <div className="text-[11px] font-bold truncate w-full">{product.name}</div>
            {barcodeValue && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={`https://barcode.orcascan.com/?type=${format}&data=${barcodeValue}`} 
                alt="Barcode" 
                className="max-h-[50px] max-w-full"
              />
            )}
            <div className="text-[13px] font-bold">LKR {product.basePrice?.toFixed(2) || "0.00"}</div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handlePrint} disabled={!barcodeValue || quantity < 1}>
            Print
          </Button>
        </div>
      </div>
    </Modal>
  );
}

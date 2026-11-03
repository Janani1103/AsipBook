const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const crudPages = [
    'CategoriesPage.jsx',
    'BrandsPage.jsx',
    'UomsPage.jsx',
    'WarehousesPage.jsx',
    'BankAccountsPage.jsx',
    'CustomerGroupsPage.jsx',
    'CustomersPage.jsx',
    'SuppliersPage.jsx',
    'ProductsPage.jsx',
    'DepartmentsPage.jsx',
    'DesignationsPage.jsx',
    'HolidaysPage.jsx',
    'SalaryStructuresPage.jsx'
];

crudPages.forEach(file => {
    const filePath = path.join(pagesDir, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has Eye import and isView
    if (content.includes('isView') || content.includes('setIsView')) {
        console.log(`Skipping ${file} - already has isView`);
        return;
    }

    // Add Eye to lucide-react imports
    content = content.replace(/import\s+\{[^}]*\}\s+from\s+'lucide-react';/, (match) => {
        if (!match.includes('Eye')) {
            return match.replace('{', '{ Eye,');
        }
        return match;
    });

    // Add isView state
    content = content.replace(/const\s+\[isFormOpen,\s*setIsFormOpen\]\s*=\s*useState\(false\);/, 
        "const [isFormOpen, setIsFormOpen] = useState(false);\n    const [isView, setIsView] = useState(false);");

    // Modify openForm signature and logic
    content = content.replace(/openForm\s*=\s*\(([\w\s=]*)\)\s*=>\s*\{/, (match, params) => {
        return `openForm = (${params.includes('=') ? params : params + ' = null'}, viewMode = false) => {\n        setIsView(viewMode);`;
    });

    // Ensure onClose resets isView
    content = content.replace(/setIsFormOpen\(false\);\s*setEditing\(null\);/g, "setIsFormOpen(false); setEditing(null); setIsView(false);");
    // Also handle handleClose or similar in ProductsPage
    content = content.replace(/setEditingProduct\(null\);/g, "setEditingProduct(null); setIsView(false);");

    // Add View button in the Actions column
    // The pattern is usually <button onClick={() => openForm(r)} ... Edit
    // Or openForm(r, false)
    content = content.replace(/(<button[^>]*onClick=\{\(\)\s*=>\s*openForm\([^)]*\)\}[^>]*>[\s\S]*?<Edit[^>]*>[\s\S]*?<\/button>)/, (match) => {
        return `<button onClick={() => openForm(r, true)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View"><Eye size={16} /></button>\n                        ${match}`;
    });
    // For setEditingProduct(row) in ProductsPage
    content = content.replace(/(<button[^>]*onClick=\{\(e\)\s*=>\s*\{\s*e\.stopPropagation\(\);\s*setEditingProduct\(([^)]+)\);\s*setIsFormOpen\(true\);\s*\}[^>]*>[\s\S]*?<Edit[^>]*>[\s\S]*?<\/button>)/, (match, fullMatch, rowVar) => {
         return `<button onClick={(e) => { e.stopPropagation(); setEditingProduct(${rowVar}); setIsView(true); setIsFormOpen(true); }} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View"><Eye size={16} /></button>\n                            ${fullMatch}`;
    });

    // Disable inputs
    content = content.replace(/<Input\s/g, '<Input disabled={isView} ');
    content = content.replace(/<Textarea\s/g, '<Textarea disabled={isView} ');
    content = content.replace(/<Select\s/g, '<Select disabled={isView} ');
    content = content.replace(/type="checkbox"/g, 'type="checkbox" disabled={isView}');

    // Hide submit button
    content = content.replace(/(<Button\s+type="submit"[^>]*>)/, '{!isView && $1');
    content = content.replace(/(<\/Button>\s*<\/div>\s*<\/form>)/, '$1'.replace('</Button>', '</Button>}')); // This might be tricky, let's just do a simpler replace

    // Simpler hide submit:
    content = content.replace(/(<Button type="submit"[^>]*>[\s\S]*?<\/Button>)/g, "{!isView && ($1)}");

    fs.writeFileSync(filePath, content);
    console.log(`Processed ${file}`);
});

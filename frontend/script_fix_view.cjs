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

    // Fix the broken submit buttons
    // Current broken state:
    // {!isView && {!isView && (<Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>
    //                         {editing ? 'Update' : 'Create'}
    //                     </Button>)}
    // And possibly another } at the end.
    
    // First let's remove the first bad replacement
    content = content.replace(/\{\!isView && \{\!isView && \(/g, '{!isView && (');
    
    // Wait, the first replace did: '{!isView && <Button...'
    // Then the second didn't do anything because string.replace is weird.
    // Then the third did: '{!isView && ({!isView && <Button...})}'
    
    // Let's just fix it by searching for:
    // {!isView && {!isView && (<Button
    // Replace with:
    // {!isView && (<Button
    content = content.replace(/\{\!isView && \{\!isView && \(/g, '{!isView && (');
    
    // Also, there might be a dangling } from the second replace attempt.
    // Let's check how many closing braces there are.
    // In original:
    // <Button type="submit">...</Button>
    // It became:
    // {!isView && {!isView && (<Button type="submit">...</Button>)}
    // Let's verify what the actual string is.
    
    fs.writeFileSync(filePath, content);
    console.log(`Processed ${file}`);
});

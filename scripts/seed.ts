import { db } from "../src/shared/database";
import * as s from "../src/shared/database/schema";
import { hashPassword } from "../src/shared/kernel/security";

async function main() {
  console.log("🌱 Starting ERP Minimarket database seeding...");

  // 1. Roles
  const rolesList = [
    { id: "owner", name: "Owner / Super Admin", description: "Akses penuh seluruh modul, pengguna, dan konfigurasi", isSystem: true },
    { id: "admin_ops", name: "Admin Operasional", description: "Akses operasional POS dan Gudang", isSystem: true },
    { id: "supervisor", name: "Supervisor", description: "Approval retur, void, penyesuaian stok, dan diskon", isSystem: true },
    { id: "cashier", name: "Kasir", description: "Akses kasir POS, shift mandiri, dan cetak struk", isSystem: true },
    { id: "warehouse", name: "Petugas Gudang", description: "Akses master barang, penerimaan, transfer, dan stok opname", isSystem: true },
    { id: "accountant", name: "Akuntan", description: "Akses buku besar, jurnal, kas/bank, dan laporan keuangan", isSystem: true },
    { id: "hr_payroll", name: "HR & Payroll", description: "Akses penggajian dan data karyawan", isSystem: true },
    { id: "auditor", name: "Auditor", description: "Akses peninjauan read-only", isSystem: true },
  ];

  for (const role of rolesList) {
    await db.insert(s.roles).values(role).onConflictDoNothing();
  }

  // 2. Permissions
  const permissionsList = [
    // POS
    { id: "pos.access", module: "pos", description: "Akses modul kasir POS" },
    { id: "pos.sell", module: "pos", description: "Membuat transaksi checkout penjualan" },
    { id: "pos.discount.apply", module: "pos", description: "Menerapkan diskon standar" },
    { id: "pos.discount.override", module: "pos", description: "Otorisasi diskon di atas batas limit" },
    { id: "pos.order.hold", module: "pos", description: "Menahan transaksi sementara (hold cart)" },
    { id: "pos.credit.create", module: "pos", description: "Melakukan transaksi penjualan kredit/piutang" },
    { id: "pos.payment.receive", module: "pos", description: "Menerima pelunasan pembayaran piutang" },
    { id: "pos.return.create", module: "pos", description: "Membuat dokumen retur penjualan pelanggan" },
    { id: "pos.refund.approve", module: "pos", description: "Menyetujui pengembalian uang (refund)" },
    { id: "pos.void", module: "pos", description: "Membatalkan / void transaksi penjualan" },
    { id: "pos.receipt.reprint", module: "pos", description: "Mencetak ulang struk transaksi" },
    { id: "pos.shift.open", module: "pos", description: "Membuka shift kasir" },
    { id: "pos.shift.close", module: "pos", description: "Menutup shift kasir dan rekonsiliasi kas" },
    { id: "pos.report.view", module: "pos", description: "Melihat laporan penjualan kasir" },

    // Inventory / Gudang
    { id: "inventory.access", module: "inventory", description: "Akses modul gudang dan persediaan" },
    { id: "product.view", module: "inventory", description: "Melihat katalog produk dan stok" },
    { id: "product.create", module: "inventory", description: "Menambah master produk baru" },
    { id: "product.update", module: "inventory", description: "Mengubah harga dan informasi master produk" },
    { id: "product.archive", module: "inventory", description: "Mengarsipkan / menonaktifkan produk" },
    { id: "inventory.receive", module: "inventory", description: "Menerima barang masuk (Goods Receipt)" },
    { id: "inventory.transfer", module: "inventory", description: "Membuat dan menerima transfer stok antar lokasi" },
    { id: "inventory.stocktake", module: "inventory", description: "Melakukan stock opname fisik" },
    { id: "inventory.adjust", module: "inventory", description: "Menyetujui penyesuaian selisih stok opname" },
    { id: "inventory.damage", module: "inventory", description: "Pencatatan barang rusak / kedaluwarsa" },
    { id: "supplier.manage", module: "inventory", description: "Mengelola data supplier / pemasok" },
    { id: "purchase.create", module: "inventory", description: "Membuat Purchase Order (PO)" },
    { id: "purchase.approve", module: "inventory", description: "Menyetujui Purchase Order (PO)" },
    { id: "purchase.return", module: "inventory", description: "Membuat retur barang ke supplier" },

    // Akuntansi
    { id: "accounting.access", module: "accounting", description: "Akses modul akuntansi dan keuangan" },
    { id: "account.view", module: "accounting", description: "Melihat bagan akun (COA) dan saldo" },
    { id: "journal.create", module: "accounting", description: "Membuat entri jurnal manual" },
    { id: "journal.post", module: "accounting", description: "Posting jurnal ke buku besar" },
    { id: "journal.reverse", module: "accounting", description: "Membuat jurnal pembalik (reversal)" },
    { id: "bank.transfer", module: "accounting", description: "Transfer dana antar rekening bank" },
    { id: "bank.reconcile", module: "accounting", description: "Rekonsiliasi mutasi rekening bank" },
    { id: "expense.create", module: "accounting", description: "Mencatat pengeluaran beban operasional" },
    { id: "receivable.manage", module: "accounting", description: "Mengelola kartu piutang pelanggan" },
    { id: "payable.manage", module: "accounting", description: "Mengelola kartu utang supplier" },
    { id: "report.financial.view", module: "accounting", description: "Melihat laporan keuangan" },
    { id: "report.financial.export", module: "accounting", description: "Mengekspor laporan keuangan" },
    { id: "payroll.view", module: "accounting", description: "Melihat data dan slip gaji karyawan" },
    { id: "payroll.manage", module: "accounting", description: "Menghitung dan memproses penggajian" },
    { id: "payroll.approve", module: "accounting", description: "Menyetujui dan posting penggajian" },

    // Admin
    { id: "user.manage", module: "admin", description: "Mengelola pengguna dan hak akses" },
    { id: "role.manage", module: "admin", description: "Mengelola template role dan permission" },
    { id: "settings.manage", module: "admin", description: "Konfigurasi umum toko dan sistem" },
    { id: "migration.preview", module: "admin", description: "Mengunggah dan meninjau data migrasi Accurate" },
    { id: "migration.execute", module: "admin", description: "Mengeksekusi batch import data migrasi" },
    { id: "audit.view", module: "admin", description: "Melihat log audit aktivitas sistem" },
    { id: "backup.manage", module: "admin", description: "Mengelola backup dan restore database" },
  ];

  for (const perm of permissionsList) {
    await db.insert(s.permissions).values(perm).onConflictDoNothing();
  }

  // Grant all permissions to owner
  for (const perm of permissionsList) {
    await db.insert(s.rolePermissions).values({
      id: `owner_${perm.id}`,
      roleId: "owner",
      permissionId: perm.id,
    }).onConflictDoNothing();
  }

  // Grant cashier permissions
  const cashierPerms = permissionsList.filter(p => p.id.startsWith("pos.") || p.id === "product.view");
  for (const perm of cashierPerms) {
    await db.insert(s.rolePermissions).values({
      id: `cashier_${perm.id}`,
      roleId: "cashier",
      permissionId: perm.id,
    }).onConflictDoNothing();
  }

  // Grant warehouse permissions
  const whPerms = permissionsList.filter(p => p.id.startsWith("inventory.") || p.id.startsWith("product.") || p.id.startsWith("purchase.") || p.id === "supplier.manage");
  for (const perm of whPerms) {
    await db.insert(s.rolePermissions).values({
      id: `warehouse_${perm.id}`,
      roleId: "warehouse",
      permissionId: perm.id,
    }).onConflictDoNothing();
  }

  // Grant accountant permissions
  const accPerms = permissionsList.filter(p => p.id.startsWith("accounting.") || p.id.startsWith("account.") || p.id.startsWith("journal.") || p.id.startsWith("bank.") || p.id.startsWith("expense.") || p.id.startsWith("receivable.") || p.id.startsWith("payable.") || p.id.startsWith("report.financial."));
  for (const perm of accPerms) {
    await db.insert(s.rolePermissions).values({
      id: `accountant_${perm.id}`,
      roleId: "accountant",
      permissionId: perm.id,
    }).onConflictDoNothing();
  }

  // 3. Locations
  const locationsList = [
    { id: "loc_store", code: "STORE-01", name: "Area Penjualan Toko", type: "store", isActive: true },
    { id: "loc_wh", code: "WH-MAIN", name: "Gudang Utama", type: "warehouse", isActive: true },
    { id: "loc_damaged", code: "DAMAGED", name: "Area Barang Rusak", type: "damaged", isActive: true },
    { id: "loc_quarantine", code: "QUARANTINE", name: "Area Retur & Karantina", type: "quarantine", isActive: true },
  ];
  for (const loc of locationsList) {
    await db.insert(s.locations).values(loc).onConflictDoNothing();
  }

  // 4. Default Users
  const defaultPasswordHash = hashPassword("Admin123!");
  const usersList = [
    { id: "usr_admin", username: "admin", fullName: "Administrator Sistem", email: "admin@minimarket.local", passwordHash: defaultPasswordHash, pin: "123456", isActive: true, assignedLocationId: "loc_store" },
    { id: "usr_kasir1", username: "kasir1", fullName: "Kasir 1 (Siti)", email: "kasir1@minimarket.local", passwordHash: defaultPasswordHash, pin: "111111", isActive: true, assignedLocationId: "loc_store" },
    { id: "usr_gudang1", username: "gudang1", fullName: "Petugas Gudang (Budi)", email: "gudang1@minimarket.local", passwordHash: defaultPasswordHash, pin: "222222", isActive: true, assignedLocationId: "loc_wh" },
    { id: "usr_akuntan1", username: "akuntan1", fullName: "Staf Akuntansi (Dewi)", email: "akuntan1@minimarket.local", passwordHash: defaultPasswordHash, pin: "333333", isActive: true, assignedLocationId: "loc_store" },
  ];
  for (const u of usersList) {
    await db.insert(s.users).values(u).onConflictDoNothing();
  }

  await db.insert(s.userRoles).values({ id: "ur_admin", userId: "usr_admin", roleId: "owner" }).onConflictDoNothing();
  await db.insert(s.userRoles).values({ id: "ur_kasir1", userId: "usr_kasir1", roleId: "cashier" }).onConflictDoNothing();
  await db.insert(s.userRoles).values({ id: "ur_gudang1", userId: "usr_gudang1", roleId: "warehouse" }).onConflictDoNothing();
  await db.insert(s.userRoles).values({ id: "ur_akuntan1", userId: "usr_akuntan1", roleId: "accountant" }).onConflictDoNothing();

  // 5. Categories & Units
  const categoriesList = [
    { id: "cat_snack", code: "SNACK", name: "Makanan Ringan", description: "Biskuit, keripik, permen" },
    { id: "cat_beverage", code: "BEVERAGE", name: "Minuman", description: "Air mineral, kopi, teh, jus" },
    { id: "cat_grocery", code: "GROCERY", name: "Sembako & Kebutuhan Pokok", description: "Beras, minyak, gula, mie instan" },
    { id: "cat_toiletries", code: "TOILETRIES", name: "Perawatan Tubuh", description: "Sabun, sampo, pasta gigi" },
  ];
  for (const cat of categoriesList) {
    await db.insert(s.categories).values(cat).onConflictDoNothing();
  }

  const unitsList = [
    { id: "unit_pcs", code: "PCS", name: "Pieces / Buah", description: "Satuan dasar eceran" },
    { id: "unit_box", code: "BOX", name: "Kotak / Box", description: "Kemasan kotak" },
    { id: "unit_dus", code: "DUS", name: "Dus / Karton", description: "Karton grosir" },
    { id: "unit_pack", code: "PACK", name: "Pack / Bungkus", description: "Kemasan pack" },
    { id: "unit_kg", code: "KG", name: "Kilogram", description: "Berat kilogram" },
  ];
  for (const u of unitsList) {
    await db.insert(s.units).values(u).onConflictDoNothing();
  }

  // 6. Chart of Accounts (COA)
  const coaList = [
    { id: "acc_1110", code: "1110", name: "Kas Toko / Kasir", type: "asset", normalBalance: "debit", isSystem: true },
    { id: "acc_1120", code: "1120", name: "Bank BCA", type: "asset", normalBalance: "debit", isSystem: true },
    { id: "acc_1121", code: "1121", name: "Bank Mandiri", type: "asset", normalBalance: "debit", isSystem: true },
    { id: "acc_1125", code: "1125", name: "QRIS Clearing / Penampung", type: "asset", normalBalance: "debit", isSystem: true },
    { id: "acc_1130", code: "1130", name: "Piutang Usaha / Pelanggan", type: "asset", normalBalance: "debit", isSystem: true },
    { id: "acc_1140", code: "1140", name: "Persediaan Barang Dagang", type: "asset", normalBalance: "debit", isSystem: true },
    { id: "acc_2110", code: "2110", name: "Utang Usaha / Pemasok", type: "liability", normalBalance: "credit", isSystem: true },
    { id: "acc_2120", code: "2120", name: "Goods Received Not Invoiced (GRNI)", type: "liability", normalBalance: "credit", isSystem: true },
    { id: "acc_2130", code: "2130", name: "Utang Gaji Karyawan", type: "liability", normalBalance: "credit", isSystem: true },
    { id: "acc_2140", code: "2140", name: "Utang PPN Keluaran", type: "liability", normalBalance: "credit", isSystem: true },
    { id: "acc_3100", code: "3100", name: "Modal Pemilik Toko", type: "equity", normalBalance: "credit", isSystem: true },
    { id: "acc_4100", code: "4100", name: "Pendapatan Penjualan", type: "revenue", normalBalance: "credit", isSystem: true },
    { id: "acc_4110", code: "4110", name: "Diskon Penjualan", type: "revenue", normalBalance: "debit", isSystem: true },
    { id: "acc_4120", code: "4120", name: "Retur Penjualan", type: "revenue", normalBalance: "debit", isSystem: true },
    { id: "acc_4200", code: "4200", name: "Pendapatan Pembulatan Kas", type: "revenue", normalBalance: "credit", isSystem: true },
    { id: "acc_5100", code: "5100", name: "Harga Pokok Penjualan (HPP)", type: "expense", normalBalance: "debit", isSystem: true },
    { id: "acc_6100", code: "6100", name: "Beban Gaji & Upah", type: "expense", normalBalance: "debit", isSystem: true },
    { id: "acc_6200", code: "6200", name: "Beban Operasional Toko", type: "expense", normalBalance: "debit", isSystem: true },
    { id: "acc_6300", code: "6300", name: "Beban Administrasi Bank", type: "expense", normalBalance: "debit", isSystem: true },
    { id: "acc_6400", code: "6400", name: "Beban Kerusakan / Write-off Persediaan", type: "expense", normalBalance: "debit", isSystem: true },
    { id: "acc_6500", code: "6500", name: "Beban Pembulatan Kas", type: "expense", normalBalance: "debit", isSystem: true },
  ];
  for (const acc of coaList) {
    await db.insert(s.accounts).values(acc).onConflictDoNothing();
  }

  // 7. Posting Rules Mapping
  const postingRules = [
    { id: "pr_cash_sale", eventKey: "pos_cash_sale", description: "Penjualan tunai kasir", defaultDebitAccountId: "acc_1110", defaultCreditAccountId: "acc_4100" },
    { id: "pr_qris_sale", eventKey: "pos_qris_sale", description: "Penjualan QRIS statis kasir", defaultDebitAccountId: "acc_1125", defaultCreditAccountId: "acc_4100" },
    { id: "pr_credit_sale", eventKey: "pos_credit_sale", description: "Penjualan kredit / piutang kasir", defaultDebitAccountId: "acc_1130", defaultCreditAccountId: "acc_4100" },
    { id: "pr_cogs", eventKey: "cogs_inventory", description: "Pengakuan HPP dan pengurangan persediaan", defaultDebitAccountId: "acc_5100", defaultCreditAccountId: "acc_1140" },
    { id: "pr_gr_grni", eventKey: "goods_receipt_grni", description: "Penerimaan barang persediaan vs akrual GRNI", defaultDebitAccountId: "acc_1140", defaultCreditAccountId: "acc_2120" },
    { id: "pr_inv_ap", eventKey: "supplier_invoice_ap", description: "Faktur tagihan supplier menutup GRNI ke Utang Usaha", defaultDebitAccountId: "acc_2120", defaultCreditAccountId: "acc_2110" },
    { id: "pr_pay_ap", eventKey: "supplier_payment", description: "Pelunasan utang supplier dari bank", defaultDebitAccountId: "acc_2110", defaultCreditAccountId: "acc_1120" },
  ];
  for (const pr of postingRules) {
    await db.insert(s.postingRulesConfig).values(pr).onConflictDoNothing();
  }

  // 8. Bank Accounts
  const bankList = [
    { id: "bank_bca", accountNumber: "8820192831", bankName: "Bank Central Asia (BCA)", accountHolder: "Minimarket Berkah Jaya", glAccountId: "acc_1120", isActive: true },
    { id: "bank_mandiri", accountNumber: "1420019283741", bankName: "Bank Mandiri", accountHolder: "Minimarket Berkah Jaya", glAccountId: "acc_1121", isActive: true },
  ];
  for (const b of bankList) {
    await db.insert(s.bankAccounts).values(b).onConflictDoNothing();
  }

  // 9. Payment Methods Config
  const paymentMethods = [
    { id: "pm_cash", code: "cash", name: "Tunai", isActive: true, instructions: "Terima uang tunai dan berikan uang kembalian.", clearingAccountId: "acc_1110" },
    { id: "pm_qris", code: "qris_static", name: "QRIS Statis Toko", isActive: true, instructions: "Scan QRIS toko dan periksa bukti mutasi pembayaran sebelum menyelesaikan transaksi.", clearingAccountId: "acc_1125" },
    { id: "pm_bca", code: "bca", name: "Transfer Bank BCA", isActive: true, instructions: "Transfer langsung ke rekening BCA Minimarket.", clearingAccountId: "acc_1120" },
  ];
  for (const pm of paymentMethods) {
    await db.insert(s.paymentMethodsConfig).values(pm).onConflictDoNothing();
  }

  // 10. Suppliers & Customers
  const supplierList = [
    { id: "sup_indofood", code: "SUP-001", name: "PT Indofood Sukses Makmur", contactName: "Bambang", phone: "021-57958822", email: "sales@indofood.co.id", termDays: "30", isActive: true },
    { id: "sup_unilever", code: "SUP-002", name: "PT Unilever Indonesia Tbk", contactName: "Siska", phone: "021-5262112", email: "order@unilever.co.id", termDays: "14", isActive: true },
    { id: "sup_mayora", code: "SUP-003", name: "PT Mayora Indah Tbk", contactName: "Hendro", phone: "021-80637000", email: "dist@mayora.co.id", termDays: "21", isActive: true },
  ];
  for (const sup of supplierList) {
    await db.insert(s.suppliers).values(sup).onConflictDoNothing();
  }

  const customerList = [
    { id: "cust_general", code: "CUST-000", name: "Pelanggan Umum", groupName: "Umum", creditLimit: "0", currentDebt: "0", isActive: true },
    { id: "cust_member1", code: "CUST-001", name: "Ibu Ratna (Member Toko)", groupName: "Member", phone: "081234567890", creditLimit: "1000000", currentDebt: "0", isActive: true },
    { id: "cust_warung1", code: "CUST-002", name: "Warung Pak Joko (Grosir)", groupName: "Grosir", phone: "081987654321", creditLimit: "5000000", currentDebt: "0", isActive: true },
  ];
  for (const cust of customerList) {
    await db.insert(s.customers).values(cust).onConflictDoNothing();
  }

  // 11. Initial Products with real normalized barcodes and inventory balances
  const initialProducts = [
    {
      id: "prod_indomie_goreng",
      sku: "IDM-GRG-85G",
      name: "Indomie Mi Goreng Spesial 85g",
      categoryId: "cat_grocery",
      baseUnitId: "unit_pcs",
      purchasePrice: "2800.00",
      costPrice: "2800.00",
      sellingPrice: "3500.00",
      minStock: "50.00",
      brand: "Indomie",
      barcodes: ["089686010118", "089686010119"],
      storeQty: "120.00",
      whQty: "480.00",
    },
    {
      id: "prod_indomie_ayam_bawang",
      sku: "IDM-ABW-69G",
      name: "Indomie Kuah Rasa Ayam Bawang 69g",
      categoryId: "cat_grocery",
      baseUnitId: "unit_pcs",
      purchasePrice: "2700.00",
      costPrice: "2700.00",
      sellingPrice: "3300.00",
      minStock: "40.00",
      brand: "Indomie",
      barcodes: ["089686010323"],
      storeQty: "85.00",
      whQty: "240.00",
    },
    {
      id: "prod_aqua_600ml",
      sku: "AQU-BTL-600ML",
      name: "Aqua Air Mineral Botol 600ml",
      categoryId: "cat_beverage",
      baseUnitId: "unit_pcs",
      purchasePrice: "2800.00",
      costPrice: "2800.00",
      sellingPrice: "4000.00",
      minStock: "48.00",
      brand: "Danone Aqua",
      barcodes: ["08886008101053"],
      storeQty: "96.00",
      whQty: "240.00",
    },
    {
      id: "prod_teh_botol_kotak",
      sku: "TB-KTK-250ML",
      name: "Teh Botol Sosro Kotak 250ml",
      categoryId: "cat_beverage",
      baseUnitId: "unit_pcs",
      purchasePrice: "3100.00",
      costPrice: "3100.00",
      sellingPrice: "4500.00",
      minStock: "30.00",
      brand: "Sosro",
      barcodes: ["089927532101"],
      storeQty: "60.00",
      whQty: "120.00",
    },
    {
      id: "prod_bengbeng",
      sku: "BNG-WFR-25G",
      name: "Beng-Beng Wafer Cokelat Karamel 25g",
      categoryId: "cat_snack",
      baseUnitId: "unit_pcs",
      purchasePrice: "1900.00",
      costPrice: "1900.00",
      sellingPrice: "2500.00",
      minStock: "40.00",
      brand: "Mayora",
      barcodes: ["0899600130101"],
      storeQty: "100.00",
      whQty: "300.00",
    },
    {
      id: "prod_lifebuoy_red",
      sku: "LFB-SBN-75G",
      name: "Lifebuoy Sabun Batang Merah Total 10 75g",
      categoryId: "cat_toiletries",
      baseUnitId: "unit_pcs",
      purchasePrice: "3600.00",
      costPrice: "3600.00",
      sellingPrice: "4800.00",
      minStock: "24.00",
      brand: "Lifebuoy",
      barcodes: ["0899999905011"],
      storeQty: "48.00",
      whQty: "144.00",
    },
    {
      id: "prod_pepsodent_120g",
      sku: "PEP-ODL-120G",
      name: "Pepsodent Pasta Gigi White 120g",
      categoryId: "cat_toiletries",
      baseUnitId: "unit_pcs",
      purchasePrice: "8500.00",
      costPrice: "8500.00",
      sellingPrice: "11500.00",
      minStock: "20.00",
      brand: "Pepsodent",
      barcodes: ["0899999907123"],
      storeQty: "35.00",
      whQty: "90.00",
    },
    {
      id: "prod_minyak_goreng_bimoli_2l",
      sku: "BML-MYK-2L",
      name: "Bimoli Minyak Goreng Pouch 2 Liter",
      categoryId: "cat_grocery",
      baseUnitId: "unit_pcs",
      purchasePrice: "34000.00",
      costPrice: "34000.00",
      sellingPrice: "38500.00",
      minStock: "15.00",
      brand: "Bimoli",
      barcodes: ["0899277512014"],
      storeQty: "24.00",
      whQty: "60.00",
    },
  ];

  for (const item of initialProducts) {
    const { barcodes, storeQty, whQty, ...prodData } = item;
    await db.insert(s.products).values(prodData).onConflictDoNothing();

    // Insert barcodes
    for (let i = 0; i < barcodes.length; i++) {
      await db.insert(s.productBarcodes).values({
        id: `bc_${item.id}_${i}`,
        productId: item.id,
        barcode: barcodes[i],
        isPrimary: i === 0,
      }).onConflictDoNothing();
    }

    // Insert stock balance for STORE-01
    await db.insert(s.stockBalances).values({
      id: `sb_${item.id}_store`,
      productId: item.id,
      locationId: "loc_store",
      qty: storeQty,
    }).onConflictDoNothing();

    // Insert stock balance for WH-MAIN
    await db.insert(s.stockBalances).values({
      id: `sb_${item.id}_wh`,
      productId: item.id,
      locationId: "loc_wh",
      qty: whQty,
    }).onConflictDoNothing();

    // Insert initial inventory ledger movements
    await db.insert(s.inventoryMovements).values({
      id: `im_init_${item.id}_store`,
      productId: item.id,
      locationId: "loc_store",
      refType: "goods_receipt",
      refId: "INIT-SEED-01",
      qtyChange: storeQty,
      costPerUnit: item.costPrice,
      totalCost: (parseFloat(storeQty) * parseFloat(item.costPrice)).toFixed(2),
      balanceAfter: storeQty,
      notes: "Saldo awal persediaan area penjualan toko",
      createdBy: "usr_admin",
    }).onConflictDoNothing();

    await db.insert(s.inventoryMovements).values({
      id: `im_init_${item.id}_wh`,
      productId: item.id,
      locationId: "loc_wh",
      refType: "goods_receipt",
      refId: "INIT-SEED-01",
      qtyChange: whQty,
      costPerUnit: item.costPrice,
      totalCost: (parseFloat(whQty) * parseFloat(item.costPrice)).toFixed(2),
      balanceAfter: whQty,
      notes: "Saldo awal persediaan gudang utama",
      createdBy: "usr_admin",
    }).onConflictDoNothing();
  }

  // 12. Initial Employees
  const employeeList = [
    { id: "emp_01", employeeCode: "EMP-001", fullName: "Siti Rahmawati", position: "Kasir Senior", department: "Operasional", baseSalary: "3200000.00", allowances: "400000.00", joinDate: new Date("2024-01-15"), isActive: true },
    { id: "emp_02", employeeCode: "EMP-002", fullName: "Budi Santoso", position: "Kepala Gudang", department: "Logistik", baseSalary: "3800000.00", allowances: "500000.00", joinDate: new Date("2023-06-01"), isActive: true },
    { id: "emp_03", employeeCode: "EMP-003", fullName: "Dewi Lestari", position: "Staf Akuntansi", department: "Keuangan", baseSalary: "3500000.00", allowances: "450000.00", joinDate: new Date("2023-11-10"), isActive: true },
  ];
  for (const emp of employeeList) {
    await db.insert(s.employees).values(emp).onConflictDoNothing();
  }

  console.log("✅ Database seeding completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

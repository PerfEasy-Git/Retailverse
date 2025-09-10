@echo off
echo ========================================
echo   RETAILVERSE - CLEANUP OLD FILES
echo ========================================
echo.
echo This script will delete old backend files
echo while preserving UI and basic structure.
echo.
echo WARNING: This will permanently delete files!
echo.
pause

echo.
echo Starting cleanup process...
echo.

REM ========================================
REM DELETE OLD MIGRATION FILES
REM ========================================
echo [1/6] Deleting old migration files...
if exist "src\database\migrations\001_add_product_sku_fields.sql" del "src\database\migrations\001_add_product_sku_fields.sql"
if exist "src\database\migrations\003_remove_product_turnover_margin.sql" del "src\database\migrations\003_remove_product_turnover_margin.sql"
if exist "src\database\migrations\005_create_retailer_locations.sql" del "src\database\migrations\005_create_retailer_locations.sql"
if exist "src\database\migrations\006_enhance_retailer_sku_data.sql" del "src\database\migrations\006_enhance_retailer_sku_data.sql"
if exist "src\database\migrations\007_update_retailer_type_constraints.sql" del "src\database\migrations\007_update_retailer_type_constraints.sql"
if exist "src\database\migrations\008_update_all_constraints.sql" del "src\database\migrations\008_update_all_constraints.sql"
if exist "src\database\migrations\constraints_for_pgadmin_fixed.sql" del "src\database\migrations\constraints_for_pgadmin_fixed.sql"
if exist "src\database\migrations\constraints_for_pgadmin.sql" del "src\database\migrations\constraints_for_pgadmin.sql"
echo   ✓ Migration files deleted

REM ========================================
REM DELETE OLD ANALYSIS AND TEST FILES
REM ========================================
echo [2/6] Deleting old analysis and test files...
if exist "analyze_db_structure.js" del "analyze_db_structure.js"
if exist "analyze_excel_clean.js" del "analyze_excel_clean.js"
if exist "check_brand_users.js" del "check_brand_users.js"
if exist "check_excel_data.js" del "check_excel_data.js"
if exist "check_purchase_models.js" del "check_purchase_models.js"
if exist "check-user-brands.js" del "check-user-brands.js"
if exist "check-users.js" del "check-users.js"
if exist "create-brand-api.js" del "create-brand-api.js"
if exist "create-brand.js" del "create-brand.js"
if exist "create-test-retailer.js" del "create-test-retailer.js"
if exist "excel_db_mapping_analysis.js" del "excel_db_mapping_analysis.js"
if exist "extract_excel_data.js" del "extract_excel_data.js"
if exist "fetch_real_db_structure.js" del "fetch_real_db_structure.js"
if exist "generate_correct_sql.js" del "generate_correct_sql.js"
if exist "import_csv_data.js" del "import_csv_data.js"
if exist "run_constraints_manually.sql" del "run_constraints_manually.sql"
if exist "run_new_migrations.js" del "run_new_migrations.js"
if exist "test_constraints.sql" del "test_constraints.sql"
if exist "test-db.js" del "test-db.js"
if exist "test-forgot-password.js" del "test-forgot-password.js"
if exist "test-login.js" del "test-login.js"
if exist "update-password.sql" del "update-password.sql"
if exist "update-test-user.js" del "update-test-user.js"
echo   ✓ Analysis and test files deleted

REM ========================================
REM DELETE OLD MIGRATION FILE
REM ========================================
echo [3/6] Deleting old migration file...
if exist "database_migration.sql" del "database_migration.sql"
echo   ✓ Old migration file deleted

REM ========================================
REM DELETE OLD DOCUMENTATION FILES
REM ========================================
echo [4/6] Deleting old documentation files...
if exist "CONSTRAINTS_SUMMARY.md" del "CONSTRAINTS_SUMMARY.md"
if exist "IMPLEMENTATION_GUIDE.md" del "IMPLEMENTATION_GUIDE.md"
echo   ✓ Old documentation files deleted

REM ========================================
REM DELETE OLD ROUTE FILES
REM ========================================
echo [5/6] Deleting old route files...
if exist "src\routes\admin.js" del "src\routes\admin.js"
if exist "src\routes\assortment.js" del "src\routes\assortment.js"
if exist "src\routes\brands.js" del "src\routes\brands.js"
if exist "src\routes\dashboard.js" del "src\routes\dashboard.js"
if exist "src\routes\discovery.js" del "src\routes\discovery.js"
if exist "src\routes\fitScores.js" del "src\routes\fitScores.js"
if exist "src\routes\products.js" del "src\routes\products.js"
if exist "src\routes\retailerLocations.js" del "src\routes\retailerLocations.js"
if exist "src\routes\retailers.js" del "src\routes\retailers.js"
if exist "src\routes\retailerSkuData.js" del "src\routes\retailerSkuData.js"
echo   ✓ Old route files deleted

REM ========================================
REM DELETE OLD MIDDLEWARE AND UTILS
REM ========================================
echo [6/6] Deleting old middleware and utility files...
if exist "src\middleware\auth.js" del "src\middleware\auth.js"
if exist "src\middleware\errorHandler.js" del "src\middleware\errorHandler.js"
if exist "src\middleware\validation.js" del "src\middleware\validation.js"
if exist "src\utils\jwt.js" del "src\utils\jwt.js"
if exist "src\database\queries.js" del "src\database\queries.js"
if exist "src\app.js" del "src\app.js"
echo   ✓ Old middleware and utility files deleted

REM ========================================
REM CLEANUP EMPTY DIRECTORIES
REM ========================================
echo.
echo Cleaning up empty directories...
if exist "src\database\migrations" rmdir "src\database\migrations" 2>nul
if exist "src\middleware" rmdir "src\middleware" 2>nul
if exist "src\utils" rmdir "src\utils" 2>nul
if exist "src\routes" rmdir "src\routes" 2>nul
echo   ✓ Empty directories cleaned up

echo.
echo ========================================
echo   CLEANUP COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Files deleted:
echo   - Old migration files
echo   - Old analysis and test files
echo   - Old route files
echo   - Old middleware and utility files
echo   - Old documentation files
echo.
echo Files preserved:
echo   - Frontend UI (all React components)
echo   - Basic backend structure (package.json, server.js)
echo   - Database connection
echo   - Excel reading utilities
echo   - Environment configuration
echo.
echo You can now start implementing the new system
echo using the documentation in the Docs folder.
echo.
pause

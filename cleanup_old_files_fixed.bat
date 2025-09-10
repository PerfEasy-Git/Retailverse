@echo off
echo ========================================
echo   RETAILVERSE - CLEANUP OLD FILES (FIXED)
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
if exist "backend\src\database\migrations\001_add_product_sku_fields.sql" del "backend\src\database\migrations\001_add_product_sku_fields.sql"
if exist "backend\src\database\migrations\003_remove_product_turnover_margin.sql" del "backend\src\database\migrations\003_remove_product_turnover_margin.sql"
if exist "backend\src\database\migrations\005_create_retailer_locations.sql" del "backend\src\database\migrations\005_create_retailer_locations.sql"
if exist "backend\src\database\migrations\006_enhance_retailer_sku_data.sql" del "backend\src\database\migrations\006_enhance_retailer_sku_data.sql"
if exist "backend\src\database\migrations\007_update_retailer_type_constraints.sql" del "backend\src\database\migrations\007_update_retailer_type_constraints.sql"
if exist "backend\src\database\migrations\008_update_all_constraints.sql" del "backend\src\database\migrations\008_update_all_constraints.sql"
if exist "backend\src\database\migrations\constraints_for_pgadmin_fixed.sql" del "backend\src\database\migrations\constraints_for_pgadmin_fixed.sql"
if exist "backend\src\database\migrations\constraints_for_pgadmin.sql" del "backend\src\database\migrations\constraints_for_pgadmin.sql"
echo   ✓ Migration files deleted

REM ========================================
REM DELETE OLD ANALYSIS AND TEST FILES
REM ========================================
echo [2/6] Deleting old analysis and test files...
if exist "backend\analyze_db_structure.js" del "backend\analyze_db_structure.js"
if exist "backend\analyze_excel_clean.js" del "backend\analyze_excel_clean.js"
if exist "backend\check_brand_users.js" del "backend\check_brand_users.js"
if exist "backend\check_excel_data.js" del "backend\check_excel_data.js"
if exist "backend\check_purchase_models.js" del "backend\check_purchase_models.js"
if exist "backend\check-user-brands.js" del "backend\check-user-brands.js"
if exist "backend\check-users.js" del "backend\check-users.js"
if exist "backend\create-brand-api.js" del "backend\create-brand-api.js"
if exist "backend\create-brand.js" del "backend\create-brand.js"
if exist "backend\create-test-retailer.js" del "backend\create-test-retailer.js"
if exist "backend\excel_db_mapping_analysis.js" del "backend\excel_db_mapping_analysis.js"
if exist "backend\extract_excel_data.js" del "backend\extract_excel_data.js"
if exist "backend\fetch_real_db_structure.js" del "backend\fetch_real_db_structure.js"
if exist "backend\generate_correct_sql.js" del "backend\generate_correct_sql.js"
if exist "backend\import_csv_data.js" del "backend\import_csv_data.js"
if exist "backend\run_constraints_manually.sql" del "backend\run_constraints_manually.sql"
if exist "backend\run_new_migrations.js" del "backend\run_new_migrations.js"
if exist "backend\test_constraints.sql" del "backend\test_constraints.sql"
if exist "backend\test-db.js" del "backend\test-db.js"
if exist "backend\test-forgot-password.js" del "backend\test-forgot-password.js"
if exist "backend\test-login.js" del "backend\test-login.js"
if exist "backend\update-password.sql" del "backend\update-password.sql"
if exist "backend\update-test-user.js" del "backend\update-test-user.js"
if exist "backend\add-reset-token-columns.sql" del "backend\add-reset-token-columns.sql"
if exist "backend\generate_hashes.js" del "backend\generate_hashes.js"
echo   ✓ Analysis and test files deleted

REM ========================================
REM DELETE OLD MIGRATION FILE
REM ========================================
echo [3/6] Deleting old migration file...
if exist "backend\database_migration.sql" del "backend\database_migration.sql"
echo   ✓ Old migration file deleted

REM ========================================
REM DELETE OLD DOCUMENTATION FILES
REM ========================================
echo [4/6] Deleting old documentation files...
if exist "backend\CONSTRAINTS_SUMMARY.md" del "backend\CONSTRAINTS_SUMMARY.md"
if exist "backend\IMPLEMENTATION_GUIDE.md" del "backend\IMPLEMENTATION_GUIDE.md"
echo   ✓ Old documentation files deleted

REM ========================================
REM DELETE OLD ROUTE FILES
REM ========================================
echo [5/6] Deleting old route files...
if exist "backend\src\routes\admin.js" del "backend\src\routes\admin.js"
if exist "backend\src\routes\assortment.js" del "backend\src\routes\assortment.js"
if exist "backend\src\routes\brands.js" del "backend\src\routes\brands.js"
if exist "backend\src\routes\dashboard.js" del "backend\src\routes\dashboard.js"
if exist "backend\src\routes\discovery.js" del "backend\src\routes\discovery.js"
if exist "backend\src\routes\fitScores.js" del "backend\src\routes\fitScores.js"
if exist "backend\src\routes\products.js" del "backend\src\routes\products.js"
if exist "backend\src\routes\retailerLocations.js" del "backend\src\routes\retailerLocations.js"
if exist "backend\src\routes\retailers.js" del "backend\src\routes\retailers.js"
if exist "backend\src\routes\retailerSkuData.js" del "backend\src\routes\retailerSkuData.js"
echo   ✓ Old route files deleted

REM ========================================
REM DELETE OLD MIDDLEWARE AND UTILS
REM ========================================
echo [6/6] Deleting old middleware and utility files...
if exist "backend\src\middleware\auth.js" del "backend\src\middleware\auth.js"
if exist "backend\src\middleware\errorHandler.js" del "backend\src\middleware\errorHandler.js"
if exist "backend\src\middleware\validation.js" del "backend\src\middleware\validation.js"
if exist "backend\src\utils\jwt.js" del "backend\src\utils\jwt.js"
if exist "backend\src\database\queries.js" del "backend\src\database\queries.js"
if exist "backend\src\app.js" del "backend\src\app.js"
echo   ✓ Old middleware and utility files deleted

REM ========================================
REM CLEANUP EMPTY DIRECTORIES
REM ========================================
echo.
echo Cleaning up empty directories...
if exist "backend\src\database\migrations" rmdir "backend\src\database\migrations" 2>nul
if exist "backend\src\middleware" rmdir "backend\src\middleware" 2>nul
if exist "backend\src\utils" rmdir "backend\src\utils" 2>nul
if exist "backend\src\routes" rmdir "backend\src\routes" 2>nul
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
